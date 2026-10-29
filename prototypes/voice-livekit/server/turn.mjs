// PROTOTYPE, throwaway. Answers "How fast is a spoken turn over LiveKit on native, and does barge-in work on speakerphone?"
// (https://github.com/shrujancheruku/look-together/issues/31).
// Stands in for the backend: POST /turn streams one Gemini 3.8 Flash reply (on `us`) as plain text; GET /token hands a
// phone a LiveKit token for a fresh room with the voice worker dispatched into it. Stateless: history comes in each call.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';
import { AccessToken } from 'livekit-server-sdk';
import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol';

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT ?? 'look-together';
const MODEL = 'gemini-3.8-flash';
const LLM_URL = `https://aiplatform.us.rep.googleapis.com/v1/projects/${PROJECT}/locations/us/publishers/google/models/${MODEL}:streamGenerateContent?alt=sse`;
const PORT = Number(process.env.PORT ?? 8080);
const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;

// Same prompt as the browser prototype, so the two measurements compare like for like.
const SYSTEM = readFileSync(new URL('../../voice-dialogue/system-prompt.md', import.meta.url), 'utf8') + readFileSync(new URL('voice-addendum.md', import.meta.url), 'utf8');

const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });

async function turn(req, res) {
  let body = '';
  for await (const c of req) body += c;
  const { messages, thinking = 'low' } = JSON.parse(body);
  const t0 = Date.now();
  const r = await fetch(LLM_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await auth.getAccessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: { thinkingConfig: { thinkingLevel: thinking } },
    }),
  });
  if (!r.ok) { res.writeHead(502).end(`LLM ${r.status}: ${(await r.text()).slice(0, 300)}`); return; }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  let pending = '', first = 0;
  for await (const chunk of r.body) {
    pending += Buffer.from(chunk).toString('utf8');
    let i;
    while ((i = pending.indexOf('\n')) >= 0) {
      const l = pending.slice(0, i).trim();
      pending = pending.slice(i + 1);
      if (!l.startsWith('data:')) continue;
      const d = JSON.parse(l.slice(5));
      const text = (d.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought).map(p => p.text ?? '').join('');
      if (text) { first ||= Date.now() - t0; res.write(text); }
    }
  }
  res.end();
  console.log(`turn thinking=${thinking} firstToken=${first}ms total=${Date.now() - t0}ms`);
}

async function token(res, url) {
  const identity = url.searchParams.get('identity') ?? `phone-${randomUUID().slice(0, 6)}`;
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, { identity });
  at.addGrant({ room: `proto-${randomUUID().slice(0, 8)}`, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
  at.roomConfig = new RoomConfiguration({ agents: [new RoomAgentDispatch({ agentName: 'proto-voice' })] });
  res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ url: LIVEKIT_URL, token: await at.toJwt() }));
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/turn') return turn(req, res).catch(e => { console.error(e); res.destroy(); });
  if (url.pathname === '/token') return token(res, url);
  res.writeHead(404).end();
}).listen(PORT, () => console.log(`PROTOTYPE turn API on :${PORT} (${MODEL} on us, project ${PROJECT})`));
