# Trivia-Wheel

Minimal modern trivia game with a clean, wheel-based UI.

## Client-Only Save + Import

No server required. Submissions are stored in the browser’s localStorage and imported directly into the game.

- Storage key: `twSubmissionsText`
- Format: one line per entry using `Question||Answer`. The story page writes `Q||...` (question only); answers are filled with defaults if missing.

### Use It

1. Open [story.html](story.html) in a browser.
2. Submit a story and name. The page appends `story||name` to localStorage.
3. Open [index.html](index.html), click `Edit`, then `Import submissions`. The spinning wheel count equals the number of submissions (capped at 40). The editor will automatically close after import to preserve anonymity.
4. After the game, click `Clear import` in the editor to delete stored submissions.
5. Use `Clear Questions` in the editor to reset all questions/answers back to defaults.

### Import and Clear Etiquette

- Import submissions reads entries from the current browser’s localStorage and immediately closes the editor so no one sees the text.
- To be respectful of future users, please open the editor and click `Clear import` when the game is over. This removes stored submissions so next sessions begin clean.

## Story Submission Page

- New page: [story.html](story.html)
- Share this link for users to submit one story and name.
- The page stores entries exactly as entered (no AI changes).

### Try it locally

Open [story.html](story.html) directly. Submissions persist per browser via localStorage.

## Server Export (optional)

If you want to persist submitted stories into the repository file [assets/data/stories.txt](assets/data/stories.txt):

1. Start the local server:

```bash
python3 server.py
```

2. Visit `http://127.0.0.1:8000/story.html` and click “Export to Server”. This writes all locally stored submissions to `assets/data/stories.txt`.
3. In the game editor, “Import submissions” will attempt to fetch processed stories from the server (`/api/import`) when available. If the server is unreachable, the game falls back to localStorage import.

## Project Structure

```
Trivia-Wheel/
├─ index.html               # Main game (uses assets/css/main.css, assets/js/app.js)
├─ story.html               # Story submission page (uses assets/css/story.css, assets/js/story.js)
├─ server.py                # Local server (/api/submit, /api/import, /api/export-submissions)
├─ assets/
│  ├─ css/
│  │  ├─ main.css          # Game styles
│  │  └─ story.css         # Story page styles
│  ├─ js/
│  │  ├─ app.js            # Game logic
│  │  └─ story.js          # Story page logic
│  ├─ img/
│  │  ├─ 105.jpg           # Optional background
│  │  └─ favicon.svg       # Minimal trivia wheel favicon
│  ├─ audio/               # Backtracks and sfx
│  └─ data/
│     └─ stories.txt       # Exported submissions (server-managed)
└─ README.md
```
3. New submissions will also attempt to sync to the server automatically; if the server isn’t running, they remain in localStorage and can be exported later.

## Features

- Clean, structured assets and code
- Minimal SVG favicon (trivia wheel)
- Wheel spin with animated tick sound
- Editable questions/answers and configuration
- Team scores with simple editing
 - Team member lists per team with collapsible editor
 - Spin avoids questions matching team member names when possible