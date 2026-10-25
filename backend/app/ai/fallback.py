"""Deterministic keyword classifier used when AI is unavailable or uncertain."""
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

def classify(title: str, description: str, domain: str) -> dict:
    text = f"{title} {description}".lower()
    priority = "critical" if any(k in text for k in CRITICAL) else "medium"
    for d, cat, kws in RULES:
        if d == domain and any(k in text for k in kws):
            return {"domain": d, "category": cat, "priority": priority, "confident": True, "source": "fallback"}
    return {"domain": domain, "category": "general", "priority": priority, "confident": False, "source": "fallback"}
