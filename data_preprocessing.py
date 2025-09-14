import numpy as np
import scipy.signal as signal
from scipy.signal import butter, filtfilt, welch
from sklearn.preprocessing import StandardScaler
import mne
from typing import Tuple, Dict, List, Optional
import warnings
warnings.filterwarnings('ignore')

class EEGPreprocessor:
    """
    Preprocesses 6-channel EEG data for emotion recognition.
    Handles filtering, artifact removal, feature extraction, and windowing.
    """
    
    def __init__(self, sampling_rate: int = 256, window_size: float = 2.0):
        self.sampling_rate = sampling_rate
        self.window_size = window_size  # seconds
        self.window_samples = int(window_size * sampling_rate)
        
        # EEG frequency bands for feature extraction
        self.freq_bands = {
            'delta': (0.5, 4),
            'theta': (4, 8),
            'alpha': (8, 13),
            'beta': (13, 30),
            'gamma': (30, 50)
        }
        
        # Muse headband 4-channel EEG positions (10-20 system)
        self.channel_names = ['TP9', 'AF7', 'AF8', 'TP10']
        
    def bandpass_filter(self, data: np.ndarray, low_freq: float, high_freq: float) -> np.ndarray:
        """Apply bandpass filter to EEG data."""
        nyquist = self.sampling_rate / 2
        low = low_freq / nyquist
        high = high_freq / nyquist
        
        if high >= 1.0:
            high = 0.99
            
        b, a = butter(4, [low, high], btype='band')
        return filtfilt(b, a, data, axis=1)
    
    def notch_filter(self, data: np.ndarray, freq: float = 50.0) -> np.ndarray:
        """Remove power line interference."""
        nyquist = self.sampling_rate / 2
        freq_norm = freq / nyquist
        
        if freq_norm >= 1.0:
            return data
            
        b, a = butter(2, [freq_norm - 0.01, freq_norm + 0.01], btype='bandstop')
        return filtfilt(b, a, data, axis=1)
    
    def remove_artifacts(self, data: np.ndarray, threshold: float = 100.0) -> np.ndarray:
        """Simple artifact removal based on amplitude threshold."""
        # mark samples that exceed threshold as artifacts
        artifact_mask = np.abs(data) > threshold
        
        # interpolate artifact samples for each channel
        clean_data = data.copy()
        for ch in range(data.shape[0]):
            if np.any(artifact_mask[ch]):
                # simple linear interpolation for artifact samples
                artifact_indices = np.where(artifact_mask[ch])[0]
                clean_indices = np.where(~artifact_mask[ch])[0]
                
                if len(clean_indices) > 1:
                    clean_data[ch, artifact_indices] = np.interp(
                        artifact_indices, clean_indices, data[ch, clean_indices]
                    )
        
        return clean_data
    
    def extract_power_features(self, data: np.ndarray) -> np.ndarray:
        """Extract power spectral density features for each frequency band."""
        features = []
        
        for ch in range(data.shape[0]):
            ch_features = []
            
            for band_name, (low_freq, high_freq) in self.freq_bands.items():
                # filter data to frequency band
                filtered = self.bandpass_filter(data[ch:ch+1], low_freq, high_freq)
                
                # power spectral density
                freqs, psd = welch(filtered[0], fs=self.sampling_rate, nperseg=min(256, len(filtered[0])//4))
                
                # extract mean power in  band
                band_mask = (freqs >= low_freq) & (freqs <= high_freq)
                if np.any(band_mask):
                    mean_power = np.mean(psd[band_mask])
                    ch_features.append(mean_power)
                else:
                    ch_features.append(0.0)
            
            features.extend(ch_features)
        
        return np.array(features)
    
    def extract_statistical_features(self, data: np.ndarray) -> np.ndarray:
        """Extract statistical features from EEG data."""
        features = []
        
        for ch in range(data.shape[0]):
            ch_data = data[ch]
            
            # basic statistical features
            features.extend([
                np.mean(ch_data),
                np.std(ch_data),
                np.var(ch_data),
                np.max(ch_data),
                np.min(ch_data),
                np.median(ch_data),
                np.percentile(ch_data, 25),
                np.percentile(ch_data, 75),
                # skewness and kurtosis
                scipy.stats.skew(ch_data) if len(ch_data) > 0 else 0,
                scipy.stats.kurtosis(ch_data) if len(ch_data) > 0 else 0
            ])
        
        return np.array(features)
    
    def create_sliding_windows(self, data: np.ndarray, overlap: float = 0.5) -> List[np.ndarray]:
        """Create sliding windows from continuous EEG data."""
        step_size = int(self.window_samples * (1 - overlap))
        windows = []
        
        for start in range(0, data.shape[1] - self.window_samples + 1, step_size):
            end = start + self.window_samples
            window = data[:, start:end]
            windows.append(window)
        
        return windows
    
    def preprocess_eeg(self, raw_data: np.ndarray) -> Dict[str, np.ndarray]:
        """
        Complete preprocessing pipeline for EEG data.
        
        Args:
            raw_data: Shape (4, n_samples) - 4 channels of EEG data from Muse headband
            
        Returns:
            Dictionary containing processed data in multiple formats
        """
        # STEP 1 | basic filtering
        # bandpass filter (0.5-50 Hz)
        filtered_data = self.bandpass_filter(raw_data, 0.5, 50.0)
        
        # notch filter (50 Hz power line)
        filtered_data = self.notch_filter(filtered_data, 50.0)
        
        # STEP 2 | artifact removal
        clean_data = self.remove_artifacts(filtered_data)
        
        # STEP 3 | create sliding windows
        windows = self.create_sliding_windows(clean_data)
        
        # STEP 4 | extract features for each window
        processed_windows = []
        power_features = []
        stat_features = []
        
        for window in windows:
            # normalize window
            scaler = StandardScaler()
            normalized_window = scaler.fit_transform(window.T).T
            processed_windows.append(normalized_window)
            
            # extract features
            power_feat = self.extract_power_features(window)
            stat_feat = self.extract_statistical_features(window)
            
            power_features.append(power_feat)
            stat_features.append(stat_feat)
        
        return {
            'raw_windows': np.array(processed_windows),  # CNN input
            'power_features': np.array(power_features),  # traditional ML
            'statistical_features': np.array(stat_features),  # traditional ML
            'combined_features': np.array([np.concatenate([p, s]) for p, s in zip(power_features, stat_features)])
        }

class PhysiologicalPreprocessor:
    """
    Preprocesses heart rate and breathing rate data.
    """
    
    def __init__(self, sampling_rate: int = 100):
        self.sampling_rate = sampling_rate
        
    def preprocess_heart_rate(self, hr_data: np.ndarray, window_size: float = 2.0) -> Dict[str, np.ndarray]:
        """
        Preprocess heart rate data.
        
        Args:
            hr_data: 1D array of heart rate values (BPM)
            window_size: Window size in seconds
            
        Returns:
            Dictionary with processed HR features
        """
        window_samples = int(window_size * self.sampling_rate)
        
        # create windows
        windows = []
        for start in range(0, len(hr_data) - window_samples + 1, window_samples // 2):
            end = start + window_samples
            windows.append(hr_data[start:end])
        
        # extract features for each window
        features = []
        for window in windows:
            window_features = [
                np.mean(window),  # mean HR
                np.std(window),   # HR variability
                np.max(window) - np.min(window),  # HR range
                len(np.where(np.diff(window) > 5)[0]),  # sudden incr
                len(np.where(np.diff(window) < -5)[0])  # sudden decr
            ]
            features.append(window_features)
        
        return {
            'raw_windows': np.array(windows),
            'features': np.array(features)
        }
    
    def preprocess_breathing_rate(self, br_data: np.ndarray, window_size: float = 2.0) -> Dict[str, np.ndarray]:
        """
        Preprocess breathing rate data.
        
        Args:
            br_data: 1D array of breathing rate values (breaths per minute)
            window_size: Window size in seconds
            
        Returns:
            Dictionary with processed BR features
        """
        window_samples = int(window_size * self.sampling_rate)
        
        # create windows
        windows = []
        for start in range(0, len(br_data) - window_samples + 1, window_samples // 2):
            end = start + window_samples
            windows.append(br_data[start:end])
        
        # extract features for each window
        features = []
        for window in windows:
            window_features = [
                np.mean(window),  # mean breathing rate
                np.std(window),   # breathing variability
                np.max(window) - np.min(window),  # breathing range
                len(np.where(np.diff(window) > 2)[0]),  # rapid breathing increases
                len(np.where(np.diff(window) < -2)[0])  # rapid breathing decreases
            ]
            features.append(window_features)
        
        return {
            'raw_windows': np.array(windows),
            'features': np.array(features)
        }

# Import scipy.stats for statistical features
import scipy.stats
