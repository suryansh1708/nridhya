#!/bin/bash
# Nridhya Development Server Launcher (Bash - Mac/Linux)
# Usage: ./scripts/launch.sh          # build frontend, then start servers
#        ./scripts/launch.sh --no-build

echo ""
echo "================================"
echo "  NRIDHYA DEVELOPMENT SERVERS   "
echo "================================"
echo ""

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

NO_BUILD=false
if [ "${1:-}" = "--no-build" ]; then
    NO_BUILD=true
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    exit 1
fi

# Check for Python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "ERROR: Python is not installed!"
    exit 1
fi

# Check if venv exists and use it
if [ -f ".venv/bin/python" ]; then
    PYTHON_CMD=".venv/bin/python"
fi
if [ -f ".venv/bin/npm" ]; then
    NPM_CMD=".venv/bin/npm"
else
    NPM_CMD="npm"
fi

if [ "$NO_BUILD" = false ]; then
    echo "[0/2] Building static site (frontend)..."
    (cd "$PROJECT_ROOT/frontend" && $NPM_CMD run build) || {
        echo "ERROR: Frontend build failed."
        exit 1
    }
    echo ""
fi

echo "Starting servers..."
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $FRONTEND_PID 2>/dev/null
    kill $CMS_PID 2>/dev/null
    echo "Servers stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Frontend (static file server)
echo "[1/2] Serving dist/ on http://localhost:8000"
cd "$PROJECT_ROOT/dist"
$PYTHON_CMD -m http.server 8000 &
FRONTEND_PID=$!

# Start CMS
echo "[2/2] Starting CMS on http://localhost:3001"
cd "$PROJECT_ROOT/local-cms"
$NPM_CMD start &
CMS_PID=$!

cd "$PROJECT_ROOT"

echo ""
echo "================================"
echo "  SERVERS RUNNING              "
echo "================================"
echo ""
echo "  Frontend: http://localhost:8000"
echo "  CMS:      http://localhost:3001"
echo "  Preview:  http://localhost:3001/preview"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait
