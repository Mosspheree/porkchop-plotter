/**
 * worker.js — Background thread for heavy orbital math
 * Updated to handle multi-value mission data (C3, Arrival V-inf, and DLA)
 */
importScripts('orbital.js');

self.onmessage = function(e) {
  const { origin, dest, depDates, tofArr, NX, NY } = e.data;

  // We now create three grids to capture the full mission profile
  const c3Grid = new Float32Array(NX * NY);
  const arrVinfGrid = new Float32Array(NX * NY);
  const dlaGrid = new Float32Array(NX * NY);

  let minC3 = 1e9, maxC3 = 0, bestIdx = 0;

  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NY; j++) {
      const data = OrbitalMechanics.getMissionData(origin, dest, depDates[i], tofArr[j]);

      const cappedC3 = Math.min(data.c3, 150); // Industry standard porkchops rarely show > 100-150
      c3Grid[i * NY + j] = cappedC3;

      arrVinfGrid[i * NY + j] = data.v_inf_arr;

      dlaGrid[i * NY + j] = data.dla;
      

      if (cappedC3 < minC3) { 
        minC3 = cappedC3; 
        bestIdx = i * NY + j; 
      }
      if (cappedC3 > maxC3 && cappedC3 < 151) maxC3 = cappedC3;
    }

    // Progress reporting
    if (i % Math.floor(NX / 20) === 0) {
        self.postMessage({ type: 'progress', percent: Math.round((i / NX) * 100) });
    }
  }


  self.postMessage({
    type: 'result',
    grid: c3Grid,           // Primary heatmap data
    arrVinfGrid: arrVinfGrid, // Contour layer 1
    dlaGrid: dlaGrid,       // Contour layer 2
    minC3, 
    maxC3: Math.min(maxC3, minC3 + 100), 
    bestIdx
  });
};
