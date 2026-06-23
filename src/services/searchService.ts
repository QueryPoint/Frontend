import { api } from './api';

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  file_name: string;
  page: number;
  text: string;
  highlight: string;
  score: number;
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  has_more: boolean;
}

export interface HistoryItem {
  id: string;
  query: string;
  created_at: string;
}

export interface HistoryResponse { items: HistoryItem[]; }

export const searchService = {
  search: (q: string, page = 1, limit = 10) =>
    api.get<SearchResponse>('/search', { params: { q, page, limit } }),

  getHistory: (limit = 50) =>
    api.get<HistoryResponse>('/search/history', { params: { limit } }),

  clearHistory: () =>
    api.delete('/search/history'),
};
