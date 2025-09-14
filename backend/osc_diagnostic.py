#!/usr/bin/env python3
"""
OSC Diagnostic Tool for Mind Monitor
Tests if EEG data is being received from Mind Monitor app.
"""

import time
from pythonosc import dispatcher
from pythonosc.osc_server import ThreadingOSCUDPServer
import threading

class OSCDiagnostic:
    def __init__(self, port=8000):
        self.port = port
        self.server = None
        self.running = False
        self.data_received = False
        self.last_message_time = None
        self.message_count = 0
        
    def start_diagnostic(self):
        """Start the OSC diagnostic server."""
        print(f"🔍 OSC Diagnostic Tool Starting...")
        print(f"📡 Listening on port {self.port}")
        print(f"📱 Make sure Mind Monitor is configured to send to this computer's IP on port {self.port}")
        print(f"⚡ Looking for /muse/eeg messages...")
        print(f"🔄 Press Ctrl+C to stop\n")
        
        # Create dispatcher
        disp = dispatcher.Dispatcher()
        disp.map("/muse/eeg", self._handle_eeg)
        disp.map("/muse/*", self._handle_any_muse)  # Catch any muse message
        disp.map("/*", self._handle_any)  # Catch any message
        
        try:
            # Start server
            self.server = ThreadingOSCUDPServer(("0.0.0.0", self.port), disp)
            self.running = True
            
            # Start server in background
            server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
            server_thread.start()
            
            # Monitor for data
            start_time = time.time()
            while self.running:
                time.sleep(1)
                elapsed = time.time() - start_time
                
                if self.data_received:
                    time_since_last = time.time() - self.last_message_time if self.last_message_time else 0
                    print(f"✅ Receiving data! Messages: {self.message_count}, Last: {time_since_last:.1f}s ago")
                else:
                    print(f"⏳ Waiting for data... ({elapsed:.0f}s)")
                    
                if elapsed > 30 and not self.data_received:
                    print("\n❌ No data received after 30 seconds!")
                    print("🔧 Troubleshooting steps:")
                    print("   1. Check Mind Monitor IP address matches this computer")
                    print("   2. Verify OSC streaming is enabled in Mind Monitor")
                    print("   3. Ensure port 5000 is set in Mind Monitor")
                    print("   4. Check if firewall is blocking port 5000")
                    print("   5. Verify phone and computer are on same network")
                    break
                    
        except KeyboardInterrupt:
            print("\n🛑 Stopping diagnostic...")
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            self.stop_diagnostic()
    
    def stop_diagnostic(self):
        """Stop the diagnostic server."""
        self.running = False
        if self.server:
            self.server.shutdown()
            
    def _handle_eeg(self, address, *args):
        """Handle EEG data messages."""
        self.data_received = True
        self.last_message_time = time.time()
        self.message_count += 1
        
        if self.message_count == 1:
            print(f"🎉 First EEG message received!")
            print(f"📊 EEG data: {len(args)} channels")
            if len(args) >= 4:
                print(f"📈 Sample values: {args[:4]}")
            else:
                print(f"⚠️  Expected 4 channels, got {len(args)}")
    
    def _handle_any_muse(self, address, *args):
        """Handle any muse message."""
        if not self.data_received:
            print(f"📡 Received Muse message: {address} ({len(args)} args)")
    
    def _handle_any(self, address, *args):
        """Handle any OSC message."""
        if not address.startswith('/muse') and not self.data_received:
            print(f"📨 Received OSC message: {address}")

def main():
    diagnostic = OSCDiagnostic()
    diagnostic.start_diagnostic()

if __name__ == "__main__":
    main()
