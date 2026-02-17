import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import Complex from 'complex.js'; // 引入 complex.js 库来处理复数

// Chart.js 相关的导入
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LogarithmicScale,
  ScatterController, // 确保导入 ScatterController
} from 'chart.js';




// API function to call our new endpoint
const analyzeFrequencyDomainAPI = async (zeros, poles) => {
  // 如果前端和后端在同一服务器上（例如 Vite + FastAPI），使用相对路径
  // 如果不在（例如 React App on 3000, FastAPI on 8000），请使用完整URL，例如:
  // const response = await fetch('http://localhost:8000/analyze_frequency_domain', {
  const response = await fetch('/analyze_frequency_domain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // 发送零极点数据，这是后端根轨迹分析端点期望的格式
    body: JSON.stringify({ zeros, poles, gain: 1.0 }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || '后端分析失败');
  }

  return await response.json();
};


/**
 * 将多项式系数数组 (从s的最高次幂到最低次幂) 转换为零极点形式。
 * @param {number[]} coeffs - 系数数组, e.g., [1, 3, 2] for s^2 + 3s + 2
 * @returns {{zeros: Array<{real: number, imag: number}>, poles: Array<{real: number, imag: number}>}}
 */
const _coeffs_to_zeros_poles = (numCoeffs, denCoeffs) => {
  // 处理空输入或全零输入
  const isZeroArray = (arr) => arr.length === 0 || (arr.length === 1 && arr[0] === 0);

  // 计算零点
  let zeros;
  if (isZeroArray(numCoeffs)) {
    zeros = [{ real: 0, imag: 0 }]; // 多项式是0，唯一的根是0
  } else {
    // np.poly 的逆操作就是求根
    const numpyPolyRoots = require('numpy-poly-root'); // 需要安装 npm install numpy-poly-root
    zeros = numpyPolyRoots(numCoeffs).map(z => ({ real: z.re, imag: z.im }));
  }

  // 计算极点
  if (isZeroArray(denCoeffs)) {
    throw new Error("分母多项式不能为零！");
  }
  const numpyPolyRoots = require('numpy-poly-root');
  const poles = numpyPolyRoots(denCoeffs).map(p => ({ real: p.re, imag: p.im }));
  
  return { zeros, poles };
};


