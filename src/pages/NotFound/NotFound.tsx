import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

export const NotFoundPage = () => (
  <div className={styles.page}>
    <div className={styles.content}>
      <img src="https://media1.tenor.com/m/rg1OfwZSJQkAAAAd/oiia-cat.gif" alt="oiia cat" className={styles.catImg} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      <h1 className={styles.code}>404</h1>
      <h2 className={styles.title}>Страница не найдена</h2>
      <p className={styles.subtitle}>Похоже, эта страница потерялась в базе знаний</p>
      <Link to="/documents" className={styles.homeLink}>Вернуться на главную</Link>
    </div>
  </div>
);