import { useState } from 'react';
//import handlePurchase from './HandlePurchase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function ContentTabs({ tab, setTab, purchased, unpurchased }) {
  const { token } = useAuth();
  const [quantities, setQuantities] = useState({});
  const [loadingItemId, setLoadingItemId] = useState(null);


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
      {
        toastId: `stripe-${item.id}`, // ensures only one toast per item
        position: 'top-right',
      }
    );

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      setLoadingItemId(null);
    }
  } catch (err) {
    setLoadingItemId(null);
    console.error('Stripe checkout failed:', err);
  }
};



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
          {purchased.length === 0 ? (
            <p>You haven’t purchased any content yet.</p>
          ) : (
            purchased.map((item) => (
              <div key={item.id} className="content-box">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <button
                  className="view-button"
                  onClick={() => alert('Enjoy your content!')}
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="tab-content">
          {unpurchased.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: '#888' }}>
              🎉 You’ve purchased all current content. Stay tuned for new
              content coming soon!
            </p>
          ) : (
            unpurchased.map((item) => (
              <div
                key={item.id}
                className="content-box alt"
                id={
                  item.title === 'Live Help Session'
                    ? 'live-help-card'
                    : undefined
                }
              >
                <h4>{item.title}</h4>
                <p>{item.description}</p>

                {item.title === 'Live Help Session' ? (
                  <>
                    <label>
                      Hours:&nbsp;
                      <select
                        value={quantities[item.id] || 1}
                        onChange={(e) =>
                          handleQuantityChange(item.id, e.target.value)
                        }
                      >
                        {[1, 2, 3, 4, 5].map((qty) => (
                          <option key={qty} value={qty}>
                            {qty}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>
                      Total: $
                      {(
                        (item.price / 100) *
                        (quantities[item.id] || 1)
                      ).toFixed(2)}
                    </p>
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
