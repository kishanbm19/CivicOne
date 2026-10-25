import json
import logging
from pydantic import BaseModel, Field
from ..core.config import settings
from .fallback import classify as fallback_classify

logger = logging.getLogger("civicone.ai")

class AIClassificationOutput(BaseModel):
    domain: str = Field(description="Recommended service domain: transport, municipal, or healthcare")
    category: str = Field(description="Specific category key")
    priority: str = Field(description="Priority: low, medium, high, or critical")
    explanation: str = Field(description="Brief explanation of reasoning")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")

def classify_complaint(title: str, description: str, selected_domain: str) -> dict:
    """Classifies a complaint using OpenAI if configured, or deterministic fallback rules."""
    # Sanitize and truncate inputs for privacy and cost control
    safe_title = title.strip()[:200]
    safe_desc = description.strip()[:1000]

    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.strip() == "":
        logger.info("OpenAI API key not configured. Using deterministic fallback classifier.")
        fb = fallback_classify(safe_title, safe_desc, selected_domain)
        return {
            "domain": fb["domain"],
            "category": fb["category"],
            "priority": fb["priority"],
            "explanation": f"Automated keyword rule match for {fb['category'].replace('_', ' ')}",
            "confidence": 0.85 if fb["confident"] else 0.40,
            "confident": fb["confident"],
            "source": "fallback"
        }

    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=6.0)

        system_prompt = (
            "You are an AI civic complaint classifier for CivicOne. "
            "Analyze the complaint and return JSON with: "
            "domain ('transport', 'municipal', 'healthcare'), "
            "category (e.g., 'bus_delay', 'bus_stop_damage', 'garbage', 'pothole', 'streetlight', 'water_supply', 'drainage', 'facility_cleanliness', 'equipment', 'general'), "
            "priority ('low', 'medium', 'high', 'critical'), "
            "explanation (short 1-2 sentence rationale), and "
            "confidence (number from 0.0 to 1.0)."
        )
        user_prompt = f"Domain selected by user: {selected_domain}\nTitle: {safe_title}\nDescription: {safe_desc}"

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=250
        )
        raw_json = response.choices[0].message.content
        data = json.loads(raw_json)
        validated = AIClassificationOutput(**data)

        # Validate domain matches supported list
        domain = validated.domain if validated.domain in ("transport", "municipal", "healthcare") else selected_domain
        confident = validated.confidence >= 0.70

        return {
            "domain": domain,
            "category": validated.category,
            "priority": validated.priority if validated.priority in ("low", "medium", "high", "critical") else "medium",
            "explanation": validated.explanation,
            "confidence": validated.confidence,
            "confident": confident,
            "source": "openai"
        }
    except Exception as e:
        logger.warning(f"AI classification failed or timed out: {e}. Falling back to deterministic rules.")
        fb = fallback_classify(safe_title, safe_desc, selected_domain)
        return {
            "domain": fb["domain"],
            "category": fb["category"],
            "priority": fb["priority"],
            "explanation": f"Fallback rule match: {fb['category']}",
            "confidence": 0.80 if fb["confident"] else 0.40,
            "confident": fb["confident"],
            "source": "fallback"
        }
