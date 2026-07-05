import { api } from '../services/api';

export const searchService = {
  search: (q: string) => api.get('/search', { params: { q } }),

  // GET /history не реализован backend'ом (guideline описывает только DELETE) -
  // список истории во frontend недоступен, оставлена только очистка.
  clearHistory: () => api.delete('/history'),
};