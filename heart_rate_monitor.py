#!/usr/bin/env python3
"""
Live Heart Rate Monitor for Feelscape
Real-time heart rate visualization from Muse headband PPG data via OSC.
"""

import time
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from collections import deque
import threading
from pythonosc import dispatcher
from pythonosc.osc_server import ThreadingOSCUDPServer
from scipy.signal import find_peaks, butter, filtfilt

class HeartRateMonitor:
    def __init__(self, osc_port=5000):
        self.osc_port = osc_port
        
        # PPG data buffer (60 seconds at ~64Hz = ~3840 samples)
        self.buffer_size = 3840
        self.ppg_buffer = deque(maxlen=self.buffer_size)
        self.data_lock = threading.Lock()
        
        # Heart rate calculation
        self.sampling_rate = 64  # Muse PPG sampling rate
        self.heart_rates = deque(maxlen=50)  # Store last 50 HR measurements
        self.timestamps = deque(maxlen=50)
        
        # Real-time plotting
        self.fig, (self.ax1, self.ax2) = plt.subplots(2, 1, figsize=(12, 8))
        self.fig.suptitle('Feelscape - Live Heart Rate Monitor', fontsize=16, fontweight='bold')
        
        # PPG signal plot
        self.ax1.set_title('PPG Signal (Raw)')
        self.ax1.set_xlabel('Time (seconds)')
        self.ax1.set_ylabel('Amplitude')
        self.ax1.grid(True, alpha=0.3)
        self.ppg_line, = self.ax1.plot([], [], 'b-', linewidth=1)
        
        # Heart rate plot
        self.ax2.set_title('Heart Rate (BPM)')
        self.ax2.set_xlabel('Time (seconds)')
        self.ax2.set_ylabel('BPM')
        self.ax2.grid(True, alpha=0.3)
        self.ax2.set_ylim(50, 120)
        self.hr_line, = self.ax2.plot([], [], 'r-', linewidth=2, marker='o', markersize=4)
        
        # Current HR display
        self.hr_text = self.ax2.text(0.02, 0.95, '', transform=self.ax2.transAxes, 
                                    fontsize=14, fontweight='bold', 
                                    bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.7))
        
        self.osc_server = None
        self.running = False
        self.last_hr_calc = 0
        
    def start_monitoring(self):
        """Start the heart rate monitoring system."""
        print("Starting Feelscape Heart Rate Monitor...")
        print("Listening for PPG data on OSC port", self.osc_port)
        print("Heart rate graph will appear shortly...\n")
        
        # Start OSC server
        self._start_osc_server()
        
        # Start animation
        self.running = True
        ani = animation.FuncAnimation(self.fig, self._update_plot, interval=2000, blit=False)
        
        plt.tight_layout()
        plt.show()
        
    def _start_osc_server(self):
        """Start OSC server to receive PPG data."""
        try:
            disp = dispatcher.Dispatcher()
            disp.map("/muse/ppg", self._handle_ppg_data)
            
            self.osc_server = ThreadingOSCUDPServer(
                ("0.0.0.0", self.osc_port), disp
            )
            
            server_thread = threading.Thread(target=self.osc_server.serve_forever, daemon=True)
            server_thread.start()
            
        except Exception as e:
            print(f"Failed to start OSC server: {e}")
            print("Make sure python-osc is installed: pip install python-osc")
    
    def _handle_ppg_data(self, address, *args):
        """Handle incoming PPG data from Mind Monitor."""
        if len(args) >= 3:  # PPG typically has 3 channels
            with self.data_lock:
                # Use the first PPG channel (usually the best quality)
                ppg_sample = float(args[0])
                self.ppg_buffer.append(ppg_sample)
                
                # Calculate heart rate every 2 seconds
                current_time = time.time()
                if current_time - self.last_hr_calc > 2.0 and len(self.ppg_buffer) > 128:
                    self._calculate_heart_rate()
                    self.last_hr_calc = current_time
    
    def _calculate_heart_rate(self):
        """Calculate heart rate from PPG buffer using simple peak detection."""
        try:
            ppg_data = np.array(list(self.ppg_buffer))
            
            if len(ppg_data) < 128:
                return
                
            # Simple bandpass filter for heart rate range (0.5-4 Hz)
            nyquist = self.sampling_rate / 2
            low = 0.5 / nyquist
            high = 4.0 / nyquist
            b, a = butter(2, [low, high], btype='band')
            filtered_ppg = filtfilt(b, a, ppg_data)
            
            # Find peaks with minimum distance between them
            min_distance = int(self.sampling_rate * 0.4)  # min 0.4s between peaks (150 BPM max)
            peaks, properties = find_peaks(filtered_ppg, 
                                         distance=min_distance,
                                         prominence=np.std(filtered_ppg) * 0.3)
            
            if len(peaks) > 2:
                # Calculate heart rate from peak intervals
                peak_intervals = np.diff(peaks) / self.sampling_rate  # intervals in seconds
                
                # Remove outliers (very short or long intervals)
                valid_intervals = peak_intervals[(peak_intervals > 0.33) & (peak_intervals < 1.5)]
                
                if len(valid_intervals) > 0:
                    heart_rate = 60.0 / np.mean(valid_intervals)  # convert to BPM
                    
                    # Validate heart rate (reasonable range)
                    if 40 <= heart_rate <= 180:
                        current_time = time.time()
                        self.heart_rates.append(heart_rate)
                        self.timestamps.append(current_time)
                        
        except Exception as e:
            print(f"Heart rate calculation error: {e}")
    
    def _update_plot(self, frame):
        """Update the real-time plots."""
        with self.data_lock:
            # Update PPG signal plot
            if len(self.ppg_buffer) > 0:
                ppg_data = list(self.ppg_buffer)
                time_axis = np.arange(len(ppg_data)) / self.sampling_rate
                self.ppg_line.set_data(time_axis, ppg_data)
                self.ax1.set_xlim(0, len(ppg_data) / self.sampling_rate)

                # Set x-axis ticks every 5 seconds for better granularity
                max_time = len(ppg_data) / self.sampling_rate
                tick_positions = np.arange(0, max_time + 5, 5)
                self.ax1.set_xticks(tick_positions)
                
                if len(ppg_data) > 1:
                    data_range = max(ppg_data) - min(ppg_data)
                    margin = data_range * 0.1 if data_range > 0 else 0.1
                    self.ax1.set_ylim(min(ppg_data) - margin, max(ppg_data) + margin)
            
            # Update heart rate plot
            if len(self.heart_rates) > 0:
                # Use sequential time points instead of relative timestamps
                time_points = list(range(len(self.heart_rates)))
                
                self.hr_line.set_data(time_points, list(self.heart_rates))
                self.ax2.set_xlim(0, max(50, len(self.heart_rates)))
                
                # Update current HR text
                latest_hr = self.heart_rates[-1]
                self.hr_text.set_text(f'Current HR: {latest_hr:.1f} BPM')
                
                # Color coding for HR zones
                if latest_hr < 60:
                    color = 'blue'  # Resting
                elif latest_hr < 100:
                    color = 'green'  # Normal
                elif latest_hr < 140:
                    color = 'orange'  # Elevated
                else:
                    color = 'red'  # High
                    
                self.hr_line.set_color(color)
        
        return self.ppg_line, self.hr_line, self.hr_text

def main():
    """Main function to run the heart rate monitor."""
    monitor = HeartRateMonitor()
    monitor.start_monitoring()

if __name__ == "__main__":
    main()
