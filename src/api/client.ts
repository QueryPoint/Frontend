import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
    if (error.response?.status === 401 && !error.config?._retried) {
      try {
        if (error.config) error.config._retried = true;
        await api.post('/auth/refresh');
        return api(error.config);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const apiUtils = {
  upload: (url: string, files: File[], onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

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
