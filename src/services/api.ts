import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`📤 [${config.method?.toUpperCase()}] ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isRefreshRequest = error.config?.url === '/refresh';
    if (error.response?.status === 401 && !error.config?._retried && !isRefreshRequest) {
      error.config._retried = true;
      try {
        await api.post('/refresh');
        return api(error.config);
      } catch {
        // refresh тоже не удался (анонимный пользователь / истёкшая сессия) —
        // отдаём наверх исходную 401-ошибку, а не рекурсивно повторяем refresh.
      }
    }
    return Promise.reject(error);
  }
);

export const apiUtils = {
  upload: (url: string, file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);

    return api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },
};