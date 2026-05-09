#!/bin/bash
# Nridhya Password-Protected Git Commit (Bash - Mac/Linux)
# Usage: ./scripts/commit.sh [-m "message"] [--set-password] [--reset-password]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PASSWORD_FILE="$PROJECT_ROOT/.commit-password"

# Function to hash password
hash_password() {
    echo -n "$1" | shasum -a 256 | cut -d' ' -f1
}

# Function to set new password
set_new_password() {
    echo ""
    echo "=== SET COMMIT PASSWORD ==="
    echo ""
    
    # Read password (hidden input)
    echo -n "Enter new password: "
    read -s password1
    echo ""
    
    echo -n "Confirm password: "
    read -s password2
    echo ""
    
    if [ "$password1" != "$password2" ]; then
        echo "ERROR: Passwords do not match!"
        return 1
    fi
    
    if [ ${#password1} -lt 4 ]; then
        echo "ERROR: Password must be at least 4 characters!"
        return 1
    fi
    
    hash=$(hash_password "$password1")
    echo -n "$hash" > "$PASSWORD_FILE"
    
    echo ""
    echo "Password set successfully!"
    echo "This password file will be committed to git."
    echo "The same password will work on any machine."
    echo ""
    return 0
}

# Function to verify password
verify_password() {
    if [ ! -f "$PASSWORD_FILE" ]; then
        echo "No password set. Setting up now..."
        set_new_password
        return $?
    fi
    
    stored_hash=$(cat "$PASSWORD_FILE" | tr -d '\n')
    
    echo ""
    echo -n "Enter commit password: "
    read -s password
    echo ""
    
    input_hash=$(hash_password "$password")
    
    if [ "$input_hash" = "$stored_hash" ]; then
        return 0
    else
        echo "ERROR: Incorrect password!"
        echo ""
        echo "Forgot password? Delete '.commit-password' file and run again to set a new one."
        return 1
    fi
}

# Parse arguments
MESSAGE=""
SET_PASSWORD=false
RESET_PASSWORD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--message)
            MESSAGE="$2"
            shift 2
            ;;
        --set-password)
            SET_PASSWORD=true
            shift
            ;;
        --reset-password)
            RESET_PASSWORD=true
            shift
            ;;
        *)
            MESSAGE="$1"
            shift
            ;;
    esac
done

echo ""
echo "================================"
echo "  NRIDHYA SECURE COMMIT        "
echo "================================"

# Handle password reset
if [ "$RESET_PASSWORD" = true ]; then
    if [ -f "$PASSWORD_FILE" ]; then
        rm "$PASSWORD_FILE"
        echo "Password file deleted."
    fi
    set_new_password
    exit 0
fi

# Handle setting new password
if [ "$SET_PASSWORD" = true ]; then
    set_new_password
    exit 0
fi

# Verify password before commit
if ! verify_password; then
    exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

# Show status
echo ""
echo "Current changes:"
git status --short

# Get commit message
if [ -z "$MESSAGE" ]; then
    echo ""
    echo -n "Enter commit message: "
    read MESSAGE
fi

if [ -z "$MESSAGE" ]; then
    echo "ERROR: Commit message is required!"
    exit 1
fi

# Add all changes
echo ""
echo "Adding all changes..."
git add -A

# Commit
echo "Committing..."
git commit -m "$MESSAGE"

if [ $? -eq 0 ]; then
    # Push
    echo "Pushing to remote..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "================================"
        echo "  COMMIT & PUSH SUCCESSFUL!    "
        echo "================================"
    else
        echo "Push failed!"
    fi
else
    echo "Nothing to commit or commit failed."
fi
