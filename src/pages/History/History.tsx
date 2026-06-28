import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/authServise';
import styles from './History.module.css';

interface HistoryItem { id: string; query: string; created_at: string; }

export const HistoryPage = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [state, setState] = useState<'loading'|'success'|'empty'|'error'>('loading');
  const navigate = useNavigate();

  const fetchHistory = async () => {
    setState('loading');
    try {
      const res = await api.get('/search/history', { params: { limit: 50 } });
      const data = res.data.items || [];
      setItems(data);
      setState(data.length === 0 ? 'empty' : 'success');
    } catch { setState('error'); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleClear = async () => {
    if (!confirm('Очистить историю поиска?')) return;
    try { await api.delete('/search/history'); setItems([]); setState('empty'); }
    catch { alert('Не удалось очистить историю'); }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div><h1 className={styles.headerTitle}>История</h1><p className={styles.headerSubtitle}>Ваши поисковые запросы</p></div>
        {state === 'success' && <button onClick={handleClear} className={styles.clearBtn}>Очистить историю</button>}
      </div>
      {state === 'loading' && <div className={styles.spinner}><div className={styles.spinnerCircle}></div></div>}
      {state === 'empty' && <div className={styles.empty}><p className={styles.emptyIcon}>🕐</p><h3 className={styles.emptyTitle}>История пуста</h3><p className={styles.emptyText}>Ваши поисковые запросы появятся здесь</p></div>}
      {state === 'error' && <div className={styles.empty}><p className={styles.emptyIcon}>⚠️</p><button onClick={fetchHistory} className={styles.retryBtn}>Попробовать снова</button></div>}
      {state === 'success' && (
        <div className={styles.list}>
          {items.map((item) => (
            <div key={item.id} className={styles.item} onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}`)}>
              <div className={styles.itemLeft}><span className={styles.itemIcon}>🔍</span><span className={styles.itemQuery}>{item.query}</span></div>
              <span className={styles.itemDate}>{formatDate(item.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};