import React from 'react';
import Login from '../Components/Login';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-root">
      <section className="landing-hero">
        <div className="landing-copy">
          <h1 className="landing-title">
            Welcome to <span className="landing-accent">Programming with Rick</span>
          </h1>
          <p className="landing-subtitle">
            Thanks for visiting and taking the first step into JavaScript programming. Tutorials,
            mini-challenges, cheatsheets, and projects await you.
          </p>

          <div className="landing-cta-row">
            <div className="landing-cta-primary">Start learning now</div>
            <span className="landing-cta-note">No credit card needed</span>
          </div>

          <ul className="landing-benefits">
            <li>✔ Step-by-step tutorials</li>
            <li>✔ Mini-challenges & answers</li>
            <li>✔ Premium cheatsheets</li>
            <li>✔ Real projects</li>
          </ul>
        </div>

        <div className="landing-auth">
          <div className="landing-auth-card">
            <h2 className="landing-auth-title">Log in to continue</h2>
            <Login />
          </div>
        </div>
      </section>
    </div>
  );
}
