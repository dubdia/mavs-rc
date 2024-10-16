const fs = require('fs');
const { exec } = require('child_process');

// Path to your package.json file
const packageJsonPath = './package.json';

try {
  // Read package.json file
  const packageJson = fs.readFileSync(packageJsonPath);
  const parsedJson = JSON.parse(packageJson);
  const { version } = parsedJson;

  // Create the tag name based on the version
  const tagName = `v${version}`;
  const tagMessage = `Release version ${version}`;

  // Command to create an annotated tag
  const tagCommand = `git tag -a ${tagName} -m "${tagMessage}"`;

  // Execute the Git command to create the tag
  exec(tagCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error creating tag: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error: ${stderr}`);
      return;
    }

    console.log(`Tag ${tagName} created successfully`);

    // Command to push the tag to remote origin
    const pushCommand = `git push origin ${tagName}`;

    // Execute the Git command to push the tag
    exec(pushCommand, (pushError, pushStdout, pushStderr) => {
      if (pushError) {
        console.error(`Error pushing tag: ${pushError.message}`);
        return;
      }
      if (pushStderr) {
        console.error(`Error: ${pushStderr}`);
        return;
      }

      console.log(`Tag ${tagName} pushed successfully to origin`);
    });
  });
} catch (err) {
  console.error(`Failed to read ${packageJsonPath}: ${err.message}`);
}