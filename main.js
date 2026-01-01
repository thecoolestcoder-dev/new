const ws = new WebSocket("ws://localhost:8080"); // change when deployed

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

/* ======================
   CANVAS
====================== */

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

/* ======================
   UI TOGGLE
====================== */

toggleUI.onclick = () => {
  ui.classList.toggle("hidden");
  toggleUI.textContent = ui.classList.contains("hidden")
    ? "Show Panel"
    : "Hide Panel";
};

/* ======================
   GRID
====================== */

let selected = null;

for (let y = -1; y <= 1; y++) {
  for (let x = -1; x <= 1; x++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.onclick = () => {
      if (locked) return;
      if (selected) selected.classList.remove("me");
      cell.classList.add("me");
      selected = cell;
      screenPos = { x, y };
    };
    grid.appendChild(cell);
  }
}

/* ======================
   ROOM
====================== */

createBtn.onclick = () => {
  room = Math.random().toString(36).slice(2, 6).toUpperCase();
  ws.send(JSON.stringify({ type: "create", code: room }));
  codeInput.value = room;
};

joinBtn.onclick = () => {
  room = codeInput.value.toUpperCase();
  ws.send(
    JSON.stringify({
      type: "join",
      code: room,
      screen: {
        x: screenPos.x * canvas.width,
        y: screenPos.y * canvas.height,
        w: canvas.width,
        h: canvas.height,
      },
    })
  );
};

lockBtn.onclick = () => (locked = true);

/* ======================
   NETWORK
====================== */

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type !== "state") return;

  screens = msg.screens;
  dvd = msg.dvd;
  isHost = msg.host === id;
};

/* ======================
   RENDER
====================== */

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!dvd || !screens[id]) {
    requestAnimationFrame(loop);
    return;
  }

  const me = screens[id];

  const lx = dvd.x - me.x;
  const ly = dvd.y - me.y;

  if (
    lx + dvd.w > 0 &&
    lx < canvas.width &&
    ly + dvd.h > 0 &&
    ly < canvas.height
  ) {
    ctx.fillStyle = "white";
    ctx.fillRect(lx, ly, dvd.w, dvd.h);
    ctx.fillStyle = "black";
    ctx.font = "20px Arial";
    ctx.fillText("DVD", lx + 35, ly + 38);
  }

  requestAnimationFrame(loop);
}

loop();
