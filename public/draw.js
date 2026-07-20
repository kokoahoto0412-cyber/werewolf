// ─── DRAW & GUESS PREMIUM CLIENT ──────────────────────────────────────────────

const socket = io();

const pathParts = window.location.pathname.split('/');
const sessionId = pathParts[pathParts.length - 1];
const urlParams = new URLSearchParams(window.location.search);

let savedUid = localStorage.getItem(`draw_uid_${sessionId}`);
let savedName = localStorage.getItem(`draw_name_${sessionId}`);
let savedAvatar = localStorage.getItem(`draw_avatar_${sessionId}`);

let myId = urlParams.get('uid') || savedUid || 'user_' + Math.random().toString(36).substring(2, 8);
let myName = urlParams.get('name') || savedName || '';
let myAvatar = urlParams.get('avatar') || savedAvatar || `https://ui-avatars.com/api/?name=Guest&background=ec4899&color=fff`;

let gameState = {
  phase: 'lobby',
  hostId: null,
  currentDrawerId: null,
  players: [],
  category: 'Mix'
};

// ─── CANVAS ────────────────────────────────────────────────────────────────────
const canvas  = document.getElementById('draw-canvas');
const ctx     = canvas.getContext('2d');
ctx.lineCap   = 'round';
ctx.lineJoin  = 'round';

let isDrawing    = false;
let lastX = 0, lastY = 0;
let currentColor = '#ec4899';
let currentSize  = 8;
let isEraser     = false;
let activeTool   = 'brush';

// ─── FLOATING ART PARTICLES ────────────────────────────────────────────────────
(function spawnParticles() {
  const art = document.getElementById('floating-art');
  const emojis = ['🎨','✏️','🖌️','🖍️','✨','🎭','🖼️','🎪'];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'art-particle';
    el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDuration = (12 + Math.random() * 18) + 's';
    el.style.animationDelay    = (Math.random() * 15) + 's';
    art.appendChild(el);
  }
})();

// ─── CUSTOM MODAL DIALOGS ──────────────────────────────────────────────────────
function showCustomDialog({ title, desc, icon = '✨', showCancel = false, onConfirm }) {
  const overlay = document.getElementById('custom-modal-overlay');
  document.getElementById('custom-modal-icon').innerText = icon;
  const descEl = document.getElementById('custom-modal-desc');
  if (typeof desc === 'string' && desc.trim().startsWith('<')) {
    descEl.innerHTML = desc;
  } else {
    descEl.innerText = desc;
  }
  
  const cancelBtn = document.getElementById('custom-modal-cancel');
  const confirmBtn = document.getElementById('custom-modal-confirm');
  
  cancelBtn.style.display = showCancel ? 'inline-block' : 'none';
  
  const close = () => overlay.classList.remove('active');
  
  cancelBtn.onclick = close;
  confirmBtn.onclick = () => {
    close();
    if (onConfirm) onConfirm();
  };
  
  overlay.classList.add('active');
}

function showHowToPlayModal() {
  showCustomDialog({
    title: 'Cara Main & Aturan Draw & Guess',
    icon: '📖',
    desc: `<div style="text-align:left; font-size:0.92rem; line-height:1.6; max-height:60vh; overflow-y:auto; padding-right:8px;">
      <b style="color:#a855f7;">🖌️ Giliran Menggambar (Drawer):</b><br>
      • Pilih salah satu dari 3 kata rahasia yang disediakan.<br>
      • Gambarlah kata tersebut di atas kanvas menggunakan Kuas 🖌️, Cat Tumpah 🪣, dan Penghapus 🧽.<br>
      • <b style="color:#e74c3c;">LARANGAN:</b> Dilarang menulis huruf, angka, atau kata langsung di atas kanvas!<br>
      • 🏆 <b style="color:#10b981;">Bonus Poin:</b> Kamu mendapatkan <b>+10 Poin</b> setiap kali ada pemain yang berhasil menebak gambarmu dengan benar!<br><br>
      <b style="color:#38bdf8;">⚡ Giliran Menebak (Guesser):</b><br>
      • Perhatikan gambar di kanvas dan jumlah petunjuk huruf (<code>_ _ _</code>) di bagian atas.<br>
      • Ketik tebakanmu pada kolom chat di bawah secepat mungkin.<br>
      • Semakin cepat menebak sebelum waktu habis, semakin tinggi poin yang didapat (maks 80 poin per ronde)!<br><br>
      <b style="color:#f59e0b;">↩️ Fitur Undo (Batalkan Coretan):</b><br>
      • Jika salah menggambar garis atau salah warna saat menumpahkan cat, klik tombol <b>↩️ (Undo)</b> di toolbar bawah untuk membatalkan coretan terakhirmu!
    </div>`,
    showCancel: false,
    onConfirm: () => {}
  });
}
window.showHowToPlayModal = showHowToPlayModal;

