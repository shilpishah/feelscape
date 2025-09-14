# Feelscape - EEG Emotion Recognition System
*HackMIT 2025*

A real-time emotion recognition system that uses 6-channel EEG data, heart rate, and breathing rate to classify emotions according to Paul Ekman's model.

## 🧠 Features

- **Multi-modal Input**: Combines EEG signals with physiological data (heart rate, breathing rate)
- **Paul Ekman's 6 Basic Emotions**: Recognizes happiness, sadness, anger, surprise, fear, and disgust
- **Advanced Neural Architecture**: Hybrid model with spatial-temporal convolutions and attention mechanisms
- **Real-time Processing**: Continuous emotion monitoring with fail-safe mechanisms
- **Robust Preprocessing**: Advanced EEG signal processing with artifact removal and feature extraction
- **Fail-safe System**: Physiological backup when EEG confidence is low

## 📋 Requirements

Install dependencies:
```bash
pip install -r requirements.txt
```

## 🚀 Quick Start

### 1. Basic Usage

```python
from neural_networks import EmotionClassifier
import numpy as np

# Initialize classifier
classifier = EmotionClassifier(model_type='multimodal')

# Prepare data
eeg_data = np.random.randn(6, 512)  # 6 channels, 2 seconds at 256 Hz
physio_data = np.random.randn(10)   # Physiological features

# Predict emotion
emotion = classifier.predict_emotion(eeg_data, physio_data)
print(f"Predicted emotion: {emotion}")
```

### 2. Training a Model

```python
from training import EmotionTrainer, generate_synthetic_data

# Generate training data (replace with real data)
eeg_data, physio_data, labels = generate_synthetic_data(n_samples=2000)

# Initialize trainer
trainer = EmotionTrainer(model_type='multimodal', num_epochs=50)

# Prepare data
train_loader, val_loader, test_loader = trainer.prepare_data(
    eeg_data=eeg_data, physio_data=physio_data, labels=labels
)

# Train model
trainer.train(train_loader, val_loader)

# Evaluate
results = trainer.evaluate(test_loader)
print(f"Test Accuracy: {results['accuracy']:.4f}")

# Save model
trainer.save_model("emotion_model.pth")
```

### 3. Real-time Recognition

```python
from real_time_inference import RealTimeEmotionRecognizer

# Initialize recognizer
recognizer = RealTimeEmotionRecognizer(
    model_path="emotion_model.pth",
    confidence_threshold=0.6,
    fail_safe_enabled=True
)

# Set callback for emotion changes
def on_emotion_change(emotion, confidence):
    print(f"Emotion: {emotion} (confidence: {confidence:.3f})")

recognizer.set_emotion_callback(on_emotion_change)

# Start processing
recognizer.start_processing()

# Add data samples (from your EEG headset)
eeg_sample = get_eeg_sample()  # Your EEG interface
hr_value = get_heart_rate()    # Your HR sensor
br_value = get_breathing_rate() # Your BR sensor

recognizer.add_eeg_sample(eeg_sample)
recognizer.add_hr_sample(hr_value)
recognizer.add_br_sample(br_value)
```

## 🏗️ Architecture

### Neural Network Components

1. **EEGEmotionNet**: Spatial-temporal CNN with attention
   - Spatial attention across EEG channels
   - Temporal convolutions for time-series processing
   - Attention mechanism for important time points

2. **PhysiologicalNet**: MLP for physiological signals
   - Processes heart rate and breathing rate features
   - Provides backup predictions when EEG confidence is low

3. **MultiModalEmotionNet**: Fusion of both modalities
   - Late fusion: Combines predictions
   - Early fusion: Averages predictions
   - Hybrid fusion: Combines features before classification

### Data Processing Pipeline

1. **EEG Preprocessing**:
   - Bandpass filtering (0.5-50 Hz)
   - Notch filtering (50 Hz power line)
   - Artifact removal
   - Feature extraction (power spectral density, statistical features)

2. **Physiological Processing**:
   - Heart rate variability analysis
   - Breathing pattern analysis
   - Statistical feature extraction

3. **Real-time Processing**:
   - Sliding window approach
   - Confidence-based decision making
   - Fail-safe mechanism activation

## 📊 Emotion Classification

The system recognizes Paul Ekman's 6 basic emotions:

- **Happiness**: Positive valence, moderate arousal
- **Sadness**: Negative valence, low arousal
- **Anger**: Negative valence, high arousal
- **Surprise**: Neutral valence, high arousal
- **Fear**: Negative valence, high arousal
- **Disgust**: Negative valence, moderate arousal

## 🛡️ Fail-safe Mechanisms

The system includes multiple fail-safe mechanisms:

1. **Physiological Backup**: Uses HR/BR when EEG confidence is low
2. **Stability Check**: Requires consecutive predictions for emotion changes
3. **Confidence Thresholding**: Only accepts high-confidence predictions
4. **Artifact Detection**: Automatically removes corrupted EEG segments

### Fail-safe Rules

- High HR (>100 BPM) + Rapid changes → Fear
- High HR/BR → Anger
- Low HR/BR → Sadness
- Sudden HR increase → Surprise

## 📁 File Structure

```
feelscape/
├── README.md                    # This file
├── requirements.txt            # Dependencies
├── data_preprocessing.py       # EEG and physiological data processing
├── neural_networks.py         # Neural network architectures
├── training.py                # Training pipeline and evaluation
├── real_time_inference.py     # Real-time emotion recognition
├── example_usage.py           # Complete usage examples
└── test.py                    # Basic test file
```

## 🔧 Hardware Integration

### Supported EEG Headsets

The system is designed to work with consumer EEG headsets:

- **Emotiv EPOC/EPOC+**: 6-channel configuration
- **OpenBCI**: Configurable channels
- **NeuroSky**: Single channel (limited functionality)
- **Muse**: 4-channel (requires channel mapping)

### Physiological Sensors

- **Heart Rate**: Chest straps, wrist monitors, PPG sensors
- **Breathing Rate**: Respiratory belts, smart clothing, camera-based

## 🎯 Performance

Expected performance metrics:

- **Accuracy**: 70-85% (depends on data quality and individual differences)
- **Real-time Latency**: <500ms processing delay
- **Confidence Threshold**: 60% minimum for stable predictions
- **Fail-safe Activation**: <5% of predictions under normal conditions

## 🔬 Research Background

This implementation is based on research in:

- EEG-based emotion recognition
- Multi-modal sensor fusion
- Attention mechanisms in neural networks
- Real-time signal processing
- Physiological computing

## 🚀 Getting Started

1. **Run the example**:
   ```bash
   python example_usage.py
   ```

2. **Connect your EEG headset**:
   - Modify `EEGHeadsetInterface` in `real_time_inference.py`
   - Implement your headset's specific API

3. **Collect training data**:
   - Record EEG while participants experience different emotions
   - Label data with ground truth emotions
   - Use the training pipeline to create your model

4. **Deploy for real-time use**:
   - Load your trained model
   - Connect sensors
   - Start real-time emotion recognition

## 🤝 Contributing

This is a HackMIT 2025 project. Contributions welcome!

## 📄 License

See LICENSE file for details.

## 🙏 Acknowledgments

- Paul Ekman's emotion research
- EEG signal processing community
- PyTorch and scikit-learn teams
- HackMIT 2025 organizers
