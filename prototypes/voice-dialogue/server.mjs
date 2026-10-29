// PROTOTYPE, throwaway. Answers "How does a spoken Dialogue feel next to an on-screen Breakdown?"
// (https://github.com/shrujancheruku/look-together/issues/12).
// Browser mic -> Cloud STT v2 (`long`, streaming) -> Gemini 3.8 Flash (streamed) -> Cloud TTS (Chirp 3 HD, per sentence).
// Everything is in memory; nothing is stored. Run: pnpm start, then open http://localhost:5174
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { OAuth2Client } from 'google-auth-library';
import speech from '@google-cloud/speech';
import { WebSocketServer } from 'ws';

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? 'look-together';
const MODEL = 'gemini-3.8-flash';
const LLM_URL = `https://aiplatform.us.rep.googleapis.com/v1/projects/${PROJECT}/locations/us/publishers/google/models/${MODEL}:streamGenerateContent?alt=sse`;
const PORT = 5174;
const dir = new URL('.', import.meta.url);

// List prices, for a rough cost per Inquiry only.
const PRICE = { in: 1.5 / 1e6, out: 7.5 / 1e6, sttPerMin: 0.016, ttsPerChar: 30 / 1e6 };

const VOICE_ADDENDUM = `

## This Inquiry may be spoken

The person may be talking by voice: their words then arrive as a speech transcript and can contain recognition errors; read them generously. Your replies, apart from the Breakdown list and the Recap, are spoken aloud, so write plain sentences with no markdown, no lists and no headings.

The Breakdown stays on screen as numbered cards for the whole Inquiry. When the person picks or refers to an Assumption, start your reply with its card tag, e.g. [A2]. A message like "[Tapped Assumption 2]" means they tapped that card.

When the person agrees to add an Assumption that came up, write it on its own line as "+ You assume that …" with key words in **bold**; it becomes the next card. When you reword an Assumption, write it on its own line as "~2 You assume that …". Never repeat the whole Breakdown.

Put the Recap on screen as a "# What we looked at" heading followed by "- " lines, then say one short spoken sentence to close.`;
const SYSTEM = readFileSync(new URL('system-prompt.md', dir), 'utf8') + VOICE_ADDENDUM;

// --- auth: gcloud user token, refreshed every 45 minutes ---------------------------------------
let tok = { value: '', at: 0 };
function token() {
  if (Date.now() - tok.at > 45 * 60e3) tok = { value: execSync('gcloud auth print-access-token').toString().trim(), at: Date.now() };
  return tok.value;
}
let sttClient, sttClientAt = 0;
function stt() {
  token();
  if (sttClientAt !== tok.at) {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: tok.value });
    sttClient = new speech.v2.SpeechClient({ apiEndpoint: 'us-speech.googleapis.com', authClient: auth });
    sttClientAt = tok.at;
  }
  return sttClient;
}

