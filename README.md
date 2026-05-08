# Nridhya

Website for Lawanya Gupta - Hosted on GitHub Pages

## Project Structure

```
nridhya/
├── content/          # Source HTML pages and assets
│   ├── pages/        # HTML templates
│   ├── fonts/        # Custom fonts
│   └── images/       # Image assets
├── dist/             # Built static site (served by GitHub Pages)
├── frontend/         # Static site builder
└── local-cms/        # Local CMS for content management
```

## Local Development

### Frontend Only (Quick Start)

Serve the static site using Python:

```bash
cd dist
python -m http.server 8000
```

Open http://localhost:8000

### With CMS (Full Setup)

Requires Node.js installed.

1. Install CMS dependencies:
```bash
cd local-cms
npm install
```

2. Install frontend builder dependencies:
```bash
cd frontend
npm install
```

3. Start the CMS server:
```bash
cd local-cms
npm start
```

4. Open http://localhost:3001
   - CMS UI: http://localhost:3001
   - Preview: http://localhost:3001/preview

### Building the Site

```bash
cd frontend
npm run build
```

This compiles content from `content/pages/` into `dist/`.

## Deployment

The site is automatically deployed via GitHub Pages from the `dist/` folder.
