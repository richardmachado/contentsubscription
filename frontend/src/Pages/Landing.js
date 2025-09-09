import React from 'react';
import Login from '../Components/Login'; // adjust path if needed

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: 24 }}>
      <section style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 40, fontWeight: 800 }}>
            Welcome to <span style={{ color: '#22d3ee' }}>JavaScript Launchpad</span>
          </h1>
          <p style={{ color: '#cbd5e1', maxWidth: 720 }}>
            Thanks for visiting and taking the first step into JavaScript programming. Tutorials,
            mini-challenges, cheatsheets, and projects await you.
          </p>
          <ul style={{ marginTop: 12, lineHeight: 1.8 }}>
            <li>✔ Step-by-step tutorials</li>
            <li>✔ Mini-challenges & answers</li>
            <li>✔ Premium cheatsheets</li>
            <li>✔ Real projects</li>
          </ul>
        </div>
        {/* Your existing Login component */}
        <div>
          <Login />
        </div>
      </section>
    </div>
  );
}
