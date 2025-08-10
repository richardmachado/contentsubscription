import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './../RealContent/NodeGuide.css';

function LearningLandingPage() {
  const [darkMode, setDarkMode] = useState(true);

  const toggleTheme = () => setDarkMode(!darkMode);

  return (
    <div
      className={darkMode ? 'node-guide-container dark' : 'node-guide-container light'}
      style={{
        backgroundColor: darkMode ? '#1e1e2f' : '#fff',
        color: darkMode ? '#f0f0f0' : '#000',
      }}
    >
      <div className="theme-toggle">
        <button onClick={toggleTheme}>{darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}</button>
      </div>

      <div className="node-guide-content">
        <h1>🚀 Your Developer Journey Starts Here</h1>
        <p>
          Whether you’ve never written a line of code or just need a fresh start, this is where it
          begins. We'll take you from <strong>zero to hero</strong> with the three most powerful
          tools in web development:
        </p>

        <h2>💡 Why JavaScript?</h2>
        <p>
          JavaScript is the language of the web. It brings your pages to life and powers everything
          from forms to full apps. We’ll start with the basics:
        </p>
        <ul>
          <li>Understanding variables, types, and logic</li>
          <li>Making your browser do what you say</li>
          <li>Building a solid foundation</li>
        </ul>

        <h2>🛠️ What’s Node.js?</h2>
        <p>
          Node lets you run JavaScript outside the browser — it’s how we build tools, APIs, and full
          backend servers. No more just clicking “Run,” you're now building the engine.
        </p>
        <ul>
          <li>Install Node and build your first script</li>
          <li>Understand the terminal like a real dev</li>
          <li>Prepare for real-world backend projects</li>
        </ul>

        <h2>⚛️ Meet React</h2>
        <p>
          React is how we build sleek, modern web apps. It lets you create reusable components and
          dynamic interfaces — basically, you’ll feel like a wizard.
        </p>
        <ul>
          <li>Learn how components and hooks work</li>
          <li>Build beautiful interfaces that react to users</li>
          <li>Create your first app — yes, you’ll actually do it</li>
        </ul>

        <h2>🎉 Ready to Dive In?</h2>
        <p>Choose your path and let’s start building:</p>
        <div className="landing-links">
          <Link
            to="/data-types"
            className="guide-card"
            style={{
              backgroundColor: darkMode ? '#222b3c' : '#fff',
              color: darkMode ? '#f0f0f0' : '#000',
            }}
          >
            <h3>📚 Learn JavaScript Basics</h3>
            <p>Variables, logic, and data types — made simple</p>
          </Link>

          <Link
            to="/learn-node"
            className="guide-card"
            style={{
              backgroundColor: darkMode ? '#222b3c' : '#fff',
              color: darkMode ? '#f0f0f0' : '#000',
            }}
          >
            <h3>🧰 Start Node.js</h3>
            <p>Install Node and build your first real script</p>
          </Link>

          <Link
            to="/learn-react"
            className="guide-card"
            style={{
              backgroundColor: darkMode ? '#222b3c' : '#fff',
              color: darkMode ? '#f0f0f0' : '#000',
            }}
          >
            <h3>⚛️ Dive into React</h3>
            <p>Make powerful web apps with components</p>
          </Link>
        </div>

        <p style={{ marginTop: '2rem', fontStyle: 'italic' }}>
          You bring curiosity — we’ll bring the code. Let’s go.
        </p>
      </div>
    </div>
  );
}

export default LearningLandingPage;