const FrequencyAnalysis = () => {
  const [numCoeffs, setNumCoeffs] = useState('1');
  const [denCoeffs, setDenCoeffs] = useState('1, 3, 2'); // D(s) = s^2 + 3s + 2
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);
    setIsLoading(true);

    try {
      // 解析并验证用户输入
      const parseCoeffs = (str) => {
         if (!str.trim()) return [1]; // 如果为空，默认为 [1]
         return str.split(',')
           .map(s => parseFloat(s.trim()))
           .filter(n => !isNaN(n)); // 过滤掉无效输入，如 "1, a, 2" -> [1, 2]
      };

      const num = parseCoeffs(numCoeffs);
      const den = parseCoeffs(denCoeffs);
      
      if (den.length === 0) {
          throw new Error("分母系数不能全部无效。");
      }

      // 转换为零极点形式
      const { zeros, poles } = _coeffs_to_zeros_poles(num, den);

      // 调用后端 API
      const apiResult = await analyzeFrequencyDomainAPI(zeros, poles);
      setResult(apiResult);

    } catch (e) {
      console.error("Analysis Error:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="analysis-section">
      <h3>频域与根轨迹分析</h3>
      <p>
        输入传递函数的分子和分母系数 (从 s 的<strong>最高次幂</strong>到<strong>最低次幂</strong>)，然后点击分析。
      </p>
      
      {/* Input Section */}
      <div className="input-card">
        <div>
          <label htmlFor="numerator">分子系数 (Num):</label>
          <input
            id="numerator"
            type="text"
            value={numCoeffs}
            onChange={(e) => setNumCoeffs(e.target.value)}
            className="input-field"
            placeholder="例如: 1, 2, 3"
          />
        </div>
        <div>
          <label htmlFor="denominator">分母系数 (Den):</label>
          <input
            id="denominator"
            type="text"
            value={denCoeffs}
            onChange={(e) => setDenCoeffs(e.target.value)}
            className="input-field"
            placeholder="例如: 1, 3, 2 (代表 s^2 + 3s + 2)"
          />
        </div>
        <button onClick={handleAnalyze} disabled={isLoading}>
          {isLoading ? '正在计算...' : '开始分析'}
        </button>
      </div>

      {/* Error Display */}
      {error && <div className="error-message" style={{ marginTop: '15px', color: 'red' }}>错误: {error}</div>}

      {/* Result Display */}
      {result && (
        <div className="result-card" style={{ marginTop: '20px' }}>
          
          {/* Metrics Summary */}
          <div className="metrics-summary" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h4 style={{ marginTop: 0 }}>关键稳定性指标</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                 <div><strong>直流增益:</strong> {result.dc_gain?.toFixed(4) || 'N/A'}</div>
                 <div><strong>增益裕度:</strong> {result.stability_margins?.gain_margin_db !== null ? `${result.stability_margins.gain_margin_db.toFixed(2)} dB` : '无穷大'}</div>
                 <div><strong>相角裕度:</strong> {result.stability_margins?.phase_margin_deg !== null ? `${result.stability_margins.phase_margin_deg.toFixed(2)}°` : '未定义'}</div>
                 <div><strong>增益穿越频率:</strong> {result.stability_margins?.gain_crossover_freq_rad_s !== null ? `${result.stability_margins.gain_crossover_freq_rad_s.toFixed(4)} rad/s` : 'N/A'}</div>
                 {result.nyquist?.asymptote && result.nyquist.asymptote.type === 'vertical_line' && (
                   <div><strong>奈奎斯特渐近线 (x轴截距):</strong> {result.nyquist.asymptote.value.toFixed(4)}</div>
                 )}
            </div>
          </div>

          {/* Bode Magnitude Plot */}
          <h4>Bode 幅值图</h4>
           <div style={{ height: '400px', position: 'relative' }}>
            <Line
              data={{
                datasets: [{
                  label: '幅值 (dB)',
                  data: result.bode?.omega.map((x, i) => ({ x: x, y: result.bode.magnitude_db[i] })) || [],
                  borderColor: 'rgb(75, 192, 192)',
                  pointRadius: 0,
                }]
              }}
              options={{
                 responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: '幅值 vs. 频率' } },
                scales: {
                  x: { type: 'logarithmic', title: { display: true, text: '频率 (rad/s)' } },
                  y: { title: { display: true, text: '幅值 (dB)' } },
                }
              }}
            />
          </div>

          {/* Bode Phase Plot */}
          <h4 style={{ marginTop: '30px' }}>Bode 相角图</h4>
          <div style={{ height: '400px', position: 'relative' }}>
            <Line
              data={{
                datasets: [{
                  label: '相角 (deg)',
                  data: result.bode?.omega.map((x, i) => ({ x: x, y: result.bode.phase_deg[i] })) || [],
                  borderColor: 'rgb(255, 99, 132)',
                  pointRadius: 0,
                }]
              }}
              options={{
                 responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: '相角 vs. 频率' } },
                scales: {
                  x: { type: 'logarithmic', title: { display: true, text: '频率 (rad/s)' } },
                  y: { title: { display: true, text: '相角 (deg)' } },
                }
              }}
            />
          </div>
          
          {/* Root Locus Plot */}
          <h4 style={{ marginTop: '30px' }}>根轨迹图</h4>
          <div style={{ height: '500px', position: 'relative' }}>
            <Scatter
              data={{
                datasets: [
                  {
                    label: '根轨迹',
                    data: result.root_locus?.real.map((val, i) => ({ x: val, y: result.root_locus.imag[i] })) || [],
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    pointRadius: 2,
                  },
                  {
                    label: '开环极点',
                    data: result.poles?.map(p => ({ x: p.real, y: p.imag })) || [],
                    backgroundColor: 'red',
                    pointRadius: 7,
                    pointStyle: 'crossRot',
                  },
                  {
                    label: '开环零点',
                    data: result.zeros?.map(z => ({ x: z.real, y: z.imag })) || [],
                    backgroundColor: 'green',
                    pointRadius: 7,
                    pointStyle: 'star',
                  },
                ]
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: '系统根轨迹' } },
                scales: {
                  x: { type: 'linear', title: { display: true, text: '实部' }, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                  y: { type: 'linear', title: { display: true, text: '虚部' }, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                }
              }}
            />
          </div>
          


        </div>
      )}
    </div>
  );
};

export default FrequencyAnalysis;