async function tts(text, voice) {
  const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'en-US', name: voice }, audioConfig: { audioEncoding: 'MP3' } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`TTS ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.audioContent;
}

// --- reply parser: splits the streamed reply into spoken sentences and on-screen structure -----
const plain = s => s.replace(/\*\*|__|[*_`]/g, '').replace(/\s+/g, ' ').trim();
function makeParser(on) {
  let buf = '', lineStart = true, started = false;
  const structured = /^[ \t]*(\d+[.)]\s|[-*]\s|\+\s|~\d|#)/;
  function line(l) {
    let m;
    if ((m = l.match(/^\s*(\d+)[.)]\s+(.*)/))) on.numbered(+m[1], m[2].trim());
    else if ((m = l.match(/^\s*\+\s+(.*)/))) on.add(m[1].trim());
    else if ((m = l.match(/^\s*~(\d+)\s+(.*)/))) on.reword(+m[1], m[2].trim());
    else on.display(l.trim());
  }
  function say(s) {
    s = s.replace(/\[A(\d+)\]/g, (_, n) => (on.focus(+n), '')).trim();
    if (plain(s)) on.say(s);
  }
  function pump(final) {
    for (;;) {
      if (!started) {
        if (!final && buf.length < 8 && !buf.includes('\n')) return;
        const m = buf.match(/^\s*\[A(\d+)\]\s*/);
        if (m) { on.focus(+m[1]); buf = buf.slice(m[0].length); }
        started = true;
      }
      if (lineStart) {
        buf = buf.replace(/^\s*\n/, '');
        if (!buf) return;
        if (!final && /^\s*\d{0,2}$|^\s*~$/.test(buf)) return; // could still become "1. " or "~2"
        if (structured.test(buf)) {
          const i = buf.indexOf('\n');
          if (i < 0) { if (final) { line(buf); buf = ''; } return; }
          line(buf.slice(0, i)); buf = buf.slice(i + 1);
          continue;
        }
        lineStart = false;
      }
      const m = buf.match(/^[\s\S]*?(?:[.?!…]+["'”’)*_]*(?=\s)|\n)/);
      if (!m) { if (final && buf.trim()) { say(buf); buf = ''; } return; }
      buf = buf.slice(m[0].length);
      if (m[0].endsWith('\n') || buf.startsWith('\n')) lineStart = true;
      say(m[0]);
    }
  }
  return { push(t) { buf += t; pump(false); }, end() { pump(true); } };
}

// --- one connection = one Inquiry ---------------------------------------------------------------
function session(ws) {
  const send = o => ws.readyState === 1 && ws.send(JSON.stringify(o));
  const history = [];
  const settings = { speak: true, readBreakdown: false, thinking: 'high', voice: 'en-US-Chirp3-HD-Charon' };
  const usage = { turns: 0, in: 0, out: 0, thoughts: 0, sttSec: 0, ttsChars: 0 };
  let hasBreakdown = false, cards = 0;
  let turn = null; // { id, abort, spoken: [{seq, raw}], structural: [], raw }
  let sttStream = null, sttState = null;
  let turnId = 0;

  function sendUsage() {
    const cost = usage.in * PRICE.in + (usage.out + usage.thoughts) * PRICE.out + (usage.sttSec / 60) * PRICE.sttPerMin + usage.ttsChars * PRICE.ttsPerChar;
    send({ type: 'usage', ...usage, cost });
  }

  function startStt() {
    sttState = { finals: '', interim: '', bytes: 0, t0: Date.now(), done: null };
    const st = sttState;
    st.ended = new Promise(r => (st.done = r));
    sttStream = stt()._streamingRecognize();
    sttStream.on('data', d => {
      for (const res of d.results ?? []) {
        const t = res.alternatives?.[0]?.transcript ?? '';
        if (res.isFinal) { st.finals += t; st.interim = ''; } else st.interim = t;
      }
      send({ type: 'interim', text: (st.finals + st.interim).trim() });
    });
    sttStream.on('error', e => { send({ type: 'error', where: 'stt', message: e.message }); st.done(); });
    sttStream.on('end', () => st.done());
    sttStream.write({
      recognizer: `projects/${PROJECT}/locations/us/recognizers/_`,
      streamingConfig: {
        config: { explicitDecodingConfig: { encoding: 'LINEAR16', sampleRateHertz: 16000, audioChannelCount: 1 }, languageCodes: ['en-US'], model: 'long', features: { enableAutomaticPunctuation: true } },
        streamingFeatures: { interimResults: true },
      },
    });
  }

  async function endStt() {
    if (!sttStream) return;
    const st = sttState, s = sttStream;
    sttStream = null;
    const tEnd = Date.now();
    s.end();
    await Promise.race([st.ended, new Promise(r => setTimeout(r, 2500))]);
    usage.sttSec += st.bytes / 32000;
    const text = (st.finals + st.interim).trim();
    send({ type: 'heard', text, sttFinalMs: Date.now() - tEnd });
    if (text) runTurn(text, { tStart: tEnd, sttFinalMs: Date.now() - tEnd });
    else send({ type: 'state', state: 'idle' });
  }

  function interrupt(playedSeq) {
    if (!turn) return;
    const t = turn;
    turn = null;
    t.abort.abort();
    const keptSay = t.spoken.filter(x => x.seq <= playedSeq).map(x => x.raw).join(' ');
    history.push({ role: 'model', text: [...t.structural, keptSay].join('\n') + ' [the person interrupted here]' });
    send({ type: 'interrupted', turn: t.id });
  }

  async function runTurn(userText, timing = { tStart: Date.now() }) {
    if (turn) interrupt(Infinity);
    history.push({ role: 'user', text: userText });
    const t = { id: ++turnId, abort: new AbortController(), spoken: [], structural: [], raw: '' };
    turn = t;
    const live = () => turn === t;
    const marks = { sttFinalMs: timing.sttFinalMs ?? null };
    const mark = k => { if (marks[k] == null) marks[k] = Date.now() - timing.tStart; };
    send({ type: 'state', state: 'thinking', turn: t.id });

    let seq = 0, audioChain = Promise.resolve();
    const speakText = raw => {
      const text = plain(raw);
      const mySeq = ++seq;
      t.spoken.push({ seq: mySeq, raw });
      send({ type: 'say', turn: t.id, seq: mySeq, text: raw, spoken: settings.speak });
      if (!settings.speak) return;
      mark('firstSentenceMs');
      usage.ttsChars += text.length;
      const audio = tts(text, settings.voice).catch(e => (send({ type: 'error', where: 'tts', message: e.message }), null));
      audioChain = audioChain.then(async () => {
        const a = await audio;
        if (!a || !live()) return;
        mark('firstAudioMs');
        send({ type: 'audio', turn: t.id, seq: mySeq, data: a });
      });
    };
    const parser = makeParser({
      focus: n => send({ type: 'focus', turn: t.id, n }),
      numbered: (n, text) => {
        t.structural.push(`${n}. ${text}`);
        if (!hasBreakdown || t.breakdownTurn) {
          t.breakdownTurn = true; cards = Math.max(cards, n);
          send({ type: 'assumption', n, text });
          if (settings.readBreakdown) speakText(text);
        } else send({ type: 'display', text: `${n}. ${text}` });
      },
      add: text => { t.structural.push(`+ ${text}`); send({ type: 'assumption', n: ++cards, text, added: true }); },
      reword: (n, text) => { t.structural.push(`~${n} ${text}`); send({ type: 'assumption', n, text, reworded: true }); },
      display: text => { t.structural.push(text); send({ type: 'display', text }); },
      say: speakText,
    });

    try {
      const r = await fetch(LLM_URL, {
        method: 'POST', signal: t.abort.signal,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          generationConfig: { thinkingConfig: { thinkingLevel: hasBreakdown ? 'low' : settings.thinking } }, // ponder the Breakdown, keep the Dialogue fast
        }),
      });
      if (!r.ok) throw new Error(`LLM ${r.status}: ${(await r.text()).slice(0, 300)}`);
      let pending = '', u = null;
      for await (const chunk of r.body) {
        pending += Buffer.from(chunk).toString('utf8');
        let i;
        while ((i = pending.indexOf('\n')) >= 0) {
          const l = pending.slice(0, i).trim();
          pending = pending.slice(i + 1);
          if (!l.startsWith('data:')) continue;
          const d = JSON.parse(l.slice(5));
          if (d.usageMetadata) u = d.usageMetadata;
          const text = (d.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought).map(p => p.text ?? '').join('');
          if (text) { mark('firstTokenMs'); t.raw += text; parser.push(text); }
        }
      }
      parser.end();
      if (t.breakdownTurn) hasBreakdown = true;
      if (u) { usage.in += u.promptTokenCount ?? 0; usage.out += u.candidatesTokenCount ?? 0; usage.thoughts += u.thoughtsTokenCount ?? 0; }
      usage.turns++;
      mark('llmDoneMs');
      await audioChain;
      if (!live()) return;
      history.push({ role: 'model', text: t.raw });
      turn = null;
      send({ type: 'turn-done', turn: t.id, marks, thoughts: u?.thoughtsTokenCount ?? 0 });
      sendUsage();
    } catch (e) {
      if (e.name === 'AbortError') { sendUsage(); return; }
      send({ type: 'error', where: 'llm', message: e.message });
      if (live()) { turn = null; history.pop(); }
    }
  }

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      if (sttStream) { sttState.bytes += data.length; sttStream.write({ audio: data }); }
      return;
    }
    const m = JSON.parse(data.toString());
    if (m.type === 'settings') Object.assign(settings, m.settings);
    else if (m.type === 'stt-start') { if (!sttStream) startStt(); }
    else if (m.type === 'stt-end') endStt();
    else if (m.type === 'stt-cancel') { sttStream?.end(); sttStream = null; }
    else if (m.type === 'text') runTurn(m.text);
    else if (m.type === 'interrupt') interrupt(m.playedSeq ?? 0);
    else if (m.type === 'reset') { interrupt(Infinity); history.length = 0; hasBreakdown = false; cards = 0; Object.keys(usage).forEach(k => (usage[k] = 0)); sendUsage(); }
    else if (m.type === 'dump') send({ type: 'dump', history, settings, hasBreakdown, cards });
  });
  ws.on('close', () => { turn?.abort.abort(); sttStream?.end(); });
}

const server = createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/?')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(new URL('index.html', dir)));
  } else { res.writeHead(404); res.end(); }
});
new WebSocketServer({ server, path: '/ws' }).on('connection', session);
token();
server.listen(PORT, () => console.log(`PROTOTYPE voice Dialogue on http://localhost:${PORT} (project ${PROJECT}, ${MODEL} on us)`));
