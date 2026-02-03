// Backend/services/pet.service.js
import "dotenv/config";
import { analyzeText, intentToAction } from "./nlp.service.js";
import { generateCatReply } from "./openai.service.js"; // (ตอนนี้อาจเป็น Gemini แล้วก็ยังใช้ชื่อเดิมได้)
import { saveMessage, getRecentMessages } from "../db.js";

// 🔧 ปรับค่าตรงนี้ได้ตามใจ
// ตัวอย่าง: ให้อาหารเต็ม 100 ผ่านไป 2 ชม -> hunger ลดเหลือ 80 ถ้า hunger=10/ชม
const DECAY_RATE_PER_HOUR = {
  hunger: 10,      // ลด 10% ต่อชั่วโมง
  happiness: 5,    // ลด 5% ต่อชั่วโมง
  bond: 2          // ลด 2% ต่อชั่วโมง
};

/** ---------------------------
 *  Pet State (in-memory)
 *  --------------------------- */
const petState = {
  hunger: 100,
  happiness: 80,
  bond: 50,
  action: "idle",
  emotion: "neutral",
  lastUpdatedAt: Date.now()   // ⭐ สำคัญ
};

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function applyTimeDecay() {
  const now = Date.now();
  const elapsedMs = now - petState.lastUpdatedAt;

  // กันเคส clock เปลี่ยนย้อนกลับ หรือ lastUpdatedAt ยังไม่เซ็ต
  if (!petState.lastUpdatedAt || elapsedMs <= 0) {
    petState.lastUpdatedAt = now;
    return;
  }

  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  if (elapsedHours <= 0) return;

  petState.hunger = clamp(petState.hunger - DECAY_RATE_PER_HOUR.hunger * elapsedHours);
  petState.happiness = clamp(petState.happiness - DECAY_RATE_PER_HOUR.happiness * elapsedHours);
  petState.bond = clamp(petState.bond - DECAY_RATE_PER_HOUR.bond * elapsedHours);

  petState.lastUpdatedAt = now;
}

function updateState(patch) {
  if (!patch) return;

  if (typeof patch.hunger === "number") petState.hunger = clamp(patch.hunger);
  if (typeof patch.happiness === "number") petState.happiness = clamp(patch.happiness);
  if (typeof patch.bond === "number") petState.bond = clamp(patch.bond);

  if (typeof patch.action === "string") petState.action = patch.action;
  if (typeof patch.emotion === "string") petState.emotion = patch.emotion;
}

function autoResetAction(ms = 2000) {
  setTimeout(() => {
    petState.action = "idle";
  }, ms);
}

// ✅ route ต้องการตัวนี้
export function getState() {
  applyTimeDecay(); // ⭐ คำนวณย้อนหลังทุกครั้งก่อนส่ง state ออก
  return { ...petState };
}

/** ---------------------------
 *  Simple actions (existing routes)
 *  --------------------------- */
export function handleClick() {
  applyTimeDecay(); // ✅ decay ก่อนเพิ่มค่า

  updateState({
    action: "happy",
    happiness: petState.happiness + 2,
    bond: petState.bond + 1,
    emotion: "happy"
  });

  autoResetAction(1200);

  return {
    pet: getState(),
    message: "เมี๊ยว~ ลูบหัวแล้วฟินเลย 😺"
  };
}

export function handleFeed() {
  applyTimeDecay(); // ✅ decay ก่อนเติมเต็ม

  updateState({
    action: "eat",
    hunger: 100,
    happiness: petState.happiness + 5,
    emotion: "happy"
  });

  autoResetAction(1500);

  return {
    pet: getState(),
    message: "ง่ำๆ อิ่มแล้วเมี๊ยว~ 😺"
  };
}

export function handlePlay() {
  applyTimeDecay(); // ✅ decay ก่อนเพิ่มค่า

  updateState({
    action: "play",
    happiness: petState.happiness + 10,
    bond: petState.bond + 6,
    hunger: petState.hunger + 5,
    emotion: "playful"
  });

  autoResetAction(1800);

  return {
    pet: getState(),
    message: "มาเล่นกัน! โยนบอลมาเลยเมี๊ยว~ 🧶😺"
  };
}

/** ---------------------------
 *  Chat (NLP + LLM + SQLite)
 *  --------------------------- */
function fallbackReply({ intent, sentiment }) {
  if (sentiment === "NEGATIVE" || intent === "sad") {
    return {
      reply: "เมี๊ยว… ไม่เป็นไรนะ เราอยู่ตรงนี้ด้วยเสมอ 🫶😿",
      action: "idle",
      emotion: "comforting"
    };
  }
  if (intent === "lonely") {
    return {
      reply: "เหงาหรอเมี๊ยว~ มาเล่นด้วยกันไหม หรืออยากเล่าอะไรให้ฟัง 😺",
      action: "play",
      emotion: "playful"
    };
  }
  return {
    reply: "เมี๊ยว~ แล้วต่อจากนี้อยากทำอะไรดี 😸",
    action: "idle",
    emotion: "neutral"
  };
}

// ✅ route เรียกแบบ handleChat(sessionId, text)
export async function handleChat(sessionId, text) {
  applyTimeDecay(); // ✅ ทำให้ state เป็นปัจจุบันก่อนส่งให้ AI / ก่อน update

  // 1) NLP
  let analysis = { intent: "unknown", sentiment: "NEUTRAL" };
  try {
    analysis = await analyzeText(text);
  } catch (e) {
    console.error("NLP analyzeText failed:", e?.message || e);
  }

  const { intent, sentiment } = analysis;

  // 2) history จาก DB
  let history = [];
  try {
    history = await getRecentMessages(sessionId, 12);
  } catch (e) {
    console.error("DB getRecentMessages failed:", e?.message || e);
  }

  // 3) LLM generate reply
  let ai;
  try {
    ai = await generateCatReply({
      userText: text,
      history,
      analysis,
      petState // ✅ state หลัง decay แล้ว
    });
  } catch (e) {
    console.error("OpenAI generateCatReply failed:", e?.message || e);
    ai = fallbackReply({ intent, sentiment });
  }

  // 4) action mapping
  const action = ai.action || intentToAction(intent);

  // 5) update state ตาม action/emotion
  let happinessChange = 0, bondChange = 0, hungerChange = 0;

  if (action === "play") { happinessChange += 12; bondChange += 8; hungerChange += 5; }
  if (action === "eat")  { happinessChange += 6;  hungerChange -= 20; }
  if (action === "happy"){ happinessChange += 8;  bondChange += 4; }
  if (action === "sleep"){ happinessChange += 3;  hungerChange += 1; }

  // sentiment influence
  if (sentiment === "NEGATIVE") {
    bondChange += 4;
    if (!ai.emotion) ai.emotion = "comforting";
  } else if (sentiment === "POSITIVE") {
    happinessChange += 2;
    bondChange += 2;
  }

  updateState({
    action,
    happiness: petState.happiness + happinessChange,
    bond: petState.bond + bondChange,
    hunger: petState.hunger + hungerChange,
    emotion: ai.emotion || "neutral"
  });

  autoResetAction(2000);

  // 6) save to DB
  try {
    await saveMessage({
      sessionId,
      role: "user",
      text,
      intent,
      sentiment,
      petState: getState()
    });

    await saveMessage({
      sessionId,
      role: "assistant",
      text: ai.reply,
      intent,
      sentiment,
      petState: getState()
    });
  } catch (e) {
    console.error("DB saveMessage failed:", e?.message || e);
  }

  return {
    pet: getState(),
    message: ai.reply,
    analysis
  };
}
