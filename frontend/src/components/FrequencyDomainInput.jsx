// frontend/src/components/FrequencyDomainInput.jsx

import React, { useState } from 'react';
import Button from './Button';
import { parseComplexNumbers } from '../utils/parsingUtils';

const FrequencyDomainInput = ({ onAnalyze }) => {
  const [zeros, setZeros] = useState('');
  const [poles, setPoles] = useState('0, -1, -2'); // Default example
  const [gain, setGain] = useState('1.0'); // Add state for gain K
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

      // Validate gain input
      const parsedGain = parseFloat(gain);
      if (isNaN(parsedGain)) {
        setError('增益 K 必须是有效的数字。');
        return;
      }

      if (onAnalyze) {
        onAnalyze(parsedZeros, parsedPoles, gain);
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
      <div>
        <label htmlFor="gain">开环增益 K:</label>
        <input
          id="gain"
          type="text"
          value={gain}
          onChange={(e) => setGain(e.target.value)}
          className="input-field"
          placeholder="例如: 1.0"
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <Button onClick={handleAnalyze}>绘制Bode图和Nyquist图</Button>
    </div>
  );
};

export default FrequencyDomainInput;