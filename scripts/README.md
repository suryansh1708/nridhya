# Nridhya Scripts

## Launch Development Servers

Starts both the frontend static server and CMS locally.

**Mac/Linux:**
```bash
./scripts/launch.sh
```

**Windows (PowerShell):**
```powershell
pwsh ./scripts/launch.ps1
```

**Servers:**
- Frontend: http://localhost:8000
- CMS: http://localhost:3001
- Preview: http://localhost:3001/preview

Press `Ctrl+C` to stop all servers.

---

## Password-Protected Git Commit

Commits and pushes all changes to git. Requires a password to proceed.

**Mac/Linux:**
```bash
./scripts/commit.sh                    # Interactive (prompts for message)
./scripts/commit.sh -m "My commit"     # With message
./scripts/commit.sh --set-password     # Set/change password
./scripts/commit.sh --reset-password   # Delete old password and set new
```

**Windows (PowerShell):**
```powershell
pwsh ./scripts/commit.ps1                       # Interactive
pwsh ./scripts/commit.ps1 -Message "My commit"  # With message
pwsh ./scripts/commit.ps1 -SetPassword          # Set/change password
pwsh ./scripts/commit.ps1 -ResetPassword        # Reset password
```

---

## Password Management

The password is stored as a SHA-256 hash in `.commit-password` at the project root.

- This file is committed to git, so the **same password works everywhere**
- The actual password is never stored, only its hash
- **Forgot password?** Delete `.commit-password` and run commit script to set a new one

---

## First-Time Setup

1. Run the commit script for the first time
2. You'll be prompted to create a password
3. This password file will be committed to git
4. Use the same password on all machines
