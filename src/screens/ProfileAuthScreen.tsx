import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  SafeAreaView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { AppDispatch, RootState } from '../store';
import { loginUser, registerUser } from '../store/slices/authSlice';
import { UserRole } from '../types';

const ProfileAuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async () => {
    if (isLogin) {
      // Login validation
      if (!formData.email || !formData.password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      try {
        await dispatch(loginUser({
          email: formData.email.trim(),
          password: formData.password,
        })).unwrap();
        Alert.alert('Success', 'Welcome back!');
      } catch (error: any) {
        Alert.alert('Login Failed', error.message || 'Please try again');
      }
    } else {
      // Register validation
      if (!formData.email || !formData.password || !formData.name) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }

      try {
        await dispatch(registerUser({
          email: formData.email.trim(),
          password: formData.password,
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
        })).unwrap();
        Alert.alert('Success', 'Account created successfully!');
      } catch (error: any) {
        Alert.alert('Registration Failed', error.message || 'Please try again');
      }
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: '',
    });
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <Ionicons name="person-circle" size={80} color="#8B4513" />
          <Text style={styles.title}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin 
              ? 'Sign in to access your profile and orders' 
              : 'Join KUTRA marketplace as a customer'
            }
          </Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#8B7355" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChangeText={(value) => updateFormData('name', value)}
                  placeholderTextColor="#8B7355"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  blurOnSubmit={false}
                />
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#8B7355" />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholderTextColor="#8B7355"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => Keyboard.dismiss()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#8B7355" />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                placeholderTextColor="#8B7355"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType={isLogin ? "go" : "next"}
                onSubmitEditing={() => isLogin ? handleSubmit() : Keyboard.dismiss()}
                blurOnSubmit={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#8B7355" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {!isLogin && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#8B7355" />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChangeText={(value) => updateFormData('confirmPassword', value)}
                    placeholderTextColor="#8B7355"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons 
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color="#8B7355" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#8B7355" />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChangeText={(value) => updateFormData('phone', value)}
                    placeholderTextColor="#8B7355"
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    blurOnSubmit={true}
                  />
                </View>
              </View>




            </>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Text>
          </TouchableOpacity>

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={toggleForm}>
              <Text style={styles.toggleLink}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D1810',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D1810',
    marginLeft: 12,
  },
  roleInfo: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#8B7355',
  },
  toggleLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
  },
});

export default ProfileAuthScreen;