const path = require('path');
const fs = require('fs');

// Log the current directory to debug the environment
console.log("Current Directory:", process.cwd());
console.log("Directory of this script:", __dirname);

// Look for orbital.js in common locations
const potentialPaths = [
    path.resolve(__dirname, '../js/orbital.js'),
    path.resolve(__dirname, '../orbital.js'),
    path.resolve(process.cwd(), 'js/orbital.js'),
    path.resolve(process.cwd(), 'orbital.js')
];

let orbitalPath = "";
for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
        orbitalPath = p;
        break;
    }
}

if (!orbitalPath) {
    console.error("CRITICAL ERROR: orbital.js NOT FOUND in any expected location.");
    console.log("Files found in root:", fs.readdirSync(process.cwd()));
    if (fs.existsSync(path.join(process.cwd(), 'js'))) {
        console.log("Files found in js/:", fs.readdirSync(path.join(process.cwd(), 'js')));
    }
    process.exit(1);
}

const { lambertC3 } = require(orbitalPath);

function runValidation() {
    console.log("Starting Mathematical Validation Suite...");
    console.log(`Loading engine from: ${orbitalPath}`);

    const departureDate = new Date('2020-07-30T11:50:00Z');
    const arrivalDate = new Date('2021-02-18T20:55:00Z');
    const tofDays = (arrivalDate - departureDate) / (1000 * 60 * 60 * 24);
    const expectedC3 = 14.57; 
    const tolerancePercent = 3.0; 

    try {
        console.log(`Target Mission: Mars 2020`);
        const resultC3 = lambertC3('earth', 'mars', departureDate, tofDays);
        
        if (resultC3 === undefined || isNaN(resultC3)) {
            throw new Error("Solver returned NaN or Undefined.");
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
            process.exit(1);
        }
    } catch (e) {
        console.error("\nENGINE CRITICAL FAILURE:", e.message);
        process.exit(1);
    }
}

runValidation();
