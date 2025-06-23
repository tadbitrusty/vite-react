#!/usr/bin/env python3
"""
Claude Code Background Logger - Automatic Development Documentation System

This script runs in the background and captures:
- All file changes in project directories
- Claude Code session activity
- Conversation threads and commands
- Generates structured markdown documentation

Author: Adam (Navy Veteran building the future)
Purpose: Never lose development context again
"""

import os
import time
import json
import threading
import signal
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set
import psutil
import argparse

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError:
    print("Installing required dependencies...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "watchdog", "psutil"])
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler


class ClaudeLogger:
    """Main logger class that orchestrates all monitoring activities"""
    
    def __init__(self, projects_root: str = None, log_root: str = None):
        self.projects_root = Path(projects_root or os.getcwd()).expanduser()
        self.log_root = Path(log_root or "~/claude_logs").expanduser()
        self.log_root.mkdir(exist_ok=True)
        
        # Active monitoring state
        self.active_sessions: Dict[int, dict] = {}
        self.observers: List[Observer] = []
        self.running = True
        
        # Setup signal handlers for clean shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Create session log for this logger instance
        self.session_log = self.log_root / f"logger_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        self._log_session_start()
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        print(f"\nReceived signal {signum}. Shutting down gracefully...")
        self.running = False
        self.cleanup()
        sys.exit(0)
    
    def _log_session_start(self):
        """Log the start of this logger session"""
        with open(self.session_log, 'w') as f:
            f.write(f"# Claude Background Logger Session\n\n")
            f.write(f"**Started:** {datetime.now()}\n")
            f.write(f"**Monitoring:** {self.projects_root}\n")
            f.write(f"**Logging to:** {self.log_root}\n")
            f.write(f"**PID:** {os.getpid()}\n\n")
            f.write("## Activity Log\n\n")
    
    def start_monitoring(self):
        """Start monitoring all project directories and processes"""
        print(f"🚀 Claude Background Logger Starting...")
        print(f"📁 Monitoring: {self.projects_root}")
        print(f"📝 Logging to: {self.log_root}")
        print(f"🔧 PID: {os.getpid()}")
        print(f"⏹️  Stop with Ctrl+C")
        
        # Setup file system watchers
        self.setup_project_watchers()
        
        # Start process monitoring in background thread
        process_thread = threading.Thread(target=self.monitor_claude_processes, daemon=True)
        process_thread.start()
        
        # Start conversation capture thread
        conversation_thread = threading.Thread(target=self.monitor_conversations, daemon=True)
        conversation_thread.start()
        
        try:
            while self.running:
                time.sleep(5)  # Check every 5 seconds
                self._heartbeat()
        except KeyboardInterrupt:
            self.cleanup()
    
    def _heartbeat(self):
        """Periodic heartbeat to log system status"""
        with open(self.session_log, 'a') as f:
            f.write(f"**Heartbeat:** {datetime.now()} - Active sessions: {len(self.active_sessions)}\n")
    
    def setup_project_watchers(self):
        """Set up file watchers for project directories"""
        if self.projects_root.is_dir():
            self.add_project_watcher(self.projects_root)
        
        # Also watch for new project directories
        for item in self.projects_root.parent.iterdir():
            if item.is_dir() and item.name.startswith('project-'):
                self.add_project_watcher(item)
    
    def add_project_watcher(self, project_path: Path):
        """Add a file system watcher for a project"""
        try:
            handler = ProjectHandler(project_path, self.log_root)
            observer = Observer()
            observer.schedule(handler, str(project_path), recursive=True)
            observer.start()
            self.observers.append(observer)
            print(f"👀 Watching: {project_path.name}")
            
            # Log watcher addition
            with open(self.session_log, 'a') as f:
                f.write(f"**Added Watcher:** {project_path} at {datetime.now()}\n")
        except Exception as e:
            print(f"❌ Failed to watch {project_path}: {e}")
    
    def monitor_claude_processes(self):
        """Monitor for running Claude Code processes"""
        while self.running:
            try:
                for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cwd']):
                    try:
                        if self._is_claude_process(proc.info):
                            self.log_process_activity(proc.info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
            except Exception as e:
                print(f"⚠️  Process monitoring error: {e}")
            
            time.sleep(10)  # Check every 10 seconds
    
    def _is_claude_process(self, proc_info: dict) -> bool:
        """Determine if a process is related to Claude Code"""
        name = proc_info.get('name', '').lower()
        cmdline = ' '.join(proc_info.get('cmdline', [])).lower()
        
        claude_indicators = ['claude', 'anthropic', 'claude-code']
        return any(indicator in name or indicator in cmdline for indicator in claude_indicators)
    
    def log_process_activity(self, proc_info: dict):
        """Log Claude process activity"""
        pid = proc_info['pid']
        
        if pid not in self.active_sessions:
            self.active_sessions[pid] = {
                'start_time': datetime.now(),
                'cwd': proc_info.get('cwd', 'unknown'),
                'cmdline': proc_info.get('cmdline', []),
                'logged': True
            }
            
            # Create session log
            session_log = self.log_root / f"claude_session_{pid}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            with open(session_log, 'w') as f:
                f.write(f"# Claude Code Session {pid}\n\n")
                f.write(f"**Start Time:** {datetime.now()}\n")
                f.write(f"**Working Directory:** {proc_info.get('cwd', 'unknown')}\n")
                f.write(f"**Command:** {' '.join(proc_info.get('cmdline', []))}\n")
                f.write(f"**PID:** {pid}\n\n")
                f.write("## Session Activity\n\n")
            
            print(f"🎯 Detected Claude session: PID {pid}")
    
    def monitor_conversations(self):
        """Monitor and capture conversation threads"""
        # This will be enhanced to capture actual conversation content
        # For now, it monitors for conversation-related file changes
        while self.running:
            try:
                # Look for temporary files, clipboard content, etc.
                # This is a placeholder for conversation capture logic
                time.sleep(30)
            except Exception as e:
                print(f"⚠️  Conversation monitoring error: {e}")
    
    def cleanup(self):
        """Clean up observers and log shutdown"""
        print("🛑 Shutting down logger...")
        
        for observer in self.observers:
            observer.stop()
            observer.join()
        
        # Log session end
        with open(self.session_log, 'a') as f:
            f.write(f"\n**Session Ended:** {datetime.now()}\n")
            f.write(f"**Total Active Sessions:** {len(self.active_sessions)}\n")
        
        print("✅ Logger shutdown complete")


class ProjectHandler(FileSystemEventHandler):
    """Handles file system events for a specific project"""
    
    def __init__(self, project_path: Path, log_root: Path):
        self.project_path = project_path
        self.project_name = project_path.name
        self.log_file = log_root / f"{self.project_name}_activity.md"
        
        # Ignore patterns
        self.ignore_patterns = {
            'node_modules', '.git', '__pycache__', '.vscode', 
            '.idea', 'dist', 'build', '.next'
        }
        
        # Initialize log file
        if not self.log_file.exists():
            self._initialize_log()
    
    def _initialize_log(self):
        """Initialize the project activity log"""
        with open(self.log_file, 'w') as f:
            f.write(f"# {self.project_name} - Development Activity Log\n\n")
            f.write(f"**Project Path:** {self.project_path}\n")
            f.write(f"**Log Started:** {datetime.now()}\n\n")
            f.write("## File Changes\n\n")
    
    def _should_ignore(self, file_path: str) -> bool:
        """Check if file should be ignored"""
        path_parts = Path(file_path).parts
        return any(ignore in path_parts for ignore in self.ignore_patterns)
    
    def on_created(self, event):
        if not event.is_directory and not self._should_ignore(event.src_path):
            self.log_file_change("CREATED", event.src_path)
    
    def on_modified(self, event):
        if not event.is_directory and not self._should_ignore(event.src_path):
            self.log_file_change("MODIFIED", event.src_path)
    
    def on_deleted(self, event):
        if not event.is_directory and not self._should_ignore(event.src_path):
            self.log_file_change("DELETED", event.src_path)
    
    def log_file_change(self, action: str, file_path: str):
        """Log file changes with content when appropriate"""
        try:
            rel_path = Path(file_path).relative_to(self.project_path)
        except ValueError:
            rel_path = Path(file_path)
        
        with open(self.log_file, 'a') as log:
            log.write(f"### {action}: {rel_path}\n")
            log.write(f"**Time:** {datetime.now()}\n\n")
            
            if action != "DELETED":
                try:
                    file_ext = Path(file_path).suffix.lower()
                    
                    # Only log content for text files
                    if file_ext in ['.py', '.js', '.ts', '.tsx', '.md', '.txt', '.json', 
                                   '.yaml', '.yml', '.html', '.css', '.sql']:
                        content = Path(file_path).read_text(encoding='utf-8')
                        
                        # Limit content size
                        if len(content) > 10000:
                            content = content[:10000] + "\n... (truncated)"
                        
                        ext_name = file_ext[1:] if file_ext else 'text'
                        log.write(f"```{ext_name}\n{content}\n```\n\n")
                    else:
                        log.write(f"*Binary file or large file*\n\n")
                        
                except Exception as e:
                    log.write(f"*Could not read file: {e}*\n\n")
            
            log.write("---\n\n")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Claude Code Background Logger')
    parser.add_argument('--projects', '-p', 
                       help='Root directory to monitor for projects')
    parser.add_argument('--logs', '-l', 
                       help='Directory to store logs')
    parser.add_argument('--daemon', '-d', action='store_true',
                       help='Run as daemon in background')
    
    args = parser.parse_args()
    
    logger = ClaudeLogger(
        projects_root=args.projects,
        log_root=args.logs
    )
    
    if args.daemon:
        # Run as daemon (could implement proper daemonization here)
        pass
    
    logger.start_monitoring()


if __name__ == "__main__":
    main()