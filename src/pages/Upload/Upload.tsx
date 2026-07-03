import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { documentsService } from '../../services/documentsService';
import { formatSize } from '../../utils/format';
import styles from './Upload.module.css';

type FileStatus = 'queued' | 'validating' | 'invalid' | 'uploading' | 'uploaded' | 'processing' | 'extracting_text' | 'indexing' | 'ready' | 'error';

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  docId?: string;
}

const STATUS_LABELS: Record<FileStatus, { label: string; color: string }> = {
  queued: { label: 'В очереди', color: '#6b7280' },
  validating: { label: 'Проверка', color: '#3b82f6' },
  invalid: { label: 'Недопустимый файл', color: '#dc2626' },
  uploading: { label: 'Загрузка', color: '#3b82f6' },
  uploaded: { label: 'Загружен', color: '#2563eb' },
  processing: { label: 'Обработка', color: '#ca8a04' },
  extracting_text: { label: 'Извлечение текста', color: '#ca8a04' },
  indexing: { label: 'Индексация', color: '#9333ea' },
  ready: { label: 'Готов', color: '#16a34a' },
  error: { label: 'Ошибка', color: '#dc2626' },
};

const MAX_SIZE = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || 20) * 1024 * 1024;
const ALLOWED_EXT = ['.pdf', '.docx'];

const validateFile = (file: File): string | null => {
  if (file.size === 0) return 'Файл пустой';
  if (file.size > MAX_SIZE) return 'Файл больше 20 МБ';
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return 'Поддерживаются только PDF и DOCX';
  return null;
};

export const UploadPage = () => {
  const [files, setFiles] = useState<FileItem[]>([]);

  const updateFile = (id: string, updates: Partial<FileItem>) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f));
  };

  const uploadFile = async (item: FileItem) => {
    updateFile(item.id, { status: 'validating' });
    const err = validateFile(item.file);
    if (err) {
      updateFile(item.id, { status: 'invalid', error: err });
      return;
    }

    updateFile(item.id, { status: 'uploading', progress: 0 });
    try {
      const res = await documentsService.upload([item.file], (p) => {
        updateFile(item.id, { progress: p });
      });
      const doc = res.data.items?.[0];
      updateFile(item.id, { status: 'uploaded', docId: doc?.id, progress: 100 });
    } catch (err: unknown) {
      console.error('Upload failed', err);
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      updateFile(item.id, { status: 'error', error: msg || 'Ошибка загрузки' });
    }
  };

  const onDrop = useCallback((accepted: File[]) => {
    const newItems: FileItem[] = accepted.map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      status: 'queued',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newItems]);
    newItems.forEach(uploadFile);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: MAX_SIZE,
  });

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>Загрузка документов</h1>
        <p className={styles.subtitle}>PDF и DOCX до 20 МБ</p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}
      >
        <input {...getInputProps()} />
        <p className={styles.dropIcon}>📂</p>
        <p className={styles.dropTitle}>
          {isDragActive ? 'Отпустите файлы' : 'Перетащите файлы сюда'}
        </p>
        <p className={styles.dropSub}>или нажмите для выбора</p>
        <p className={styles.dropHint}>PDF, DOCX — до 20 МБ каждый</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className={styles.fileList}>
          {files.map((item) => {
            const statusInfo = STATUS_LABELS[item.status];
            return (
              <div key={item.id} className={styles.fileCard}>
                <div className={styles.fileRow}>
                  <span className={styles.fileIcon}>{item.file.name.endsWith('.pdf') ? '📕' : '📘'}</span>
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName}>{item.file.name}</p>
                    <div className={styles.fileMeta}>
                      <span className={styles.fileSize}>{formatSize(item.file.size)}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: statusInfo.color }}>
                        {statusInfo.label}
                        {item.status === 'uploading' && ` ${item.progress}%`}
                      </span>
                    </div>
                  </div>
                  {item.status === 'ready' && <span style={{ color: '#22c55e', fontSize: '1.25rem' }}>✓</span>}
                  {item.status === 'error' && <span style={{ color: '#ef4444', fontSize: '1.25rem' }}>✗</span>}
                  {item.status === 'uploading' && <div className={styles.spinnerSm}></div>}
                </div>

                {item.status === 'uploading' && (
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${item.progress}%` }} />
                  </div>
                )}

                {item.error && (
                  <p className={styles.fileError}>{item.error}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
