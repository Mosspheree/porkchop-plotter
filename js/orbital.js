/**
 * MISSION VALIDATION TEST: Mars 2020 (Perseverance)
 * This script verifies that the Lancaster-Blanchard solver matches 
 * NASA JPL historical mission data within a calculated tolerance.
 */

const path = require('path');

// Bulletproof path resolution for GitHub Actions
const orbitalPath = path.resolve(__dirname, '../js/orbital.js');

let lambertC3;
try {
    const moduleImport = require(orbitalPath);
    // Specifically targeting the exported function from the OrbitalMechanics IIFE
    lambertC3 = moduleImport.lambertC3;
} catch (e) {
    console.error(`CRITICAL: Could not load orbital engine at ${orbitalPath}`);
    console.error("Ensure your folder is named 'js' (lowercase) and contains 'orbital.js'.");
    process.exit(1);
}

function runValidation() {
    console.log("Starting Mathematical Validation Suite...");
    console.log(`Loading engine from: ${orbitalPath}`);

    // Mission: Mars 2020 Perseverance
    const departureDate = new Date('2020-07-30T11:50:00Z');
    const arrivalDate = new Date('2021-02-18T20:55:00Z');
    
    // Total flight time in days for your solver's parameters
    const tofDays = (arrivalDate - departureDate) / (1000 * 60 * 60 * 24);
    
    const expectedC3 = 14.57; // km²/s²
    const tolerancePercent = 3.0; 

    try {
        console.log(`Target Mission: Mars 2020`);
        console.log(`Departure: ${departureDate.toISOString()}`);
        console.log(`Arrival:   ${arrivalDate.toISOString()}`);
        console.log(`TOF:       ${tofDays.toFixed(2)} days`);
        console.log("-----------------------------------------");

        // Passing 'earth', 'mars', start date, and TOF days to the engine
        const resultC3 = lambertC3('earth', 'mars', departureDate, tofDays);
        
        if (resultC3 === undefined || isNaN(resultC3)) {
            throw new Error("Solver returned NaN or Undefined. Check your math logic.");
        }

        const error = Math.abs(resultC3 - expectedC3);
        const errorPercent = (error / expectedC3) * 100;

        console.log(`Computed C3:  ${resultC3.toFixed(4)} km²/s²`);
        console.log(`NASA C3:      ${expectedC3.toFixed(4)} km²/s²`);
        console.log(`Error Margin: ${errorPercent.toFixed(2)}%`);

        if (errorPercent <= tolerancePercent) {
            console.log("\nVALIDATION PASSED");
            process.exit(0);
        } else {
            console.error("\nVALIDATION FAILED");
            console.error(`Error (${errorPercent.toFixed(2)}%) exceeds tolerance (${tolerancePercent}%).`);
            process.exit(1);
        }
    } catch (e) {
        console.error("\nENGINE CRITICAL FAILURE:");
        console.error(e.message);
        process.exit(1);
    }
}
/** * Bridge for Node.js Testing 
 * Points explicitly to the function inside the OrbitalMechanics scope.
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        lambertC3: OrbitalMechanics.lambertC3 
    };
}
runValidation();
