import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function ContentTabs({ tab, setTab, items, setItems }) {
  const { token } = useAuth();
  const [quantities, setQuantities] = useState({});
  const [loadingItemId, setLoadingItemId] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  // 👇 Robust Live Help detector (by slug/title/kind/type)
  const isLiveHelp = (it) => {
    const slug = (it.slug || '').toLowerCase();
    const title = (it.title || '').toLowerCase();
    return (
      slug === 'live-help-session' ||
      title.includes('live help') ||
      it.kind === 'service' ||
      it.type === 'live_help'
    );
  };

  const handleQuantityChange = (id, qty) => {
    const n = Math.max(1, Math.min(5, Number(qty) || 1)); // clamp 1–5
    setQuantities((prev) => ({ ...prev, [id]: n }));
  };

  const handleBuy = async (item) => {
    const quantity = isLiveHelp(item) ? quantities[item.id] || 1 : 1; // Live Help uses qty, others force 1
    setLoadingItemId(item.id);

    try {
      const response = await toast.promise(
        fetch(`http://localhost:5000/api/buy/${item.id}`, {
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

      const data = await response.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setLoadingItemId(null);
        toast.error(data?.error || 'Checkout failed');
      }
    } catch (err) {
      setLoadingItemId(null);
      console.error('Stripe checkout failed:', err);
    }
  };

  // Leave this as-is for normal content; Live Help will never render it
  const handleView = async (contentId) => {
    const target = items.find((i) => i.id === contentId);
    if (!target || target.viewed || viewingId === contentId || isLiveHelp(target)) return; // ⬅️ skip live help

    setViewingId(contentId);
    setItems((prev) => prev.map((it) => (it.id === contentId ? { ...it, viewed: true } : it)));

    try {
      const res = await fetch(`http://localhost:5000/api/mark-viewed/${contentId}`, {
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
    } catch (err) {
      console.error('Error marking as viewed:', err);
      toast.error('Could not update viewed status');
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

                {isLiveHelp(item) ? (
                  // ✅ Live Help: NO viewed badge, just booking controls
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
                      {loadingItemId === item.id ? 'Loading…' : 'Book Live Help'}
                    </button>
                  </>
                ) : (
                  // Normal content: viewed badge + mark-as-viewed button
                  <>
                    {!item.viewed ? (
                      <span className="badge badge-warning" style={badgeWarnStyle}>
                        NEW
                      </span>
                    ) : (
                      <span className="badge badge-success" style={badgeOkStyle}>
                        VIEWED
                      </span>
                    )}

                    <button
                      className="view-button"
                      onClick={() => handleView(item.id)}
                      disabled={item.viewed || viewingId === item.id}
                      title={item.viewed ? 'Already viewed' : 'Mark as viewed'}
                    >
                      {viewingId === item.id
                        ? 'Marking…'
                        : item.viewed
                          ? 'Viewed'
                          : 'Mark as viewed'}
                    </button>
                  </>
                )}
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
                id={isLiveHelp(item) ? 'live-help-card' : undefined}
              >
                <h4>{item.title}</h4>
                <p>{item.description}</p>

                {isLiveHelp(item) ? (
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
                      {loadingItemId === item.id ? 'Loading…' : 'Buy Live Help'}
                    </button>
                  </>
                ) : (
                  <button
                    className="buy-button"
                    onClick={() => handleBuy(item)}
                    disabled={loadingItemId === item.id}
                  >
                    {loadingItemId === item.id
                      ? 'Loading…'
                      : `Buy for $${(item.price / 100).toFixed(2)}`}
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

// tiny inline styles (same as your current)
const badgeWarnStyle = {
  color: '#fff',
  background: '#f39c12',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '0.8em',
  marginRight: '8px',
};
const badgeOkStyle = {
  color: '#fff',
  background: '#27ae60',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '0.8em',
  marginRight: '8px',
};
