const sharp = require('sharp');
const fs = require('fs').promises;

async function generateFavicons() {
  try {
    // Read the original logo
    const logoBuffer = await fs.readFile('images/logo.png');
    
    // Generate different sizes
    const sizes = [16, 32, 180];
    
    for (const size of sizes) {
      await sharp(logoBuffer)
        .resize(size, size)
        .toFile(`images/icons/favicon-${size}x${size}.png`);
    }
    
    // Generate apple-touch-icon
    await sharp(logoBuffer)
      .resize(180, 180)
      .toFile('images/icons/apple-touch-icon.png');
    
    // Generate safari-pinned-tab.svg
    await sharp(logoBuffer)
      .resize(512, 512)
      .toFile('images/icons/safari-pinned-tab.svg');
    
    console.log('Favicon generation completed successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFavicons(); 