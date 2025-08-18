// src/Pages/Dashboard.js
import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

import ContentTabs from '../Components/ContentTabs';
import ProfileModal from '../Components/ProfileModal';

import {
  api,
  setAuthToken,
  fetchContent,
  fetchProfile,
  updateProfile as saveProfile,
  confirmPayment,
} from '../utils/api';
import { useAuth } from '../context/AuthContext';
import '../Dashboard.css';

export default function Dashboard() {
  const { token, logout } = useAuth();

  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('purchased');
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [liveHelpHours, setLiveHelpHours] = useState(0);
  const toastShownRef = useRef(false);

  // Keep axios Authorization in sync with our token
  useEffect(() => {
    setAuthToken(token || localStorage.getItem('token') || undefined);
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let status = params.get('status'); // "success" | "cancel" | null
    let sessionId = params.get('session_id'); // Stripe Checkout session ID (if success)

    // If we got bounced to /login first, ProtectedRoute may have stashed these:
    if (!status && !sessionId) {
      const pStatus = sessionStorage.getItem('pendingStatus');
      const pSid = sessionStorage.getItem('pendingSessionId');
      if (pStatus && pSid) {
        status = pStatus;
        sessionId = pSid;
      }
    }

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    };

    const loadCore = async () => {
      const [fetchedItems, fetchedProfile] = await Promise.all([fetchContent(), fetchProfile()]);
      setItems(fetchedItems);
      setProfile(fetchedProfile);
    };

    const loadLiveHelp = async () => {
      try {
        const { data } = await api.get('/api/live-help-hours', { validateStatus: () => true });
        if (typeof data === 'string' && data.startsWith('<')) {
          console.error(
            '[live-help-hours] HTML response (wrong host/route):',
            data.slice(0, 120),
            '...'
          );
          return;
        }
        setLiveHelpHours(data?.totalHours ?? 0);
      } catch {
        // non-critical
      }
    };

    const run = async () => {
      try {
        // Handle success/cancel landing first so data reflects the payment immediately
        if (status === 'success' && sessionId) {
          const key = `confirmed:${sessionId}`;
          if (!sessionStorage.getItem(key)) {
            try {
              await confirmPayment(sessionId); // backend verify + record purchase
              sessionStorage.setItem(key, '1'); // stop double-confirm on reload

              // clear any pending values we might have used
              sessionStorage.removeItem('pendingStatus');
              sessionStorage.removeItem('pendingSessionId');

              confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } });
              if (!toastShownRef.current) {
                toast.success('Payment confirmed! Your item is now in Purchased.');
                toastShownRef.current = true;
              }
              setTab('purchased');
            } catch (err) {
              console.warn('[confirm-payment] failed:', err?.response?.status, err?.message);
              const msg = err?.response?.data?.error || 'Could not confirm payment.';
              toast.error(msg);
            }
          }
          // Only clean if URL actually had params
          if (new URLSearchParams(window.location.search).get('status')) cleanUrl();
        } else if (status === 'cancel') {
          toast.info('Checkout canceled.');
          if (new URLSearchParams(window.location.search).get('status')) cleanUrl();
        }

        // Load data for first paint (or refresh after confirmation)
        await loadCore();
        await loadLiveHelp();
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Could not load your dashboard.');
      }
    };

    run();
    // We only want to run this on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h2>Premium Content</h2>
        <button className="profile-button" onClick={() => setShowModal(true)}>
          ⚙️ Edit profile
        </button>
      </div>

      <div className="live-help-summary">
        🧑‍🏫 Total Live Help Purchased: <strong>{liveHelpHours}</strong> hour
        {liveHelpHours !== 1 ? 's' : ''}
      </div>

      <div className="live-help-action">
        {liveHelpHours === 0 ? (
          <button
            className="buy-help-button"
            onClick={() => {
              const el = document.getElementById('live-help-card');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTab('explore');
            }}
          >
            💳 Buy Live Help Hours 🧑‍💻
          </button>
        ) : (
          <button
            className="book-session-button"
            onClick={() => window.open('https://calendly.com/rich92105/15min', '_blank')}
          >
            📅 Book a Live Session 🧑‍💻
          </button>
        )}
      </div>

      <div className="free-content-card">
        <Link to="/learn-node" className="free-guide-link">
          <div className="guide-card">
            <p>Free content to get you started</p>
            <h3>🆓 Getting Started with Node.js</h3>
            <p>Beginner-friendly intro to building with JavaScript. No purchase needed.</p>
          </div>
        </Link>
      </div>

      <div className="free-content-card">
        <Link to="/data-types" className="free-guide-link">
          <div className="guide-card">
            <p>More free content</p>
            <h3>Javascript data types</h3>
            <p>Beginner-friendly intro to data types in javascript</p>
          </div>
        </Link>
      </div>

      <ContentTabs tab={tab} setTab={setTab} items={items} setItems={setItems} />

      {showModal && (
        <ProfileModal
          profile={profile}
          setProfile={setProfile}
          updateProfile={saveProfile}
          logout={logout}
          onClose={(saved) => {
            setShowModal(false);
            if (saved) toast.success('✅ Profile updated successfully!');
          }}
        />
      )}
    </div>
  );
}
