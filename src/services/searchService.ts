import { api } from './api';

export const SEARCH_PAGE_SIZE = 10;

export const searchService = {
  search: (q: string, offset = 0, limit = SEARCH_PAGE_SIZE) =>
    api.get('/search', { params: { q, limit, offset } }),

  // GET /history не реализован backend'ом (guideline описывает только DELETE) -
  // список истории во frontend недоступен, оставлена только очистка.
  clearHistory: () => api.delete('/history'),
};