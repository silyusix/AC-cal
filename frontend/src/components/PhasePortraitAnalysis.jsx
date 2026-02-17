import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Card, Row, Col, Typography, Spin, Alert } from 'antd';
import { plotPhasePortrait } from '../services/api';
import Plotly from 'plotly.js/dist/plotly-cartesian.min.js';

const { Title, Text } = Typography;

const PhasePortraitAnalysis = () => {
  const [numerator, setNumerator] = useState('1');
  const [denominator, setDenominator] = useState('1,1,1');
  const [plotData, setPlotData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const plotContainerRef = useRef(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setPlotData(null);
    setAnalysis(null);
    if (plotContainerRef.current) {
      Plotly.purge(plotContainerRef.current);
    }

    try {
      const num_coeffs = numerator.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      const den_coeffs = denominator.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));

      if (num_coeffs.length === 0 || den_coeffs.length === 0) {
        throw new Error('无效的系数。请输入以逗号分隔的数字。');
      }

      const response = await plotPhasePortrait({ numerator: num_coeffs, denominator: den_coeffs });
      
      setPlotData(response.trajectories);
      setAnalysis(response.equilibrium_analysis);

    } catch (err) {
      setError(err.message || '分析过程中发生错误。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (plotData && analysis && plotContainerRef.current) {
      const traces = [];
      const annotations = [];

      // 1. Add the equilibrium point marker
      traces.push({
        x: [analysis.point[0]],
        y: [analysis.point[1]],
        mode: 'markers',
        type: 'scatter',
        marker: { symbol: 'star', color: '#d62728', size: 14 },
        name: `平衡点: ${analysis.type}`,
      });

      // 2. Add trajectory lines and arrows
      plotData.forEach((trajectory) => {
        traces.push({
          x: trajectory.x,
          y: trajectory.y,
          mode: 'lines',
          type: 'scatter',
          line: { color: '#1f77b4', width: 1.5 },
          hoverinfo: 'none',
          showlegend: false,
        });

        // Add multiple arrows for better visibility
        if (trajectory.x.length > 2) {
          const arrowIndices = [
            Math.floor(trajectory.x.length * 0.3),
            Math.floor(trajectory.x.length * 0.6),
            Math.floor(trajectory.x.length * 0.9),
          ];

          arrowIndices.forEach(idx => {
            if (idx > 0) {
              const x_head = trajectory.x[idx];
              const y_head = trajectory.y[idx];
              const x_tail = trajectory.x[idx - 1];
              const y_tail = trajectory.y[idx - 1];

              if (typeof x_head === 'number' && typeof y_head === 'number' &&
                  typeof x_tail === 'number' && typeof y_tail === 'number' &&
                  (x_head !== x_tail || y_head !== y_tail)) {

                annotations.push({
                  ax: x_tail, ay: y_tail, axref: 'x', ayref: 'y',
                  x: x_head, y: y_head, xref: 'x', yref: 'y',
                  showarrow: true, arrowhead: 2, arrowsize: 1.2, arrowwidth: 1.5,
                  arrowcolor: '#1f77b4', opacity: 0.9
                });
              }
            }
          });
        }
      });

      const layout = {
        title: '相轨迹图',
        xaxis: { title: '状态 x(t)' },
        yaxis: { title: '状态 dx/dt', scaleanchor: "x", scaleratio: 1 },
        hovermode: 'closest',
        showlegend: true,
        legend: { x: 0.05, y: 0.95 },
        annotations: annotations,
        width: 700,
        height: 550,
      };

      Plotly.newPlot(plotContainerRef.current, traces, layout);
    }
  }, [plotData, analysis]);

  return (
    <Card title={<Title level={4}>相轨迹分析</Title>} bordered={false}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Title level={5}>系统输入</Title>
          <Text>请输入传递函数 G(s) 的系数。</Text>
          <Input
            addonBefore="分子"
            placeholder="例如: 1"
            value={numerator}
            onChange={e => setNumerator(e.target.value)}
            style={{ marginTop: '10px' }}
          />
          <Input
            addonBefore="分母"
            placeholder="例如: 1,1,1 代表 s² + s + 1"
            value={denominator}
            onChange={e => setDenominator(e.target.value)}
            style={{ marginTop: '10px' }}
          />
          <Button
            type="primary"
            onClick={handleAnalyze}
            loading={loading}
            style={{ marginTop: '20px', width: '100%' }}
          >
            开始分析
          </Button>
        </Col>
        <Col xs={24} md={16}>
          <Title level={5}>分析结果</Title>
          {loading && <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>}
          {error && <Alert message="错误" description={error} type="error" showIcon />}
          
          {analysis && (
            <Card type="inner" title="平衡点分析" style={{marginBottom: '20px'}}>
              <Text strong>坐标:</Text> [{analysis.point.join(', ')}]<br />
              <Text strong>类型:</Text> {analysis.type}
            </Card>
          )}

          <div ref={plotContainerRef} />

        </Col>
      </Row>
    </Card>
  );
};

export default PhasePortraitAnalysis;