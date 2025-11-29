const fs = require("fs");
const { PNG } = require("pngjs");
const seedrandom = require("seedrandom");

const config = require("./config.json");

// -----------------------------------------
// LOADERS
// -----------------------------------------

function loadMask(file) {
  const buffer = fs.readFileSync(file);
  return PNG.sync.read(buffer);
}

function loadTileMetadata(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// -----------------------------------------
// MASK INTERPRETATION
// -----------------------------------------

// Tiles can be placed where alpha > 0
function isInsideMask(mask, x, y) {
  const idx = (y * mask.width + x) << 2;
  return mask.data[idx + 3] > 0; // alpha channel
}

// Brightness determines WHICH tile goes here
function getMaskBrightness(mask, x, y) {
  const idx = (y * mask.width + x) << 2;
  return mask.data[idx] / 255; // grayscale mask (R=G=B)
}

// -----------------------------------------
// TILE SELECTION BASED ON BRIGHTNESS
// -----------------------------------------

function pickTileForBrightness(tiles, targetBrightness, rng) {
  let best = null;
  let bestDiff = 999;

  for (const tile of tiles) {
    const diff = Math.abs(tile.meanBrightness - targetBrightness);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = tile;
    }
  }
  if (!best) best = tiles[Math.floor(rng() * tiles.length)];
  return best;
}

// -----------------------------------------
// TRANSFORMS
// -----------------------------------------

// Dark -> larger scale, Bright -> smaller scale
function pickScale(brightness, rng) {
  const min = config.minScale;
  const max = config.maxScale;

  // brightness 0 = dark -> t = 1 -> large
  // brightness 1 = light -> t = 0 -> small
  let tBase = 1 - brightness;

  // small random variation
  const jitter = (rng() - 0.5) * 0.3;
  let t = tBase + jitter;

  if (t < 0) t = 0;
  if (t > 1) t = 1;

  return min + t * (max - min);
}

function pickRotation(rng) {
  const [minDeg, maxDeg] = config.rotationRange;
  return minDeg + rng() * (maxDeg - minDeg);
}

function pickZ(brightness, rng) {
  const zones = config.zLayers;

  const zone =
    brightness < 0.33
      ? zones.back
      : brightness < 0.66
      ? zones.mid
      : zones.front;

  return zone.min + rng() * (zone.max - zone.min);
}

function pickLayer(z) {
  const { back, mid, front } = config.zLayers;

  // 0 = front, 1 = mid, 2 = back
  if (z <= mid.min) return 2;
  if (z <= front.min) return 1;
  return 0;
}

// -----------------------------------------
// POISSON SAMPLING FOR SHAPE
// -----------------------------------------

function poissonSample(mask, radius, rng) {
  const width = mask.width;
  const height = mask.height;
  const radius2 = radius * radius;
  const samples = [];

  function dist2(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function isFarEnough(pt) {
    for (let i = 0; i < samples.length; i++) {
      if (dist2(pt, samples[i]) < radius2) return false;
    }
    return true;
  }

  for (let y = 0; y < height; y += radius * 0.8) {
    for (let x = 0; x < width; x += radius * 0.8) {
      if (!isInsideMask(mask, x, y)) continue;

      const jitterX = x + (rng() - 0.5) * radius;
      const jitterY = y + (rng() - 0.5) * radius;

      if (
        jitterX >= 0 &&
        jitterX < width &&
        jitterY >= 0 &&
        jitterY < height &&
        isInsideMask(mask, jitterX, jitterY) &&
        isFarEnough({ x: jitterX, y: jitterY })
      ) {
        samples.push({ x: jitterX, y: jitterY });
      }
    }
  }
  return samples;
}

// -----------------------------------------
// MAIN GENERATION
// -----------------------------------------

function generatePlacements() {
  const rng = seedrandom(config.seed);
  const mask = loadMask(config.mask);
  const tiles = loadTileMetadata(config.tileMetadata);

  const points = poissonSample(mask, config.poissonRadius, rng);
  console.log(`Sampled ${points.length} positions inside mask.`);

  const placements = [];

  for (const pt of points) {
    if (config.density < 1 && rng() > config.density) continue;

    const brightness = getMaskBrightness(mask, pt.x, pt.y);
    const tile = pickTileForBrightness(tiles, brightness, rng);
    const z = pickZ(brightness, rng);

    placements.push({
      file: tile.file,
      x: pt.x,
      y: pt.y,
      z: z,
      scale: pickScale(brightness, rng),
      rotation: pickRotation(rng),
      layer: pickLayer(z),
      brightness, // for debugging / visualization
    });
  }

  fs.writeFileSync(config.output, JSON.stringify(placements, null, 2));
  console.log(`Wrote ${placements.length} placements → ${config.output}`);
}

generatePlacements();
