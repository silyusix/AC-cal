import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Card, Row, Col, Typography, Spin, Alert, Descriptions } from 'antd';
import { designLeadCompensator } from '../services/api'; // Ensure this line is present
import Plotly from 'plotly.js';

const { Title, Text, Paragraph } = Typography;

// --- Helper Components & Functions ---

// A simple MathJax component to render LaTeX.
// This component relies on MathJax being loaded and available on the window object.
const MathJax = ({ children }) => {
  const ref = useRef();
  useEffect(() => {
    if (window.MathJax && ref.current && children) {
      // Clear previous typesetting before applying new typesetting
      window.MathJax.typesetClear([ref.current]);
      window.MathJax.typesetPromise([ref.current]);
    }
  }, [children]); // Re-run when LaTeX content changes
  return <div ref={ref}>{children}</div>;
};

// Helper function to filter out null/undefined values from arrays before plotting.
// Prevents Plotly from breaking when encountering null data points.
const filterNoneValues = (arr) => (arr || []).filter(val => val != null);

// --- Main React Component ---

const LeadCompensation = () => {
  // --- State for User Inputs ---
  const [numerator, setNumerator] = useState('10'); // Default numerator
  const [denominator, setDenominator] = useState('1,3,2'); // Default denominator for (s+1)(s+2)
  const [desiredPM, setDesiredPM] = useState('60'); // Default desired phase margin

  // --- State for API Call and Results ---
  const [result, setResult] = useState(null); // Stores the full API response
  const [loading, setLoading] = useState(false); // Loading state for the button
  const [error, setError] = useState(null); // Stores any error messages

  // --- Refs for Plotly Chart Containers ---
  const bodeMagPlotRef = useRef(null);
  const bodePhasePlotRef = useRef(null);
  const stepPlotRef = useRef(null);

  // --- Handler for "Start Design" Button ---
  const handleDesign = async () => {
    setLoading(true);
    setError(null);
    setResult(null); // Clear previous results

    // Clear previous plots
    if (bodeMagPlotRef.current) Plotly.purge(bodeMagPlotRef.current);
    if (bodePhasePlotRef.current) Plotly.purge(bodePhasePlotRef.current);
    if (stepPlotRef.current) Plotly.purge(stepPlotRef.current);

    try {
      // Parse user input strings into arrays of numbers
      const num_coeffs = numerator.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      const den_coeffs = denominator.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      const pm = parseFloat(desiredPM);

      // Basic validation
      if (num_coeffs.length === 0 || den_coeffs.length === 0 || isNaN(pm)) {
        throw new Error('请输入有效的传递函数系数和期望的相角裕度。');
      }

      // Call the API service function
      const response = await designLeadCompensator({
        numerator: num_coeffs,
        denominator: den_coeffs,
        desired_phase_margin: pm,
      });
      setResult(response); // Store the successful response

    } catch (err) {
      // Catch and display errors from API call or validation
      setError(err.message || '设计过程中发生未知错误。');
    } finally {
      // Reset loading state
      setLoading(false);
    }
  };

  // --- useEffect for Plotting Data ---
  // This hook runs whenever the 'result' state changes, to update the plots.
  useEffect(() => {
    if (result?.plots && result?.performance) { // Check if result and its plots/performance properties exist
      const { performance } = result;
      const { bode, step_response } = result.plots;

      if (!bode || !performance) {
        console.warn("Bode or performance data is missing from the result.");
        return;
      }

      // --- 1. Prepare Annotations for Plotly ---
      const bodeAnnotations = [];

      // Annotations for Uncompensated System
      if (performance.before) {
        if (performance.before.gain_crossover_freq) {
          bodeAnnotations.push({
            x: performance.before.gain_crossover_freq, y: 0, xref: 'x', yref: 'y',
            text: `<b>ωg_orig: ${performance.before.gain_crossover_freq.toFixed(2)}</b>`,
            showarrow: true, arrowhead: 0, ax: 0, ay: -30,
            font: { color: 'blue', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
          });
          bodeAnnotations.push({
            x: performance.before.gain_crossover_freq,
            y: (performance.before.phase_margin ?? 0) - 180, // Handles null/undefined
            xref: 'x', yref: 'y2',
            text: `<b>PM_orig: ${(performance.before.phase_margin?.toFixed(2) ?? 'N/A')}°</b>`,
            showarrow: true, arrowhead: 0, ax: 0, ay: 30,
            font: { color: 'red', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
          });
        }
        if (performance.before.phase_crossover_freq && performance.before.gain_margin_db != null) {
          bodeAnnotations.push({
            x: performance.before.phase_crossover_freq, y: performance.before.gain_margin_db,
            xref: 'x', yref: 'y',
            text: `<b>GM_orig: ${performance.before.gain_margin_db.toFixed(2)}dB</b>`,
            showarrow: true, arrowhead: 0, ax: 0, ay: -30,
            font: { color: 'blue', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
          });
        }
      }

      // Annotations for Compensated System
      if (performance.after) {
        if (performance.after.gain_crossover_freq) {
          bodeAnnotations.push({
            x: performance.after.gain_crossover_freq, y: 0, xref: 'x', yref: 'y',
            text: `<b>ωg_comp: ${performance.after.gain_crossover_freq.toFixed(2)}</b>`,
            showarrow: true, arrowhead: 0, ax: 0, ay: -60,
            font: { color: 'darkgreen', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
          });
          bodeAnnotations.push({
            x: performance.after.gain_crossover_freq,
            y: (performance.after.phase_margin ?? 0) - 180,
            xref: 'x', yref: 'y2',
            text: `<b>PM_comp: ${(performance.after.phase_margin?.toFixed(2) ?? 'N/A')}°</b>`,
            showarrow: true, arrowhead: 0, ax: 0, ay: 60,
            font: { color: 'purple', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
          });
        }
        if (performance.after.phase_crossover_freq && performance.after.gain_margin_db != null) {
          bodeAnnotations.push({
            x: performance.after.phase_crossover_freq, y: performance.after.gain_margin_db,
            xref: 'x', yref: 'y',
            text: `<b>GM_comp: ${performance.after.gain_margin_db.toFixed(2)}dB</b>`,
            showarrow: true, arrowhead: 0, ax: 0, ay: -60,
            font: { color: 'darkgreen', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
          });
        }
      }

      // --- 2. Render Bode Magnitude Plot ---
      if (bodeMagPlotRef.current) {
        const traces = [
          { x: filterNoneValues(bode.omega), y: filterNoneValues(bode.uncompensated_mag_db), type: 'scatter', mode: 'lines', name: '原始系统', line: { color: 'blue', dash: 'dash' } },
          { x: filterNoneValues(bode.omega), y: filterNoneValues(bode.compensated_mag_db), type: 'scatter', mode: 'lines', name: '校正后系统', line: { color: 'blue' } },
        ];
        const layout = {
          title: '幅频特性对比', xaxis: { title: '频率 (rad/s)', type: 'log' },
          yaxis: { title: '幅值 (dB)' }, showlegend: true, height: 300,
          annotations: bodeAnnotations.filter(ann => ann.yref === 'y'), // Filter annotations for this y-axis
        };
        Plotly.newPlot(bodeMagPlotRef.current, traces, layout, { responsive: true });
      }

      // --- 3. Render Bode Phase Plot ---
      if (bodePhasePlotRef.current) {
        const getPhaseTicks = (phaseData) => {
          const safePhaseData = filterNoneValues(phaseData);
          if (safePhaseData.length === 0) return [-180, -90, 0];
          const minPhase = Math.min(...safePhaseData);
          const maxPhase = Math.max(...safePhaseData);
          const start = Math.floor(minPhase / 45) * 45;
          const end = Math.ceil(maxPhase / 45) * 45;
          return Array.from({ length: Math.floor((end - start) / 45) + 1 }, (_, i) => start + i * 45);
        };

        const traces = [
          { x: filterNoneValues(bode.omega), y: filterNoneValues(bode.uncompensated_phase_deg), type: 'scatter', mode: 'lines', name: '原始系统', line: { color: 'red', dash: 'dash' } },
          { x: filterNoneValues(bode.omega), y: filterNoneValues(bode.compensated_phase_deg), type: 'scatter', mode: 'lines', name: '校正后系统', line: { color: 'red' } },
        ];
        const combinedPhaseData = filterNoneValues(bode.uncompensated_phase_deg).concat(filterNoneValues(bode.compensated_phase_deg));

        const layout = {
          title: '相频特性对比', xaxis: { title: '频率 (rad/s)', type: 'log' },
          yaxis: {
            title: '相角 (°)', tickmode: 'array',
            tickvals: getPhaseTicks(combinedPhaseData),
          }, showlegend: true, height: 300,
          annotations: bodeAnnotations.filter(ann => ann.yref === 'y2'), // Filter for this y-axis
        };
        Plotly.newPlot(bodePhasePlotRef.current, traces, layout, { responsive: true });
      }

      // --- 4. Render Step Response Plot ---
      if (stepPlotRef.current) {
        const traces = [
          { x: filterNoneValues(step_response.uncompensated_time), y: filterNoneValues(step_response.uncompensated_response), type: 'scatter', mode: 'lines', name: '原始系统', line: { dash: 'dash' } },
          { x: filterNoneValues(step_response.compensated_time), y: filterNoneValues(step_response.compensated_response), type: 'scatter', mode: 'lines', name: '校正后系统' },
        ];
                const layout = { title: '闭环阶跃响应对比', xaxis: { title: '时间 (s)' }, yaxis: { title: '幅值' }, legend: { x: 0.1, y: 1.2, orientation: 'h' }, height: 300, };
        Plotly.newPlot(stepPlotRef.current, traces, layout, { responsive: true });
      }
    }
  }, [result]); // Re-run effect whenever 'result' changes

  // --- JSX Render ---
  return (
    <Card title={<Title level={4}>超前校正设计</Title>} variant="borderless">
      <Row gutter={[16, 24]}>
        {/* Left Column: User Inputs */}
        <Col xs={24} lg={8}>
          <Title level={5}>1. 输入系统和目标</Title>
          <Paragraph>输入原始开环传递函数 G(s)H(s) 的系数和期望达到的相角裕度。</Paragraph>

          <Input addonBefore="G(s)H(s) 分子" placeholder="例如: 10" value={numerator} onChange={e => setNumerator(e.target.value)} />
          <Input addonBefore="G(s)H(s) 分母" placeholder="例如: 1,3,2" value={denominator} onChange={e => setDenominator(e.target.value)} style={{ marginTop: '10px' }} />
          <Input addonBefore="期望相角裕度 (°)" placeholder="例如: 60" value={desiredPM} onChange={e => setDesiredPM(e.target.value)} style={{ marginTop: '10px' }} />

          <Button type="primary" onClick={handleDesign} loading={loading} style={{ marginTop: '20px', width: '100%' }}>
            开始设计
          </Button>
        </Col>

        {/* Right Column: Results and Plots */}
        <Col xs={24} lg={16}>
          <Title level={5}>2. 查看设计结果</Title>

          <Spin spinning={loading} tip="正在计算..." size="large">
            {error && <Alert message="设计出错" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}

            {result && (
              <Row gutter={[16, 16]}>
                {/* Performance Metrics Card */}
                <Col span={24}>
                  <Card type="inner" title="性能指标对比" style={{ marginBottom: '10px' }}>
                  <Descriptions bordered column={2} size="small">
                      {Object.entries({
                        '原始相角裕度': result.performance.before.phase_margin,
                        '校正后相角裕度': result.performance.after.phase_margin,
                        '原始增益裕度': result.performance.before.gain_margin_db,
                        '校正后增益裕度': result.performance.after.gain_margin_db,
                        '原始剪切频率': result.performance.before.gain_crossover_freq,
                        '校正后剪切频率': result.performance.after.gain_crossover_freq,
                        '原始相角穿越频率': result.performance.before.phase_crossover_freq,
                        '校正后相角穿越频率': result.performance.after.phase_crossover_freq,
                      }).map(([label, value]) => (
                        <Descriptions.Item key={label} label={label}>
                          {(value != null ? value.toFixed(2) : 'N/A') + (label.includes('裕度') ? '°' : label.includes('频率') ? ' rad/s' : '')}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  </Card>
                </Col>

                {/* Compensator Details Card */}
                <Col span={24}>
                  <Card type="inner" title="设计的超前校正装置 Gc(s)" style={{ marginBottom: '10px' }}>
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="传递函数">
                        <MathJax>
                          {`$$ G_c(s) = \\frac{s + ${result.compensator.zero.toFixed(3)}}{s + ${result.compensator.pole.toFixed(3)}} $$`}
                        </MathJax>
                      </Descriptions.Item>
                      <Descriptions.Item label="零点">{result.compensator.zero.toFixed(3)}</Descriptions.Item>
                      <Descriptions.Item label="极点">{result.compensator.pole.toFixed(3)}</Descriptions.Item>
                      <Descriptions.Item label="alpha">{result.compensator.alpha.toFixed(3)}</Descriptions.Item>
                      <Descriptions.Item label="omega_m">{result.compensator.omega_m.toFixed(3)} rad/s</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>

                {/* Plots Container */}
                <Col xs={24} xl={24}>
                  <div ref={bodeMagPlotRef}></div>
                </Col>
                <Col xs={24} xl={24}>
                  <div ref={bodePhasePlotRef}></div>
                </Col>
                <Col xs={24} xl={24} style={{ marginTop: '20px' }}>
                  <div ref={stepPlotRef}></div>
                </Col>
              </Row>
            )}
          </Spin>
        </Col>
      </Row>
    </Card>
  );
};

export default LeadCompensation;
