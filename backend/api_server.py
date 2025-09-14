from flask import Flask, jsonify
from flask_cors import CORS
import threading
import time
import numpy as np
from .emotion_detector import SimpleEmotionDetector
from .data_preprocessing import PhysiologicalPreprocessor

app = Flask(__name__)
CORS(app)

# Initialize emotion detector
detector = SimpleEmotionDetector(osc_port=8000)
latest_emotion = {"emotion": None}

# Initialize physiological preprocessor
physio = PhysiologicalPreprocessor()
# Simulated heart rate buffer for testing
hr_buffer = []

def run_detector():
    detector.running = True
    print("Emotion detection loop started, waiting for EEG data...")
    while detector.running:
        buffer_size = len(detector.eeg_buffer)
        print(f"EEG buffer has {buffer_size} samples (need {detector.buffer_size})")
        
        emotion = detector.predict_emotion()
        if emotion:
            latest_emotion["emotion"] = emotion
            print(f" Emotion detected: {emotion}")
        else:
            print("No emotion prediction - insufficient data")
        time.sleep(3)

def update_hr_buffer():
    """Simulate fetching HR from data preprocessing continuously"""
    while True:
        # Example: replace with real HR data acquisition
        simulated_hr = np.random.randint(60, 100)  # simulate heart rate 60-100 BPM
        hr_buffer.append(simulated_hr)
        # keep last 300 points (~15 min at 2s intervals)
        if len(hr_buffer) > 300:
            hr_buffer.pop(0)
        time.sleep(2)

@app.route("/emotion", methods=["GET"])
def get_emotion():
    return jsonify(latest_emotion)

@app.route("/biometrics", methods=["GET"])
def get_biometrics():
    if len(hr_buffer) == 0:
        return jsonify({"status": "no_data"})
    
    latest_hr = hr_buffer[-1]
    return jsonify({
        "status": "ok",
        "heart_rate": latest_hr
    })

if __name__ == "__main__":
    # Start OSC server for emotion detection
    detector._start_osc_server()
    
    # Start emotion detection thread
    t1 = threading.Thread(target=run_detector, daemon=True)
    t1.start()

    # Start HR buffer update thread
    t2 = threading.Thread(target=update_hr_buffer, daemon=True)
    t2.start()

    print("Server running with /emotion and /biometrics endpoints...")
    app.run(host="0.0.0.0", port=8000)
