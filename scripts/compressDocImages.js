const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Directory containing PNG files
const dirPath = "../screenshots/";

// Output directory for JPEG files
const outputPath = "./doc/img/";

// Check and create output directory if it doesn't exist
if (!fs.existsSync(dirPath)) {
  throw "Input path does not exists: " + path.resolve(dirPath);
}
if (!fs.existsSync(outputPath)) {
  throw "Output path does not exists: " + path.resolve(outputPath);
}

// Function to convert PNG to JPEG
const convertPngToJpeg = async (file) => {
  const inputPath = path.join(dirPath, file);
  const outputPathFile = path.join(outputPath, path.basename(file, ".png") + ".jpg");

  try {
    await sharp(inputPath)
      .jpeg({
        quality: 82, // Set the quality of jpeg output
      })

      .toFile(outputPathFile);

    console.log(`Converted '${file}' to JPEG format.`);
  } catch (error) {
    console.error("Error processing file", file, error);
  }
};

// Function to round the corners of a specific PNG file
const roundCorners = async (file) => {
  const inputPath = path.join(dirPath, file);
  const outputPathFile = path.join(outputPath, file);

  const radius = 20; // Radius of the rounded corners

  try {
    const { width, height } = await sharp(inputPath).metadata();

    const roundedCorners = Buffer.from(
      `<svg><rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}"/></svg>`
    );
    const gradient = Buffer.from(
      `<svg width="${width}" height="${height}">
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="white" stop-opacity="0.6"/>
              <stop offset="100%" stop-color="white" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="${width}" height="${height}" fill="url(#gradient1)"/>
        </svg>`
    );
    await sharp(inputPath)
      .composite([
        {
          input: gradient,
          blend: "overlay",
        },
        {
          input: roundedCorners,
          blend: "dest-in",
        },
      ])
      .png()
      .toFile(outputPathFile);

    console.log(`Rounded corners of '${file}' and saved as PNG.`);
  } catch (error) {
    console.error("Error rounding corners of file", file, error);
  }
};

// Read the directory and process files
fs.readdir(dirPath, (err, files) => {
  if (err) {
    return console.error("Failed to list directory contents:", err);
  }

  files.forEach((file) => {
    if (path.extname(file).toLowerCase() === ".png") {
      if (path.basename(file) === "header.png") {
        // header as png with rounded corners
        roundCorners(file);
      } else {
        // all other files as compressed jpg
        convertPngToJpeg(file);
      }
    }
  });
});

//
