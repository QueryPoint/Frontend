import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

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
    || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ws`;

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

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'assistant.started') {
        sessionIdRef.current = data.session_id;
        setAssistantState('streaming');
        setMessages((prev) => [
          ...prev,
          { id: data.message_id, role: 'assistant', content: '', isStreaming: true },
        ]);
      } else if (data.type === 'assistant.delta') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id ? { ...m, content: m.content + data.delta } : m
          )
        );
      } else if (data.type === 'assistant.done') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id ? { ...m, isStreaming: false, sources: data.sources } : m
          )
        );
        setAssistantState('idle');
      } else if (data.type === 'assistant.error') {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'assistant', content: data.message || 'Произошла ошибка' },
        ]);
        setAssistantState('error');
        setTimeout(() => setAssistantState('idle'), 2000);
      }
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setWsState('reconnecting');
      reconnectTimeout.current = setTimeout(() => {
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
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setAssistantState('sending');

    wsRef.current.send(JSON.stringify({
      type: 'assistant.message',
      session_id: sessionIdRef.current,
      message: text,
      document_id: documentId || null,
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

  const wsStatusColor = {
    connected: 'bg-green-400',
    connecting: 'bg-yellow-400',
    reconnecting: 'bg-yellow-400 animate-pulse',
    disconnected: 'bg-red-400',
  }[wsState];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900">ИИ-ассистент</h1>
          {documentId && (
            <p className="text-xs text-gray-500">Режим документа</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className={`w-2 h-2 rounded-full ${wsStatusColor}`}></div>
          <span>
            {wsState === 'connected' ? 'Подключено' : wsState === 'connecting' ? 'Подключение...' : wsState === 'reconnecting' ? 'Переподключение...' : 'Нет соединения'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🤖</p>
            <h3 className="text-lg font-medium text-gray-900">Задайте вопрос ассистенту</h3>
            <p className="text-gray-600 mt-2 mb-6">Ассистент отвечает на основе загруженных документов</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-1 h-4 bg-current ml-1 animate-pulse" />
                  )}
                </p>
              </div>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-gray-500 font-medium">Источники:</p>
                  {msg.sources.map((source) => (
                    <div key={source.chunk_id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">{source.file_name}</span>
                        <span className="text-xs text-gray-400">Стр. {source.page}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{source.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {assistantState === 'thinking' && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишите сообщение..."
            disabled={assistantState !== 'idle'}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || assistantState !== 'idle'}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
};
