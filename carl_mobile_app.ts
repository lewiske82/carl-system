/**
 * CARL Mobile App - Magyar Szív Kártya DÁP Alkalmazás
 * React Native + TypeScript
 * Version: 0.1.0-beta
 * 
 * Funkciók:
 * - NFC kártya olvasás
 * - QR kód szkennelés
 * - Biometrikus bejelentkezés
 * - DFt wallet
 * - Pontgyűjtő rendszer
 * - Szerzői jogi kezelés
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';

// External libraries (installation required):
// import NfcManager, { NfcTech } from 'react-native-nfc-manager';
// import { RNCamera } from 'react-native-camera';
// import ReactNativeBiometrics from 'react-native-biometrics';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

interface User {
  userId: string;
  cardNumber: string;
  dftBalance: number;
  pointsBalance: number;
  nftTokenId?: string;
}

interface Transaction {
  transactionId: string;
  type: string;
  amount: number;
  points: number;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

const API_BASE_URL = 'http://localhost:3000/api/v1';

class CarlApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  async cardScan(cardNumber: string, nfcData?: string) {
    return this.request('/auth/card-scan', {
      method: 'POST',
      body: JSON.stringify({ cardNumber, nfcData }),
    });
  }

  async biometricAuth(userId: string, biometricData: string) {
    return this.request('/auth/biometric', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        biometricType: 'face',
        biometricData,
      }),
    });
  }

  async getBalance() {
    return this.request('/wallet/balance');
  }

  async redeemPoints(points: number) {
    return this.request('/wallet/redeem-points', {
      method: 'POST',
      body: JSON.stringify({ points }),
    });
  }

  async executeTransaction(type: string, amount: number, productId?: string) {
    return this.request('/transaction/execute', {
      method: 'POST',
      body: JSON.stringify({ type, amount, productId }),
    });
  }

  async getTransactionHistory() {
    return this.request('/transaction/history');
  }

  async recordGreenActivity(activityType: string) {
    return this.request('/points/green-activity', {
      method: 'POST',
      body: JSON.stringify({ activityType }),
    });
  }

  async registerContentRights(contentType: string, allowLicensing: boolean, royaltyRate: number) {
    return this.request('/content/register-rights', {
      method: 'POST',
      body: JSON.stringify({ contentType, allowLicensing, royaltyRate }),
    });
  }
}

const apiClient = new CarlApiClient();

// ═══════════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CarlApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'scan' | 'biometric' | 'home'>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize app
    setTimeout(() => setCurrentScreen('scan'), 2000);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // AUTHENTICATION FLOW
  // ─────────────────────────────────────────────────────────────

  const handleCardScan = async (cardNumber: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.cardScan(cardNumber);
      apiClient.setToken(response.token);
      
      if (response.requiresBiometric) {
        setCurrentScreen('biometric');
        // Store user data temporarily
        setUser({
          userId: response.user.userId,
          cardNumber: response.user.cardNumber,
          dftBalance: response.user.dftBalance,
          pointsBalance: response.user.pointsBalance,
        });
      }
    } catch (error: any) {
      Alert.alert('Hiba', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    setIsLoading(true);
    try {
      // In production: Use real biometric data
      const mockBiometricData = 'test-face-data';
      
      const response = await apiClient.biometricAuth(user!.userId, mockBiometricData);
      apiClient.setToken(response.token);
      
      setUser(response.user);
      setIsAuthenticated(true);
      setCurrentScreen('home');
      
      Alert.alert('Siker', 'Sikeres bejelentkezés!');
    } catch (error: any) {
      Alert.alert('Hiba', 'Biometrikus azonosítás sikertelen');
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SCREEN RENDERING
  // ─────────────────────────────────────────────────────────────

  if (currentScreen === 'splash') {
    return <SplashScreen />;
  }

  if (currentScreen === 'scan') {
    return <CardScanScreen onScan={handleCardScan} isLoading={isLoading} />;
  }

  if (currentScreen === 'biometric') {
    return <BiometricScreen onAuth={handleBiometricAuth} isLoading={isLoading} />;
  }

  if (currentScreen === 'home' && user) {
    return <HomeScreen user={user} setUser={setUser} />;
  }

  return <SplashScreen />;
}

// ═══════════════════════════════════════════════════════════════
// SPLASH SCREEN
// ═══════════════════════════════════════════════════════════════

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <Text style={styles.splashTitle}>🇭🇺</Text>
      <Text style={styles.splashSubtitle}>MAGYAR SZÍV KÁRTYA</Text>
      <Text style={styles.splashVersion}>CARL v0.1.0-beta</Text>
      <Text style={styles.splashTagline}>Digitális Átláthatósági Protokoll</Text>
      <ActivityIndicator size="large" color="#D70926" style={{ marginTop: 30 }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// CARD SCAN SCREEN
// ═══════════════════════════════════════════════════════════════

interface CardScanScreenProps {
  onScan: (cardNumber: string) => void;
  isLoading: boolean;
}

function CardScanScreen({ onScan, isLoading }: CardScanScreenProps) {
  const [scanMode, setScanMode] = useState<'nfc' | 'qr'>('nfc');

  const handleNFCScan = async () => {
    // Production: Real NFC scanning
    // await NfcManager.start();
    // await NfcManager.requestTechnology(NfcTech.Ndef);
    // const tag = await NfcManager.getTag();
    
    // Mock scan
    Alert.alert(
      'NFC Szimuláció',
      'Kártya beolvasása...',
      [{ text: 'OK', onPress: () => onScan('MSK-2025-001') }]
    );
  };

  const handleQRScan = () => {
    // Mock scan
    Alert.alert(
      'QR Kód Szimuláció',
      'QR kód beolvasása...',
      [{ text: 'OK', onPress: () => onScan('MSK-2025-001') }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kártya Beolvasása</Text>
        <Text style={styles.headerSubtitle}>Magyar Szív Kártya DÁP</Text>
      </View>

      <View style={styles.scanContainer}>
        <View style={styles.scanModeToggle}>
          <TouchableOpacity
            style={[styles.scanModeButton, scanMode === 'nfc' && styles.scanModeButtonActive]}
            onPress={() => setScanMode('nfc')}
          >
            <Text style={[styles.scanModeText, scanMode === 'nfc' && styles.scanModeTextActive]}>
              📡 NFC
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scanModeButton, scanMode === 'qr' && styles.scanModeButtonActive]}
            onPress={() => setScanMode('qr')}
          >
            <Text style={[styles.scanModeText, scanMode === 'qr' && styles.scanModeTextActive]}>
              📷 QR Kód
            </Text>
          </TouchableOpacity>
        </View>

        {scanMode === 'nfc' ? (
          <View style={styles.nfcArea}>
            <Text style={styles.nfcIcon}>📱</Text>
            <Text style={styles.nfcText}>Érintsd a kártyát a telefonhoz</Text>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={handleNFCScan}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.scanButtonText}>NFC Olvasás</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.qrArea}>
            <View style={styles.qrFrame}>
              <Text style={styles.qrText}>QR kód keret</Text>
            </View>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={handleQRScan}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.scanButtonText}>QR Szkennelés</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ A Magyar Szív Kártya egy kiegészítő személyazonosító, amely NFC és QR technológiával működik.
        </Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// BIOMETRIC SCREEN
// ═══════════════════════════════════════════════════════════════

interface BiometricScreenProps {
  onAuth: () => void;
  isLoading: boolean;
}

function BiometricScreen({ onAuth, isLoading }: BiometricScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Biometrikus Azonosítás</Text>
        <Text style={styles.headerSubtitle}>Biztonság és adatvédelem</Text>
      </View>

      <View style={styles.biometricContainer}>
        <Text style={styles.biometricIcon}>👤</Text>
        <Text style={styles.biometricTitle}>Arcfelismerés vagy Ujjlenyomat</Text>
        <Text style={styles.biometricSubtitle}>
          A belépéshez biometrikus azonosítás szükséges
        </Text>

        <TouchableOpacity
          style={styles.biometricButton}
          onPress={onAuth}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.biometricButtonIcon}>🔐</Text>
              <Text style={styles.biometricButtonText}>Azonosítás</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.securityBadge}>
          <Text style={styles.securityText}>🔒 AES-256 titkosítás</Text>
          <Text style={styles.securityText}>✅ GDPR kompatibilis</Text>
          <Text style={styles.securityText}>🛡️ Zero-knowledge proof</Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOME SCREEN (Main Dashboard)
// ═══════════════════════════════════════════════════════════════

interface HomeScreenProps {
  user: User;
  setUser: (user: User) => void;
}

function HomeScreen({ user, setUser }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<'wallet' | 'points' | 'rights'>('wallet');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await apiClient.getTransactionHistory();
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Failed to load transactions', error);
    }
  };

  const handleRedeemPoints = async () => {
    if (user.pointsBalance < 100) {
      Alert.alert('Hiba', 'Minimum 100 pont szükséges a beváltáshoz');
      return;
    }

    try {
      const response = await apiClient.redeemPoints(100);
      setUser({
        ...user,
        dftBalance: response.newDftBalance,
        pointsBalance: response.newPointsBalance,
      });
      Alert.alert('Siker', response.message);
    } catch (error: any) {
      Alert.alert('Hiba', error.message);
    }
  };

  const handleGreenActivity = async () => {
    try {
      const response = await apiClient.recordGreenActivity('recycling');
      setUser({
        ...user,
        dftBalance: response.newDftBalance,
        pointsBalance: response.newPointsBalance,
      });
      Alert.alert('Gratulálunk! 🌱', `${response.pointsAwarded} pont + ${response.dftBonus} DFt bónusz`);
    } catch (error: any) {
      Alert.alert('Hiba', error.message);
    }
  };

  return (
    <View style={styles.homeContainer}>
      {/* Header */}
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.homeWelcome}>Üdvözöllek!</Text>
          <Text style={styles.homeCardNumber}>{user.cardNumber}</Text>
        </View>
        <View style={styles.homeAvatar}>
          <Text style={styles.homeAvatarText}>👤</Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceCurrency}>Digitális Forint (DFt)</Text>
        <Text style={styles.balanceAmount}>{user.dftBalance.toFixed(2)} DFt</Text>
        <View style={styles.balancePoints}>
          <Text style={styles.balancePointsText}>⭐ {user.pointsBalance} pont</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'wallet' && styles.tabActive]}
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>
            💳 Tárca
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'points' && styles.tabActive]}
          onPress={() => setActiveTab('points')}
        >
          <Text style={[styles.tabText, activeTab === 'points' && styles.tabTextActive]}>
            ⭐ Pontok
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rights' && styles.tabActive]}
          onPress={() => setActiveTab('rights')}
        >
          <Text style={[styles.tabText, activeTab === 'rights' && styles.tabTextActive]}>
            ⚖️ Jogok
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'wallet' && (
          <WalletTab transactions={transactions} />
        )}
        {activeTab === 'points' && (
          <PointsTab 
            pointsBalance={user.pointsBalance}
            onRedeem={handleRedeemPoints}
            onGreenActivity={handleGreenActivity}
          />
        )}
        {activeTab === 'rights' && (
          <ContentRightsTab userId={user.userId} />
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// WALLET TAB
// ═══════════════════════════════════════════════════════════════

function WalletTab({ transactions }: { transactions: Transaction[] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Tranzakciók</Text>
      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>Még nincsenek tranzakciók</Text>
      ) : (
        transactions.map((tx) => (
          <View key={tx.transactionId} style={styles.transactionItem}>
            <View>
              <Text style={styles.transactionType}>{tx.type.toUpperCase()}</Text>
              <Text style={styles.transactionDate}>
                {new Date(tx.timestamp).toLocaleDateString('hu-HU')}
              </Text>
            </View>
            <View>
              <Text style={styles.transactionAmount}>{tx.amount} DFt</Text>
              {tx.points > 0 && (
                <Text style={styles.transactionPoints}>+{tx.points} pont</Text>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// POINTS TAB
// ═══════════════════════════════════════════════════════════════

interface PointsTabProps {
  pointsBalance: number;
  onRedeem: () => void;
  onGreenActivity: () => void;
}

function PointsTab({ pointsBalance, onRedeem, onGreenActivity }: PointsTabProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Pontgyűjtés</Text>
      
      <View style={styles.pointsCard}>
        <Text style={styles.pointsCardTitle}>Jelenlegi egyenleg</Text>
        <Text style={styles.pointsCardAmount}>{pointsBalance} pont</Text>
        <TouchableOpacity style={styles.redeemButton} onPress={onRedeem}>
          <Text style={styles.redeemButtonText}>Beváltás DFt-re (100 pont = 1 DFt)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Zöld tevékenységek</Text>
      <TouchableOpacity style={styles.greenButton} onPress={onGreenActivity}>
        <Text style={styles.greenButtonIcon}>♻️</Text>
        <View>
          <Text style={styles.greenButtonTitle}>Újrahasznosítás</Text>
          <Text style={styles.greenButtonSubtitle}>+50 pont + 10% DFt bónusz</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTENT RIGHTS TAB
// ═══════════════════════════════════════════════════════════════

function ContentRightsTab({ userId }: { userId: string }) {
  const [voiceProtected, setVoiceProtected] = useState(false);
  const [faceProtected, setFaceProtected] = useState(false);

  const handleRegisterRights = async (contentType: 'voice' | 'face') => {
    try {
      await apiClient.registerContentRights(contentType, true, 15);
      if (contentType === 'voice') setVoiceProtected(true);
      else setFaceProtected(true);
      Alert.alert('Siker', `${contentType === 'voice' ? 'Hang' : 'Arc'} szerzői jog regisztrálva!`);
    } catch (error: any) {
      Alert.alert('Hiba', error.message);
    }
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Szerzői Jogi Védelem</Text>
      
      <View style={styles.rightsCard}>
        <Text style={styles.rightsCardTitle}>🎤 Hang védelem</Text>
        <Text style={styles.rightsCardSubtitle}>
          {voiceProtected ? '✅ Aktív védelem' : 'Még nincs védve'}
        </Text>
        {!voiceProtected && (
          <TouchableOpacity
            style={styles.rightsButton}
            onPress={() => handleRegisterRights('voice')}
          >
            <Text style={styles.rightsButtonText}>Hang védelmének aktiválása</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.rightsCard}>
        <Text style={styles.rightsCardTitle}>👤 Arc védelem</Text>
        <Text style={styles.rightsCardSubtitle}>
          {faceProtected ? '✅ Aktív védelem' : 'Még nincs védve'}
        </Text>
        {!faceProtected && (
          <TouchableOpacity
            style={styles.rightsButton}
            onPress={() => handleRegisterRights('face')}
          >
            <Text style={styles.rightsButtonText}>Arc védelmének aktiválása</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ A szerzői jogi védelem lehetővé teszi, hogy kontrollálhasd a hang és arc használatát MI-generált tartalmakban.
        </Text>
      </View>
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
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D70926',
  },
  splashTitle: {
    fontSize: 80,
    marginBottom: 10,
  },
  splashSubtitle: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  splashVersion: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 5,
    opacity: 0.8,
  },
  splashTagline: {
    fontSize: 12,
    color: '#FFF',
    marginTop: 5,
    opacity: 0.6,
  },
  header: {
    backgroundColor: '#D70926',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
    marginTop: 5,
  },
  scanContainer: {
    flex: 1,
    padding: 20,
  },
  scanModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 5,
    marginBottom: 30,
  },
  scanModeButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
  },
  scanModeButtonActive: {
    backgroundColor: '#D70926',
  },
  scanModeText: {
    fontSize: 16,
    color: '#666',
  },
  scanModeTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  nfcArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcIcon: {
    fontSize: 100,
    marginBottom: 20,
  },
  nfcText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  qrArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#D70926',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  qrText: {
    color: '#999',
  },
  scanButton: {
    backgroundColor: '#D70926',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    margin: 20,
    borderRadius: 10,
  },
  infoText: {
    color: '#1976D2',
    fontSize: 12,
    lineHeight: 18,
  },
  biometricContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  biometricIcon: {
    fontSize: 100,
    marginBottom: 20,
  },
  biometricTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  biometricSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  biometricButton: {
    backgroundColor: '#D70926',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    justifyContent: 'center',
  },
  biometricButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  biometricButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  securityBadge: {
    marginTop: 40,
    alignItems: 'center',
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    marginVertical: 3,
  },
  homeContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  homeHeader: {
    backgroundColor: '#D70926',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeWelcome: {
    fontSize: 16,
    color: '#FFF',
    opacity: 0.8,
  },
  homeCardNumber: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 5,
  },
  homeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeAvatarText: {
    fontSize: 24,
  },
  balanceCard: {
    backgroundColor: '#FFF',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  balanceCurrency: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#D70926',
  },
  balancePoints: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  balancePointsText: {
    fontSize: 16,
    color: '#666',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 5,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#D70926',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  transactionItem: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D70926',
    textAlign: 'right',
  },
  transactionPoints: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 3,
    textAlign: 'right',
  },
  pointsCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  pointsCardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  pointsCardAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
  },
  redeemButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  redeemButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  greenButton: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  greenButtonIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  greenButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  greenButtonSubtitle: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 3,
  },
  rightsCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  rightsCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  rightsCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  rightsButton: {
    backgroundColor: '#D70926',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  rightsButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});