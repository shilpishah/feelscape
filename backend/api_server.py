# api_server.py
from flask import Flask, jsonify
from flask_cors import CORS
import threading
import time
from .emotion_detector import SimpleEmotionDetector


app = Flask(__name__)
CORS(app)

detector = SimpleEmotionDetector()
latest_emotion = {"emotion": None}

def run_detector():
    detector.running = True
    while detector.running:
        emotion = detector.predict_emotion()
        if emotion:
            latest_emotion["emotion"] = emotions
        time.sleep(3)

@app.route("/emotion", methods=["GET"])
def get_emotion():
    return jsonify(latest_emotion)

if __name__ == "__main__":
    # Start detector in a background thread
    t = threading.Thread(target=run_detector, daemon=True)
    t.start()
    app.run(host="0.0.0.0", port=8000)
