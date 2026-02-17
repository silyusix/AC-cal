import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Card, Row, Col, Typography, Spin, Alert, Descriptions } from 'antd';
import { designLagCompensator } from '../services/api';

// Assuming Plotly is imported and available in your project's build process
// If using a bundler like Webpack, it might handle this automatically.
import Plotly from 'plotly.js'; // Recommended import for modern setups

const { Title, Text, Paragraph } = Typography;

// Helper component to render LaTeX using MathJax.
// This component expects MathJax to be loaded on the window object.
const MathJax = ({ children }) => {
  const ref = useRef();
  useEffect(() => {
    if (window.MathJax && ref.current) {
      // Clear previous typesetting and apply typesetting to the new content
      window.MathJax.typesetClear([ref.current]);
      window.MathJax.typesetPromise([ref.current]);
    }
  }, [children]);
  return <div ref={ref}>{children}</div>;
};

// Helper to filter out null/undefined values from arrays before passing to Plotly.
const filterNoneValues = (arr) => (arr || []).filter(val => val != null);

// Main React Component for Lag Compensator Design UI
const LagCompensation = () => {
  // --- State for User Inputs ---
  const [numerator, setNumerator] = useState('10'); // e.g., "10"
  const [denominator, setDenominator] = useState('1,3,2,0'); // e.g., "1,3,2,0" for s(s+1)(s+2)
  const [desiredKv, setDesiredKv] = useState('10');

  // --- State for API Call and Results ---
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs for attaching Plotly charts
  const bodeMagPlotRef = useRef(null);
  const bodePhasePlotRef = useRef(null);
  const stepPlotRef = useRef(null);

  // --- Helper function for phase plot ticks ---
  const getPhaseTicks = (phaseData) => {
    const safePhaseData = filterNoneValues(phaseData);
    if (safePhaseData.length === 0) return [-180, -90, 0];
    const minPhase = Math.min(...safePhaseData);
    const maxPhase = Math.max(...safePhaseData);
    const start = Math.floor(minPhase / 45) * 45;
    const end = Math.ceil(maxPhase / 45) * 45;
    return Array.from({ length: Math.floor((end - start) / 45) + 1 }, (_, i) => start + i * 45);
  };


  // --- Handler for Design Button Click ---
  const handleDesign = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    // Clear previous plots
    if (bodeMagPlotRef.current) Plotly.purge(bodeMagPlotRef.current);
    if (bodePhasePlotRef.current) Plotly.purge(bodePhasePlotRef.current);
    if (stepPlotRef.current) Plotly.purge(stepPlotRef.current);

    try {
      const num_coeffs = numerator.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      const den_coeffs = denominator.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      const kv = parseFloat(desiredKv);

      if (num_coeffs.length === 0 || den_coeffs.length === 0 || isNaN(kv)) {
        throw new Error('请输入有效的传递函数系数和期望的Kv值。');
      }

      // Call the API service function
      const response = await designLagCompensator({
        numerator: num_coeffs,
        denominator: den_coeffs,
        desired_kv: kv,
      });
      setResult(response);

    } catch (err) {
      setError(err.message || '设计过程中发生未知错误。');
    } finally {
      setLoading(false);
    }
  };

  // --- Effect Hook for Plotting Results ---
  // This effect runs whenever the 'result' state changes.
  useEffect(() => {
    if (result?.plots && result?.performance) { // Destructure result and check if plots/performance exist
      const { performance } = result;
      const { bode, step_response } = result.plots;

      // --- 1. Prepare Annotations for Crossover Frequencies ---
      const bodeAnnotations = [];

      // Annotations for Uncompensated System
      if (performance.before && performance.before.gain_crossover_freq) {
        bodeAnnotations.push({
          x: performance.before.gain_crossover_freq, y: 0, xref: 'x', yref: 'y',
          text: `<b>ωg_orig: ${performance.before.gain_crossover_freq.toFixed(2)}</b>`,
          showarrow: true, arrowhead: 0, ax: 0, ay: -30,
          font: { color: 'blue', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
        });
        bodeAnnotations.push({
          x: performance.before.gain_crossover_freq,
          y: (performance.before.phase_margin ?? 0) - 180, // Use nullish coalescing
          xref: 'x', yref: 'y2',
          text: `<b>PM_orig: ${(performance.before.phase_margin?.toFixed(2) ?? 'N/A')}°</b>`,
          showarrow: true, arrowhead: 0, ax: 0, ay: 30,
          font: { color: 'red', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
        });
      }
      if (performance.before && performance.before.phase_crossover_freq && performance.before.gain_margin_db != null) {
        bodeAnnotations.push({
          x: performance.before.phase_crossover_freq, y: performance.before.gain_margin_db,
          xref: 'x', yref: 'y',
          text: `<b>GM_orig: ${performance.before.gain_margin_db.toFixed(2)}dB</b>`,
          showarrow: true, arrowhead: 0, ax: 0, ay: -30,
          font: { color: 'blue', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
        });
      }
      // Annotations for Compensated System
      if (performance.after && performance.after.gain_crossover_freq) {
        bodeAnnotations.push({
          x: performance.after.gain_crossover_freq, y: 0, xref: 'x', yref: 'y',
          text: `<b>ωg_comp: ${performance.after.gain_crossover_freq.toFixed(2)}</b>`,
          showarrow: true, arrowhead: 0, ax: 0, ay: -60,
          font: { color: 'darkgreen', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
        });
        bodeAnnotations.push({
          x: performance.after.gain_crossover_freq,
          y: (performance.after.phase_margin ?? 0) - 180, // Use nullish coalescing
          xref: 'x', yref: 'y2',
          text: `<b>PM_comp: ${(performance.after.phase_margin?.toFixed(2) ?? 'N/A')}°</b>`,
          showarrow: true, arrowhead: 0, ax: 0, ay: 60,
          font: { color: 'purple', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
        });
      }
      if (performance.after && performance.after.phase_crossover_freq && performance.after.gain_margin_db != null) {
        bodeAnnotations.push({
          x: performance.after.phase_crossover_freq, y: performance.after.gain_margin_db,
          xref: 'x', yref: 'y',
          text: `<b>GM_comp: ${performance.after.gain_margin_db.toFixed(2)}dB</b>`,
          showarrow: true, arrowhead: 0, ax: 0, ay: -60,
          font: { color: 'darkgreen', size: 10 }, bgcolor: 'rgba(255,255,255,0.7)',
        });
      }

      // --- 2. Render Bode Magnitude Plot ---
      if (bodeMagPlotRef.current) {
        const traces = [
          { x: filterNoneValues(bode.omega), y: filterNoneValues(bode.uncompensated_mag_db), type: 'scatter', mode: 'lines', name: '原始系统', line: { color: 'blue', dash: 'dash' } },
          { x: filterNoneValues(bode.omega), y: filterNoneValues(bode.compensated_mag_db), type: 'scatter', mode: 'lines', name: '校正后系统', line: { color: 'blue' } },
        ];
        const layout = { title: '幅频特性对比', xaxis: { title: '频率 (rad/s)', type: 'log' }, yaxis: { title: '幅值 (dB)' }, showlegend: true, height: 300, annotations: bodeAnnotations.filter(ann => ann.yref === 'y') };
        Plotly.newPlot(bodeMagPlotRef.current, traces, layout);
      }

      // --- 3. Render Bode Phase Plot ---
      if (bodePhasePlotRef.current) {
        const traces = [
          { x: filterNoneValues(bode.omega), y: filterNoneValues(bode.uncompensated_phase_deg), type: 'scatter', mode: 'lines', name: '原始系统 (Phase)', line: { color: 'red', dash: 'dash' }, yaxis: 'y2' },
          { x: filterNoneValues(bode.omega), y: filterNoneValues(bode.compensated_phase_deg), type: 'scatter', mode: 'lines', name: '校正后系统 (Phase)', line: { color: 'red' }, yaxis: 'y2' },
        ];
        
        const layout = {
          title: '相频特性对比',
          xaxis: { title: '频率 (rad/s)', type: 'log' },
          yaxis2: {
            title: '相角 (°)',
            titlefont: { color: 'red' },
            tickfont: { color: 'red' },
            overlaying: 'y',
            side: 'left',
            tickmode: 'array',
            tickvals: getPhaseTicks(filterNoneValues(bode.uncompensated_phase_deg).concat(filterNoneValues(bode.compensated_phase_deg))),
          },
          showlegend: true,
          height: 300,
          annotations: bodeAnnotations.filter(ann => ann.yref === 'y2'),
        };
        Plotly.newPlot(bodePhasePlotRef.current, traces, layout);
      }
      
      // --- 4. Render Step Response Plot ---
      if (stepPlotRef.current) {
         const traces = [
          { x: filterNoneValues(step_response.uncompensated_time), y: filterNoneValues(step_response.uncompensated_response), type: 'scatter', mode: 'lines', name: '原始系统', line: { dash: 'dash' } },
          { x: filterNoneValues(step_response.compensated_time), y: filterNoneValues(step_response.compensated_response), type: 'scatter', mode: 'lines', name: '校正后系统' },
        ];
        const layout = { title: '闭环阶跃响应对比', xaxis: { title: '时间 (s)' }, yaxis: { title: '幅值' }, legend: { x: 0.1, y: 1.2, orientation: 'h' }, height: 300, };
        Plotly.newPlot(stepPlotRef.current, traces, layout);
      }
    }
  }, [result]); // useEffect dependency list

  return (
    <Card title={<Title level={4}>滞后校正设计</Title>} variant="borderless">
      <Row gutter={[16, 24]}>
        {/* Input Column */}
        <Col xs={24} lg={8}>
          <Title level={5}>1. 输入系统和目标</Title>
          <Paragraph>输入原始开环传递函数 G(s)H(s) 的系数和期望的稳态速度误差系数 Kv。</Paragraph>
          <Input addonBefore="G(s)H(s) 分子" placeholder="例如: 10" value={numerator} onChange={e => setNumerator(e.target.value)} />
          <Input addonBefore="G(s)H(s) 分母" placeholder="例如: 1,3,2,0" value={denominator} onChange={e => setDenominator(e.target.value)} style={{ marginTop: '10px' }} />
          <Input addonBefore="期望 Kv" placeholder="例如: 10" value={desiredKv} onChange={e => setDesiredKv(e.target.value)} style={{ marginTop: '10px' }} />
          <Button type="primary" onClick={handleDesign} loading={loading} style={{ marginTop: '20px', width: '100%' }}>
            开始设计
          </Button>
        </Col>

        {/* Result Column */}
        <Col xs={24} lg={16}>
          <Title level={5}>2. 查看设计结果</Title>
          <Spin spinning={loading} tip="正在计算..." size="large">
            {error && <Alert message="设计出错" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
            {result && (
              <Row gutter={[16, 16]}>
                {/* Performance Metrics Card */}
                <Col span={24}>
                  <Card type="inner" title="性能指标对比">
                    <Descriptions bordered column={2} size="small">
                      {/* Mapping through the performance metrics array for DRY code */}
                      {[
                        { key: 'before.kv', label: '原始 Kv', suffix: '' },
                        { key: 'after.kv', label: '校正后 Kv', suffix: '' },
                        { key: 'before.phase_margin', label: '原始相角裕度', suffix: '°' },
                        { key: 'after.phase_margin', label: '校正后相角裕度', suffix: '°' },
                        { key: 'before.gain_margin_db', label: '原始增益裕度', suffix: ' dB' },
                        { key: 'after.gain_margin_db', label: '校正后增益裕度', suffix: ' dB' },
                        { key: 'before.gain_crossover_freq', label: '原始剪切频率', suffix: ' rad/s' },
                        { key: 'after.gain_crossover_freq', label: '校正后剪切频率', suffix: ' rad/s' },
                        { key: 'before.phase_crossover_freq', label: '原始相角穿越频率', suffix: ' rad/s' },
                        { key: 'after.phase_crossover_freq', label: '校正后相角穿越频率', suffix: ' rad/s' },
                      ].map(({ key, label, suffix }) => {
                        const path = key.split('.');
                        const value = path.reduce((acc, part) => acc?.[part], result.performance);
                        return (
                          <Descriptions.Item key={key} label={label}>
                            {(value != null ? value.toFixed(2) : 'N/A') + suffix}
                          </Descriptions.Item>
                        );
                      })}
                    </Descriptions>
                  </Card>
                </Col>

                {/* Compensator Details Card */}
                <Col span={24}>
                  <Card type="inner" title="设计的滞后校正装置 Gc(s)">
                    <Descriptions bordered column={1} size="small">
                      <Descriptions.Item label="传递函数">
                        <MathJax>
                          {`$$ G_c(s) = \\frac{s + ${result.compensator.zero.toFixed(3)}}{s + ${result.compensator.pole.toFixed(3)}} $$`}
                        </MathJax>
                      </Descriptions.Item>
                      <Descriptions.Item label="beta">{result.compensator.beta.toFixed(3)}</Descriptions.Item>
                      <Descriptions.Item label="零点">{result.compensator.zero.toFixed(3)}</Descriptions.Item>
                      <Descriptions.Item label="极点">{result.compensator.pole.toFixed(3)}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>

                {/* Plots */}
                <Col xs={24} xl={24}><div ref={bodeMagPlotRef}></div></Col>
                <Col xs={24} xl={24}><div ref={bodePhasePlotRef}></div></Col>
                <Col xs={24} xl={24}><div ref={stepPlotRef} style={{ marginTop: '20px' }}></div></Col>
              </Row>
            )}
          </Spin>
        </Col>
      </Row>
    </Card>
  );
};

export default LagCompensation;
