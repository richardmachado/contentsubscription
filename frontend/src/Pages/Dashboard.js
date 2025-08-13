// src/Pages/Dashboard.js
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api'; // axios with baseURL=http://localhost:5000/api
import ContentTabs from '../Components/ContentTabs';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('purchased'); // 'purchased' | 'explore'
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Loading your content…');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const q = useQuery();

  // ---- load content list
  const load = async () => {
    setLoading(true);
    setLoadingMsg('Loading your content…');
    setError('');
    try {
      const { data } = await api.get('/content'); // expects purchased/viewed flags
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error loading /api/content:', e);
      setError('Could not load your content.');
      toast.error('Failed to load content.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    load();
  }, []); // ← no eslint-disable needed

  // Confirm Stripe session if present in query (?session_id=...)
  useEffect(() => {
    const sessionId = q.get('session_id');
    if (!sessionId) return;

    let cancelled = false;

    const confirm = async () => {
      try {
        setLoading(true);
        setLoadingMsg('Confirming your payment…');

        const { data } = await api.get(
          `/confirm-payment?session_id=${encodeURIComponent(sessionId)}`
        );

        if (cancelled) return;

        if (data?.ok) {
          const kind = q.get('kind');
          const hours = q.get('hours');
          if (kind === 'live-help') {
            toast.success(`✅ Live Help booked${hours ? `: ${hours} hour(s)` : ''}!`);
          } else {
            toast.success('✅ Purchase confirmed!');
          }
        } else {
          toast.info('Payment confirmed, but nothing to grant.');
        }
      } catch (e) {
        console.error('Confirm payment failed:', e);
        toast.error('Could not confirm payment. If you paid, it may take a moment.');
      } finally {
        await load(); // refresh list either way
        if (!cancelled) navigate('/dashboard', { replace: true }); // strip query params
      }
    };

    confirm();
    return () => {
      cancelled = true;
    };
  }, [q, navigate]); // ← deps are real objects; no disable needed

  const purchasedCount = items.filter((i) => i.purchased).length;

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <p style={{ margin: '4px 0 0', color: '#666' }}>
            {user?.email ? `Signed in as ${user.email}` : 'Signed in'}
          </p>
        </div>
        <div style={styles.headerRight}>
          <button onClick={load} style={styles.refreshBtn} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {loading ? (
        <div style={styles.loadingBox}>
          <div className="spinner" />
          <p>{loadingMsg}</p>
        </div>
      ) : error ? (
        <div style={styles.errorBox}>
          <p>{error}</p>
          <button onClick={load} style={styles.retryBtn}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <section style={styles.summary}>
            <div style={styles.pill}>
              <strong>{purchasedCount}</strong> purchased
            </div>
            <div style={styles.pill}>
              <strong>{items.length - purchasedCount}</strong> available
            </div>
          </section>

          <ContentTabs tab={tab} setTab={setTab} items={items} setItems={setItems} />
        </>
      )}
    </div>
  );
}

const styles = {
  wrap: { maxWidth: 960, margin: '24px auto', padding: '0 16px' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  refreshBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
  },
  loadingBox: {
    padding: 24,
    border: '1px solid #eee',
    borderRadius: 12,
    textAlign: 'center',
    color: '#666',
  },
  errorBox: {
    padding: 24,
    border: '1px solid #f2dede',
    borderRadius: 12,
    color: '#a94442',
    background: '#fdf7f7',
  },
  retryBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
  },
  summary: { display: 'flex', gap: 12, margin: '16px 0' },
  pill: {
    padding: '6px 10px',
    background: '#f6f7f8',
    borderRadius: 999,
    fontSize: 13,
    color: '#444',
  },
};
