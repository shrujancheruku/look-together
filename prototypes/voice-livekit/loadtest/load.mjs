// PROTOTYPE, throwaway. Part of https://github.com/shrujancheruku/look-together/issues/31.
// Runs N spoken Inquiries at once against the VM: each bot joins its own room, says a Problem and then a few Dialogue
// replies (macOS `say` audio), and times the end of its speech to the first audible audio back from the worker.
// Run: pnpm load https://<ip>.sslip.io 1 5 10 20   (one round per concurrency level)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { AudioFrame, AudioSource, AudioStream, LocalAudioTrack, Room, RoomEvent, TrackKind, TrackPublishOptions, TrackSource } from '@livekit/rtc-node';

const [base, ...levels] = process.argv.slice(2);
const RATE = 48000, FRAME = 480; // 10 ms
const LINES = [
  'I keep putting off calling my father, and I feel guilty about it every week.',
  'The second one, I think.',
  'Maybe that he will be disappointed in me if we talk.',
  'I am not sure. Perhaps I just want to avoid an argument.',
];
const dir = new URL('.', import.meta.url).pathname;

function clip(i) {
  const f = `${dir}line${i}.wav`;
  if (!existsSync(f)) execFileSync('say', ['-o', f, `--data-format=LEI16@${RATE}`, LINES[i]]);
  const b = readFileSync(f);
  const at = b.indexOf('data') + 8; // skip to the PCM
  return new Int16Array(b.buffer.slice(b.byteOffset + at, b.byteOffset + b.length));
}
const CLIPS = LINES.map((_, i) => clip(i));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

async function bot(id) {
  const { url, token } = await (await fetch(`${base}/token?identity=bot-${id}`)).json();
  const room = new Room();
  const server = [];
  room.on(RoomEvent.DataReceived, (payload, _p, _k, topic) => {
    if (topic !== 'proto') return;
    const m = JSON.parse(new TextDecoder().decode(payload));
    if (m.type === 'turn') server.push(m);
  });
  let lastLoud = 0, firstLoudAfter = null, speechEnd = 0;
  room.on(RoomEvent.TrackSubscribed, track => {
    if (track.kind !== TrackKind.KIND_AUDIO) return;
    (async () => {
      for await (const f of new AudioStream(track)) {
        let e = 0;
        for (let i = 0; i < f.data.length; i++) e += f.data[i] * f.data[i];
        if (Math.sqrt(e / f.data.length) > 300) {
          lastLoud = Date.now();
          if (speechEnd && firstLoudAfter === null) firstLoudAfter = lastLoud;
        }
      }
    })();
  });
  await room.connect(url, token, { autoSubscribe: true, dynacast: false });
  const source = new AudioSource(RATE, 1);
  const track = LocalAudioTrack.createAudioTrack('mic', source);
  await room.localParticipant.publishTrack(track, new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE }));
  const silence = new Int16Array(FRAME);
  let speaking = null;
  // a real mic never stops sending, so neither does the bot: silence between lines
  const pump = (async () => {
    for (;;) {
      if (!room.isConnected) return;
      const pcm = speaking?.shift() ?? silence;
      await source.captureFrame(new AudioFrame(pcm, RATE, 1, FRAME));
    }
  })();
  await sleep(1500); // let the worker join
  const turns = [];
  for (let i = 0; i < CLIPS.length; i++) {
    const frames = [];
    for (let j = 0; j < CLIPS[i].length; j += FRAME) { const fr = new Int16Array(FRAME); fr.set(CLIPS[i].subarray(j, j + FRAME)); frames.push(fr); }
    firstLoudAfter = null; speechEnd = 0;
    speaking = frames;
    while (speaking.length) await sleep(10);
    speechEnd = Date.now();
    const deadline = speechEnd + 30000;
    while (firstLoudAfter === null && Date.now() < deadline) await sleep(20);
    turns.push({ turn: i + 1, thinking: i === 0 ? 'high' : 'low', heardMs: firstLoudAfter ? firstLoudAfter - speechEnd : null });
    while (Date.now() - lastLoud < 1500 && Date.now() < deadline + 60000) await sleep(100); // let the reply finish
  }
  await room.disconnect();
  await pump.catch(() => {});
  return { id, turns, server };
}

for (const n of levels.map(Number)) {
  const t0 = Date.now();
  const results = await Promise.all(Array.from({ length: n }, (_, i) => bot(`${n}-${i}`).catch(e => ({ id: i, error: e.message }))));
  const dialogue = results.flatMap(r => r.turns ?? []).filter(t => t.thinking === 'low');
  const heard = dialogue.map(t => t.heardMs).filter(x => x != null);
  const breakdown = results.flatMap(r => r.turns ?? []).filter(t => t.thinking === 'high').map(t => t.heardMs).filter(x => x != null);
  const srv = results.flatMap(r => r.server ?? []).filter(t => t.thinking === 'low');
  const med = k => pct(srv.map(t => t[k]).filter(x => x != null), 0.5);
  console.log(JSON.stringify({
    concurrent: n, errors: results.filter(r => r.error).map(r => r.error), missedTurns: dialogue.length - heard.length,
    dialogueHeardMs: { p50: pct(heard, 0.5), p90: pct(heard, 0.9), max: Math.max(...heard) },
    breakdownHeardMs: { p50: pct(breakdown, 0.5) },
    workerMedianMsFromSpeechEnd: { sttFinal: med('sttFinalMs'), firstToken: med('firstTokenMs'), firstAudio: med('firstAudioMs'), speaking: med('speakingMs') },
    roundSec: Math.round((Date.now() - t0) / 1000),
  }));
}
process.exit(0);
