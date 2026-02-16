// Backend/services/pet.service.js
import "dotenv/config";
import { analyzeText, intentToAction } from "./nlp.service.js";
import { generateCatReply } from "./openai.service.js";
import { saveMessage, getRecentMessages, loadPetStateDB, savePetStateDB } from "../db.js";

// 🔧 ปรับค่าตรงนี้ได้ตามใจ
const DECAY_RATE_PER_HOUR = {
  hunger: 10,      // ลด 10% ต่อชั่วโมง
  happiness: 5,    // ลด 5% ต่อชั่วโมง
  bond: 2          // ลด 2% ต่อชั่วโมง
};

/** ---------------------------
 * Pet State (In-Memory + DB Sync)
 * --------------------------- */
let petState = {
  hunger: 100,
  happiness: 80,
  bond: 50,
  action: "idle",
  emotion: "neutral",
  lastUpdatedAt: Date.now()
};

async function initPetSystem() {
  try {
    const saved = await loadPetStateDB();
    if (saved) {
      console.log("📥 Loaded pet state from database.");
      petState = saved;
      applyTimeDecay();
    } else {
      console.log("🆕 New pet created. Saving initial state...");
      await savePetStateDB(petState);
    }
  } catch (err) {
    console.error("❌ Error initializing pet state:", err);
  }
}

initPetSystem();

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function applyTimeDecay() {
  const now = Date.now();
  const elapsedMs = now - petState.lastUpdatedAt;

  if (!petState.lastUpdatedAt || elapsedMs <= 0) {
    petState.lastUpdatedAt = now;
    return;
  }

  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  if (elapsedHours < 0.001) return;

  petState.hunger = clamp(petState.hunger - DECAY_RATE_PER_HOUR.hunger * elapsedHours);
  petState.happiness = clamp(petState.happiness - DECAY_RATE_PER_HOUR.happiness * elapsedHours);
  petState.bond = clamp(petState.bond - DECAY_RATE_PER_HOUR.bond * elapsedHours);

  petState.lastUpdatedAt = now;
  // บันทึกแบบ Fire & Forget (ไม่ต้องรอ)
  savePetStateDB(petState).catch(console.error);
}

function updateState(patch) {
  if (!patch) return;
  if (typeof patch.hunger === "number") petState.hunger = clamp(patch.hunger);
  if (typeof patch.happiness === "number") petState.happiness = clamp(patch.happiness);
  if (typeof patch.bond === "number") petState.bond = clamp(patch.bond);
  if (typeof patch.action === "string") petState.action = patch.action;
  if (typeof patch.emotion === "string") petState.emotion = patch.emotion;
  
  savePetStateDB(petState).catch(console.error);
}

function autoResetAction(ms = 2000) {
  setTimeout(() => {
    petState.action = "idle";
    savePetStateDB(petState).catch(console.error);
  }, ms);
}

export function getState() {
  applyTimeDecay();
  return { ...petState };
}

/** ---------------------------
 * Simple actions
 * --------------------------- */
export function handleClick() {
  applyTimeDecay();
  updateState({
    action: "happy",
    happiness: petState.happiness + 2,
    bond: petState.bond + 1,
    emotion: "happy"
  });
  autoResetAction(1200);
  return { pet: getState(), message: "เมี๊ยว~ ลูบหัวแล้วฟินเลย 😺" };
}

export function handleFeed() {
  applyTimeDecay();
  updateState({
    action: "eat",
    hunger: 100,
    happiness: petState.happiness + 5,
    emotion: "happy"
  });
  autoResetAction(1500);
  return { pet: getState(), message: "ง่ำๆ อิ่มแล้วเมี๊ยว~ 😺" };
}

export function handlePlay() {
  applyTimeDecay();
  updateState({
    action: "play",
    happiness: petState.happiness + 10,
    bond: petState.bond + 6,
    hunger: petState.hunger + 5,
    emotion: "playful"
  });
  autoResetAction(1800);
  return { pet: getState(), message: "มาเล่นกัน! โยนบอลมาเลยเมี๊ยว~ 🧶😺" };
}

/** ---------------------------
 * Chat Logic (Optimized for Speed 🚀)
 * --------------------------- */
function fallbackReply({ intent, sentiment }) {
  if (sentiment === "NEGATIVE" || intent === "sad") {
    return { reply: "เมี๊ยว… ไม่เป็นไรนะ เราอยู่ตรงนี้ด้วยเสมอ 🫶😿", action: "idle", emotion: "comforting" };
  }
  if (intent === "lonely") {
    return { reply: "เหงาหรอเมี๊ยว~ มาเล่นด้วยกันไหม หรืออยากเล่าอะไรให้ฟัง 😺", action: "play", emotion: "playful" };
  }
  return { reply: "เมี๊ยว~ แล้วต่อจากนี้อยากทำอะไรดี 😸", action: "idle", emotion: "neutral" };
}

export async function handleChat(sessionId, text) {
  applyTimeDecay();

  // 1. Parallel Execution: เริ่ม NLP + ดึง History พร้อมกันเพื่อประหยัดเวลา
  const nlpPromise = analyzeText(text).catch(e => ({ intent: "unknown", sentiment: "NEUTRAL" }));
  const historyPromise = getRecentMessages(sessionId, 6).catch(e => []); // 🚀 ลด History เหลือ 6

  const [analysis, history] = await Promise.all([nlpPromise, historyPromise]);
  const { intent, sentiment } = analysis;

  // 2. Generate Reply (AI)
  let ai;
  try {
    ai = await generateCatReply({ userText: text, history, analysis, petState });
  } catch (e) {
    console.error("AI Error:", e);
    ai = fallbackReply({ intent, sentiment });
  }

  // 3. Logic เปลี่ยนค่าพลัง (ไม่ต้องรอ DB)
  const action = ai.action || intentToAction(intent);
  let happinessChange = 0, bondChange = 0, hungerChange = 0;

  if (action === "play") { happinessChange += 12; bondChange += 8; hungerChange += 5; }
  if (action === "eat")  { happinessChange += 6;  hungerChange -= 20; }
  if (action === "happy"){ happinessChange += 8;  bondChange += 4; }
  if (action === "sleep"){ happinessChange += 3;  hungerChange += 1; }

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

  // 4. Fire & Forget Saving 🚀 (บันทึกลง DB ทีหลัง ไม่รอ await)
  Promise.all([
    saveMessage({ sessionId, role: "user", text, intent, sentiment, petState: getState() }),
    saveMessage({ sessionId, role: "assistant", text: ai.reply, intent, sentiment, petState: getState() })
  ]).catch(e => console.error("DB Background Save Error:", e));

  // 5. ส่งคำตอบทันที!
  return {
    pet: getState(),
    message: ai.reply,
    analysis
  };
}