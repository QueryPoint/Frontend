import { api } from './api';

export interface Document {
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

export interface DocumentsResponse {
  items: Document[];
  total: number;
  limit: number;
  offset: number;
}

export interface DownloadUrlResponse { url: string; }

export const documentsService = {
  list: (params?: { q?: string; limit?: number; offset?: number }) =>
    api.get<DocumentsResponse>('/documents', { params }),

  get: (id: string) =>
    api.get<Document>(`/documents/${id}`),

  delete: (id: string) =>
    api.delete(`/documents/${id}`),

  downloadUrl: (id: string, disposition: 'attachment' | 'inline' = 'attachment') =>
    api.get<DownloadUrlResponse>(`/documents/${id}/download-url`, { params: { disposition } }),

  upload: (files: File[], onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post<{ items: { id: string }[] }>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },
};
