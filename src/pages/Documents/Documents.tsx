import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { documentsService } from '../../services/documentsService';
import { formatSize, formatDate } from '../../utils/format';
import styles from './Documents.module.css';

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

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  uploaded: { label: 'Загружен', bg: '#dbeafe', color: '#1d4ed8' },
  processing: { label: 'Обработка', bg: '#fef9c3', color: '#a16207' },
  extracting_text: { label: 'Извлечение текста', bg: '#fef9c3', color: '#a16207' },
  indexing: { label: 'Индексация', bg: '#f3e8ff', color: '#7e22ce' },
  ready: { label: 'Готов', bg: '#dcfce7', color: '#15803d' },
  error: { label: 'Ошибка', bg: '#fee2e2', color: '#b91c1c' },
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
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Документы</h1>
          <p className={styles.headerSubtitle}>Загруженные учебные материалы</p>
        </div>
        <Link to="/upload" className={styles.uploadLink}>
          <span>⬆️</span>
          Загрузить документ
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchBtn}>
          Найти
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); fetchDocuments(); }}
            className={styles.resetBtn}
          >
            Сбросить
          </button>
        )}
      </form>

      {/* Loading */}
      {state === 'loading' && (
        <div className={styles.spinner}>
          <div className={styles.spinnerCircle}></div>
        </div>
      )}

      {/* Empty */}
      {state === 'empty' && (
        <div className={styles.empty}>
          <p className={styles.emptyIcon}>📂</p>
          <h3 className={styles.emptyTitle}>Нет документов</h3>
          <p className={styles.emptyText}>Загрузите первый документ в базу знаний</p>
          <Link to="/upload" className={styles.emptyLink}>
            Загрузить документ
          </Link>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className={styles.empty}>
          <p className={styles.emptyIcon}>⚠️</p>
          <h3 className={styles.emptyTitle}>Ошибка загрузки</h3>
          <button onClick={() => fetchDocuments()} className={styles.retryBtn}>
            Попробовать снова
          </button>
        </div>
      )}

      {/* Document list */}
      {state === 'success' && (
        <div className={styles.list}>
          {documents.map((doc) => {
            const status = STATUS_LABELS[doc.status] || { label: doc.status, bg: '#f3f4f6', color: '#374151' };
            return (
              <div key={doc.id} className={styles.docCard}>
                {/* Icon */}
                <div className={styles.docIcon}>
                  {doc.file_type === 'pdf' ? '📕' : '📘'}
                </div>

                {/* Info */}
                <div className={styles.docInfo}>
                  <div className={styles.docNameRow}>
                    <h3 className={styles.docName} onClick={() => navigate(`/documents/${doc.id}`)}>
                      {doc.file_name}
                    </h3>
                    <span className={styles.badge} style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                  </div>
                  <div className={styles.docMeta}>
                    <span>{doc.file_type.toUpperCase()}</span>
                    <span>{formatSize(doc.size)}</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                  {doc.error_message && (
                    <p className={styles.docError}>{doc.error_message}</p>
                  )}
                </div>

                {/* Actions */}
                <div className={styles.docActions}>
                  <button
                    onClick={() => navigate(`/documents/${doc.id}`)}
                    className={styles.actionBtn}
                    title="Детали"
                  >
                    🔎
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}
                    title="Скачать"
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(doc.id)}
                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
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
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Удалить документ?</h3>
            <p className={styles.modalText}>Это действие нельзя отменить. Документ будет удален из базы знаний.</p>
            <div className={styles.modalActions}>
              <button onClick={() => handleDelete(deleteConfirm)} className={styles.deleteBtn}>
                Удалить
              </button>
              <button onClick={() => setDeleteConfirm(null)} className={styles.cancelBtn}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
