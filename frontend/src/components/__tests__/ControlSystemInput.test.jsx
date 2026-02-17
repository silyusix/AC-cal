// frontend/src/components/__tests__/ControlSystemInput.test.jsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import ControlSystemInput from '../ControlSystemInput';

describe('ControlSystemInput', () => {
  test('renders input fields for transfer function', () => {
    render(<ControlSystemInput />);
    expect(screen.getByLabelText(/Numerator/i)).toBeInTheDocument(); // Assuming a label for numerator input
    expect(screen.getByLabelText(/Denominator/i)).toBeInTheDocument(); // Assuming a label for denominator input
  });
});
