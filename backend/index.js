const express = require('express');
const cors = require('cors');
const { ServerlessHttp } = require('serverless-http'); // Will install this
const { fetchCompanies } = require('./src/services/companyService'); // Re-introduce this for data

const app = express();

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));
app.use(express.json());

// Re-introduce data directly into the backend for simplicity in SCF
const companiesData = [
  { id: 1, name: '比亚迪', jobPageUrl: 'https://job.byd.com/', industry: '新能源汽车' },
  { id: 2, name: '理想汽车', jobPageUrl: 'https://www.lixiang.com/employ.html', industry: '新能源汽车' },
  { id: 3, name: '蔚来', jobPageUrl: 'https://www.nio.cn/careers', industry: '新能源汽车' },
  { id: 4, name: '小鹏汽车', jobPageUrl: 'https://www.xiaopeng.com/join.html', industry: '新能源汽车' },
  { id: 5, name: '长安汽车', jobPageUrl: 'https://changan.zhiye.com/', industry: '新能源汽车' },
  { id: 6, name: '宁德时代', jobPageUrl: 'https://www.catl.com/careers/', industry: '电池' },
  { id: 7, name: '亿纬锂能', jobPageUrl: 'https://www.evebattery.com/join-us', industry: '电池' },
  { id: 8, name: '国轩高科', jobPageUrl: 'https://gotion.zhiye.com/', industry: '电池' },
  { id: 9, name: '国家能源投资集团', jobPageUrl: 'http://zhaopin.chnenergy.com.cn', industry: '综合能源' },
  { id: 10, name: '中国石油天然气集团', jobPageUrl: 'https://zhaopin.cnpc.com.cn/web/recruitInfolist.html', industry: '石油天然气/新能源' },
  { id: 11, name: '中国航天科技集团', jobPageUrl: 'http://www.spacechina.com/n25/index.html', industry: '航天/新能源' },
  { id: 12, name: '中国石化', jobPageUrl: 'https://job.sinopec.com/', industry: '石化/新能源' },
  { id: 13, name: '软通动力', jobPageUrl: 'https://www.isoftstone.com/joinus/', industry: '数字能源服务' },
  { id: 14, name: '特变电工', jobPageUrl: 'https://www.tbea.com/tbea/recruit.html', industry: '能源' },
  { id: 15, name: '东方电气', jobPageUrl: 'https://www.dongfang.com/hr/index.html', industry: '能源' },
  { id: 16, name: '中国三峡新能源', jobPageUrl: 'https://www.ctgne.com/', industry: '新能源' },
  { id: 17, name: '中国华能集团', jobPageUrl: 'http://www.chng.com.cn/', industry: '电力/能源' },
  { id: 18, name: '中国五矿', jobPageUrl: 'http://www.minmetals.com/', industry: '矿业/金属/新能源材料' },
  { id: 19, name: '吉利汽车', jobPageUrl: 'https://hr.geely.com/', industry: '新能源汽车' },
  { id: 20, name: '中核集团', jobPageUrl: 'http://www.cnnc.com.cn/', industry: '核能/新能源' },
  { id: 21, name: '清安储能技术（重庆）有限公司', jobPageUrl: 'https://www.qaes.com.cn/', industry: '储能' },
  { id: 22, name: '上能电气股份有限公司', jobPageUrl: 'https://www.si-neng.com/', industry: '光伏/储能' },
  { id: 23, name: '四川蜀能电力产业发展有限公司', jobPageUrl: 'https://www.scsn.com.cn/', industry: '电力' },
  { id: 24, name: '中国大唐集团有限公司', jobPageUrl: 'https://www.china-cdt.com/', industry: '综合能源' },
  { id: 25, name: '北汽新能源 (极狐)', jobPageUrl: 'https://www.bjev.com.cn/', industry: '合资新能源汽车' },
  { id: 26, name: '庆铃集团', jobPageUrl: 'https://www.qingling.com.cn/', industry: '合资商用车/新能源' },
  { id: 27, name: '时代一汽', jobPageUrl: 'https://www.catl.com/', industry: '合资电池' },
  { id: 28, name: 'ATL新能源', jobPageUrl: 'https://www.atlbattery.com/', industry: '电池' },
  { id: 29, name: '首航新能源', jobPageUrl: 'https://www.sofarsolar.com/', industry: '光伏/储能' },
  { id: 30, name: '一道新能', jobPageUrl: 'https://www.das-solar.com/', industry: '光伏' }
];

app.get('/api/companies', (req, res) => {
  const keyword = req.query.keyword || '';
  const filteredCompanies = companiesData.filter(company => 
    company.name.includes(keyword) || company.industry.includes(keyword)
  );
  res.json(filteredCompanies);
});

// Export the Express app as a serverless function
module.exports.handler = ServerlessHttp(app);
