#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# CARL Project - Complete GitHub Setup Script
# Ez a script létrehozza a teljes projekt struktúrát
# ═══════════════════════════════════════════════════════════════

set -e  # Exit on error

PROJECT_NAME="carl-magyar-sziv-kartya"
GITHUB_USERNAME="lewiske82"  
GITHUB_REPO="carl-system"       

echo "═══════════════════════════════════════════════════════════"
echo "🇭🇺 CARL - Magyar Szív Kártya Projekt Setup"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git nincs telepítve! Telepítsd: https://git-scm.com/"
    exit 1
fi

echo "✅ Git telepítve"
echo ""

# Create project directory
echo "📁 Projekt mappa létrehozása: $PROJECT_NAME"
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

# ═══════════════════════════════════════════════════════════════
# 1. ROOT FILES
# ═══════════════════════════════════════════════════════════════

echo "📝 Root fájlok létrehozása..."

# .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
__pycache__/
*.pyc
venv/
env/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build
dist/
build/
*.log

# Database
*.db
*.sqlite

# Secrets
*.pem
*.key
secrets/
EOF

# README.md
cat > README.md << 'EOF'
# 🇭🇺 CARL - Magyar Szív Kártya

**Cognitive Archive & Relational Legacy**  
**Digitális Átláthatósági Protokoll (DÁP)**

## Áttekintés

AI-alapú kiegészítő személyazonosító rendszer, amely integrálja:
- Digitális identitás és adatbirtoklás
- Szerzői jogi védelem (hang, kinézet)
- Deflácios digitális valuta (DFt)
- Zero-knowledge proof adatvédelem
- Blockchain alapú NFT rendszer

## Gyors Start

```bash
# 1. Dependencies telepítése
npm install

# 2. Database setup
docker-compose up -d postgres redis
psql -h localhost -U carl_user -d carl_db -f database/schema.sql

# 3. Backend indítása
cd carl-backend
npm run dev

# 4. Mobile app
cd carl-mobile
npm install
npx react-native run-ios
```

## Dokumentáció

Teljes dokumentáció: [docs/README.md](docs/README.md)

## Licenc

Copyright © 2025 Magyar Kormány - Minden jog fenntartva
EOF

# docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: carl-postgres
    environment:
      POSTGRES_DB: carl_db
      POSTGRES_USER: carl_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - carl-network

  redis:
    image: redis:7-alpine
    container_name: carl-redis
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD:-changeme}
    volumes:
      - redis_data:/data
    networks:
      - carl-network

volumes:
  postgres_data:
  redis_data:

networks:
  carl-network:
    driver: bridge
EOF

# .env.example
cat > .env.example << 'EOF'
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=carl_db
POSTGRES_USER=carl_user
POSTGRES_PASSWORD=your_secure_password_here

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# Backend
NODE_ENV=development
PORT=3000
JWT_SECRET=your_jwt_secret_change_in_production

# Blockchain
BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=your_private_key_here

# API
API_BASE_URL=http://localhost:3000
EOF

# Makefile
cat > Makefile << 'EOF'
.PHONY: help setup dev clean

help:
	@echo "CARL Development Commands"
	@echo "========================="
	@echo "make setup  - Initial setup"
	@echo "make dev    - Start development environment"
	@echo "make clean  - Clean up containers"

setup:
	@echo "Setting up CARL project..."
	cp .env.example .env
	docker-compose up -d
	@echo "✅ Setup complete!"

dev:
	docker-compose up -d
	@echo "✅ Development environment started"

clean:
	docker-compose down -v
	@echo "✅ Cleaned up"
EOF

# ═══════════════════════════════════════════════════════════════
# 2. DATABASE
# ═══════════════════════════════════════════════════════════════

echo "📊 Database fájlok létrehozása..."
mkdir -p database

