// Frontend/main.js

import { initPet, renderPet } from "./js/pet.js";
import { updatePetState } from "./js/state.js";
import { feedPet, playPet } from "./js/api.js";
import "./js/chat.js";

/* =========================
   INIT APP
========================= */
async function init() {
  await initPet();
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

        if (result && result.success) {
          updatePetState(result.pet);
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
        const result = await playPet(); // ✅ ชื่อให้ตรงกับ api.js

        if (result && result.success) {
          updatePetState(result.pet);
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

  setTimeout(() => {
    msgEl.style.opacity = "0";
  }, 3000);
}

// Start app
init();
