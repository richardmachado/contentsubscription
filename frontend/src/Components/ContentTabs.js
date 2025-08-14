import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

import { api } from '../lib/api';
const API_BASE = process.env.REACT_APP_API_BASE || '';

export default function ContentTabs({ tab, setTab, items, setItems }) {
  const { token } = useAuth();
  const [quantities, setQuantities] = useState({});
  const [loadingItemId, setLoadingItemId] = useState(null);
  const [viewingId, setViewingId] = useState(null); // ⬅️ new: lock the View button per item

  const handleQuantityChange = (id, qty) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Number(qty),
    }));
  };

  const handleBuy = async (item) => {
    const quantity = quantities[item.id] || 1;
    setLoadingItemId(item.id);

try {
  const response = await toast.promise(
    fetch(`${API_BASE}/api/buy/${item.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity }),
    }),
    {
      pending: 'Preparing your checkout…',
      success: 'Redirecting to Stripe!',
      error: 'Failed to start checkout. Please try again.',
    },
    { toastId: `stripe-${item.id}`, position: 'top-right' }
  );

  const data = await response.json();
  if (data.url) window.location.assign(data.url);
} catch (err) {
  console.error('Stripe checkout failed:', err);
}

  };

  const handleView = async (contentId) => {
    // Already viewed or already submitting → do nothing
    const target = items.find((i) => i.id === contentId);
    if (!target || target.viewed || viewingId === contentId) return;

    setViewingId(contentId);

    // ✅ Optimistic update
    setItems((prev) => prev.map((it) => (it.id === contentId ? { ...it, viewed: true } : it)));

    try {
      const res = await fetch(`${API_BASE}/api/mark-viewed/${contentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Unknown error');
      }

      toast.success('Marked as viewed');
      // success: keep optimistic state

      // If you also want to OPEN the content, do it here:
      // window.open(`/content/${contentId}`, '_blank');
    } catch (err) {
      console.error('Error marking as viewed:', err);
      toast.error('Could not update viewed status');

      // ⬅️ Rollback on error
      setItems((prev) => prev.map((it) => (it.id === contentId ? { ...it, viewed: false } : it)));
    } finally {
      setViewingId(null);
    }
  };

  const purchasedItems = items.filter((i) => i.purchased);
  const unpurchasedItems = items.filter((i) => !i.purchased);

  return (
    <>
      <div className="tab-buttons">
        <button
          className={`tab-button ${tab === 'purchased' ? 'active-tab' : ''}`}
          onClick={() => setTab('purchased')}
        >
          Purchased
        </button>
        <button
          className={`tab-button ${tab === 'explore' ? 'active-tab' : ''}`}
          onClick={() => setTab('explore')}
        >
          Explore More
        </button>
      </div>

      {tab === 'purchased' ? (
        <div className="content-list">
          {purchasedItems.length === 0 ? (
            <p>You haven’t purchased any content yet.</p>
          ) : (
            purchasedItems.map((item) => (
              <div key={item.id} className="content-box">
                <h4>{item.title}</h4>
                <p>{item.description}</p>

                {!item.viewed ? (
                  <span
                    className="badge badge-warning"
                    style={{
                      color: '#fff',
                      background: '#f39c12',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.8em',
                      marginRight: '8px',
                    }}
                  >
                    NEW
                  </span>
                ) : (
                  <span
                    className="badge badge-success"
                    style={{
                      color: '#fff',
                      background: '#27ae60',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.8em',
                      marginRight: '8px',
                    }}
                  >
                    VIEWED
                  </span>
                )}

                <button
                  className="view-button"
                  onClick={() => handleView(item.id)}
                  disabled={item.viewed || viewingId === item.id}
                  title={item.viewed ? 'Already viewed' : 'Mark as viewed'}
                >
                  {viewingId === item.id ? 'Marking…' : item.viewed ? 'Viewed' : 'Mark as viewed'}
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="tab-content">
          {unpurchasedItems.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#888' }}>
              🎉 You’ve purchased all current content. Stay tuned for new content coming soon!
            </p>
          ) : (
            unpurchasedItems.map((item) => (
              <div
                key={item.id}
                className="content-box alt"
                id={item.title === 'Live Help Session' ? 'live-help-card' : undefined}
              >
                <h4>{item.title}</h4>
                <p>{item.description}</p>

                {item.title === 'Live Help Session' ? (
                  <>
                    <label>
                      Hours:&nbsp;
                      <select
                        value={quantities[item.id] || 1}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      >
                        {[1, 2, 3, 4, 5].map((qty) => (
                          <option key={qty} value={qty}>
                            {qty}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>Total: ${((item.price / 100) * (quantities[item.id] || 1)).toFixed(2)}</p>
                    <button
                      className="buy-button"
                      onClick={() => handleBuy(item)}
                      disabled={loadingItemId === item.id}
                    >
                      {loadingItemId === item.id ? 'Loading...' : 'Buy Live Help'}
                    </button>
                  </>
                ) : (
                  <button
                    className="buy-button"
                    onClick={() => handleBuy(item)}
                    disabled={loadingItemId === item.id}
                  >
                    {loadingItemId === item.id ? 'Loading...' : `Buy for $${item.price / 100}`}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
