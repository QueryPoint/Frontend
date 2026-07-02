import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentsService } from '../../services/documentsService';
import { formatSize, formatDate } from '../../utils/format';

interface DocumentDetail {
  id: string;
  file_name: string;
  file_type: 'pdf' | 'docx';
  size: number;
  status: string;
  security_status: string;
  created_at: string;
  updated_at: string;
  pages_count?: number;
  chunks_count?: number;
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

export const DocumentDetailPage = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!documentId) {
      setState('error');
      return;
    }
    const fetchDoc = async () => {
      try {
        const res = await documentsService.get(documentId);
        setDoc(res.data);
        setState('success');
      } catch (err) {
        console.error('Failed to fetch document', err);
        setState('error');
      }
    };
    fetchDoc();
  }, [documentId]);

  const handleDownload = async (disposition: 'attachment' | 'inline') => {
    if (!documentId) return;
    try {
      const res = await documentsService.downloadUrl(documentId, disposition);
      window.open(res.data.url, '_blank');
    } catch (err) {
      console.error('Failed to get download url', err);
      alert('Не удалось получить ссылку');
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (state === 'error' || !doc) {
    return (
      <div className="p-8 text-center">
        <p className="text-5xl mb-4">⚠️</p>
        <h3 className="text-lg font-medium text-gray-900">Документ не найден</h3>
        <button onClick={() => navigate('/documents')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Назад к документам
        </button>
      </div>
    );
  }

  const status = STATUS_LABELS[doc.status] || { label: doc.status, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="p-8 max-w-2xl">
      <button onClick={() => navigate('/documents')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        ← Назад
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="text-5xl">{doc.file_type === 'pdf' ? '📕' : '📘'}</div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{doc.file_name}</h1>
            <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>

        {doc.error_message && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{doc.error_message}</p>
          </div>
        )}

        <dl className="space-y-3">
          {([
            ['Тип файла', doc.file_type.toUpperCase()],
            ['Размер', formatSize(doc.size)],
            ['Загружен', formatDate(doc.created_at)],
            ['Обновлен', formatDate(doc.updated_at)],
            doc.pages_count !== undefined ? ['Страниц', doc.pages_count] : null,
            doc.chunks_count !== undefined ? ['Фрагментов', doc.chunks_count] : null,
          ] as ([string, string | number] | null)[]).filter((x): x is [string, string | number] => x !== null).map(([label, value]) => (
            <div key={String(label)} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="text-sm font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => handleDownload('inline')}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Открыть
          </button>
          <button
            onClick={() => handleDownload('attachment')}
            className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Скачать
          </button>
          <button
            onClick={() => navigate(`/assistant?document_id=${doc.id}`)}
            className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Спросить ИИ
          </button>
        </div>
      </div>
    </div>
  );
};
