"""
CARL - Cognitive Archive & Relational Legacy
AI/ML Agent - Core Kognitív Motor
Verzió: 0.1.0-beta
"""

import asyncio
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import hashlib
import json
from datetime import datetime

# Szimulált importok (production-ben ezek valós library-k lennének)
# from transformers import pipeline
# import torch
# import cv2
# from deepface import DeepFace


class ContentType(Enum):
    """Tartalom típusok CARL számára"""
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    MIXED = "mixed"


class ThreatLevel(Enum):
    """Veszélyességi szintek"""
    SAFE = "safe"
    SUSPICIOUS = "suspicious"
    HARMFUL = "harmful"
    ILLEGAL = "illegal"


@dataclass
class UserProfile:
    """Felhasználói profil Carl számára"""
    user_id: str
    voice_signature: Optional[str] = None  # Hash, nem raw adat
    face_template: Optional[str] = None    # Hash, nem raw adat
    content_rights: Dict = None
    consent_given: bool = False
    
    def __post_init__(self):
        if self.content_rights is None:
            self.content_rights = {"voice": False, "face": False}


@dataclass
class AnalysisResult:
    """Carl elemzés eredménye"""
    content_id: str
    content_type: ContentType
    is_synthetic: bool
    confidence: float
    threat_level: ThreatLevel
    flags: List[str]
    timestamp: datetime
    details: Dict


