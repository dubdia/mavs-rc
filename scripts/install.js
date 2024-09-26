const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const directory = path.join(process.cwd(), 'out/make/squirrel.windows/x64');
fs.readdir(directory, { withFileTypes: true }, (err, files) => {
    if (err) {
        return console.error('Error reading directory', directory, err);
    }

    // filter executable files and sort by last modification time
    files = files.filter(file => file.isFile() && file.name.endsWith('.exe'))
                 .sort((a, b) => fs.statSync(path.join(directory, b.name)).mtime.getTime() -
                                   fs.statSync(path.join(directory, a.name)).mtime.getTime());

    // get the most recent file
    if (files.length > 0) {
        const latestInstaller = path.join(directory, files[0].name);
        console.log('Starting installer:', latestInstaller);

        // start the installer
        exec(`"${latestInstaller}"`, (error) => {
            if (error) {
                console.error('Failed to start installer', directory, error);
            }
        });
    } else {
        console.error('No installer files found. Please run "npm run make" first ensure the installer is located in ' + directory);
    }
});