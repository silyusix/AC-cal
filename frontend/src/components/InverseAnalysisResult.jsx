// frontend/src/components/InverseAnalysisResult.jsx

import React from 'react';

const InverseAnalysisResult = ({ result }) => {
  if (!result) {
    return (
      <div className="result-card">
        <h3>反向分析结果</h3>
        <p>暂无结果</p>
      </div>
    );
  }

  return (
    <div className="result-card">
      <h3>反向分析结果</h3>
      {result.message && <p className="error-message">{result.message}</p>}
      {result.damping_ratio !== null && (
        <p><strong>阻尼比 (ζ):</strong> {result.damping_ratio.toFixed(3)}</p>
      )}
      {result.natural_frequency !== null && (
        <p><strong>无阻尼自振频率 (ωn):</strong> {result.natural_frequency.toFixed(3)}</p>
      )}
      {(result.damping_ratio === null && result.natural_frequency === null && !result.message) && (
        <p>无法计算阻尼比和无阻尼自振频率，请检查输入。</p>
      )}
    </div>
  );
};

export default InverseAnalysisResult;