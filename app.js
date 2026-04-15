/**
 * app.js — Application controller
 * * Wires together orbital mechanics, plot renderer, and UI.
 * Handles:
 * - Grid computation (Web Worker interface)
 * - UI state & event listeners
 * - Orbit animation on canvas
 * - Hover crosshair
 */

// ── State ──────────────────────────────────────────────────────────────
let state = {
  grid: null,
  NX: 0, NY: 0,
  depDates: [],
  tofArr: [],
  minC3: 0, maxC3: 100,
  bestIdx: 0,
  origin: 'earth',
  dest: 'mars',
};

// Initialize Web Worker
const worker = new Worker('worker.js');

// ── DOM refs ───────────────────────────────────────────────────────────
const canvas = document.getElementById('porkchop');
const legendCanvas = document.getElementById('legend-bar');
const hoverInfo = document.getElementById('hover-info');
const computeBtn = document.querySelector('.compute-btn');
const plotTitle = document.getElementById('plot-title');

// ── Compute ────────────────────────────────────────────────────────────
function compute() {
  const origin = document.getElementById('origin').value;
  const dest = document.getElementById('dest').value;
  const startYear = parseInt(document.getElementById('startYear').value);
  const windowMonths = parseInt(document.getElementById('windowMonths').value);
  const res = parseInt(document.querySelector('input[name="res"]:checked').value);

  if (origin === dest) {
    hoverInfo.textContent = 'Origin and destination cannot be the same.';
    return;
  }

  // UI Feedback
  computeBtn.classList.add('loading');
  computeBtn.innerHTML = '<span class="btn-icon">⟳</span> 0%';

  // 1. Prepare Data for Worker (Hohmann Heuristic)
  const p1 = OrbitalMechanics.PLANETS[origin];
  const p2 = OrbitalMechanics.PLANETS[dest];

  const hohmann = Math.PI * Math.sqrt(((p1.a + p2.a) / 2) ** 3) * 365.25 / (2 * Math.PI);
  const minTOF = Math.max(30, hohmann * 0.38);
  const maxTOF = Math.min(hohmann * 4.0, 1400);

  const startJD = OrbitalMechanics.dateToJD(startYear, 1, 1);
  const endJD = startJD + windowMonths * 30.44;

  const NX = res;
  const NY = Math.round(res * 0.75);

  const depDates = [];
  for (let i = 0; i < NX; i++) depDates.push(startJD + (i / (NX - 1)) * (endJD - startJD));

  const tofArr = [];
  for (let j = 0; j < NY; j++) tofArr.push(minTOF + (j / (NY - 1)) * (maxTOF - minTOF));

  // 2. Post to Worker
  const t0 = performance.now();
  worker.postMessage({ origin, dest, depDates, tofArr, NX, NY });

  // 3. Handle Worker Response
  worker.onmessage = function(e) {
    if (e.data.type === 'progress') {
      computeBtn.innerHTML = `<span class="btn-icon">⟳</span> ${e.data.percent}%`;
    } 
    else if (e.data.type === 'result') {
      const elapsed = (performance.now() - t0).toFixed(0);
      const { grid, minC3, maxC3, bestIdx } = e.data;

      // Update Global State
      state = { grid, NX, NY, depDates, tofArr, minC3, maxC3, bestIdx, origin, dest };

      // Update UI Header
      const originName = origin.charAt(0).toUpperCase() + origin.slice(1);
      const destName = dest.charAt(0).toUpperCase() + dest.slice(1);
      plotTitle.textContent = `${originName} → ${destName} Porkchop Plot`;

      // Draw Plot and Metrics
      updateMetrics(state);
      PorkchopPlot.draw(canvas, grid, NX, NY, depDates, tofArr, minC3, maxC3, bestIdx);
      PorkchopPlot.drawLegend(legendCanvas, minC3, maxC3);

      document.getElementById('compute-time').textContent = 
        `Computed in ${elapsed}ms · ${NX}×${NY} grid`;

      computeBtn.classList.remove('loading');
      computeBtn.innerHTML = '<span class="btn-icon">&#9654;</span> Compute Launch Windows';
    }
  };
}

/**
 * Update metric cards from computed result.
 */
