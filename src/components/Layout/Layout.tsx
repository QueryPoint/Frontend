import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useAuth } from '../../hooks/useAuth';
import styles from './Layout.module.css';

const navItems = [
  { to: '/documents', label: 'Документы', icon: '📄' },
  { to: '/upload', label: 'Загрузка', icon: '⬆️' },
  { to: '/search', label: 'Поиск', icon: '🔍' },
  { to: '/assistant', label: 'ИИ-ассистент', icon: '🤖' },
];

export const Layout = () => {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={styles.root}>
      <div className={`${styles.overlay} ${sidebarOpen ? styles.visible : ''}`} onClick={closeSidebar} />

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles.logo}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className={styles.logoTitle}>
              База знаний<br />
              <span className={styles.logoAccent}>университета</span>
            </h1>
            <button className={styles.closeBtn} onClick={closeSidebar}>✕</button>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <NavLink
            to="/profile"
            onClick={closeSidebar}
            className={({ isActive }) => `${styles.profileLink} ${isActive ? styles.profileLinkActive : ''}`}
          >
            <div className={styles.avatar}>{user?.username?.charAt(0).toUpperCase()}</div>
            <span className={styles.username}>{user?.username}</span>
          </NavLink>
          <button onClick={() => { closeSidebar(); logout(); }} className={styles.logoutBtn}>
            <span>🚪</span>
            Выйти
          </button>
        </div>
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <div className={styles.mobileTopBar}>
          <h1 className={styles.logoTitle}>База знаний</h1>
          <button className={styles.hamburger} onClick={() => setSidebarOpen(true)}>☰</button>
        </div>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};