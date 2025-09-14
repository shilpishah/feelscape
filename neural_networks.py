import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict, Tuple, Optional
import math

class SpatialAttention(nn.Module):
    """Spatial attention mechanism for EEG channels."""
    
    def __init__(self, num_channels: int):
        super(SpatialAttention, self).__init__()
        self.num_channels = num_channels
        self.attention = nn.Sequential(
            nn.Linear(num_channels, num_channels // 2),
            nn.ReLU(),
            nn.Linear(num_channels // 2, num_channels),
            nn.Softmax(dim=1)
        )
    
    def forward(self, x):
        # x shape: (batch, channels, time)
        # Global average pooling over time dimension
        spatial_features = torch.mean(x, dim=2)  # (batch, channels)
        attention_weights = self.attention(spatial_features)  # (batch, channels)
        
        # Apply attention weights
        attended = x * attention_weights.unsqueeze(2)  # (batch, channels, time)
        return attended, attention_weights

class TemporalAttention(nn.Module):
    """Temporal attention mechanism for time series."""
    
    def __init__(self, hidden_dim: int):
        super(TemporalAttention, self).__init__()
        self.hidden_dim = hidden_dim
        self.attention = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.Tanh(),
            nn.Linear(hidden_dim // 2, 1)
        )
    
    def forward(self, x):
        # x shape: (batch, seq_len, hidden_dim)
        attention_scores = self.attention(x)  # (batch, seq_len, 1)
        attention_weights = F.softmax(attention_scores, dim=1)  # (batch, seq_len, 1)
        
        # Apply attention weights
        attended = torch.sum(x * attention_weights, dim=1)  # (batch, hidden_dim)
        return attended, attention_weights.squeeze(2)

class EEGConvBlock(nn.Module):
    """Convolutional block for EEG processing."""
    
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int, dropout: float = 0.3):
        super(EEGConvBlock, self).__init__()
        self.conv = nn.Conv1d(in_channels, out_channels, kernel_size, padding=kernel_size//2)
        self.bn = nn.BatchNorm1d(out_channels)
        self.dropout = nn.Dropout(dropout)
        self.activation = nn.ELU()
        
    def forward(self, x):
        x = self.conv(x)
        x = self.bn(x)
        x = self.activation(x)
        x = self.dropout(x)
        return x

class EEGEmotionNet(nn.Module):
    """
    Hybrid neural network for EEG-based emotion recognition.
    Combines spatial-temporal convolutions with attention mechanisms.
    """
    
    def __init__(self, 
                 num_channels: int = 4,
                 sequence_length: int = 512,  # 2 seconds at 256 Hz
                 num_emotions: int = 6,
                 dropout: float = 0.3):
        super(EEGEmotionNet, self).__init__()
        
        self.num_channels = num_channels
        self.sequence_length = sequence_length
        self.num_emotions = num_emotions
        
        # Spatial attention for channels
        self.spatial_attention = SpatialAttention(num_channels)
        
        # Temporal convolution layers
        self.conv_blocks = nn.ModuleList([
            EEGConvBlock(num_channels, 32, 7, dropout),
            EEGConvBlock(32, 64, 5, dropout),
            EEGConvBlock(64, 128, 3, dropout),
            EEGConvBlock(128, 256, 3, dropout)
        ])
        
        # Pooling layers
        self.pool = nn.MaxPool1d(2)
        
        # Calculate the size after convolutions and pooling
        self.conv_output_size = self._get_conv_output_size()
        
        # Temporal attention
        self.temporal_attention = TemporalAttention(256)
        
        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_emotions)
        )
        
    def _get_conv_output_size(self):
        """Calculate output size after convolutions."""
        x = torch.randn(1, self.num_channels, self.sequence_length)
        
        for conv_block in self.conv_blocks:
            x = conv_block(x)
            x = self.pool(x)
        
        return x.shape[2]  # temporal dimension
    
    def forward(self, x):
        # x shape: (batch, channels, time)
        batch_size = x.size(0)
        
        # Apply spatial attention
        x, spatial_weights = self.spatial_attention(x)
        
        # Apply temporal convolutions
        for conv_block in self.conv_blocks:
            x = conv_block(x)
            x = self.pool(x)
        
        # Reshape for temporal attention
        x = x.transpose(1, 2)  # (batch, time, features)
        
        # Apply temporal attention
        x, temporal_weights = self.temporal_attention(x)
        
        # Classification
        emotions = self.classifier(x)
        
        return {
            'emotions': emotions,
            'spatial_attention': spatial_weights,
            'temporal_attention': temporal_weights
        }

