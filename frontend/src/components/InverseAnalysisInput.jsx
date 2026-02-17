// frontend/src/components/InverseAnalysisInput.jsx

import React, { useState } from 'react';
import Button from './Button';

const InverseAnalysisInput = ({ onAnalyze }) => {
  const [riseTime, setRiseTime] = useState('');
  const [peakTime, setPeakTime] = useState('');
  const [maxOvershoot, setMaxOvershoot] = useState('');
  const [settlingTime, setSettlingTime] = useState('');
  const [error, setError] = useState(null);

  const handleAnalyze = () => {
    setError(null);
    const metrics = {};
    if (riseTime) metrics.rise_time = parseFloat(riseTime);
    if (peakTime) metrics.peak_time = parseFloat(peakTime);
    if (maxOvershoot) metrics.max_overshoot = parseFloat(maxOvershoot);
    if (settlingTime) metrics.settling_time = parseFloat(settlingTime);

    if (Object.keys(metrics).length === 0) {
      setError('请至少输入一个时域指标。');
      return;
    }

    if (onAnalyze) {
      onAnalyze(metrics);
    }
  };

  return (
    <div className="input-card">
      <div>
        <label htmlFor="riseTime">上升时间 (Tr):</label>
        <input
          id="riseTime"
          type="number"
          value={riseTime}
          onChange={(e) => setRiseTime(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label htmlFor="peakTime">峰值时间 (Tp):</label>
        <input
          id="peakTime"
          type="number"
          value={peakTime}
          onChange={(e) => setPeakTime(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label htmlFor="maxOvershoot">最大超调量 (Mp, %):</label>
        <input
          id="maxOvershoot"
          type="number"
          value={maxOvershoot}
          onChange={(e) => setMaxOvershoot(e.target.value)}
          className="input-field"
        />
      </div>
      <div>
        <label htmlFor="settlingTime">调节时间 (Ts, 2%):</label>
        <input
          id="settlingTime"
          type="number"
          value={settlingTime}
          onChange={(e) => setSettlingTime(e.target.value)}
          className="input-field"
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      <Button onClick={handleAnalyze}>反向分析</Button>
    </div>
  );
};

export default InverseAnalysisInput;