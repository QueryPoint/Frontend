import { useState } from 'react';
import { searchService } from '../../services/searchService';

export const HistoryPage = () => {
  const [cleared, setCleared] = useState(false);

  const handleClear = async () => {
    if (!confirm('Очистить историю поиска?')) return;
    try {
      await searchService.clearHistory();
      setCleared(true);
    } catch (err) {
      console.error('Failed to clear history', err);
      alert('Не удалось очистить историю');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">История</h1>
          <p className="text-gray-600 mt-1">
            Backend пока не отдаёт список истории поиска — доступна только очистка.
          </p>
        </div>
        <button
          onClick={handleClear}
          className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Очистить историю
        </button>
      </div>

      {cleared && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🕐</p>
          <h3 className="text-lg font-medium text-gray-900">История очищена</h3>
        </div>
      )}
    </div>
  );
};