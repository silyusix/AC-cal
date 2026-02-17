// frontend/src/components/FrequencyDomainResult.jsx

import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js/dist/plotly-cartesian.min.js';

const FrequencyDomainResult = ({ result }) => {
  const bodeMagPlotRef = useRef(null);
  const bodePhasePlotRef = useRef(null);
  const nyquistPlotRef = useRef(null);

  useEffect(() => {
    if (result && bodeMagPlotRef.current && bodePhasePlotRef.current && nyquistPlotRef.current) {
      const { bode, nyquist } = result;

      // Helper to filter out null/None values
      const filterNoneValues = (arr) => (arr || []).filter(val => val !== null);

      // --- Create Annotations for Corner Frequencies ---
      const cornerFrequencies = bode.corner_frequencies;
      const cornerAnnotations = [];
      if (cornerFrequencies && cornerFrequencies.length > 0) {
        cornerFrequencies.forEach(freq => {
          cornerAnnotations.push({
            x: Math.log10(freq),
            y: 0,
            yref: 'paper',
            yanchor: 'top',
            showarrow: true,
            arrowhead: 0,
            ax: 0,
            ay: -25,
            text: `<b>${freq.toFixed(2)}</b>`,
            font: { color: 'red', size: 10 },
            align: 'center'
          });
        });
      }

      // Bode Magnitude Plot
      const bodeMagnitudeTrace = {
        x: filterNoneValues(bode.omega),
        y: filterNoneValues(bode.magnitude_db),
        mode: 'lines',
        type: 'scatter',
        name: '幅值 (dB)'
      };
      const bodeAsymptoteTrace = {
        x: filterNoneValues(bode.asymptote_omega),
        y: filterNoneValues(bode.asymptote_magnitude_db),
        mode: 'lines',
        type: 'scatter',
        name: '渐近线 (dB)',
        line: { dash: 'dashdot', color: 'rgb(255, 165, 0)' } // Orange dashed line
      };
      const bodeMagLayout = {
        xaxis: { title: '频率 (rad/s)', type: 'log', range: [-2, 2], showticklabels: true, ticks: 'outside' },
        yaxis: { title: '幅值 (dB)', tickmode: 'auto', nticks: 10 },
        annotations: cornerAnnotations,
        showlegend: true
      };
      Plotly.newPlot(bodeMagPlotRef.current, [bodeMagnitudeTrace, bodeAsymptoteTrace], bodeMagLayout);

      // Bode Phase Plot
      const bodePhaseTrace = {
        x: filterNoneValues(bode.omega),
        y: filterNoneValues(bode.phase_deg),
        mode: 'lines',
        type: 'scatter',
        name: 'Phase (deg)',
        marker: { color: 'rgb(255, 99, 132)' }
      };
      const bodePhaseLayout = {
        title: 'Bode图 - 相频特性',
        xaxis: { title: '频率 (rad/s)', type: 'log', range: [-2, 2], showticklabels: true, ticks: 'outside' },
        yaxis: {
          title: '相角 (deg)',
          tickmode: 'array',
          tickvals: (() => {
            const phaseData = filterNoneValues(bode.phase_deg);
            if (phaseData.length === 0) return [-90, 0];
            const minPhase = Math.min(...phaseData);
            const maxPhase = Math.max(...phaseData);
            const start = Math.floor(minPhase / 45) * 45;
            const end = Math.ceil(maxPhase / 45) * 45;
            const ticks = [];
            for (let i = start; i <= end; i += 45) {
              ticks.push(i);
            }
            return ticks;
          })(),
        },
        annotations: cornerAnnotations
      };
      Plotly.newPlot(bodePhasePlotRef.current, [bodePhaseTrace], bodePhaseLayout);

      // --- Smart Scaling for Nyquist Plot ---
      const getSensibleRange = (data, ensureVisible = []) => {
        if (!data || data.length < 20) return [null, null];
        
        const validData = data.filter(d => d !== null && isFinite(d));
        if (validData.length < 20) return [null, null];

        const sorted = [...validData].sort((a, b) => a - b);
        let min = sorted[Math.floor(sorted.length * 0.05)];
        let max = sorted[Math.floor(sorted.length * 0.95)];

        ensureVisible.forEach(p => {
          if (p < min) min = p;
          if (p > max) max = p;
        });

        const padding = (max - min) * 0.1;
        return [min - padding, max + padding];
      };

      const xRange = getSensibleRange(nyquist.real, [-1]);
      const yRange = getSensibleRange(nyquist.imag, [0]);

      // Nyquist Plot
      const nyquistTrace = {
        x: filterNoneValues(nyquist.real),
        y: filterNoneValues(nyquist.imag),
        mode: 'lines',
        type: 'scatter',
        name: 'Nyquist Path'
      };
      const nyquistLayout = {
        title: 'Nyquist图 (极坐标图)',
        xaxis: { title: '实部', range: xRange },
        yaxis: { title: '虚部', scaleanchor: "x", scaleratio: 1, range: yRange },
        showlegend: true,
        shapes: [
          {
            type: 'path',
            path: 'M -1.1 -0.1 L -0.9 0.1 M -0.9 -0.1 L -1.1 0.1',
            line: { color: 'red', width: 2 },
            xref: 'x',
            yref: 'y'
          }
        ]
      };

      if (nyquist.asymptote && nyquist.asymptote.type === 'vertical_line') {
        nyquistLayout.shapes.push({
          type: 'line',
          x0: nyquist.asymptote.value,
          y0: yRange[0] !== null ? yRange[0] : -10,
          x1: nyquist.asymptote.value,
          y1: yRange[1] !== null ? yRange[1] : 10,
          line: {
            color: 'grey',
            width: 2,
            dash: 'dashdot'
          }
        });
      }

      Plotly.newPlot(nyquistPlotRef.current, [nyquistTrace], nyquistLayout);
    }
  }, [result]);

  if (!result) {
    return (
      <div className="result-card">
        <h3>频域分析结果</h3>
        <p>输入零极点后点击“绘制Bode图和Nyquist图”以查看结果。</p>
      </div>
    );
  }

  return (
    <div className="result-card">
      <h3>频域分析结果</h3>
      
      {/* Key Metrics Display */}
      <div className="metrics-summary" style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
        <h5 style={{ marginTop: '0' }}>关键指标</h5>
        <ul>
          <li>
            <strong>增益裕度 (GM):</strong> 
            {result.stability_margins.gain_margin_db !== null ? `${result.stability_margins.gain_margin_db.toFixed(2)} dB` : '无穷大'}
          </li>
          <li>
            <strong>相角裕度 (PM):</strong> 
            {result.stability_margins.phase_margin_deg !== null ? `${result.stability_margins.phase_margin_deg.toFixed(2)} deg` : '未定义'}
          </li>
          {result.nyquist?.asymptote && result.nyquist.asymptote.type === 'vertical_line' && (
            <li>
              <strong>奈奎斯特渐近线 (x轴截距):</strong> 
              {result.nyquist.asymptote.value.toFixed(4)}
            </li>
          )}
        </ul>
      </div>

      <div ref={bodeMagPlotRef}></div>
      <div ref={bodePhasePlotRef} style={{ marginTop: '20px' }}></div>
      <div ref={nyquistPlotRef} style={{ marginTop: '20px' }}></div>
    </div>
  );
};

export default FrequencyDomainResult;
