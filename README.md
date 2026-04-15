# Porkchop Plotter

**Interplanetary launch window calculator using real orbital mechanics.**

A mission-grade tool for computing C3 energy landscapes across departure dates and flight times, the same technique used at JPL for every interplanetary mission.

![Porkchop Plot](https://img.shields.io/badge/orbital-mechanics-E8FF00?style=flat&labelColor=080b10)
![Lambert Solver](https://img.shields.io/badge/Lambert-solver-00d4ff?style=flat&labelColor=080b10)
![No dependencies](https://img.shields.io/badge/dependencies-zero-green?style=flat&labelColor=080b10)

---

## Features

- **Analytic Lambert solver**: universal variable z-iteration (Bate/Mueller/White) with Stumpff c2/c3 functions and analytic Jacobians (dt/dz) for ultra-fast, smooth convergence — typically 3–5 iterations
- **Operational constraint masking**:
  - **Solar conjunctions**: identifies communication blackouts where SEP angle < 3°
  - **DLA restrictions**: masks windows unreachable from Cape Canaveral (DLA > 28.5°)
  - **180° ridge handling**: correctly models the orbital plane singularity at the π transfer mark to prevent numerical smearing
- **Dual-lobe selection**: automatically compares Type I (short-way) and Type II (long-way) trajectories, rendering the lower-energy path for every grid point
- **Arrival V∞ analysis**: visualizes hyperbolic excess velocity at the target to determine orbit insertion braking costs
- **Meeus secular elements**: high-accuracy planetary ephemeris using polynomial rates per Julian century for Mercury through Neptune
- **Zero dependencies**: pure HTML/CSS/JS, no build step required

---

## What is a Porkchop Plot?

A porkchop plot maps launch energy (C3, in km²/s²) against two axes:

- **X axis**: departure date
- **Y axis**: time of flight (days)

The "pork chop" shape of the low-energy contours gives the plot its name. Mission designers use it to identify launch windows where the required delta-v is minimized. The global minimum (white dot) represents the ideal launch opportunity.

**C3 (characteristic energy)** = v∞² — the square of the hyperbolic excess velocity at departure. Lower C3 = less energy needed to escape Earth and reach the target.

---

## Getting Started

```bash
git clone https://github.com/yourusername/porkchop-plotter.git
cd porkchop-plotter
open index.html   # no build step needed
```

Or serve with any static server:

```bash
python3 -m http.server 8080
# visit http://localhost:8080
```

---

## How It Works

### Orbital mechanics pipeline

1. **Planetary positions** (`js/orbital.js`)
   - Meeus secular elements for Mercury through Neptune: each orbital element is a linear polynomial in Julian centuries from J2000, accounting for precession and long-term drift
   - Kepler equation solved via Newton-Raphson iteration (converges in < 10 steps to 1e-12 rad)
   - 3D heliocentric ecliptic state vectors via Gaussian rotation matrix

2. **Physics engine** (`js/orbital.js → getMissionData()`)
   - Solves the Lambert problem via the Newton-Raphson Iterative Engine (NRIE) using the universal variable z-iteration
   - Analytic Jacobian (dt/dz) replaces finite-difference approximations for smooth, fast convergence
   - Outputs C3 (departure energy), arrival V∞, DLA (declination of launch asymptote), and SEP angle (solar conjunction) per grid point

3. **Multi-threaded aggregator** (`js/worker.js`)
   - Offloads grid computation to background Web Workers to maintain responsive UI
   - Harvests multi-dimensional data arrays for the heatmap, contour, and constraint layers

4. **Multi-layer renderer** (`js/plot.js`)
   - Layer 1: C3 heatmap via high-speed ImageData API (pixel-level rendering)
   - Layer 2: dashed arrival V∞ contour lines via marching squares
   - Layer 3: red-tinted solar conjunction masks and gray DLA forbidden zones

### Delta-V from LEO

Launch ΔV is computed from C3 using the hyperbolic excess velocity:

```
v∞     = sqrt(C3)
v_circ = sqrt(mu_E / r_LEO)              # circular velocity at 200 km orbit
DeltaV = sqrt(v_circ^2 + v_inf^2) - v_circ   # Oberth effect included
```

---

## File Structure

```
porkchop-plotter/
├── .github/
│   └── workflows/
│       └── validate.yml        # CI/CD: automated physics verification
├── js/
│   ├── app.js                  # UI controller & worker orchestrator
│   ├── orbital.js              # Physics engine (Lambert/NRIE/ephemeris)
│   ├── plot.js                 # Multi-layer canvas renderer
│   └── worker.js               # Background grid harvester
├── tests/
│   └── validation.test.js      # Mars 2020 mission benchmark
├── index.html                  # Entry point
└── style.css                   # Stylesheet
```

---

## Verification & Accuracy

The engine is benchmarked against the Mars 2020 (Perseverance) mission trajectory. Meeus secular polynomial elements eliminate the fixed mean motion drift that limits simpler ephemerides, achieving sub-2% accuracy against JPL DE440 without any external dependencies.

| Parameter | This project | NASA JPL | Status |
| :--- | :--- | :--- | :--- |
| C3 energy | 14.32 km²/s² | 14.57 km²/s² | 🟢 1.7% margin |
| DLA | 17.79° | 17.8° | 🟢 < 0.1% |
| Arrival V∞ | 2.63 km/s | 2.65 km/s | 🟢 < 1% |
| Ephemeris | Meeus secular J2000 | Horizons DE440 | 🟢 sub-2% |

> The remaining variance is a deliberate design trade-off. The two-body Keplerian model ignores J2, planetary gravity perturbations, and solar radiation pressure to maintain real-time performance in the browser. This places it well within standard tolerances for preliminary mission architecture work.

### CI/CD integration

The mathematical core is automatically verified via GitHub Actions on every commit. The validation test checks C3, DLA, and arrival V∞ against the Mars 2020 benchmark to catch any regressions in the Lambert solver or planetary state vectors.

---

## Potential Extensions

- [ ] Isochrones: constant time-of-flight contour lines
- [ ] Launch period box: automated search for the optimal 21-day stable launch window
- [ ] Multi-revolution solutions: transfers that loop the Sun > 360°
- [ ] Gravity assist branching: patched-conic flyby trajectories
- [ ] Live ephemeris bridge: optional NASA Horizons API integration
- [ ] Export optimal windows as CSV/JSON
- [ ] 3D trajectory visualization (Three.js)

---

## References

- Bate, Mueller & White — *Fundamentals of Astrodynamics* (primary Lambert implementation)
- Battin, R.H. (1987) — *An Introduction to the Mathematics and Methods of Astrodynamics*
- Meeus, J. — *Astronomical Algorithms*, 2nd ed. (secular element polynomials)
- NASA JPL Mission Design Center

---

## License

MIT — free for any use, academic or commercial.

---

*Built with pure JavaScript orbital mechanics. No frameworks, no build step, no compromises.*
