import { api, apiUtils } from './api';

export interface DocumentDTO {
  id: string;
  file_name: string;
  file_type: string;
  size: number;
  status: string;
  security_status: string;
  created_at: string;
  updated_at: string;
  error_message: string | null;
  download_url?: string;
  [key: string]: unknown;
}

function normalizeDocument(rawInput: unknown): DocumentDTO {
  const raw = rawInput as Record<string, unknown>;
  return {
    ...raw,
    id: raw.doc_id,
    file_name: raw.doc_name,
    file_type: raw.doc_type,
    size: raw.doc_size,
    download_url: raw.doc_downloadlink,
  } as DocumentDTO;
}

export const documentsService = {
  list: async (q?: string): Promise<DocumentDTO[]> => {
    const params: Record<string, string> = {};
    if (q) params.q = q;
    const res = await api.get('/documents', { params });
    return (res.data as unknown[]).map(normalizeDocument);
  },

  get: async (id: string): Promise<DocumentDTO> => {
    const res = await api.get(`/documents/${id}`);
    return normalizeDocument(res.data.data);
  },

  delete: (id: string) => api.delete(`/documents/${id}`),

  upload: (file: File, onProgress?: (percent: number) => void) =>
    apiUtils.upload('/documents/upload', file, onProgress),
};