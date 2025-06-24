#!/bin/bash

echo "🚀 Setting up Claude Logger as permanent daemon service"

# Copy service file to systemd
echo "📂 Installing service file..."
sudo cp claude-logger.service /etc/systemd/system/

# Reload systemd to recognize new service
echo "🔄 Reloading systemd..."
sudo systemctl daemon-reload

# Enable service to start on boot
echo "✅ Enabling service to start on boot..."
sudo systemctl enable claude-logger.service

# Start the service now
echo "🚀 Starting Claude Logger service..."
sudo systemctl start claude-logger.service

# Check status
echo "📊 Service status:"
sudo systemctl status claude-logger.service --no-pager

echo ""
echo "🎉 Claude Logger is now running as a permanent daemon!"
echo ""
echo "📋 Useful commands:"
echo "  Check status:  sudo systemctl status claude-logger"
echo "  Stop service:  sudo systemctl stop claude-logger"
echo "  Start service: sudo systemctl start claude-logger"
echo "  View logs:     sudo journalctl -u claude-logger -f"
echo "  Disable:       sudo systemctl disable claude-logger"