class CARLCognitiveEngine:
    """
    CARL központi kognitív motor
    Felelős: NLP, deepfake detekció, tartalom monitoring
    """
    
    def __init__(self):
        self.version = "0.1.0-beta"
        self.models_loaded = False
        self.user_registry = {}
        
        # AI modellek inicializálása (szimulált)
        self._init_models()
    
    def _init_models(self):
        """AI modellek betöltése"""
        print("[CARL] 🤖 Kognitív modellek inicializálása...")
        
        # Production esetén:
        # self.nlp_model = pipeline("text-classification", model="SZTAKI-HLT/hubert-base-cc")
        # self.voice_model = torch.load("models/voice_fingerprint.pth")
        # self.face_model = DeepFace.build_model("Facenet")
        # self.deepfake_detector = torch.load("models/deepfake_detector.pth")
        
        self.models_loaded = True
        print("[CARL] ✅ Modellek betöltve")
    
    # ═══════════════════════════════════════════════════════════
    # BIOMETRIKUS AZONOSÍTÁS ÉS VÉDELEM
    # ═══════════════════════════════════════════════════════════
    
    async def register_user_biometrics(
        self, 
        user_id: str, 
        voice_sample: bytes = None,
        face_image: bytes = None,
        consent: bool = False
    ) -> UserProfile:
        """
        Felhasználó biometrikus adatainak regisztrálása
        FONTOS: Csak hash-t tárolunk, nem raw adatot (GDPR)
        """
        
        if not consent:
            raise ValueError("GDPR: Felhasználói hozzájárulás szükséges!")
        
        profile = UserProfile(user_id=user_id, consent_given=consent)
        
        if voice_sample:
            # Hang fingerprint generálás (csak hash)
            voice_hash = self._generate_voice_fingerprint(voice_sample)
            profile.voice_signature = voice_hash
            profile.content_rights["voice"] = True
            print(f"[CARL] 🎤 Hang ujjlenyomat regisztrálva: {user_id}")
        
        if face_image:
            # Arc template generálás (csak hash)
            face_hash = self._generate_face_template(face_image)
            profile.face_template = face_hash
            profile.content_rights["face"] = True
            print(f"[CARL] 👤 Arc template regisztrálva: {user_id}")
        
        self.user_registry[user_id] = profile
        return profile
    
    def _generate_voice_fingerprint(self, audio_data: bytes) -> str:
        """
        Hang ujjlenyomat generálása
        Production: MFCC + neural embedding
        """
        # Szimulált: valójában komplex audio processing
        return hashlib.sha256(audio_data).hexdigest()
    
    def _generate_face_template(self, image_data: bytes) -> str:
        """
        Arc template generálása
        Production: FaceNet/ArcFace embedding
        """
        # Szimulált: valójában deep learning model
        return hashlib.sha256(image_data).hexdigest()
    
    # ═══════════════════════════════════════════════════════════
    # DEEPFAKE DETEKCIÓ
    # ═══════════════════════════════════════════════════════════
    
    async def detect_deepfake_audio(
        self, 
        audio_data: bytes,
        claimed_user_id: Optional[str] = None
    ) -> Tuple[bool, float]:
        """
        Hang deepfake detekció
        Visszaadja: (is_fake, confidence_score)
        """
        
        print("[CARL] 🔍 Audio deepfake analízis...")
        
        # Production esetén:
        # - Spektrogram analízis
        # - Neural vocoder artifacts detection
        # - Temporal inconsistency check
        # - Voice fingerprint matching
        
        # Szimulált eredmény
        is_synthetic = False
        confidence = 0.95
        
        if claimed_user_id and claimed_user_id in self.user_registry:
            # Ellenőrzés regisztrált hanggal
            stored_print = self.user_registry[claimed_user_id].voice_signature
            current_print = self._generate_voice_fingerprint(audio_data)
            
            if stored_print != current_print:
                is_synthetic = True
                confidence = 0.88
        
        return is_synthetic, confidence
    
    async def detect_deepfake_video(
        self,
        video_data: bytes,
        claimed_user_id: Optional[str] = None
    ) -> Tuple[bool, float]:
        """
        Video deepfake detekció
        """
        
        print("[CARL] 🔍 Video deepfake analízis...")
        
        # Production esetén:
        # - Frame-by-frame face detection
        # - Temporal coherence check
        # - GAN artifacts detection (checkerboard patterns)
        # - Eye blinking analysis
        # - Lighting consistency
        
        # Szimulált
        is_synthetic = False
        confidence = 0.92
        
        return is_synthetic, confidence
    
    # ═══════════════════════════════════════════════════════════
    # KÖZÖSSÉGI MÉDIA MONITORING
    # ═══════════════════════════════════════════════════════════
    
    async def analyze_social_content(
        self,
        content: str,
        content_type: ContentType,
        media_data: Optional[bytes] = None
    ) -> AnalysisResult:
        """
        Közösségi média tartalom elemzése
        - Rejtett reklám detekció (GVH)
        - Dezinformáció szűrés
        - Deepfake jelölés
        - Szerzői jogi megsértés
        """
        
        content_id = hashlib.md5(content.encode()).hexdigest()
        flags = []
        threat_level = ThreatLevel.SAFE
        is_synthetic = False
        confidence = 0.0
        
        # 1. Rejtett reklám detekció
        if await self._detect_hidden_advertisement(content):
            flags.append("REJTETT_REKLAM")
            threat_level = ThreatLevel.SUSPICIOUS
            print(f"[CARL] ⚠️ Rejtett reklám észlelve: {content_id[:8]}")
        
        # 2. Dezinformáció check
        if await self._detect_misinformation(content):
            flags.append("DEZINFORMACIO")
            threat_level = ThreatLevel.HARMFUL
            print(f"[CARL] 🚨 Dezinformáció észlelve: {content_id[:8]}")
        
        # 3. Deepfake jelölés (ha van média)
        if media_data:
            if content_type == ContentType.AUDIO:
                is_synthetic, confidence = await self.detect_deepfake_audio(media_data)
            elif content_type == ContentType.VIDEO:
                is_synthetic, confidence = await self.detect_deepfake_video(media_data)
            
            if is_synthetic:
                flags.append("AI_GENERALT")
                print(f"[CARL] 🤖 AI-generált tartalom: {content_id[:8]}")
        
        # 4. Szerzői jogi védelem
        copyright_violation = await self._check_copyright_violation(content, media_data)
        if copyright_violation:
            flags.append("SZERZOI_JOG_SERTES")
            threat_level = ThreatLevel.ILLEGAL
            print(f"[CARL] ⚖️ Szerzői jog sértés: {content_id[:8]}")
        
        return AnalysisResult(
            content_id=content_id,
            content_type=content_type,
            is_synthetic=is_synthetic,
            confidence=confidence,
            threat_level=threat_level,
            flags=flags,
            timestamp=datetime.now(),
            details={
                "analyzed_by": "CARL v" + self.version,
                "gdpr_compliant": True
            }
        )
    
    async def _detect_hidden_advertisement(self, text: str) -> bool:
        """
        Rejtett reklám detekció (GVH szabályok alapján)
        """
        # Production: NLP model + keyword analysis
        suspicious_patterns = [
            "linkbio", "swipe up", "kód:", "kedvezmény",
            "együttműködés", "szponzor nélkül"
        ]
        
        text_lower = text.lower()
        return any(pattern in text_lower for pattern in suspicious_patterns)
    
    async def _detect_misinformation(self, text: str) -> bool:
        """
        Dezinformáció szűrés
        """
        # Production: Fact-checking API + NLP sentiment analysis
        # Ellenőrzés trusted sources-kal
        
        return False  # Szimulált
    
    async def _check_copyright_violation(
        self,
        text: str,
        media: Optional[bytes]
    ) -> bool:
        """
        Szerzői jogi megsértés ellenőrzése
        """
        # Production: 
        # - Audio fingerprint match registry-vel
        # - Face recognition match
        # - Text plagiarism check
        
        return False  # Szimulált
    
    # ═══════════════════════════════════════════════════════════
    # TARTALOMGYÁRTÁS ENGEDÉLYEZÉS
    # ═══════════════════════════════════════════════════════════
    
    async def check_usage_permission(
        self,
        content_creator_id: str,
        user_id: str,
        usage_type: str  # "voice" vagy "face"
    ) -> Tuple[bool, Optional[Dict]]:
        """
        Ellenőrzi, hogy a content creator használhatja-e a user hang/arc-át
        """
        
        if user_id not in self.user_registry:
            return False, {"error": "User not registered"}
        
        user = self.user_registry[user_id]
        
        # Consent check
        if not user.content_rights.get(usage_type, False):
            return False, {"error": f"No {usage_type} rights granted"}
        
        # Licensing terms check (production: database query)
        # Ellenőrzés: van-e aktív licenc szerződés?
        
        print(f"[CARL] ✅ Engedély ellenőrizve: {content_creator_id} -> {user_id} ({usage_type})")
        
        return True, {
            "license_active": True,
            "royalty_rate": 0.15,  # 15% jogdíj
            "terms": "zero_knowledge_proof"
        }
    
    # ═══════════════════════════════════════════════════════════
    # INTEGRITÁS ÉS RIPORT
    # ═══════════════════════════════════════════════════════════
    
    def generate_integrity_report(self, user_id: str) -> Dict:
        """
        Felhasználó integritási jelentése
        """
        if user_id not in self.user_registry:
            return {"error": "User not found"}
        
        user = self.user_registry[user_id]
        
        return {
            "user_id": user_id,
            "voice_protected": user.voice_signature is not None,
            "face_protected": user.face_template is not None,
            "consent_status": user.consent_given,
            "content_rights": user.content_rights,
            "report_generated": datetime.now().isoformat()
        }


