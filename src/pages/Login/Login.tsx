import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { useAuth } from '../../hooks/useAuth';
import styles from './Login.module.css';

const loginSchema = z.object({
  username: z.string().min(1, 'Введите username').regex(/^[a-zA-Z0-9_]+$/, 'Только латиница, цифры и _'),
  password: z.string().min(1, 'Введите пароль'),
});
type LoginForm = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const { login, error, isSubmitting } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isValid } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema), mode: 'onChange',
  });
  const onSubmit = async (data: LoginForm) => { try { await login(data); } catch { /* error state is exposed via useAuth */ } };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>База знаний</h1>
          <p className={styles.subtitle}>Интеллектуальная база знаний университета</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <Input label="Username" placeholder="student_2026" {...register('username')} error={errors.username?.message} autoComplete="username" disabled={isSubmitting} />
          <div>
            <Input label="Пароль" type={showPassword ? 'text' : 'password'} placeholder="Введите пароль" {...register('password')} error={errors.password?.message} autoComplete="current-password" disabled={isSubmitting} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.showPasswordBtn}>
              {showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            </button>
          </div>
          {error && <div className={styles.errorBox}><p className={styles.errorText}>{error}</p></div>}
          <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting} disabled={!isValid || isSubmitting}>Войти</Button>
        </form>
        <div className={styles.footer}>
          <p className={styles.footerText}>Нет аккаунта?{' '}<Link to="/register" className={styles.footerLink}>Зарегистрироваться</Link></p>
        </div>
      </div>
    </div>
  );
};