# 🇭🇺 CARL - Magyar Szív Kártya Rendszer

<div align="center">

![Status](https://img.shields.io/badge/Status-Beta%20Testing-yellow)
![Version](https://img.shields.io/badge/Version-0.1.0--beta-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)
![GDPR](https://img.shields.io/badge/GDPR-Compliant-green)

**Cognitive Archive & Relational Legacy**  
**Digitális Átláthatósági Protokoll (iDÁP)**  
**Magyar Szív Kártya - Kiegészítő Személyazonosító Rendszer**

</div>

---

## 📋 Tartalom

- [Áttekintés](#-áttekintés)
- [Fő Komponensek](#-fő-komponensek)
- [Technológiai Stack](#-technológiai-stack)
- [Architektúra](#-architektúra)
- [Telepítés](#-telepítés)
- [API Dokumentáció](#-api-dokumentáció)
- [Biztonsági Megfontolások](#-biztonsági-megfontolások)
- [GDPR Megfelelőség](#-gdpr-megfelelőség)
- [Roadmap](#-roadmap)
- [Fejlesztői Csapat](#-fejlesztői-csapat)

---

## 🎯 Áttekintés

A **CARL (Cognitive Archive & Relational Legacy)** rendszer egy innovatív, AI-alapú kiegészítő személyazonosító ökoszisztéma, amely integrálja:

- ✅ **Digitális identitás** és adatbirtoklás
- ✅ **Szerzői jogi védelem** (hang, kinézet)
- ✅ **Deflácios digitális valuta** (DFt)
- ✅ **Etikus tartalomgyártás** és MI-szabályozás
- ✅ **Zero-knowledge proof** adatvédelem
- ✅ **Blockchain** alapú NFT rendszer

### 🎴 Magyar Szív Kártya

A fizikai kártya holografikus kivitelben (Holox-technika), amely:
- 📡 **NFC chip** - érintéses azonosítás
- 📷 **QR kód** - gyors beolvasás
- 🔐 **Biometrikus védelem** - arc/ujjlenyomat
- 🪙 **Soulbound NFT** - blockchain alapú identitás

### 💰 Digitális Forint (DFt)

Állami digitális valuta deflácios mechanizmussal:
- 📉 **5% éves defláció** - automatikus burn
- ♻️ **Környezeti bónusz** - zöld tevékenységekért
- ⭐ **Pontgyűjtő rendszer** - 100 pont = 1 DFt
- 🔥 **Tranzakciós burn** - minden tranzakcióból 0.1%

---

## 🧩 Fő Komponensek

### 1️⃣ CARL AI Kognitív Motor

**Felelősség:** Natural Language Processing, Deepfake detekció, tartalom monitoring

**Funkciók:**
- 🗣️ Hang és arc biometrikus védelem
- 🤖 AI-generált tartalom felismerés
- 📱 Közösségi média monitoring (rejtett reklám, dezinformáció)
- ⚖️ Szerzői jogi megsértés detektálása

**Technológia:** Python, TensorFlow, PyTorch, Hugging Face

**Fájl:** `carl-ai/cognitive_engine.py`

---

### 2️⃣ Blockchain & Smart Contracts

**Felelősség:** DFt token, Soulbound NFT, jogdíj kezelés

**Smart Contracts:**
- `DigitalisForint.sol` - ERC-20 token deflácios mechanizmussal
- `MagyarSzivKartya.sol` - ERC-5192 Soulbound NFT
- `RoyaltyManager.sol` - Automatikus jogdíj elosztás

**Technológia:** Solidity 0.8.x, Hardhat, Polygon/Ethereum

**Fájl:** `carl-blockchain/contracts/`

---

### 3️⃣ Backend API

**Felelősség:** Core business logic, REST/GraphQL API

**Főbb Endpoint-ok:**
```
POST   /api/v1/auth/card-scan          - Kártya beolvasás
POST   /api/v1/auth/biometric           - Biometrikus auth
GET    /api/v1/wallet/balance           - Egyenleg lekérdezés
POST   /api/v1/transaction/execute      - Tranzakció
POST   /api/v1/content/register-rights  - Szerzői jog regisztráció
GET    /api/v1/nft/soulbound/:userId    - NFT lekérdezés
```

**Technológia:** Node.js, TypeScript, Express, PostgreSQL, Redis

**Fájl:** `carl-backend/src/index.ts`

---

### 4️⃣ Mobile App (DÁP Alkalmazás)

**Felelősség:** Felhasználói interfész, NFC/QR olvasás

**Képernyők:**
- 📱 Kártya beolvasás (NFC/QR)
- 🔐 Biometrikus azonosítás
- 💳 DFt Wallet
- ⭐ Pontgyűjtés
- ⚖️ Szerzői jogi kezelés

**Technológia:** React Native, TypeScript

**Fájl:** `carl-mobile/App.tsx`

---

### 5️⃣ Security & Cryptography

**Felelősség:** Zero-knowledge proof, titkosítás, GDPR

**Funkciók:**
- 🔐 **AES-256-GCM** titkosítás
- 🎭 **Zero-Knowledge Proof** biometrikus authhoz
- 🛡️ Biometrikus hash (soha nem tároljuk a raw adatot!)
- 📜 **GDPR Article 17** - Right to erasure
- 📊 **GDPR Article 30** - Data access logging

**Technológia:** Python, cryptography library, zk-SNARKs

**Fájl:** `carl-security/zkp_encryption.py`

---

### 6️⃣ Database

**PostgreSQL Táblák:**
- `users` - Felhasználók
- `biometric_templates` - Biometrikus hash-ek
- `soulbound_nfts` - NFT metaadatok
- `wallets` - DFt egyenlegek
- `transactions` - Tranzakciós történet
- `content_rights` - Szerzői jogi védelem
- `monitored_content` - CARL által elemzett tartalmak
- `gdpr_consents` - GDPR hozzájárulások

**Redis Cache:**
- Session management
- Balance cache
- ZKP challenges
- Rate limiting

**Fájl:** `database/schema.sql`

---

## 🛠️ Technológiai Stack

### Backend
- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL 15+
- **Cache:** Redis 7+
- **Queue:** Bull (Redis-based)

### AI/ML
- **Language:** Python 3.11+
- **Deep Learning:** TensorFlow, PyTorch
- **NLP:** Hugging Face Transformers
- **Computer Vision:** OpenCV, DeepFace

### Blockchain
- **Platform:** Polygon (Layer 2)
- **Smart Contracts:** Solidity 0.8.x
- **Development:** Hardhat
- **Libraries:** ethers.js, Web3.js

### Mobile
- **Framework:** React Native
- **Language:** TypeScript
- **State Management:** Redux
- **Hardware:** NFC Manager, React Native Camera

### Security
- **Encryption:** AES-256-GCM
- **Hashing:** SHA-256, PBKDF2
- **ZKP:** zk-SNARKs (Circom/Snarkjs)
- **Auth:** JWT, OAuth 2.0, FIDO2

### DevOps
- **Containers:** Docker, Docker Compose
- **Orchestration:** Kubernetes
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus, Grafana
- **Logging:** ELK Stack

---

## 🏗️ Architektúra

```
┌─────────────────────────────────────────────────────────┐
│                  FELHASZNÁLÓI RÉTEG                      │
│  Mobile App (React Native) │ Admin Dashboard (React)    │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   API GATEWAY (Kong)                     │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌──────▼──────────┐
│  AUTH SERVICE  │  │  CARL AI ENGINE │
│  (Biometric +  │  │  (NLP, Deepfake │
│   Card Scan)   │  │   Detection)    │
└───────┬────────┘  └──────┬──────────┘
        │                   │
┌───────▼───────────────────▼──────────────────┐
│          EVENT BUS (Apache Kafka)            │
└───────┬──────────────────┬───────────────────┘
        │                  │
┌───────▼────────┐  ┌─────▼─────────────┐
│ TRANSACTION    │  │ BLOCKCHAIN        │
│ SERVICE        │  │ SERVICE           │
│ (DFt, Points)  │  │ (NFT, Contracts)  │
└───────┬────────┘  └─────┬─────────────┘
        │                  │
┌───────▼──────────────────▼──────────────┐
│          DATA LAYER                      │
│  PostgreSQL │ MongoDB │ Redis │ IPFS    │
└──────────────────────────────────────────┘
```

---

## 🚀 Telepítés

### Előfeltételek

- Docker 20+ és Docker Compose 2+
- Node.js 18+ (fejlesztéshez)
- Python 3.11+ (AI modulhoz)
- Kubernetes cluster (production)

### 1. Development Environment

```bash
# Klónozás
git clone https://github.com/magyar-kormany/carl-system.git
cd carl-system

# Environment változók beállítása
cp .env.example .env
# Szerkeszd a .env fájlt!

# Docker Compose indítás
make dev

# Vagy manuálisan:
docker-compose up -d

# Logok
docker-compose logs -f
```

**Elérhetőségek:**
- Backend API: http://localhost:3000
- CARL AI: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Grafana: http://localhost:3001

### 2. Production Deployment (Kubernetes)

```bash
# Namespace létrehozása
kubectl apply -f kubernetes/namespace.yaml

# Secrets konfigurálása
kubectl create secret generic carl-secrets \
  --from-literal=postgres-password=YOUR_PASSWORD \
  --from-literal=jwt-secret=YOUR_JWT_SECRET \
  -n carl-system

# Deployment
kubectl apply -f kubernetes/

# Status ellenőrzése
kubectl get pods -n carl-system
kubectl get services -n carl-system

# Rollout
kubectl rollout status deployment/carl-backend -n carl-system
```

### 3. Database Inicializálás

```bash
# Schema betöltése
psql -h localhost -U carl_user -d carl_db -f database/schema.sql

# Test data
psql -h localhost -U carl_user -d carl_db -f database/test_data.sql
```

---

## 📚 API Dokumentáció

### Authentication

#### Kártya Beolvasás
```http
POST /api/v1/auth/card-scan
Content-Type: application/json

{
  "cardNumber": "MSK-2025-001",
  "nfcData": "hex_encoded_nfc_data",
  "location": {
    "latitude": 47.4979,
    "longitude": 19.0402
  }
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid",
    "cardNumber": "MSK-2025-001",
    "dftBalance": 1000.0,
    "pointsBalance": 250
  },
  "requiresBiometric": true
}
```

#### Biometrikus Azonosítás
```http
POST /api/v1/auth/biometric
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "uuid",
  "biometricType": "face",
  "biometricData": "base64_encoded_biometric"
}
```

### Wallet Operations

#### Egyenleg Lekérdezés
```http
GET /api/v1/wallet/balance
Authorization: Bearer {token}
```

**Response:**
```json
{
  "userId": "uuid",
  "dftBalance": 1000.50,
  "pointsBalance": 250,
  "nftTokenId": "1",
  "currency": "DFt"
}
```

#### Pontok Beváltása
```http
POST /api/v1/wallet/redeem-points
Authorization: Bearer {token}
Content-Type: application/json

{
  "points": 100
}
```

### Transactions

#### Tranzakció Végrehajtása
```http
POST /api/v1/transaction/execute
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "purchase",
  "amount": 50.0,
  "productId": "product-uuid"
}
```

### Content Rights

#### Szerzői Jog Regisztrálása
```http
POST /api/v1/content/register-rights
Authorization: Bearer {token}
Content-Type: application/json

{
  "contentType": "voice",
  "allowLicensing": true,
  "royaltyRate": 15
}
```

---

## 🔒 Biztonsági Megfontolások

### 1. Biometrikus Adatok

**KRITIKUS:** Soha nem tároljuk a raw biometrikus adatokat!

- ✅ Csak **SHA-256 hash + salt** tárolása
- ✅ **Zero-knowledge proof** használata authhoz
- ✅ Template-ek **AES-256-GCM** titkosítással
- ✅ Automatikus **failed attempt tracking**
- ✅ **Account lockout** 5 sikertelen próbálkozás után

### 2. Zero-Knowledge Proof Flow

```
1. User regisztrál → hash(biometric + salt) tárolása
2. Login kísérlet:
   a) Server challenge generálás
   b) Client proof generálás (ZKP)
   c) Server proof verification
   d) Access grant (soha nem látta a raw adatot!)
```

### 3. Titkosítás

- **At Rest:** AES-256-GCM minden érzékeny adatra
- **In Transit:** TLS 1.3 minden kommunikációhoz
- **Key Management:** HashiCorp Vault
- **Rotation:** Automatikus key rotation minden 90 napban

### 4. Rate Limiting

```
- Login attempts: 5 / 15 perc / IP
- API requests: 100 / perc / user
- Transaction: 10 / perc / user
```

---

## 📜 GDPR Megfelelőség

### Beépített GDPR Funkciók

#### 1. Consent Management (Article 7)
```python
gdpr.record_consent(
    user_id="HU-12345678",
    purpose="biometric_authentication",
    consent_given=True,
    ip_address="192.168.1.1"
)
```

#### 2. Data Access Logging (Article 30)
- Minden adathozzáférés naplózva
- Ki, mikor, mit, miért, milyen jogalappal

#### 3. Right to Access (Article 15)
```http
GET /api/v1/gdpr/export
Authorization: Bearer {token}
```

Visszaadja az összes felhasználói adatot JSON-ban.

#### 4. Right to Erasure (Article 17)
```http
POST /api/v1/gdpr/delete
Authorization: Bearer {token}

{
  "reason": "User requested deletion",
  "confirmCode": "DELETE-ME-123"
}
```

#### 5. Data Retention
- Automatikus törlés a `data_retention_until` dátum után
- Audit log-ok 7 évig (törvényi kötelezettség)

---

## 🗺️ Roadmap

### ✅ Fase 1: MVP (Hónap 1-2) - **KÉSZ**
- [x] Core architektúra
- [x] Backend API alapok
- [x] CARL AI prototípus
- [x] Database schema
- [x] Mobile app alapok

### 🟡 Fase 2: Beta (Hónap 3-4) - **FOLYAMATBAN**
- [x] Blockchain integration
- [x] Zero-knowledge proof
- [x] GDPR compliance
- [ ] Deepfake detection finomhangolás
- [ ] Pilot tesztelés 100 felhasználóval

### 🔜 Fase 3: Public Beta (Hónap 5-6)
- [ ] Kártya gyártás (10,000 darab)
- [ ] Merchant integration
- [ ] Közösségi média monitoring élesítés
- [ ] Security audit (3rd party)
- [ ] Load testing

### 🚀 Fase 4: Launch (Hónap 7-8)
- [ ] Hivatalos licensz megszerzése
- [ ] Országos kampány
- [ ] 1M+ felhasználó célzás
- [ ] DFt exchange listing

---

## 👥 Fejlesztői Csapat

### Agent Csapatok

| Agent | Felelősség | Status |
|-------|-----------|--------|
| System Architect | Teljes rendszer architektúra | ✅ Működik |
| AI/ML Agent | CARL kognitív motor | ✅ Működik |
| Blockchain Agent | Smart contracts, NFT | ✅ Működik |
| Security Agent | ZKP, encryption, GDPR | ✅ Működik |
| Backend Agent | API, business logic | ✅ Működik |
| Frontend Agent | Mobile app, UI/UX | ✅ Működik |
| Database Agent | Schema, optimization | ✅ Működik |
| DevOps Agent | Deployment, monitoring | ✅ Működik |
| Legal Agent | GDPR, szerzői jog | 🟡 Review alatt |

---

## 📞 Kapcsolat & Support

**Hivatalos honlap:** https://magyarszivcartya.hu  
**API Dokumentáció:** https://docs.magyarszivcartya.hu  
**Support Email:** support@magyarszivcartya.hu  
**Bug Report:** https://github.com/magyar-kormany/carl-system/issues

---

## 📄 Licenc

```
Copyright © 2025 Magyar Kormány - Digitális Átláthatósági Protokoll
Minden jog fenntartva.

Ez a szoftver kizárólag engedéllyel használható.
Unauthorized use is strictly prohibited.
```

---

## 🙏 Köszönetnyilvánítás

Köszönet a következő projekteknek és közösségeknek:
- Ethereum Foundation
- OpenZeppelin
- Anthropic (Claude AI fejlesztés támogatás)
- Magyar Szellemi Tulajdon Hivatala

---

<div align="center">

**🇭🇺 CARL - Magyar Szív Kártya**  
*"Az AI + közösségi média erő új szabályozása"*

[![Made with ❤️ in Hungary](https://img.shields.io/badge/Made%20with%20%E2%9D%A4%EF%B8%8F%20in-Hungary-red)](https://magyarszivcartya.hu)

</div>
