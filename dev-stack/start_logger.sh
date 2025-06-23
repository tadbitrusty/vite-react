#!/bin/bash
# Claude Code Background Logger Startup Script
# Navy Veteran's Development Arsenal - Never lose context again

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Claude Code Background Logger${NC}"
echo -e "${BLUE}================================${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
LOGGER_SCRIPT="$SCRIPT_DIR/claude_background_logger.py"

# Default directories
DEFAULT_PROJECTS_ROOT="$(dirname "$SCRIPT_DIR")"
DEFAULT_LOGS_ROOT="$HOME/claude_logs"

# Parse command line arguments
PROJECTS_ROOT="$DEFAULT_PROJECTS_ROOT"
LOGS_ROOT="$DEFAULT_LOGS_ROOT"
DAEMON_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--projects)
            PROJECTS_ROOT="$2"
            shift 2
            ;;
        -l|--logs)
            LOGS_ROOT="$2"
            shift 2
            ;;
        -d|--daemon)
            DAEMON_MODE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -p, --projects DIR    Directory to monitor for projects (default: $DEFAULT_PROJECTS_ROOT)"
            echo "  -l, --logs DIR        Directory to store logs (default: $DEFAULT_LOGS_ROOT)"
            echo "  -d, --daemon          Run in daemon mode (background)"
            echo "  -h, --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                           # Monitor current project with default settings"
            echo "  $0 -p ~/projects -l ~/logs   # Custom directories"
            echo "  $0 -d                        # Run in background"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Projects: ${GREEN}$PROJECTS_ROOT${NC}"
echo -e "  Logs:     ${GREEN}$LOGS_ROOT${NC}"
echo -e "  Mode:     ${GREEN}$([ "$DAEMON_MODE" = true ] && echo "Daemon" || echo "Interactive")${NC}"
echo ""

# Check if Python script exists
if [[ ! -f "$LOGGER_SCRIPT" ]]; then
    echo -e "${RED}❌ Logger script not found: $LOGGER_SCRIPT${NC}"
    exit 1
fi

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.${NC}"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p "$LOGS_ROOT"

# Check if logger is already running
LOGGER_PID=$(pgrep -f "claude_background_logger.py" || true)
if [[ -n "$LOGGER_PID" ]]; then
    echo -e "${YELLOW}⚠️  Logger already running with PID: $LOGGER_PID${NC}"
    echo -e "${YELLOW}   Use 'kill $LOGGER_PID' to stop it first.${NC}"
    exit 1
fi

# Install dependencies if needed
echo -e "${BLUE}📦 Checking dependencies...${NC}"
python3 -c "import watchdog, psutil" 2>/dev/null || {
    echo -e "${YELLOW}📦 Installing required dependencies...${NC}"
    python3 -m pip install watchdog psutil --user
}

# Start the logger
echo -e "${GREEN}🚀 Starting Claude Background Logger...${NC}"
echo ""

if [[ "$DAEMON_MODE" = true ]]; then
    # Run in background
    nohup python3 "$LOGGER_SCRIPT" --projects "$PROJECTS_ROOT" --logs "$LOGS_ROOT" > "$LOGS_ROOT/logger_output.log" 2>&1 &
    LOGGER_PID=$!
    echo -e "${GREEN}✅ Logger started in daemon mode with PID: $LOGGER_PID${NC}"
    echo -e "${BLUE}📝 Logs: $LOGS_ROOT${NC}"
    echo -e "${BLUE}📄 Output: $LOGS_ROOT/logger_output.log${NC}"
    echo -e "${YELLOW}🛑 Stop with: kill $LOGGER_PID${NC}"
    
    # Save PID for easy stopping
    echo "$LOGGER_PID" > "$LOGS_ROOT/logger.pid"
    echo -e "${BLUE}💾 PID saved to: $LOGS_ROOT/logger.pid${NC}"
else
    # Run interactively
    echo -e "${BLUE}🎯 Running in interactive mode (Ctrl+C to stop)${NC}"
    python3 "$LOGGER_SCRIPT" --projects "$PROJECTS_ROOT" --logs "$LOGS_ROOT"
fi