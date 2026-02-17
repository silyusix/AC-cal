// frontend/src/components/RootLocusInput.jsx

import React, { useState } from 'react';
import Button from './Button';
import { parseComplexNumbers } from '../utils/parsingUtils';

const RootLocusInput = ({ onAnalyze }) => {
  const [zeros, setZeros] = useState('');
  const [poles, setPoles] = useState('0, -1, -2'); // Default example
  const [error, setError] = useState(null);

  const handleAnalyze = () => {
    setError(null);
    try {
      const parsedZeros = parseComplexNumbers(zeros);
      const parsedPoles = parseComplexNumbers(poles);

      if (parsedPoles.length === 0) {
        setError('必须至少输入一个极点。');
        return;
      }

      if (onAnalyze) {
        onAnalyze(parsedZeros, parsedPoles);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="input-card">
      <div>
        <label htmlFor="zeros">开环零点 (逗号分隔, e.g., -1, -2+3j):</label>
        <input
          id="zeros"
          type="text"
          value={zeros}
          onChange={(e) => setZeros(e.target.value)}
          className="input-field"
          placeholder="例如: -3 (可留空)"
        />
      </div>
      <div>
        <label htmlFor="poles">开环极点 (逗号分隔, e.g., 0, -1, -2-3j):</label>
        <input
          id="poles"
          type="text"
          value={poles}
          onChange={(e) => setPoles(e.target.value)}
          className="input-field"
          placeholder="例如: 0, -1, -2"
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <Button onClick={handleAnalyze}>绘制根轨迹</Button>
    </div>
  );
};

export default RootLocusInput;
