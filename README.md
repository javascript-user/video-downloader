# YouTube Video Downloader Web App

A web application that allows users to download videos from YouTube and other supported platforms by pasting URLs, selecting quality/format options, and downloading directly to their device.

## Features

- 🚀 Fetch all available video formats/qualities from a URL
- 📥 Direct download to user's device (no server storage)
- 🌐 Cross-platform support (works on Chrome, Firefox, Safari, etc.)
- ⚡ Fast streaming via yt-dlp (no intermediate files)
- 🔒 Safe filename handling and MIME type detection

## Tech Stack

**Backend (Render):**

- Node.js + Express.js
- yt-dlp (via yt-dlp-wrap)
- CORS handling

**Frontend (Vercel):**

- HTML/CSS/JavaScript
- Fetch API for backend communication

## Setup Instructions

### 1. Backend Setup (Render)

1. **Create new Web Service** on Render
2. Set these environment variables:
3. Set build command: node server.js
