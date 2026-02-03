// Backend/services/openai.service.js  (ยังใช้ชื่อไฟล์เดิมได้ เพื่อลดการแก้)
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

let client = null;

function getClient() {
  if (client) return client;

  // ตาม docs: ใช้ GEMINI_API_KEY หรือ GOOGLE_API_KEY ได้
  // (ถ้าใช้ทั้งคู่ GOOGLE_API_KEY จะมี priority ในบาง lib)
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY not set, using fallback replies");
    return null;
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

// helper: แปลง history จาก DB เป็นข้อความรวม (Gemini SDK example รับ string ได้ง่าย)
// ถ้าคุณอยากละเอียดขึ้นค่อยปรับเป็น contents แบบ role/parts ทีหลัง
function formatHistory(history = []) {
  return history
    .slice(-12)
    .map(m => `${m.role === "assistant" ? "CAT" : "USER"}: ${m.text}`)
    .join("\n");
}

export async function generateCatReply({ userText, history, analysis, petState }) {
  const ai = getClient();
  if (!ai) throw new Error("GEMINI_DISABLED");

  const intent = analysis?.intent || "unknown";
  const sentiment = analysis?.sentiment || "NEUTRAL";

  const system = `
คุณคือ “น้องแมว” Virtual Pet พูดไทย เป็นเพื่อนสนิท อบอุ่น ขี้เล่น
กติกา:
- ถ้าผู้ใช้เศร้าหรือเครียด -> ปลอบใจ ถามไถ่สั้นๆ
- ถ้าผู้ใช้เหงา -> ชวนเล่น/ชวนทำกิจกรรม
- ตอบสั้น กระชับ เป็นบทสนทนา (1-3 ประโยค)
- ห้ามเป็นบทความยาว
เอาท์พุตให้ตอบตามรูปแบบนี้เท่านั้น:
REPLY: <ข้อความน้องแมว>
ACTION: <idle|play|eat|happy|sleep>
EMOTION: <neutral|happy|playful|comforting|sad>
  `.trim();

  const context = `
STATE: hunger=${petState?.hunger}, happiness=${petState?.happiness}, bond=${petState?.bond}, action=${petState?.action}, emotion=${petState?.emotion}
NLP: intent=${intent}, sentiment=${sentiment}
HISTORY:
${formatHistory(history)}
USER: ${userText}
  `.trim();

  // Gemini quickstart ตัวอย่างใช้ ai.models.generateContent({model, contents:"..."}) :contentReference[oaicite:4]{index=4}
  const resp = await ai.models.generateContent({
    model: MODEL,
    contents: `${system}\n\n${context}`,
  });

  const text = (resp?.text || "").trim();
  if (!text) {
    return { reply: "เมี๊ยว~ เราอยู่ตรงนี้นะ 😺", action: "idle", emotion: "neutral" };
  }

  // parse ง่าย ๆ จากฟอร์แมตที่เราบังคับ
  const reply = (text.match(/REPLY:\s*(.*)/i)?.[1] || "").trim();
  const action = (text.match(/ACTION:\s*(.*)/i)?.[1] || "idle").trim();
  const emotion = (text.match(/EMOTION:\s*(.*)/i)?.[1] || "neutral").trim();

  return {
    reply: reply || text, // ถ้า parse ไม่ได้ ให้ใช้ทั้งข้อความ
    action,
    emotion,
  };
}
