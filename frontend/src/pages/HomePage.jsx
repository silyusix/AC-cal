
// frontend/src/pages/HomePage.jsx

import React, { useState } from 'react';
import ControlSystemInput from '../components/ControlSystemInput';
import ControlSystemAnalysis from '../components/ControlSystemAnalysis';
import InverseAnalysisInput from '../components/InverseAnalysisInput';
import InverseAnalysisResult from '../components/InverseAnalysisResult';
import SymbolicStabilityInput from '../components/SymbolicStabilityInput';
import SymbolicStabilityResult from '../components/SymbolicStabilityResult';
import RootLocusInput from '../components/RootLocusInput';
import RootLocusResult from '../components/RootLocusResult';
import FrequencyDomainInput from '../components/FrequencyDomainInput';
import FrequencyDomainResult from '../components/FrequencyDomainResult';
import PhasePortraitAnalysis from '../components/PhasePortraitAnalysis'; // Import new component
import LeadCompensation from '../components/LeadCompensation'; // Import new component
import LagCompensation from '../components/LagCompensation'; // Import new component
import LagLeadCompensation from '../components/LagLeadCompensation';
import { analyzeTransferFunctionAPI, inverseAnalyzeTimeDomainMetricsAPI, analyzeSymbolicStabilityAPI, plotRootLocusAPI, analyzeFrequencyDomainAPI } from '../utils/controlSystemUtils';

