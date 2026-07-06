import { useCallback, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { searchService, SEARCH_PAGE_SIZE } from '../../services/searchService';
import styles from './Search.module.css';

interface SearchResult {
  file_name: string;
  page_number: number;
  chunk_id: string;
  text: string;
  score: number;
}

const sanitizeHighlight = (text: string): string =>
  DOMPurify.sanitize(text, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: [] });

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'empty' | 'error'>('idle');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = async (q: string, offset: number, replace: boolean) => {
    if (replace) {
      setState('loading');
    } else {
      setLoadingMore(true);
    }
    try {
      const res = await searchService.search(q, offset);
      const items: SearchResult[] = res.data || [];
      setResults((prev) => (replace ? items : [...prev, ...items]));
      setHasMore(items.length === SEARCH_PAGE_SIZE);
      if (replace) {
        setState(items.length === 0 ? 'empty' : 'success');
      }
    } catch (err) {
      console.error('Search failed', err);
      if (replace) setState('error');
    } finally {
      setLoadingMore(false);
    }
  };

  const search = (q: string) => {
    if (!q.trim()) return;
    fetchPage(q, 0, true);
  };

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || state !== 'success') return;
    fetchPage(query, results.length, false);
  }, [hasMore, loadingMore, state, query, results.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(query);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Поиск</h1>
        <p className={styles.subtitle}>Поиск по загруженным документам</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.searchWrap}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите поисковый запрос..."
            className={styles.input}
          />
        </div>
        <button type="submit" disabled={!query.trim() || state === 'loading'} className={styles.button}>
          Найти
        </button>
      </form>

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
          <button onClick={() => search(query)} className={styles.retry}>
            Попробовать снова
          </button>
        </div>
      )}

      {state === 'success' && (
        <div className={styles.results}>
          {results.map((result, index) => (
            <div key={`${result.chunk_id}-${index}`} className={styles.card}>
              <div className={styles.cardBody}>
                <div className={styles.cardMain}>
                  <div className={styles.cardMeta}>
                    <span className={styles.fileName}>{result.file_name}</span>
                    <span className={styles.pageNum}>Стр. {result.page_number}</span>
                    <span className={styles.score}>{result.score.toFixed(2)}</span>
                  </div>
                  <p
                    className={styles.snippet}
                    dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.text) }}
                  />
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <div ref={sentinelRef} className={styles.loadMoreSentinel}>
              {loadingMore && <div className={styles.spinner}></div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