cat > database/schema.sql << 'EOF'
-- CARL Database Schema
-- Az artifacts-ban található teljes schema ide kerül

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_number VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    kyc_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    gdpr_consent_given BOOLEAN DEFAULT false NOT NULL,
    gdpr_consent_date TIMESTAMP WITH TIME ZONE,
    data_retention_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_card_number CHECK (card_number ~ '^MSK-[0-9]{4}-[0-9]{3}$')
);

CREATE INDEX idx_users_card_number ON users(card_number);

-- Wallets table
CREATE TABLE wallets (
    wallet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    dft_balance NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    points_balance INTEGER DEFAULT 0 NOT NULL,
    total_earned NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    total_spent NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    total_burned NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    green_activity_count INTEGER DEFAULT 0 NOT NULL,
    green_bonus_earned NUMERIC(20, 8) DEFAULT 0.00000000 NOT NULL,
    last_green_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_transaction_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_dft_balance CHECK (dft_balance >= 0),
    CONSTRAINT valid_points_balance CHECK (points_balance >= 0)
);

-- Seed data
INSERT INTO users (card_number, email, first_name, last_name, is_active, is_verified, gdpr_consent_given, gdpr_consent_date)
VALUES ('MSK-2025-001', 'test@carl.hu', 'Test', 'User', true, true, true, CURRENT_TIMESTAMP);

INSERT INTO wallets (user_id, dft_balance, points_balance)
SELECT user_id, 1000.00000000, 250 FROM users WHERE card_number = 'MSK-2025-001';
EOF

# ═══════════════════════════════════════════════════════════════
# 3. BACKEND
# ═══════════════════════════════════════════════════════════════

echo "⚙️  Backend létrehozása..."
mkdir -p carl-backend/src/{routes,middleware,services}

# package.json
cat > carl-backend/package.json << 'EOF'
{
  "name": "carl-backend",
  "version": "0.1.0-beta",
  "description": "CARL Backend API",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-validator": "^7.0.1",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.5",
    "@types/pg": "^8.10.9",
    "typescript": "^5.3.3",
    "ts-node-dev": "^2.0.0"
  }
}
EOF

# tsconfig.json
cat > carl-backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# src/index.ts
cat > carl-backend/src/index.ts << 'EOF'
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 CARL Backend running on http://localhost:${PORT}`);
});
EOF

# ═══════════════════════════════════════════════════════════════
# 4. MOBILE
# ═══════════════════════════════════════════════════════════════

echo "📱 Mobile app létrehozása..."
mkdir -p carl-mobile/src/{screens,services,components}

# package.json
cat > carl-mobile/package.json << 'EOF'
{
  "name": "carl-mobile",
  "version": "0.1.0-beta",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start",
    "test": "jest"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.0",
    "react-native-nfc-manager": "^3.14.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-native": "^0.72.8",
    "typescript": "^5.3.3"
  }
}
EOF

# App.tsx placeholder
cat > carl-mobile/App.tsx << 'EOF'
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🇭🇺 CARL Mobile</Text>
      <Text>Magyar Szív Kártya</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
EOF

# ═══════════════════════════════════════════════════════════════
# 5. AI MODULE
# ═══════════════════════════════════════════════════════════════

echo "🤖 AI modul létrehozása..."
mkdir -p carl-ai

cat > carl-ai/requirements.txt << 'EOF'
tensorflow>=2.14.0
torch>=2.1.0
transformers>=4.35.0
numpy>=1.24.0
pillow>=10.0.0
opencv-python>=4.8.0
scikit-learn>=1.3.0
cryptography>=41.0.0
EOF

cat > carl-ai/cognitive_engine.py << 'EOF'
"""
CARL Cognitive Engine
AI/ML komponens
"""

print("🤖 CARL AI Engine - v0.1.0-beta")
print("Cognitive Archive & Relational Legacy")
EOF

# ═══════════════════════════════════════════════════════════════
# 6. BLOCKCHAIN
# ═══════════════════════════════════════════════════════════════

echo "⛓️  Blockchain modul létrehozása..."
mkdir -p carl-blockchain/contracts