function customAlert(desc, title = 'Perhatian', icon = '⚠️', onOk) {
  showCustomDialog({ title, desc, icon, showCancel: false, onConfirm: onOk });
}

function customConfirm(desc, onYes, title = 'Konfirmasi', icon = '❓') {
  showCustomDialog({ title, desc, icon, showCancel: true, onConfirm: onYes });
}

// ─── AUTO LOGIN ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (myName) {
    document.getElementById('login-name').value = myName;
    joinRoom();
  }
});

document.getElementById('btn-login-join').addEventListener('click', () => {
  const val = document.getElementById('login-name').value.trim();
  if (!val) return customAlert('Silakan masukkan nama kamu terlebih dahulu!', 'Input Kosong', '✏️');
  myName = val;
  joinRoom();
});

document.getElementById('login-name').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-login-join').click();
});

function joinRoom() {
  localStorage.setItem(`draw_uid_${sessionId}`, myId);
  localStorage.setItem(`draw_name_${sessionId}`, myName);
  localStorage.setItem(`draw_avatar_${sessionId}`, myAvatar);

  showScreen('screen-lobby');
  document.getElementById('lobby-room-id').innerText = `ROOM: ${sessionId.toUpperCase()}`;
  socket.emit('draw_join', { sessionId, discordId: myId, name: myName, avatar: myAvatar });
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// ─── SOCKET EVENTS ─────────────────────────────────────────────────────────────

socket.on('draw_room_state', (data) => {
  gameState = { ...gameState, ...data };
  buildCategoryGrid(data.categories, data.category);
  updateLobbyUI();

  if (data.phase !== 'lobby') {
    showScreen('screen-game');
    document.getElementById('game-hint-box').innerText = data.hint || '_ _ _';
    if (data.drawHistory) {
      data.drawHistory.forEach(s => {
        if (s.tool === 'fill') floodFill(s.x, s.y, s.color);
        else drawLine(s.x0, s.y0, s.x1, s.y1, s.color, s.size, s.isEraser);
      });
    }
  }
});

socket.on('players_update', ({ players }) => {
  gameState.players = players;
  updateLobbyUI();
  updateLeaderboard();
});

socket.on('category_updated', ({ category }) => {
  gameState.category = category;
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.cat === category);
  });
});

socket.on('phase_update', ({ phase, round, maxRounds, drawerName, drawerId }) => {
  gameState.phase = phase;
  gameState.currentDrawerId = drawerId;
  document.getElementById('game-round-badge').innerText = `Ronde ${round} / ${maxRounds}`;
  document.getElementById('game-drawer-name').innerText = drawerName;

  if (phase === 'choosing') {
    showScreen('screen-game');
    const modal = document.getElementById('modal-choosing');
    modal.classList.add('active');
    document.getElementById('modal-icon').innerText = myId === drawerId ? '🖌️' : '⏳';
    document.getElementById('modal-title').innerText  = myId === drawerId ? 'PILIH KATAMU!' : 'MENUNGGU PENGGAMBAR';
    document.getElementById('choosing-desc').innerText = myId === drawerId
      ? 'Pilih salah satu kata di bawah untuk kamu gambar:'
      : `⏳ Menunggu ${drawerName} memilih kata...`;
    document.getElementById('word-choices-container').innerHTML = '';
  }
});

