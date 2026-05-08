const { exec } = require('child_process');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '../../../frontend');

/**
 * Triggers the static site generator build process
 */
function triggerBuild() {
    return new Promise((resolve, reject) => {
        // e.g., 'npm run build' for Astro, Vite, or Next.js
        console.log(`Starting build in ${FRONTEND_DIR}...`);
        
        const child = exec('npm run build', { cwd: FRONTEND_DIR }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Build error: ${error.message}`);
                return reject({ success: false, error: error.message, stderr });
            }
            if (stderr) {
                console.warn(`Build stderr: ${stderr}`);
            }
            resolve({ success: true, stdout });
        });

        // Logging
        child.stdout.on('data', (data) => console.log(`[BUILD]: ${data}`));
        child.stderr.on('data', (data) => console.error(`[BUILD ERR]: ${data}`));
    });
}

module.exports = {
    triggerBuild
};
