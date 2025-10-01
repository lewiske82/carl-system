/**
 * CARL Mobile App - Working Skeleton
 * React Native + NFC + Backend API Integration
 * 
 * Package Requirements:
 * npm install react-native-nfc-manager
 * npm install @react-native-async-storage/async-storage
 * npm install axios
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api/v1' 
  : 'https://api.magyarszivcartya.hu/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface User {
  userId: string;
  cardNumber: string;
  email?: string;
  dftBalance: number;
  pointsBalance: number;
  nftTokenId?: string;
}

interface NFCCardData {
  cardNumber: string;
  nfcId: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// API SERVICE
// ═══════════════════════════════════════════════════════════════

class CarlApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  async cardScan(cardNumber: string, nfcData?: string): Promise<any> {
    const response = await axiosInstance.post('/auth/card-scan', {
      cardNumber,
      nfcData,
      location: null, // Could add geolocation
    });
    return response.data;
  }

  async biometricAuth(userId: string, biometricData: string): Promise<any> {
    const response = await axiosInstance.post('/auth/biometric', {
      userId,
      biometricType: 'face', // or 'fingerprint'
      biometricData,
    });
    return response.data;
  }

  async getBalance(): Promise<any> {
    const response = await axiosInstance.get('/wallet/balance');
    return response.data;
  }

  async executeTransaction(type: string, amount: number): Promise<any> {
    const response = await axiosInstance.post('/transaction/execute', {
      type,
      amount,
    });
    return response.data;
  }
}

const apiService = new CarlApiService();

// ═══════════════════════════════════════════════════════════════
// NFC SERVICE
// ═══════════════════════════════════════════════════════════════

class NFCService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      const isSupported = await NfcManager.isSupported();
      
      if (!isSupported) {
        Alert.alert('NFC nem támogatott', 'Az eszköz nem támogatja az NFC-t');
        return false;
      }

      await NfcManager.start();
      this.isInitialized = true;
      console.log('[NFC] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[NFC] Initialization failed:', error);
      return false;
    }
  }

  async readCard(): Promise<NFCCardData | null> {
    if (!this.isInitialized) {
      console.warn('[NFC] Not initialized, attempting to initialize...');
      const success = await this.initialize();
      if (!success) return null;
    }

    try {
      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('[NFC] Technology requested, reading tag...');

      // Get the NFC tag
      const tag = await NfcManager.getTag();
      console.log('[NFC] Tag detected:', tag);

      if (!tag) {
        throw new Error('No NFC tag detected');
      }

      // Extract card number from NFC tag
      // In real implementation, this would be encrypted in the NFC chip
      let cardNumber = 'MSK-2025-001'; // Default for testing
      
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        const ndefRecord = tag.ndefMessage[0];
        const payloadText = Ndef.text.decodePayload(ndefRecord.payload);
        
        // Parse card number from payload
        if (payloadText.includes('MSK-')) {
          cardNumber = payloadText.trim();
        }
      }

      const nfcData: NFCCardData = {
        cardNumber,
        nfcId: tag.id || 'unknown',
        timestamp: new Date().toISOString(),
      };

      console.log('[NFC] Card read successfully:', nfcData);
      return nfcData;

    } catch (error) {
      console.error('[NFC] Read failed:', error);
      Alert.alert('NFC Hiba', 'Kártya olvasása sikertelen. Próbáld újra.');
      return null;
    } finally {
      // Cancel the NFC operation
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        console.warn('[NFC] Cancel failed:', e);
      }
    }
  }

  async writeCard(cardNumber: string): Promise<boolean> {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);

      const bytes = Ndef.encodeMessage([
        Ndef.textRecord(cardNumber),
      ]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        console.log('[NFC] Card written successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[NFC] Write failed:', error);
      return false;
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  }

  async cleanup() {
    try {
      await NfcManager.cancelTechnologyRequest();
      this.isInitialized = false;
    } catch (e) {
      console.warn('[NFC] Cleanup failed:', e);
    }
  }
}

const nfcService = new NFCService();

// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CarlMobileApp() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);

  useEffect(() => {
    initializeApp();
    
    return () => {
      nfcService.cleanup();
    };
  }, []);

  const initializeApp = async () => {
    // Check NFC support
    const supported = await nfcService.initialize();
    setNfcSupported(supported);

    // Check for stored token
    try {
      const token = await AsyncStorage.getItem('carl_auth_token');
      if (token) {
        apiService.setToken(token);
        // Try to restore session
        await restoreSession();
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  };

  const restoreSession = async () => {
    try {
      setIsLoading(true);
      const balanceData = await apiService.getBalance();
      
      setUser({
        userId: balanceData.userId,
        cardNumber: balanceData.cardNumber,
        dftBalance: balanceData.dftBalance,
        pointsBalance: balanceData.pointsBalance,
        nftTokenId: balanceData.nftTokenId,
      });
      
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Session restore failed:', error);
      // Clear invalid token
      await AsyncStorage.removeItem('carl_auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNFCScan = async () => {
    if (!nfcSupported) {
      Alert.alert('Hiba', 'Az eszköz nem támogatja az NFC-t');
      return;
    }

    setIsLoading(true);
    Alert.alert(
      '📡 NFC Beolvasás',
      'Tartsd a kártyát a telefon hátuljához...',
      [{ text: 'Mégse', onPress: () => setIsLoading(false) }]
    );

    try {
      // Read NFC card
      const cardData = await nfcService.readCard();
      
      if (!cardData) {
        setIsLoading(false);
        return;
      }

      Alert.alert('Siker', `Kártya beolvasva: ${cardData.cardNumber}`);

      // Call card-scan API
      const scanResponse = await apiService.cardScan(
        cardData.cardNumber,
        cardData.nfcId
      );

      if (scanResponse.success) {
        // Store token temporarily
        apiService.setToken(scanResponse.token);

        if (scanResponse.requiresBiometric) {
          // In real app, trigger biometric prompt here
          await handleBiometricAuth(scanResponse.user.userId);
        }
      }

    } catch (error: any) {
      console.error('Card scan failed:', error);
      Alert.alert('Hiba', error.message || 'Kártya beolvasása sikertelen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async (userId: string) => {
    setIsLoading(true);

    try {
      // In real app, use actual biometric scanner
      // For demo, we'll use a mock biometric hash
      const mockBiometricData = 'mock_biometric_hash_' + Date.now();

      const authResponse = await apiService.biometricAuth(
        userId,
        mockBiometricData
      );

      if (authResponse.success) {
        // Store token
        await AsyncStorage.setItem('carl_auth_token', authResponse.token);
        apiService.setToken(authResponse.token);

        // Set user data
        setUser(authResponse.user);
        setIsAuthenticated(true);

        Alert.alert('Siker! 🎉', 'Sikeres bejelentkezés');
      }

    } catch (error: any) {
      console.error('Biometric auth failed:', error);
      Alert.alert('Hiba', 'Biometrikus azonosítás sikertelen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('carl_auth_token');
    setIsAuthenticated(false);
    setUser(null);
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D70926" />
        <Text style={styles.loadingText}>Betöltés...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>🇭🇺</Text>
          <Text style={styles.title}>MAGYAR SZÍV KÁRTYA</Text>
          <Text style={styles.subtitle}>CARL v0.1.0-beta</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.instruction}>
            Érintsd a Magyar Szív Kártyát a telefonhoz a bejelentkezéshez
          </Text>

          <TouchableOpacity
            style={[styles.scanButton, !nfcSupported && styles.disabledButton]}
            onPress={handleNFCScan}
            disabled={!nfcSupported || isLoading}
          >
            <Text style={styles.scanIcon}>📡</Text>
            <Text style={styles.scanButtonText}>
              {nfcSupported ? 'NFC Beolvasás' : 'NFC nem támogatott'}
            </Text>
          </TouchableOpacity>

          {nfcSupported && (
            <Text style={styles.hint}>
              💡 Tipp: Tartsd a kártyát néhány másodpercig a telefon hátuljához
            </Text>
          )}

          <View style={styles.testModeBox}>
            <Text style={styles.testModeTitle}>🧪 Teszt Mód</Text>
            <Text style={styles.testModeText}>
              Bétatesztelés alatt. Demo kártya: MSK-2025-001
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Authenticated view
  return (
    <View style={styles.container}>
      <View style={styles.headerAuth}>
        <Text style={styles.welcomeText}>Üdvözöllek!</Text>
        <Text style={styles.cardNumberText}>{user?.cardNumber}</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Digitális Forint</Text>
        <Text style={styles.balanceAmount}>
          {user?.dftBalance.toFixed(2)} DFt
        </Text>
        <View style={styles.pointsRow}>
          <Text style={styles.pointsText}>⭐ {user?.pointsBalance} pont</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>💳</Text>
          <Text style={styles.actionText}>Fizetés</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>Előzmények</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionText}>Beállítások</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Kijelentkezés</Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#D70926',
    padding: 40,
    paddingTop: 60,
    alignItems: 'center',
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.8,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  instruction: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 40,
    lineHeight: 26,
  },
  scanButton: {
    backgroundColor: '#D70926',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  scanIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  testModeBox: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  testModeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  testModeText: {
    fontSize: 14,
    color: '#856404',
  },
  headerAuth: {
    backgroundColor: '#D70926',
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.9,
  },
  cardNumberText: {
    fontSize: 22,
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 5,
  },
  balanceCard: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#D70926',
  },
  pointsRow: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  pointsText: {
    fontSize: 18,
    color: '#666',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#FFF',
    width: 100,
    height: 100,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  logoutButton: {
    margin: 20,
    marginTop: 'auto',
    padding: 15,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D70926',
  },
  logoutText: {
    textAlign: 'center',
    color: '#D70926',
    fontSize: 16,
    fontWeight: '600',
  },
});