socket.on('word_choices', ({ choices }) => {
  const c = document.getElementById('word-choices-container');
  c.innerHTML = choices.map(w =>
    `<button class="btn-word-choice" onclick="pickWord('${w}')">${w}</button>`
  ).join('');
});

window.pickWord = (word) => {
  socket.emit('draw_pick_word', { sessionId, word });
  document.getElementById('modal-choosing').classList.remove('active');
};

socket.on('drawing_start', ({ drawerId, drawerName, hint }) => {
  gameState.phase = 'drawing';
  gameState.currentDrawerId = drawerId;
  document.getElementById('modal-choosing').classList.remove('active');
  showScreen('screen-game');
  document.getElementById('game-drawer-name').innerText = drawerName;
  document.getElementById('game-hint-box').innerText = hint;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const toolbar   = document.getElementById('draw-toolbar');
  const guessForm = document.getElementById('guess-form');

  if (myId === drawerId) {
    toolbar.style.visibility = 'visible';
    guessForm.style.display  = 'none';
  } else {
    toolbar.style.visibility = 'hidden';
    guessForm.style.display  = 'flex';
    document.getElementById('guess-input').focus();
  }
});

socket.on('secret_word', ({ word }) => {
  document.getElementById('game-hint-box').innerText = `🎯 KATA: ${word}`;
  document.getElementById('game-hint-box').style.color = 'var(--green)';
});

socket.on('hint_update', ({ hint }) => {
  if (myId !== gameState.currentDrawerId) {
    document.getElementById('game-hint-box').innerText = hint;
    document.getElementById('game-hint-box').style.color = '';
  }
});

socket.on('timer_update', ({ time }) => {
  const el = document.getElementById('game-timer');
  el.innerText = `${time}s`;
  el.classList.toggle('warning', time <= 20);
});

socket.on('canvas_stroke', (s) => {
  if (s.tool === 'fill') floodFill(s.x, s.y, s.color);
  else drawLine(s.x0, s.y0, s.x1, s.y1, s.color, s.size, s.isEraser);
});

socket.on('canvas_cleared', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on('canvas_history', ({ history }) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (history && Array.isArray(history)) {
    history.forEach(s => {
      if (s.tool === 'fill') floodFill(s.x, s.y, s.color);
      else drawLine(s.x0, s.y0, s.x1, s.y1, s.color, s.size, s.isEraser);
    });
  }
});

socket.on('chat_msg', ({ sender, text, isSystem }) => {
  appendChat(sender, text, isSystem);
});

socket.on('correct_guess', ({ playerName, points, players }) => {
  gameState.players = players;
  updateLeaderboard();
  appendChat('🏆', `${playerName} menebak dengan benar! (+${points} Poin)`, false, true);
});

socket.on('turn_end', ({ reason, word, players }) => {
  gameState.players = players;
  updateLeaderboard();
  document.getElementById('draw-toolbar').style.visibility = 'hidden';
  document.getElementById('guess-form').style.display = 'flex';
  const banner = document.getElementById('turn-banner');
  document.getElementById('turn-banner-word').innerText = `Kata: "${word}"`;
  banner.classList.add('visible');
  appendChat('⏱️', reason, true);
  setTimeout(() => banner.classList.remove('visible'), 4500);
});