const HomePage = () => {
  const [mode, setMode] = useState('lagCompensation');
  const [controlAnalysisResult, setControlAnalysisResult] = useState(null);
  const [controlAnalysisError, setControlAnalysisError] = useState(null);
  const [inverseAnalysisResult, setInverseAnalysisResult] = useState(null);
  const [inverseAnalysisError, setInverseAnalysisError] = useState(null);
  const [symbolicStabilityResult, setSymbolicStabilityResult] = useState(null);
  const [symbolicStabilityError, setSymbolicStabilityError] = useState(null);
  const [rootLocusResult, setRootLocusResult] = useState(null);
  const [rootLocusError, setRootLocusError] = useState(null);
  const [frequencyDomainResult, setFrequencyDomainResult] = useState(null);
  const [frequencyDomainError, setFrequencyDomainError] = useState(null);

  const handleControlSystemAnalyze = async (numerator, denominator) => {
    setControlAnalysisError(null);
    setControlAnalysisResult(null);
    try {
      const result = await analyzeTransferFunctionAPI(numerator, denominator);
      setControlAnalysisResult(result);
    } catch (error) {
      console.error('Control system analysis error:', error);
      setControlAnalysisError(error.message);
    }
  };

  const handleInverseAnalysis = async (metrics) => {
    setInverseAnalysisError(null);
    setInverseAnalysisResult(null);
    try {
      const result = await inverseAnalyzeTimeDomainMetricsAPI(metrics);
      setInverseAnalysisResult(result);
    } catch (error) {
      console.error('Inverse analysis error:', error);
      setInverseAnalysisError(error.message);
    }
  };

  const handleSymbolicStabilityAnalyze = async (coeffs) => {
    setSymbolicStabilityError(null);
    setSymbolicStabilityResult(null);
    try {
      const result = await analyzeSymbolicStabilityAPI(coeffs);
      setSymbolicStabilityResult(result);
    } catch (error) {
      console.error('Symbolic stability analysis error:', error);
      setSymbolicStabilityError(error.message);
    }
  };

  const handleRootLocusPlot = async (zeros, poles) => {
    setRootLocusError(null);
    setRootLocusResult(null);
    try {
      const result = await plotRootLocusAPI(zeros, poles);
      setRootLocusResult(result);
    } catch (error) {
      console.error('Root locus plot error:', error);
      setRootLocusError(error.message);
    }
  };

  const handleFrequencyDomainAnalyze = async (zeros, poles, gain) => {
    setFrequencyDomainError(null);
    setFrequencyDomainResult(null);
    try {
      const result = await analyzeFrequencyDomainAPI(zeros, poles, gain);
      setFrequencyDomainResult(result);
    } catch (error) {
      console.error('Frequency domain analysis error:', error);
      setFrequencyDomainError(error.message);
    }
  };

  const renderModeContent = () => {
    switch (mode) {
      case 'controlSystem':
        return (
          <div className="analysis-section">
            <h3>正向分析</h3>
            <p>输入传递函数的分子和分母系数，计算其时域指标和稳定性。</p>
            <ControlSystemInput onAnalyze={handleControlSystemAnalyze} />
            {controlAnalysisError && <div className="error-message">错误: {controlAnalysisError}</div>}
            <ControlSystemAnalysis analysisResult={controlAnalysisResult} />
          </div>
        );
      case 'inverseAnalysis':
        return (
          <div className="analysis-section">
            <h3>反向分析 (二阶系统)</h3>
            <p>输入标准二阶系统的时域指标，反向计算其阻尼比和无阻尼自振频率。</p>
            <InverseAnalysisInput onAnalyze={handleInverseAnalysis} />
            {inverseAnalysisError && <div className="error-message">错误: {inverseAnalysisError}</div>}
            <InverseAnalysisResult result={inverseAnalysisResult} />
          </div>
        );
      case 'symbolicStability':
        return (
          <div className="analysis-section">
            <h3>劳斯稳定性分析</h3>
            <p>输入特征方程的系数，可包含符号 'x' 来求解稳定范围，或纯数字来判断稳定性。</p>
            <SymbolicStabilityInput onAnalyze={handleSymbolicStabilityAnalyze} />
            {symbolicStabilityError && <div className="error-message">错误: {symbolicStabilityError}</div>}
            <SymbolicStabilityResult result={symbolicStabilityResult} />
          </div>
        );
      case 'rootLocus':
        return (
          <div className="analysis-section">
            <h3>根轨迹分析</h3>
            <p>输入**开环传递函数**的分子和分母系数，绘制根轨迹图并显示数据。</p>
            <RootLocusInput onAnalyze={handleRootLocusPlot} />
            {rootLocusError && <div className="error-message">错误: {rootLocusError}</div>}
            <RootLocusResult result={rootLocusResult} />
          </div>
        );
      case 'frequencyDomain':
        return (
          <div className="analysis-section">
            <h3>频域分析</h3>
            <p>输入传递函数的零点和极点，绘制Bode图和Nyquist图。</p>
            <FrequencyDomainInput onAnalyze={handleFrequencyDomainAnalyze} />
            {frequencyDomainError && <div className="error-message">错误: {frequencyDomainError}</div>}
            <FrequencyDomainResult result={frequencyDomainResult} />
          </div>
        );
      case 'phasePortrait': // Add new case
        return (
          <div className="analysis-section">
            <h3>相轨迹分析</h3>
            <p>输入一个二阶（或更高阶）系统的传递函数，绘制其相轨迹图。</p>
            <PhasePortraitAnalysis />
          </div>
        );
      case 'leadCompensation':
        return (
          <div className="analysis-section">
            <LeadCompensation />
          </div>
        );
      case 'lagCompensation':
        return (
          <div className="analysis-section">
            <LagCompensation />
          </div>
        );
      case 'lagLeadCompensation':
        return (
          <div className="analysis-section">
            <LagLeadCompensation />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="homepage-container">
      <h1>自动控制原理计算器</h1>
      <nav className="mode-selector">
        <button onClick={() => setMode('controlSystem')} className={mode === 'controlSystem' ? 'active' : ''}>
          正向分析
        </button>
        <button onClick={() => setMode('inverseAnalysis')} className={mode === 'inverseAnalysis' ? 'active' : ''}>
          反向分析
        </button>
        <button onClick={() => setMode('symbolicStability')} className={mode === 'symbolicStability' ? 'active' : ''}>
          劳斯稳定性分析
        </button>
        <button onClick={() => setMode('rootLocus')} className={mode === 'rootLocus' ? 'active' : ''}>
          根轨迹分析
        </button>
        <button onClick={() => setMode('frequencyDomain')} className={mode === 'frequencyDomain' ? 'active' : ''}>
          频域分析
        </button>
        {/* Add new button */}
        <button onClick={() => setMode('phasePortrait')} className={mode === 'phasePortrait' ? 'active' : ''}>
          相轨迹分析
        </button>
        <button onClick={() => setMode('leadCompensation')} className={mode === 'leadCompensation' ? 'active' : ''}>
          超前校正
        </button>
        <button onClick={() => setMode('lagCompensation')} className={mode === 'lagCompensation' ? 'active' : ''}>
          滞后校正
        </button>
        <button onClick={() => setMode('lagLeadCompensation')} className={mode === 'lagLeadCompensation' ? 'active' : ''}>
          超前-滞后校正
        </button>
      </nav>
      <main className="content-area">
        {renderModeContent()}
      </main>
    </div>
  );
};

export default HomePage;
