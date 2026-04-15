/**
 * worker.js — Background thread for heavy orbital math
 */
importScripts('orbital.js');

self.onmessage = function(e) {
  const { origin, dest, depDates, tofArr, NX, NY } = e.data;
  const grid = new Float32Array(NX * NY);
  let minC3 = 1e9, maxC3 = 0, bestIdx = 0;

  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NY; j++) {
      const c3 = OrbitalMechanics.lambertC3(origin, dest, depDates[i], tofArr[j]);
      const capped = Math.min(c3, 300);
      grid[i * NY + j] = capped;
      
      if (capped < minC3) { 
        minC3 = capped; 
        bestIdx = i * NY + j; 
      }
      if (capped > maxC3) maxC3 = capped;
    }
    // Progress reporting back to main thread
    self.postMessage({ type: 'progress', percent: Math.round((i / NX) * 100) });
  }

  self.postMessage({
    type: 'result',
    grid, minC3, maxC3: Math.min(maxC3, minC3 + 120), bestIdx
  });
};
