import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import styles from './Assistant.module.css';

interface Source {
  document_id: string;
  file_name: string;
  page: number;
  chunk_id: string;
  text: string;
  score: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

const QUICK_PROMPTS = [
  'Найди документы по теме',
  'Объясни тему проще',
  'Кратко расскажи документ',
  'Составь вопросы для самопроверки',
];

const WS_DOT_COLOR: Record<string, string> = {
  connected: '#4ade80',
  connecting: '#facc15',
  reconnecting: '#facc15',
  disconnected: '#f87171',
};

export const AssistantPage = () => {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('document_id');
  const { state: authState } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [assistantState, setAssistantState] = useState<'idle' | 'sending' | 'thinking' | 'streaming' | 'error'>('idle');
  const [wsState, setWsState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const sessionIdRef = useRef<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const wsUrl = import.meta.env.VITE_WS_URL
    || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/ws`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsState('connecting');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsState('connected');

    // ВНИМАНИЕ: формат сообщений backend'а (тип "think" и структура payload из очереди
    // LLM) не полностью описан в сверке путей backend/frontend — обработчик ниже сделан
    // по best-effort предположению и требует сверки с разделом WebSocket в guideline.
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type !== 'think') return;

      const messageId = data.message_id ?? sessionIdRef.current ?? 'current';
      const chunk = data.payload ?? data.message ?? '';

      setMessages((prev) => {
        const existing = prev.find((m) => m.id === messageId && m.isStreaming);
        if (existing) {
          return prev.map((m) =>
            m.id === messageId ? { ...m, content: m.content + chunk } : m
          );
        }
        return [...prev, { id: messageId, role: 'assistant', content: chunk, isStreaming: !data.done }];
      });

      if (data.done) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isStreaming: false, sources: data.sources } : m))
        );
        setAssistantState('idle');
      } else {
        setAssistantState('streaming');
      }
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setWsState('reconnecting');
      reconnectTimeout.current = setTimeout(() => {
        // eslint-disable-next-line react-hooks/immutability -- connectWS is stable via useCallback([wsUrl])
        if (isMountedRef.current) connectWS();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [wsUrl]);

  useEffect(() => {
    isMountedRef.current = true;
    if (authState === 'authenticated') connectWS();
    return () => {
      isMountedRef.current = false;
      wsRef.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [authState, connectWS]);

  const sendMessage = (text: string) => {
    if (!text.trim() || assistantState !== 'idle') return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('Нет соединения с сервером. Подождите...');
      return;
    }

    const userMsg: Message = {
      // eslint-disable-next-line react-hooks/purity -- id only needs to be unique per user action, not pure
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setAssistantState('sending');

    wsRef.current.send(JSON.stringify({
      type: 'prompt',
      prompt: text,
      doc: documentId || null,
    }));

    setInput('');
    setTimeout(() => {
      setAssistantState((prev) => prev === 'sending' ? 'thinking' : prev);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const wsStatusLabel = {
    connected: 'Подключено',
    connecting: 'Подключение...',
    reconnecting: 'Переподключение...',
    disconnected: 'Нет соединения',
  }[wsState];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.topBarTitle}>ИИ-ассистент</h1>
          {documentId && (
            <p className={styles.topBarDoc}>Режим документа</p>
          )}
        </div>
        <div className={styles.wsStatus}>
          <div className={styles.wsDot} style={{ background: WS_DOT_COLOR[wsState] }} />
          <span>{wsStatusLabel}</span>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.welcomeBox}>
            <img src="/cat-idle.png" alt="Кот-ассистент" className={styles.mascotIdle} />
            <h3 className={styles.welcomeTitle}>Задайте вопрос ассистенту</h3>
            <p className={styles.welcomeText}>Ассистент отвечает на основе загруженных документов</p>
            <div className={styles.quickPrompts}>
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className={styles.quickBtn}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.msgRow} ${msg.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant}`}>
            <div className={styles.msgBubble}>
              <div className={`${styles.msgContent} ${msg.role === 'user' ? styles.msgContentUser : styles.msgContentAssistant}`}>
                <p className={styles.msgText}>
                  {msg.content}
                  {msg.isStreaming && <span className={styles.cursor} />}
                </p>
              </div>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className={styles.sources}>
                  <p className={styles.sourcesLabel}>Источники:</p>
                  {msg.sources.map((source) => (
                    <div key={source.chunk_id} className={styles.sourceCard}>
                      <div className={styles.sourceHeader}>
                        <span className={styles.sourceName}>{source.file_name}</span>
                        <span className={styles.sourcePage}>Стр. {source.page}</span>
                      </div>
                      <p className={styles.sourceText}>{source.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {assistantState === 'thinking' && (
          <div className={`${styles.msgRow} ${styles.msgRowAssistant}`}>
            <div className={styles.thinkingBubble} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/cat-spin.gif" alt="Думает..." className={styles.mascotThinking} />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>ойиа ойиа ойиа...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишите сообщение..."
            disabled={assistantState !== 'idle'}
            className={styles.textInput}
          />
          <button
            type="submit"
            disabled={!input.trim() || assistantState !== 'idle'}
            className={styles.sendBtn}
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
};