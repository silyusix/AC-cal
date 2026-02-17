// Base URL for the FastAPI backend
const API_BASE_URL = 'http://localhost:8000';

/**
 * A helper function to handle fetch requests and errors.
 * @param {string} url - The endpoint URL.
 * @param {object} options - The options for the fetch request (e.g., method, headers, body).
 * @returns {Promise<any>} - The JSON response from the server.
 */
const apiRequest = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

/**
 * Analyzes a transfer function for its time-domain metrics and stability.
 * @param {{numerator: number[], denominator: number[]}} data - The transfer function coefficients.
 */
export const analyzeTransferFunction = (data) => {
  return apiRequest(`${API_BASE_URL}/analyze_tf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

/**
 * Performs inverse analysis to find system parameters from time-domain metrics.
 * @param {{rise_time?: number, peak_time?: number, max_overshoot?: number, settling_time?: number}} data
 */
export const inverseAnalyzeTf = (data) => {
  return apiRequest(`${API_BASE_URL}/inverse_analyze_tf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

/**
 * Analyzes the stability range of a system with a symbolic variable.
 * @param {{denominator_coeffs: string[]}} data - The denominator coefficients with a symbolic variable 'x'.
 */
export const analyzeStabilityRange = (data) => {
  return apiRequest(`${API_BASE_URL}/analyze_stability_range`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

/**
 * Calculates data for plotting a root locus.
 * @param {{zeros: object[], poles: object[], gain: number}} data - The open-loop zeros, poles, and gain.
 */
export const plotRootLocus = (data) => {
  return apiRequest(`${API_BASE_URL}/plot_root_locus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

/**
 * Performs frequency domain analysis (Bode, Nyquist).
 * @param {{zeros: object[], poles: object[], gain: number}} data - The open-loop zeros, poles, and gain.
 */
export const analyzeFrequencyDomain = (data) => {
  return apiRequest(`${API_BASE_URL}/analyze_frequency_domain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

/**
 * Generates data for a phase portrait plot.
 * @param {{numerator: number[], denominator: number[]}} data - The transfer function coefficients.
 */
export const plotPhasePortrait = (data) => {
  return apiRequest(`${API_BASE_URL}/analysis/plot_phase_portrait`, { // Note the updated prefix
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

/**
 * Designs a lead compensator to meet a desired phase margin.
 * @param {{numerator: number[], denominator: number[], desired_phase_margin: number}} data
 */
export const designLeadCompensator = (data) => {
  return apiRequest(`${API_BASE_URL}/compensation/design_lead_compensator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

/**
 * Designs a lag compensator to meet a desired velocity error constant (Kv).
 * @param {{numerator: number[], denominator: number[], desired_kv: number}} data
 */
export const designLagCompensator = (data) => {
  return apiRequest(`${API_BASE_URL}/compensation/design_lag_compensator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

/**
 * Designs a lag-lead compensator to meet both Kv and phase margin requirements.
 * @param {{numerator: number[], denominator: number[], desired_kv: number, desired_phase_margin: number}} data
 */
export const designLagLeadCompensator = (data) => {
  return apiRequest(`${API_BASE_URL}/compensation/design_lag_lead_compensator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};