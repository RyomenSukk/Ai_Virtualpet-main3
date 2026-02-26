// Frontend/js/pet.js

// ✅ Import แบบ Relative Path
import { petState, updateLocalState } from "./state.js";
import { getPetState, clickPet } from "./api.js";

/* =========================
   ⚙️ CONFIG: ตั้งค่า Animation แมว
========================= */
const ANIMATION_CONFIG = {
    idle:  { width: 32, height: 32, frames: 10, speed: 0.1,  posX: 0.5, posY: 0.7 },
    play:  { width: 32, height: 32, frames: 4,  speed: 0.15, posX: 0.5, posY: 0.7 },
    eat:   { width: 32, height: 32, frames: 15, speed: 0.1,  posX: 0.5, posY: 0.7 },
    happy: { width: 32, height: 32, frames: 8,  speed: 0.1,  posX: 0.5, posY: 0.7 },
    sleep: { width: 32, height: 32, frames: 4,  speed: 0.05, posX: 0.5, posY: 0.7 }
};

// ✅ CONFIG: ตั้งค่า Animation ของเล่น (ระบุจำนวนเฟรมตามที่คุณแจ้งมา)
const TOY_ANIMATION_CONFIG = {
    mouse:  { frames: 4, speed: 0.15 }, // Mouse-Sheet.png (4 frames)
    ball:   { frames: 5, speed: 0.15 }, // PinkBall-Sheet.png (5 frames)
    catToy: { frames: 6, speed: 0.2 }   // CatToy.png (6 frames)
};

const DISPLAY_SCALE = 4; 
const BASE_PATH = "assets/cat/"; 

/* =========================
   PIXI SETUP
========================= */
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

export const app = new PIXI.Application({
    width: 600,
    height: 400,
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});

const petArea = document.getElementById("pet-area");
if (petArea) {
    petArea.appendChild(app.view);
}

let petSprite;
let currentAction = "";
const animations = {}; 

// ✅ ตัวแปรเก็บ Animated Sprite ของเล่น
let currentToySprite = null;
const toyAnimations = {};

/* =========================
   CORE LOGIC
========================= */

export async function initPet() {
    console.log("🚀 Initializing Pet...");
    await loadAssets();
    await syncData(); 
    startSyncLoop();  
}

async function loadAssets() {
    const assetsToLoad = [
        // แมว
        { alias: 'idle', src: `${BASE_PATH}idle.png` },
        { alias: 'play', src: `${BASE_PATH}play.png` },
        { alias: 'eat',  src: `${BASE_PATH}eat.png` },
        { alias: 'happy',src: `${BASE_PATH}happy.png` },
        { alias: 'sleep',src: `${BASE_PATH}sleep.png` },
        // ✅ ของเล่นแบบ Sprite Sheet (.png)
        { alias: 'toy_mouse',  src: 'assets/Mouse-Sheet.png' },
        { alias: 'toy_ball',   src: 'assets/PinkBall-Sheet.png' },
        { alias: 'toy_catToy', src: 'assets/CatToy.png' }
    ];

    try {
        const textures = await PIXI.Assets.load(assetsToLoad);

        // ตัดเฟรมแมว
        for (const key in ANIMATION_CONFIG) {
            if (textures[key]) {
                animations[key] = createAnimation(textures[key], ANIMATION_CONFIG[key]);
            }
        }

        // ✅ ตัดเฟรมของเล่น
        if (textures['toy_mouse'])  toyAnimations.mouse = createToyAnimation(textures['toy_mouse'], TOY_ANIMATION_CONFIG.mouse);
        if (textures['toy_ball'])   toyAnimations.ball = createToyAnimation(textures['toy_ball'], TOY_ANIMATION_CONFIG.ball);
        if (textures['toy_catToy']) toyAnimations.catToy = createToyAnimation(textures['toy_catToy'], TOY_ANIMATION_CONFIG.catToy);

        console.log("✅ Assets loaded!");
    } catch (e) {
        console.error("❌ Failed to load assets:", e);
    }
}

// ฟังก์ชันตัดเฟรมแมว (เดิม)
function createAnimation(texture, config) {
    const frames = [];
    const { width, height } = config;
    
    for (let i = 0; i < config.frames; i++) {
        if (i * width < texture.baseTexture.width) {
            const rect = new PIXI.Rectangle(i * width, 0, width, height);
            const frame = new PIXI.Texture(texture.baseTexture, rect);
            frames.push(frame);
        }
    }

    if (frames.length === 0) frames.push(texture);

    const anim = new PIXI.AnimatedSprite(frames);
    anim.animationSpeed = config.speed;
    anim.scale.set(DISPLAY_SCALE);
    anim.anchor.set(0.5, 1); 
    
    anim.eventMode = 'static';
    anim.cursor = 'pointer';
    anim.on('pointerdown', handlePetClick);

    return anim;
}