class PhysiologicalNet(nn.Module):
    """Neural network for physiological signals (HR, BR)."""
    
    def __init__(self, 
                 input_dim: int = 10,  # 5 features each for HR and BR
                 num_emotions: int = 6,
                 dropout: float = 0.3):
        super(PhysiologicalNet, self).__init__()
        
        self.network = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(16, num_emotions)
        )
    
    def forward(self, x):
        return self.network(x)

class MultiModalEmotionNet(nn.Module):
    """
    Multi-modal emotion recognition network combining EEG and physiological signals.
    """
    
    def __init__(self,
                 num_channels: int = 4,
                 sequence_length: int = 512,
                 physio_input_dim: int = 10,
                 num_emotions: int = 6,
                 fusion_strategy: str = 'late',  # 'early', 'late', or 'hybrid'
                 dropout: float = 0.3):
        super(MultiModalEmotionNet, self).__init__()
        
        self.fusion_strategy = fusion_strategy
        self.num_emotions = num_emotions
        
        # EEG network
        self.eeg_net = EEGEmotionNet(num_channels, sequence_length, num_emotions, dropout)
        
        # Physiological network
        self.physio_net = PhysiologicalNet(physio_input_dim, num_emotions, dropout)
        
        # Fusion layers
        if fusion_strategy == 'late':
            self.fusion = nn.Sequential(
                nn.Linear(num_emotions * 2, 32),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(32, num_emotions)
            )
        elif fusion_strategy == 'hybrid':
            # Combine features before final classification
            self.fusion = nn.Sequential(
                nn.Linear(256 + 16, 128),  # EEG features + Physio features
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(128, 64),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(64, num_emotions)
            )
    
    def forward(self, eeg_data, physio_data):
        # EEG processing
        eeg_output = self.eeg_net(eeg_data)
        eeg_emotions = eeg_output['emotions']
        
        # Physiological processing
        physio_emotions = self.physio_net(physio_data)
        
        if self.fusion_strategy == 'late':
            # Late fusion: combine predictions
            combined = torch.cat([eeg_emotions, physio_emotions], dim=1)
            final_emotions = self.fusion(combined)
        elif self.fusion_strategy == 'early':
            # Early fusion: average predictions
            final_emotions = (eeg_emotions + physio_emotions) / 2
        elif self.fusion_strategy == 'hybrid':
            # Hybrid fusion: combine features before final classification
            # Extract features from EEG network before final classification
            eeg_features = self.eeg_net.temporal_attention(
                self.eeg_net.conv_blocks[-1](eeg_data).transpose(1, 2)
            )[0]
            
            # Extract features from physiological network
            physio_features = self.physio_net.network[:-1](physio_data)
            
            # Combine features
            combined_features = torch.cat([eeg_features, physio_features], dim=1)
            final_emotions = self.fusion(combined_features)
        
        return {
            'final_emotions': final_emotions,
            'eeg_emotions': eeg_emotions,
            'physio_emotions': physio_emotions,
            'spatial_attention': eeg_output['spatial_attention'],
            'temporal_attention': eeg_output['temporal_attention']
        }

