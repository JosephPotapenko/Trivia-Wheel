# Trivia-Wheel

Minimal modern trivia game with a wheel-based UI.

## Repository Save + Import

This repo now saves story submissions to a text file and imports them directly into the game.

- Save destination: [assets/stories.txt](assets/stories.txt)
- Format: one line per entry using `Question||Answer`. The story page writes only the question part (`Q||...`); the game fills default answers.

### Run the local server

Use the built-in Python HTTP server with a POST endpoint to append submissions to `assets/stories.txt`.

```
python3 server.py
```

Then visit:

- Story submission: http://localhost:8000/story.html
- Game: http://localhost:8000/index.html

In the game editor, click `Import submissions` to load questions from `assets/stories.txt`.

## Story Submission Page

- New page: [story.html](story.html)
- Share this link for users to submit one story and name.
- The page runs a lightweight, client-side AI-style sanitizer to remove identifying details, polish grammar, and add gentle dad humor without changing the core story content.
- Optional remote model: append `?modelEndpoint=https://your-endpoint` to the URL to proxy through a server-side sanitizer.

### Try it locally

Open [story.html](story.html) via the local server at http://localhost:8000/story.html. Submissions are saved into [assets/stories.txt](assets/stories.txt).

## Features

- Wheel spin with animated tick sound
- Editable questions/answers and configuration
- Team scores with simple editing