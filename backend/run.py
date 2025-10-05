#!/usr/bin/env python3
"""
Prodsight Backend API Runner
"""

import os
import sys
from app import create_app

def main():
    """Main entry point for the application"""
    # Set default environment
    if not os.environ.get('FLASK_ENV'):
        os.environ['FLASK_ENV'] = 'development'
    
<<<<<<< HEAD
    # Create application with WebSocket support
    app, socketio = create_app()
=======
    # Create application
    app = create_app()
>>>>>>> master
    
    # Get configuration
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'True').lower() == 'true'
    
<<<<<<< HEAD
    print(f"Starting Prodsight API with WebSocket support on {host}:{port}")
    print(f"Debug mode: {debug}")
    print(f"Environment: {os.environ.get('FLASK_ENV', 'development')}")
    
    # Run application with SocketIO
    socketio.run(app, host=host, port=port, debug=debug, allow_unsafe_werkzeug=True)
=======
    print(f"Starting Prodsight API on {host}:{port}")
    print(f"Debug mode: {debug}")
    print(f"Environment: {os.environ.get('FLASK_ENV', 'development')}")
    
    # Run application
    app.run(host=host, port=port, debug=debug)
>>>>>>> master

if __name__ == '__main__':
    main()