socket.on('game_over', ({ winners }) => {
  showScreen('screen-gameover');
  const top3 = winners.slice(0, 3);
  const others = winners.slice(3);
  
  const medals = ['🥇','🥈','🥉'];
  
  document.getElementById('gameover-top3').innerHTML = top3.map((w, i) => `
    <div class="podium-box rank-${i+1}">
      ${i === 0 ? '<span class="podium-crown">👑</span>' : ''}
      <img src="${w.avatar}" alt="av" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=ec4899&color=fff'">
      <span class="p-medal">${medals[i]}</span>
      <div class="p-name">${w.name}</div>
      <div class="p-score">${w.score} Pts</div>
    </div>
  `).join('');
  
  const othersContainer = document.getElementById('gameover-others');
  if (others.length > 0) {
    let html = `<div class="podium-others-title">Pemain Lainnya:</div>`;
    html += others.map((w, idx) => `
      <div class="other-row">
        <span class="other-rank">#${idx + 4}</span>
        <img src="${w.avatar}" alt="av" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=ec4899&color=fff'">
        <div class="other-name">${w.name}</div>
        <div class="other-score">${w.score} Pts</div>
      </div>
    `).join('');
    othersContainer.innerHTML = html;
  } else {
    othersContainer.innerHTML = '';
  }
});

socket.on('kicked', ({ message }) => {
  customAlert(message, 'Di-kick Host', '🚫', () => { window.location.href = '/'; });
});
socket.on('session_ended', ({ message }) => {
  customAlert(message, 'Sesi Berakhir', '🏁', () => { window.location.href = '/'; });
});
socket.on('error', ({ message }) => customAlert(message, 'Terjadi Kesalahan', '⚠️'));

// ─── UI UPDATERS ───────────────────────────────────────────────────────────────

function updateLobbyUI() {
  const count   = gameState.players.length;
  const isMeHost = myId === gameState.hostId;
  document.getElementById('lobby-player-count').innerText = `${count} / 10`;

  document.querySelectorAll('.host-only').forEach(el => {
    el.style.display = isMeHost ? '' : 'none';
  });
  document.querySelectorAll('.player-only').forEach(el => {
    el.style.display = isMeHost ? 'none' : '';
  });

  const startBtn = document.getElementById('btn-lobby-start');
  if (startBtn) startBtn.disabled = count < 3;

  const grid = document.getElementById('lobby-players-list');
  const maxSlots = 10;
  let html = gameState.players.map(p => `
    <div class="lobby-player-card ${p.id === gameState.hostId ? 'is-host' : ''}">
      <img src="${p.avatar}" alt="av" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=ec4899&color=fff'">
      <div class="lp-info">
        <div class="lp-name">${p.name}</div>
        ${p.id === gameState.hostId ? '<div class="lp-host-badge">👑 HOST</div>' : ''}
      </div>
      ${isMeHost && p.id !== myId ? `<button class="btn-kick-player" onclick="kickPlayer('${p.id}')" title="Kick">✕</button>` : ''}
    </div>
  `).join('');
  grid.innerHTML = html;
}

function buildCategoryGrid(categories, selected) {
  const isMeHost = myId === gameState.hostId;
  const grid = document.getElementById('category-grid');
  grid.innerHTML = categories.map(cat => `
    <button class="cat-btn ${cat === selected ? 'selected' : ''}" data-cat="${cat}"
      onclick="${isMeHost ? `selectCategory('${cat}')` : ''}"
      style="${!isMeHost ? 'cursor:default;opacity:0.6;' : ''}">
      ${cat}
    </button>
  `).join('');
}

window.selectCategory = (cat) => {
  socket.emit('draw_select_category', { sessionId, category: cat });
};

function updateLeaderboard() {
  const lb     = document.getElementById('game-leaderboard');
  const sorted = [...gameState.players].sort((a, b) => b.score - a.score);
  const ranks  = ['🥇','🥈','🥉'];
  lb.innerHTML = sorted.map((p, i) => `
    <div class="lb-row">
      <span class="lb-rank">${ranks[i] || `${i+1}.`}</span>
      <div class="lb-player">
        <img src="${p.avatar}" alt="av" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=333&color=fff'">
        <span class="lb-name ${p.id === gameState.currentDrawerId ? 'lb-drawing' : ''}">${p.name}${p.id === gameState.currentDrawerId ? ' 🖌️' : ''}</span>
      </div>
      <span class="lb-score">${p.score}</span>
    </div>
  `).join('');
}

