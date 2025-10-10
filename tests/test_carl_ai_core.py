import asyncio
import hashlib
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from carl_ai_core import CARLCognitiveEngine, ContentType, ThreatLevel


def test_register_user_biometrics_creates_hashed_signatures():
    engine = CARLCognitiveEngine()

    profile = asyncio.run(engine.register_user_biometrics(
        user_id="test-user",
        voice_sample=b"voice-sample",
        face_image=b"face-sample",
        consent=True,
    ))

    assert profile.consent_given is True
    assert profile.voice_signature == hashlib.sha256(b"voice-sample").hexdigest()
    assert profile.face_template == hashlib.sha256(b"face-sample").hexdigest()
    assert profile.content_rights == {"voice": True, "face": True}


def test_register_user_biometrics_requires_consent():
    engine = CARLCognitiveEngine()

    try:
        asyncio.run(engine.register_user_biometrics(
            user_id="no-consent",
            voice_sample=b"voice",
            face_image=None,
            consent=False,
        ))
    except ValueError:
        pass
    else:
        raise AssertionError("register_user_biometrics should require consent")


def test_detect_deepfake_audio_flags_mismatched_voice():
    engine = CARLCognitiveEngine()

    asyncio.run(engine.register_user_biometrics(
        user_id="audio-user",
        voice_sample=b"trusted-voice",
        consent=True,
    ))

    is_synthetic, confidence = asyncio.run(engine.detect_deepfake_audio(
        audio_data=b"other-voice",
        claimed_user_id="audio-user",
    ))

    assert is_synthetic is True
    assert 0 <= confidence <= 1


def test_analyze_social_content_detects_hidden_advertisement():
    engine = CARLCognitiveEngine()

    result = asyncio.run(engine.analyze_social_content(
        content="Kedvezmény! Linkbio, használd a kód: CARL10 kupont",
        content_type=ContentType.TEXT,
    ))

    assert "REJTETT_REKLAM" in result.flags
    assert result.threat_level == ThreatLevel.SUSPICIOUS
    assert result.is_synthetic is False


def test_analyze_social_content_returns_safe_for_clean_text():
    engine = CARLCognitiveEngine()

    result = asyncio.run(engine.analyze_social_content(
        content="Ez egy tájékoztató jellegű közlemény a rendszer állapotáról.",
        content_type=ContentType.TEXT,
    ))

    assert result.flags == []
    assert result.threat_level == ThreatLevel.SAFE
    assert result.is_synthetic is False
    assert result.details["gdpr_compliant"] is True
