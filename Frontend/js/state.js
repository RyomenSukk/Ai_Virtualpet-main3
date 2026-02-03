// ไฟล์นี้ต้องอยู่ที่: Frontend/js/state.js

// Frontend state - sync กับ backend
export let petState = {
    action: "idle",
    emotion: "neutral",
    hunger: 50,
    happiness: 50,
    bond: 0
};

// Update state from backend response
export function updatePetState(newState) {
    petState = {
        ...petState,
        ...newState
    };
}