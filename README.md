# Trivia-Wheel

Minimal modern trivia game with a wheel-based UI.

## Client-Only Save + Import

No server required. Submissions are stored in the browser’s localStorage and imported directly into the game.

- Storage key: `twSubmissionsText`
- Format: one line per entry using `Question||Answer`. The story page writes `Q||...` (question only); answers are filled with defaults if missing.

### Use It

1. Open [story.html](story.html) in a browser.
2. Submit a story and name. The page appends `story||name` to localStorage.
3. Open [index.html](index.html), click `Edit`, then `Import submissions`. The spinning wheel count equals the number of submissions (capped at 40).
4. After the game, click `Clear import` in the editor to delete stored submissions.
5. Use `Clear Questions` in the editor to reset all questions/answers back to defaults.

## Story Submission Page

- New page: [story.html](story.html)
- Share this link for users to submit one story and name.
- The page stores entries exactly as entered (no AI changes).

### Try it locally

Open [story.html](story.html) directly. Submissions persist per browser via localStorage.

## Features

- Wheel spin with animated tick sound
- Editable questions/answers and configuration
- Team scores with simple editing