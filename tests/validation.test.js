/**
 * MISSION VALIDATION TEST: Mars 2020 (Perseverance)
 * This script verifies that the Lancaster-Blanchard solver matches 
 * NASA JPL historical mission data within a calculated tolerance.
 */

const { lambertC3 } = require('../js/orbital.js');

function runValidation() {
    console.log("Starting Mathematical Validation Suite...");

    // Mission: Mars 2020 Perseverance
    // Source: NASA JPL Mission Design Center
    const departureDate = new Date('2020-07-30T11:50:00Z');
    const arrivalDate = new Date('2021-02-18T20:55:00Z');
    const expectedC3 = 14.57; // km²/s²
    
    // We use 3.0% tolerance to account for the difference between 
    // J2000 Mean Elements and NASA's High-Fidelity DE405 Ephemeris.
    const tolerancePercent = 3.0; 

    try {
        console.log(`Target Mission: Mars 2020`);
        console.log(`Departure: ${departureDate.toISOString()}`);
        console.log(`Arrival:   ${arrivalDate.toISOString()}`);
        console.log("-----------------------------------------");

        const resultC3 = lambertC3(departureDate, arrivalDate);
        
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
            console.log("The solver is behaving within aerospace approximation limits.");
            process.exit(0);
        } else {
            console.error("\n VALIDATION FAILED");
            console.error(`Error (${errorPercent.toFixed(2)}%) exceeds tolerance (${tolerancePercent}%).`);
            process.exit(1);
        }
    } catch (e) {
        console.error("\nENGINE CRITICAL FAILURE:");
        console.error(e.message);
        process.exit(1);
    }
}


runValidation();
