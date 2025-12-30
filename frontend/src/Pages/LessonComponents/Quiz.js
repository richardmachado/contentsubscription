import { useState } from 'react';

export default function Quiz({ question, options = [], correctIndex = 0, explanation }) {
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);

  const handleCheck = () => {
    if (selected === null) return;
    setChecked(true);
  };

  const isCorrect = checked && selected === correctIndex;

  return (
    <div className="quiz-card">
      <p className="quiz-question">{question}</p>
      <ul className="quiz-options">
        {options.map((opt, idx) => (
          <li key={idx}>
            <label>
              <input
                type="radio"
                name={question}
                value={idx}
                checked={selected === idx}
                onChange={() => {
                  setSelected(idx);
                  setChecked(false);
                }}
              />
              {opt}
            </label>
          </li>
        ))}
      </ul>

      <button type="button" onClick={handleCheck} disabled={selected === null}>
        Check answer
      </button>

      {checked && (
        <div className={`quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
          {isCorrect ? '✅ Correct!' : '❌ Not quite.'}
          {explanation && <p className="quiz-explanation">{explanation}</p>}
        </div>
      )}
    </div>
  );
}
