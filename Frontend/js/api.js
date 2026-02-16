// Frontend/js/api.js

// ✅ ใช้ URL เต็มเพื่อให้ชัวร์ว่ายิงเข้า Backend ถูกพอร์ต (ปรับได้ถ้าพอร์ตเปลี่ยน)
const API_BASE = "http://localhost:3000/api";

// --- Helper: จัดการ Session ID ---
function getSessionId() {
  let sid = localStorage.getItem("pet_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("pet_session_id", sid);
  }
  return sid;
}

// --- 1. Get State (ดึงค่าสถานะล่าสุด) ---
export async function getPetState() {
  try {
    const res = await fetch(`${API_BASE}/pet/state`);
    if (!res.ok) throw new Error("Network response was not ok");
    return await res.json();
  } catch (err) {
    console.error("❌ Error fetching state:", err);
    return null;
  }
}

// --- 2. Actions (การกระทำต่างๆ) ---
export async function feedPet() {
  try {
    const res = await fetch(`${API_BASE}/pet/feed`, { method: "POST" });
    return await res.json();
  } catch (err) {
    console.error("Feed error:", err);
    return null;
  }
}

export async function playPet() {
  try {
    const res = await fetch(`${API_BASE}/pet/play`, { method: "POST" });
    return await res.json();
  } catch (err) {
    console.error("Play error:", err);
    return null;
  }
}

export async function clickPet() {
  try {
    // หมายเหตุ: เช็ค Backend routes ว่าใช้ /pet/click หรือ /pet/action
    const res = await fetch(`${API_BASE}/pet/click`, { method: "POST" });
    return await res.json();
  } catch (err) {
    console.error("Click error:", err);
    return null;
  }
}

// --- 3. Chat (ส่งข้อความ) ---
export async function sendChat(text) {
  try {
    // ❌ ของเดิม (ผิด): fetch(`${API_BASE}/chat`, ...
    
    // ✅ แก้เป็น (ถูก): ต้องมี /pet คั่นกลาง
    const res = await fetch(`${API_BASE}/pet/chat`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        text, 
        sessionId: getSessionId() 
      }),
    });
    
    if (!res.ok) throw new Error(`Server error: ${res.status}`); // เช็ค error เพิ่ม
    
    return await res.json();
  } catch (err) {
    console.error("Chat error:", err);
    return null;
  }
}