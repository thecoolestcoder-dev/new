// ----------------------
// CONFIGURE FIREBASE
// ----------------------
const firebaseConfig = {
 apiKey: "AIzaSyDFFIM-hOCR8BHL9W_ji8NJwLZH0OleAQ0",
  authDomain: "dvdlogothingy.firebaseapp.com",
  databaseURL: "https://dvdlogothingy-default-rtdb.firebaseio.com",
  projectId: "dvdlogothingy",
  storageBucket: "dvdlogothingy.firebasestorage.app",
  messagingSenderId: "203177996220",
  appId: "1:203177996220:web:5d95399673795bd9da05b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
Note: This option uses the modular JavaScript SDK, which provides reduced SDK size.

Learn more about Firebase for web: Get Started, Web SDK API Reference, Samples


};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ----------------------
// VARIABLES
// ----------------------
const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");

const ui = document.getElementById("ui");
const toggleUI = document.getElementById("toggleUI");
const createBtn = document.getElementById("create");
const joinBtn = document.getElementById("join");
const lockBtn = document.getElementById("lock");
const codeInput = document.getElementById("code");
const grid = document.getElementById("grid");

const id = crypto.randomUUID();

let room = null;
let locked = false;
let screenPos = { x: 0, y: 0 };
let screens = {};
let dvd = null;
let isHost = false;
let selectedCell = null;

// ----------------------
// CANVAS RESIZE
// ----------------------
function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

// ----------------------
// UI TOGGLE
// ----------------------
toggleUI.onclick = () => {
  ui.classList.toggle("hidden");
  toggleUI.textContent =
    ui.classList.contains("hidden") ? "Show Panel" : "Hide Panel";
};

// ----------------------
// GRID SETUP
// ----------------------
for (let y = -1; y <= 1; y++) {
  for (let x = -1; x <= 1; x++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.onclick = () => {
      if (locked) return;
      if (selectedCell) selectedCell.classList.remove("me");
      cell.classList.add("me");
      selectedCell = cell;
      screenPos = { x, y };
    };
    grid.appendChild(cell);
  }
}

// ----------------------
// ROOM MANAGEMENT
// ----------------------
createBtn.onclick = async () => {
  room = Math.random().toString(36).slice(2, 6).toUpperCase();
  codeInput.value = room;

  const roomRef = db.ref(`rooms/${room}`);
  await roomRef.set({
    host: id,
    dvd: { x: 100, y: 100, w: 120, h: 60, vx: 200, vy: 150 },
    screens: {}
  });

  listenRoom(room);
};

joinBtn.onclick = async () => {
  room = codeInput.value.toUpperCase();
  if (!room) return;

  const screenRef = db.ref(`rooms/${room}/screens/${id}`);
  await screenRef.set({
    x: screenPos.x * canvas.width,
    y: screenPos.y * canvas.height,
    w: canvas.width,
    h: canvas.height,
    locked: locked
  });

  listenRoom(room);
};

lockBtn.onclick = () => {
  locked = true;
  if (!room) return;
  db.ref(`rooms/${room}/screens/${id}`).update({ locked: true });
};

// ----------------------
// LISTEN TO ROOM CHANGES
// ----------------------
function listenRoom(room) {
  const roomRef = db.ref(`rooms/${room}`);
  roomRef.on("value", snapshot => {
    const data = snapshot.val();
    if (!data) return;

    screens = data.screens || {};
    dvd = data.dvd;
    isHost = data.host === id;

    // Host election if disconnected
    if (!isHost && !data.host) {
      const firstClient = Object.keys(screens)[0];
      if (firstClient) roomRef.update({ host: firstClient });
    }
  });
}

// ----------------------
// PHYSICS LOOP (HOST ONLY)
// ----------------------
function physicsLoop() {
  if (!isHost || !dvd) return;

  dvd.x += dvd.vx / 60;
  dvd.y += dvd.vy / 60;

  let hitX = true;
  let hitY = true;

  Object.values(screens).forEach(s => {
    if (
      dvd.x + dvd.w > s.x &&
      dvd.x < s.x + s.w &&
      dvd.y + dvd.h > s.y &&
      dvd.y < s.y + s.h
    ) {
      hitX = false;
      hitY = false;
    }
  });

  if (hitX) dvd.vx *= -1;
  if (hitY) dvd.vy *= -1;

  // Write back to Firebase
  db.ref(`rooms/${room}/dvd`).set(dvd);
}

setInterval(physicsLoop, 1000 / 60);

// ----------------------
// RENDER LOOP
// ----------------------
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!dvd || !screens[id]) {
    requestAnimationFrame(loop);
    return;
  }

  const me = screens[id];

  const lx = dvd.x - me.x;
  const ly = dvd.y - me.y;

  if (lx + dvd.w > 0 && lx < canvas.width && ly + dvd.h > 0 && ly < canvas.height) {
    ctx.fillStyle = "white";
    ctx.fillRect(lx, ly, dvd.w, dvd.h);
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("DVD", lx + 35, ly + 38);
  }

  requestAnimationFrame(loop);
}

loop();
