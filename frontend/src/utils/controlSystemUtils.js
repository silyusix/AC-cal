// frontend/src/utils/controlSystemUtils.js

const API_BASE_URL = 'http://localhost:8000';

export const analyzeTransferFunctionAPI = async (numerator, denominator) => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze_tf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ numerator, denominator }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '后端分析失败');
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling analyze transfer function API:', error);
    throw error;
  }
};

export const inverseAnalyzeTimeDomainMetricsAPI = async (metrics) => {
  try {
    const response = await fetch(`${API_BASE_URL}/inverse_analyze_tf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '后端反向分析失败');
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling inverse analysis API:', error);
    throw error;
  }
};

export const analyzeSymbolicStabilityAPI = async (coeffs) => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze_stability_range`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ denominator_coeffs: coeffs }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '后端符号稳定性分析失败');
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling symbolic stability analysis API:', error);
    throw error;
  }
};

export const plotRootLocusAPI = async (zeros, poles) => {
  try {
    const response = await fetch(`${API_BASE_URL}/plot_root_locus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ zeros, poles }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '后端根轨迹分析失败');
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling root locus API:', error);
    throw error;
  }
};

export const analyzeFrequencyDomainAPI = async (zeros, poles, gain) => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze_frequency_domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ zeros, poles, gain: parseFloat(gain) || 1.0 }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '后端频域分析失败');
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling frequency domain API:', error);
    throw error;
  }
};