// SandboxPage.jsx
import React, { useEffect, useState } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import { dracula, githubLight, nightOwl } from '@codesandbox/sandpack-themes';

const STORAGE_KEY = 'lesson-1-sandpack-code';

export function SandboxPage() {
  const [files, setFiles] = useState({
    '/index.js': `const name = "Diana";
    console.log("Hello " + name);`,
    

  });

  // Load from localStorage on first mount
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
   
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only set if it looks like a files object
        if (parsed && typeof parsed === 'object') {
          setFiles(parsed);
        }
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

  // Save to localStorage whenever files change
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  }, [files]);

  return (
    <div style={{ height: '100vh' }}>
      <h1>JavaScript Sandbox</h1>
      <p>
        Type your code on the left, see the result on the right. 
      </p>

      <Sandpack
        template="vanilla"
        theme={nightOwl}
        files={files}
        // IMPORTANT: keep files state in sync with Sandpack
        onChange={(newFiles) => setFiles(newFiles)}
        options={{
          showConsole: true,
          showConsoleButton: true,
          recompileMode: 'delayed',
          recompileDelay: 500,
        }}
      />
    </div>
  );
}
