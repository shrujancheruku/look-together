// PROTOTYPE, throwaway. Answers "How fast is a spoken turn over LiveKit on native, and does barge-in work on speakerphone?"
// (https://github.com/shrujancheruku/look-together/issues/31). One screen: connect, talk, read each turn's timings.
import { useEffect, useRef, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AndroidAudioTypePresets, AudioSession, registerGlobals } from '@livekit/react-native';
import { Participant, Room, RoomEvent } from 'livekit-client';

registerGlobals();

type Turn = { n: number; thinking: string; sttFinalMs: number; firstTokenMs: number; firstAudioMs: number; speakingMs: number; heardMs?: number };

export default function App() {
  const [base, setBase] = useState(process.env.EXPO_PUBLIC_BASE_URL ?? 'https://');
  const [room, setRoom] = useState<Room | null>(null);
  const [speaker, setSpeaker] = useState(true);
  const [state, setState] = useState('-');
  const [interim, setInterim] = useState('');
  const [cards, setCards] = useState<string[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [counts, setCounts] = useState({ interrupted: 0, falseInterruption: 0 });
  // rough client-side timing from the SFU's speaker events: when I stop being an active speaker, when the app starts
  const quietAt = useRef(0), heard = useRef<number[]>([]);
  const note = (s: string) => setLog(l => [`${new Date().toISOString().slice(14, 23)} ${s}`, ...l].slice(0, 40));

  async function start() {
    await AudioSession.configureAudio({
      android: { preferredOutputList: speaker ? ['speaker'] : ['earpiece'], audioTypeOptions: AndroidAudioTypePresets.communication },
    });
    await AudioSession.startAudioSession();
    const { url, token } = await (await fetch(`${base.replace(/\/$/, '')}/token`)).json();
    const r = new Room({ adaptiveStream: false });
    r.on(RoomEvent.DataReceived, (payload, _p, _k, topic) => {
      if (topic !== 'proto') return;
      const m = JSON.parse(new TextDecoder().decode(payload));
      if (m.type === 'agent-state') { setState(m.state); note(`agent ${m.state}`); }
      else if (m.type === 'interim') setInterim(m.text);
      else if (m.type === 'display') setCards(c => [...c, m.text]);
      else if (m.type === 'pick') note(`picked A${m.n}`);
      else if (m.type === 'turn') setTurns(t => [{ ...m, heardMs: heard.current.shift() }, ...t]);
      else if (m.type === 'interrupted') { setCounts(c => ({ ...c, interrupted: c.interrupted + 1 })); note('app was interrupted'); }
      else if (m.type === 'false-interruption') { setCounts(c => ({ ...c, falseInterruption: c.falseInterruption + 1 })); note('FALSE interruption (echo or noise?)'); }
    });
    r.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      const me = speakers.some(s => s.isLocal), agent = speakers.some(s => s.isAgent);
      if (!me && !agent && !quietAt.current) quietAt.current = Date.now();
      if (me) quietAt.current = 0;
      if (agent && quietAt.current) { heard.current.push(Date.now() - quietAt.current); quietAt.current = 0; }
    });
    r.on(RoomEvent.Disconnected, () => note('disconnected'));
    await r.connect(url, token);
    await r.localParticipant.setMicrophoneEnabled(true);
    setRoom(r); note(`connected to ${r.name}`);
  }

  async function stop() {
    await room?.disconnect();
    await AudioSession.stopAudioSession();
    setRoom(null);
  }

  useEffect(() => { if (room) AudioSession.selectAudioOutput(speaker ? 'speaker' : 'earpiece').catch(() => {}); }, [speaker, room]);

  const dialogue = turns.filter(t => t.thinking === 'low').map(t => t.speakingMs).sort((a, b) => a - b);
  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16, paddingTop: 56 }}>
      <Text style={s.h}>PROTOTYPE voice over LiveKit</Text>
      <TextInput style={s.input} value={base} onChangeText={setBase} autoCapitalize="none" editable={!room} />
      <View style={s.row}>
        {room ? <Button title="Hang up" onPress={stop} /> : <Button title="Start Inquiry" onPress={() => start().catch(e => note(String(e)))} />}
        <Button title={speaker ? 'Speaker: ON' : 'Speaker: off'} onPress={() => setSpeaker(x => !x)} />
      </View>
      <Text>Agent: {state}   interrupted: {counts.interrupted}   false interruptions: {counts.falseInterruption}</Text>
      <Text style={s.dim}>Heard: {interim}</Text>
      {cards.map((c, i) => <Text key={i} style={s.card}>{c}</Text>)}
      <Text style={s.h2}>Turns (ms after end of speech)</Text>
      <Text style={s.dim}>Dialogue median to agent speaking: {dialogue.length ? dialogue[dialogue.length >> 1] : '-'} ms over {dialogue.length} turns</Text>
      {turns.map(t => (
        <Text key={t.n} style={s.mono}>
          #{t.n} {t.thinking.padEnd(4)} stt {t.sttFinalMs} · token {t.firstTokenMs} · audio {t.firstAudioMs} · speaking {t.speakingMs} · heard~{t.heardMs ?? '?'}
        </Text>
      ))}
      <Text style={s.h2}>Log</Text>
      {log.map((l, i) => <Text key={i} style={s.mono}>{l}</Text>)}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  h: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  h2: { fontSize: 15, fontWeight: '600', marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  dim: { color: '#666', marginVertical: 4 },
  card: { borderWidth: 1, borderColor: '#ddd', padding: 8, marginVertical: 3 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
});
