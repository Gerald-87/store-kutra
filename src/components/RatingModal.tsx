import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Rating from './Rating';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review?: string) => Promise<void>;
  type: 'store' | 'product';
  itemName: string;
  existingRating?: number;
  existingReview?: string;
}

const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  onClose,
  onSubmit,
  type,
  itemName,
  existingRating = 0,
  existingReview = '',
}) => {
  const [rating, setRating] = useState(existingRating);
  const [review, setReview] = useState(existingReview);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(rating, review.trim() || undefined);
      Alert.alert('Success', `Your ${type} rating has been submitted!`);
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(existingRating);
    setReview(existingReview);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Rate {type === 'store' ? 'Store' : 'Product'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Item Name */}
          <Text style={styles.itemName} numberOfLines={2}>
            {itemName}
          </Text>

          {/* Rating Section */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            <Rating
              currentRating={rating}
              size={32}
              onRatingChange={setRating}
              showLabel={false}
            />
            <Text style={styles.ratingLabel}>
              {getRatingLabel(rating)}
            </Text>
          </View>

          {/* Review Section */}
          <View style={styles.reviewSection}>
            <Text style={styles.sectionTitle}>
              Write a Review (Optional)
            </Text>
            <TextInput
              style={styles.reviewInput}
              placeholder={`Share your experience with this ${type}...`}
              placeholderTextColor="#9CA3AF"
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {review.length}/500 characters
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getRatingLabel = (rating: number): string => {
  switch (rating) {
    case 1: return 'Poor';
    case 2: return 'Fair';
    case 3: return 'Good';
    case 4: return 'Very Good';
    case 5: return 'Excellent';
    default: return 'Tap to rate';
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
  },
  closeButton: {
    padding: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
    marginTop: 8,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#F9FAFB',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default RatingModal;