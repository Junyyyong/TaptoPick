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

The menu uses **Pick Garden — Menu**, a subtle variation on the same melody,
harmony, and 16-bar arrangement. Its tempo is 92 BPM (about 41.74 seconds), with
softer marimba overtones and half as many, quieter percussion hits. The original
100 BPM gameplay track remains unchanged. Both versions have looping stereo
room tails; no new samples or third-party music were added.

- `pick-garden-menu.wav`: 44.1 kHz / 16-bit menu listening master.
- `pick-garden-menu.mp3`: separately loaded web playback copy.
- `pick-garden-menu.json`: menu master measurements and exact sample count.

Regenerate both deterministic masters from the repository root:

```sh
node scripts/generate-pick-music.mjs
ffmpeg -y -i public/assets/audio/pick-garden.wav -codec:a libmp3lame -q:a 4 public/assets/audio/pick-garden.mp3
node scripts/generate-pick-music.mjs --menu
ffmpeg -y -i public/assets/audio/pick-garden-menu.wav -codec:a libmp3lame -q:a 4 public/assets/audio/pick-garden-menu.mp3
node scripts/verify-pick-music.mjs
```

The runtime uses decoded Web Audio loops at restrained gain. Scene changes stop
the outgoing theme before fading in the incoming theme. Music stops on pause, video, disabled music, or a
hidden tab. Browser autoplay restrictions may require a tap before audio starts.
The verifier checks all four audio files against each track's sample-count
metadata, clipping headroom, and loop seam. Listening on real mobile
speakers/headphones is still needed to judge comfort and repetition fatigue.
