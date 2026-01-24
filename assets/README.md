# Assets

Organized folders for media and data used by Trivia-Wheel.

## audio/

Place audio files in `assets/audio/`:

- backtrack1.mp4
- backtrack2.mp4
- backtrack3.mp4
- spin-tick.mp3 (optional, for wheel ticking sound)

Notes:
- Filenames must match exactly; formats can be `.mp3` or `.mp4` depending on your sources. Update `index.html` if you use different names/formats.
- The Start button plays `backtrack1` then `backtrack2`, then `backtrack3` which loops continuously. If `spin-tick.mp3` is present, the wheel plays a short tick during spins.

## img/

Place images in `assets/img/`:

- 105.jpg (optional background image referenced by `index.html` and `story.html`)
- Any other images you want to use

## data/

Server-managed data files in `assets/data/`:

- stories.txt (exported story submissions)
