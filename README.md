# Hand FX

Browser hand-tracking visual effect inspired by fingertip-controlled frame effects.

### Tracking behavior
- Uses MediaPipe Hands internally, but only the **thumb tips and index fingertips** are used by the effect.
- Requires both hands to present a clear thumb + index pose.
- Uses smoothing and short dropout-hold logic so the frame does not flicker when tracking briefly misses a frame.
- Runs continuously while the camera is active.

### Run
Open through GitHub Pages/HTTPS or localhost so the browser can request camera permission.
