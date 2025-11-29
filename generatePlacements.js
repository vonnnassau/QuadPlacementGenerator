const fs = require("fs");
const { PNG } = require("pngjs");
const seedrandom = require("seedrandom");

const config = require("./config.json");

function loadMask(file) {
  const buffer = fs.readFileSync(file);
  return PNG.sync.read(buffer);
}

function loadTileMetadata(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function pickTileForBrightness(tiles, targetBrightness) {
  // TEMP: return random tile; will refine
  return tiles[Math.floor(Math.random() * tiles.length)];
}

function generatePlacements() {
  const rng = seedrandom(config.seed);
  const mask = loadMask(config.mask);
  const tiles = loadTileMetadata(config.tileMetadata);
  const placements = [];

  // TODO:
  // 1. Poisson sample inside mask
  // 2. For each sample, read mask brightness
  // 3. Select tile matching brightness
  // 4. Assign x, y, z, scale, rotation, layer
  // 5. Push into placements[]

  fs.writeFileSync(config.output, JSON.stringify(placements, null, 2));
  console.log(`Generated ${placements.length} placements.`);
}

generatePlacements();