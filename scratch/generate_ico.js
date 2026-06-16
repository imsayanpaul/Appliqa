const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '../client/public/favicon.png');
const icoPath = path.join(__dirname, '../client/public/favicon.ico');

try {
  const pngData = fs.readFileSync(pngPath);
  const size = pngData.length;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type (1 = Icon)
  header.writeUInt16LE(1, 4);     // Image count (1)

  const directory = Buffer.alloc(16);
  directory.writeUInt8(0, 0);     // Width (0 means 256+)
  directory.writeUInt8(0, 1);     // Height (0 means 256+)
  directory.writeUInt8(0, 2);     // Color count (0)
  directory.writeUInt8(0, 3);     // Reserved
  directory.writeUInt16LE(1, 4);  // Color planes (1)
  directory.writeUInt16LE(32, 6); // Bits per pixel (32)
  directory.writeUInt32LE(size, 8); // Size of PNG data
  directory.writeUInt32LE(22, 12); // Offset of PNG data (6 + 16)

  const icoData = Buffer.concat([header, directory, pngData]);
  fs.writeFileSync(icoPath, icoData);
  console.log('Successfully created favicon.ico at:', icoPath);
} catch (e) {
  console.error('Failed to generate favicon.ico:', e.message);
}
