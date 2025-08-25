import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  showBackButton?: boolean;
}

const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallbackTitle = "Login Required",
  fallbackMessage = "Please sign in to access this feature",
  fallbackIcon = "lock-closed-outline",
  showBackButton = true,
}) => {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth) as any;

  // If user is authenticated, render the protected content
  if (isAuthenticated && user) {
    return <>{children}</>;
  }

  // If user is not authenticated, show login prompt
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header with back button */}
      {showBackButton && (
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#2D1810" />
          </TouchableOpacity>
          <View style={styles.placeholder} />
        </View>
      )}

      {/* Auth Required Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={fallbackIcon} size={80} color="#D2B48C" />
        </View>
        
        <Text style={styles.title}>{fallbackTitle}</Text>
        <Text style={styles.message}>{fallbackMessage}</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => (navigation as any).navigate('ProfileAuth')}
          >
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => (navigation as any).navigate('ProfileAuth')}
          >
            <Text style={styles.registerButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.guestButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D1810',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#8B4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  registerButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    marginTop: 16,
  },
  guestButtonText: {
    color: '#8B7355',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default AuthGuard;