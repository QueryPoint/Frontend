import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../../services/authServise';
import styles from './Search.module.css';

interface SearchResult { chunk_id: string; document_id: string; file_name: string; page: number; text: string; highlight: string; score: number; }

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<'idle'|'loading'|'success'|'empty'|'error'|'loading_more'>('idle');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const currentQuery = useRef('');

  const search = async (q: string, p: number, append = false) => {
    if (!q.trim()) return;
    setState(append ? 'loading_more' : 'loading');
    try {
      const res = await api.get('/search', { params: { q, page: p, limit: 10 } });
      const items = res.data.items || [];
      setResults(append ? (prev) => [...prev, ...items] : items);
      setHasMore(res.data.has_more);
      setPage(p);
      setState(items.length === 0 && !append ? 'empty' : 'success');
    } catch { setState('error'); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    currentQuery.current = query;
    search(query, 1);
  };

  const loadMore = useCallback(() => {
    if (state !== 'success' && state !== 'loading_more') return;
    if (!hasMore) return;
    search(currentQuery.current, page + 1, true);
  }, [state, hasMore, page]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  const handleDownload = async (documentId: string) => {
    try { const res = await api.get(`/documents/${documentId}/download-url`, { params: { disposition: 'attachment' } }); window.open(res.data.url, '_blank'); }
    catch { alert('Не удалось получить ссылку'); }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Поиск</h1>
      <p className={styles.subtitle}>Поиск по загруженным документам</p>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Введите поисковый запрос..." className={styles.searchInput} />
        <button type="submit" disabled={!query.trim() || state === 'loading'} className={styles.searchBtn}>Найти</button>
      </form>

      {state === 'idle' && <div className={styles.idle}><p className={styles.idleIcon}>🔍</p><p className={styles.idleText}>Введите запрос и нажмите «Найти»</p></div>}
      {state === 'loading' && <div className={styles.spinner}><div className={styles.spinnerCircle}></div></div>}
      {state === 'empty' && <div className={styles.empty}><p className={styles.emptyIcon}>🔎</p><h3 className={styles.emptyTitle}>Ничего не найдено</h3><p className={styles.emptyText}>Попробуйте изменить формулировку.</p></div>}
      {state === 'error' && <div className={styles.empty}><p className={styles.emptyIcon}>⚠️</p><h3 className={styles.emptyTitle}>Ошибка поиска</h3><button onClick={() => search(currentQuery.current, 1)} className={styles.retryBtn}>Попробовать снова</button></div>}

      {(state === 'success' || state === 'loading_more') && (
        <div className={styles.results}>
          {results.map((result) => (
            <div key={result.chunk_id} className={styles.resultCard}>
              <div className={styles.resultInner}>
                <div className={styles.resultContent}>
                  <div className={styles.resultMeta}>
                    <span className={styles.resultFile}>{result.file_name}</span>
                    <span className={styles.resultPage}>Стр. {result.page}</span>
                    <span className={styles.resultScore}>{result.score.toFixed(2)}</span>
                  </div>
                  <div className={styles.resultText} dangerouslySetInnerHTML={{ __html: result.highlight || result.text }} />
                </div>
                <button onClick={() => handleDownload(result.document_id)} className={styles.downloadBtn} title="Скачать">⬇️</button>
              </div>
            </div>
          ))}
          <div ref={loaderRef} className={styles.infiniteLoader}>
            {state === 'loading_more' && <div className={styles.spinnerSm}></div>}
            {!hasMore && results.length > 0 && <p className={styles.allLoaded}>Все результаты загружены</p>}
          </div>
        </div>
      )}
    </div>
  );
};