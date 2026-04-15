/**
 * worker.js — Professional Grade Data Aggregator
 * Tracks C3, V-inf, DLA, SEP Angle, and Transfer Theta.
 */
importScripts('orbital.js');

self.onmessage = function(e) {
  const { origin, dest, depDates, tofArr, NX, NY } = e.data;

  const c3Grid = new Float32Array(NX * NY);
  const arrVinfGrid = new Float32Array(NX * NY);
  const dlaGrid = new Float32Array(NX * NY);
  const sepGrid = new Float32Array(NX * NY);  // For Solar Conjunctions
  const thetaGrid = new Float32Array(NX * NY); // For the 180-degree Ridge

  let minC3 = 1e9, maxC3 = 0, bestIdx = 0;

  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NY; j++) {
      const depDate = depDates[i];
      const tof = tofArr[j];

      // Professional Flex: Compare Type I and Type II to find the better energy path
      const dataI = OrbitalMechanics.getMissionData(origin, dest, depDate, tof, false);
      const dataII = OrbitalMechanics.getMissionData(origin, dest, depDate, tof, true);

      // Pick the solution with lower C3 energy
      const data = (dataI.c3 < dataII.c3) ? dataI : dataII;


      const cappedC3 = Math.min(data.c3, 150);
      c3Grid[i * NY + j] = cappedC3;


      arrVinfGrid[i * NY + j] = data.v_inf_arr;


      dlaGrid[i * NY + j] = data.dla;


      sepGrid[i * NY + j] = data.sep;


      thetaGrid[i * NY + j] = data.theta;

      if (cappedC3 < minC3) {
        minC3 = cappedC3;
        bestIdx = i * NY + j;
      }
      if (cappedC3 > maxC3 && cappedC3 < 151) maxC3 = cappedC3;
    }


    if (i % Math.floor(NX / 20) === 0) {
      self.postMessage({ type: 'progress', percent: Math.round((i / NX) * 100) });
    }
  }

  self.postMessage({
    type: 'result',
    grid: c3Grid,
    arrVinfGrid: arrVinfGrid,
    dlaGrid: dlaGrid,
    sepGrid: sepGrid,     // New: Used for blackout masking
    thetaGrid: thetaGrid, // New: Used for ridge gap rendering
    minC3,
    maxC3: Math.min(maxC3, minC3 + 100),
    bestIdx
  });
};
