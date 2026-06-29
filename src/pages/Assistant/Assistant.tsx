import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import styles from './Assistant.module.css';

interface Source { document_id: string; file_name: string; page: number; chunk_id: string; text: string; score: number; }
interface Message { id: string; role: 'user'|'assistant'; content: string; sources?: Source[]; isStreaming?: boolean; }

const QUICK_PROMPTS = ['Найди документы по теме', 'Объясни тему проще', 'Кратко расскажи документ', 'Составь вопросы для самопроверки'];
const WS_COLOR = { connected: '#4ade80', connecting: '#facc15', reconnecting: '#facc15', disconnected: '#f87171' };
const WS_LABEL = { connected: 'Подключено', connecting: 'Подключение...', reconnecting: 'Переподключение...', disconnected: 'Нет соединения' };

export const AssistantPage = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('document_id');
  const { state: authState } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [assistantState, setAssistantState] = useState<'idle'|'sending'|'thinking'|'streaming'|'error'>('idle');
  const [sessionId, setSessionId] = useState<string|null>(null);
  const [wsState, setWsState] = useState<'connecting'|'connected'|'reconnecting'|'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket|null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsState('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);
    wsRef.current = ws;
    ws.onopen = () => setWsState('connected');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'assistant.started') {
        setSessionId(data.session_id); setAssistantState('streaming');
        setMessages((prev) => [...prev, { id: data.message_id, role: 'assistant', content: '', isStreaming: true }]);
      } else if (data.type === 'assistant.delta') {
        setMessages((prev) => prev.map((m) => m.id === data.message_id ? { ...m, content: m.content + data.delta } : m));
      } else if (data.type === 'assistant.done') {
        setMessages((prev) => prev.map((m) => m.id === data.message_id ? { ...m, isStreaming: false, sources: data.sources } : m));
        setAssistantState('idle');
      } else if (data.type === 'assistant.error') {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.message || 'Произошла ошибка' }]);
        setAssistantState('error'); setTimeout(() => setAssistantState('idle'), 2000);
      }
    };
    ws.onclose = () => { setWsState('reconnecting'); reconnectTimeout.current = setTimeout(() => connectWS(), 3000); };
    ws.onerror = () => { ws.close(); };
  }, []);

  useEffect(() => {
    if (authState === 'authenticated') connectWS();
    return () => { wsRef.current?.close(); if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current); };
  }, [authState, connectWS]);

  const sendMessage = (text: string) => {
    if (!text.trim() || assistantState !== 'idle') return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { alert('Нет соединения. Подождите...'); return; }
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
    setAssistantState('sending');
    wsRef.current.send(JSON.stringify({ type: 'assistant.message', session_id: sessionId, message: text, document_id: documentId || null }));
    setInput('');
    setTimeout(() => { setAssistantState((prev) => prev === 'sending' ? 'thinking' : prev); }, 500);
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div><h1 className={styles.topBarTitle}>ИИ-ассистент</h1>{documentId && <p className={styles.topBarDoc}>Режим документа</p>}</div>
        <div className={styles.wsStatus}><div className={styles.wsDot} style={{ background: WS_COLOR[wsState] }}></div><span>{WS_LABEL[wsState]}</span></div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.welcomeBox}>
            <p className={styles.welcomeIcon}>🤖</p>
            <h3 className={styles.welcomeTitle}>Задайте вопрос ассистенту</h3>
            <p className={styles.welcomeText}>Ассистент отвечает на основе загруженных документов</p>
            <div className={styles.quickPrompts}>{QUICK_PROMPTS.map((p) => <button key={p} onClick={() => sendMessage(p)} className={styles.quickBtn}>{p}</button>)}</div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant}`}>
            <div className={styles.msgBubble}>
              <div className={`${styles.msgContent} ${msg.role === 'user' ? styles.msgContentUser : styles.msgContentAssistant}`}>
                <p className={styles.msgText}>{msg.content}{msg.isStreaming && <span className={styles.cursor} />}</p>
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className={styles.sources}>
                  <p className={styles.sourcesLabel}>Источники:</p>
                  {msg.sources.map((s) => (
                    <div key={s.chunk_id} className={styles.sourceCard}>
                      <div className={styles.sourceHeader}><span className={styles.sourceName}>{s.file_name}</span><span className={styles.sourcePage}>Стр. {s.page}</span></div>
                      <p className={styles.sourceText}>{s.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {assistantState === 'thinking' && (
          <div className={styles.msgRow}>
            <div className={styles.thinkingBubble}>
              <div className={styles.dots}>
                <div className={styles.dot} style={{ animationDelay: '0ms' }}></div>
                <div className={styles.dot} style={{ animationDelay: '150ms' }}></div>
                <div className={styles.dot} style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className={styles.inputForm}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Напишите сообщение..." disabled={assistantState !== 'idle'} className={styles.textInput} />
          <button type="submit" disabled={!input.trim() || assistantState !== 'idle'} className={styles.sendBtn}>➤</button>
        </form>
      </div>
    </div>
  );
};