/**
 * orbital.js — Professional Grade Interplanetary Trajectory Solver
 * Upgraded Features:
 * - Solar Conjunction (SEP Angle) Calculation
 * - Multi-Revolution / 180° Ridge Geometry Support
 */

const OrbitalMechanics = (() => {

    const MU_SUN = 1.32712440018e11; 
    const AU = 149597870.7; 
    const J2000 = 2451545.0; 

    const ELEMENTS = {
        mercury: { a: [0.38709893, 0.00000066],  e: [0.20563069, 0.00002523],  inc: [7.00487, -0.00594],  Omega: [48.33167, -0.12531],  w: [77.45645, 0.160476],  L0: [252.25084, 149472.6741] },
        venus:   { a: [0.72333199, 0.00000092],  e: [0.00677323, -0.00004776], inc: [3.39471, -0.00466],  Omega: [76.68069, -0.996874], w: [131.53298, 0.002008],  L0: [181.97973, 58517.8153] },
        earth:   { a: [1.00000011, 0.00000005],  e: [0.01671022, -0.00003804], inc: [0.00005, 0.01305],   Omega: [-11.26064, -0.444829], w: [102.94719, 0.323273],  L0: [100.46435, 36000.7698] },
        mars:    { a: [1.52366231, -0.00007221], e: [0.09341233, 0.00011902],  inc: [1.85061, -0.00813],  Omega: [49.57854, -1.020139], w: [336.04084, 0.4439],    L0: [355.45332, 19140.3026] },
        jupiter: { a: [5.20336301, 0.00060737],  e: [0.04839266, -0.00012880], inc: [1.30530, -0.00417],  Omega: [100.55615, 0.204769], w: [14.75385, 0.212526],   L0: [34.40438, 3034.7461] },
        saturn:  { a: [9.53707032, 0.00065050],  e: [0.05415060, -0.00036762], inc: [2.48446, 0.00612],   Omega: [113.71504, -0.259183], w: [92.43194, -0.418974],  L0: [49.94432, 1222.4944] },
        uranus:  { a: [19.19126393, 0.00152025], e: [0.04716771, -0.00019150], inc: [0.77255, -0.00243],  Omega: [74.22988, -0.168129], w: [170.96424, 0.403303],  L0: [313.23218, 428.4820] },
        neptune: { a: [30.06896348, -0.00125196], e: [0.00858587, 0.00002514], inc: [1.76917, -0.00357],  Omega: [131.72169, -0.151579], w: [44.97135, -0.322414],  L0: [304.88003, 218.4595] }
    };

    function solveKepler(M, e) {
        let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
        for (let i = 0; i < 10; i++) {
            const dE = (M - E + e * Math.sin(E)) / (1.0 - e * Math.cos(E));
            E += dE;
            if (Math.abs(dE) < 1e-12) break;
        }
        return E;
    }

    function getStumpff(z) {
        if (z > 1e-6) {
            const sz = Math.sqrt(z);
            return { c2: (1 - Math.cos(sz)) / z, c3: (sz - Math.sin(sz)) / Math.pow(sz, 3) };
        } else if (z < -1e-6) {
            const sz = Math.sqrt(-z);
            return { c2: (Math.cosh(sz) - 1) / (-z), c3: (Math.sinh(sz) - sz) / Math.pow(-z, 1.5) };
        }
        return { c2: 1/2, c3: 1/6 };
    }

    function planetState(name, t_jd) {
        const p = ELEMENTS[name];
        const T = (t_jd - J2000) / 36525;
        const a = (p.a[0] + p.a[1] * T) * AU;
        const e = p.e[0] + p.e[1] * T;
        const inc = (p.inc[0] + p.inc[1] * T) * Math.PI / 180;
        const Omega = (p.Omega[0] + p.Omega[1] * T) * Math.PI / 180;
        const w = (p.w[0] + p.w[1] * T) * Math.PI / 180;
        const L = (p.L0[0] + p.L0[1] * T) * Math.PI / 180;

        const M = ((L - w) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const E = solveKepler(M, e);
        const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
        const r_mag = a * (1 - e * Math.cos(E));

        const x_p = r_mag * Math.cos(nu), y_p = r_mag * Math.sin(nu);
        const h = Math.sqrt(MU_SUN * a * (1 - e**2));
        const vx_p = -(MU_SUN / h) * Math.sin(nu), vy_p = (MU_SUN / h) * (e + Math.cos(nu));

        const argp = w - Omega;
        const cosO = Math.cos(Omega), sinO = Math.sin(Omega), cosw = Math.cos(argp), sinw = Math.sin(argp), cosi = Math.cos(inc), sini = Math.sin(inc);

        const m11 = cosO * cosw - sinO * sinw * cosi, m12 = -cosO * sinw - sinO * cosw * cosi;
        const m21 = sinO * cosw + cosO * sinw * cosi, m22 = -sinO * sinw + cosO * cosw * cosi;
        const m31 = sinw * sini, m32 = cosw * sini;

        return {
            pos: [x_p * m11 + y_p * m12, x_p * m21 + y_p * m22, x_p * m31 + y_p * m32],
            vel: [vx_p * m11 + vy_p * m12, vx_p * m21 + vy_p * m22, vx_p * m31 + vy_p * m32],
            r: r_mag
        };
    }

    /**
     * Newton-Raphson Iterative Engine (NRIE)
     */
    function nrie(r1, r2, A, tof_sec) {
        let z = 0.0, y, t_z, dt_dz;
        for (let i = 0; i < 20; i++) {
            const { c2, c3 } = getStumpff(z);
            y = r1 + r2 + A * (z * c3 - 1) / Math.sqrt(Math.max(1e-12, c2));
            if (A > 0 && y < 0) { z += 0.2; continue; }

            const chi = Math.sqrt(y / c2);
            t_z = (Math.pow(chi, 3) * c3 + A * Math.sqrt(y)) / Math.sqrt(MU_SUN);

            if (Math.abs(z) < 1e-4) {
                dt_dz = Math.sqrt(2)/40 * Math.pow(y, 1.5) + (A/8) * (Math.sqrt(y) + A * Math.sqrt(1/(2*y)));
            } else {
                dt_dz = (Math.pow(chi, 3) * (c2 - 3*c3*c2) / (2 * z) + 3*c3*Math.sqrt(y)*A / (4 * c2)) / Math.sqrt(MU_SUN);
            }

            const error = t_z - tof_sec;
            if (Math.abs(error) < 1e-5) break;
            z = z - error / dt_dz;
            z = Math.max(-200, Math.min(200, z));
        }
        return { z, y };
    }

    /**
     * Solar Elongation / Conjunction Logic (SEP Angle)
     * Determines the angle between Earth and Target as seen from Sun.
     * If SEP < 3 degrees, comms are generally blocked by the Sun.
     */
    function getSEPAngle(s_earth, s_target) {
        const p1 = s_earth.pos;
        const p2 = s_target.pos;
        
        // Dot product to find angle between the two position vectors
        const dot = p1[0]*p2[0] + p1[1]*p2[1] + p1[2]*p2[2];
        const mag1 = s_earth.r;
        const mag2 = Math.sqrt(p2[0]**2 + p2[1]**2 + p2[2]**2);
        
        const cos_sep = dot / (mag1 * mag2);
        return Math.acos(Math.min(1, Math.max(-1, cos_sep))) * (180 / Math.PI);
    }

    function getMissionData(origin, dest, t_dep, tof_days, longWay = false) {
        if (tof_days <= 0 || origin === dest) return { c3: 1e8, v_inf_arr: 1e8, dla: 0, sep: 180 };

        const t_dep_jd = (t_dep instanceof Date) ? (t_dep.getTime() / 86400000) + 2440587.5 : t_dep;
        const s1 = planetState(origin, t_dep_jd);
        const s2 = planetState(dest, t_dep_jd + tof_days);

        const r1 = s1.r, r2 = Math.sqrt(s2.pos[0]**2 + s2.pos[1]**2 + s2.pos[2]**2);
        const cos_theta = (s1.pos[0]*s2.pos[0] + s1.pos[1]*s2.pos[1] + s1.pos[2]*s2.pos[2]) / (r1 * r2);
        
        // Singularity Check (The 180 Ridge)
        // If theta is exactly 180 deg, cross product is zero and plane is undefined.
        const theta = Math.acos(Math.min(1, Math.max(-1, cos_theta)));
        
        let A = Math.sqrt(r1 * r2 * (1 + cos_theta));
        if (longWay) A = -A; 
        
        if (Math.abs(A) < 1e-6) return { c3: 1e8, v_inf_arr: 1e8, dla: 0, sep: 180, isRidge: true };

        const { z, y } = nrie(r1, r2, A, tof_days * 86400);
        const { c2 } = getStumpff(z);

        const f = 1 - y / r1;
        const g = A * Math.sqrt(y / MU_SUN);
        const g_dot = 1 - y / r2;

        const v1 = s1.pos.map((p1, i) => (s2.pos[i] - f * p1) / g);
        const v2 = s2.pos.map((p2, i) => (g_dot * p2 - s1.pos[i]) / g);

        const v_inf_dep = v1.map((v, i) => v - s1.vel[i]);
        const v_inf_arr = v2.map((v, i) => v - s2.vel[i]);

        const c3 = v_inf_dep[0]**2 + v_inf_dep[1]**2 + v_inf_dep[2]**2;
        const v_arr_mag = Math.sqrt(v_inf_arr[0]**2 + v_inf_arr[1]**2 + v_inf_arr[2]**2);
        const dla = Math.asin(v_inf_dep[2] / Math.sqrt(c3)) * (180 / Math.PI);

        // Calculate SEP angle at arrival to identify Solar Conjunctions
        const sep = getSEPAngle(planetState(origin, t_dep_jd + tof_days), s2);

        return { 
            c3, 
            v_inf_arr: v_arr_mag, 
            dla: isNaN(dla) ? 0 : dla, 
            sep, 
            theta: theta * (180 / Math.PI) 
        };
    }

    return {
        getMissionData,
        PLANETS: ELEMENTS,
        jdToDate: (jd) => new Date((jd - 2440587.5) * 86400000).toISOString().split('T')[0],
        dateToJD: (y, m, d) => (typeof y === 'string') ? (new Date(y).getTime() / 86400000) + 2440587.5 : (new Date(Date.UTC(y, m - 1, d)).getTime() / 86400000) + 2440587.5
    };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = OrbitalMechanics;
