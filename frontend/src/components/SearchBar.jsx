import React from 'react';
import { Input, Button } from 'antd';

const { Search } = Input;

const SearchBar = ({ onSearch }) => {
  return (
    <Search
      placeholder="输入公司名称进行搜索..."
      enterButton="搜索"
      size="large"
      onSearch={onSearch}
      style={{ maxWidth: 600, margin: '20px auto', display: 'block' }}
    />
  );
};

export default SearchBar;