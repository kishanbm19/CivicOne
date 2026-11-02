"""AI complaint classification with a review-only fallback when AI is unavailable."""
import json
import logging

from pydantic import BaseModel, Field

from ..core.config import settings

logger = logging.getLogger("civicone.ai")

RULES = [
    ("transport", "bus_delay", ["bus delay", "late bus", "bus late", "not on time"]),
    ("transport", "bus_stop_damage", ["bus stop", "shelter"]),
    ("municipal", "garbage", ["garbage", "waste", "trash", "bin"]),
    ("municipal", "pothole", ["pothole", "road damage", "damaged road"]),
    ("municipal", "streetlight", ["streetlight", "street light", "lamp"]),
    ("municipal", "water_supply", ["water supply", "no water", "pipeline"]),
    ("municipal", "drainage", ["drain", "sewage", "blockage"]),
    ("healthcare", "facility_cleanliness", ["clean", "hygiene", "dirty"]),
    ("healthcare", "equipment", ["equipment", "x-ray", "machine"]),
]
CRITICAL = ["injury", "accident", "electrocut", "exposed wire", "collapse", "fire"]


def fallback_classify(
    title: str,
    description: str,
    domain: str,
    supported_categories: list[str] | None = None,
) -> dict:
    """Return a known rule-based category as a review hint, not an AI result."""
    text = f"{title} {description}".lower()
    priority = "critical" if any(keyword in text for keyword in CRITICAL) else "medium"
    for rule_domain, category, keywords in RULES:
        if (
            rule_domain == domain
            and (supported_categories is None or category in supported_categories)
            and any(keyword in text for keyword in keywords)
        ):
            return {"domain": domain, "category": category, "priority": priority}
    general_category = (
        "general"
        if supported_categories is None or "general" in supported_categories
        else (supported_categories[0] if supported_categories else "general")
    )
    return {"domain": domain, "category": general_category, "priority": priority}


class AIClassificationOutput(BaseModel):
    domain: str = Field(description="Selected service domain")
    category: str = Field(description="Exact supported department category key")
    priority: str = Field(pattern="^(low|medium|high|critical)$")
    explanation: str = Field(description="Brief explanation of reasoning")
    confidence: float = Field(ge=0.0, le=1.0)


def classify_complaint(
    title: str,
    description: str,
    selected_domain: str,
    supported_categories: list[str] | None = None,
) -> dict:
    """Classify within the selected organization's supported department categories."""
    safe_title = title.strip()[:200]
    safe_desc = description.strip()[:1000]
    categories = (
        supported_categories
        if supported_categories is not None
        else [
            category
            for rule_domain, category, _ in RULES
            if rule_domain == selected_domain
        ]
    )

    def review_fallback(reason: str, source: str = "fallback") -> dict:
        fallback = fallback_classify(
            safe_title, safe_desc, selected_domain, categories
        )
        return {
            **fallback,
            "explanation": "Automated classification is awaiting staff review.",
            "confidence": 0.0,
            "confident": False,
            "source": source,
            "review_reason": reason,
        }

    if not settings.OPENAI_API_KEY or not settings.OPENAI_API_KEY.strip():
        logger.info(
            "OpenAI API key not configured; complaint classification requires staff review."
        )
        return review_fallback("AI provider is not configured.")

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=6.0)
        system_prompt = (
            "You are an AI civic complaint classifier for CivicOne. "
            "Return JSON with domain, category, priority, explanation, and confidence. "
            f"category must exactly match one department category key from: {', '.join(categories)}. "
            "Use the selected domain only. priority must be low, medium, high, or critical. "
            "confidence must be a number from 0.0 to 1.0."
        )
        user_prompt = (
            f"Selected organization domain: {selected_domain}. Do not classify outside it.\n"
            f"Title: {safe_title}\nDescription: {safe_desc}"
        )
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=250,
        )
        raw_json = response.choices[0].message.content
        validated = AIClassificationOutput(**json.loads(raw_json))
        category = validated.category.strip().lower()
        if validated.domain != selected_domain or category not in categories:
            logger.warning(
                "AI classification returned a category or domain outside the selected organization."
            )
            return review_fallback(
                "AI returned a classification outside the selected organization's supported categories.",
                source="invalid_response",
            )

        confident = (
            validated.confidence
            >= settings.AI_CLASSIFICATION_CONFIDENCE_THRESHOLD
        )
        return {
            "domain": selected_domain,
            "category": category,
            "priority": validated.priority,
            "explanation": validated.explanation,
            "confidence": validated.confidence,
            "confident": confident,
            "source": "openai",
            "review_reason": (
                None
                if confident
                else f"AI confidence {validated.confidence:.2f} is below the required threshold."
            ),
        }
    except Exception:
        logger.warning("AI classification failed or timed out; complaint requires staff review.")
        return review_fallback("AI provider failed or returned an unreadable response.")
