import { useState } from 'react';

export default function CodePlayground({ initialCode = '', prompt }) {
  const [code, setCode] = useState(initialCode.trim());
  const [output, setOutput] = useState('');

  const runCode = () => {
    const logs = [];
    const originalLog = console.log;

    try {
      console.log = (...args) => {
        logs.push(args.map(String).join(' '));
      };

      // eslint-disable-next-line no-eval
      eval(code);

      setOutput(logs.join('\n') || '(no console output)');
    } catch (err) {
      setOutput('Error: ' + err.message);
    } finally {
      console.log = originalLog;
    }
  };

  const reset = () => {
    setCode(initialCode.trim());
    setOutput('');
  };

  return (
    <div className="code-playground">
      {prompt && <p className="playground-prompt">{prompt}</p>}
      <textarea
        className="playground-editor"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck="false"
      />
      <div className="playground-actions">
        <button type="button" onClick={runCode}>
          Run
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
      <pre className="playground-output">{output || 'Output will appear here…'}</pre>
    </div>
  );
}
