import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../../services/searchService';
import { formatDate } from '../../utils/format';

interface HistoryItem {
  id: string;
  query: string;
  created_at: string;
}

export const HistoryPage = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'empty' | 'error'>('loading');
  const navigate = useNavigate();

  const fetchHistory = async () => {
    setState('loading');
    try {
      const res = await searchService.history(50);
      const data = res.data.items || [];
      setItems(data);
      setState(data.length === 0 ? 'empty' : 'success');
    } catch (err) {
      console.error('Failed to fetch history', err);
      setState('error');
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleClear = async () => {
    if (!confirm('Очистить историю поиска?')) return;
    try {
      await searchService.clearHistory();
      setItems([]);
      setState('empty');
    } catch (err) {
      console.error('Failed to clear history', err);
      alert('Не удалось очистить историю');
    }
  };

  const repeatSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">История</h1>
          <p className="text-gray-600 mt-1">Ваши поисковые запросы</p>
        </div>
        {state === 'success' && (
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Очистить историю
          </button>
        )}
      </div>

      {state === 'loading' && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )}

      {state === 'empty' && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🕐</p>
          <h3 className="text-lg font-medium text-gray-900">История пуста</h3>
          <p className="text-gray-600 mt-2">Ваши поисковые запросы появятся здесь</p>
        </div>
      )}

      {state === 'error' && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">⚠️</p>
          <button onClick={fetchHistory} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Попробовать снова
          </button>
        </div>
      )}

      {state === 'success' && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between hover:border-blue-200 transition-colors cursor-pointer"
              onClick={() => repeatSearch(item.query)}
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-400">🔍</span>
                <span className="text-gray-900 font-medium">{item.query}</span>
              </div>
              <span className="text-sm text-gray-400 flex-shrink-0 ml-4">{formatDate(item.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
