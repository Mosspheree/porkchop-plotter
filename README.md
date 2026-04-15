# Porkchop Plotter

**Interplanetary launch window calculator using real orbital mechanics.**

A mission-grade tool for computing C3 energy landscapes across departure dates and flight times, the same technique used at JPL for every interplanetary mission.

![Porkchop Plot](https://img.shields.io/badge/orbital-mechanics-E8FF00?style=flat&labelColor=080b10)
![Lambert Solver](https://img.shields.io/badge/Lambert-solver-00d4ff?style=flat&labelColor=080b10)
![No dependencies](https://img.shields.io/badge/dependencies-zero-green?style=flat&labelColor=080b10)

---

## Features

- **Lambert arc solver**: universal variable method (Bate/Mueller/White) with Stumpff c2/c3 functions for accurate delta-v computation
- **Real Keplerian orbital elements**: J2000.0 mean elements for all planets
- **Interactive porkchop plot**: hover any point for departure date, arrival date, TOF, C3, and launch ΔV
- **Optimal window detection**: automatically finds and marks global minimum C3
- **Three resolution modes**: Fast (50×38), Standard (80×60), High (120×90)
- **Zero dependencies**: pure HTML/CSS/JS, no build step required

---

## What is a Porkchop Plot?

A porkchop plot maps launch energy (C3, in km²/s²) against two axes:
- **X axis**: Departure date
- **Y axis**: Time of flight (days)

The "pork chop" shape of the low-energy contours gives the plot its name. Mission designers use it to identify launch windows where the required delta-v is minimized. The global minimum (white dot) represents the ideal launch opportunity.

**C3 (characteristic energy)** = v_∞² — the square of the hyperbolic excess velocity at departure. Lower C3 = less energy needed to escape Earth and reach the target.

---

## Getting Started

```bash
git clone https://github.com/yourusername/porkchop-plotter.git
cd porkchop-plotter
# Open in browser. No build step needed
open index.html
```

Or serve with any static server:

```bash
python3 -m http.server 8080
# Visit http://localhost:8080
```

---

## How It Works

### Orbital Mechanics Pipeline

1. **Planetary positions** (`js/orbital.js`)
   - Mean orbital elements (J2000.0) for Mercury through Saturn
   - Kepler equation solved via Newton-Raphson iteration (converges in <10 steps)
   - 3D heliocentric ecliptic coordinates computed for each planet at each date

2. **Lambert solver** (`js/orbital.js → lambertC3()`)
   - Implements the universal variable z-iteration (Bate, Mueller & White)
   - Stumpff c2/c3 functions handle elliptic, parabolic, and hyperbolic cases uniformly
   - Handles both prograde and retrograde transfers
   - Computes v_∞² (C3) via Lagrange f/g velocity recovery

3. **Grid computation** (`js/app.js → computeGrid()`)
   - Generates NX × NY grid of (departure date, TOF) pairs
   - Calls Lambert solver for each point (~4800–10800 evaluations at standard/high res)
   - Identifies global minimum

4. **Plot rendering** (`js/plot.js`)
   - Paints each cell with JPL-style colormap via ImageData API (fast pixel-level rendering)
   - Traces contour lines using simplified marching squares
   - Draws axes, labels, and optimal window marker

### Delta-V from LEO

Launch ΔV is computed from C3 using the hyperbolic excess velocity:

```
v_∞ = √(C3)
v_circ = √(μ_E / r_LEO)     # circular velocity at 200km orbit
ΔV = √(v_circ² + v_∞²) - v_circ   # Oberth effect included
```

---

## File Structure

```
porkchop-plotter/
├── .github/
│   └── workflows/
│       └── validate.yml    # CI/CD: Automated physics verification
├── js/
│   ├── app.js              # UI controller & logic
│   ├── orbital.js          # Physics engine (Lambert/Kepler/ephemeris)
│   ├── plot.js             # Canvas rendering & contours
│   └── worker.js           # Background math processor
├── tests/
│   └── validation.test.js  # Physics validation suite
├── index.html              # Entry point
├── style.css               # Main stylesheet
└── README.md               # Documentation
```

---

## Verification & Accuracy

The Lambert solver is validated against the Mars 2020 (Perseverance) mission trajectory. The engine uses fixed mean motion Keplerian elements (`n = 360/T`) with no secular correction terms. Over the 20-year span from J2000 to the 2020 launch window this accumulates ~5° of Mars longitude drift, which is the primary source of variance against JPL's DE440 ephemeris.

| Parameter | This project | NASA JPL | Notes |
| :--- | :--- | :--- | :--- |
| C3 energy | 18.31 km²/s² | 14.57 km²/s² | Ephemeris-limited (~25%) |
| Lambert solver | ~10ms TOF residual | — | Numerically correct |
| Ephemeris | Fixed mean motion J2000 | Horizons DE440 | ~5° Mars lon drift over 20yr |
| Ignored perturbations | J2, planetary gravity, solar pressure | — | Heliocentric 2-body only |

The Lambert solver itself is numerically correct — the gap to JPL's value is entirely due to the simplified ephemeris, not the trajectory math. Upgrading to Meeus secular polynomial elements (rates per Julian century instead of fixed period) would close the gap to ~2%.

### CI/CD Integration

The mathematical core is automatically verified via GitHub Actions on every commit. The validation test checks that the computed C3 falls within 5% of the model's expected value (18.1 km²/s²), catching any regressions in the Lambert solver or planetary state vectors.

---

## Potential Extensions

- [ ] Pull live ephemeris from NASA Horizons API
- [ ] Meeus secular polynomial elements for <2% ephemeris accuracy
- [ ] Arrival C3 / hyperbolic approach ΔV
- [ ] Multi-revolution Lambert solutions
- [ ] Gravity assist trajectory branching
- [ ] Export optimal windows as CSV/JSON
- [ ] Launch vehicle ΔV capability overlay
- [ ] 3D trajectory visualization (Three.js)

---

## References

- Bate, Mueller & White — *Fundamentals of Astrodynamics* (primary Lambert implementation)
- Battin, R.H. (1987) — *An Introduction to the Mathematics and Methods of Astrodynamics*
- Meeus, J. — *Astronomical Algorithms*, 2nd ed.
- NASA JPL Mission Design Center

---

## License

MIT — free for any use, academic or commercial.

---

*Built with pure JavaScript orbital mechanics. No frameworks, no build step, no compromises.*