# ═══════════════════════════════════════════════════════════════
# MAIN DEMO
# ═══════════════════════════════════════════════════════════════

async def demo():
    """
    CARL motor demo - Bétatesztelés
    """
    
    print("="*60)
    print("🇭🇺 CARL - Cognitive Archive & Relational Legacy")
    print("Magyar Szív Kártya AI Motor")
    print("Bétatesztelés v0.1.0")
    print("="*60)
    print()
    
    # Inicializálás
    carl = CARLCognitiveEngine()
    
    # 1. Felhasználó regisztráció
    print("\n📋 1. Felhasználó biometrikus regisztráció")
    print("-" * 60)
    
    user_profile = await carl.register_user_biometrics(
        user_id="HU-12345678",
        voice_sample=b"fake_audio_data_sample",
        face_image=b"fake_image_data_sample",
        consent=True
    )
    
    print(f"✅ Profil létrehozva: {user_profile.user_id}")
    print(f"   Hang védve: {user_profile.content_rights['voice']}")
    print(f"   Arc védve: {user_profile.content_rights['face']}")
    
    # 2. Deepfake detekció
    print("\n🔍 2. Deepfake detekció teszt")
    print("-" * 60)
    
    test_audio = b"suspicious_audio_sample"
    is_fake, confidence = await carl.detect_deepfake_audio(test_audio, "HU-12345678")
    
    print(f"Synthetic: {is_fake}")
    print(f"Confidence: {confidence*100:.1f}%")
    
    # 3. Közösségi média monitoring
    print("\n📱 3. Közösségi média tartalom elemzés")
    print("-" * 60)
    
    test_post = """
    Imádom ezt az új terméket! 🔥
    Használd a kódot: PROMO20 20% kedvezményért!
    #linkbio #ad
    """
    
    result = await carl.analyze_social_content(
        content=test_post,
        content_type=ContentType.TEXT
    )
    
    print(f"Content ID: {result.content_id[:16]}...")
    print(f"Veszély szint: {result.threat_level.value}")
    print(f"Flagek: {', '.join(result.flags) if result.flags else 'Nincs'}")
    
    # 4. Tartalomhasználat engedély
    print("\n⚖️ 4. Tartalomhasználat engedély ellenőrzés")
    print("-" * 60)
    
    allowed, terms = await carl.check_usage_permission(
        content_creator_id="CREATOR-001",
        user_id="HU-12345678",
        usage_type="voice"
    )
    
    print(f"Engedélyezve: {allowed}")
    if allowed and terms:
        print(f"Jogdíj: {terms.get('royalty_rate', 0)*100}%")
    
    # 5. Integritási riport
    print("\n📊 5. Integritási jelentés")
    print("-" * 60)
    
    report = carl.generate_integrity_report("HU-12345678")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    
    print("\n" + "="*60)
    print("✅ CARL demo befejezve - Rendszer működőképes")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(demo())