import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'navigation' | 'action';
  icon: string;
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  color?: string;
}

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    orderUpdates: true,
    newProducts: true,
    promotions: false,
    darkMode: false,
    soundEffects: true,
    vibration: true,
    locationTracking: true,
    analytics: false,
  });

  const handleToggleSetting = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // Here you would typically save to AsyncStorage or send to backend
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear temporary files and may improve app performance. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => {
            // Implement cache clearing logic
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings({
              pushNotifications: true,
              emailNotifications: true,
              orderUpdates: true,
              newProducts: true,
              promotions: false,
              darkMode: false,
              soundEffects: true,
              vibration: true,
              locationTracking: true,
              analytics: false,
            });
            Alert.alert('Success', 'Settings reset to default');
          },
        },
      ]
    );
  };

  const notificationSettings: SettingItem[] = [
    {
      id: 'pushNotifications',
      title: 'Push Notifications',
      subtitle: 'Receive notifications on your device',
      type: 'toggle',
      icon: 'notifications-outline',
      value: settings.pushNotifications,
      onToggle: (value) => handleToggleSetting('pushNotifications', value),
    },
    {
      id: 'emailNotifications',
      title: 'Email Notifications',
      subtitle: 'Receive notifications via email',
      type: 'toggle',
      icon: 'mail-outline',
      value: settings.emailNotifications,
      onToggle: (value) => handleToggleSetting('emailNotifications', value),
    },
    {
      id: 'orderUpdates',
      title: 'Order Updates',
      subtitle: 'Get notified about order status changes',
      type: 'toggle',
      icon: 'bag-outline',
      value: settings.orderUpdates,
      onToggle: (value) => handleToggleSetting('orderUpdates', value),
    },
    {
      id: 'newProducts',
      title: 'New Products',
      subtitle: 'Notifications for new products from stores you follow',
      type: 'toggle',
      icon: 'cube-outline',
      value: settings.newProducts,
      onToggle: (value) => handleToggleSetting('newProducts', value),
    },
    {
      id: 'promotions',
      title: 'Promotions & Offers',
      subtitle: 'Special deals and promotional offers',
      type: 'toggle',
      icon: 'pricetag-outline',
      value: settings.promotions,
      onToggle: (value) => handleToggleSetting('promotions', value),
    },
  ];

  const appSettings: SettingItem[] = [
    {
      id: 'darkMode',
      title: 'Dark Mode',
      subtitle: 'Use dark theme throughout the app',
      type: 'toggle',
      icon: 'moon-outline',
      value: settings.darkMode,
      onToggle: (value) => handleToggleSetting('darkMode', value),
    },
    {
      id: 'soundEffects',
      title: 'Sound Effects',
      subtitle: 'Play sounds for app interactions',
      type: 'toggle',
      icon: 'volume-high-outline',
      value: settings.soundEffects,
      onToggle: (value) => handleToggleSetting('soundEffects', value),
    },
    {
      id: 'vibration',
      title: 'Vibration',
      subtitle: 'Vibrate for notifications and feedback',
      type: 'toggle',
      icon: 'phone-portrait-outline',
      value: settings.vibration,
      onToggle: (value) => handleToggleSetting('vibration', value),
    },
  ];

  const privacySettings: SettingItem[] = [
    {
      id: 'locationTracking',
      title: 'Location Services',
      subtitle: 'Allow app to access your location',
      type: 'toggle',
      icon: 'location-outline',
      value: settings.locationTracking,
      onToggle: (value) => handleToggleSetting('locationTracking', value),
    },
    {
      id: 'analytics',
      title: 'Analytics & Tracking',
      subtitle: 'Help improve the app by sharing usage data',
      type: 'toggle',
      icon: 'analytics-outline',
      value: settings.analytics,
      onToggle: (value) => handleToggleSetting('analytics', value),
    },
  ];

  const managementSettings: SettingItem[] = [
    {
      id: 'clearCache',
      title: 'Clear Cache',
      subtitle: 'Free up storage space',
      type: 'action',
      icon: 'trash-outline',
      onPress: handleClearCache,
      color: '#8B4513',
    },
    {
      id: 'resetSettings',
      title: 'Reset Settings',
      subtitle: 'Restore all settings to default',
      type: 'action',
      icon: 'refresh-outline',
      onPress: handleResetSettings,
      color: '#DC2626',
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'toggle'}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: `${item.color || '#8B4513'}15` }]}>
          <Ionicons 
            name={item.icon as any} 
            size={20} 
            color={item.color || '#8B4513'} 
          />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.settingRight}>
        {item.type === 'toggle' && (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#D2B48C', true: '#8B4513' }}
            thumbColor={item.value ? '#FFFFFF' : '#F4F3F4'}
          />
        )}
        {item.type === 'navigation' && (
          <Ionicons name="chevron-forward" size={20} color="#8B7355" />
        )}
        {item.type === 'action' && (
          <Ionicons name="chevron-forward" size={20} color="#8B7355" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: SettingItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {items.map(renderSettingItem)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#2D1810" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSection('Notifications', notificationSettings)}
        {renderSection('App Preferences', appSettings)}
        {renderSection('Privacy & Security', privacySettings)}
        {renderSection('Data & Storage', managementSettings)}
        
        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>About KUTRA</Text>
          <View style={styles.appInfoItem}>
            <Text style={styles.appInfoLabel}>Version</Text>
            <Text style={styles.appInfoValue}>1.0.0</Text>
          </View>
          <View style={styles.appInfoItem}>
            <Text style={styles.appInfoLabel}>Build</Text>
            <Text style={styles.appInfoValue}>2024.01.001</Text>
          </View>
          <View style={styles.appInfoItem}>
            <Text style={styles.appInfoLabel}>User ID</Text>
            <Text style={styles.appInfoValue}>{user?.uid?.slice(-8) || 'N/A'}</Text>
          </View>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DD',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D1810',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#8B7355',
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appInfo: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E2DD',
  },
  appInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 12,
  },
  appInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  appInfoLabel: {
    fontSize: 14,
    color: '#8B7355',
  },
  appInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D1810',
  },
});

export default SettingsScreen;