# AC-cal: 自动控制原理全功能计算器 (Control System Calculator)

AC-cal 是一款专为自动控制理论学习与工程设计打造的全栈 Web 应用程序。它结合了现代化的前端交互体验与强大的后端科学计算能力，提供从时域分析、频域分析到校正装置设计的一站式解决方案。

##  核心功能

### 1. 系统建模与分析
*   **正向分析 (Transfer Function Analysis)**: 输入分子分母系数，自动计算上升时间、峰值时间、超调量、调节时间等关键时域指标，并判断系统稳定性。
*   **反向分析 (Inverse Analysis)**: 针对标准二阶系统，根据期望的性能指标（如超调量）反向求解阻尼比 $\zeta$ 和自然频率 $\omega_n$。
*   **劳斯稳定性分析 (Routh Analysis)**: 支持**符号计算**。输入带未知数 'x' 的特征方程，自动求解使系统稳定的参数范围。

### 2. 图形化分析工具
*   **根轨迹 (Root Locus)**: 动态绘制根轨迹图，自动标注分离点、起始点及与虚轴的交点。
*   **频域分析 (Frequency Domain)**: 绘制高精度的 **Bode 图**（幅频/相频）与 **Nyquist 图**，计算增益裕度 (GM) 和相角裕度 (PM)。
*   **相轨迹分析 (Phase Portrait)**: 针对二阶及以上系统，绘制状态空间轨迹，直观展示非线性行为与平衡点稳定性。

### 3. 校正装置设计 (Compensator Design)
*   **超前校正 (Lead)**: 根据期望相角裕度自动设计。
*   **滞后校正 (Lag)**: 根据期望稳态速度误差系数 $K_v$ 自动设计，已解决数值计算稳定性问题。
*   **超前-滞后校正 (Lag-Lead)**: 综合解决稳态精度与动态响应要求的复杂设计。

##  技术栈

*   **前端 (Frontend)**: 
    *   React + Vite
    *   Ant Design (UI 框架)
    *   Plotly.js (交互式科学图表)
    *   MathJax (高质量数学公式渲染)
*   **后端 (Backend)**:
    *   Python + FastAPI
    *   Python-Control (核心控制算法库)
    *   NumPy / SciPy / SymPy (科学计算与符号运算)
*   **打包 (Packaging)**:
    *   PyInstaller (支持生成独立 Windows .exe 执行文件)

##  快速开始

### 前端启动
```bash
cd frontend
npm install
npm run dev
```

### 后端启动
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows 使用 .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
整个项目都是ai写的代码，希望对大家有帮助
