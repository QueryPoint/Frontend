import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { authService } from '../services/authService';
import { type FormState } from '../types/common';
import { useAuthStore } from '../store/auth';
import { type RegisterFormData } from '../types/auth';

interface LoginFormData {
  username: string;
  password: string;
}

export const useAuth = () => {
  const [formState, setFormState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { setUser, logout: logoutStore } = useAuthStore();

  const register = async (data: RegisterFormData) => {
    setFormState('submitting');
    setError(null);
    try {
      await authService.register({
        username: data.username,
        password: data.password,
      });
      // Backend не выставляет cookie на регистрации — логинимся сразу после неё.
      await authService.login({
        username: data.username,
        password: data.password,
      });
      const me = await authService.me();
      setUser(me.data);
      setFormState('success');
      navigate('/documents');
    } catch (err: unknown) {
      setFormState('error');
      if (axios.isAxiosError(err)) {
        const code = err.response?.data?.code;
        if (code === 'USER_ALREADY_EXISTS') {
          setError('Пользователь с таким именем уже существует');
        } else if (code === 'VALIDATION_ERROR') {
          const fields = err.response?.data?.fields;
          setError(fields?.username || err.response?.data?.message || 'Ошибка валидации');
        } else if (err.response?.status === 500) {
          setError('Ошибка сервера. Попробуйте позже');
        } else {
          setError('Не удалось зарегистрироваться. Попробуйте еще раз');
        }
      } else {
        setError('Не удалось зарегистрироваться. Попробуйте еще раз');
      }
      throw err;
    }
  };

  const login = async (data: LoginFormData) => {
    setFormState('submitting');
    setError(null);
    try {
      await authService.login(data);
      const me = await authService.me();
      setUser(me.data);
      setFormState('success');
      navigate('/documents');
    } catch (err: unknown) {
      setFormState('error');
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Неверный username или пароль');
        } else if (err.response?.status === 500) {
          setError('Ошибка сервера. Попробуйте позже');
        } else if (!err.response) {
          setError('Нет соединения с сервером');
        } else {
          setError('Не удалось войти. Попробуйте еще раз');
        }
      } else {
        setError('Не удалось войти. Попробуйте еще раз');
      }
      throw err;
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout request failed, clearing session locally anyway', err);
    } finally {
      logoutStore();
      setIsLoggingOut(false);
      navigate('/login');
    }
  };

  return {
    register,
    login,
    logout,
    formState,
    error,
    isSubmitting: formState === 'submitting',
    isSuccess: formState === 'success',
    isError: formState === 'error',
    isLoggingOut,
  };
};