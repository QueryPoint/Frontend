import { useState, useRef, useCallback, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { searchService } from '../../services/searchService';
import { documentsService } from '../../services/documentsService';
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

interface HistoryItem {
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
  const [recentSearches, setRecentSearches] = useState<HistoryItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const currentQuery = useRef('');
  const formWrapRef = useRef<HTMLDivElement>(null);

  const search = async (q: string, p: number, append = false) => {
    if (!q.trim()) return;
    setShowDropdown(false);
    setState(append ? 'loading_more' : 'loading');
    try {
      const res = await searchService.search(q, p, 10);
      const items = res.data.items || [];
      if (append) {
        setResults((prev) => [...prev, ...items]);
      } else {
        setResults(items);
      }
      setHasMore(res.data.has_more);
      setPage(p);
      setState(items.length === 0 && !append ? 'empty' : 'success');
    } catch (err) {
      console.error('Search failed', err);
      setState('error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    currentQuery.current = query;
    search(query, 1);
  };

  const handleFocus = async () => {
    setShowDropdown(true);
    try {
      const res = await searchService.history(5);
      setRecentSearches(res.data.items || []);
    } catch (err) {
      console.error('Failed to fetch recent searches', err);
    }
  };

  const handleSelectRecent = (q: string) => {
    setQuery(q);
    currentQuery.current = q;
    search(q, 1);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (formWrapRef.current && !formWrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const res = await documentsService.downloadUrl(documentId, 'attachment');
      window.open(res.data.url, '_blank');
    } catch (err) {
      console.error('Failed to get download url', err);
      alert('Не удалось получить ссылку');
    }
  };

  // only <mark> is allowed to survive sanitization — everything else from the
  // server's highlight field is stripped to prevent XSS via search results
  const sanitizeHighlight = (html: string) =>
    DOMPurify.sanitize(html, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: [] });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Поиск</h1>
        <p className={styles.subtitle}>Поиск по загруженным документам</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.searchWrap} ref={formWrapRef}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            placeholder="Введите поисковый запрос..."
            className={styles.input}
          />

          {showDropdown && recentSearches.length > 0 && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>Недавние запросы</div>
              {recentSearches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleSelectRecent(item.query)}
                >
                  <span className={styles.dropdownIcon}>🕐</span>
                  <span className={styles.dropdownText}>{item.query}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={!query.trim() || state === 'loading'} className={styles.button}>
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
                    dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.highlight || result.text) }}
                  />
                </div>
                <button onClick={() => handleDownload(result.document_id)} className={styles.download} title="Скачать">
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
