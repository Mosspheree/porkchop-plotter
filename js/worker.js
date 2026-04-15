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
  const sepGrid = new Float32Array(NX * NY);
  const thetaGrid = new Float32Array(NX * NY);

  let minC3 = 1e9, maxC3 = 0, bestIdx = 0;

  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NY; j++) {
      const depDate = depDates[i];
      const tof = tofArr[j];


      const dataI = OrbitalMechanics.getMissionData(origin, dest, depDate, tof, false);
      const dataII = OrbitalMechanics.getMissionData(origin, dest, depDate, tof, true);

      const data = (dataI.c3 < dataII.c3) ? dataI : dataII;
      const cappedC3 = (data.c3 > 0 && data.c3 < 1e6) ? Math.min(data.c3, 150) : 150;
      const idx = i * NY + j;
      
      c3Grid[idx] = cappedC3;
      arrVinfGrid[idx] = data.v_inf_arr;
      dlaGrid[idx] = data.dla;
      sepGrid[idx] = data.sep;
      thetaGrid[idx] = data.theta;

      if (cappedC3 < minC3) {
        minC3 = cappedC3;
        bestIdx = idx;
      }
      if (cappedC3 > maxC3 && cappedC3 < 151) maxC3 = cappedC3;
    }


    if (i % Math.max(1, Math.floor(NX / 20)) === 0) {
      self.postMessage({ type: 'progress', percent: Math.round((i / NX) * 100) });
    }
  }


  self.postMessage({ type: 'progress', percent: 100 });
  self.postMessage({
    type: 'result',
    grid: c3Grid,
    arrVinfGrid: arrVinfGrid,
    dlaGrid: dlaGrid,
    sepGrid: sepGrid,
    thetaGrid: thetaGrid,
    minC3,
    maxC3: Math.min(maxC3, minC3 + 100),
    bestIdx
  });
};
