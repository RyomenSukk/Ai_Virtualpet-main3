// Frontend/js/main.js

// ✅ แก้ไข Path และชื่อฟังก์ชันให้ตรงกับไฟล์ที่อยู่ในโฟลเดอร์เดียวกัน
import { initPet, renderPet } from "./pet.js";
import { updateLocalState } from "./state.js"; 
import { feedPet, playPet } from "./api.js";
import { initChat } from "./chat.js";

/* =========================
   INIT APP
========================= */
async function init() {
  console.log("🚀 App starting...");
  
  // 1. เริ่มระบบสัตว์เลี้ยง (โหลด PIXI และดึงข้อมูลสถานะล่าสุด)
  await initPet();

  // 2. เริ่มระบบแชท
  if (typeof initChat === "function") {
    initChat();
  }

  // 3. ตั้งค่าปุ่มกด
  setupButtons();
}

/* =========================
   SETUP BUTTONS
========================= */
function setupButtons() {
  const feedButton = document.getElementById("feed-button");
  const playButton = document.getElementById("play-button");

  if (feedButton) {
    feedButton.addEventListener("click", async () => {
      try {
        const result = await feedPet();

        // ✅ แก้ไข: เช็คที่ result.pet เพราะ Backend เราส่ง object pet มาตรงๆ
        if (result && result.pet) {
          updateLocalState(result.pet); // เปลี่ยนมาใช้ชื่อที่ถูกต้อง
          renderPet();
          if (result.message) showMessage(result.message);
        } else {
          showMessage("เมี๊ยว... ให้อาหารไม่สำเร็จ 😿");
        }
      } catch (err) {
        console.error(err);
        showMessage("เมี๊ยว... มีข้อผิดพลาด 😿");
      }
    });
  }

  if (playButton) {
    playButton.addEventListener("click", async () => {
      try {
        const result = await playPet();

        if (result && result.pet) {
          updateLocalState(result.pet);
          renderPet();
          if (result.message) showMessage(result.message);
        } else {
          showMessage("เมี๊ยว... เล่นไม่สำเร็จ 😿");
        }
      } catch (err) {
        console.error(err);
        showMessage("เมี๊ยว... มีข้อผิดพลาด 😿");
      }
    });
  }
}

/* =========================
   SHOW MESSAGE
========================= */
function showMessage(text) {
  const msgEl = document.getElementById("pet-message");
  if (!msgEl) return;

  msgEl.textContent = text;
  msgEl.style.opacity = "1";

  // ล้าง Timeout เก่าถ้ามี
  if (msgEl.timeoutId) clearTimeout(msgEl.timeoutId);

  msgEl.timeoutId = setTimeout(() => {
    msgEl.style.opacity = "0";
  }, 3000);
}

// ✅ ใช้ Event Listener เพื่อให้มั่นใจว่า HTML โหลดเสร็จก่อนเริ่มรัน
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}