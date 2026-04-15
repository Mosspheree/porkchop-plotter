// Validation Test: Mars 2020 Perseverance Mission
// Departure: 2020-07-30 | Arrival: 2021-02-18
// Target C3: ~14.57 km²/s² (Source: NASA JPL)

const { lambertC3 } = require('../js/orbital.js');

function runValidation() {
    console.log("Starting Mathematical Validation...");

    // Mission Parameters
    const departureDate = new Date('2020-07-30T11:50:00Z');
    const arrivalDate = new Date('2021-02-18T20:55:00Z');
    const expectedC3 = 14.57; // NASA JPL Golden Value
    const tolerance = 0.5;    // 3% allowable margin for mean element approximation

    try {
        // Assuming your lambertC3 function takes (startDate, endDate)
        const resultC3 = lambertC3(departureDate, arrivalDate);
        const error = Math.abs(resultC3 - expectedC3);
        const errorPercent = (error / expectedC3) * 100;

        console.log(`Computed C3: ${resultC3.toFixed(4)} km²/s²`);
        console.log(`Expected C3: ${expectedC3} km²/s²`);
        console.log(`Relative Error: ${errorPercent.toFixed(2)}%`);

        if (errorPercent <= tolerance) {
            console.log("VALIDATION PASSED: Solver is within aerospace tolerance.");
            process.exit(0);
        } else {
            console.error("VALIDATION FAILED: Error exceeds tolerance.");
            process.exit(1);
        }
    } catch (e) {
        console.error("TEST CRASHED:", e.message);
        process.exit(1);
    }
}

runValidation();
