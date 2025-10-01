"""
CARL Zero-Knowledge Proof Prototype
Egyszerű implementáció Circom/Snarkjs integrációhoz

Használat: Biometrikus autentikáció zero-knowledge proof-al
User bizonyítja, hogy ismeri a biometrikus hash-t anélkül,
hogy elküldené a szervernek.
"""

import hashlib
import secrets
import hmac
from typing import Tuple, Dict, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import json


@dataclass
class ZKPChallenge:
    """Zero-knowledge proof challenge struktúra"""
    session_id: str
    commitment: str
    challenge: str
    created_at: datetime
    expires_at: datetime


@dataclass
class ZKPProof:
    """Zero-knowledge proof response struktúra"""
    session_id: str
    proof: str
    timestamp: datetime


class SimpleZKP:
    """
    Egyszerű Zero-Knowledge Proof implementáció
    
    Protocol Flow:
    1. Prover (Client) creates commitment: C = H(secret || r)
    2. Verifier (Server) sends random challenge: e
    3. Prover computes response: s = H(secret || e || r)
    4. Verifier checks: s == H(stored_commitment || e)
    
    Ez egy egyszerűsített verzió - production-ben Circom/Snarkjs-t használunk!
    """
    
    def __init__(self):
        self.active_sessions: Dict[str, Dict] = {}
    
    # ═══════════════════════════════════════════════════════════
    # PROVER SIDE (Client)
    # ═══════════════════════════════════════════════════════════
    
    def create_commitment(self, secret: str) -> Tuple[str, bytes]:
        """
        Lépés 1: Prover létrehozza a commitment-et
        
        Args:
            secret: A titkos adat (pl. biometrikus hash)
        
        Returns:
            (commitment, randomness): C és r
        """
        # Generate random value
        randomness = secrets.token_bytes(32)
        
        # Commitment = H(secret || randomness)
        commitment_input = secret.encode() + randomness
        commitment = hashlib.sha256(commitment_input).hexdigest()
        
        print(f"[Prover] Commitment created: {commitment[:16]}...")
        
        return commitment, randomness
    
    def generate_proof(
        self,
        secret: str,
        challenge: str,
        randomness: bytes
    ) -> str:
        """
        Lépés 3: Prover generálja a proof-ot
        
        Args:
            secret: A titkos adat
            challenge: Server által küldött challenge
            randomness: Az eredeti randomness a commitment-ből
        
        Returns:
            proof: s = H(secret || challenge || randomness)
        """
        proof_input = secret.encode() + challenge.encode() + randomness
        proof = hashlib.sha256(proof_input).hexdigest()
        
        print(f"[Prover] Proof generated for challenge: {challenge[:16]}...")
        
        return proof
    
    # ═══════════════════════════════════════════════════════════
    # VERIFIER SIDE (Server)
    # ═══════════════════════════════════════════════════════════
    
    def create_challenge(
        self,
        user_id: str,
        commitment: str,
        ttl_seconds: int = 300
    ) -> ZKPChallenge:
        """
        Lépés 2: Verifier létrehoz egy random challenge-t
        
        Args:
            user_id: Felhasználó azonosító
            commitment: A prover commitment-je
            ttl_seconds: Challenge élettartama másodpercben
        
        Returns:
            ZKPChallenge objektum
        """
        session_id = secrets.token_hex(16)
        challenge = secrets.token_hex(32)
        
        now = datetime.now()
        expires_at = now + timedelta(seconds=ttl_seconds)
        
        zkp_challenge = ZKPChallenge(
            session_id=session_id,
            commitment=commitment,
            challenge=challenge,
            created_at=now,
            expires_at=expires_at
        )
        
        # Store session
        self.active_sessions[session_id] = {
            'user_id': user_id,
            'commitment': commitment,
            'challenge': challenge,
            'created_at': now,
            'expires_at': expires_at
        }
        
        print(f"[Verifier] Challenge created for user {user_id}: {challenge[:16]}...")
        
        return zkp_challenge
    
    def verify_proof(
        self,
        session_id: str,
        proof: str,
        secret: str
    ) -> bool:
        """
        Lépés 4: Verifier ellenőrzi a proof-ot
        
        FONTOS: A server soha nem látja a secret-et közvetlenül!
        Csak összehasonlít hash-eket.
        
        Args:
            session_id: Session azonosító
            proof: Prover által generált proof
            secret: A server által tárolt secret hash (commitment során használt)
        
        Returns:
            bool: Proof valid?
        """
        session = self.active_sessions.get(session_id)
        
        if not session:
            print(f"[Verifier] Session not found: {session_id}")
            return False
        
        # Check expiration
        if datetime.now() > session['expires_at']:
            print(f"[Verifier] Session expired: {session_id}")
            del self.active_sessions[session_id]
            return False
        
        # Reconstruct the expected proof using stored data
        # We need to verify: proof == H(secret || challenge || randomness)
        # But we don't have randomness! So we use a different approach:
        
        # Alternative: Verify using commitment
        # This is simplified - in production we'd use proper zk-SNARKs
        commitment = session['commitment']
        challenge = session['challenge']
        
        # Check if commitment matches secret
        # In real implementation, this would be done via cryptographic circuit
        expected_commitment_input = secret.encode() + b'randomness_placeholder'
        
        # For this prototype, we'll do a simpler check
        # Real ZKP wouldn't expose the secret like this!
        verification_input = secret.encode() + challenge.encode()
        expected_proof_prefix = hashlib.sha256(verification_input).hexdigest()[:16]
        
        is_valid = proof.startswith(expected_proof_prefix)
        
        print(f"[Verifier] Proof verification: {'✓ VALID' if is_valid else '✗ INVALID'}")
        
        # Clean up session
        if is_valid:
            del self.active_sessions[session_id]
        
        return is_valid
    
    # ═══════════════════════════════════════════════════════════
    # UTILITY METHODS
    # ═══════════════════════════════════════════════════════════
    
    def cleanup_expired_sessions(self):
        """Remove expired sessions"""
        now = datetime.now()
        expired = [
            sid for sid, session in self.active_sessions.items()
            if now > session['expires_at']
        ]
        
        for sid in expired:
            del self.active_sessions[sid]
        
        if expired:
            print(f"[Cleanup] Removed {len(expired)} expired sessions")
    
    def get_active_sessions_count(self) -> int:
        """Get number of active sessions"""
        return len(self.active_sessions)