// ✅ ฟังก์ชันใหม่: ตัดเฟรมของเล่นอัตโนมัติ (คำนวณความกว้างเฟรมให้เอง)
function createToyAnimation(texture, config) {
    const frames = [];
    // เอาความกว้างภาพเต็ม หารด้วยจำนวนเฟรม
    const frameWidth = texture.width / config.frames;
    const frameHeight = texture.height;
    
    for (let i = 0; i < config.frames; i++) {
        if (i * frameWidth < texture.width) {
            const rect = new PIXI.Rectangle(i * frameWidth, 0, frameWidth, frameHeight);
            const frame = new PIXI.Texture(texture.baseTexture, rect);
            frames.push(frame);
        }
    }

    const anim = new PIXI.AnimatedSprite(frames);
    anim.animationSpeed = config.speed;
    return anim;
}

// ✅ แสดงของเล่นในฉาก พร้อมเล่นอนิเมชัน
export function showToyInScene(toyId) {
    hideToyFromScene(); // ลบของเก่าก่อน

    currentToySprite = toyAnimations[toyId];
    if (!currentToySprite) return;

    currentToySprite.anchor.set(0.5);
    currentToySprite.scale.set(3); // ปรับขนาดของเล่นให้ใหญ่ขึ้นนิดนึง (เปลี่ยนตัวเลขได้)

    // จัดตำแหน่งของเล่นให้อยู่ข้างๆ แมว
    if (toyId === 'catToy') {
        currentToySprite.x = app.screen.width * 0.65;
        currentToySprite.y = app.screen.height * 0.55;
        currentToySprite.rotation = -0.3; // เอียงไม้ตกแมวหน่อย
    } else {
        currentToySprite.x = app.screen.width * 0.65;
        currentToySprite.y = app.screen.height * 0.7; // วางบนพื้น
        currentToySprite.rotation = 0;
    }

    app.stage.addChild(currentToySprite);
    currentToySprite.play(); // 🎬 เริ่มขยับดุ๊กดิ๊ก!
}

// ✅ ซ่อนของเล่น และหยุดอนิเมชัน
export function hideToyFromScene() {
    if (currentToySprite) {
        app.stage.removeChild(currentToySprite);
        currentToySprite.stop(); // หยุดขยับเพื่อประหยัดทรัพยากร
        currentToySprite = null; // ไม่ต้อง destroy เพราะเดี๋ยวเรียกซ้ำ
    }
}

export function renderPet() {
    const action = petState.action || 'idle';

    if (currentAction === action && petSprite) {
        updateStatsUI(); 
        return;
    }

    // ✅ ถ้าไม่ได้อยู่ในท่าเล่น (play) ให้ซ่อนของเล่นทิ้งเลย
    if (action !== 'play') {
        hideToyFromScene();
    }

    if (petSprite) {
        app.stage.removeChild(petSprite);
        petSprite.stop();
    }

    petSprite = animations[action] || animations['idle'];
    
    if (petSprite) {
        currentAction = action;
        const config = ANIMATION_CONFIG[action] || ANIMATION_CONFIG.idle;

        petSprite.x = app.screen.width * config.posX;
        petSprite.y = app.screen.height * config.posY;

        app.stage.addChild(petSprite);
        petSprite.play();
    }
    
    updateStatsUI();
}

/* =========================
   SYNC & UPDATE
========================= */

async function syncData() {
    try {
        const res = await getPetState();
        const data = res.pet ? res.pet : res; 
        
        if (data) {
            updateLocalState(data);
            renderPet();
        }
    } catch (err) {
        console.error("Sync Error:", err);
    }
}

function startSyncLoop() {
    setInterval(async () => {
        const res = await getPetState();
        const data = res.pet ? res.pet : res;

        if (data) {
            updateLocalState(data);
            updateStatsUI();
        }
    }, 5000); 
}

function updateStatsUI() {
    const hungerBar = document.getElementById("hunger-bar");
    const happinessBar = document.getElementById("happiness-bar");
    const bondBar = document.getElementById("bond-bar");

    if (hungerBar) {
        const h = Math.min(100, Math.max(0, petState.hunger));
        hungerBar.style.width = `${h}%`;
    }
    if (happinessBar) {
        const hap = Math.min(100, Math.max(0, petState.happiness));
        happinessBar.style.width = `${hap}%`;
    }
    if (bondBar) {
        const b = Math.min(100, Math.max(0, petState.bond));
        bondBar.style.width = `${b}%`;
    }
}

async function handlePetClick() {
    if (petState.action === 'eat' || petState.action === 'play') return;

    if (petSprite) {
        petSprite.scale.set(DISPLAY_SCALE * 1.1);
        setTimeout(() => petSprite.scale.set(DISPLAY_SCALE), 100);
    }

    const res = await clickPet();
    const data = res.pet ? res.pet : res;

    if (data) {
        updateLocalState(data);
        renderPet();
        
        const msgEl = document.getElementById("pet-message");
        if (msgEl) {
            msgEl.textContent = res.message || "เมี๊ยว~";
            msgEl.style.opacity = 1;
            setTimeout(() => msgEl.style.opacity = 0, 2000);
        }
    }
}