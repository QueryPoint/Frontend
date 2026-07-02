import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { documentsService } from '../../services/documentsService';
import { formatSize } from '../../utils/format';

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
  queued: { label: 'В очереди', color: 'text-gray-500' },
  validating: { label: 'Проверка', color: 'text-blue-500' },
  invalid: { label: 'Недопустимый файл', color: 'text-red-500' },
  uploading: { label: 'Загрузка', color: 'text-blue-500' },
  uploaded: { label: 'Загружен', color: 'text-blue-600' },
  processing: { label: 'Обработка', color: 'text-yellow-600' },
  extracting_text: { label: 'Извлечение текста', color: 'text-yellow-600' },
  indexing: { label: 'Индексация', color: 'text-purple-600' },
  ready: { label: 'Готов', color: 'text-green-600' },
  error: { label: 'Ошибка', color: 'text-red-600' },
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
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Загрузка документов</h1>
        <p className="text-gray-600 mt-1">PDF и DOCX до 20 МБ</p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-5xl mb-4">📂</p>
        <p className="text-lg font-medium text-gray-900">
          {isDragActive ? 'Отпустите файлы' : 'Перетащите файлы сюда'}
        </p>
        <p className="text-gray-500 mt-2">или нажмите для выбора</p>
        <p className="text-sm text-gray-400 mt-3">PDF, DOCX — до 20 МБ каждый</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          {files.map((item) => {
            const statusInfo = STATUS_LABELS[item.status];
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.file.name.endsWith('.pdf') ? '📕' : '📘'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.file.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">{formatSize(item.file.size)}</span>
                      <span className={`text-sm font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                        {item.status === 'uploading' && ` ${item.progress}%`}
                      </span>
                    </div>
                  </div>
                  {item.status === 'ready' && <span className="text-green-500 text-xl">✓</span>}
                  {item.status === 'error' && <span className="text-red-500 text-xl">✗</span>}
                  {item.status === 'uploading' && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  )}
                </div>

                {item.status === 'uploading' && (
                  <div className="mt-3 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                {item.error && (
                  <p className="mt-2 text-sm text-red-600">{item.error}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
