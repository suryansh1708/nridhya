# Nridhya Scripts

## Workflow after edits (GitHub + localhost)

1. **Push changes to Git** (from repo root):

   ```bash
   chmod +x scripts/push-latest.sh scripts/launch.sh   # once per machine
   ./scripts/push-latest.sh "Describe your change"
   ```

   ```powershell
   pwsh ./scripts/push-latest.ps1 "Describe your change"
   ```

   This stages everything, commits if there are changes, and pushes the current branch to `origin`.

2. **Run frontend + CMS locally** (always runs a **fresh build** of the static site, then serves `dist/` and starts the CMS):

   ```bash
   ./scripts/launch.sh
   ```

   Skip the build step if you already built manually:

   ```bash
   ./scripts/launch.sh --no-build
   ```

   ```powershell
   pwsh ./scripts/launch.ps1
   pwsh ./scripts/launch.ps1 -NoBuild
   ```

**URLs**

- Frontend (built site): http://localhost:8000  
- CMS: http://localhost:3001  
- CMS preview: http://localhost:3001/preview  

Press `Ctrl+C` to stop the launch script (bash) or PowerShell cleanup on exit.
