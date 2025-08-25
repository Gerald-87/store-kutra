import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppDispatch, RootState } from '../../store';
import { registerUser, clearError } from '../../store/slices/authSlice';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AppNavigator';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const { width, height } = Dimensions.get('window');

const RegisterScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    dispatch(clearError());

    try {
      await dispatch(registerUser({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
      })).unwrap();
      
      Alert.alert(
        'Success', 
        'Account created successfully! Please check your email for verification.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#F7F3F0', '#FFFFFF', '#F7F3F0']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="storefront" size={28} color="#8B4513" />
              </View>
              <Text style={styles.logoText}>KUTRA</Text>
              <Text style={styles.tagline}>Campus Marketplace</Text>
            </View>
          </View>

          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>Join the campus marketplace</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholderTextColor="#A0A0A0"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#A0A0A0"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone (Optional)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  placeholderTextColor="#A0A0A0"
                />
              </View>
            </View>



            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.textInput, { paddingRight: 50 }]}
                  placeholder="Create a password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#A0A0A0"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#8B4513"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.textInput, { paddingRight: 50 }]}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor="#A0A0A0"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#8B4513"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, (isLoading || isSubmitting) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading || isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>
              {isLoading || isSubmitting ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={navigateToLogin}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F7F3F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D1810',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#8B7355',
    fontWeight: '400',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 6,
  },
  inputContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E2DD',
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  textInput: {
    fontSize: 15,
    color: '#2D1810',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontWeight: '500',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 4,
  },
  registerButton: {
    backgroundColor: '#8B4513',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#C4A484',
    shadowOpacity: 0.1,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#8B7355',
    fontSize: 15,
    fontWeight: '500',
  },
  loginLink: {
    color: '#8B4513',
    fontSize: 15,
    fontWeight: '700',
  },
});
export default RegisterScreen;