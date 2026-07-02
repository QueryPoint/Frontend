import { useState, useRef, useCallback, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { searchService } from '../../services/searchService';
import { documentsService } from '../../services/documentsService';

interface SearchResult {
  chunk_id: string;
  document_id: string;
  file_name: string;
  page: number;
  text: string;
  highlight: string;
  score: number;
}

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'empty' | 'error' | 'loading_more'>('idle');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const currentQuery = useRef('');

  const search = async (q: string, p: number, append = false) => {
    if (!q.trim()) return;
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Поиск</h1>
        <p className="text-gray-600 mt-1">Поиск по загруженным документам</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Введите поисковый запрос..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
        />
        <button
          type="submit"
          disabled={!query.trim() || state === 'loading'}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          Найти
        </button>
      </form>

      {/* States */}
      {state === 'idle' && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg">Введите запрос и нажмите «Найти»</p>
        </div>
      )}

      {state === 'loading' && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )}

      {state === 'empty' && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🔎</p>
          <h3 className="text-lg font-medium text-gray-900">Ничего не найдено</h3>
          <p className="text-gray-600 mt-2">По вашему запросу ничего не найдено. Попробуйте изменить формулировку.</p>
        </div>
      )}

      {state === 'error' && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">⚠️</p>
          <h3 className="text-lg font-medium text-gray-900">Ошибка поиска</h3>
          <button onClick={() => search(currentQuery.current, 1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Попробовать снова
          </button>
        </div>
      )}

      {/* Results */}
      {(state === 'success' || state === 'loading_more') && (
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.chunk_id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-medium text-gray-900">{result.file_name}</span>
                    <span className="text-sm text-gray-500">Стр. {result.page}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {result.score.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className="mt-3 text-sm text-gray-700 leading-relaxed [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:rounded"
                    dangerouslySetInnerHTML={{ __html: sanitizeHighlight(result.highlight || result.text) }}
                  />
                </div>
                <button
                  onClick={() => handleDownload(result.document_id)}
                  className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Скачать"
                >
                  ⬇️
                </button>
              </div>
            </div>
          ))}

          {/* Infinite scroll trigger */}
          <div ref={loaderRef} className="py-4 flex justify-center">
            {state === 'loading_more' && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            )}
            {!hasMore && results.length > 0 && (
              <p className="text-sm text-gray-400">Все результаты загружены</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
