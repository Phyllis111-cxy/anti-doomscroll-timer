// app.js
// Anti-Doomscroll Timer (Strong Mode) — pure frontend, GitHub Pages ready.

const appEl = document.getElementById("app");
const todayEl = document.getElementById("today");
const soundBtn = document.getElementById("soundBtn");

const modeEl = document.getElementById("mode");
const timeEl = document.getElementById("time");
const hintEl = document.getElementById("hint");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const distractBtn = document.getElementById("distractBtn");

const focusMinInput = document.getElementById("focusMin");
const breakMinInput = document.getElementById("breakMin");
const applyBtn = document.getElementById("applyBtn");

const pomCountEl = document.getElementById("pomCount");
const disCountEl = document.getElementById("disCount");
const notesEl = document.getElementById("notes");

const modal = document.getElementById("modal");
const noteInput = document.getElementById("noteInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const skipNoteBtn = document.getElementById("skipNoteBtn");

// ---------- Storage helpers ----------
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const STORAGE_PREFIX = "antiDoomscroll:";
function loadState() {
  const key = STORAGE_PREFIX + todayKey();
  const raw = localStorage.getItem(key);
  if (!raw) return { pomodoros: 0, distractions: 0, notes: [] };
  try { return JSON.parse(raw); } catch { return { pomodoros: 0, distractions: 0, notes: [] }; }
}
function saveState(s) {
  const key = STORAGE_PREFIX + todayKey();
  localStorage.setItem(key, JSON.stringify(s));
}

// ---------- App state ----------
let state = loadState();

let focusSeconds = Number(focusMinInput.value) * 60;
let breakSeconds = Number(breakMinInput.value) * 60;

let isRunning = false;
let isFocus = true; // focus or break
let remaining = focusSeconds;
let timerId = null;

let soundOn = true;

// ---------- UI ----------
todayEl.textContent = `Today: ${todayKey()}`;

function pad2(n) { return String(n).padStart(2, "0"); }
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function renderStats() {
  pomCountEl.textContent = state.pomodoros;
  disCountEl.textContent = state.distractions;

  if (!state.notes || state.notes.length === 0) {
    notesEl.textContent = "No notes yet. (That’s okay.)";
  } else {
    notesEl.textContent = state.notes
      .slice(-8)
      .map((n) => `• ${n}`)
      .join("\n");
  }
}

function setModeUI() {
  // Body class for visuals
  appEl.classList.toggle("focus-on", isFocus);
  appEl.classList.toggle("break-on", !isFocus);

  modeEl.textContent = isFocus ? "FOCUS" : "BREAK";
  hintEl.textContent = isFocus
    ? "No scrolling. One task. Right now."
    : "Break time. Breathe. Small reward is okay.";

  // In strong mode: show distract button only during focus
  distractBtn.disabled = !isFocus || !isRunning;
  distractBtn.style.opacity = (!isFocus || !isRunning) ? 0.45 : 1;
}

function renderTime() {
  timeEl.textContent = formatTime(remaining);
}

renderStats();
setModeUI();
renderTime();

// ---------- Sound ----------
function beep(freq = 880, duration = 140) {
  if (!soundOn) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = 0.06;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  setTimeout(() => {
    osc.stop();
    ctx.close();
  }, duration);
}

soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? "🔊 Sound: ON" : "🔇 Sound: OFF";
});

// ---------- Timer logic ----------
function stopTimer() {
  isRunning = false;
  if (timerId) clearInterval(timerId);
  timerId = null;
  setModeUI();
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  setModeUI();

  timerId = setInterval(() => {
    if (remaining > 0) {
      remaining -= 1;
      renderTime();

      // small warning when near end of focus
      if (isFocus && remaining === 10) beep(660, 90);
    } else {
      // switch mode
      if (isFocus) {
        // completed a pomodoro
        state.pomodoros += 1;
        saveState(state);
        renderStats();
        beep(1040, 200);
      } else {
        beep(520, 180);
      }

      isFocus = !isFocus;
      remaining = isFocus ? focusSeconds : breakSeconds;
      setModeUI();
      renderTime();
    }
  }, 1000);
}

startBtn.addEventListener("click", startTimer);

pauseBtn.addEventListener("click", () => {
  if (!isRunning) return;
  stopTimer();
});

resetBtn.addEventListener("click", () => {
  stopTimer();
  isFocus = true;
  remaining = focusSeconds;
  renderTime();
  setModeUI();
});

// ---------- Apply settings ----------
applyBtn.addEventListener("click", () => {
  const f = Math.max(1, Math.min(120, Number(focusMinInput.value || 25)));
  const b = Math.max(1, Math.min(60, Number(breakMinInput.value || 5)));
  focusMinInput.value = String(f);
  breakMinInput.value = String(b);

  focusSeconds = f * 60;
  breakSeconds = b * 60;

  // Do not auto reset running session; user chooses.
  hintEl.textContent = isFocus
    ? "Updated settings. Hit Reset to restart with new times."
    : "Updated settings. Next break/focus will use the new times.";
});

// ---------- Distraction flow ----------
function openModal() {
  modal.hidden = false;
  noteInput.value = "";
  noteInput.focus();
}
function closeModal() {
  modal.hidden = true;
}

distractBtn.addEventListener("click", () => {
  if (!isRunning || !isFocus) return;

  state.distractions += 1;
  saveState(state);
  renderStats();

  // Strong feedback
  beep(220, 120);
  openModal();
});

saveNoteBtn.addEventListener("click", () => {
  const txt = noteInput.value.trim();
  if (txt) {
    state.notes = state.notes || [];
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    state.notes.push(`${stamp} — ${txt}`);
    saveState(state);
    renderStats();
  }
  closeModal();
});

skipNoteBtn.addEventListener("click", () => {
  closeModal();
});

// Close modal on background click
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// Keyboard shortcuts (optional)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
  if (e.key === " " && modal.hidden) {
    e.preventDefault();
    if (isRunning) stopTimer(); else startTimer();
  }
});
