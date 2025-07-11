import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { toast } from 'react-toastify';

import ContentTabs from '../Components/ContentTabs';
import ProfileModal from '../Components/ProfileModal';

import { Link } from 'react-router-dom';

import {
  fetchContent,
  fetchProfile,
  updateProfile as saveProfile,
} from '../utils/api';

import { useAuth } from '../context/AuthContext';

import '../Dashboard.css';

export default function Dashboard() {
  const { logout } = useAuth();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('purchased');
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState(null);

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

            toast.success(
              'Payment successful! You now have access to your content.'
            );
            toastShownRef.current = true;

            // Clean the URL
            window.history.replaceState({}, document.title, '/dashboard');
          }
        }

        const [fetchedItems, fetchedProfile] = await Promise.all([
          fetchContent(),
          fetchProfile(),
        ]);
        setItems(fetchedItems);
        setProfile(fetchedProfile);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  const purchased = items.filter((i) => i.purchased);
  const unpurchased = items.filter((i) => !i.purchased);

  return (
    <div className="container">
      <div className="header">
        <h2>Premium Content</h2>

        <button className="profile-button" onClick={() => setShowModal(true)}>
          ⚙️
        </button>
      </div>

      <div className="free-content-card">
        <Link to="/learn-node" className="free-guide-link">
          <div className="guide-card">
            <p>free content to get you started</p>
            <h3>🆓 Getting Started with Node.js</h3>
            <p>
              Beginner-friendly intro to building with JavaScript. No purchase
              needed.
            </p>
          </div>
        </Link>
      </div>

      <ContentTabs
        tab={tab}
        setTab={setTab}
        purchased={purchased}
        unpurchased={unpurchased}
      />

      {showModal && (
        <ProfileModal
          profile={profile}
          setProfile={setProfile}
          updateProfile={saveProfile}
          logout={logout}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
