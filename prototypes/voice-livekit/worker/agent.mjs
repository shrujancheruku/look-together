// PROTOTYPE, throwaway. Answers "How fast is a spoken turn over LiveKit on native, and does barge-in work on speakerphone?"
// (https://github.com/shrujancheruku/look-together/issues/31).
// LiveKit Agents for Node worker: phone audio -> Silero VAD gates a Cloud STT v2 `long` stream (us) -> the turn API
// (Gemini 3.8 Flash on us) -> Cloud TTS Chirp 3 HD per sentence (us) -> phone. Card and Recap lines go to the phone as
// data, never spoken. Every turn's timings go to the phone and the log. Nothing is stored.
import { fileURLToPath } from 'node:url';
import { ReadableStream } from 'node:stream/web';
import { GoogleAuth } from 'google-auth-library';
import speech from '@google-cloud/speech';
import { AudioFrame } from '@livekit/rtc-node';
import { cli, defineAgent, ServerOptions, stt, VADEventType, voice } from '@livekit/agents';
import * as silero from '@livekit/agents-plugin-silero';

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? 'look-together';
const TURN_URL = process.env.TURN_URL ?? 'http://localhost:8080/turn';
const VOICE = 'en-US-Chirp3-HD-Charon';
const SILENCE_MS = 800; // same silence wait as the browser prototype
const TTS_RATE = 24000;

const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
let sttClient;

async function synthesize(text) {
  const r = await fetch('https://us-texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await auth.getAccessToken()}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'en-US', name: VOICE }, audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: TTS_RATE } }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`TTS ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  const buf = Buffer.from(j.audioContent, 'base64').subarray(44); // drop the WAV header
  return new Int16Array(buf.buffer, buf.byteOffset, buf.length >> 1);
}

// Card tags, added/reworded Assumptions, the Breakdown list and the Recap stay on screen; everything else is spoken.
const STRUCTURAL = /^(\d+\.\s|\+ |~\d+ |# |- )/;

class ProtoAgent extends voice.Agent {
  constructor({ vad, room, marks }) {
    super({ instructions: 'unused: the turn API holds the prompt' });
    this.vad = vad; this.room = room; this.marks = marks;
    this.hasBreakdown = false;
  }

  send(msg) {
    this.room.localParticipant?.publishData(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true, topic: 'proto' }).catch(() => {});
  }

  // VAD opens a Cloud STT stream at speech start and half-closes it after 800 ms of silence, as the browser prototype did,
  // so the final transcript arrives ~0.35 s later instead of waiting on Google's own endpointing.
  async sttNode(audio) {
    const vadStream = this.vad.stream();
    const preroll = [];
    let rate = 0, open = null;
    const events = [];
    let wake = () => {};
    const emit = e => { events.push(e); wake(); };

    const startStt = () => {
      sttClient ??= new speech.v2.SpeechClient({ apiEndpoint: 'us-speech.googleapis.com' });
      const s = sttClient._streamingRecognize();
      const st = { s, text: '', interim: '', ended: null };
      st.ended = new Promise(r => { s.on('end', r); s.on('error', e => { console.error('stt', e.message); r(); }); });
      s.on('data', d => {
        for (const res of d.results ?? []) {
          const t = res.alternatives?.[0]?.transcript ?? '';
          if (res.isFinal) { st.text += t; st.interim = ''; } else st.interim = t;
        }
        this.send({ type: 'interim', text: (st.text + st.interim).trim() });
      });
      s.write({
        recognizer: `projects/${PROJECT}/locations/us/recognizers/_`,
        streamingConfig: {
          config: { explicitDecodingConfig: { encoding: 'LINEAR16', sampleRateHertz: rate, audioChannelCount: 1 }, languageCodes: ['en-US'], model: 'long', features: { enableAutomaticPunctuation: true } },
          streamingFeatures: { interimResults: true },
        },
      });
      for (const f of preroll) s.write({ audio: Buffer.from(f.data.buffer, f.data.byteOffset, f.data.byteLength) });
      return st;
    };

    (async () => {
      for await (const ev of vadStream) {
        if (ev.type === VADEventType.START_OF_SPEECH && !open) {
          open = startStt();
          emit({ type: stt.SpeechEventType.START_OF_SPEECH });
        } else if (ev.type === VADEventType.END_OF_SPEECH && open) {
          const st = open; open = null;
          const vadEnd = Date.now();
          st.s.end();
          await Promise.race([st.ended, new Promise(r => setTimeout(r, 2500))]);
          const text = (st.text + st.interim).trim();
          Object.assign(this.marks, { speechEnd: vadEnd - SILENCE_MS, vadEnd, sttFinal: Date.now() });
          if (text) emit({ type: stt.SpeechEventType.FINAL_TRANSCRIPT, alternatives: [{ language: 'en-US', text, startTime: 0, endTime: 0, confidence: 1 }] });
          emit({ type: stt.SpeechEventType.END_OF_SPEECH });
        }
      }
    })();

    (async () => {
      for await (const f of audio) {
        rate ||= f.sampleRate;
        preroll.push(f);
        while (preroll.length > 25) preroll.shift(); // ~0.5 s of 20 ms frames, so the first word isn't clipped
        vadStream.pushFrame(f);
        open?.s.write({ audio: Buffer.from(f.data.buffer, f.data.byteOffset, f.data.byteLength) });
      }
      vadStream.endInput();
    })();

    return ReadableStream.from((async function* () {
      for (;;) {
        while (events.length) yield events.shift();
        await new Promise(r => (wake = r));
      }
    })());
  }

  async llmNode(chatCtx) {
    const messages = chatCtx.items
      .filter(i => i.type === 'message' && (i.role === 'user' || i.role === 'assistant') && i.textContent)
      .map(i => ({ role: i.role === 'user' ? 'user' : 'model', text: i.textContent + (i.interrupted ? ' [the person interrupted here]' : '') }));
    const thinking = this.hasBreakdown ? 'low' : 'high'; // ponder the Breakdown, keep the Dialogue fast
    this.marks.thinking = thinking;
    const r = await fetch(TURN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, thinking }) });
    if (!r.ok) throw new Error(`turn API ${r.status}: ${await r.text()}`);
    this.hasBreakdown = true;
    const marks = this.marks;
    const dec = new TextDecoder();
    return ReadableStream.from((async function* () {
      for await (const c of r.body) { marks.firstToken ??= Date.now(); yield dec.decode(c, { stream: true }); }
    })());
  }

  async ttsNode(text) {
    const self = this;
    return ReadableStream.from((async function* () {
      let buf = '';
      const queue = []; // synth promises, started as soon as each sentence is complete and played in order
      const flush = (final) => {
        const lines = buf.split('\n');
        buf = final ? '' : lines.pop();
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          const tag = line.match(/^\[A(\d+)\]\s*/);
          if (tag) { self.send({ type: 'pick', n: Number(tag[1]) }); line = line.slice(tag[0].length); }
          if (STRUCTURAL.test(line)) { self.send({ type: 'display', text: line }); continue; }
          for (const s of line.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) ?? []) if (s.trim()) queue.push(synthesize(s.trim()));
        }
      };
      const it = text[Symbol.asyncIterator]();
      let next = it.next();
      for (;;) {
        // keep reading text while earlier sentences synthesize and play
        while (queue.length === 0) {
          const { value, done } = await next;
          if (done) { flush(true); break; }
          buf += value; next = it.next();
          // a line ends, or a sentence ends mid-line: speak what's complete so far
          if (buf.includes('\n')) flush(false);
          else { const m = buf.match(/^(?!\d+\.\s|\+ |~\d+ |# |- |\[A)[\s\S]*?[.!?]["')]*\s+/); if (m) { buf = buf.slice(m[0].length); queue.push(synthesize(m[0].trim())); } }
        }
        if (queue.length === 0) return;
        const pcm = await queue.shift();
        self.marks.firstAudio ??= Date.now();
        for (let i = 0; i < pcm.length; i += 480) {
          const chunk = pcm.slice(i, i + 480);
          yield new AudioFrame(chunk, TTS_RATE, 1, chunk.length);
        }
      }
    })());
  }
}

