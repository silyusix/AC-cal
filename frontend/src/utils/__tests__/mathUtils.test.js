// frontend/src/utils/__tests__/mathUtils.test.js

import { add } from '../mathUtils';

describe('mathUtils', () => {
  test('add function should correctly add two numbers', () => {
    expect(add(1, 2)).toBe(3);
    expect(add(-1, 1)).toBe(0);
    expect(add(0, 0)).toBe(0);
  });
});
