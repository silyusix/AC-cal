// frontend/src/utils/parsingUtils.js

export const parseComplexNumbers = (input) => {
  if (!input.trim()) {
    return [];
  }
  const parts = input.split(',').map(s => s.trim());
  const complexNumbers = parts.map(part => {
    // Regular expression to capture real and imaginary parts
    const match = part.match(/^(-?[0-9\.]+)?([+-]?[0-9\.]+j)?$/);
    if (!match || part.endsWith('+') || part.endsWith('-')) {
      return NaN; // Invalid format
    }

    let real = 0;
    let imag = 0;

    const realPart = match[1];
    const imagPart = match[2];

    if (realPart) {
      real = parseFloat(realPart);
    }

    if (imagPart) {
      if (imagPart === 'j' || imagPart === '+j') {
        imag = 1;
      } else if (imagPart === '-j') {
        imag = -1;
      } else {
        imag = parseFloat(imagPart.replace('j', ''));
      }
    }
    
    // If only j part exists and no real part was matched as a number
    if(!realPart && imagPart) {
      return { real: 0, imag: imag };
    }

    return { real, imag };
  });

  if (complexNumbers.some(c => isNaN(c.real) || isNaN(c.imag))) {
    throw new Error('包含无效的复数格式。请使用 a+bj 的形式，例如: -1, -2+3j, -2-3j');
  }
  return complexNumbers;
};