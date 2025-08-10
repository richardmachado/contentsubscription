import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { toast } from 'react-toastify';

import ContentTabs from '../Components/ContentTabs';
import ProfileModal from '../Components/ProfileModal';
import { Link } from 'react-router-dom';

import { fetchContent, fetchProfile, updateProfile as saveProfile } from '../utils/api';

import { useAuth } from '../context/AuthContext';
import '../Dashboard.css';

export default function Dashboard() {
  const { logout } = useAuth();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('purchased');
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(null);
  const [liveHelpHours, setLiveHelpHours] = useState(0);
  const toastShownRef = useRef(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');

        if (sessionId && !toastShownRef.current) {
          const res = await fetch(
            `http://localhost:5000/api/confirm-payment?session_id=${sessionId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          const data = await res.json();

          if (data.success) {
            confetti({
              particleCount: 150,
              spread: 90,
              origin: { y: 0.6 },
            });

            toast.success('✅ Payment successful! You now have access to your content.');
            toastShownRef.current = true;

            window.history.replaceState({}, document.title, '/dashboard');
          }
        }

        const [fetchedItems, fetchedProfile] = await Promise.all([fetchContent(), fetchProfile()]);
        setItems(fetchedItems);
        setProfile(fetchedProfile);

        const hoursRes = await fetch('http://localhost:5000/api/live-help-hours', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const hoursData = await hoursRes.json();
        setLiveHelpHours(hoursData.totalHours);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
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

      {/* ✅ Pass full items + setItems */}
      <ContentTabs tab={tab} setTab={setTab} items={items} setItems={setItems} />

      {showModal && (
        <ProfileModal
          profile={profile}
          setProfile={setProfile}
          updateProfile={saveProfile}
          logout={logout}
          onClose={(saved) => {
            setShowModal(false);
            if (saved) {
              toast.success('✅ Profile updated successfully!');
            }
          }}
        />
      )}
    </div>
  );
}
