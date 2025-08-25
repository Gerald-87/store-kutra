import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ContactOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  action: () => void;
  color: string;
}

const HelpScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth) as any;
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      id: '1',
      question: 'How do I place an order?',
      answer: 'To place an order, browse products, add items to your cart, and proceed to checkout. Make sure you have a delivery address set up in your profile.',
      category: 'Orders',
    },
    {
      id: '2',
      question: 'How can I track my order?',
      answer: 'You can track your order by going to the Orders section in your profile. You\'ll receive notifications for each status update.',
      category: 'Orders',
    },
    {
      id: '3',
      question: 'What payment methods are accepted?',
      answer: 'We accept mobile money (MTN, Airtel), bank transfers, and cash on delivery for most orders.',
      category: 'Payment',
    },
    {
      id: '4',
      question: 'How do I become a store owner?',
      answer: 'To become a store owner, go to your Profile, select "Become a Store Owner", and complete the registration process with your business details.',
      category: 'Stores',
    },
    {
      id: '5',
      question: 'How do delivery times work?',
      answer: 'Delivery times vary by store and location. Most campus deliveries take 30-60 minutes, while off-campus deliveries may take 2-4 hours.',
      category: 'Delivery',
    },
    {
      id: '6',
      question: 'Can I cancel my order?',
      answer: 'You can cancel your order within 5 minutes of placing it if the store hasn\'t confirmed it yet. After confirmation, contact the store directly.',
      category: 'Orders',
    },
    {
      id: '7',
      question: 'How do refunds work?',
      answer: 'Refunds are processed within 3-5 business days for valid cancellations or returns. Contact support for assistance with refund requests.',
      category: 'Payment',
    },
    {
      id: '8',
      question: 'How do I report a problem with my order?',
      answer: 'If you have issues with your order, contact the store directly through the app or reach out to our support team using the contact options below.',
      category: 'Support',
    },
  ];

  const contactOptions: ContactOption[] = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Support',
      subtitle: 'Chat with our support team',
      icon: 'logo-whatsapp',
      color: '#25D366',
      action: () => openWhatsApp(),
    },
    {
      id: 'email',
      title: 'Email Support',
      subtitle: 'Send us an email',
      icon: 'mail-outline',
      color: '#8B4513',
      action: () => openEmail(),
    },
    {
      id: 'phone',
      title: 'Call Support',
      subtitle: '+260 97 123 4567',
      icon: 'call-outline',
      color: '#8B4513',
      action: () => makePhoneCall(),
    },
    {
      id: 'facebook',
      title: 'Facebook Page',
      subtitle: 'Message us on Facebook',
      icon: 'logo-facebook',
      color: '#1877F2',
      action: () => openFacebook(),
    },
  ];

  const guides = [
    {
      id: 'getting-started',
      title: 'Getting Started Guide',
      subtitle: 'Learn the basics of using KUTRA',
      icon: 'play-circle-outline',
    },
    {
      id: 'store-setup',
      title: 'Store Setup Guide',
      subtitle: 'How to set up and manage your store',
      icon: 'storefront-outline',
    },
    {
      id: 'payment-guide',
      title: 'Payment Guide',
      subtitle: 'Understanding payment methods and processes',
      icon: 'card-outline',
    },
    {
      id: 'delivery-guide',
      title: 'Delivery Guide',
      subtitle: 'How delivery and pickup work',
      icon: 'bicycle-outline',
    },
  ];

  const openWhatsApp = () => {
    const phoneNumber = '+260971234567';
    const message = `Hello KUTRA Support, I need help with my account. User ID: ${user?.uid?.slice(-8) || 'N/A'}`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'WhatsApp is not installed on your device');
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to open WhatsApp');
      });
  };

  const openEmail = () => {
    const email = 'support@kutra.zm';
    const subject = 'Support Request';
    const body = `Hello KUTRA Support,\n\nI need assistance with:\n\nUser ID: ${user?.uid?.slice(-8) || 'N/A'}\nUser Email: ${user?.email || 'N/A'}\n\nPlease describe your issue below:\n\n`;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open email client');
    });
  };

  const makePhoneCall = () => {
    const phoneNumber = '+260971234567';
    const url = `tel:${phoneNumber}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to make phone call');
    });
  };

  const openFacebook = () => {
    const url = 'https://facebook.com/kutraapp';
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open Facebook');
    });
  };

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const renderFAQItem = (faq: FAQItem) => (
    <TouchableOpacity
      key={faq.id}
      style={styles.faqItem}
      onPress={() => toggleFAQ(faq.id)}
    >
      <View style={styles.faqQuestion}>
        <Text style={styles.faqQuestionText}>{faq.question}</Text>
        <Ionicons
          name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#8B7355"
        />
      </View>
      {expandedFAQ === faq.id && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{faq.answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderContactOption = (option: ContactOption) => (
    <TouchableOpacity
      key={option.id}
      style={styles.contactOption}
      onPress={option.action}
    >
      <View style={[styles.contactIcon, { backgroundColor: `${option.color}15` }]}>
        <Ionicons name={option.icon as any} size={24} color={option.color} />
      </View>
      <View style={styles.contactText}>
        <Text style={styles.contactTitle}>{option.title}</Text>
        <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8B7355" />
    </TouchableOpacity>
  );

  const renderGuideItem = (guide: any) => (
    <TouchableOpacity key={guide.id} style={styles.guideItem}>
      <View style={styles.guideIcon}>
        <Ionicons name={guide.icon as any} size={24} color="#8B4513" />
      </View>
      <View style={styles.guideText}>
        <Text style={styles.guideTitle}>{guide.title}</Text>
        <Text style={styles.guideSubtitle}>{guide.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8B7355" />
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Contact Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <Text style={styles.sectionSubtitle}>
            Get in touch with our support team
          </Text>
          <View style={styles.sectionContent}>
            {contactOptions.map(renderContactOption)}
          </View>
        </View>

        {/* Guides Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guides & Tutorials</Text>
          <Text style={styles.sectionSubtitle}>
            Learn how to use KUTRA effectively
          </Text>
          <View style={styles.sectionContent}>
            {guides.map(renderGuideItem)}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={styles.sectionSubtitle}>
            Find answers to common questions
          </Text>
          <View style={styles.sectionContent}>
            {faqs.map(renderFAQItem)}
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>Emergency Contact</Text>
          <Text style={styles.emergencyText}>
            For urgent issues or safety concerns, contact us immediately:
          </Text>
          <TouchableOpacity style={styles.emergencyButton} onPress={makePhoneCall}>
            <Ionicons name="call" size={20} color="#FFFFFF" />
            <Text style={styles.emergencyButtonText}>Call +260 97 123 4567</Text>
          </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    marginBottom: 16,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#8B7355',
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  guideIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#8B451315',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  guideText: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D1810',
    marginBottom: 2,
  },
  guideSubtitle: {
    fontSize: 14,
    color: '#8B7355',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D1810',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#8B7355',
    lineHeight: 20,
  },
  emergencySection: {
    margin: 16,
    padding: 20,
    backgroundColor: '#DC262615',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC262630',
    alignItems: 'center',
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default HelpScreen;