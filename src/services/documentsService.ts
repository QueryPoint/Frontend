import { api, apiUtils } from '../api/client';

export const documentsService = {
  list: (q?: string) => {
    const params: Record<string, string> = { limit: '50' };
    if (q) params.q = q;
    return api.get('/documents', { params });
  },

  get: (id: string) => api.get(`/documents/${id}`),

  delete: (id: string) => api.delete(`/documents/${id}`),

  downloadUrl: (id: string, disposition: 'attachment' | 'inline' = 'attachment') =>
    api.get(`/documents/${id}/download-url`, { params: { disposition } }),

  upload: (files: File[], onProgress?: (percent: number) => void) =>
    apiUtils.upload('/documents/upload', files, onProgress),
};
