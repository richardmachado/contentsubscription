import React, { useState, useEffect } from 'react';
import './NodeGuide.css';

function JSDataTypesGuide() {
  const [darkMode, setDarkMode] = useState(true);
  const toggleTheme = () => setDarkMode(!darkMode);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={darkMode ? 'node-guide-container dark' : 'node-guide-container light'}>
      <div className="theme-toggle">
        <button onClick={toggleTheme}>{darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}</button>
      </div>

      <div className="node-guide-content">
        <h1>📚 JavaScript Data Types</h1>
        <p>
          JavaScript has two main types of data: <strong>primitive</strong> and{' '}
          <strong>non-primitive</strong>. Let’s break it down with examples!
        </p>

        <h2>🔢 Primitive Types</h2>
        <ul>
          <li>
            <strong>Number:</strong> <code>let age = 30;</code>
          </li>
          <li>
            <strong>String:</strong> <code>let name = "Alice";</code>
          </li>
          <li>
            <strong>Boolean:</strong> <code>let isHappy = true;</code>
          </li>
          <li>
            <strong>Null:</strong> <code>let pet = null;</code>
          </li>
          <li>
            <strong>Undefined:</strong> <code>let score;</code>
          </li>
          <li>
            <strong>Symbol:</strong> <code>let id = Symbol("unique");</code>
          </li>
          <li>
            <strong>BigInt:</strong>{' '}
            <code>let big = 1234567890123456789012345678901234567890n;</code>
          </li>
        </ul>

        <h2>📦 Non-Primitive (Reference) Types</h2>
        <ul>
          <li>
            <strong>Object:</strong> <code>{`let user = { name: "Alice", age: 30 };`}</code>
          </li>
          <li>
            <strong>Array:</strong> <code>{`let colors = ["red", "green", "blue"];`}</code>
          </li>
          <li>
            <strong>Function:</strong> <code>{`function greet() { console.log("Hi!"); }`}</code>
          </li>
        </ul>

        <h2>🤔 Type Checking</h2>
        <p>
          Use <code>typeof</code> to check a variable’s type:
        </p>
        <pre>
          <code>{`console.log(typeof "hello"); // string
console.log(typeof 42); // number
console.log(typeof null); // object (weird JS quirk!)`}</code>
        </pre>

        <h2>🎯 Quick Tips</h2>
        <ul>
          <li>Primitive values are immutable.</li>
          <li>Objects and arrays are reference types.</li>
          <li>
            <code>null</code> is technically an object — it's a long-standing JS bug 🤷
          </li>
        </ul>

        <h2>🚀 Next Steps</h2>
        <ul>
          <li>Play around with variables in your browser console.</li>
          <li>Try combining types, like arrays of objects.</li>
          <li>Understand how data types affect logic and loops.</li>
        </ul>
      </div>
    </div>
  );
}

export default JSDataTypesGuide;
