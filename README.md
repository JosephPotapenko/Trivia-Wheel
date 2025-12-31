# Trivia-Wheel

Minimal modern trivia game with a wheel-based UI.

## Story Submission Page

- New page: [story.html](story.html)
- Share this link for users to submit one story and name.
- The page runs a lightweight, client-side AI-style sanitizer to remove identifying details, polish grammar, and add gentle dad humor without changing the core story content.
- Optional remote model: append `?modelEndpoint=https://your-endpoint` to the URL to proxy through a server-side sanitizer.

### Try it locally

Open [story.html](story.html) directly in a browser. After submission, the page disables further input to enforce one submission per device (localStorage-based). Copy or download the sanitized result.

## Features

- Wheel spin with animated tick sound
- Editable questions/answers and configuration
- Team scores with simple editing