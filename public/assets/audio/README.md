# Pick Garden — BGM prototype

Original instrumental composition and deterministic synthesis for TAPtoPICK.
No third-party samples or existing melodies were imported. This is a synthesized
prototype, not a recording of real instruments.

- **38.4 seconds**, 100 BPM, C major, 16 bars, stereo.
- Marimba-like plucks, rounded bass, and quiet brushed percussion.
- `pick-garden.wav`: 44.1 kHz / 16-bit uncompressed listening master.
- `pick-garden.mp3`: web playback copy; the application loads this lazily.
- `pick-garden.json`: objective master signal measurements.
- Note and room tails wrap around the loop start instead of being cut off.

Regenerate the identical master from the repository root:

```sh
node scripts/generate-pick-music.mjs
ffmpeg -y -i public/assets/audio/pick-garden.wav -codec:a libmp3lame -q:a 4 public/assets/audio/pick-garden.mp3
node scripts/verify-pick-music.mjs
```

The runtime uses a decoded Web Audio loop at a restrained 28% gain, fades in,
and stops on pause, video, disabled music, or a hidden tab. Browser autoplay
restrictions may require a tap before audio starts. Listening on real mobile
speakers/headphones is still needed to judge comfort and repetition fatigue.
