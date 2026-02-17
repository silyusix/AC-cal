import React from 'react';
import { Card, Tag } from 'antd';

const JobCard = ({ job }) => {
  if (!job) {
    return null;
  }

  // Function to format the date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Card
      title={job.title}
      hoverable
      style={{ marginBottom: '16px' }}
      extra={<a href={job.descriptionLink} target="_blank" rel="noopener noreferrer">查看原链接</a>}
    >
      <p><strong>公司:</strong> {job.companyName || 'N/A'}</p>
      <p><strong>地点:</strong> <Tag color="blue">{job.location || 'N/A'}</Tag></p>
      <p><strong>薪资:</strong> <Tag color="green">{job.salary || 'N/A'}</Tag></p>
      <p><strong>发布日期:</strong> {formatDate(job.postedDate)}</p>
    </Card>
  );
};

export default JobCard;