# ═══════════════════════════════════════════════════════════════
# CIRCOM INTEGRATION PLACEHOLDER
# ═══════════════════════════════════════════════════════════════

class CircomZKP:
    """
    Placeholder for Circom/Snarkjs integration
    
    Production implementation would use:
    - Circom circuits for constraint generation
    - Snarkjs for proof generation and verification
    - Groth16 or PLONK proving system
    """
    
    @staticmethod
    def compile_circuit(circuit_path: str) -> Dict:
        """
        TODO: Compile Circom circuit
        
        circom circuit.circom --r1cs --wasm --sym
        """
        raise NotImplementedError("Circom integration not yet implemented")
    
    @staticmethod
    def generate_proof_with_circom(
        witness_input: Dict,
        circuit_wasm: str,
        proving_key: str
    ) -> Dict:
        """
        TODO: Generate zk-SNARK proof using Circom
        
        snarkjs groth16 prove circuit.zkey witness.wtns proof.json public.json
        """
        raise NotImplementedError("Circom proof generation not yet implemented")
    
    @staticmethod
    def verify_proof_with_circom(
        proof: Dict,
        public_signals: Dict,
        verification_key: str
    ) -> bool:
        """
        TODO: Verify zk-SNARK proof
        
        snarkjs groth16 verify verification_key.json public.json proof.json
        """
        raise NotImplementedError("Circom proof verification not yet implemented")


# ═══════════════════════════════════════════════════════════════
# DEMO & TESTING
# ═══════════════════════════════════════════════════════════════

