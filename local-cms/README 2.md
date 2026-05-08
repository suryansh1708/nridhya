# Local CMS Backend

This directory contains the Node.js backend modules for managing your static site locally.

## Prerequisites

Since this runs on your local machine, you need **Node.js** and **npm** installed. 
If you don't have it, download it from [nodejs.org](https://nodejs.org/).

## Setup

1. Open your terminal and navigate to this directory:
   ```bash
   cd local-cms
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```

## Running the API

Start the backend server in development mode (auto-reloads on changes):
```bash
npm run dev
```

The server will start at `http://localhost:3001`.

## Endpoints Available

### Content Management (Reads/Writes to `/content` folder)
- `GET /api/content/:collection` - List files in a folder
- `GET /api/content/:collection/:id` - Read a specific file (e.g. `site-config.json`)
- `PUT /api/content/:collection/:id` - Update a file

### Build & Deploy
- `POST /api/build` - Triggers the frontend framework build
- `POST /api/git/commit` - Commits changes to Git
- `POST /api/git/push` - Pushes to GitHub

You can test this easily using Postman, cURL, or by building the local UI module!
