import { WebSocketServer } from "ws";
import crypto from "crypto";

const wss = new WebSocketServer({ port: 8080 });
const rooms = {};

function overlap(a1, a2, b1, b2) {
  return Math.max(a1, b1) < Math.min(a2, b2);
}

function electHost(room) {
  room.host = Object.keys(room.clients)[0] || null;
}

wss.on("connection", (ws) => {
  ws.id = crypto.randomUUID();

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw);

    if (msg.type === "create") {
      rooms[msg.code] = {
        host: ws.id,
        clients: {},
        dvd: {
          x: 100,
          y: 100,
          w: 120,
          h: 60,
          vx: 200,
          vy: 150,
        },
      };
    }

    if (msg.type === "join") {
      const room = rooms[msg.code];
      if (!room) return;
      room.clients[ws.id] = msg.screen;
      ws.room = msg.code;
    }
  });

  ws.on("close", () => {
    const room = rooms[ws.room];
    if (!room) return;

    delete room.clients[ws.id];
    if (room.host === ws.id) electHost(room);
  });
});

/* PHYSICS LOOP */
setInterval(() => {
  for (const room of Object.values(rooms)) {
    if (!room.host) continue;

    const screens = Object.values(room.clients);
    const d = room.dvd;

    d.x += d.vx / 60;
    d.y += d.vy / 60;

    let hitX = true;
    let hitY = true;

    for (const s of screens) {
      if (
        d.x + d.w > s.x &&
        d.x < s.x + s.w &&
        d.y + d.h > s.y &&
        d.y < s.y + s.h
      ) {
        hitX = false;
        hitY = false;
      }
    }

    if (hitX) d.vx *= -1;
    if (hitY) d.vy *= -1;

    const packet = JSON.stringify({
      type: "state",
      host: room.host,
      screens: room.clients,
      dvd: room.dvd,
    });

    wss.clients.forEach((c) => c.send(packet));
  }
}, 1000 / 60);

console.log("Server running on ws://localhost:8080");
