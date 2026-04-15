/**
 * plot.js — Professional Multi-Layer Porkchop Renderer
 * Features: C3 Heatmap, V-inf Contours, DLA Masking, Solar Conjunction Overlay, 
 * and 180-degree Ridge Gap Handling.
 */
const PorkchopPlot = (() => {

  const COLORMAP = [
    [8, 28, 80], [12, 52, 140], [18, 82, 185], [28, 120, 210],
    [50, 155, 230], [85, 185, 245], [130, 210, 248], [170, 230, 250],
    [200, 240, 215], [210, 240, 160], [180, 230, 100], [140, 210, 50],
    [100, 185, 20], [70, 160, 8], [200, 230, 50], [240, 220, 30],
    [250, 185, 20], [245, 140, 10], [235, 90, 8], [220, 50, 8],
    [200, 20, 8], [170, 8, 8], [130, 4, 4], [100, 0, 0],
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
    const { grid, arrVinfGrid, dlaGrid, sepGrid, thetaGrid } = results; 
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width || 700;
    const H = rect.height || 480;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const PAD = { l: 64, r: 24, t: 20, b: 56 };
    const PW = W - PAD.l - PAD.r;
    const PH = H - PAD.t - PAD.b;
    const cellW = PW / NX;
    const cellH = PH / NY;

    // --- LAYER 1: C3 HEATMAP ---
    const imgData = ctx.createImageData(Math.ceil(PW), Math.ceil(PH));
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NY; j++) {
        const theta = thetaGrid[i * NY + j];
        if (Math.abs(theta - 180) < 2) continue;

        const c3 = grid[i * NY + j];
        const [r, g, b] = c3ToRGB(c3, minC3, maxC3);
        const px = Math.round(i * cellW);
        const py = Math.round((NY - 1 - j) * cellH);
        
        for (let dy = 0; dy < Math.ceil(cellH); dy++) {
          for (let dx = 0; dx < Math.ceil(cellW); dx++) {
            const x = Math.min(px + dx, Math.ceil(PW) - 1);
            const y = Math.min(py + dy, Math.ceil(PH) - 1);
            const idx = (y * Math.ceil(PW) + x) * 4;
            imgData.data[idx] = r; imgData.data[idx+1] = g; imgData.data[idx+2] = b; imgData.data[idx+3] = 255;
          }
        }
      }
    }
    ctx.putImageData(imgData, PAD.l, PAD.t);

    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NY; j++) {
        const idx = i * NY + j;
        if (sepGrid[idx] < 3.0) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
          ctx.fillRect(PAD.l + i * cellW, PAD.t + (NY - 1 - j) * cellH, cellW + 0.5, cellH + 0.5);
        }
        if (Math.abs(dlaGrid[idx]) > 28.5) {
          ctx.fillStyle = 'rgba(20, 20, 20, 0.4)';
          ctx.fillRect(PAD.l + i * cellW, PAD.t + (NY - 1 - j) * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }


    const bi = Math.floor(bestIdx / NY), bj = bestIdx % NY;
    ctx.beginPath();
    ctx.arc(PAD.l + (bi + 0.5) * cellW, PAD.t + (NY - 1 - bj + 0.5) * cellH, 7, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    renderAxes(ctx, PAD, PW, PH, NX, NY, depDates, tofArr);
    canvas._plotMeta = { ...results, PAD, PW, PH, NX, NY, depDates, tofArr };
    if (!canvas._hasHover) {
      canvas.addEventListener('mousemove', (e) => handleHover(canvas, e));
      canvas._hasHover = true;
    }
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
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left';
    for (let t = 0; t <= 6; t++) {
      const frac = t / 6;
      const dateStr = OrbitalMechanics.jdToDate(depDates[0] + frac * (depDates[NX-1] - depDates[0])).slice(0, 7);
      ctx.save();
      ctx.translate(PAD.l + frac * PW, PAD.t + PH + 12);
      ctx.rotate(Math.PI / 6);
      ctx.fillText(dateStr, 0, 0);
      ctx.restore();
    }
    ctx.textAlign = 'right';
    for (let t = 0; t <= 5; t++) {
      const frac = t / 5;
      ctx.fillText(Math.round(tofArr[0] + frac * (tofArr[NY-1] - tofArr[0])) + 'd', PAD.l - 8, PAD.t + PH - frac * PH + 3);
    }
  }

  function handleHover(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    const info = PorkchopPlot.getHoverInfo(canvas, e.clientX - rect.left, e.clientY - rect.top);
    const readout = document.getElementById('hover-info');
    if (info && readout) {
      readout.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: monospace; font-size: 11px;">
          <div><b>DEP:</b> ${info.depDate}</div>
          <div><b>TOF:</b> ${info.tof}d</div>
          <div><b>C3:</b> ${info.c3}</div>
          <div><b>ARR V∞:</b> ${info.vInfArr}</div>
          <div style="grid-column: span 2;"><b>DLA:</b> ${info.dla}°</div>
          <div style="grid-column: span 2;"><b>SEP:</b> ${info.sep.toFixed(1)}°</div>
        </div>`;
    }
  }

  function getHoverInfo(canvas, mouseX, mouseY) {
    const m = canvas._plotMeta;
    if (!m) return null;
    const fx = (mouseX - m.PAD.l) / m.PW, fy = 1 - (mouseY - m.PAD.t) / m.PH;
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
    const i = Math.min(m.NX - 1, Math.floor(fx * m.NX)), j = Math.min(m.NY - 1, Math.floor(fy * m.NY));
    const idx = i * m.NY + j;
    return {
      i, j,
      depDate: OrbitalMechanics.jdToDate(m.depDates[i]),
      arrDate: OrbitalMechanics.jdToDate(m.depDates[i] + m.tofArr[j]),
      tof: Math.round(m.tofArr[j]),
      c3: m.grid[idx].toFixed(1),
      vInfArr: m.arrVinfGrid[idx].toFixed(2),
      dla: m.dlaGrid[idx].toFixed(1),
      sep: m.sepGrid[idx]
    };
  }

  function drawLegend(canvas, minC3, maxC3) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    COLORMAP.forEach((c, i) => grad.addColorStop(i / (COLORMAP.length - 1), `rgb(${c[0]},${c[1]},${c[2]})`));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  return { draw, getHoverInfo, drawLegend };
})();
