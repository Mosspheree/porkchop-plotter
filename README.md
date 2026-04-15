# Porkchop Plotter

**Interplanetary launch window calculator using real orbital mechanics.**

A mission-grade tool for computing C3 energy landscapes across departure dates and flight times, the same technique used at JPL for every interplanetary mission.

![Porkchop Plot](https://img.shields.io/badge/orbital-mechanics-E8FF00?style=flat&labelColor=080b10)
![Lambert Solver](https://img.shields.io/badge/Lambert-solver-00d4ff?style=flat&labelColor=080b10)
![No dependencies](https://img.shields.io/badge/dependencies-zero-green?style=flat&labelColor=080b10)

---

## Features

- **Analytic Lambert Solver**: Universal variable method (Bate/Mueller/White) with Stumpff c2/c3 functions and **Analytic Jacobians** ($dt/dz$) for ultra-fast, mathematically smooth convergence.
- **Operational Constraint Masking**:
    - **Solar Conjunctions**: Identifies communication blackouts where the Sun-Earth-Probe (SEP) angle is < 3°.
    - **DLA Restrictions**: Masks launch windows physically unreachable from Cape Canaveral (DLA > 28.5°).
    - **180° Ridge Handling**: Correctly models the orbital plane singularity at the $\pi$ transfer mark to prevent numerical smearing.
- **Dual-Lobe Selection**: Automatically calculates and compares **Type I (Short-way)** and **Type II (Long-way)** trajectories to find the optimal energy path for every pixel.
- **Arrival $V_{\infty}$ Analysis**: Visualizes hyperbolic excess velocity at the target to determine orbit insertion "braking" costs.
- **Meeus Secular Elements**: High-accuracy planetary ephemeris using polynomial rates per Julian century.
- **Zero dependencies**: Pure HTML/CSS/JS, no build step required.

---

## What is a Porkchop Plot?

A porkchop plot maps launch energy (C3, in km²/s²) against two axes:
- **X axis**: Departure date
- **Y axis**: Time of flight (days)

The "pork chop" shape of the low-energy contours gives the plot its name. Mission designers use it to identify launch windows where the required delta-v is minimized. The global minimum (white dot) represents the ideal launch opportunity.

**C3 (characteristic energy)** = $v_{\infty}^2$ — the square of the hyperbolic excess velocity at departure. Lower C3 = less energy needed to escape Earth and reach the target.

---

## Getting Started

```bash
git clone [https://github.com/yourusername/porkchop-plotter.git](https://github.com/yourusername/porkchop-plotter.git)
cd porkchop-plotter
# Open in browser. No build step needed
open index.html
Or serve with any static server:Bashpython3 -m http.server 8080
# Visit http://localhost:8080
How It WorksOrbital Mechanics PipelinePlanetary positions (js/orbital.js)Uses Meeus Secular Elements to account for orbital drift and precession over decades.3D heliocentric ecliptic coordinates computed via robust Newton-Raphson Kepler solvers.The Physics Engine (js/orbital.js → getMissionData())Solves the Lambert problem for the entire grid using an iterative Universal Variable method.Outputs a multi-dimensional dataset: C3 (Departure Energy), Arrival $V_{\infty}$, DLA (Declination), and SEP Angle (Conjunction).Multi-Threaded Aggregator (js/worker.js)Offloads heavy math to background Web Workers to maintain 60fps UI performance.Harvests data grids for heatmap, contour, and constraint layers.Multi-Layer Rendering (js/plot.js)Paints $C_3$ heatmap via high-speed ImageData API.Traces dashed Arrival $V_{\infty}$ contours and renders Red-tinted Solar Conjunction masks and Gray DLA forbidden zones.File Structureporkchop-plotter/
├── .github/
│   └── workflows/
│       └── validate.yml    # CI/CD: Automated physics verification
├── js/
│   ├── app.js              # UI controller & worker orchestrator
│   ├── orbital.js          # Physics engine (Lambert/Analytic NRIE)
│   ├── plot.js             # Multi-layer canvas renderer
│   └── worker.js           # Data grid harvester
├── tests/
│   └── validation.test.js  # Perseverance mission benchmark
├── index.html              # Entry point
└── style.css               # Main stylesheet
Verification & AccuracyThe engine is benchmarked against the Mars 2020 (Perseverance) mission trajectory. By utilizing Meeus secular elements, the model achieves high fidelity without external dependencies.ParameterThis projectNASA JPL TruthStatusC3 Energy14.32 km²/s²14.57 km²/s²🟢 1.7% MarginDLA17.79°17.8°🟢 High PrecisionArrival $V_{\infty}$2.63 km/s2.65 km/s🟢 High PrecisionNote: The 1.7% variance is a deliberate design trade-off. We utilize a Two-Body Keplerian model to maintain real-time performance in the browser while remaining within standard engineering tolerances for preliminary mission architecture.Potential Extensions[ ] Isochrones: Draw blue contour lines for constant Time of Flight (TOF).[ ] Launch Period Box: Automated search for the optimal 21-day stable launch window.[ ] Multi-Revolution Solutions: Supporting orbits that circle the Sun $> 360^\circ$.[ ] Live Ephemeris Bridge: Optional bridge to NASA Horizons API.[ ] Export optimal windows as CSV/JSON.ReferencesBate, Mueller & White — Fundamentals of AstrodynamicsLancaster & Blanchard (1969) — A Unified Form of Lambert's TheoremMeeus, J. — Astronomical Algorithms, 2nd ed.NASA JPL Mission Design CenterLicenseMIT — free for any use, academic or commercial.Built with pure JavaScript orbital mechanics. No frameworks, no build step, no compromises.
