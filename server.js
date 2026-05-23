const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10;
const USERS_FILE = path.join(__dirname, 'users.json');

// ── User database ──
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch (e) { console.error('[users] load error', e); }
  return {};
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) { console.error('[users] save error', e); }
}

// ── Rate limiter (per IP) ──
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const RATE_LIMIT_MAX = 20;       // max events per window
const ipTracker = {};

function checkRateLimit(ip) {
  const now = Date.now();
  if (!ipTracker[ip]) {
    ipTracker[ip] = { count: 1, resetAt: now + RATE_LIMIT_WINDOW };
    return true;
  }
  const entry = ipTracker[ip];
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW;
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Clean stale IP entries every 60s
setInterval(() => {
  const now = Date.now();
  Object.keys(ipTracker).forEach(ip => {
    if (now > ipTracker[ip].resetAt) delete ipTracker[ip];
  });
}, 60000);

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const rooms = {};
const partyCodeIndex = {};

function generatePartyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (partyCodeIndex[code]);
  return code;
}

function createRoom(roomId, code, hostId) {
  rooms[roomId] = {
    id: roomId,
    code: code || null,
    players: {},
    boss: null,
    state: 'waiting',
    host: hostId || null,
    gameMode: null,
  };
  return rooms[roomId];
}

function getRoom(roomId) {
  return rooms[roomId];
}

function deleteRoom(roomId) {
  const room = rooms[roomId];
  if (room && room.code) delete partyCodeIndex[room.code];
  delete rooms[roomId];
}

function roomBroadcast(roomId, event, data) {
  io.to(roomId).emit(event, data);
}

