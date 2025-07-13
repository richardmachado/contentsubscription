import React, { useState, useEffect } from 'react';
import './NodeGuide.css';

function NodeGuide() {


useEffect(() => {
  window.scrollTo(0, 0);
}, []);

  const [darkMode, setDarkMode] = useState(true);

  const toggleTheme = () => setDarkMode(!darkMode);

  return (
    <div
      className={
        darkMode ? 'node-guide-container dark' : 'node-guide-container light'
      }
    >
      <div className="theme-toggle">
        <button onClick={toggleTheme}>
          {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      <div className="node-guide-content">
        <h1>🚀 Node.js for Total Beginners</h1>
        <p>
          Think of Node.js as a way to run JavaScript <em>outside</em> your
          browser. This guide walks you through the basics, step by step.
        </p>

        <h2>🛠️ Step 1: Install Node.js</h2>
        <ul>
          <li>
            Go to{' '}
            <a
              href="https://nodejs.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              nodejs.org
            </a>
          </li>
          <li>
            Click the green <strong>LTS</strong> button
          </li>
          <li>Install it like a regular app</li>
          <li>
            Open your terminal and run: <code>node -v</code>
          </li>
        </ul>

        <h2>📂 Step 2: Make Your First App</h2>
        <ol>
          <li>
            Create a folder: <code>my-first-node-app</code>
          </li>
          <li>Open that folder in terminal</li>
          <li>
            Run: <code>npm init -y</code>
          </li>
          <li>
            Create a file: <code>index.js</code> (do it like a pro and enter{' '}
            <code>touch index.js</code> in your terminal){' '}
          </li>
        </ol>

        <h2>✏️ Step 3: Write and Run Code</h2>
        <p>
          Add this to <code>index.js</code>:
        </p>
        <pre>
          <code>console.log("Hello from Node!");</code>
        </pre>
        <p>Then run it:</p>
        <pre>
          <code>node index.js</code>
        </pre>

        <h2>🎁 Bonus: Try This!</h2>
        <pre>
          <code>{`const os = require("os");

console.log("You're using: " + os.platform());
console.log("Total memory: " + os.totalmem());`}</code>
        </pre>

        <h2>🎯 What’s Next?</h2>
        <ul>
          <li>Build a basic web server</li>
          <li>Learn Express.js</li>
          <li>Make your own REST API</li>
          <li>Connect a database</li>
        </ul>
      </div>
    </div>
  );
}

export default NodeGuide;
