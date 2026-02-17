// frontend/src/components/RootLocusResult.jsx

import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js/dist/plotly-cartesian.min.js';

const RootLocusResult = ({ result }) => {
  const plotContainerRef = useRef(null);

  useEffect(() => {
    if (result && result.branches && plotContainerRef.current) {
      const { branches, zeros, poles, asymptotes, breakaway_points, imag_axis_crossings } = result;
      const plotData = [];
      const plotAnnotations = []; // For arrows

      // Define a color palette for branches
      const colors = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', // Standard Plotly colors
        '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', 
        '#bcbd22', '#17becf'
      ];

      // --- Drawing Order: Asymptotes -> Poles -> Zeros -> Breakaway -> Imaginary Axis Crossings -> Branches ---

      // Calculate dynamic plot ranges
      let allX = [];
      let allY = [];

      if (poles) allX = allX.concat(poles.map(p => p.x));
      if (poles) allY = allY.concat(poles.map(p => p.y));
      if (zeros) allX = allX.concat(zeros.map(z => z.x));
      if (zeros) allY = allY.concat(zeros.map(z => z.y));
      if (breakaway_points) allX = allX.concat(breakaway_points.map(p => p.x));
      if (breakaway_points) allY = allY.concat(breakaway_points.map(p => p.y));
      if (imag_axis_crossings) allX = allX.concat(imag_axis_crossings.map(p => p.x));
      if (imag_axis_crossings) allY = allY.concat(imag_axis_crossings.map(p => p.y));
      branches.forEach(branch => {
        allX = allX.concat(branch.x);
        allY = allY.concat(branch.y);
      });

      const getRange = (data) => {
        if (data.length === 0) return [-0.5, 0.5]; // Default range if no data, scaled by 10
        
        const minVal = Math.min(...data);
        const maxVal = Math.max(...data);
        const maxAbsValue = Math.max(Math.abs(minVal), Math.abs(maxVal));

        // Determine a target range value, ensuring a minimum for visibility
        let rangeValue = Math.max(maxAbsValue * 1.2, 5); // At least 5, and 20% padding around max abs value
        
        // Scale down by 10 as requested
        rangeValue /= 10;
        
        // Ensure the range is symmetric around zero, and has a reasonable minimum
        rangeValue = Math.max(rangeValue, 0.5); // Ensure a minimum range of [-0.5, 0.5]

        return [-rangeValue, rangeValue];
      };

      const xRange = getRange(allX);
      const yRange = getRange(allY);

      // 1. Add asymptotes
      if (asymptotes && branches && branches.length > 0) {
        const { centroid, angles } = asymptotes;
        // Extend asymptotes to cover the dynamic plot range, but not excessively
        const xSpan = xRange[1] - xRange[0];
        const ySpan = yRange[1] - yRange[0];
        const asymptoteLength = Math.max(xSpan, ySpan) * 0.75; // Adjust length based on plot span

        if (angles) {
          angles.forEach(angle => {
              const rad = angle * Math.PI / 180;
              plotData.push({
                  x: [centroid, centroid + asymptoteLength * Math.cos(rad)],
                  y: [0, asymptoteLength * Math.sin(rad)],
                  mode: 'lines',
                  name: `Asymptote ${typeof angle === 'number' ? angle.toFixed(1) : 'N/A'}°`,
                  line: { dash: 'dash', color: 'grey', width: 2 }
              });
          });
        }
      }

      // 2. Add poles
      if (poles) {
        plotData.push({
          x: poles.map(p => p.x),
          y: poles.map(p => p.y),
          mode: 'markers',
          type: 'scatter',
          name: 'Poles',
          marker: { symbol: 'x', color: 'red', size: 8 }
        });
      }

      // 3. Add zeros
      if (zeros) {
        plotData.push({
          x: zeros.map(z => z.x),
          y: zeros.map(z => z.y),
          mode: 'markers',
          type: 'scatter',
          name: 'Zeros',
          marker: { symbol: 'circle-open', color: 'green', size: 8 }
        });
      }

      // 4. Add Breakaway/Break-in Points
      if (breakaway_points && breakaway_points.length > 0) {
        plotData.push({
          x: breakaway_points.map(p => p.x),
          y: breakaway_points.map(p => p.y),
          mode: 'markers',
          type: 'scatter',
          name: 'Breakaway/Break-in Points',
          marker: { symbol: 'circle', color: 'purple', size: 6 }
        });
      }

      // 5. Add Imaginary Axis Crossings
      if (imag_axis_crossings && imag_axis_crossings.length > 0) {
        plotData.push({
          x: imag_axis_crossings.map(p => p.x),
          y: imag_axis_crossings.map(p => p.y),
          mode: 'markers',
          type: 'scatter',
          name: 'Imaginary Axis Crossings',
          marker: { symbol: 'star', color: '#ff7f0e', size: 10 } // Orange star
        });
      }

      // 6. Add root locus branches (last, so they draw on top)
      if (branches) {
        branches.forEach((branch, index) => {
          const branchColor = colors[index % colors.length];
          plotData.push({
            x: branch.x,
            y: branch.y,
            mode: 'lines',
            type: 'scatter',
            name: `Branch ${index + 1}`,
            hoverinfo: 'x+y',
            line: { color: branchColor, width: 2, dash: 'solid' }
          });

          // Add arrow to indicate direction
          if (branch.x.length > 1) {
            const arrowIndex = Math.floor(branch.x.length / 2); // Place arrow in the middle of the branch
            const x_head = branch.x[arrowIndex];
            const y_head = branch.y[arrowIndex];
            const x_tail = branch.x[arrowIndex - 1];
            const y_tail = branch.y[arrowIndex - 1];

            if (typeof x_head === 'number' && typeof y_head === 'number' &&
                typeof x_tail === 'number' && typeof y_tail === 'number' &&
                (x_head !== x_tail || y_head !== y_tail)) {

              plotAnnotations.push({
                ax: x_tail, 
                ay: y_tail, 
                axref: 'x',
                ayref: 'y',
                x: x_head, 
                y: y_head, 
                xref: 'x',
                yref: 'y',
                showarrow: true,
                arrowhead: 2, 
                arrowsize: 1, 
                arrowwidth: 1, 
                arrowcolor: branchColor,
                opacity: 0.7
              });
            }
          }
        });
      }

      const layout = {
        title: '交互式根轨迹图',
        xaxis: { 
          title: '实轴 (Real Axis)', 
          range: xRange
        },
        yaxis: { 
          title: '虚轴 (Imaginary Axis)', 
          scaleanchor: "x", 
          scaleratio: 1, 
          range: yRange
        },
        hovermode: 'closest',
        showlegend: true,
        width: 700,
        height: 500,
        annotations: plotAnnotations // Add arrows to layout annotations
      };

      Plotly.newPlot(plotContainerRef.current, plotData, layout);
    }
  }, [result]); // Re-run effect when result changes

  // Render a container for the plot and other info
  return (
    <div className="result-card">
      <h3>根轨迹分析结果</h3>
      {result && result.message && <p>{result.message}</p>}
      {result && result.branches && (
        <p>从后端接收到的分支数量: <strong>{result.branches.length}</strong></p>
      )}
      <div ref={plotContainerRef}></div>
      {result && result.asymptotes && (
        <div className="analysis-details">
            <h4>根轨迹特性</h4>
            <p><strong>渐近线与实轴交点:</strong> {typeof result.asymptotes.centroid === 'number' ? result.asymptotes.centroid.toFixed(3) : 'N/A'}</p>
            <p><strong>渐近线角度:</strong> {result.asymptotes.angles ? result.asymptotes.angles.map(a => typeof a === 'number' ? a.toFixed(2) : 'N/A').join('°, ') : 'N/A'}°</p>
        </div>
      )}
      {result && result.breakaway_points && (
        <div className="analysis-details">
            <h4>分离点/会合点</h4>
            <ul>
                {result.breakaway_points.length > 0 ? (
                    result.breakaway_points.map((p, index) => (
                        <li key={index}>({p.x.toFixed(3)}, {p.y.toFixed(3)})</li>
                    ))
                ) : (
                    <li>无 (或与零极点重合)</li>
                )}
            </ul>
        </div>
      )}
      {result && result.imag_axis_crossings && result.imag_axis_crossings.length > 0 && (
        <div className="analysis-details">
            <h4>与虚轴交点</h4>
            <ul>
                {result.imag_axis_crossings.map((p, index) => (
                    <li key={index}>({p.x.toFixed(3)}, {p.y.toFixed(3)}) at K = {p.k.toFixed(3)}</li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
};

export default RootLocusResult;