io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  console.log(`[connect] ${socket.id} from ${ip}`);

  // Rate limit check
  if (!checkRateLimit(ip)) {
    console.log(`[ratelimit] blocked ${socket.id} (${ip})`);
    socket.emit('auth_error', 'Слишком много запросов. Подождите.');
    socket.disconnect(true);
    return;
  }

  socket.authenticated = false;
  socket.username = null;

  // Ask client to authenticate
  socket.emit('auth_required');

  // ── Register ──
  socket.on('register', (data, callback) => {
    if (!checkRateLimit(ip)) {
      if (callback) callback({ error: 'Слишком много запросов. Подождите.' });
      return;
    }
    const { username, password } = data || {};
    if (!username || !password) {
      if (callback) callback({ error: 'Логин и пароль обязательны' });
      return;
    }
    if (username.length < 3 || username.length > 20) {
      if (callback) callback({ error: 'Логин должен быть от 3 до 20 символов' });
      return;
    }
    if (password.length < 4) {
      if (callback) callback({ error: 'Пароль должен быть минимум 4 символа' });
      return;
    }
    const users = loadUsers();
    if (users[username]) {
      if (callback) callback({ error: 'Пользователь уже существует' });
      return;
    }
    try {
      const hash = bcrypt.hashSync(password, SALT_ROUNDS);
      users[username] = { password: hash, createdAt: Date.now() };
      saveUsers(users);
      socket.authenticated = true;
      socket.username = username;
      if (callback) callback({ success: true, username });
      console.log(`[register] ${username} (${socket.id})`);
    } catch (e) {
      if (callback) callback({ error: 'Ошибка сервера при регистрации' });
    }
  });

  // ── Login ──
  socket.on('login', (data, callback) => {
    if (!checkRateLimit(ip)) {
      if (callback) callback({ error: 'Слишком много запросов. Подождите.' });
      return;
    }
    const { username, password } = data || {};
    if (!username || !password) {
      if (callback) callback({ error: 'Логин и пароль обязательны' });
      return;
    }
    const users = loadUsers();
    const user = users[username];
    if (!user) {
      if (callback) callback({ error: 'Неверный логин или пароль' });
      return;
    }
    try {
      const match = bcrypt.compareSync(password, user.password);
      if (!match) {
        if (callback) callback({ error: 'Неверный логин или пароль' });
        return;
      }
      socket.authenticated = true;
      socket.username = username;
      if (callback) callback({ success: true, username });
      console.log(`[login] ${username} (${socket.id})`);
    } catch (e) {
      if (callback) callback({ error: 'Ошибка сервера при входе' });
    }
  });

  // ── Party system ──
  socket.on('createParty', (callback) => {
    if (!socket.authenticated) {
      if (callback) callback({ error: 'Требуется авторизация' });
      return;
    }
    const code = generatePartyCode();
    const roomId = `party_${code}`;
    const room = createRoom(roomId, code, socket.id);
    partyCodeIndex[code] = roomId;

    socket.join(roomId);
    socket.roomId = roomId;
    room.players[socket.id] = {
      id: socket.id, name: socket.username || 'Host', x: 600, y: 700,
      hp: 3, maxHp: 3, score: 0, ready: false, isHost: true,
      isDashing: false, isRage: false, invulnerable: 0,
    };

    if (callback) callback({ success: true, code, players: room.players, hostId: socket.id });
    console.log(`[party] created ${code} by ${socket.username}`);
  });

  socket.on('joinParty', (code, callback) => {
    if (!socket.authenticated) {
      if (callback) callback({ error: 'Требуется авторизация' });
      return;
    }
    const roomId = partyCodeIndex[code];
    if (!roomId) {
      if (callback) callback({ error: 'Партия не найдена' });
      return;
    }
    const room = getRoom(roomId);
    if (!room) {
      if (callback) callback({ error: 'Партия не найдена' });
      return;
    }
    if (room.state !== 'waiting' && room.state !== 'lobby') {
      if (callback) callback({ error: 'Игра уже началась' });
      return;
    }
    const playerCount = Object.keys(room.players).length;
    if (playerCount >= 4) {
      if (callback) callback({ error: 'Партия заполнена (макс. 4)' });
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    room.players[socket.id] = {
      id: socket.id, name: socket.username || 'Player', x: 600, y: 700,
      hp: 3, maxHp: 3, score: 0, ready: false, isHost: false,
      isDashing: false, isRage: false, invulnerable: 0,
    };
    room.state = 'lobby';

    roomBroadcast(roomId, 'partyUpdate', { players: room.players, hostId: room.host, code });
    if (callback) callback({ success: true, players: room.players, hostId: room.host });
    console.log(`[party] ${socket.username} joined ${code}`);
  });

  socket.on('startPartyGame', (gameMode) => {
    if (!socket.authenticated) return;
    const room = getRoom(socket.roomId);
    if (!room || room.host !== socket.id) return;
    if (gameMode !== 'bossrush' && gameMode !== 'waves') return;

    room.gameMode = gameMode;
    room.state = 'playing';
    roomBroadcast(socket.roomId, 'partyGameStarting', { gameMode });
    console.log(`[party] ${socket.username} started ${gameMode} in ${room.code}`);
  });

  // ── Room management (auth-gated) ──
  socket.on('joinRoom', (roomId, playerName, callback) => {
    if (!socket.authenticated) {
      if (callback) callback({ error: 'Требуется авторизация' });
      return;
    }
    const id = roomId || `room_${Date.now()}`;
    let room = getRoom(id);
    if (!room) room = createRoom(id);

    const playerCount = Object.keys(room.players).length;
    if (playerCount >= 4) {
      if (callback) callback({ error: 'Комната заполнена (макс. 4)' });
      return;
    }

    socket.join(id);
    room.players[socket.id] = {
      id: socket.id,
      name: playerName || socket.username || `Player ${playerCount + 1}`,
      x: 600, y: 700,
      hp: 3, maxHp: 3,
      score: 0,
      ready: false,
      isDashing: false,
      isRage: false,
      invulnerable: 0,
    };

    socket.roomId = id;

    io.to(id).emit('roomUpdate', {
      roomId: id,
      players: room.players,
      boss: room.boss,
      state: room.state,
    });

    if (callback) callback({ success: true, roomId: id, playerId: socket.id });
    console.log(`[joinRoom] ${socket.username||socket.id} -> ${id}`);
  });

  socket.on('leaveRoom', () => {
    const id = socket.roomId;
    if (!id) return;
    const room = getRoom(id);
    if (!room) return;

    delete room.players[socket.id];
    socket.leave(id);
    delete socket.roomId;

    const count = Object.keys(room.players).length;
    if (count === 0) {
      deleteRoom(id);
      console.log(`[deleteRoom] ${id} (empty)`);
    } else {
      io.to(id).emit('roomUpdate', {
        roomId: id,
        players: room.players,
        boss: room.boss,
        state: room.state,
      });
    }
  });

  // ── Player state sync ──
  socket.on('playerUpdate', (data) => {
    const id = socket.roomId;
    if (!id) return;
    const room = getRoom(id);
    if (!room) return;
    const player = room.players[socket.id];
    if (!player) return;

    if (data.x != null) player.x = data.x;
    if (data.y != null) player.y = data.y;
    if (data.hp != null) player.hp = data.hp;
    if (data.score != null) player.score = data.score;
    if (data.angle != null) player.angle = data.angle;
    if (data.isDashing != null) player.isDashing = data.isDashing;
    if (data.isRage != null) player.isRage = data.isRage;
    if (data.invulnerable != null) player.invulnerable = data.invulnerable;

    socket.to(id).emit('playerMoved', {
      id: socket.id,
      x: player.x,
      y: player.y,
      angle: player.angle,
      isDashing: player.isDashing,
      isRage: player.isRage,
      invulnerable: player.invulnerable,
    });
  });

  // ── Boss management ──
  socket.on('spawnBoss', (bossDto) => {
    const id = socket.roomId;
    if (!id) return;
    const room = getRoom(id);
    if (!room) return;

    room.boss = bossDto;
    room.state = 'boss';

    io.to(id).emit('bossSpawned', bossDto);
    console.log(`[spawnBoss] ${bossDto.type} in ${id}`);
  });

  socket.on('bossUpdate', (data) => {
    const id = socket.roomId;
    if (!id) return;
    const room = getRoom(id);
    if (!room || !room.boss) return;

    if (data.x != null) room.boss.x = data.x;
    if (data.y != null) room.boss.y = data.y;
    if (data.hp != null) room.boss.hp = data.hp;
    if (data.phase != null) room.boss.phase = data.phase;
    if (data.stunned != null) room.boss.stunned = data.stunned;
    if (data.stunTimer != null) room.boss.stunTimer = data.stunTimer;
    if (data.entered != null) room.boss.entered = data.entered;

    socket.to(id).emit('bossMoved', room.boss);
  });

  socket.on('bossHit', (damage) => {
    const id = socket.roomId;
    if (!id) return;
    const room = getRoom(id);
    if (!room || !room.boss) return;

    room.boss.hp -= damage;
    if (room.boss.hp <= 0) {
      room.boss.hp = 0;
      room.state = 'waiting';
      io.to(id).emit('bossDefeated', { killerId: socket.id });
    }
    io.to(id).emit('bossHpUpdate', { hp: room.boss.hp, maxHp: room.boss.maxHp });
  });

  // ── Projectiles sync ──
  socket.on('spawnProjectile', (projectile) => {
    const id = socket.roomId;
    if (!id) return;
    socket.to(id).emit('projectileSpawned', projectile);
  });

  // ── Player hit ──
  socket.on('playerHit', (targetId, damage) => {
    const id = socket.roomId;
    if (!id) return;
    const room = getRoom(id);
    if (!room) return;
    const target = room.players[targetId];
    if (!target) return;

    target.hp -= damage;
    if (target.hp < 0) target.hp = 0;
    io.to(id).emit('playerDamaged', { targetId, hp: target.hp, maxHp: target.maxHp, damage });
  });

  // ── Chat ──
  socket.on('chatMessage', (msg) => {
    const id = socket.roomId;
    if (!id) return;
    const room = getRoom(id);
    if (!room) return;
    const player = room.players[socket.id];
    io.to(id).emit('chatMessage', {
      playerId: socket.id,
      playerName: player ? player.name : 'Unknown',
      text: msg,
      time: Date.now(),
    });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id} (${socket.username || 'guest'})`);
    const id = socket.roomId;
    if (!id) return;
    const room = getRoom(id);
    if (!room) return;

    delete room.players[socket.id];
    socket.to(id).emit('playerLeft', socket.id);

    const count = Object.keys(room.players).length;
    if (count === 0) {
      deleteRoom(id);
      console.log(`[deleteRoom] ${id} (empty)`);
    } else {
      const update = { roomId: id, players: room.players, boss: room.boss, state: room.state };
      io.to(id).emit('roomUpdate', update);
      if (room.code) io.to(id).emit('partyUpdate', { players: room.players, hostId: room.host, code: room.code });
    }
  });
});

server.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
  console.log(`[server] Serving: ${__dirname}`);
});
