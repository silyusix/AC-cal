// frontend/src/components/Display.jsx

import React from 'react';

const Display = ({ value }) => {
  return (
    <div style={{
      border: '1px solid #ccc',
      padding: '10px',
      minHeight: '50px',
      fontSize: '2em',
      textAlign: 'right',
      backgroundColor: '#eee',
      marginBottom: '10px',
    }}>
      {value}
    </div>
  );
};

export default Display;
