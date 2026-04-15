const path = require('path');
const fs = require('fs');

const orbitalPath = path.resolve(__dirname, '../js/orbital.js');

// Direct import of the OrbitalMechanics object
const OrbitalMechanics = require(orbitalPath);
const { lambertC3 } = OrbitalMechanics;

function runValidation() {
    console.log("Starting Mathematical Validation Suite...");
    
    // Mars 2020 Perseverance Mission Dates
    const departureDate = new Date('2020-07-30T11:50:00Z');
    const arrivalDate = new Date('2021-02-18T20:55:00Z');
    const tofDays = (arrivalDate - departureDate) / (1000 * 60 * 60 * 24);
    
    // The Ground Truth: NASA JPL Horizons C3 for these dates is ~14.57
    const TARGET_C3 = 14.57; 
    const TOLERANCE = 0.01; // Allow 1% error (Industry standard for Keplerian models)

    try {
        console.log(`Target Mission: Mars 2020`);
        const resultC3 = lambertC3('earth', 'mars', departureDate, tofDays);
        
        if (resultC3 === undefined || isNaN(resultC3)) {
            throw new Error("Solver returned NaN or Undefined.");
        }

        const error = Math.abs(resultC3 - TARGET_C3);
        const errorPercent = (error / TARGET_C3) * 100;

        console.log(`Computed C3:  ${resultC3.toFixed(4)} km²/s²`);
        console.log(`Target C3:    ${TARGET_C3.toFixed(4)} km²/s² (NASA Ground Truth)`);
        console.log(`Margin:       ${errorPercent.toFixed(4)}%`);

        if (errorPercent <= TOLERANCE * 100) {
            console.log("\nVALIDATION PASSED");
            console.log("Result is within acceptable physics tolerance.");
            process.exit(0);
        } else {
            console.error("\nVALIDATION FAILED");
            console.error(`Error ${errorPercent.toFixed(2)}% exceeds tolerance of ${(TOLERANCE * 100)}%`);
            process.exit(1);
        }
    } catch (e) {
        console.error("\nENGINE CRITICAL FAILURE:", e.message);
        process.exit(1);
    }
}

runValidation();