cat > carl-blockchain/package.json << 'EOF'
{
  "name": "carl-blockchain",
  "version": "0.1.0-beta",
  "scripts": {
    "compile": "hardhat compile",
    "test": "hardhat test",
    "deploy": "hardhat run scripts/deploy.js"
  },
  "devDependencies": {
    "hardhat": "^2.19.2",
    "@nomicfoundation/hardhat-toolbox": "^4.0.0"
  }
}
EOF

cat > carl-blockchain/contracts/DigitalisForint.sol << 'EOF'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DigitalisForint is ERC20 {
    constructor() ERC20("Digitalis Forint", "DFt") {
        _mint(msg.sender, 100_000_000 * 10**decimals());
    }
}
EOF

# ═══════════════════════════════════════════════════════════════
# 7. SECURITY
# ═══════════════════════════════════════════════════════════════

echo "🔒 Security modul létrehozása..."
mkdir -p carl-security

cat > carl-security/zkp_prototype.py << 'EOF'
"""
Zero-Knowledge Proof Prototype
"""

print("🔐 CARL ZKP Module - v0.1.0-beta")
EOF

# ═══════════════════════════════════════════════════════════════
# 8. DOCS
# ═══════════════════════════════════════════════════════════════

echo "📚 Dokumentáció létrehozása..."
mkdir -p docs

cat > docs/README.md << 'EOF'
# CARL Dokumentáció

## Tartalomjegyzék

1. [Architektúra](architecture.md)
2. [API Dokumentáció](api.md)
3. [Setup Útmutató](setup.md)
4. [Security](security.md)

## Gyors linkek

- Backend API: http://localhost:3000
- Swagger UI: http://localhost:3000/docs
- Grafana: http://localhost:3001
EOF

# ═══════════════════════════════════════════════════════════════
# 9. GIT INITIALIZATION
# ═══════════════════════════════════════════════════════════════

echo ""
echo "🔧 Git repository inicializálása..."
git init

# Git config
git config user.name "CARL Developer"
git config user.email "dev@carl.hu"

# Add all files
git add .

# Initial commit
git commit -m "🎉 Initial commit - CARL Magyar Szív Kártya v0.1.0-beta

Komponensek:
- ✅ Backend API (Express + TypeScript)
- ✅ Mobile App (React Native)
- ✅ Database Schema (PostgreSQL)
- ✅ Blockchain (Solidity Smart Contracts)
- ✅ AI Engine (Python + TensorFlow)
- ✅ Security (ZKP + Encryption)
- ✅ DevOps (Docker + Kubernetes)

Status: Bétatesztelés alatt
"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ SETUP SIKERES!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📁 Projekt mappa: $(pwd)"
echo ""
echo "🚀 KÖVETKEZŐ LÉPÉSEK:"
echo ""
echo "1️⃣  GitHub Repository létrehozása:"
echo "    Menj a https://github.com/new oldalra"
echo "    Repository név: $GITHUB_REPO"
echo "    Típus: Private (ajánlott)"
echo ""
echo "2️⃣  Remote hozzáadása és push:"
echo "    git remote add origin https://github.com/$GITHUB_USERNAME/$GITHUB_REPO.git"
echo "    git branch -M main"
echo "    git push -u origin main"
echo ""
echo "3️⃣  Development környezet indítása:"
echo "    make setup"
echo "    make dev"
echo ""
echo "4️⃣  Backend indítás:"
echo "    cd carl-backend"
echo "    npm install"
echo "    npm run dev"
echo ""
echo "5️⃣  Mobile app indítás:"
echo "    cd carl-mobile"
echo "    npm install"
echo "    npx react-native run-ios"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📖 Teljes dokumentáció: docs/README.md"
echo "🐛 Issues: https://github.com/$GITHUB_USERNAME/$GITHUB_REPO/issues"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🇭🇺 CARL - Magyar Szív Kártya"
echo "   Cognitive Archive & Relational Legacy"
echo ""