class EmotionClassifier:
    """
    Main emotion classifier that handles the complete pipeline.
    """
    
    def __init__(self, 
                 model_type: str = 'multimodal',
                 device: str = 'cpu',
                 num_emotions: int = 6):
        self.device = device
        self.num_emotions = num_emotions
        self.model_type = model_type
        
        # Paul Ekman's 6 basic emotions
        self.emotion_labels = [
            'happiness',
            'sadness', 
            'anger',
            'surprise',
            'fear',
            'disgust'
        ]
        
        # Initialize model
        if model_type == 'eeg_only':
            self.model = EEGEmotionNet(num_emotions=num_emotions)
        elif model_type == 'physio_only':
            self.model = PhysiologicalNet(num_emotions=num_emotions)
        else:  # multimodal
            self.model = MultiModalEmotionNet(num_emotions=num_emotions)
        
        self.model.to(device)
        
    def predict_emotion(self, eeg_data: Optional[np.ndarray] = None, 
                       physio_data: Optional[np.ndarray] = None) -> str:
        """
        Predict emotion from input data.
        
        Args:
            eeg_data: EEG data of shape (6, sequence_length)
            physio_data: Physiological features of shape (10,)
            
        Returns:
            Predicted emotion name
        """
        self.model.eval()
        
        with torch.no_grad():
            if self.model_type == 'eeg_only' and eeg_data is not None:
                eeg_tensor = torch.FloatTensor(eeg_data).unsqueeze(0).to(self.device)
                output = self.model(eeg_tensor)
                predictions = output['emotions']
                
            elif self.model_type == 'physio_only' and physio_data is not None:
                physio_tensor = torch.FloatTensor(physio_data).unsqueeze(0).to(self.device)
                predictions = self.model(physio_tensor)
                
            elif self.model_type == 'multimodal':
                if eeg_data is not None and physio_data is not None:
                    eeg_tensor = torch.FloatTensor(eeg_data).unsqueeze(0).to(self.device)
                    physio_tensor = torch.FloatTensor(physio_data).unsqueeze(0).to(self.device)
                    output = self.model(eeg_tensor, physio_tensor)
                    predictions = output['final_emotions']
                elif eeg_data is not None:
                    # Fallback to EEG only
                    eeg_tensor = torch.FloatTensor(eeg_data).unsqueeze(0).to(self.device)
                    output = self.model.eeg_net(eeg_tensor)
                    predictions = output['emotions']
                elif physio_data is not None:
                    # Fallback to physiological only
                    physio_tensor = torch.FloatTensor(physio_data).unsqueeze(0).to(self.device)
                    predictions = self.model.physio_net(physio_tensor)
                else:
                    raise ValueError("At least one input modality must be provided")
            else:
                raise ValueError("Invalid model type or missing required data")
            
            # Get predicted emotion
            predicted_idx = torch.argmax(predictions, dim=1).item()
            predicted_emotion = self.emotion_labels[predicted_idx]
            
            return predicted_emotion
    
    def get_emotion_probabilities(self, eeg_data: Optional[np.ndarray] = None,
                                physio_data: Optional[np.ndarray] = None) -> Dict[str, float]:
        """
        Get probability distribution over all emotions.
        
        Returns:
            Dictionary mapping emotion names to probabilities
        """
        self.model.eval()
        
        with torch.no_grad():
            if self.model_type == 'multimodal' and eeg_data is not None and physio_data is not None:
                eeg_tensor = torch.FloatTensor(eeg_data).unsqueeze(0).to(self.device)
                physio_tensor = torch.FloatTensor(physio_data).unsqueeze(0).to(self.device)
                output = self.model(eeg_tensor, physio_tensor)
                predictions = output['final_emotions']
            elif eeg_data is not None:
                eeg_tensor = torch.FloatTensor(eeg_data).unsqueeze(0).to(self.device)
                if self.model_type == 'multimodal':
                    output = self.model.eeg_net(eeg_tensor)
                    predictions = output['emotions']
                else:
                    output = self.model(eeg_tensor)
                    predictions = output['emotions']
            else:
                raise ValueError("EEG data is required")
            
            # Convert to probabilities
            probabilities = F.softmax(predictions, dim=1).squeeze().cpu().numpy()
            
            # Create emotion probability dictionary
            emotion_probs = {}
            for i, emotion in enumerate(self.emotion_labels):
                emotion_probs[emotion] = float(probabilities[i])
            
            return emotion_probs
