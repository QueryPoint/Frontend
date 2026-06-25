import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/authServise';
import styles from './DocumentDetail.module.css';

interface DocumentDetail { id: string; file_name: string; file_type: 'pdf'|'docx'; size: number; status: string; security_status: string; created_at: string; updated_at: string; pages_count?: number; chunks_count?: number; error_message: string|null; }

const STATUS_STYLES: Record<string, { label: string; style: React.CSSProperties }> = {
  uploaded: { label: 'Загружен', style: { background: '#dbeafe', color: '#1d4ed8' } },
  processing: { label: 'Обработка', style: { background: '#fef9c3', color: '#a16207' } },
  extracting_text: { label: 'Извлечение текста', style: { background: '#fef9c3', color: '#a16207' } },
  indexing: { label: 'Индексация', style: { background: '#ede9fe', color: '#7e22ce' } },
  ready: { label: 'Готов', style: { background: '#dcfce7', color: '#15803d' } },
  error: { label: 'Ошибка', style: { background: '#fee2e2', color: '#b91c1c' } },
};

const formatSize = (b: number) => b < 1048576 ? (b/1024).toFixed(1)+' КБ' : (b/1048576).toFixed(1)+' МБ';
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });

export const DocumentDetailPage = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentDetail|null>(null);
  const [state, setState] = useState<'loading'|'success'|'error'>('loading');

  useEffect(() => {
    api.get(`/documents/${documentId}`).then((res) => { setDoc(res.data); setState('success'); }).catch(() => setState('error'));
  }, [documentId]);

  const handleDownload = async (disposition: 'attachment'|'inline') => {
    try { const res = await api.get(`/documents/${documentId}/download-url`, { params: { disposition } }); window.open(res.data.url, '_blank'); }
    catch { alert('Не удалось получить ссылку'); }
  };

  if (state === 'loading') return <div className={styles.spinner}><div className={styles.spinnerCircle}></div></div>;
  if (state === 'error' || !doc) return (
    <div className={styles.errorPage}><p className={styles.errorIcon}>⚠️</p><h3 className={styles.errorTitle}>Документ не найден</h3>
      <button onClick={() => navigate('/documents')} className={styles.backBtn}>Назад к документам</button></div>
  );

  const status = STATUS_STYLES[doc.status] || { label: doc.status, style: { background: '#f3f4f6', color: '#374151' } };

  return (
    <div className={styles.page}>
      <button onClick={() => navigate('/documents')} className={styles.navBack}>← Назад</button>
      <div className={styles.card}>
        <div className={styles.docHeader}>
          <div className={styles.docIcon}>{doc.file_type === 'pdf' ? '📕' : '📘'}</div>
          <div className={styles.docMeta}>
            <h1 className={styles.docTitle}>{doc.file_name}</h1>
            <span className={styles.badge} style={status.style}>{status.label}</span>
          </div>
        </div>
        {doc.error_message && <div className={styles.errorBox}><p className={styles.errorText}>{doc.error_message}</p></div>}
        <dl className={styles.fields}>
          {([['Тип файла', doc.file_type.toUpperCase()], ['Размер', formatSize(doc.size)], ['Загружен', formatDate(doc.created_at)], ['Обновлен', formatDate(doc.updated_at)],
            doc.pages_count !== undefined ? ['Страниц', doc.pages_count] : null,
            doc.chunks_count !== undefined ? ['Фрагментов', doc.chunks_count] : null,
          ] as ([string, string|number]|null)[]).filter((x): x is [string, string|number] => x !== null).map(([label, value]) => (
            <div key={String(label)} className={styles.field}><dt className={styles.fieldLabel}>{label}</dt><dd className={styles.fieldValue}>{value}</dd></div>
          ))}
        </dl>
        <div className={styles.actions}>
          <button onClick={() => handleDownload('inline')} className={styles.btnPrimary}>Открыть</button>
          <button onClick={() => handleDownload('attachment')} className={styles.btnSecondary}>Скачать</button>
          <button onClick={() => navigate(`/assistant?document_id=${doc.id}`)} className={styles.btnPurple}>Спросить ИИ</button>
        </div>
      </div>
    </div>
  );
};