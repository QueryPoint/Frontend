import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { documentsService } from '../../services/documentsService';
import { formatSize, formatDate } from '../../utils/format';

interface Document {
  id: string;
  file_name: string;
  file_type: 'pdf' | 'docx';
  size: number;
  status: string;
  security_status: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  uploaded: { label: 'Загружен', color: 'bg-blue-100 text-blue-700' },
  processing: { label: 'Обработка', color: 'bg-yellow-100 text-yellow-700' },
  extracting_text: { label: 'Извлечение текста', color: 'bg-yellow-100 text-yellow-700' },
  indexing: { label: 'Индексация', color: 'bg-purple-100 text-purple-700' },
  ready: { label: 'Готов', color: 'bg-green-100 text-green-700' },
  error: { label: 'Ошибка', color: 'bg-red-100 text-red-700' },
};

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [state, setState] = useState<'loading' | 'success' | 'empty' | 'error'>('loading');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchDocuments = async (q?: string) => {
    setState('loading');
    try {
      const res = await documentsService.list(q);
      const items = res.data.items || [];
      setDocuments(items);
      setState(items.length === 0 ? 'empty' : 'success');
    } catch (err) {
      console.error('Failed to fetch documents', err);
      setState('error');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments(search);
  };

  const handleDownload = async (doc: Document) => {
    try {
      const res = await documentsService.downloadUrl(doc.id, 'attachment');
      window.open(res.data.url, '_blank');
    } catch (err) {
      console.error('Failed to get download url', err);
      alert('Не удалось получить ссылку на скачивание');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await documentsService.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (documents.length === 1) setState('empty');
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete document', err);
      alert('Не удалось удалить документ');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Документы</h1>
          <p className="text-gray-600 mt-1">Загруженные учебные материалы</p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <span>⬆️</span>
          Загрузить документ
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Найти
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); fetchDocuments(); }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Сбросить
          </button>
        )}
      </form>

      {/* Loading */}
      {state === 'loading' && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty */}
      {state === 'empty' && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">📂</p>
          <h3 className="text-lg font-medium text-gray-900">Нет документов</h3>
          <p className="text-gray-600 mt-2">Загрузите первый документ в базу знаний</p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Загрузить документ
          </Link>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">⚠️</p>
          <h3 className="text-lg font-medium text-gray-900">Ошибка загрузки</h3>
          <button
            onClick={() => fetchDocuments()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {/* Document list */}
      {state === 'success' && (
        <div className="space-y-3">
          {documents.map((doc) => {
            const status = STATUS_LABELS[doc.status] || { label: doc.status, color: 'bg-gray-100 text-gray-700' };
            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-blue-200 transition-colors"
              >
                {/* Icon */}
                <div className="text-3xl flex-shrink-0">
                  {doc.file_type === 'pdf' ? '📕' : '📘'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3
                      className="font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      {doc.file_name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                    <span>{doc.file_type.toUpperCase()}</span>
                    <span>{formatSize(doc.size)}</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                  {doc.error_message && (
                    <p className="mt-1 text-sm text-red-600">{doc.error_message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Детали"
                  >
                    🔎
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Скачать"
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(doc.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Удалить документ?</h3>
            <p className="mt-2 text-gray-600">Это действие нельзя отменить. Документ будет удален из базы знаний.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Удалить
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
