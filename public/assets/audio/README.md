# TAPtoPICK — original BGM prototypes

Original instrumental composition and deterministic synthesis for TAPtoPICK.
No third-party samples or existing melodies were imported. This is a synthesized
prototype, not a recording of real instruments.

## Gameplay: Pick Garden (unchanged)

- **38.4 seconds**, 100 BPM, C major, 4/4, 16 bars, stereo.
- Marimba-like plucks, rounded bass, and quiet brushed percussion.
- `pick-garden.wav`: 44.1 kHz / 16-bit uncompressed listening master.
- `pick-garden.mp3`: web playback copy; the application loads this lazily.
- `pick-garden.json`: objective master signal measurements.
- Note and room tails wrap around the loop start instead of being cut off.

## Menu: Paper Lantern Waltz

The menu now has a **different composition**, not a remix or a slower version of
the gameplay music. A new F-major melody, changing 16-bar chord progression,
3/4 waltz rhythm, nylon-string-like lead, soft electric piano, and warm bass make
it distinct from Pick Garden's C-major 4/4 marimba arrangement. There is no
percussion. This gentle listening prototype uses no third-party samples.

- **40 seconds**, 72 BPM, F major, 3/4, 16 bars, stereo.
- `pick-lobby.wav`: 44.1 kHz / 16-bit listening master.
- `pick-lobby.mp3`: 244,324-byte web playback copy (about 239 KiB).
- `pick-lobby.json`: master measurements, meter, and exact sample count.
- Peak approximately −4.74 dBFS and RMS −19.00 dBFS in the encoded MP3.
- Circular note and room tails remain intact at the seam.

## Archived first menu version: Pick Garden — Menu

The former menu variation is retained byte-for-byte for rollback and research.
It shares Pick Garden's melody and harmony, with softer overtones, less
percussion, and a 92 BPM tempo (about 41.74 seconds). It is not the new menu song.

- `pick-garden-menu.wav`: 44.1 kHz / 16-bit menu listening master.
- `pick-garden-menu.mp3`: separately loaded web playback copy.
- `pick-garden-menu.json`: menu master measurements and exact sample count.

Regenerate the deterministic masters from the repository root:

```sh
node scripts/generate-pick-music.mjs
ffmpeg -y -i public/assets/audio/pick-garden.wav -codec:a libmp3lame -q:a 4 public/assets/audio/pick-garden.mp3
node scripts/generate-pick-music.mjs --menu
ffmpeg -y -i public/assets/audio/pick-lobby.wav -codec:a libmp3lame -q:a 4 public/assets/audio/pick-lobby.mp3
# Optional: reproduce the archived first menu variation, not the active menu.
node scripts/generate-pick-music.mjs --legacy-menu
ffmpeg -y -i public/assets/audio/pick-garden-menu.wav -codec:a libmp3lame -q:a 4 public/assets/audio/pick-garden-menu.mp3
node scripts/verify-pick-music.mjs
```

The runtime uses decoded Web Audio loops at restrained gain. Scene changes stop
the outgoing theme before fading in the incoming theme. Music stops on pause, video, disabled music, or a
hidden tab. Browser autoplay restrictions may require a tap before audio starts.
The verifier checks all six audio files against each track's sample-count and
meter metadata, clipping headroom, and loop seam. It also checks SHA-256 hashes
of the gameplay and archived menu WAV/MP3/JSON assets to protect their original
versions. The default generator and `--legacy-menu` both reproduce those masters
and metadata byte-for-byte. Listening on real mobile
speakers/headphones is still needed to judge comfort and repetition fatigue.
