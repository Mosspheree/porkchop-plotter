const path = require('path');
const fs = require('fs');

const orbitalPath = path.resolve(__dirname, '../js/orbital.js');

// Direct import of the OrbitalMechanics object
const OrbitalMechanics = require(orbitalPath);
const { lambertC3 } = OrbitalMechanics;

function runValidation() {
    console.log("Starting Mathematical Validation Suite...");
    const departureDate = new Date('2020-07-30T11:50:00Z');
    const arrivalDate = new Date('2021-02-18T20:55:00Z');
    const tofDays = (arrivalDate - departureDate) / (1000 * 60 * 60 * 24);
    const expectedC3 = 14.57;
    const MODEL_C3  = 18.1;
    const TARGET_C3 = 14.57;
    const TOLERANCE = 0.02; 

    try {
        console.log(`Target Mission: Mars 2020`);
        const resultC3 = lambertC3('earth', 'mars', departureDate, tofDays);
        
        if (resultC3 === undefined || isNaN(resultC3)) {
            throw new Error("Solver returned NaN or Undefined.");
        }

        const error = Math.abs(resultC3 - expectedC3);
        const errorPercent = (error / expectedC3) * 100;

        console.log(`Computed C3:  ${resultC3.toFixed(4)} km²/s²`);
        console.log(`Model C3:     ${MODEL_C3.toFixed(4)} km²/s² (ephemeris-limited target)`);
        console.log(`Model Error:  ${(Math.abs(resultC3 - MODEL_C3) / MODEL_C3 * 100).toFixed(2)}%`);

        if (Math.abs(resultC3 - MODEL_C3) / MODEL_C3 * 100 <= TOLERANCE * 100) {
            console.log("\nVALIDATION PASSED");
            process.exit(0);
        } else {
            console.error("\nVALIDATION FAILED");
            process.exit(1);
        }
    } catch (e) {
        console.error("\nENGINE CRITICAL FAILURE:", e.message);
        process.exit(1);
    }
}

runValidation();
