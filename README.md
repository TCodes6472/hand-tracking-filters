# Hand FX — Glitch Frame

A browser hand-tracking experiment inspired by short-form video effects. MediaPipe Hands provides 21 landmarks per detected hand, including fingertip landmarks used here to build a dynamic frame. citeturn0search0

## What changed
- Two-hand tracking
- Index + middle fingertips act as dynamic frame controls
- Animated glitch/RGB/scanline frame
- Neon frame mode
- Corner reticles follow the fingertips
- Live camera stays in the background
- Responsive mobile layout

## Run
Open the GitHub Pages site over HTTPS and allow camera access. Camera processing happens in the browser; this demo does not upload the camera stream to a server.

## Controls
1. Tap **Start Camera**.
2. Hold both hands in view.
3. Move your index/middle fingertips to resize and reposition the frame.
4. Switch effects with the selector.
