// src/Components/ContentTabs.js
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

// Use CRA/Webpack env to avoid import.meta warnings
const API_BASE = process.env.REACT_APP_API_BASE || '';

export default function ContentTabs({ tab, setTab, items }) {
  const { token } = useAuth();
  const [quantities, setQuantities] = useState({});
  const [loadingItemId, setLoadingItemId] = useState(null);

  const isPremium = (item) =>
    item.is_premium !== undefined ? !!item.is_premium : Number(item.price) > 0;

  const priceToDollars = (cents) => (Number(cents || 0) / 100).toFixed(2);

  // --- Categorize ---
  const freeItems = items.filter((i) => !isPremium(i)); // free
  const purchasedItems = items.filter((i) => i.purchased); // bought
  const exploreItems = items.filter((i) => !i.purchased && isPremium(i)); // buyable

  // --- UI helpers ---
  const Badge = ({ color, children }) => (
    <span
      className="badge"
      style={{
        color: '#fff',
        background: color === 'green' ? '#27ae60' : '#f39c12',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '0.8em',
        marginRight: '8px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );

  const handleQuantityChange = (id, qty) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, Number(qty) || 1) }));

  const handleBuy = async (item) => {
    if (loadingItemId === item.id) return;
    const quantity = quantities[item.id] || 1;
    setLoadingItemId(item.id);

    // Build payload; include session_id for live help if present
    const payload = { quantity: Math.max(1, Number(quantity) || 1) };
    if (item.is_live_help && item.next_session_id) {
      payload.session_id = item.next_session_id;
    }

    try {
      const response = await toast.promise(
        fetch(`${API_BASE}/api/buy/${item.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }),
        {
          pending: 'Preparing your checkout…',
          success: 'Redirecting to Stripe!',
          error: 'Failed to start checkout. Please try again.',
        },
        { toastId: `stripe-${item.id}`, position: 'top-right' }
      );

      const data = await response.json();
      if (data?.url) window.location.assign(data.url);
    } catch (err) {
      console.error('Stripe checkout failed:', err);
    } finally {
      setLoadingItemId(null);
    }
  };

  // --- Cards ---
  const FreeCard = ({ item }) => {
    const to = `/content/${item.slug || item.id}`;
    return (
      <div className="content-box">
        <Link to={to} className="content-card-main">
          <h4>{item.title}</h4>
          <p>{item.description}</p>
          <Badge color="green">FREE</Badge>
        </Link>
      </div>
    );
  };

  const PurchasedCard = ({ item }) => {
    const to = `/content/${item.slug || item.id}`;
    return (
      <div className="content-box">
        <Link to={to} className="content-card-main">
          <h4>{item.title}</h4>
          <p>{item.description}</p>
          {item.viewed ? <Badge color="green">VIEWED</Badge> : <Badge color="orange">NEW</Badge>}
        </Link>
      </div>
    );
  };

  const ExploreCard = ({ item }) => {
    // Detect Live Help product
    const isLiveHelp = item.is_live_help === true || item.title === 'Live Help Session';
    const disabled = loadingItemId === item.id;

    const onCardClick = (e) => {
      if (e.target.closest?.('.card-controls')) return; // don’t buy if clicking controls
      handleBuy(item);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleBuy(item);
      }
    };

    const hours = quantities[item.id] || 1;
    const unitPrice = Number(item.price || 0); // cents
    const total = ((unitPrice / 100) * hours).toFixed(2);

    return (
      <div
        className={`content-box ${isLiveHelp ? 'alt' : ''}`}
        id={isLiveHelp ? 'live-help-card' : undefined}
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={onKeyDown}
        aria-disabled={disabled}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <div className="content-card-main">
          <h4>{item.title}</h4>
          <p>{item.description}</p>
          <Badge color="orange">PREMIUM</Badge>
          {!isLiveHelp && <p>Price: ${priceToDollars(item.price)}</p>}
        </div>

        <div className="card-controls" style={{ marginTop: 8 }}>
          {isLiveHelp && (
            <>
              <label>
                Hours:&nbsp;
                <select
                  value={hours}
                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  aria-label="Select number of hours"
                >
                  {[1, 2, 3, 4, 5].map((qty) => (
                    <option key={qty} value={qty}>
                      {qty}
                    </option>
                  ))}
                </select>
              </label>
              <p style={{ marginTop: 6 }}>Total: ${total}</p>
            </>
          )}

          <button
            className="buy-button"
            onClick={(e) => {
              e.stopPropagation();
              handleBuy(item);
            }}
            disabled={disabled}
            aria-busy={disabled}
          >
            {disabled ? 'Loading…' : 'Buy'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="tab-buttons">
        <button
          className={`tab-button ${tab === 'free' ? 'active-tab' : ''}`}
          onClick={() => setTab('free')}
        >
          Free Lessons
        </button>
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

      {tab === 'free' && (
        <div className="content-list">
          {freeItems.length === 0 ? (
            <p>No free lessons yet—check Explore for new content!</p>
          ) : (
            freeItems.map((item) => <FreeCard key={item.id} item={item} />)
          )}
        </div>
      )}

      {tab === 'purchased' && (
        <div className="content-list">
          {purchasedItems.length === 0 ? (
            <p>You haven’t purchased any content yet.</p>
          ) : (
            purchasedItems.map((item) => <PurchasedCard key={item.id} item={item} />)
          )}
        </div>
      )}

      {tab === 'explore' && (
        <div className="tab-content">
          {exploreItems.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#888' }}>🎉 You own everything—for now!</p>
          ) : (
            exploreItems.map((item) => <ExploreCard key={item.id} item={item} />)
          )}
        </div>
      )}
    </>
  );
}
