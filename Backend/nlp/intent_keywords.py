# intent_keywords.py

KEYWORD_INTENTS = {
    "PLAY": ["เล่น", "สนุก", "วิ่ง", "กระโดด"],
    "FEED": ["หิว", "กิน", "อาหาร", "ข้าว"],
    "SLEEP": ["ง่วง", "นอน", "พัก"],
    "PET": ["ลูบ", "กอด", "น่ารัก"],
    "COMFORT": ["เหงา", "เศร้า", "เครียด", "ท้อ"]
}

def extract_intent_by_keyword(text: str):
    """
    Return:
        (intent, keyword) หรือ (None, None)
    """
    for intent, keywords in KEYWORD_INTENTS.items():
        for kw in keywords:
            if kw in text:
                return intent, kw

    return None, None
