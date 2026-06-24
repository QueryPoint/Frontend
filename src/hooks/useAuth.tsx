import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { type FormState } from '../types/common';
import { useAuthStore } from '../store/auth';
import { type RegisterFormData } from '../types/auth';

export const useAuth = () => {
  const [formState, setFormState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser, logout: logoutStore } = useAuthStore();

  const register = async (data: RegisterFormData) => {
    setFormState('submitting');
    setError(null);
    try {
      const res = await authService.register({ username: data.username, password: data.password });
      setUser(res.data.user);
      setFormState('success');
      navigate('/documents');
    } catch (err: any) {
      setFormState('error');
      if (err.response?.data?.code === 'USER_ALREADY_EXISTS') {
        setError('Пользователь с таким именем уже существует');
      } else if (err.response?.status === 500) {
        setError('Ошибка сервера. Попробуйте позже');
      } else {
        setError('Не удалось зарегистрироваться. Попробуйте ещё раз');
      }
      throw err;
    }
  };

  const login = async (data: { username: string; password: string }) => {
    setFormState('submitting');
    setError(null);
    try {
      const res = await authService.login(data);
      setUser(res.data.user);
      setFormState('success');
      navigate('/documents');
    } catch (err: any) {
      setFormState('error');
      if (err.response?.status === 401) {
        setError('Неверный username или пароль');
      } else if (err.response?.status === 500) {
        setError('Ошибка сервера. Попробуйте позже');
      } else if (!err.response) {
        setError('Нет соединения с сервером');
      } else {
        setError('Не удалось войти. Попробуйте ещё раз');
      }
      throw err;
    }
  };

  const logout = async () => {
    try { await authService.logout(); } catch {}
    logoutStore();
    navigate('/login');
  };

  return {
    register, login, logout, formState, error,
    isSubmitting: formState === 'submitting',
    isSuccess: formState === 'success',
    isError: formState === 'error',
  };
};
