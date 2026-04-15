/**
 * orbital.js — Professional Grade Interplanetary Trajectory Solver
 * Features: 
 * - Secular Planetary Elements (Meeus/JPL) for long-term accuracy
 * - Universal Variable Lambert Solver (Stumpff Formulation)
 * - Delta-V and Transfer Type heuristics
 */

const OrbitalMechanics = (() => {

    const MU_SUN = 1.32712440018e11; 
    const AU = 149597870.7; 
    const J2000 = 2451545.0; 

    /**
     * Secular Orbital Elements (Reference: Meeus / JPL)
     * Values are: [Base, Rate per Julian Century]
     * This handles orbital "drift" across decades.
     */
    const ELEMENTS = {
        earth: {
            a: [1.00000011, 0.00000005],
            e: [0.01671022, -0.00003804],
            inc: [0.00005, 0.01305],
            Omega: [-11.26064, -0.444829],
            w: [102.94719, 0.323273],
            L0: [100.46435, 36000.7698],
            T_period: 365.256
        },
        mars: {
            a: [1.52366231, -0.00007221],
            e: [0.09341233, 0.00011902],
            inc: [1.85061, -0.00813],
            Omega: [49.57854, -1.020139],
            w: [336.04084, 0.4439],
            L0: [355.45332, 19140.3026],
            T_period: 686.971
        },
        venus: {
            a: [0.72333199, 0.00000092],
            e: [0.00677323, -0.00004776],
            inc: [3.39471, -0.00466],
            Omega: [76.68069, -0.996874],
            w: [131.53298, 0.002008],
            L0: [181.97973, 58517.8153],
            T_period: 224.701
        },
        jupiter: {
            a: [5.20336301, 0.00060737],
            e: [0.04839266, -0.00012880],
            inc: [1.30530, -0.00417],
            Omega: [100.55615, 0.204769],
            w: [14.75385, 0.212526],
            L0: [34.40438, 3034.7461],
            T_period: 4332.59
        }
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
        const p = ELEMENTS[name];
        if (!p) throw new Error(`Unknown planet: ${name}`);

        // T = Centuries since J2000
        const T = (t_jd - J2000) / 36525;
        
        // Compute elements for the specific epoch
        const a = p.a[0] + p.a[1] * T;
        const e = p.e[0] + p.e[1] * T;
        const inc = (p.inc[0] + p.inc[1] * T) * Math.PI / 180;
        const Omega = (p.Omega[0] + p.Omega[1] * T) * Math.PI / 180;
        const w = (p.w[0] + p.w[1] * T) * Math.PI / 180;
        const L = (p.L0[0] + p.L0[1] * T) * Math.PI / 180;

        const M = L - w;
        const E = solveKepler(((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), e);
        const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
        const r_mag = a * (1 - e * Math.cos(E)) * AU;

        // Perifocal vectors
        const x_p = r_mag * Math.cos(nu);
        const y_p = r_mag * Math.sin(nu);
        const h = Math.sqrt(MU_SUN * a * AU * (1 - e**2));
        const vx_p = -(MU_SUN / h) * Math.sin(nu);
        const vy_p = (MU_SUN / h) * (e + Math.cos(nu));

        // Rotation Matrix Elements (Gaussian)
        const argp = w - Omega;
        const cosO = Math.cos(Omega), sinO = Math.sin(Omega);
        const cosw = Math.cos(argp),  sinw = Math.sin(argp);
        const cosi = Math.cos(inc),   sini = Math.sin(inc);

        const m11 = cosO * cosw - sinO * sinw * cosi;
        const m12 = -cosO * sinw - sinO * cosw * cosi;
        const m21 = sinO * cosw + cosO * sinw * cosi;
        const m22 = -sinO * sinw + cosO * cosw * cosi;
        const m31 = sinw * sini;
        const m32 = cosw * sini;

        return {
            x: x_p * m11 + y_p * m12, y: x_p * m21 + y_p * m22, z: x_p * m31 + y_p * m32,
            vx: vx_p * m11 + vy_p * m12, vy: vx_p * m21 + vy_p * m22, vz: vx_p * m31 + vy_p * m32,
            r: r_mag
        };
    }

    function lambertC3(origin, dest, t_dep, tof_days) {
        // 1. Safety check for zero-time or same-planet transfers
        if (tof_days <= 0 || origin === dest) return 1e8;

        let t_dep_jd = (t_dep instanceof Date) ? (t_dep.getTime() / 86400000) + 2440587.5 : t_dep;
        const s1 = planetState(origin, t_dep_jd);
        const s2 = planetState(dest, t_dep_jd + tof_days);

        const r1 = s1.r;
        const r2 = Math.sqrt(s2.x**2 + s2.y**2 + s2.z**2);
        const c = Math.sqrt((s2.x - s1.x)**2 + (s2.y - s1.y)**2 + (s2.z - s1.z)**2);
        const s = (r1 + r2 + c) / 2;

        // 2. Geometry check
        const cross_z = s1.x * s2.y - s1.y * s2.x;
        const dot12   = s1.x * s2.x + s1.y * s2.y + s1.z * s2.z;
        const A       = Math.sign(cross_z) * Math.sqrt(Math.max(0, r1 * r2 + dot12));
        
        // If A is zero, it's a 180-degree transfer (singularity)
        if (Math.abs(A) < 1e-6) return 1e8;
        
        const tof_sec = tof_days * 86400;

        function c2(psi) {
            if (psi > 1e-6) return (1 - Math.cos(Math.sqrt(psi))) / psi;
            if (psi < -1e-6) return (Math.cosh(Math.sqrt(-psi)) - 1) / (-psi);
            return 0.5;
        }
        function c3(psi) {
            if (psi > 1e-6) return (Math.sqrt(psi) - Math.sin(Math.sqrt(psi))) / Math.pow(psi, 1.5);
            if (psi < -1e-6) return (Math.sinh(Math.sqrt(-psi)) - Math.sqrt(-psi)) / Math.pow(-psi, 1.5);
            return 1/6;
        }

        // 3. Robust Iterator with "Parabolic Damping"
        let z = 0, y, psi;
        for (let i = 0; i < 100; i++) {
            psi = z;
            const c2p = c2(psi), c3p = c3(psi);
            
            // Calculate y, ensuring it never goes below a tiny positive value
            y = r1 + r2 + A * (z * c3p - 1) / Math.sqrt(Math.max(1e-12, c2p));
            
            // If y becomes negative, the orbit is physically impossible for this z
            if (A > 0 && y < 0) {
                z += 0.5; // Kick z toward the hyperbolic region
                continue;
            }
            
            const chi = Math.sqrt(Math.max(0, y / Math.max(1e-12, c2p)));
            const t_z = (Math.pow(chi, 3) * c3p + A * Math.sqrt(Math.max(0, y))) / Math.sqrt(MU_SUN);
            const dt = t_z - tof_sec;
            
            if (Math.abs(dt) < 1e-3) break;
            
            // Numerical Jacobian with safety offset
            const dz = 1e-4;
            const psi2 = z + dz;
            const y2 = r1 + r2 + A * (psi2 * c3(psi2) - 1) / Math.sqrt(Math.max(1e-12, c2(psi2)));
            const chi2 = Math.sqrt(Math.max(0, y2 / Math.max(1e-12, c2(psi2))));
            const t_z2 = (Math.pow(chi2, 3) * c3(psi2) + A * Math.sqrt(Math.max(0, y2))) / Math.sqrt(MU_SUN);
            
            const derivative = (t_z2 - t_z) / dz;
            if (Math.abs(derivative) < 1e-12) break; // Avoid division by zero
            
            z -= dt / derivative;
            z = Math.max(-100, Math.min(100, z)); // Keep z in a sane range
        }

        // 4. Final Velocity Recovery
        const final_y = r1 + r2 + A * (z * c3(z) - 1) / Math.sqrt(Math.max(1e-12, c2(z)));
        const f = 1 - final_y / r1;
        const g = A * Math.sqrt(Math.max(0, final_y) / MU_SUN);
        
        if (Math.abs(g) < 1e-4) return 1e8; // Avoid singularity

        const v1t = [
            (s2.x - f * s1.x) / g,
            (s2.y - f * s1.y) / g,
            (s2.z - f * s1.z) / g
        ];

        const vx_inf = v1t[0] - s1.vx;
        const vy_inf = v1t[1] - s1.vy;
        const vz_inf = v1t[2] - s1.vz;
        
        const C3 = vx_inf**2 + vy_inf**2 + vz_inf**2;
        
        return isFinite(C3) ? C3 : 1e8;
    }

    return {
        lambertC3,
        PLANETS: ELEMENTS,
        jdToDate: (jd) => new Date((jd - 2440587.5) * 86400000).toISOString().split('T')[0],
        dateToJD: (y, m, d) => {
            if (typeof y === 'string') return (new Date(y).getTime() / 86400000) + 2440587.5;
            return (new Date(Date.UTC(y, m - 1, d)).getTime() / 86400000) + 2440587.5;
        },
        c3ToDeltaV: (c3) => {
            const v_esc_sq = 121.0; // km²/s² (approx for Earth 200km LEO)
            return Math.sqrt(c3 + v_esc_sq) - 7.73; // 7.73 is LEO orbital velocity
        },
        transferType: (o, d, tof) => (tof < 230 ? 'Type I' : 'Type II')
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrbitalMechanics;
}
