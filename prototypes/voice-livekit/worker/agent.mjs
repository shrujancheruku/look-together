// PROTOTYPE, throwaway. Answers "How fast is a spoken turn over LiveKit on native, and does barge-in work on speakerphone?"
// (https://github.com/shrujancheruku/look-together/issues/31).
// LiveKit Agents for Node worker: phone audio -> Silero VAD opens a Cloud STT v2 `long` stream (us), which stays open
// until the person taps Done (#33) -> the turn API returns a whole {reply, distress, events} from Gemini 3.8 Flash on us
// -> Cloud TTS Chirp 3 HD per sentence (us) -> phone. Events go to the phone as data, never spoken. Every turn's timings,
// measured from Done, go to the phone and the log. Nothing is stored.
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
const SILENCE_MS = 800; // VAD's silence wait; only matters for barge-in now that Done ends the turn
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

class ProtoAgent extends voice.Agent {
  constructor({ vad, room, marks }) {
    super({ instructions: 'unused: the turn API holds the prompt' });
    this.vad = vad; this.room = room; this.marks = marks;
    this.hasBreakdown = false;
    this.onDone = () => {};
  }

  send(msg) {
    this.room.localParticipant?.publishData(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true, topic: 'proto' }).catch(() => {});
  }

  // VAD opens a Cloud STT stream at the first speech; pauses don't close it. Done half-closes it and the final transcript
  // follows, so the turn is the person's to end.
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
          if (res.isFinal) { st.text += (st.text ? ' ' : '') + t.trim(); st.interim = ''; } else st.interim = t;
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
        }
      }
    })();

    this.onDone = async () => {
      const doneAt = Date.now();
      if (!open) { this.send({ type: 'log', text: 'Done with nothing heard' }); return; }
      const st = open; open = null;
      st.s.end();
      await Promise.race([st.ended, new Promise(r => setTimeout(r, 2500))]);
      const text = (st.text + st.interim).trim();
      for (const k of Object.keys(this.marks)) delete this.marks[k];
      Object.assign(this.marks, { done: doneAt, sttFinal: Date.now() });
      if (text) emit({ type: stt.SpeechEventType.FINAL_TRANSCRIPT, alternatives: [{ language: 'en-US', text, startTime: 0, endTime: 0, confidence: 1 }] });
      emit({ type: stt.SpeechEventType.END_OF_SPEECH });
    };

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
    const out = await r.json();
    Object.assign(this.marks, { replyWhole: Date.now(), modelFirstTokenMs: out.timing.firstTokenMs, modelWholeMs: out.timing.wholeMs });
    for (const e of out.events ?? []) this.send({ type: 'event', event: e });
    if (out.distress) this.send({ type: 'event', event: { type: 'distress' } });
    return ReadableStream.from((async function* () { yield out.reply; })());
  }

  // The reply arrives whole: synthesize every sentence at once and play them in order.
  async ttsNode(text) {
    const self = this;
    return ReadableStream.from((async function* () {
      let all = '';
      for await (const t of text) all += t;
      const queue = (all.match(/[^.!?]+[.!?]+["')]*\s*|[^.!?]+$/g) ?? []).map(x => x.trim()).filter(Boolean).map(synthesize);
      for (const p of queue) {
        const pcm = await p;
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
    ctx.room.on('dataReceived', (payload, _p, _k, topic) => {
      if (topic === 'proto' && JSON.parse(new TextDecoder().decode(payload)).type === 'done') agent.onDone();
    });
    const session = new voice.AgentSession({
      vad: ctx.proc.userData.vad,
      turnHandling: {
        turnDetection: 'stt', // our sttNode only ends the turn on Done; don't add any wait
        endpointing: { minDelay: 0, maxDelay: 0 },
        interruption: { enabled: true, mode: 'vad', minDuration: 500 },
      },
    });
    let turnNo = 0;
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, ev => {
      agent.send({ type: 'agent-state', state: ev.newState });
      if (ev.newState === 'speaking' && marks.done) {
        const m = { ...marks, speaking: Date.now() };
        const rel = k => (m[k] ? m[k] - m.done : null);
        // all from Done; modelFirstTokenMs/modelWholeMs are the model's own, so whole - first is what waiting for the whole reply costs
        const t = { type: 'turn', n: ++turnNo, thinking: m.thinking, sttFinalMs: rel('sttFinal'), replyWholeMs: rel('replyWhole'), firstAudioMs: rel('firstAudio'), speakingMs: rel('speaking'), modelFirstTokenMs: m.modelFirstTokenMs, modelWholeMs: m.modelWholeMs };
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
