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

## Menu: Tap Parade

The active menu theme is a new, lively **136 BPM** swing composition. It is not
a faster playback of the earlier waltz or gameplay song. Short, bright piano
phrases and bouncing walking bass support a foreground toe/heel tap rhythm.
The toe taps have a brief metallic snap; heel taps give a lower wooden pulse.
These are **synthesized sounds, not recordings of real tap shoes or dancers**.

- **42.35294 seconds**, D major, 4/4, 24 bars, stereo, A / B / A′ structure.
- Eighth-note offbeats fall at 62% of each beat for a light shuffle/swing feel.
- 183 toe taps, 108 heel taps, and 48 light brushed backbeats; brief tap breaks
  in the last two beats of bars 8, 16, and 24 vary the looping arrangement.
- `pick-tap-lobby.wav`: 44.1 kHz / 16-bit listening master (7,471,104 bytes).
- `pick-tap-lobby.mp3`: **634,474 bytes**, about 620 KiB, for web playback.
- `pick-tap-lobby.json`: arrangement, instrument/event counts, exact sample count,
  and objective master measurements.
- Encoded MP3 sample peak **−3.27 dBFS**, RMS **−17.96 dBFS**. Mild soft saturation
  controls coincident transients without hard clipping. The runtime music gain
  remains unchanged; this is not a louder playback-setting change.
- Circular note and room tails prevent a truncated loop ending. The decoded
  MP3 has exactly 1,867,765 stereo frames and no added encoder silence padding.
- A new standalone generator, `scripts/generate-tap-lobby.mjs`, creates the
  master. The previous generator and all three previous WAV/MP3/JSON sets remain
  byte-for-byte unchanged so earlier versions can be restored.

## Archived second menu version: Paper Lantern Waltz

This former menu version has a **different composition**, not a remix or a slower version of
the gameplay music. A new F-major melody, changing 16-bar chord progression,
3/4 waltz rhythm, nylon-string-like lead, soft electric piano, and warm bass make
it distinct from Pick Garden's C-major 4/4 marimba arrangement. There is no
percussion. This gentle listening prototype uses no third-party samples.
It is retained for rollback and research, but is not the active menu song.

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

Regenerate the active menu master from the repository root:

```sh
node scripts/generate-tap-lobby.mjs
ffmpeg -y -i public/assets/audio/pick-tap-lobby.wav -codec:a libmp3lame -q:a 4 public/assets/audio/pick-tap-lobby.mp3
node scripts/verify-pick-music.mjs
```

Previous tracks remain reproducible with the unchanged earlier generator.
These commands reproduce preserved originals, not the active menu theme:

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
The verifier checks all eight audio files against each track's sample-count and
meter metadata, clipping headroom, and loop seam. It also checks SHA-256 hashes
of all nine earlier gameplay/menu WAV/MP3/JSON assets and the previous generator
to protect their original versions. The active menu additionally has checks for
its swing, 24-bar duration, synthesized tap arrangement, controlled RMS, at least
3 dB sample-peak headroom, and web MP3 size below 800 kB. The new generator is
deterministic, and the previous generator's default, `--menu`, and `--legacy-menu`
options continue to reproduce the three earlier masters and metadata. Listening on real mobile
speakers/headphones is still needed to judge comfort and repetition fatigue.
