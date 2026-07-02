import { api } from '../api/client';

export const searchService = {
  search: (q: string, page: number, limit = 10) =>
    api.get('/search', { params: { q, page, limit } }),

  history: (limit = 50) => api.get('/search/history', { params: { limit } }),

  clearHistory: () => api.delete('/search/history'),
};