function appendChat(sender, text, isSystem = false, isCorrect = false) {
  const box = document.getElementById('chat-history');
  const div = document.createElement('div');
  div.className = `chat-bubble ${isSystem ? 'bubble-system' : ''} ${isCorrect ? 'bubble-correct' : ''}`;
  div.innerHTML = isSystem
    ? `${sender} ${text}`
    : `<span class="bubble-sender">${sender}:</span> ${text}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ─── LOBBY ACTIONS ─────────────────────────────────────────────────────────────

document.getElementById('btn-lobby-leave').addEventListener('click', () => {
  socket.emit('draw_leave', { sessionId, discordId: myId });
  window.location.href = '/';
});
document.getElementById('btn-lobby-end').addEventListener('click', () => {
  customConfirm('Yakin ingin membubarkan dan mengakhiri sesi permainan ini untuk semua pemain?', () => {
    socket.emit('draw_end_session', { sessionId });
  }, 'Bubarkan Sesi', '🚨');
});
document.getElementById('btn-lobby-start').addEventListener('click', () => {
  socket.emit('draw_start_game', { sessionId, discordId: myId });
});

window.kickPlayer = (targetId) => {
  customConfirm('Apakah kamu yakin ingin menendang pemain ini dari ruangan?', () => {
    socket.emit('draw_kick', { sessionId, targetId });
  }, 'Tendang Pemain', '🥾');
};

// ─── CHAT / GUESS INPUT ────────────────────────────────────────────────────────

document.getElementById('guess-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const inp = document.getElementById('guess-input');
  const val = inp.value.trim();
  if (!val) return;
  socket.emit('draw_guess', { sessionId, discordId: myId, text: val });
  inp.value = '';
});

// ─── CANVAS DRAWING ────────────────────────────────────────────────────────────

function getCoords(e) {
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const src    = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top)  * scaleY
  };
}

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(char => char + char).join('');
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function floodFill(startX, startY, fillColor) {
  startX = Math.floor(startX);
  startY = Math.floor(startY);
  if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  const target = hexToRgb(fillColor);
  const startIdx = (startY * width + startX) * 4;
  const startR = data[startIdx];
  const startG = data[startIdx + 1];
  const startB = data[startIdx + 2];
  const startA = data[startIdx + 3];

  if (Math.abs(startR - target.r) + Math.abs(startG - target.g) + Math.abs(startB - target.b) < 10 && Math.abs(startA - 255) < 10) return;

  const colorMatch = (idx) => {
    return Math.abs(data[idx] - startR) < 85 &&
           Math.abs(data[idx + 1] - startG) < 85 &&
           Math.abs(data[idx + 2] - startB) < 85 &&
           Math.abs(data[idx + 3] - startA) < 85;
  };

  const stack = [startX, startY];
  const visited = new Uint8Array(width * height);

  const checkAndTintEdge = (nx, ny) => {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return;
    const npos = ny * width + nx;
    if (visited[npos]) return;
    const nidx = npos * 4;
    const diff = Math.abs(data[nidx] - startR) + Math.abs(data[nidx + 1] - startG) + Math.abs(data[nidx + 2] - startB);
    if (diff < 165 && diff >= 85 * 3) {
      visited[npos] = 1;
      data[nidx] = target.r;
      data[nidx + 1] = target.g;
      data[nidx + 2] = target.b;
      data[nidx + 3] = 255;
    }
  };

  while (stack.length > 0) {
    const y = stack.pop();
    const x = stack.pop();
    const pos = y * width + x;

    if (x < 0 || x >= width || y < 0 || y >= height || visited[pos]) continue;
    visited[pos] = 1;

    const idx = pos * 4;
    if (colorMatch(idx)) {
      data[idx] = target.r;
      data[idx + 1] = target.g;
      data[idx + 2] = target.b;
      data[idx + 3] = 255;

      checkAndTintEdge(x + 1, y);
      checkAndTintEdge(x - 1, y);
      checkAndTintEdge(x, y + 1);
      checkAndTintEdge(x, y - 1);
      checkAndTintEdge(x + 1, y + 1);
      checkAndTintEdge(x - 1, y - 1);

      stack.push(x + 1, y);
      stack.push(x - 1, y);
      stack.push(x, y + 1);
      stack.push(x, y - 1);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function drawLine(x0, y0, x1, y1, color, size, eraser) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineWidth   = size;
  ctx.strokeStyle = eraser ? '#ffffff' : color;
  ctx.stroke();
  ctx.restore();
}

function onStart(e) {
  if (myId !== gameState.currentDrawerId || gameState.phase !== 'drawing') return;
  const { x, y } = getCoords(e);
  if (activeTool === 'fill') {
    floodFill(x, y, currentColor);
    socket.emit('draw_canvas', {
      sessionId,
      stroke: { tool: 'fill', x, y, color: currentColor }
    });
    return;
  }
  isDrawing = true;
  lastX = x; lastY = y;
  drawLine(x, y, x, y, currentColor, currentSize, isEraser);
  emit(x, y, x, y);
}

function onMove(e) {
  if (!isDrawing || myId !== gameState.currentDrawerId) return;
  e.preventDefault();
  const { x, y } = getCoords(e);
  drawLine(lastX, lastY, x, y, currentColor, currentSize, isEraser);
  emit(lastX, lastY, x, y);
  lastX = x; lastY = y;
}

function onEnd() { isDrawing = false; }

function emit(x0, y0, x1, y1) {
  socket.emit('draw_canvas', {
    sessionId,
    stroke: { x0, y0, x1, y1, color: currentColor, size: currentSize, isEraser }
  });
}

canvas.addEventListener('mousedown',  onStart);
canvas.addEventListener('mousemove',  onMove);
canvas.addEventListener('mouseup',    onEnd);
canvas.addEventListener('mouseleave', onEnd);
canvas.addEventListener('touchstart', onStart, { passive: false });
canvas.addEventListener('touchmove',  onMove,  { passive: false });
canvas.addEventListener('touchend',   onEnd);

// ─── TOOLBAR EVENTS ────────────────────────────────────────────────────────────

function setActiveTool(tool) {
  activeTool = tool;
  isEraser = (tool === 'eraser');
  ['brush', 'eraser', 'fill'].forEach(t => {
    const el = document.getElementById(`tool-${t}`);
    if (el) el.classList.toggle('active', t === tool);
  });
}

document.getElementById('color-wheel').addEventListener('input', (e) => {
  currentColor = e.target.value;
  document.getElementById('color-preview').style.background = currentColor;
  if (activeTool === 'eraser') setActiveTool('brush');
});

document.querySelectorAll('.swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    currentColor = btn.dataset.color;
    document.getElementById('color-wheel').value = currentColor;
    document.getElementById('color-preview').style.background = currentColor;
    document.querySelectorAll('.swatch').forEach(b => b.classList.remove('active-swatch'));
    btn.classList.add('active-swatch');
    if (activeTool === 'eraser') setActiveTool('brush');
  });
});

document.getElementById('tool-brush').addEventListener('click', () => setActiveTool('brush'));
document.getElementById('tool-eraser').addEventListener('click', () => setActiveTool('eraser'));
const fillBtn = document.getElementById('tool-fill');
if (fillBtn) fillBtn.addEventListener('click', () => setActiveTool('fill'));

document.getElementById('brush-size').addEventListener('input', (e) => {
  currentSize = parseInt(e.target.value, 10);
  document.getElementById('brush-size-label').innerText = currentSize + 'px';
});

document.getElementById('tool-clear').addEventListener('click', () => {
  customConfirm('Apakah kamu yakin ingin membersihkan seluruh coretan di kanvas?', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('draw_clear', { sessionId });
  }, 'Bersihkan Kanvas', '🗑️');
});

const undoBtn = document.getElementById('tool-undo');
if (undoBtn) {
  undoBtn.addEventListener('click', () => {
    socket.emit('draw_undo', { sessionId });
  });
}
