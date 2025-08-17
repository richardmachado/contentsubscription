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
} from '../utils/api';
import { useAuth } from '../context/AuthContext';
import '../Dashboard.css';

export default function Dashboard() {
  const { token, logout } = useAuth(); // ⬅️ pull token if your context provides it
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('purchased');
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [liveHelpHours, setLiveHelpHours] = useState(0);
  const toastShownRef = useRef(false);

  useEffect(() => {
    // Ensure axios has Authorization for all calls
    setAuthToken(token || localStorage.getItem('token') || undefined);

    const loadData = async () => {
      try {
        // --- Handle Stripe redirect ---
        const url = new URL(window.location.href);
        const sessionId = url.searchParams.get('session_id');

        if (sessionId && !toastShownRef.current) {
          try {
            const { data } = await api.get('/api/confirm-payment', {
              params: { session_id: sessionId },
            });

            if (data?.ok || data?.success) {
              // After confirm, immediately reload content so Purchased reflects the new item
              const [freshItems, freshProfile] = await Promise.all([
                fetchContent(),
                fetchProfile(),
              ]);
              setItems(freshItems);
              setProfile(freshProfile);

              confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
              toast.success('✅ Payment successful! You now have access to your content.');
              toastShownRef.current = true;

              // Clean the URL so reloads don’t re-confirm
              url.searchParams.delete('session_id');
              window.history.replaceState({}, document.title, url.pathname + url.search);

              // Make sure the Purchased tab is visible
              setTab('purchased');
            } else {
              console.warn('Confirm payment response (not ok):', data);
            }
          } catch (e) {
            // If confirm fails (e.g., not mounted), we still proceed—webhook may update later
            console.warn(
              'Confirm payment failed; proceeding with normal load:',
              e?.response?.data || e.message
            );
          }
        }

        // --- Load content + profile (first paint / normal path) ---
        const [fetchedItems, fetchedProfile] = await Promise.all([fetchContent(), fetchProfile()]);
        setItems(fetchedItems);
        setProfile(fetchedProfile);

        // --- Live help hours (non-blocking) ---
        try {
          const { data: hoursData } = await api.get('/api/live-help-hours');
          setLiveHelpHours(hoursData?.totalHours ?? 0);
        } catch {
          /* ignore */
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [token]); // re-run if token changes

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
            onClick={() => {
              window.open('https://calendly.com/rich92105/15min', '_blank');
            }}
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
