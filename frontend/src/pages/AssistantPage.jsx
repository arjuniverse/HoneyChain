import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../App.jsx';
import { Card, PageHead } from '../components/ui.jsx';

const SUGGESTIONS = [
  { en: 'Is my Hive 07 healthy?', hi: 'क्या मेरा हाइव 07 स्वस्थ है?', kn: 'ನನ್ನ ಹೈವ್ 07 ಆರೋಗ್ಯಕರವೇ?' },
  { en: 'When is the predicted harvest for hive 03?', hi: 'हाइव 03 की फसल कब है?', kn: 'ಹೈವ್ 03 ನ ಸುಗ್ಗಿ ಯಾವಾಗ?' },
  { en: 'Any alerts today?', hi: 'क्या कोई नोटिस है?', kn: 'ಇಂದು ಯಾವುದೇ ಎಚ್ಚರಿಕೆ ಇದೆಯೇ?' },
  { en: 'What about the weather for the week?', hi: 'मौसम कैसा है?', kn: 'ಹವಾಮಾನ ಹೇಗಿದೆ?' },
];

export default function AssistantPage() {
  const { me, lang } = useApp();
  const [chat, setChat] = useState([{ from: 'ai', text: `Namaste ${me?.name || 'ji'}. Ask me about hive health, harvest predictions, alerts or weather — I speak English, हिन्दी and ಕನ್ನಡ. 🐝`, footer: `Voice assistant · lang ${lang}` }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  async function ask(text) {
    if (!text.trim() || busy) return;
    setChat(c => [...c, { from: 'me', text }]);
    setInput(''); setBusy(true);
    try {
      const r = await api.assistant(text, lang);
      const reply = lang === 'hi' ? (r.reply || `हाइव ${r.hiveNo}: ${r.status}`) : lang === 'kn' ? (r.reply || `ಹೈವ್ ${r.hiveNo}: ${r.status}`) : r.reply;
      setChat(c => [...c, { from: 'ai', text: reply, footer: `intent: ${r.intent} · hive ${r.hiveNo || '—'} · ${r.status || ''}` }]);
    } catch (e) { setChat(c => [...c, { from: 'ai', text: 'Sorry, connection issue. Offline queue will sync when back online.' }]); }
    setBusy(false);
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  const suggs = SUGGESTIONS.map(s => s[lang] || s.en);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="🎙️ Beekeeper Voice/Text Assistant" sub="Offline-first: typed queries queue locally and sync over MQTT/HTTP when connectivity returns." />
      <Card className="flex flex-col">
        <div className="h-[360px] space-y-3 overflow-y-auto pr-1">
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.from === 'me' ? 'bg-bee-800 text-white' : 'bg-cream ring-1 ring-black/5'}`}>
                {m.text}
                {m.footer && <div className="mt-1 text-[10px] text-stone-400">{m.footer}</div>}
              </div>
            </div>
          ))}
          {busy && <div className="flex justify-start"><div className="rounded-2xl bg-cream px-4 py-2 text-sm text-stone-400">thinking 🐝…</div></div>}
          <div ref={endRef} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggs.map(s => <button key={s} onClick={() => ask(s)} className="rounded-full bg-honey-100 px-3 py-1 text-[11px] font-semibold text-honey-800 hover:bg-honey-200">{s}</button>)}
        </div>

        <div className="mt-3 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask(input)}
            placeholder="Type in English / हिन्दी / ಕನ್ನಡ…" className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm" />
          <button onClick={() => input && speak(input)} className="rounded-full bg-cream px-3 py-2 text-lg ring-1 ring-black/10" title="Listen">🔊</button>
          <button onClick={() => ask(input)} disabled={busy} className="rounded-full bg-honey-500 px-5 py-2.5 text-sm font-bold text-bee-950 hover:bg-honey-400 disabled:opacity-50">Send</button>
        </div>
        <p className="mt-2 text-[11px] text-stone-400">AI responses are assisted early-warning only — always verify on-site and with certified lab tests.</p>
      </Card>
    </div>
  );
}