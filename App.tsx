import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import SplashScreen from './src/components/SplashScreen';
import AuthProvider from './src/components/AuthProvider';
import NotificationService from './src/services/NotificationService';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  useEffect(() => {
    // Initialize notification service
    const initializeNotifications = async () => {
      try {
        await NotificationService.getInstance().initialize();
        console.log('Notification service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize notification service:', error);
      }
    };

    initializeNotifications();
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <Provider store={store}>
          <AuthProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </AuthProvider>
        </Provider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
