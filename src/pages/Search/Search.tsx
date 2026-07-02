import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../../services/authServise';
import styles from './Search.module.css';

interface SearchResult {
  chunk_id: string;
  document_id: string;
  file_name: string;
  page: number;
  text: string;
  highlight: string;
  score: number;
}

interface RecentItem {
  id: string;
  query: string;
  created_at: string;
}

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'empty' | 'error' | 'loading_more'>('idle');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [showRecents, setShowRecents] = useState(false);

  const loaderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentQuery = useRef('');
  const blurTimer = useRef<number | null>(null);

  const fetchRecents = async () => {
    try {
      const res = await api.get('/search/history', { params: { limit: 5 } });
      setRecents(res.data.items || []);
    } catch {
      setRecents([]);
    }
  };

  const search = async (q: string, p: number, append = false) => {
    if (!q.trim()) return;
    setShowRecents(false);
    setState(append ? 'loading_more' : 'loading');
    try {
      const res = await api.get('/search', { params: { q, page: p, limit: 10 } });
      const items = res.data.items || [];
      if (append) {
        setResults((prev) => [...prev, ...items]);
      } else {
        setResults(items);
      }
      setHasMore(res.data.has_more);
      setPage(p);
      setState(items.length === 0 && !append ? 'empty' : 'success');
      if (!append) fetchRecents();
    } catch {
      setState('error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    currentQuery.current = query;
    search(query, 1);
  };

  const handleFocus = () => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    setShowRecents(true);
    fetchRecents();
  };

  const handleBlur = () => {
    // small delay so a click on a recent item still registers
    blurTimer.current = window.setTimeout(() => setShowRecents(false), 150);
  };

  const pickRecent = (q: string) => {
    setQuery(q);
    currentQuery.current = q;
    setShowRecents(false);
    inputRef.current?.blur();
    search(q, 1);
  };

  // Infinite scroll
  const loadMore = useCallback(() => {
    if (state !== 'success' && state !== 'loading_more') return;
    if (!hasMore) return;
    search(currentQuery.current, page + 1, true);
  }, [state, hasMore, page]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleDownload = async (documentId: string) => {
    try {
      const res = await api.get(`/documents/${documentId}/download-url`, { params: { disposition: 'attachment' } });
      window.open(res.data.url, '_blank');
    } catch {
      alert('Не удалось получить ссылку');
    }
  };

  const recentsVisible = showRecents && query.trim() === '' && recents.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Поиск</h1>
        <p className={styles.subtitle}>Поиск по загруженным документам</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.searchWrap}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Введите поисковый запрос..."
            className={styles.input}
          />

          {recentsVisible && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>Недавние запросы</div>
              {recents.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={styles.dropdownItem}
                  // onMouseDown fires before blur, so selection isn't cancelled
                  onMouseDown={(e) => { e.preventDefault(); pickRecent(item.query); }}
                >
                  <span className={styles.dropdownIcon}>🕐</span>
                  <span className={styles.dropdownText}>{item.query}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!query.trim() || state === 'loading'}
          className={styles.button}
        >
          Найти
        </button>
      </form>

      {/* States */}
      {state === 'idle' && (
        <div className={styles.placeholder}>
          <p className={styles.placeholderIcon}>🔍</p>
          <p className={styles.placeholderText}>Введите запрос и нажмите «Найти»</p>
        </div>
      )}

      {state === 'loading' && (
        <div className={styles.center}>
          <div className={styles.spinner}></div>
        </div>
      )}

      {state === 'empty' && (
        <div className={styles.message}>
          <p className={styles.messageIcon}>🔎</p>
          <h3 className={styles.messageTitle}>Ничего не найдено</h3>
          <p className={styles.messageText}>По вашему запросу ничего не найдено. Попробуйте изменить формулировку.</p>
        </div>
      )}

      {state === 'error' && (
        <div className={styles.message}>
          <p className={styles.messageIcon}>⚠️</p>
          <h3 className={styles.messageTitle}>Ошибка поиска</h3>
          <button onClick={() => search(currentQuery.current, 1)} className={styles.retry}>
            Попробовать снова
          </button>
        </div>
      )}

      {/* Results */}
      {(state === 'success' || state === 'loading_more') && (
        <div className={styles.results}>
          {results.map((result) => (
            <div key={result.chunk_id} className={styles.card}>
              <div className={styles.cardBody}>
                <div className={styles.cardMain}>
                  <div className={styles.cardMeta}>
                    <span className={styles.fileName}>{result.file_name}</span>
                    <span className={styles.pageNum}>Стр. {result.page}</span>
                    <span className={styles.score}>{result.score.toFixed(2)}</span>
                  </div>
                  <div
                    className={styles.snippet}
                    dangerouslySetInnerHTML={{ __html: result.highlight || result.text }}
                  />
                </div>
                <button
                  onClick={() => handleDownload(result.document_id)}
                  className={styles.download}
                  title="Скачать"
                >
                  ⬇️
                </button>
              </div>
            </div>
          ))}

          {/* Infinite scroll trigger */}
          <div ref={loaderRef} className={styles.loader}>
            {state === 'loading_more' && <div className={styles.spinnerSm}></div>}
            {!hasMore && results.length > 0 && (
              <p className={styles.loaderDone}>Все результаты загружены</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