function updateMetrics(result) {
  const { depDates, tofArr, minC3, bestIdx, NY } = result;
  const bi = Math.floor(bestIdx / NY);
  const bj = bestIdx % NY;

  const depJD = depDates[bi];
  const tof = tofArr[bj];
  const arrJD = depJD + tof;

  const depDate = OrbitalMechanics.jdToDate(depJD);
  const arrDate = OrbitalMechanics.jdToDate(arrJD);
  const dv = OrbitalMechanics.c3ToDeltaV(minC3);
  const ttype = OrbitalMechanics.transferType(state.origin, state.dest, tof);

  document.getElementById('m-dep').textContent = depDate.slice(0, 7);
  document.getElementById('m-arr').textContent = arrDate.slice(0, 7);
  document.getElementById('m-tof').textContent = Math.round(tof);
  document.getElementById('m-c3').textContent = minC3.toFixed(1);
  document.getElementById('m-dv').textContent = dv.toFixed(2);
  document.getElementById('m-type').textContent = ttype;
}

// ── Hover interaction ──────────────────────────────────────────────────
canvas.addEventListener('mousemove', (e) => {
  if (!state.grid) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const info = PorkchopPlot.getHoverInfo(canvas, mx, my);
  
  if (!info) {
    hoverInfo.textContent = 'Hover over the plot to inspect any trajectory';
    return;
  }
  
  const dv = OrbitalMechanics.c3ToDeltaV(parseFloat(info.c3));
  hoverInfo.textContent = 
    `Dep: ${info.depDate}  →  Arr: ${info.arrDate}  |  TOF: ${info.tof}d  |  C3: ${info.c3} km²/s²  |  ΔV: ${dv.toFixed(2)} km/s`;
});

canvas.addEventListener('mouseleave', () => {
  hoverInfo.textContent = 'Hover over the plot to inspect any trajectory';
});

// Rerender on resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.grid) {
      PorkchopPlot.draw(canvas, state.grid, state.NX, state.NY, state.depDates, state.tofArr, state.minC3, state.maxC3, state.bestIdx);
    }
  }, 150);
});

// ── Hero orbit animation ───────────────────────────────────────────────
function initOrbitArt() {
  const c = document.getElementById('orbit-art');
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const cx = W / 2, cy = H / 2;

  const orbits = [
    { r: 40,  speed: 0.025, angle: 0.2,  color: '#7EB8F7', dotR: 4  },
    { r: 68,  speed: 0.016, angle: 1.0,  color: '#E8A87C', dotR: 5  },
    { r: 100, speed: 0.010, angle: 2.5,  color: '#F28B60', dotR: 6  },
  ];

  let transferAngle = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Sun
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#E8FF00';
    ctx.fill();
    ctx.shadowColor = '#E8FF00';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Orbits + planets
    orbits.forEach(o => {
      ctx.beginPath();
      ctx.arc(cx, cy, o.r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const px = cx + o.r * Math.cos(o.angle);
      const py = cy + o.r * Math.sin(o.angle);
      ctx.beginPath();
      ctx.arc(px, py, o.dotR, 0, Math.PI * 2);
      ctx.fillStyle = o.color;
      ctx.fill();
    });

    // Transfer arc (Earth → Mars)
    const e = orbits[1], m = orbits[2];
    const ex = cx + e.r * Math.cos(e.angle);
    const ey = cy + e.r * Math.sin(e.angle);
    const mx2 = cx + m.r * Math.cos(m.angle + 1.8);
    const my2 = cy + m.r * Math.sin(m.angle + 1.8);

    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.quadraticCurveTo(cx + 20, cy - 30, mx2, my2);
    ctx.strokeStyle = 'rgba(232,255,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Spacecraft
    const t = (Math.sin(transferAngle) + 1) / 2;
    const sx = ex + t * t * (mx2 - ex) + 2 * t * (1-t) * (cx + 20 - ex);
    const sy = ey + t * t * (my2 - ey) + 2 * t * (1-t) * (cy - 30 - ey);
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#E8FF00';
    ctx.fill();

    orbits.forEach(o => o.angle += o.speed);
    transferAngle += 0.012;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Init ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initOrbitArt();
  document.getElementById('github-link').href = 'https://github.com/Mosspheree/porkchop-plotter';
  compute();
});
