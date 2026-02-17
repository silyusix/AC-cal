// frontend/src/components/Button.jsx

import React from 'react';

const Button = ({ children, onClick }) => {
  return (
    <button onClick={onClick} style={{ margin: '5px', padding: '10px', fontSize: '1.2em' }}>
      {children}
    </button>
  );
};

export default Button;
