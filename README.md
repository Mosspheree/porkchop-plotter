# Porkchop Plotter

**Interplanetary launch window calculator using real orbital mechanics.**

A mission-grade tool for computing C3 energy landscapes across departure dates and flight times, the same technique used at JPL for every interplanetary mission.

![Porkchop Plot](https://img.shields.io/badge/orbital-mechanics-E8FF00?style=flat&labelColor=080b10)
![Lambert Solver](https://img.shields.io/badge/Lambert-solver-00d4ff?style=flat&labelColor=080b10)
![No dependencies](https://img.shields.io/badge/dependencies-zero-green?style=flat&labelColor=080b10)

---

## Features

- **Analytic Lambert Solver**: Universal variable method (Bate/Mueller/White) with Stumpff c2/c3 functions and **Analytic Jacobians** ($dt/dz$) for ultra-fast, smooth convergence.
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
