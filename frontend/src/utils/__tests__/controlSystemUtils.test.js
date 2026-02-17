// frontend/src/utils/__tests__/controlSystemUtils.test.js

import { inverseAnalyzeTimeDomainMetrics } from '../controlSystemUtils';

// Mock the global fetch function
global.fetch = jest.fn();

describe('controlSystemUtils', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('inverseAnalyzeTimeDomainMetrics', () => {
    it('should call the inverse analysis API with the correct metrics', async () => {
      const mockMetrics = { max_overshoot: 5, peak_time: 1.5 };
      const mockResponse = { damping_ratio: 0.5, natural_frequency: 2.0 };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await inverseAnalyzeTimeDomainMetrics(mockMetrics);

      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/inverse_analyze_tf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockMetrics),
      });
    });

    it('should return the analysis result on successful API call', async () => {
      const mockMetrics = { max_overshoot: 5, peak_time: 1.5 };
      const mockResponse = { damping_ratio: 0.5, natural_frequency: 2.0 };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await inverseAnalyzeTimeDomainMetrics(mockMetrics);

      expect(result).toEqual(mockResponse);
    });

    it('should throw an error on failed API call', async () => {
      const mockMetrics = { max_overshoot: 5, peak_time: 1.5 };
      const errorMessage = 'Backend error';

      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage }),
      });

      await expect(inverseAnalyzeTimeDomainMetrics(mockMetrics)).rejects.toThrow(errorMessage);
    });
  });
});