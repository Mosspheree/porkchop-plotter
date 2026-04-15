const OrbitalMechanics = (() => {
  const MU_SUN = 1.32712440018e11;
  const AU = 149597870.7;
  const J2000 = 2451545.0;

  const PLANETS = {
    mercury: { a: 0.38710,  e: 0.20563, T: 87.969,    inc: 7.005,  Omega: 48.331,  w: 29.124,  L0: 252.251 },
    venus:   { a: 0.72333,  e: 0.00677, T: 224.701,   inc: 3.395,  Omega: 76.680,  w: 54.884,  L0: 181.979 },
    earth:   { a: 1.00000,  e: 0.01671, T: 365.250,   inc: 0.000,  Omega: 0.000,   w: 102.937, L0: 100.464 },
    mars:    { a: 1.52368,  e: 0.09340, T: 686.971,   inc: 1.850,  Omega: 49.558,  w: 286.502, L0: 355.453 },
  };

  function solveKepler(M, e) {
    let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
    for (let i = 0; i < 100; i++) {
      const dE = (M - E + e * Math.sin(E)) / (1.0 - e * Math.cos(E));
      E += dE;
      if (Math.abs(dE) < 1e-12) break;
    }
    return E;
  }

  function planetState(name, t_jd) {
    const p = PLANETS[name];
    if (!p) throw new Error(`Unknown planet: ${name}`);
    const L = (p.L0 + 360 * (t_jd - J2000) / p.T) * Math.PI / 180;
    const omega = (p.w) * Math.PI / 180;
    const M = L - omega;
    const E = solveKepler(((M % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI), p.e);
    const nu = 2 * Math.atan2(Math.sqrt(1 + p.e) * Math.sin(E / 2), Math.sqrt(1 - p.e) * Math.cos(E / 2));
    const r = p.a * (1 - p.e * Math.cos(E)) * AU;
    const inc = p.inc * Math.PI / 180;
    const Omega = p.Omega * Math.PI / 180;
    const argp = (p.w - p.Omega) * Math.PI / 180;
    const theta = argp + nu;
    const x = r * (Math.cos(Omega) * Math.cos(theta) - Math.sin(Omega) * Math.sin(theta) * Math.cos(inc));
    const y = r * (Math.sin(Omega) * Math.cos(theta) + Math.cos(Omega) * Math.sin(theta) * Math.cos(inc));
    const z = r * (Math.sin(inc) * Math.sin(theta));
    return { x, y, z, r, nu };
  }

  function lambertC3(origin, dest, t_dep, tof_days) {
    let t_dep_jd = (t_dep instanceof Date) ? (t_dep.getTime() / 86400000) + 2440587.5 : t_dep;
    const s1 = planetState(origin, t_dep_jd);
    const s2 = planetState(dest, t_dep_jd + tof_days);
    const r1 = Math.sqrt(s1.x**2 + s1.y**2 + s1.z**2);
    const r2 = Math.sqrt(s2.x**2 + s2.y**2 + s2.z**2);
    const c = Math.sqrt((s2.x-s1.x)**2 + (s2.y-s1.y)**2 + (s2.z-s1.z)**2);
    const s = (r1 + r2 + c) / 2;
    const lambda = Math.sqrt(1 - c / s) * (s1.x * s2.y - s1.y * s2.x >= 0 ? 1 : -1);
    const tof_sec = tof_days * 86400;

    let x = 0; 
    for (let i = 0; i < 80; i++) {
      const alpha = 2 * Math.acos(Math.max(-1, Math.min(1, x)));
      const beta = 2 * Math.asin(Math.max(-1, Math.min(1, lambda * Math.sqrt(1 - x*x))));
      const t_x = Math.sqrt(s**3 / (8*MU_SUN)) * (alpha - Math.sin(alpha) - (beta - Math.sin(beta)));
      const dt = t_x - tof_sec;
      if (Math.abs(dt) / tof_sec < 1e-7) break;
      const dx_step = 1e-5;
      const xp = Math.max(-0.99, Math.min(0.99, x + dx_step));
      const alpha_p = 2 * Math.acos(xp);
      const beta_p = 2 * Math.asin(lambda * Math.sqrt(1 - xp*xp));
      const t_xp = Math.sqrt(s**3 / (8*MU_SUN)) * (alpha_p - Math.sin(alpha_p) - (beta_p - Math.sin(beta_p)));
      x -= dt / ((t_xp - t_x) / dx_step);
      x = Math.max(-0.99, Math.min(0.99, x));
    }

    const a_transfer = s / (2 * (1 - x*x));
    const v1_sq = MU_SUN * (2/r1 - 1/a_transfer);
    const v_planet1 = Math.sqrt(MU_SUN / r1);
    const C3 = Math.abs(v1_sq - v_planet1*v_planet1) / 1e6; 
    return isNaN(C3) ? 1e8 : C3;
  }

  return { lambertC3 };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { lambertC3: OrbitalMechanics.lambertC3 };
}
