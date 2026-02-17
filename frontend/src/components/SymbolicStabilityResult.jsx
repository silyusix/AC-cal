// frontend/src/components/SymbolicStabilityResult.jsx

import React from 'react';

const SymbolicStabilityResult = ({ result }) => {
  if (!result) {
    return (
      <div className="result-card">
        <h3>劳斯稳定性分析结果</h3>
        <p>暂无结果</p>
      </div>
    );
  }

  return (
    <div className="result-card">
      <h3>劳斯稳定性分析结果</h3>
      {result.message && <p>{result.message}</p>}
      {result.stability_range && (
        <p>系统稳定性: <strong>{result.stability_range}</strong></p>
      )}
    </div>
  );
};

export default SymbolicStabilityResult;
