import { useState } from 'react';
import { searchService } from '../../services/searchService';
import styles from './Search.module.css';

interface SearchResult {
  file_name: string;
  page_number: number;
  chunk_id: string;
  text: string;
  score: number;
}

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'empty' | 'error'>('idle');

  const search = async (q: string) => {
    if (!q.trim()) return;
    setState('loading');
    try {
      const res = await searchService.search(q);
      const items: SearchResult[] = res.data || [];
      setResults(items);
      setState(items.length === 0 ? 'empty' : 'success');
    } catch (err) {
      console.error('Search failed', err);
      setState('error');
    }
  };

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
          {results.map((result) => (
            <div key={result.chunk_id} className={styles.card}>
              <div className={styles.cardBody}>
                <div className={styles.cardMain}>
                  <div className={styles.cardMeta}>
                    <span className={styles.fileName}>{result.file_name}</span>
                    <span className={styles.pageNum}>Стр. {result.page_number}</span>
                    <span className={styles.score}>{result.score.toFixed(2)}</span>
                  </div>
                  <p className={styles.snippet}>{result.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};