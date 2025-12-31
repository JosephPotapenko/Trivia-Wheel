# Trivia-Wheel

Minimal modern trivia game with a wheel-based UI.

## Client-Only Save + Import

No server required. Submissions are stored in the browser’s localStorage and imported directly into the game.

- Storage key: `twSubmissionsText`
- Format: one line per entry using `Question||Answer`. The story page writes `Q||...` (question only); answers are filled with defaults if missing.

### Use It

1. Open [story.html](story.html) in a browser.
2. Submit a story and name. The page sanitizes and appends the line to localStorage.
3. Open [index.html](index.html), click `Edit`, then `Import submissions`.
4. After the game, click `Clear import` in the editor to delete stored submissions.

## Story Submission Page

- New page: [story.html](story.html)
- Share this link for users to submit one story and name.
- The page runs a lightweight, client-side AI-style sanitizer to remove identifying details, polish grammar, and add gentle dad humor without changing the core story content.
- Optional remote model: append `?modelEndpoint=https://your-endpoint` to the URL to proxy through a server-side sanitizer.

### Try it locally

Open [story.html](story.html) directly. Submissions persist per browser via localStorage.

## Features

- Wheel spin with animated tick sound
- Editable questions/answers and configuration
- Team scores with simple editing