// SandboxPage.jsx
import React, { useEffect, useState } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import { githubLight } from "@codesandbox/sandpack-themes";

const STORAGE_KEY = "lesson-1-sandpack-code";

export function SandboxPage() {
  const [files, setFiles] = useState({
    "/index.js": `const name = "Diana";
console.log("Hello " + name);`,
  });

  // Load from localStorage on first mount
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    console.log(saved);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only set if it looks like a files object
        if (parsed && typeof parsed === "object") {
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
    <div style={{ height: "100vh" }}>
      <h1>JavaScript Sandbox</h1>
      <p>
        Type your code on the left, see the result on the right. Your work is
        automatically saved in this browser.
      </p>

      <Sandpack
        template="vanilla"
        theme={githubLight}
        files={files}
        // IMPORTANT: keep files state in sync with Sandpack
        onChange={(newFiles) => setFiles(newFiles)}
        options={{
          showConsole: true,
          showConsoleButton: true,
          recompileMode: "delayed",
          recompileDelay: 500,
        }}
      />
    </div>
  );
}
