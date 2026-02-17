// frontend/src/components/SymbolicStabilityInput.jsx

import React, { useState } from 'react';
import Button from './Button';

const SymbolicStabilityInput = ({ onAnalyze }) => {
  const [coeffs, setCoeffs] = useState('');
  const [error, setError] = useState(null);

  const handleAnalyze = () => {
    setError(null);
    const coeffStrings = coeffs.split(',').map(s => s.trim()).filter(s => s !== '');

    if (coeffStrings.length === 0) {
      setError('请输入特征方程的系数。');
      return;
    }

    const validChars = /^[0-9x\s.,+\-*\/()]*$/;
    if (!validChars.test(coeffs)) {
        setError('系数中包含无效字符。');
        return;
    }

    if (onAnalyze) {
      onAnalyze(coeffStrings);
    }
  };

  return (
    <div className="input-card">
      <div>
        <label htmlFor="coeffs">特征方程系数 (逗号分隔, 可包含 'x'):</label>
        <input
          id="coeffs"
          type="text"
          value={coeffs}
          onChange={(e) => setCoeffs(e.target.value)}
          className="input-field"
          placeholder="例如: 1, 2, x, 4"
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <Button onClick={handleAnalyze}>分析稳定范围</Button>
    </div>
  );
};

export default SymbolicStabilityInput;