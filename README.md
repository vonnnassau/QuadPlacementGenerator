# Quad Placement Generator

The Quad Placement Generator creates generative tile placements from a source mask and tile metadata. It outputs `placements.json`, which the Quad Engine uses to build 2D/3D compositions such as skulls, faces, symbols, and abstract forms.

## ▶️ Usage

1. Copy `tile_metadata.json` from QuadTileScanner into this folder.
2. Place a mask (PNG) inside `./masks` and reference it in `config.json`.
3. Run:
npm install
npm run generate
`placements.json` will be written to `./output`.
