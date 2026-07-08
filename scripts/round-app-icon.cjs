const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readPng(file) {
  const buffer = fs.readFileSync(file);
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${file} is not a PNG file`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`${file} must be an 8-bit RGBA PNG; got bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.alloc(width * height * 4);
  let rawOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const row = raw.subarray(rawOffset, rawOffset + stride);
    rawOffset += stride;
    const previous = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    const target = pixels.subarray(y * stride, (y + 1) * stride);

    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? target[x - 4] : 0;
      const up = previous ? previous[x] : 0;
      const upLeft = previous && x >= 4 ? previous[x - 4] : 0;
      let value = row[x];

      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const predictor = left + up - upLeft;
        const leftDistance = Math.abs(predictor - left);
        const upDistance = Math.abs(predictor - up);
        const upLeftDistance = Math.abs(predictor - upLeft);
        value = (value + (leftDistance <= upDistance && leftDistance <= upLeftDistance
          ? left
          : upDistance <= upLeftDistance
            ? up
            : upLeft)) & 255;
      } else if (filter !== 0) {
        throw new Error(`${file} uses unsupported PNG filter ${filter}`);
      }

      target[x] = value;
    }
  }

  return { width, height, pixels };
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function writePng(file, image) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    const rowOffset = y * (stride + 1);
    raw[rowOffset] = 0;
    image.pixels.copy(raw, rowOffset + 1, y * stride, (y + 1) * stride);
  }

  fs.writeFileSync(file, Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]));
}

function roundedRectCoverage(x, y, width, height, radius) {
  const left = radius;
  const right = width - radius;
  const top = radius;
  const bottom = height - radius;
  const nearestX = Math.max(left, Math.min(x, right));
  const nearestY = Math.max(top, Math.min(y, bottom));
  const distance = Math.hypot(x - nearestX, y - nearestY);
  return Math.max(0, Math.min(1, radius + 0.5 - distance));
}

function applyRoundedMask(image, radiusRatio = 0.22) {
  if (image.width !== image.height) {
    throw new Error('App icon source must be square');
  }

  const radius = image.width * radiusRatio;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const coverage = roundedRectCoverage(x + 0.5, y + 0.5, image.width, image.height, radius);
      const alphaOffset = (y * image.width + x) * 4 + 3;
      image.pixels[alphaOffset] = Math.round(image.pixels[alphaOffset] * coverage);
    }
  }
  return image;
}

if (require.main === module) {
  const iconPath = path.resolve(process.argv[2] || 'build/icon.png');
  const image = readPng(iconPath);
  applyRoundedMask(image);
  writePng(iconPath, image);
}

module.exports = { applyRoundedMask, readPng, writePng };
