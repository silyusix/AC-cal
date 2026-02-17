// frontend/src/components/ControlSystemAnalysis.jsx

import React from 'react';

const ControlSystemAnalysis = ({ analysisResult }) => {
  if (!analysisResult) {
    return (
      <div className="result-card">
        <h3>控制系统分析结果</h3>
        <p>暂无分析结果</p>
      </div>
    );
  }

  const { metrics, stability } = analysisResult;

  return (
    <div className="result-card">
      <h3>控制系统分析结果</h3>
      <div className="result-section">
        <h4>稳定性分析</h4>
        <p>系统稳定性: <strong>{stability.status}</strong></p>
        <p>极点: {stability.poles.join(', ')}</p>
      </div>
      <div className="result-section">
        <h4>时域响应指标</h4>
        {metrics ? (
          <ul>
            <li><strong>上升时间:</strong> {metrics.rise_time} s</li>
            <li><strong>峰值时间:</strong> {metrics.peak_time} s</li>
            <li><strong>最大超调量:</strong> {metrics.max_overshoot} %</li>
            <li><strong>调节时间 (2%):</strong> {metrics.settling_time_2_percent} s</li>
            <li><strong>调节时间 (5%):</strong> {metrics.settling_time_5_percent} s</li>
          </ul>
        ) : (
          <p>无时域指标数据。</p>
        )}
      </div>
    </div>
  );
};

export default ControlSystemAnalysis;