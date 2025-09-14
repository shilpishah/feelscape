from flask import Flask, jsonify
from flask_cors import CORS
import threading
import time
from .emotion_detector import SimpleEmotionDetector
import numpy as np

app = Flask(__name__)
CORS(app)

# Initialize emotion detector with port 8000 to match Mind Monitor
detector = SimpleEmotionDetector(osc_port=8000)
latest_emotion = {"emotion": None}

def run_detector():
    detector.running = True
    print("Emotion detection loop started, waiting for EEG data...")
    while detector.running:
        # Check buffer status
        buffer_size = len(detector.eeg_buffer)
        print(f"EEG buffer has {buffer_size} samples (need {detector.buffer_size})")
        
        emotion = detector.predict_emotion()
        if emotion:
            latest_emotion["emotion"] = emotion
            print(f" Emotion detected: {emotion}")
        else:
            print("No emotion prediction - insufficient data")
        time.sleep(3)

@app.route("/emotion", methods=["GET"])
def get_emotion():
    return jsonify(latest_emotion)

@app.route("/biometrics", methods=["GET"])
def get_biometrics():
    # lock to safely read EEG buffer
    with detector.data_lock:
        if len(detector.eeg_buffer) == 0:
            return jsonify({"status": "no_data"})
        # Convert deque to numpy array (shape: 4 x n_samples)
        raw_data = np.array(detector.eeg_buffer).T

    # preprocess EEG
    processed = detector.preprocessor.preprocess_eeg(raw_data)

    return jsonify({
        "status": "ok",
        "raw_eeg": raw_data.tolist(),
        "processed_eeg": {
            "raw_windows": processed["raw_windows"].tolist(),
            "power_features": processed["power_features"].tolist(),
            "statistical_features": processed["statistical_features"].tolist(),
            "combined_features": processed["combined_features"].tolist()
        },
        "latest_emotion": latest_emotion["emotion"]
    })

if __name__ == "__main__":
    print(f"Starting emotion detector on OSC port {detector.osc_port}")
    
    # Start OSC server for emotion detection
    detector._start_osc_server()
    print("OSC server started, listening for EEG data...")
    
    # Start detector in a background thread
    t = threading.Thread(target=run_detector, daemon=True)
    t.start()
    print("Background emotion detection thread started")
    
    app.run(host="0.0.0.0", port=8000)
