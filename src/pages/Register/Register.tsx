import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import { useAuth } from '../../hooks/useAuth';
import styles from './Register.module.css';

const registerSchema = z.object({
  username: z.string().min(3, 'Username от 3 до 25 символов').max(25).regex(/^[a-zA-Z0-9_]+$/, 'Только латиница, цифры и _'),
  password: z.string().min(6, 'Пароль минимум 6 символов'),
  repeatPassword: z.string().min(6),
}).refine((d) => d.password === d.repeatPassword, { message: 'Пароли не совпадают', path: ['repeatPassword'] });

type RegisterForm = z.infer<typeof registerSchema>;

const STRENGTH_COLORS = ['#e5e7eb','#ef4444','#eab308','#3b82f6','#22c55e'];
const STRENGTH_LABELS = ['','Слабый','Средний','Хороший','Надежный'];

const getStrength = (p: string) => {
  if (!p) return { score: 0, label: '', color: STRENGTH_COLORS[0] };
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const i = Math.min(s, 4);
  return { score: i, label: STRENGTH_LABELS[i], color: STRENGTH_COLORS[i] };
};

export const RegisterPage = () => {
  const { register: registerUser, error, isSubmitting } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const { register, handleSubmit, formState: { errors, isValid }, watch, setError: setFormError } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema), mode: 'onChange',
  });
  const strength = getStrength(watch('password') || '');

  const onSubmit = async (data: RegisterForm) => {
    try { await registerUser(data); }
    catch (err: unknown) {
      const apiErr = err as { response?: { data?: { code?: string } } };
      if (apiErr.response?.data?.code === 'USER_ALREADY_EXISTS')
        setFormError('username', { type: 'manual', message: 'Пользователь с таким именем уже существует' });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Интеллектуальная база знаний</h1>
          <p className={styles.subtitle}>Создайте аккаунт для начала работы</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <Input label="Username" placeholder="student_2026" {...register('username')} error={errors.username?.message} autoComplete="username" disabled={isSubmitting} />
          <div>
            <Input label="Пароль" type={showPassword ? 'text' : 'password'} placeholder="Введите пароль" {...register('password')} error={errors.password?.message} autoComplete="new-password" disabled={isSubmitting} />
            {watch('password') && (
              <div className={styles.strengthRow}>
                <div className={styles.strengthBar}>
                  <div className={styles.strengthFill} style={{ width: `${(strength.score/4)*100}%`, background: strength.color }} />
                </div>
                <span className={styles.strengthLabel}>{strength.label}</span>
              </div>
            )}
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={styles.showPasswordBtn}>
              {showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            </button>
          </div>
          <div>
            <Input label="Повторите пароль" type={showRepeat ? 'text' : 'password'} placeholder="Повторите пароль" {...register('repeatPassword')} error={errors.repeatPassword?.message} autoComplete="new-password" disabled={isSubmitting} />
            <button type="button" onClick={() => setShowRepeat(!showRepeat)} className={styles.showPasswordBtn}>
              {showRepeat ? 'Скрыть пароль' : 'Показать пароль'}
            </button>
          </div>
          {error && <div className={styles.errorBox}><p className={styles.errorText}>{error}</p></div>}
          <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting} disabled={!isValid || isSubmitting}>Создать аккаунт</Button>
        </form>
        <div className={styles.footer}>
          <p className={styles.footerText}>Уже есть аккаунт?{' '}<Link to="/login" className={styles.footerLink}>Войти</Link></p>
        </div>
        <div className={styles.rules}>
          <p className={styles.ruleText}><strong>Username:</strong> только латиница, цифры и _, от 3 до 25 символов</p>
          <p className={styles.ruleTextMt}><strong>Пароль:</strong> минимум 6 символов</p>
        </div>
      </div>
    </div>
  );
};