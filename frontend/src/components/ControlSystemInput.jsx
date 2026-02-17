// frontend/src/components/ControlSystemInput.jsx

import React, { useState } from 'react';
import Button from './Button';

const ControlSystemInput = ({ onAnalyze }) => {
  const [numerator, setNumerator] = useState('');
  const [denominator, setDenominator] = useState('');
  const [error, setError] = useState(null);

  const handleAnalyze = () => {
    setError(null);
    const num = numerator.split(',').map(Number);
    const den = denominator.split(',').map(Number);

    if (num.some(isNaN) || den.some(isNaN)) {
      setError('系数必须是有效的数字。');
      return;
    }

    if (onAnalyze) {
      onAnalyze(num, den);
    }
  };

  return (
    <div className="input-card">
      <div>
        <label htmlFor="numerator">分子系数 (逗号分隔):</label>
        <input
          id="numerator"
          type="text"
          value={numerator}
          onChange={(e) => setNumerator(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label htmlFor="denominator">分母系数 (逗号分隔):</label>
        <input
          id="denominator"
          type="text"
          value={denominator}
          onChange={(e) => setDenominator(e.target.value)}
          className="input-field"
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <Button onClick={handleAnalyze}>分析</Button>
    </div>
  );
};

export default ControlSystemInput;