export default defineAgent({
  prewarm: async proc => { proc.userData.vad = await silero.VAD.load({ minSilenceDuration: SILENCE_MS / 1000 }); },
  entry: async ctx => {
    await ctx.connect();
    const marks = {};
    const agent = new ProtoAgent({ vad: ctx.proc.userData.vad, room: ctx.room, marks });
    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad,
      turnHandling: {
        turnDetection: 'stt', // our sttNode already waited out the silence; don't add more
        endpointing: { minDelay: 0, maxDelay: 0 },
        interruption: { enabled: true, mode: 'vad', minDuration: 500 },
      },
    });
    let turnNo = 0;
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, ev => {
      agent.send({ type: 'agent-state', state: ev.newState });
      if (ev.newState === 'speaking' && marks.speechEnd) {
        const m = { ...marks, speaking: Date.now() };
        const rel = k => (m[k] ? m[k] - m.speechEnd : null);
        const t = { type: 'turn', n: ++turnNo, thinking: m.thinking, sttFinalMs: rel('sttFinal'), firstTokenMs: rel('firstToken'), firstAudioMs: rel('firstAudio'), speakingMs: rel('speaking') };
        console.log(JSON.stringify({ room: ctx.room.name, ...t }));
        agent.send(t);
        for (const k of Object.keys(marks)) delete marks[k];
      }
    });
    session.on(voice.AgentSessionEventTypes.AgentFalseInterruption, () => agent.send({ type: 'false-interruption' }));
    session.on(voice.AgentSessionEventTypes.SpeechCreated, ev => ev.speechHandle?.addDoneCallback?.(h => { if (h.interrupted) agent.send({ type: 'interrupted' }); }));
    await session.start({ agent, room: ctx.room });
  },
});

cli.runApp(new ServerOptions({
  agent: fileURLToPath(import.meta.url),
  agentName: 'proto-voice',
  loadThreshold: Number(process.env.LOAD_THRESHOLD ?? 0.95), // let the load test push past the default 0.7
}));
