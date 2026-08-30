# Hand Tracking Filters

A lightweight browser hand-trail effect app.

## What it tracks
- Up to 2 hands.
- Only thumb tip (landmark 4) and index fingertip (landmark 8) are used for effects.
- Other fingers are ignored by the renderer.

## Filters
Neon, Rainbow, Electric, Fire, Sparkle, Galaxy, Hearts, Frost, Ink, and Pulse.

## Run
Serve the folder over HTTPS (or localhost), then open `index.html`.
Camera access requires a secure context in normal browsers.

The MediaPipe Hand Landmarker model runs locally in the browser after the model asset is fetched. No audio or microphone is used.
