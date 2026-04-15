/**
 * plot.js — Professional Multi-Layer Porkchop Renderer
 * Features: C3 Heatmap, Arrival V-inf Contours, DLA Masking, and Interactive Readout.
 */

const PorkchopPlot = (() => {

  const COLORMAP = [
    [8,  28, 80], [12, 52, 140], [18, 82, 185], [28, 120, 210],
    [50, 155, 230], [85, 185, 245], [130, 210, 248], [170, 230, 250],
    [200, 240, 215], [210, 240, 160], [180, 230, 100], [140, 210, 50],
    [100, 185, 20], [70,  160, 8], [200, 230, 50], [240, 220, 30],
    [250, 185, 20], [245, 140, 10], [235, 90,  8], [220, 50,  8],
    [200, 20,  8], [170, 8,   8], [130, 4,   4], [100, 0,   0],
  ];

  function c3ToRGB(c3, minC3, maxC3) {
    const t = Math.max(0, Math.min(1, (c3 - minC3) / (maxC3 - minC3)));
    const i = Math.min(Math.floor(t * (COLORMAP.length - 1)), COLORMAP.length - 2);
    const f = t * (COLORMAP.length - 1) - i;
    const c0 = COLORMAP[i], c1 = COLORMAP[i + 1];
    return [
      Math.round(c0[0] + f * (c1[0] - c0[0])),
      Math.round(c0[1] + f * (c1[1] - c0[1])),
      Math.round(c0[2] + f * (c1[2] - c0[2])),
    ];
  }

  function draw(canvas, results, NX, NY, depDates, tofArr, minC3, maxC3, bestIdx) {
    const { grid, arrVinfGrid, dlaGrid } = results; 
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width || 700;
    const H = rect.height || 480;

    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'middle';

    const PAD = { l: 64, r: 24, t: 20, b: 56 };
    const PW = W - PAD.l - PAD.r;
    const PH = H - PAD.t - PAD.b;
    const cellW = PW / NX;
    const cellH = PH / NY;

    // --- LAYER 1: C3 HEATMAP ---
    const imgData = ctx.createImageData(Math.ceil(PW), Math.ceil(PH));
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NY; j++) {
        const c3 = grid[i * NY + j];
        const [r, g, b] = c3ToRGB(c3, minC3, maxC3);
        const px = Math.round(i * cellW);
        const py = Math.round((NY - 1 - j) * cellH);
        
        for (let dy = 0; dy < Math.ceil(cellH); dy++) {
          for (let dx = 0; dx < Math.ceil(cellW); dx++) {
            const x = Math.min(px + dx, Math.ceil(PW) - 1);
            const y = Math.min(py + dy, Math.ceil(PH) - 1);
            const idx = (y * Math.ceil(PW) + x) * 4;
            imgData.data[idx]   = r;
            imgData.data[idx+1] = g;
            imgData.data[idx+2] = b;
            imgData.data[idx+3] = 255;
          }
        }
      }
    }
    ctx.putImageData(imgData, PAD.l, PAD.t);
    ctx.fillStyle = 'rgba(20, 20, 20, 0.4)';
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NY; j++) {
        if (Math.abs(dlaGrid[i * NY + j]) > 28.5) {
          ctx.fillRect(PAD.l + i * cellW, PAD.t + (NY - 1 - j) * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }

    // --- LAYER 3: ARRIVAL V-INF CONTOURS ---
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)'; // Red for arrival "heat"
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 3]);
    
    // Draw V-inf contours at 1km/s intervals
    for (let lev = 2; lev <= 12; lev += 1) {
      drawContourLines(ctx, arrVinfGrid, lev, NX, NY, cellW, cellH, PAD);
    }
    ctx.setLineDash([]);


    const bi = Math.floor(bestIdx / NY);
    const bj = bestIdx % NY;
    const bx = PAD.l + (bi + 0.5) * cellW;
    const by = PAD.t + (NY - 1 - bj + 0.5) * cellH;
    ctx.beginPath();
    ctx.arc(bx, by, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();


    renderAxes(ctx, PAD, PW, PH, NX, NY, depDates, tofArr);

    // Store metadata for hover interactions
    canvas._plotMeta = { PAD, PW, PH, NX, NY, depDates, tofArr, grid, arrVinfGrid, dlaGrid, minC3, maxC3, cellW, cellH };

    if (!canvas._hasHover) {
      canvas.addEventListener('mousemove', (e) => handleHover(canvas, e));
      canvas._hasHover = true;
    }
  }

  function drawContourLines(ctx, data, level, NX, NY, cw, ch, PAD) {
    ctx.beginPath();
    for (let i = 0; i < NX - 1; i++) {
      for (let j = 0; j < NY - 1; j++) {
        const v = data[i * NY + j];
        const vr = data[(i+1) * NY + j];
        const vt = data[i * NY + (j+1)];
        if ((v < level && vr >= level) || (v >= level && vr < level)) {
          ctx.moveTo(PAD.l + (i+0.5)*cw, PAD.t + (NY-1-j)*ch);
          ctx.lineTo(PAD.l + (i+0.5)*cw, PAD.t + (NY-1-j)*ch + ch);
        }
      }
    }
    ctx.stroke();
  }

  function renderAxes(ctx, PAD, PW, PH, NX, NY, depDates, tofArr) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.l, PAD.t);
    ctx.lineTo(PAD.l, PAD.t + PH);
    ctx.lineTo(PAD.l + PW, PAD.t + PH);
    ctx.stroke();

    ctx.font = '10px Space Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    
    // X-Axis (Date)
    ctx.textAlign = 'left';
    for (let t = 0; t <= 6; t++) {
      const frac = t / 6;
      const px = PAD.l + frac * PW;
      const jd = depDates[0] + frac * (depDates[NX-1] - depDates[0]);
      const dateStr = OrbitalMechanics.jdToDate(jd).slice(0, 7);
      ctx.save();
      ctx.translate(px, PAD.t + PH + 12);
      ctx.rotate(Math.PI / 6);
      ctx.fillText(dateStr, 0, 0);
      ctx.restore();
    }

    // Y-Axis (TOF)
    ctx.textAlign = 'right';
    for (let t = 0; t <= 5; t++) {
      const frac = t / 5;
      const py = PAD.t + PH - frac * PH;
      const tof = tofArr[0] + frac * (tofArr[NY-1] - tofArr[0]);
      ctx.fillText(Math.round(tof) + 'd', PAD.l - 8, py + 3);
    }
  }

  function handleHover(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const info = PorkchopPlot.getHoverInfo(canvas, e.clientX - rect.left, e.clientY - rect.top);
    const readout = document.getElementById('readout');
    if (info && readout) {
      const dlaWarning = Math.abs(info.dla) > 28.5 ? ' <span style="color:#ff5050">(High DLA)</span>' : '';
      readout.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div><b>Depart:</b> ${info.depDate}</div>
          <div><b>TOF:</b> ${info.tof} days</div>
          <div><b>C3:</b> ${info.c3} km²/s²</div>
          <div><b>V∞ Arr:</b> ${info.vInfArr} km/s</div>
          <div style="grid-column: span 2;"><b>DLA:</b> ${info.dla}°${dlaWarning}</div>
        </div>
      `;
    }
  }

  function getHoverInfo(canvas, mouseX, mouseY) {
    const m = canvas._plotMeta;
    if (!m) return null;
    const { PAD, PW, PH, NX, NY, depDates, tofArr, grid, arrVinfGrid, dlaGrid } = m;
    const fx = (mouseX - PAD.l) / PW;
    const fy = 1 - (mouseY - PAD.t) / PH;
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;

    const i = Math.min(NX - 1, Math.floor(fx * NX));
    const j = Math.min(NY - 1, Math.floor(fy * NY));

    return {
      depDate: OrbitalMechanics.jdToDate(depDates[i]),
      tof: Math.round(tofArr[j]),
      c3: grid[i * NY + j].toFixed(1),
      vInfArr: arrVinfGrid[i * NY + j].toFixed(2),
      dla: dlaGrid[i * NY + j].toFixed(1)
    };
  }

  return { draw, getHoverInfo };
})();
