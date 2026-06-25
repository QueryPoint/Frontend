import { useAuthStore } from '../../store/auth';
import { useAuth } from '../../hooks/useAuth';
import styles from './Profile.module.css';

export const ProfilePage = () => {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Профиль</h1>
      <div className={styles.card}>
        <div className={styles.userHeader}>
          <div className={styles.avatar}>{user?.username?.charAt(0).toUpperCase()}</div>
          <div>
            <h2 className={styles.username}>{user?.username}</h2>
            {user?.created_at && <p className={styles.since}>С нами с {formatDate(user.created_at)}</p>}
          </div>
        </div>
        <dl className={styles.fields}>
          <div className={styles.field}>
            <dt className={styles.fieldLabel}>Username</dt>
            <dd className={styles.fieldValue}>{user?.username}</dd>
          </div>
          {user?.created_at && (
            <div className={styles.field}>
              <dt className={styles.fieldLabel}>Дата регистрации</dt>
              <dd className={styles.fieldValue}>{formatDate(user.created_at)}</dd>
            </div>
          )}
        </dl>
        <button onClick={logout} className={styles.logoutBtn}>Выйти из аккаунта</button>
      </div>
    </div>
  );
};