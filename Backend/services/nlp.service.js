// ไฟล์นี้ต้องอยู่ที่: Backend/services/nlp.service.js
import "dotenv/config";

const NLP_API_URL = "http://localhost:5000/api/nlp/analyze";

// เรียก Python NLP API
export async function analyzeText(text) {
    try {
        const response = await fetch(NLP_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) {
            throw new Error(`NLP API error: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error calling NLP API:", error);
        // Fallback to simple rule-based
        return analyzeIntentFallback(text);
    }
}

// แปลง intent เป็น action
export function intentToAction(intent) {
    const mapping = {
        "PLAY": "play",
        "FEED": "eat",
        "SLEEP": "sleep",
        "PET": "happy",
        "COMFORT": "happy"
    };
    
    return mapping[intent] || "idle";
}

// Fallback: Simple rule-based (เหมือนเดิม)
function analyzeIntentFallback(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("หิว") || lowerText.includes("กิน") || lowerText.includes("อาหาร")) {
        return { intent: "FEED", sentiment: "NEUTRAL", method: "FALLBACK" };
    }
    
    if (lowerText.includes("เล่น") || lowerText.includes("สนุก")) {
        return { intent: "PLAY", sentiment: "POSITIVE", method: "FALLBACK" };
    }
    
    if (lowerText.includes("เหงา") || lowerText.includes("เศร้า")) {
        return { intent: "COMFORT", sentiment: "NEGATIVE", method: "FALLBACK" };
    }
    
    if (lowerText.includes("ง่วง") || lowerText.includes("นอน")) {
        return { intent: "SLEEP", sentiment: "NEUTRAL", method: "FALLBACK" };
    }
    
    if (lowerText.includes("รัก") || lowerText.includes("ลูบ")) {
        return { intent: "PET", sentiment: "POSITIVE", method: "FALLBACK" };
    }
    
    return { intent: "IDLE", sentiment: "NEUTRAL", method: "FALLBACK" };
}