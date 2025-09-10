// src/Pages/Dashboard.js
import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { toast } from 'react-toastify';

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
import './Dashboard.css';

// Price per hour for Live Help (in cents)
const LIVE_HELP_PRICE_CENTS = Number(process.env.REACT_APP_LIVE_HELP_PRICE_CENTS) || 5000; // default $50/hr

export default function Dashboard() {
  const { token, logout } = useAuth();

  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('free'); // show Free tab first
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
    let sessionId = params.get('session_id'); // Stripe Checkout session ID

    // Fallback from ProtectedRoute if we hit /login first
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
      setItems(Array.isArray(fetchedItems) ? fetchedItems : []);
      setProfile(fetchedProfile);
    };

    // Try singular route first (matches liveHelpHour.js); fall back to plural if needed.
    const fetchLiveHelpSessions = async () => {
      try {
        let res = await api.get('/api/live-help-hour', { validateStatus: () => true });
        if (res?.status === 404) {
          res = await api.get('/api/live-help-hours', { validateStatus: () => true });
        }
        const data = res?.data;
        if (!data || typeof data === 'string') {
          console.warn('[live-help] unexpected response', data);
          return { sessions: [], totalHours: 0 };
        }
        return {
          sessions: Array.isArray(data.sessions) ? data.sessions : [],
          totalHours: typeof data.totalHours === 'number' ? data.totalHours : 0,
        };
      } catch (e) {
        console.warn('[live-help] fetch error', e?.message);
        return { sessions: [], totalHours: 0 };
      }
    };

    // Always append a product-like Live Help item; decorate it if sessions exist
    const ensureLiveHelpItem = async () => {
      const { sessions, totalHours } = await fetchLiveHelpSessions();

      if (typeof totalHours === 'number') setLiveHelpHours(totalHours);

      const now = Date.now();
      const available = sessions.filter(
        (s) =>
          !s.is_cancelled &&
          new Date(s.ends_at).getTime() > now &&
          Number(s.spots_booked) < Number(s.capacity)
      );

      const next = available[0];
      const remaining = next ? Number(next.capacity) - Number(next.spots_booked) : null;

      setItems((curr) => {
        // If the card is already present, update its description / session_id
        const foundIdx = curr.findIndex((i) => i.is_live_help || i.id === 'live_help');
        if (foundIdx >= 0) {
          const updated = [...curr];
          const base = updated[foundIdx];
          updated[foundIdx] = {
            ...base,
            description: next
              ? `One-on-one help. Next slot: ${new Date(next.starts_at).toLocaleString()} — ${remaining} spot(s) left.`
              : 'One-on-one help billed per hour. New slots open regularly.',
            next_session_id: next ? next.id : undefined,
          };
          return updated;
        }

        // Otherwise, add it now (even if no sessions — users can still purchase hours)
        return [
          ...curr,
          {
            id: 'live_help', // what your /api/buy/:id will receive
            title: 'Live Help Session',
            description: next
              ? `One-on-one help. Next slot: ${new Date(next.starts_at).toLocaleString()} — ${remaining} spot(s) left.`
              : 'One-on-one help billed per hour. New slots open regularly.',
            price: LIVE_HELP_PRICE_CENTS, // cents per hour
            is_premium: true,
            is_live_help: true,
            purchased: false,
            next_session_id: next ? next.id : undefined, // optional; pass through on buy
          },
        ];
      });
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
              sessionStorage.removeItem('pendingStatus');
              sessionStorage.removeItem('pendingSessionId');

              confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } });
              if (!toastShownRef.current) {
                toast.success('Payment confirmed! Your item is now in Purchased.');
                toastShownRef.current = true;
              }
              setTab('purchased');
            } catch (err) {
              const msg = err?.response?.data?.error || 'Could not confirm payment.';
              console.warn('[confirm-payment] failed:', err?.response?.status, err?.message);
              toast.error(msg);
            }
          }
          if (new URLSearchParams(window.location.search).get('status')) cleanUrl();
        } else if (status === 'cancel') {
          toast.info('Checkout canceled.');
          if (new URLSearchParams(window.location.search).get('status')) cleanUrl();
        }

        // Load data for first paint (or refresh after confirmation)
        await loadCore();
        await ensureLiveHelpItem();
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Could not load your dashboard.');
      }
    };

    run();
    // eslint-disable-next-line
  }, []);

  // Helper to open default mail client (same tab to avoid blank windows)
const handleEmailMe = () => {
  const to = 'programmingwithrick@gmail.com';
  const subject = 'Meeting Request';
  const body = 'Hi, I purchased a live session and I would like to schedule a time to meet for our live session.';
  const gmailCompose = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    to
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailCompose, '_blank', 'noopener,noreferrer');
};


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
          <button className="book-session-button" onClick={handleEmailMe}>
            📧 Email me to Book 🧑‍💻
          </button>
        )}
      </div>

      {/* Three-tab content */}
      <ContentTabs tab={tab} setTab={setTab} items={items} />

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
