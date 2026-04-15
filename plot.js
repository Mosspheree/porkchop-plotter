/**
 * plot.js — Porkchop plot renderer
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

  function draw(canvas, grid, NX, NY, depDates, tofArr, minC3, maxC3, bestIdx) {
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
    ctx.imageSmoothingEnabled = false;

    const PAD = { l: 64, r: 24, t: 20, b: 56 };
    const PW = W - PAD.l - PAD.r;
    const PH = H - PAD.t - PAD.b;

    const cellW = PW / NX;
    const cellH = PH / NY;
    const imgData = ctx.createImageData(Math.ceil(PW), Math.ceil(PH));

    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NY; j++) {
        const c3 = grid[i * NY + j];
        const [r, g, b] = c3ToRGB(c3, minC3, maxC3);
        const px = Math.round(i * cellW);
        const py = Math.round((NY - 1 - j) * cellH);
        const cw = Math.max(1, Math.round(cellW) + 1);
        const ch = Math.max(1, Math.round(cellH) + 1);
        for (let dy = 0; dy < ch; dy++) {
          for (let dx = 0; dx < cw; dx++) {
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

    const contourStep = (maxC3 - minC3) < 60 ? 5 : 10;
    const contourStart = Math.ceil(minC3 / contourStep) * contourStep;
    ctx.lineWidth = 0.7;

    for (let lev = contourStart; lev < maxC3; lev += contourStep) {
      ctx.beginPath();
      ctx.strokeStyle = lev < minC3 + (maxC3 - minC3) * 0.35 ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)';
      let labelPlaced = false;
      for (let i = 0; i < NX - 1; i++) {
        for (let j = 0; j < NY - 1; j++) {
          const v00 = grid[i * NY + j];
          const v10 = grid[(i+1) * NY + j];
          const v01 = grid[i * NY + (j+1)];
          const v11 = grid[(i+1) * NY + (j+1)];
          const above = [v00 > lev, v10 > lev, v11 > lev, v01 > lev];
          const nAbove = above.filter(Boolean).length;
          if (nAbove === 0 || nAbove === 4) continue;
          const x0 = PAD.l + i * cellW;
          const y0 = PAD.t + (NY - 1 - j) * cellH;
          ctx.moveTo(x0 + cellW * 0.1, y0 + cellH * 0.5);
          ctx.lineTo(x0 + cellW * 0.9, y0 + cellH * 0.5);
          if (!labelPlaced && i % 12 === 0 && j % 10 === 0) {
            const bright = lev < minC3 + (maxC3 - minC3) * 0.35;
            ctx.save();
            ctx.font = 'bold 9px Space Mono, monospace';
            ctx.fillStyle = bright ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.6)';
            ctx.fillText(lev.toFixed(0), x0 + 2, y0 - 2);
            ctx.restore();
            labelPlaced = true;
          }
        }
      }
      ctx.stroke();
    }

    const bi = Math.floor(bestIdx / NY);
    const bj = bestIdx % NY;
    const bx = PAD.l + (bi + 0.5) * cellW;
    const by = PAD.t + (NY - 1 - bj + 0.5) * cellH;
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.l, PAD.t);
    ctx.lineTo(PAD.l, PAD.t + PH);
    ctx.lineTo(PAD.l + PW, PAD.t + PH);
    ctx.stroke();

    ctx.font = '10px Space Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'left';
    const nXTicks = Math.min(7, NX);
    for (let t = 0; t <= nXTicks; t++) {
      const frac = t / nXTicks;
      const px = PAD.l + frac * PW;
      const jd = depDates[0] + frac * (depDates[NX-1] - depDates[0]);
      const dateStr = OrbitalMechanics.jdToDate(jd).slice(0, 7);
      ctx.save();
      ctx.translate(px, PAD.t + PH + 10);
      ctx.rotate(Math.PI / 5);
      ctx.fillText(dateStr, 0, 0);
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(px, PAD.t + PH);
      ctx.lineTo(px, PAD.t + PH + 4);
      ctx.stroke();
    }

    ctx.textAlign = 'right';
    const nYTicks = 6;
    for (let t = 0; t <= nYTicks; t++) {
      const frac = t / nYTicks;
      const py = PAD.t + PH - frac * PH;
      const tof = tofArr[0] + frac * (tofArr[NY-1] - tofArr[0]);
      ctx.fillText(Math.round(tof) + 'd', PAD.l - 6, py + 4);
      ctx.beginPath();
      ctx.moveTo(PAD.l - 4, py);
      ctx.lineTo(PAD.l, py);
      ctx.stroke();
    }

    canvas._plotMeta = { PAD, PW, PH, NX, NY, depDates, tofArr, grid, minC3, maxC3, cellW, cellH };

    // Initialize Hover Listener
    if (!canvas._hasHover) {
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const info = PorkchopPlot.getHoverInfo(canvas, e.clientX - rect.left, e.clientY - rect.top);
            const readout = document.getElementById('readout');
            if (info && readout) {
                readout.innerHTML = `
                    <b>Departure:</b> ${info.depDate}<br>
                    <b>Arrival:</b> ${info.arrDate}<br>
                    <b>TOF:</b> ${info.tof} days<br>
                    <b>C3 Energy:</b> ${info.c3} km²/s²
                `;
            }
        });
        canvas._hasHover = true;
    }
  }

  function drawLegend(canvas, minC3, maxC3) {
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    for (let x = 0; x < W; x++) {
      const c3 = minC3 + (x / W) * (maxC3 - minC3);
      const [r, g, b] = c3ToRGB(c3, minC3, maxC3);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, 0, 1, H);
    }
  }

  function getHoverInfo(canvas, mouseX, mouseY) {
    const m = canvas._plotMeta;
    if (!m) return null;
    const { PAD, PW, PH, NX, NY, depDates, tofArr, grid } = m;
    const fx = (mouseX - PAD.l) / PW;
    const fy = 1 - (mouseY - PAD.t) / PH;
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
    const i = Math.min(NX - 1, Math.floor(fx * NX));
    const j = Math.min(NY - 1, Math.floor(fy * NY));
    const c3 = grid[i * NY + j];
    const depJD = depDates[i];
    const tof = tofArr[j];
    const depDate = OrbitalMechanics.jdToDate(depJD);
    const arrDate = OrbitalMechanics.jdToDate(depJD + tof);
    return { depDate, arrDate, tof: Math.round(tof), c3: c3.toFixed(1), i, j };
  }

  return { draw, drawLegend, getHoverInfo };
})();
