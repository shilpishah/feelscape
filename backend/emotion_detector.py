#!/usr/bin/env python3
"""
Simple Emotion Detector for Feelscape
Outputs one emotion word every 30 seconds based on EEG data from Mind Monitor OSC.
"""

import time
import numpy as np
import torch
import threading
from pythonosc import dispatcher
from pythonosc.osc_server import ThreadingOSCUDPServer
from collections import deque
import logging
import os
from sklearn.preprocessing import StandardScaler

from .neural_networks import EEGEmotionNet
from .data_preprocessing import EEGPreprocessor

class SimpleEmotionDetector:
    def __init__(self, model_path=None, osc_port=8000): # changed to 8000 for compatibility with flask
        self.osc_port = osc_port
        # Updated for 3-class emotion system
        self.emotion_names = ['POSITIVE', 'NEGATIVE', 'NEUTRAL']
        
        # EEG data buffer (10 seconds at 256 Hz = 2560 samples)
        self.sampling_rate = 256  # Match Mind Monitor default
        self.buffer_size = 2560  # 10 seconds at 256Hz
        self.eeg_buffer = deque(maxlen=self.buffer_size)
        self.data_lock = threading.Lock()
        self.last_data_time = None
        self.data_timeout = 10.0  # If no data for 10 seconds, assume disconnected
        
        # Initialize neural network for 3-class system
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = EEGEmotionNet(num_channels=4, num_emotions=3, sequence_length=128).to(self.device)
        self.preprocessor = EEGPreprocessor()
        self.scaler = None
        
        # Load trained model if provided
        if model_path is None:
            # Use the latest trained model
            model_dir = "models"
            if os.path.exists(model_dir):
                model_files = [f for f in os.listdir(model_dir) if f.startswith("best_emotion_model") and f.endswith(".pth")]
                if model_files:
                    model_path = os.path.join(model_dir, sorted(model_files)[-1])
        
        if model_path and os.path.exists(model_path):
            try:
                checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
                self.model.load_state_dict(checkpoint['model_state_dict'])
                self.scaler = checkpoint.get('scaler', None)
                print(f"Loaded trained model from {model_path}")
                print(f"Model trained for classes: {checkpoint.get('class_names', self.emotion_names)}")
            except Exception as e:
                print(f"Error loading model: {e}")
                print("Using untrained model - predictions will be random")
        else:
            print("No model found - using untrained model")
        
        self.osc_server = None
        self.running = False
        
    def start_detection(self):
        """Start the emotion detection system."""
        print("Starting Feelscape Emotion Detector...")
        print("Listening for EEG data on OSC port", self.osc_port)
        print("Will output emotion every 3 seconds (after 5 seconds of data collection)\n")
        
        # Start OSC server
        self._start_osc_server()
        
        # Start emotion detection loop
        self.running = True
        detection_thread = threading.Thread(target=self._emotion_detection_loop, daemon=True)
        detection_thread.start()
        
        try:
            # Keep main thread alive
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping emotion detection...")
            self.stop_detection()
    
    def stop_detection(self):
        """Stop the emotion detection system."""
        self.running = False
        if self.osc_server:
            self.osc_server.shutdown()
    
    def _start_osc_server(self):
        """Start OSC server to receive EEG data using OSC Receiver Simple approach."""
        try:
            # Create dispatcher and add handler (using OSC Receiver Simple pattern)
            disp = dispatcher.Dispatcher()
            disp.map("/muse/eeg", self._handle_eeg_data)
            
            # Start server (using OSC Receiver Simple pattern)
            self.osc_server = ThreadingOSCUDPServer(
                ("0.0.0.0", self.osc_port), disp
            )
            
            server_thread = threading.Thread(target=self.osc_server.serve_forever, daemon=True)
            server_thread.start()
            
        except Exception as e:
            print(f"Failed to start OSC server: {e}")
            print("Make sure python-osc is installed: pip install python-osc")
    
    def _handle_eeg_data(self, address, *args):
        """Handle incoming EEG data from Mind Monitor."""
        if len(args) >= 4:
            with self.data_lock:
                # Store the 4-channel EEG sample (TP9, AF7, AF8, TP10)
                eeg_sample = np.array(args[:4], dtype=np.float32)
                self.eeg_buffer.append(eeg_sample)
                self.last_data_time = time.time()
        else:
            print(f"Received incomplete EEG data: {len(args)} values")
    
    def _emotion_detection_loop(self):
        """Main emotion detection loop - runs every 3 seconds."""
        while self.running:
            time.sleep(3)  # Wait 3 seconds
            
            # Get current emotion
            emotion = self.predict_emotion()
            
            # Output just the emotion word
            if emotion is not None:
                print(emotion)
            else:
                print(f"No prediction - buffer has {len(self.eeg_buffer)} samples (need {self.buffer_size})")
    
    def predict_emotion(self):
        """Predict emotion from current EEG buffer."""
        if len(self.eeg_buffer) < self.buffer_size:
            return None
            
        try:
            with self.data_lock:
                # Convert buffer to numpy array
                eeg_data = np.array(list(self.eeg_buffer))
                
            # Reshape to (channels, samples) - we have 4 channels
            eeg_data = eeg_data.T  # Shape: (4, 7680)
            
            # For the trained model, we need to adapt the data to match training format
            # Create a simplified feature extraction that matches our training data format
            n_channels = 4
            window_size = 128
            
            # Extract features similar to training data adaptation
            features = []
            for ch in range(n_channels):
                channel_data = eeg_data[ch]
                # Take the last window_size samples
                if len(channel_data) >= window_size:
                    features.append(channel_data[-window_size:])
                else:
                    # Pad if needed
                    padded = np.pad(channel_data, (window_size - len(channel_data), 0), 'constant')
                    features.append(padded)
            
            # Stack to create input: shape (4, 128)
            input_data = np.stack(features)
            
            # Apply scaling if available
            if self.scaler is not None:
                # Flatten for scaling
                input_flat = input_data.reshape(1, -1)
                input_scaled = self.scaler.transform(input_flat)
                input_data = input_scaled.reshape(n_channels, window_size)
            
            # Convert to tensor
            input_tensor = torch.FloatTensor(input_data).unsqueeze(0).to(self.device)  # Shape: (1, 4, 128)
            
            # Make prediction
            self.model.eval()
            with torch.no_grad():
                outputs = self.model(input_tensor)
                emotion_logits = outputs['emotions']  # Extract logits from dict
                probabilities = torch.softmax(emotion_logits, dim=1)
                predicted_class = torch.argmax(probabilities, dim=1).item()
                confidence = probabilities[0][predicted_class].item()
                
            emotion = self.emotion_names[predicted_class]
            
            return emotion
            
        except Exception as e:
            print(f"Error in emotion prediction: {e}")
            import traceback
            traceback.print_exc()
            return None

def main():
    """Main function to run the simple emotion detector."""
    detector = SimpleEmotionDetector()
    detector.start_detection()

if __name__ == "__main__":
    main()
