// Frontend/js/api.js
const API_URL = "http://localhost:3000/api/pet";

// ---------- SESSION ----------
function getSessionId() {
  let sid = localStorage.getItem("pet_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("pet_session_id", sid);
  }
  return sid;
}

// ---------- GET STATE ----------
export async function getPetState() {
  const res = await fetch(`${API_URL}/state`);
  return await res.json();
}

// ---------- CLICK ----------
export async function clickPet() {
  const res = await fetch(`${API_URL}/click`, { method: "POST" });
  return await res.json();
}

// ---------- FEED ----------
export async function feedPet() {
  const res = await fetch(`${API_URL}/feed`, { method: "POST" });
  return await res.json();
}

// ---------- PLAY ----------
export async function playPet() {
  const res = await fetch(`${API_URL}/play`, { method: "POST" });
  return await res.json();
}

// ---------- CHAT ----------
export async function sendChat(text) {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sessionId: getSessionId() }),
  });
  return await res.json();
}
