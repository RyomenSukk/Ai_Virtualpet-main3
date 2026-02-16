// Frontend/js/state.js

// 1. ตัวแปรเก็บค่า (Export ออกไปให้คนอื่นใช้)
export let petState = {
  hunger: 100,
  happiness: 100,
  bond: 50,
  action: "idle",
  emotion: "neutral"
};

// 2. ฟังก์ชันอัปเดตค่า (ตัวนี้แหละที่ pet.js หาไม่เจอ)
export function updateLocalState(newState) {
  if (!newState) return;
  
  // รวมค่าเก่ากับค่าใหม่เข้าด้วยกัน
  petState = { ...petState, ...newState };
  
  // (Optional) ถ้าอยากให้ log ดูค่าทุกครั้งที่เปลี่ยน
  // console.log("State Updated:", petState);
}

// 3. ฟังก์ชันดึงค่า
export function getLocalState() {
  return petState;
}