import React from 'react';
import { Card } from 'antd';

const CompanyCard = ({ company }) => {
  // Defensive rendering: Provide default values for every property
  const companyName = company?.name || '公司名称加载失败';
  const jobUrl = company?.jobPageUrl || '#';
  const industry = company?.industry || '行业信息未知';
  const notes = company?.notes || '';

  return (
    <Card 
      title={companyName}
      style={{ margin: '16px 0', height: '100%' }}
      extra={<a href={jobUrl} target="_blank" rel="noopener noreferrer">招聘主页</a>}
    >
      <p>行业: {industry}</p>
      {notes && <p>备注: {notes}</p>}
    </Card>
  );
};

export default CompanyCard;