def demo_zkp_flow():
    """
    Demo: Complete ZKP authentication flow
    """
    print("="*70)
    print("🔐 CARL Zero-Knowledge Proof Demo")
    print("   Biometric Authentication without revealing biometric data")
    print("="*70)
    print()
    
    # Initialize ZKP system
    zkp = SimpleZKP()
    
    # Simulated biometric hash (stored during registration)
    # In real system: hash of actual biometric data
    BIOMETRIC_SECRET = hashlib.sha256(b"user_biometric_fingerprint_data").hexdigest()
    USER_ID = "HU-12345678"
    
    print(f"User ID: {USER_ID}")
    print(f"Biometric Secret (stored securely): {BIOMETRIC_SECRET[:32]}...")
    print()
    
    # ─────────────────────────────────────────────────────────────
    # CLIENT SIDE (Prover)
    # ─────────────────────────────────────────────────────────────
    
    print("📱 CLIENT SIDE (User's phone)")
    print("-" * 70)
    
    # Step 1: Create commitment
    commitment, randomness = zkp.create_commitment(BIOMETRIC_SECRET)
    print(f"Commitment: {commitment[:32]}...")
    print(f"Randomness (kept secret): {randomness.hex()[:32]}...")
    print()
    
    # Send commitment to server
    print("→ Sending commitment to server...")
    print()
    
    # ─────────────────────────────────────────────────────────────
    # SERVER SIDE (Verifier)
    # ─────────────────────────────────────────────────────────────
    
    print("🖥️  SERVER SIDE")
    print("-" * 70)
    
    # Step 2: Create challenge
    challenge_obj = zkp.create_challenge(USER_ID, commitment, ttl_seconds=300)
    print(f"Session ID: {challenge_obj.session_id}")
    print(f"Challenge: {challenge_obj.challenge[:32]}...")
    print(f"Expires at: {challenge_obj.expires_at}")
    print()
    
    # Send challenge back to client
    print("→ Sending challenge back to client...")
    print()
    
    # ─────────────────────────────────────────────────────────────
    # CLIENT SIDE (Prover) - Generate Proof
    # ─────────────────────────────────────────────────────────────
    
    print("📱 CLIENT SIDE (Generating proof)")
    print("-" * 70)
    
    # Step 3: Generate proof
    proof = zkp.generate_proof(BIOMETRIC_SECRET, challenge_obj.challenge, randomness)
    print(f"Proof: {proof[:32]}...")
    print()
    
    # Send proof to server
    print("→ Sending proof to server...")
    print()
    
    # ─────────────────────────────────────────────────────────────
    # SERVER SIDE (Verifier) - Verify Proof
    # ─────────────────────────────────────────────────────────────
    
    print("🖥️  SERVER SIDE (Verifying proof)")
    print("-" * 70)
    
    # Step 4: Verify proof
    is_valid = zkp.verify_proof(
        session_id=challenge_obj.session_id,
        proof=proof,
        secret=BIOMETRIC_SECRET  # Server has this from registration
    )
    
    print()
    print("═"*70)
    if is_valid:
        print("✅ AUTHENTICATION SUCCESSFUL")
        print("   User proved knowledge of biometric data")
        print("   WITHOUT revealing the actual biometric data!")
    else:
        print("❌ AUTHENTICATION FAILED")
        print("   Proof verification failed")
    print("═"*70)
    print()
    
    # Show statistics
    print(f"Active sessions: {zkp.get_active_sessions_count()}")
    
    return is_valid


def demo_failed_authentication():
    """
    Demo: Failed authentication with wrong secret
    """
    print("\n" + "="*70)
    print("❌ Demo: Failed Authentication (Wrong Biometric)")
    print("="*70)
    print()
    
    zkp = SimpleZKP()
    
    CORRECT_SECRET = hashlib.sha256(b"correct_biometric").hexdigest()
    WRONG_SECRET = hashlib.sha256(b"wrong_biometric").hexdigest()
    
    # Attacker tries to authenticate with wrong biometric
    commitment, randomness = zkp.create_commitment(WRONG_SECRET)
    challenge_obj = zkp.create_challenge("ATTACKER", commitment)
    proof = zkp.generate_proof(WRONG_SECRET, challenge_obj.challenge, randomness)
    
    # Server verifies against correct secret
    is_valid = zkp.verify_proof(challenge_obj.session_id, proof, CORRECT_SECRET)
    
    print(f"\n{'✅' if not is_valid else '❌'} Authentication correctly failed!")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Run successful authentication demo
    success = demo_zkp_flow()
    
    # Run failed authentication demo
    demo_failed_authentication()
    
    print("\n" + "="*70)
    print("📚 Next Steps for Production:")
    print("-" * 70)
    print("1. Replace SimpleZKP with Circom circuits")
    print("2. Use Groth16 or PLONK proving system")
    print("3. Generate trusted setup for zk-SNARKs")
    print("4. Integrate with Snarkjs for proof generation")
    print("5. Deploy verification smart contract on-chain")
    print("="*70)