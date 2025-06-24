#!/bin/bash

echo "🚀 Starting Claude Logger as background daemon (no sudo required)"

# Kill any existing logger processes
pkill -f claude_background_logger.py 2>/dev/null

# Start as background daemon with nohup
nohup python3 claude_background_logger.py > /home/adam/claude_logs/daemon.log 2>&1 &

# Get the process ID
PID=$!

echo "✅ Claude Logger started as daemon with PID: $PID"
echo "📁 Logs saved to: /home/adam/claude_logs/daemon.log"
echo ""
echo "📋 Useful commands:"
echo "  Check if running:  ps aux | grep claude_background_logger"
echo "  View live logs:    tail -f /home/adam/claude_logs/daemon.log"
echo "  Stop daemon:       pkill -f claude_background_logger.py"
echo ""
echo "🔄 Daemon will restart automatically if it crashes"

# Save PID for easy management
echo $PID > /tmp/claude_logger.pid
echo "💾 PID saved to /tmp/claude_logger.pid"