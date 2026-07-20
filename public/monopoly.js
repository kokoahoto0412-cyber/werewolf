// ─── MONOPOLY NEGARA DUNIA — Client Controller v2 (Game Engine Edition) ───────

// ─── URL Params & Identity ─────────────────────────────────────────────────────
const params     = new URLSearchParams(window.location.search);
const SESSION_ID = window.location.pathname.split('/').pop();
let MY_ID    = null;
let MY_NAME  = null;
let MY_AVATAR = null;
let MY_TOKEN = '🚂';

const savedSession = localStorage.getItem(`mono_${SESSION_ID}`);
if (params.get('uid')) {
    MY_ID     = params.get('uid');
    MY_NAME   = params.get('name')   ? decodeURIComponent(params.get('name'))   : null;
    MY_AVATAR = params.get('avatar') ? decodeURIComponent(params.get('avatar')) : null;
    if (MY_ID && MY_NAME) {
        localStorage.setItem(`mono_${SESSION_ID}`, JSON.stringify({ id: MY_ID, name: MY_NAME, avatar: MY_AVATAR }));
    }
} else if (savedSession) {
    try { const p = JSON.parse(savedSession); MY_ID = p.id; MY_NAME = p.name; MY_AVATAR = p.avatar; } catch(e) {}
}

// ─── Game State ────────────────────────────────────────────────────────────────
let gameState = null;
let sfxOn     = true;

// ─── Socket ────────────────────────────────────────────────────────────────────
const socket = io({ autoConnect: false });

// ─── Audio SFX Synth ──────────────────────────────────────────────────────────
const AudioCtor = window.AudioContext || window.webkitAudioContext;
let actx = null;
function getACtx() {
    if (!actx) actx = new AudioCtor();
    if (actx.state === 'suspended') actx.resume();
    return actx;
}
function playTone(freq, type, dur, vol = 0.2) {
    if (!sfxOn) return;
    try {
        const ctx  = getACtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = type; osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
        osc.start(); osc.stop(ctx.currentTime + dur);
    } catch(e) {}
}
const SFX = {
    roll:    () => { playTone(180,'triangle',0.1,0.25); setTimeout(()=>playTone(360,'triangle',0.08,0.2), 60); },
    step:    (n) => { playTone(300 + n * 28, 'triangle', 0.06, 0.07); },
    buy:     () => { [523,659,784].forEach((f,i)=>setTimeout(()=>playTone(f,'sine',0.15,0.25),i*80)); },
    rent:    () => { playTone(220,'sawtooth',0.15,0.3); },
    card:    () => { playTone(700,'sine',0.08,0.15); setTimeout(()=>playTone(1000,'sine',0.08,0.1),90); },
    jail:    () => { [300,250,200,150].forEach((f,i)=>setTimeout(()=>playTone(f,'square',0.12,0.25),i*70)); },
    win:     () => { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,'sine',0.2,0.3),i*100)); },
    go:      () => { [659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,'sine',0.18,0.25),i*90)); },
    doubles: () => { [880,1100].forEach((f,i)=>setTimeout(()=>playTone(f,'sine',0.15,0.2),i*70)); },
};

document.getElementById('btn-sound')?.addEventListener('click', () => { sfxOn = !sfxOn; updateSoundBtns(); });
function updateSoundBtns() {
    const label = sfxOn ? '🔊 Suara: ON' : '🔇 Suara: OFF';
    ['btn-sound','msp-sound-btn'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = label; });
}
window.toggleSoundMSP = function() { sfxOn = !sfxOn; updateSoundBtns(); };

// ─── Ambient BG Canvas ────────────────────────────────────────────────────────
(function initBG() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];
    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    for (let i = 0; i < 60; i++) particles.push({ x: Math.random()*2000, y: Math.random()*1000, r: Math.random()*1.5+0.5, s: Math.random()*0.3+0.1, o: Math.random()*0.4+0.1 });
    function frame() {
        requestAnimationFrame(frame);
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
            p.y -= p.s;
            if (p.y < 0) { p.y = h; p.x = Math.random()*w; }
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
            ctx.fillStyle = `rgba(240,192,64,${p.o})`; ctx.fill();
        });
    }
    frame();
})();

(function spawnCoins() {
    const container = document.getElementById('floating-coins');
    if (!container) return;
    const coins = ['💰','🪙','💵','💴','🎰'];
    setInterval(() => {
        if (document.querySelectorAll('.coin-particle').length > 8) return;
        const el = document.createElement('div');
        el.className = 'coin-particle';
        el.textContent = coins[Math.floor(Math.random()*coins.length)];
        el.style.left = Math.random()*100 + 'vw';
        el.style.animationDuration = (12 + Math.random()*8) + 's';
        el.style.animationDelay = '0s';
        el.style.fontSize = (0.8 + Math.random()*0.8) + 'rem';
        container.appendChild(el);
        setTimeout(() => el.remove(), 22000);
    }, 3000);
})();

// ─── Screen Manager ────────────────────────────────────────────────────────────
const screens = {
    loading: document.getElementById('screen-loading'),
    login:   document.getElementById('screen-login'),
    lobby:   document.getElementById('screen-lobby'),
    game:    document.getElementById('screen-game'),
    error:   document.getElementById('screen-error'),
};
function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => { el.classList.toggle('active', k === name); });
    if (name === 'game') {
        document.getElementById('mobile-top-bar')?.style && (document.getElementById('mobile-top-bar').style.display = '');
        document.getElementById('mobile-action-dock')?.style && (document.getElementById('mobile-action-dock').style.display = '');
    }
}

// ─── Token Selection ──────────────────────────────────────────────────────────
function selectToken(token) {
    const takenBy = gameState?.players?.find(p => p.id !== MY_ID && p.token === token);
    if (takenBy) return;
    MY_TOKEN = token;
    document.querySelectorAll('.token-opt').forEach(el => {
        el.classList.toggle('selected', el.dataset.token === token);
        el.classList.remove('token-taken');
    });
    const myCard = document.querySelector('.lobby-player-card.is-me .lp-token');
    if (myCard) myCard.textContent = token;
    if (MY_ID) socket.emit('mono_change_token', { sessionId: SESSION_ID, discordId: MY_ID, token });
}

function renderTokenOptions(players) {
    const takenTokens = new Set((players || []).filter(p => p.id !== MY_ID).map(p => p.token));
    document.querySelectorAll('.token-opt').forEach(el => {
        const t = el.dataset.token;
        const isTaken = takenTokens.has(t);
        el.classList.toggle('token-taken', isTaken);
        el.title = isTaken ? `Token ini sudah dipakai pemain lain!` : t;
    });
    if (takenTokens.has(MY_TOKEN)) {
        const ALL_TOKENS = ['🚂','⚓','🎩','🐕','🚗','✈️','🛳️','🌍'];
        const free = ALL_TOKENS.find(t => !takenTokens.has(t));
        if (free) selectToken(free);
    }
}

selectToken('🚂');

// ─── Login Logic ──────────────────────────────────────────────────────────────
function submitLogin() {
    const input = document.getElementById('login-name-input');
    const name  = (input.value || '').trim();
    if (!name) { input.focus(); return; }
    MY_NAME   = name;
    MY_ID     = 'guest_' + Math.random().toString(36).slice(2, 8);
    MY_AVATAR = `https://ui-avatars.com/api/?name=${encodeURIComponent(MY_NAME)}&background=random&size=128`;
    localStorage.setItem(`mono_${SESSION_ID}`, JSON.stringify({ id: MY_ID, name: MY_NAME, avatar: MY_AVATAR }));
    showScreen('loading'); socket.connect(); startConnectionTimer();
}
document.getElementById('login-name-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });

if (MY_AVATAR) {
    const prev = document.getElementById('discord-preview');
    const img  = document.getElementById('discord-avatar-preview');
    const nm   = document.getElementById('discord-name-preview');
    if (prev && img && nm) { prev.classList.remove('hidden'); img.src = MY_AVATAR; nm.textContent = MY_NAME || ''; }
}

function startConnectionTimer() {
    setTimeout(() => {
        if (!gameState) {
            document.getElementById('error-title').textContent = 'Session Tidak Valid';
            document.getElementById('error-msg').textContent   = 'Link game tidak valid atau sudah kedaluwarsa. Gunakan m.monopoly di Discord untuk membuat room baru.';
            showScreen('error');
        }
    }, 8000);
}

if (!MY_ID || !MY_NAME) {
    showScreen('login');
} else {
    showScreen('loading');
    socket.connect();
    startConnectionTimer();
}

// ─── Socket: Connection ───────────────────────────────────────────────────────
socket.on('connect', () => {
    socket.emit('mono_join', {
        sessionId: SESSION_ID, discordId: MY_ID,
        name: MY_NAME, avatar: MY_AVATAR || `https://ui-avatars.com/api/?name=${encodeURIComponent(MY_NAME)}&background=random`,
        token: MY_TOKEN
    });
});

socket.on('disconnect', () => { if (gameState && gameState.phase !== 'ended') showAnnouncement('⚠️ Koneksi terputus. Mencoba menyambung kembali...'); });

socket.on('error', (err) => {
    if (gameState?.phase === 'playing' || gameState?.phase === 'lobby') {
        showModal(`<div style="font-size:2.5rem;margin-bottom:10px;">⚠️</div><div class="modal-title" style="color:var(--red);">Peringatan</div><p style="margin-bottom:20px;">${err.message || 'Terjadi kesalahan.'}</p><button class="btn-act btn-roll-dice" style="width:100%;" onclick="closeModal()">Tutup</button>`);
    } else {
        document.getElementById('error-msg').textContent = err.message || 'Terjadi kesalahan.'; showScreen('error');
    }
});

socket.on('mono_kicked', ({ reason }) => {
    socket.disconnect();
    document.getElementById('error-title').textContent = reason.startsWith('Kamu telah keluar') ? '👋 Keluar dari Room' : '🥾 Kamu Dikick!';
    document.getElementById('error-msg').textContent   = reason || 'Kamu dikeluarkan dari sesi.';
    showScreen('error'); localStorage.removeItem(`mono_${SESSION_ID}`);
});

socket.on('mono_session_ended', ({ reason }) => {
    socket.disconnect();
    document.getElementById('error-title').textContent = '🔚 Sesi Diakhiri';
    document.getElementById('error-msg').textContent   = reason || 'Host mengakhiri sesi.';
    showScreen('error'); localStorage.removeItem(`mono_${SESSION_ID}`);
});

// ─── Socket: State ────────────────────────────────────────────────────────────
socket.on('mono_state', ({ game, myId }) => {
    gameState = game; MY_ID = myId;
    const me = game.players?.find(p => p.id === MY_ID);
    if (me) {
        if (me.token) MY_TOKEN = me.token;
        if (me.avatar) { MY_AVATAR = me.avatar; localStorage.setItem(`mono_${SESSION_ID}`, JSON.stringify({ id: MY_ID, name: MY_NAME, avatar: MY_AVATAR })); }
    }
    const badge = document.getElementById('lobby-room-badge'), mbadge = document.getElementById('room-mini-badge');
    if (badge)  badge.textContent  = `ROOM: ${SESSION_ID}`;
    if (mbadge) mbadge.textContent = SESSION_ID;
    const mtbRoom = document.getElementById('mtb-room');
    if (mtbRoom) mtbRoom.textContent = `ROOM: ${SESSION_ID}`;

    if (game.phase === 'lobby') {
        showScreen('lobby'); renderLobbyPlayers(game.players); renderLobbyFooter(game);
    } else {
        showScreen('game');
        syncTilesFromPlayers(game);
        buildBoard(game.tiles);
        initAllOverlayTokens(game.players);
        renderGamePlayers(game.players);
        renderTurnControls();
        renderLogs(game.logs);
        renderChatHistory(game.chat);
        updateMobileTopBar();
        updateMobileDock();
    }
});

socket.on('mono_players_update', ({ players }) => {
    if (!gameState) return;
    gameState.players = players;
    const me = players?.find(p => p.id === MY_ID);
    if (me) { if (me.token) MY_TOKEN = me.token; if (me.avatar) { MY_AVATAR = me.avatar; localStorage.setItem(`mono_${SESSION_ID}`, JSON.stringify({ id: MY_ID, name: MY_NAME, avatar: MY_AVATAR })); } }
    if (gameState.phase === 'lobby') {
        renderLobbyPlayers(players); renderLobbyFooter(gameState);
    } else {
        syncTilesFromPlayers(gameState);
        restoreAllVisuals();
        renderGamePlayers(players);
        syncOverlayTokens(players);
        renderTurnControls();
        updateMobileTopBar();
        updateMobileDock();
        if (CURRENT_SELECTED_TILE) { const t = gameState?.tiles?.find(x => x.id === CURRENT_SELECTED_TILE.id); if (t) showTileDetail(t); }
    }
});

socket.on('mono_game_started', ({ turnIndex }) => {
    gameState.phase = 'playing'; gameState.turnIndex = turnIndex;
    showScreen('game');
    syncTilesFromPlayers(gameState);
    buildBoard(gameState.tiles);
    initAllOverlayTokens(gameState.players);
    renderGamePlayers(gameState.players);
    renderTurnControls();
    renderLogs(gameState.logs);
    updateMobileTopBar(); updateMobileDock();
});

socket.on('mono_turn_changed', ({ turnIndex }) => {
    if (!gameState) return;
    gameState.turnIndex = turnIndex;
    gameState.diceRolledThisTurn = false;
    gameState.doublesCount = 0;
    gameState.actionDoneThisTurn = false;
    gameState.actedTileThisTurn = null;
    renderGamePlayers(gameState.players);
    renderTurnControls();
    clearDoublesBanner();
    updateMobileTopBar(); updateMobileDock();
});

socket.on('mono_action_status', ({ actionDoneThisTurn, actedTileThisTurn }) => {
    if (!gameState) return;
    gameState.actionDoneThisTurn = actionDoneThisTurn;
    gameState.actedTileThisTurn = actedTileThisTurn;
    renderTurnControls();
    if (CURRENT_SELECTED_TILE) {
        const t = gameState?.tiles?.find(x => x.id === CURRENT_SELECTED_TILE.id) || BOARD_TILES?.[CURRENT_SELECTED_TILE.id];
        if (t) showTileDetail(t, false);
    }
});

// ─── Dice State ────────────────────────────────────────────────────────────────
let lastDiceRoll = { d1: 0, d2: 0 };

// Dot positions per face number
const DICE_DOT_PATTERNS = {
    1: ['cc'],
    2: ['tr','bl'],
    3: ['tr','cc','bl'],
    4: ['tl','tr','bl','br'],
    5: ['tl','tr','cc','bl','br'],
    6: ['tl','tr','ml','mr','bl','br'],
};

function renderDieFace(el, num) {
    if (!el) return;
    el.innerHTML = '';
    const dots = DICE_DOT_PATTERNS[num] || DICE_DOT_PATTERNS[1];
    dots.forEach(pos => {
        const dot = document.createElement('span');
        dot.className = `die-dot dp-${pos}`;
        el.appendChild(dot);
    });
}

// Initialize dice to face 1 on load
window.addEventListener('DOMContentLoaded', () => {
    renderDieFace(document.getElementById('dice1'), 1);
    renderDieFace(document.getElementById('dice2'), 1);
});

socket.on('mono_dice_rolled', ({ d1, d2, isDoubles, playerId }) => {
    SFX.roll();
    lastDiceRoll = { d1, d2 };
    isRollingAnimation = true;
    if (gameState) {
        const curr = gameState.players?.[gameState.turnIndex];
        const isInJail = curr?.inJail;
        if (isDoubles && !isInJail && (gameState.doublesCount || 0) < 2) {
            gameState.doublesCount = (gameState.doublesCount || 0) + 1;
            gameState.diceRolledThisTurn = false;
        } else {
            gameState.diceRolledThisTurn = true;
            gameState.doublesCount = 0;
        }
    }
    animateDice2D(d1, d2, isDoubles);
});

// ─── 2D Dice Animation (shake + correct dot face) ──────────────────────────
function animateDice2D(d1, d2, isDoubles) {
    const die1 = document.getElementById('dice1');
    const die2 = document.getElementById('dice2');
    if (!die1 || !die2) { isRollingAnimation = false; flushActionQueue(); return; }

    clearDoublesBanner();

    // Remove previous animation classes
    die1.classList.remove('rolling', 'landing');
    die2.classList.remove('rolling', 'landing');

    // Force reflow so animation restarts
    void die1.offsetWidth;

    // Start shake animation
    die1.classList.add('rolling');
    die2.classList.add('rolling');

    // Cycle through random dot faces during shake
    let tick = 0;
    const maxTicks = 14;
    const tickInterval = setInterval(() => {
        const r1 = Math.floor(Math.random() * 6) + 1;
        const r2 = Math.floor(Math.random() * 6) + 1;
        renderDieFace(die1, r1);
        renderDieFace(die2, r2);
        tick++;
        if (tick >= maxTicks) clearInterval(tickInterval);
    }, 65);

    // After shake animation ends, show correct face with landing bounce
    setTimeout(() => {
        clearInterval(tickInterval);
        die1.classList.remove('rolling');
        die2.classList.remove('rolling');

        // Render correct faces
        renderDieFace(die1, d1);
        renderDieFace(die2, d2);

        // Trigger landing bounce
        void die1.offsetWidth; // reflow
        die1.classList.add('landing');
        die2.classList.add('landing');

        if (isDoubles) {
            setTimeout(() => { SFX.doubles(); showDoublesBanner(); triggerScreenFlash('gold'); }, 100);
        }

        // Clean up and flush queue
        setTimeout(() => {
            die1.classList.remove('landing');
            die2.classList.remove('landing');
            isRollingAnimation = false;
            renderTurnControls(); // ← Show End Turn button now
            updateMobileDock();
            flushActionQueue();
        }, 450);
    }, 1000);
}

// ─── Action Queue ──────────────────────────────────────────────────────────────
let isRollingAnimation = false;
let isTokenMoving      = false;
let actionQueue = [];

function queueOrExecute(fn) {
    if (isRollingAnimation || isTokenMoving) { actionQueue.push(fn); } else { fn(); }
}
function flushActionQueue() {
    while (actionQueue.length > 0 && !isRollingAnimation && !isTokenMoving) {
        const fn = actionQueue.shift();
        fn();
    }
    // After draining queue, re-render controls if all animations done
    if (!isRollingAnimation && !isTokenMoving) {
        renderTurnControls();
        updateMobileDock();
    }
}


function showDoublesBanner() { document.getElementById('doubles-banner')?.classList.add('show'); }
function clearDoublesBanner() { document.getElementById('doubles-banner')?.classList.remove('show'); }

// ─── Overlay Token System ─────────────────────────────────────────────────────
const overlayTokens = {}; // playerId → DOM element

function getOrCreateOverlayToken(player) {
    const existingEl = document.getElementById(`overlay-tok-${player.id}`);
    if (existingEl) { overlayTokens[player.id] = existingEl; return existingEl; }

    const el = document.createElement('div');
    el.className = 'overlay-token';
    el.id = `overlay-tok-${player.id}`;
    el.textContent = player.token || '⬜';
    if (player.color) {
        el.style.borderColor = player.color;
        el.style.boxShadow = `0 3px 10px rgba(0,0,0,0.7), 0 0 10px ${player.color}55`;
    }

    const overlay = document.getElementById('board-token-overlay');
    if (overlay) overlay.appendChild(el);
    overlayTokens[player.id] = el;
    return el;
}

function initAllOverlayTokens(players) {
    const overlay = document.getElementById('board-token-overlay');
    if (overlay) overlay.innerHTML = '';
    Object.keys(overlayTokens).forEach(k => delete overlayTokens[k]);

    if (!players) return;
    players.forEach(p => {
        if (p.bankrupt) return;
        const el = getOrCreateOverlayToken(p);
        const pos = getTileCenter(p.pos);
        if (pos) {
            el.style.transition = 'none';
            el.style.left = pos.x + 'px';
            el.style.top  = pos.y + 'px';
            requestAnimationFrame(() => { el.style.transition = ''; });
        }
    });
}

function syncOverlayTokens(players) {
    if (!players) return;
    players.forEach(p => {
        if (p.bankrupt) {
            const el = document.getElementById(`overlay-tok-${p.id}`);
            if (el) { el.style.display = 'none'; }
            return;
        }
        const el = getOrCreateOverlayToken(p);
        el.textContent = p.token || '⬜';
        // Position without animation if already placed
        if (!el.style.left || el.style.left === '0px') {
            const pos = getTileCenter(p.pos);
            if (pos) { el.style.transition = 'none'; el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px'; requestAnimationFrame(() => { el.style.transition = ''; }); }
        }
    });
}

function getTileCenter(tileId) {
    const board = document.getElementById('monopoly-board');
    const tile  = document.getElementById(`tile-${tileId}`);
    if (!board || !tile) return null;
    const boardRect = board.getBoundingClientRect();
    const tileRect  = tile.getBoundingClientRect();
    return {
        x: tileRect.left - boardRect.left + tileRect.width  / 2,
        y: tileRect.top  - boardRect.top  + tileRect.height / 2,
    };
}

// ─── Step-by-Step Token Movement ─────────────────────────────────────────────
socket.on('mono_player_moved', ({ playerId, pos }) => {
    const p = gameState?.players?.find(x => x.id === playerId);
    if (!p) return;

    const fromPos  = p.pos;
    const diceTotal = lastDiceRoll.d1 + lastDiceRoll.d2;
    const expectedPos = (fromPos + diceTotal) % 40;
    const isNormalMove = diceTotal > 0 && expectedPos === pos;

    p.pos = pos;

    queueOrExecute(() => {
        if (isNormalMove && diceTotal <= 12) {
            animateTokenStep(p, fromPos, pos, diceTotal);
        } else {
            // Teleport (card, jail, etc.)
            const el = getOrCreateOverlayToken(p);
            el.style.transition = 'none';
            const newPos = getTileCenter(pos);
            if (newPos) { el.style.left = newPos.x + 'px'; el.style.top = newPos.y + 'px'; }
            setTimeout(() => {
                el.style.transition = '';
                el.classList.add('bouncing');
                setTimeout(() => el.classList.remove('bouncing'), 380);
                isTokenMoving = false;
                flushActionQueue();
            }, 60);
            renderGamePlayers(gameState?.players);
        }
    });
});

function animateTokenStep(player, fromPos, toPos, diceTotal) {
    const el = getOrCreateOverlayToken(player);
    isTokenMoving = true;

    // Build path of tiles visited
    const path = [];
    let cur = fromPos;
    for (let i = 0; i < diceTotal; i++) {
        cur = (cur + 1) % 40;
        path.push(cur);
    }

    let stepIdx = 0;
    const stepDelay = diceTotal > 8 ? 160 : 210;

    function doNextStep() {
        if (stepIdx >= path.length) {
            // Arrived — bounce
            el.classList.add('bouncing');
            setTimeout(() => el.classList.remove('bouncing'), 380);
            isTokenMoving = false;
            renderGamePlayers(gameState?.players);
            flushActionQueue();
            return;
        }

        const tileId = path[stepIdx++];
        const pos = getTileCenter(tileId);
        if (pos) { el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px'; }

        // Small step SFX every other step
        if (sfxOn && stepIdx % 2 === 0) SFX.step(stepIdx);

        // Passed GO?
        if (tileId === 0 && stepIdx < path.length) {
            showFloatingText(0, '+$200 GO! 🏁', '#34d399');
            SFX.go();
        }

        setTimeout(doNextStep, stepDelay);
    }

    doNextStep();
}

// ─── Socket: Game Events ──────────────────────────────────────────────────────
socket.on('mono_log', (entry) => {
    if (gameState) gameState.logs = [...(gameState.logs || []), entry];
    appendLog(entry);
    if (['rent', 'tax', 'bad', 'bankrupt'].includes(entry.type) || entry.text.includes('bayar') || entry.text.includes('membayar') || entry.text.includes('denda')) {
        showAnnouncement(`${entry.icon || '📌'} ${entry.text}`);
    }
});

socket.on('mono_tile_updated', ({ tileId, ownerId, color, houses }) => {
    updateTileVisual(tileId, ownerId, color, houses);
    updateAllProperties();
    // If just bought (new owner), show confetti
    if (ownerId) {
        const prevOwner = gameState?.tiles?.find(t => t.id === tileId)?.owner;
        if (!prevOwner) {
            const tile = gameState?.tiles?.find(t => t.id === tileId);
            triggerConfetti(tileId, color || (tile?.group ? GROUP_COLORS[tile.group] : '#f0c040'));
            SFX.buy();
        }
    }
    if (gameState?.tiles) { const t = gameState.tiles.find(x => x.id === tileId); if (t) { t.owner = ownerId; t.houses = houses || 0; } }
    if (CURRENT_SELECTED_TILE && CURRENT_SELECTED_TILE.id === tileId) { const t = gameState?.tiles?.find(x => x.id === tileId); if (t) showTileDetail(t); }
});

socket.on('mono_action_prompt', ({ type, tile }) => {
    queueOrExecute(() => {
        if (type === 'buy') {
            showModal(`
                <div class="modal-title">🏛️ Beli Properti?</div>
                <div class="modal-desc"><strong>${tile.name}</strong> masih kosong!<br>Harga: <span style="color:var(--green);font-weight:700;">$${tile.price}</span></div>
                <div class="modal-btns">
                    <button class="btn-act btn-roll-dice" onclick="confirmBuy()">🏠 Beli ($${tile.price})</button>
                    <button class="btn-act btn-secondary" onclick="closeModal()">Lewati</button>
                </div>
            `);
        }
    });
});

socket.on('mono_card_drawn', ({ card, type, playerId }) => {
    queueOrExecute(() => {
        SFX.card();
        if (playerId === MY_ID) {
            const icon  = type === 'chance' ? '❓' : '📦';
            const label = type === 'chance' ? 'Kartu Kesempatan' : 'Dana Umum';
            showModal(`
                <div class="card-draw-box">
                    <div class="card-draw-icon">${icon}</div>
                    <div class="card-draw-type">${label}</div>
                    <div class="card-draw-title">"${card.title}"</div>
                    <div class="card-draw-text">${card.text}</div>
                    <button class="btn-act btn-roll-dice" onclick="closeModal()">✓ Mengerti</button>
                </div>
            `);
        } else {
            const p = gameState?.players?.find(x => x.id === playerId);
            showAnnouncement(`🃏 ${p ? p.name : 'Pemain'} mendapat kartu ${type === 'chance' ? 'Kesempatan' : 'Dana Umum'}: "${card.title}"`);
        }
    });
});

socket.on('mono_rent_paid', ({ fromId, fromName, toName, amount }) => {
    SFX.rent();
    showAnnouncement(`💸 ${fromName} bayar sewa $${amount} ke ${toName}!`);
    // Show floating -$ on rented tile (show on from player's current position)
    const payer = gameState?.players?.find(p => p.id === fromId);
    if (payer) showFloatingText(payer.pos, `-$${amount}`, '#f43f5e');
    triggerScreenFlash('red');
});

socket.on('mono_went_to_jail', ({ playerName }) => {
    SFX.jail();
    showAnnouncement(`🚔 ${playerName} masuk PENJARA!`);
    triggerScreenFlash('red');
});

socket.on('mono_passed_go', ({ playerName }) => {
    SFX.go();
    showAnnouncement(`✅ ${playerName} melewati GO! +$200 🎉`);
    const p = gameState?.players?.find(x => x.name === playerName);
    if (p) showFloatingText(0, '+$200 🏁', '#34d399');
    triggerScreenFlash('blue');
});

socket.on('mono_player_bankrupt', ({ playerName }) => {
    showAnnouncement(`💀 ${playerName} BANGKRUT dan keluar dari permainan!`);
    renderGamePlayers(gameState?.players);
    // Hide their overlay token
    const p = gameState?.players?.find(x => x.name === playerName);
    if (p) { const el = document.getElementById(`overlay-tok-${p.id}`); if (el) { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(0)'; } }
});

socket.on('mono_game_ended', ({ winner }) => {
    SFX.win();
    triggerScreenFlash('gold');
    showModal(`
        <div style="font-size:3.5rem;margin-bottom:10px;">👑</div>
        <div class="modal-title" style="color:var(--gold);">PEMENANG!</div>
        <img src="${winner.avatar}" style="width:64px;height:64px;border-radius:50%;border:3px solid var(--gold);margin:10px auto;display:block;">
        <div style="font-size:1.3rem;font-weight:800;margin-bottom:8px;">${winner.name}</div>
        <div style="color:var(--text-dim);font-size:0.85rem;margin-bottom:20px;">Menguasai Monopoly Negara Dunia! 🌍</div>
        <div style="color:var(--gold);font-weight:700;font-size:0.95rem;padding:10px;background:rgba(255,215,0,0.1);border-radius:12px;border:1px solid rgba(255,215,0,0.3);">🎉 Permainan Telah Berakhir 🎉</div>
    `);
});

socket.on('mono_chat_msg', (msg) => {
    if (gameState) gameState.chat = [...(gameState.chat || []), msg];
    appendChatMsg(msg);
});

// ─── Lobby Rendering ──────────────────────────────────────────────────────────
function renderLobbyPlayers(players) {
    const grid  = document.getElementById('lobby-player-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const COUNT = document.getElementById('lobby-player-count');
    if (COUNT) COUNT.textContent = players.length;
    const amHost = gameState?.host === MY_ID;

    players.forEach(p => {
        const card = document.createElement('div');
        card.className = 'lobby-player-card' + (p.id === MY_ID ? ' is-me' : '');
        const avatarUrl = p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`;
        const displayToken = (p.id === MY_ID) ? MY_TOKEN : (p.token || '🎩');
        const canKick = amHost && p.id !== MY_ID;
        card.innerHTML = `
            <div class="lp-avatar-wrap">
                <img src="${avatarUrl}" alt="${p.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random'">
                <div class="lp-token" id="lp-token-${p.id}">${displayToken}</div>
            </div>
            <div class="lp-info">
                <div class="lp-name">${p.name}${p.id === gameState?.host ? '<span class="lp-host-badge">HOST</span>' : ''}</div>
                <div class="lp-money">$${p.money || 1500}</div>
            </div>
            ${canKick ? `<button class="btn-kick" onclick="kickPlayer('${p.id}')" title="Kick ${p.name}">🥾</button>` : ''}
        `;
        grid.appendChild(card);
    });

    for (let i = players.length; i < 4; i++) {
        const slot = document.createElement('div');
        slot.className = 'lobby-player-slot';
        slot.textContent = `Menunggu pemain ${i + 1}...`;
        grid.appendChild(slot);
    }

    renderTokenOptions(players);
}

function renderLobbyFooter(game) {
    const footer = document.getElementById('lobby-footer');
    if (!footer) return;
    if (game.host === MY_ID) {
        const canStart = game.players.length >= 2;
        footer.innerHTML = `
            <button class="btn-primary btn-start-game" onclick="startGame()" ${!canStart ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
                ▶️ Mulai Game (${game.players.length}/4)
            </button>
            <button class="btn-danger" onclick="confirmEndSession()">🔚 End Session</button>
        `;
    } else {
        footer.innerHTML = `
            <p style="color:var(--text-muted);font-size:0.85rem;">Menunggu Host untuk memulai...</p>
            <button class="btn-danger" onclick="leaveRoom()">🚪 Keluar dari Room</button>
        `;
    }
}

// ─── Game Player List ─────────────────────────────────────────────────────────
function renderGamePlayers(players) {
    const ids = ['game-player-list', 'msp-player-list'];
    const gc  = document.getElementById('game-player-count');
    if (gc && players) gc.textContent = players.filter(p => !p.bankrupt).length;
    const currPlayer = players?.[gameState?.turnIndex];

    ids.forEach(id => {
        const list = document.getElementById(id);
        if (!list || !players) return;
        list.innerHTML = '';
        players.forEach(p => {
            const card = document.createElement('div');
            card.className = 'game-player-card';
            if (currPlayer && currPlayer.id === p.id && gameState?.phase === 'playing') card.classList.add('is-active');
            if (p.bankrupt) card.classList.add('is-bankrupt');
            const avatarUrl = p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`;
            card.innerHTML = `
                <div class="gpc-avatar">
                    <img src="${avatarUrl}" alt="${p.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random'">
                    <div class="gpc-token-dot">${p.token || '🎩'}</div>
                </div>
                <div class="gpc-info">
                    <div class="gpc-name">${p.name}${p.id === gameState?.host ? ' 👑' : ''}</div>
                    <div class="gpc-money">$${p.money}</div>
                    ${p.inJail ? '<span class="gpc-jail-tag">🔒 Penjara</span>' : ''}
                </div>
            `;
            list.appendChild(card);
        });
    });

    updateMobileDock();
}

// ─── Turn Controls ────────────────────────────────────────────────────────────
function renderTurnControls() {
    const nameEls = [document.getElementById('turn-name'), document.getElementById('turn-name-mobile')];
    const actEls  = [document.getElementById('turn-actions'), document.getElementById('turn-actions-mobile'), document.getElementById('dock-actions')];

    actEls.forEach(el => { if (el) el.innerHTML = ''; });

    if (!gameState || gameState.phase === 'lobby') {
        nameEls.forEach(el => { if (el) el.textContent = 'Lobby — Menunggu Mulai'; });
        if (gameState?.host === MY_ID) {
            actEls.forEach(el => { if (el) el.innerHTML = `<button class="btn-act btn-start-game" onclick="startGame()">▶️ Mulai</button>`; });
        }
        return;
    }
    if (gameState.phase === 'ended') {
        nameEls.forEach(el => { if (el) el.textContent = 'Permainan Selesai!'; }); return;
    }

    const curr = gameState.players[gameState.turnIndex];
    if (!curr) return;
    nameEls.forEach(el => { if (el) el.textContent = `${curr.token || ''} ${curr.name}`; });

    const currTile = gameState?.tiles?.find(t => t && t.id === curr.pos) || BOARD_TILES?.[curr.pos];
    if (currTile) {
        showTileDetail(currTile, false);
    }

    let buildBtnHtml = '';
    if (curr.id === MY_ID && currTile && currTile.type === 'property' && currTile.owner === MY_ID) {
        const myProp = curr.properties?.[curr.pos];
        if (myProp && !myProp.hotel) {
            if (!gameState.diceRolledThisTurn) {
                buildBtnHtml = `<button class="btn-act" style="background:rgba(255,255,255,0.08);color:var(--text-muted);border:1px dashed var(--border);cursor:not-allowed;" disabled title="Harus kocok dadu & mampir setelah berjalan">⏳ Roll & Mampir Dulu</button>`;
            } else if (myProp.justBought) {
                buildBtnHtml = `<button class="btn-act" style="background:rgba(255,255,255,0.08);color:var(--text-muted);border:1px dashed var(--border);cursor:not-allowed;" disabled title="Baru dibeli. Harus keliling putar papan dulu">⏳ Baru Beli (Mutar Dulu)</button>`;
            } else if (gameState.actionDoneThisTurn || gameState.actedTileThisTurn === curr.pos) {
                buildBtnHtml = `<button class="btn-act" style="background:rgba(255,255,255,0.08);color:var(--text-muted);border:1px dashed var(--border);cursor:not-allowed;" disabled title="Maksimal 1 aksi beli/bangun per giliran">✅ Sudah Aksi Turn Ini</button>`;
            } else {
                const nextBld = (myProp.houses || 0) < 4 ? `🏠 Bangun (${(myProp.houses||0)+1}/4)` : `🏨 Upgrade Hotel`;
                buildBtnHtml = `<button class="btn-act" style="background:linear-gradient(135deg,#34d399,#059669);color:#fff;font-weight:800;border:1px solid #10b981;" onclick="buildHouse(${curr.pos})" title="Harga: $${currTile.housePrice}">${nextBld} ($${currTile.housePrice})</button>`;
            }
        }
    }

    let btnsHTML = '';
    if (curr.id === MY_ID) {
        if (gameState.diceRolledThisTurn) {
            btnsHTML = `
                ${buildBtnHtml}
                <button class="btn-act btn-end-turn" onclick="endTurn()" id="btn-end">⏭ Akhiri Giliran</button>
                <button class="btn-act btn-giveup"   onclick="confirmGiveUp()">🏳️ Give Up</button>
            `;
        } else if (curr.inJail) {
            btnsHTML = `
                ${buildBtnHtml}
                <button class="btn-act btn-roll-dice" onclick="rollDice()">🎲 Doubles dari Penjara</button>
                <button class="btn-act btn-jail-bail" onclick="payBail()">💸 Bayar $50</button>
                <button class="btn-act btn-giveup"    onclick="confirmGiveUp()">🏳️ Give Up</button>
            `;
        } else {
            const rollLabel = (gameState.doublesCount > 0) ? `⚡ Kocok Lagi (Doubles #${gameState.doublesCount})` : `🎲 Kocok Dadu`;
            btnsHTML = `
                ${buildBtnHtml}
                <button class="btn-act btn-roll-dice" onclick="rollDice()" id="btn-roll">${rollLabel}</button>
                <button class="btn-act btn-giveup"    onclick="confirmGiveUp()">🏳️ Give Up</button>
            `;
        }
    } else {
        btnsHTML = `
            <span style="font-size:0.75rem;color:var(--text-muted);">Giliran pemain lain...</span>
            <button class="btn-act btn-giveup" onclick="confirmGiveUp()">🏳️ Give Up</button>
        `;
    }

    actEls.forEach(el => { if (el) el.innerHTML = btnsHTML; });
    updateMobileTopBar();
    updateMobileDock();
}

// ─── Mobile UI Updaters ───────────────────────────────────────────────────────
function updateMobileTopBar() {
    const turnEl  = document.getElementById('mtb-turn');
    if (!turnEl || !gameState) return;
    const curr = gameState.players?.[gameState.turnIndex];
    if (curr) turnEl.textContent = `${curr.token || ''} ${curr.name} — Giliran`;
    else turnEl.textContent = 'Menunggu Mulai...';
}

function updateMobileDock() {
    const me = gameState?.players?.find(p => p.id === MY_ID);
    const moneyEl  = document.getElementById('dock-my-money');
    const turnEl   = document.getElementById('dock-turn-name');
    if (moneyEl && me) moneyEl.textContent = `$${me.money || 0}`;
    const curr = gameState?.players?.[gameState?.turnIndex];
    if (turnEl && curr) turnEl.textContent = curr.id === MY_ID ? '⬅ Giliran Kamu!' : `${curr.token || ''} ${curr.name} bermain...`;
}

// ─── Mobile Panel ─────────────────────────────────────────────────────────────
let mspCurrentTab = 'players';

window.openMobilePanel = function(tab = 'players') {
    document.getElementById('mobile-panel-overlay')?.classList.add('show');
    document.getElementById('mobile-slide-panel')?.classList.add('open');
    switchMobileTab(tab);
    // Sync MSP assets list
    const mspAssets = document.getElementById('msp-assets-list');
    const mainAssets = document.getElementById('my-props-list');
    if (mspAssets && mainAssets) mspAssets.innerHTML = mainAssets.innerHTML;
};

window.closeMobilePanel = function() {
    document.getElementById('mobile-panel-overlay')?.classList.remove('show');
    document.getElementById('mobile-slide-panel')?.classList.remove('open');
};

window.switchMobileTab = function(tab) {
    mspCurrentTab = tab;
    ['players','tile','assets','log','chat'].forEach(t => {
        document.getElementById(`msp-tab-${t}`)?.classList.toggle('active', t === tab);
        document.getElementById(`msp-panel-${t}`)?.classList.toggle('hidden', t !== tab);
    });
    // Sync content
    if (tab === 'assets') {
        const mspAssets = document.getElementById('msp-assets-list');
        const mainAssets = document.getElementById('my-props-list');
        if (mspAssets && mainAssets) mspAssets.innerHTML = mainAssets.innerHTML;
    }
};

// ─── Board Building ───────────────────────────────────────────────────────────
const GROUP_COLORS = {
    brown:    '#8d6e63', lightblue:'#29b6f6', pink:'#ec407a',
    orange:   '#ffa726', red:'#ef5350',       yellow:'#ffee58',
    green:    '#66bb6a', darkblue: '#5c6bc0'
};
const TYPE_ICONS = {
    go:       '🏁', jail:'🔒', parking:'🅿️', gotojail:'🚔',
    tax:      '💸', chance:'❓', chest:'📦',
    railway:  '✈️', utility:'⚡'
};

function getGridCoords(id) {
    if (id === 0)  return { r: 11, c: 11 };
    if (id >= 1  && id <= 9)  return { r: 11, c: 11-id };
    if (id === 10) return { r: 11, c: 1  };
    if (id >= 11 && id <= 19) return { r: 21-id, c: 1  };
    if (id === 20) return { r: 1,  c: 1  };
    if (id >= 21 && id <= 29) return { r: 1,  c: id-19};
    if (id === 30) return { r: 1,  c: 11 };
    if (id >= 31 && id <= 39) return { r: id-29, c: 11};
    return { r: 1, c: 1 };
}

function getTileOrientation(id) {
    if (id === 0 || id === 10 || id === 20 || id === 30) return 'corner';
    if (id >= 1  && id <= 9)  return 'bottom';
    if (id >= 11 && id <= 19) return 'left';
    if (id >= 21 && id <= 29) return 'top';
    if (id >= 31 && id <= 39) return 'right';
    return 'bottom';
}

function buildBoard(tiles) {
    const board = document.getElementById('monopoly-board');
    board.querySelectorAll('.tile').forEach(e => e.remove());

    tiles.forEach(tile => {
        const el  = document.createElement('div');
        el.className = 'tile';
        el.id = `tile-${tile.id}`;
        const { r, c } = getGridCoords(tile.id);
        el.style.gridRow    = r;
        el.style.gridColumn = c;

        const orient = getTileOrientation(tile.id);
        const color  = tile.group ? GROUP_COLORS[tile.group] : null;

        if (orient === 'corner') {
            el.classList.add('tile-corner');
            const icon = TYPE_ICONS[tile.type] || '🔲';
            el.innerHTML = `<div class="tile-corner-label">${icon}<br>${tile.name}</div><div class="tile-tokens" id="tok-${tile.id}"></div>`;
        } else if (color) {
            let stripeHTML = '';
            if (orient === 'bottom' || orient === 'top') {
                stripeHTML = `<div class="tile-stripe" style="background:${color}; order:${orient==='bottom'?-1:10};"></div>`;
            } else {
                el.style.borderLeft  = orient === 'left'  ? `5px solid ${color}` : '';
                el.style.borderRight = orient === 'right' ? `5px solid ${color}` : '';
            }
            el.innerHTML = `${stripeHTML}<div class="tile-name">${tile.name}</div><div class="tile-price">$${tile.price}</div><div class="tile-tokens" id="tok-${tile.id}"></div>`;
        } else {
            const icon = TYPE_ICONS[tile.type] || '⬜';
            el.innerHTML = `<div class="tile-icon">${icon}</div><div class="tile-name">${tile.name}</div><div class="tile-tokens" id="tok-${tile.id}"></div>`;
        }

        el.addEventListener('click', () => showTileDetail(tile, true));
        board.appendChild(el);
    });

    if (gameState?.players) renderTokensOnBoard(gameState.players);
    restoreAllVisuals();
}

function syncTilesFromPlayers(game) {
    if (!game || !game.players || !game.tiles) return;
    game.tiles.forEach(t => { t.owner = null; t.houses = 0; t.hotel = false; });
    game.players.forEach(p => {
        if (p.bankrupt || !p.properties) return;
        Object.keys(p.properties).forEach(tid => {
            const numId = Number(tid);
            const tile = game.tiles.find(t => t.id === numId);
            if (tile) { tile.owner = p.id; tile.houses = p.properties[tid].houses || 0; tile.hotel = p.properties[tid].hotel || false; }
        });
    });
}

function restoreAllVisuals() {
    if (!gameState || !gameState.tiles) return;
    gameState.tiles.forEach(t => {
        if (t.owner) {
            const p = gameState.players?.find(x => x.id === t.owner);
            if (p) updateTileVisual(t.id, t.owner, p.color, t.hotel ? 5 : (t.houses || 0));
        } else {
            updateTileVisual(t.id, null, null, 0);
        }
    });
    updateAllProperties();
}

function renderTokensOnBoard(players) {
    document.querySelectorAll('.tile-tokens').forEach(el => el.innerHTML = '');
    if (!players) return;
    // Static tokens in tiles (shown only when overlay not active)
    // Keep as fallback — overlay tokens are the visual primary
}

function updateTileVisual(tileId, ownerId, color, houses) {
    const tile  = document.getElementById(`tile-${tileId}`);
    if (!tile) return;
    const owner = gameState?.players?.find(p => p.id === ownerId);

    let badge = tile.querySelector('.owner-badge');
    if (ownerId && color && owner) {
        if (!badge) { badge = document.createElement('div'); badge.className = 'owner-badge'; tile.appendChild(badge); }
        badge.textContent = owner.token || '👑';
        badge.style.background = color;
        tile.style.boxShadow     = `inset 0 0 14px ${color}66`;
        tile.style.backgroundColor = `${color}28`;
    } else {
        if (badge) badge.remove();
        tile.style.boxShadow = '';
        tile.style.backgroundColor = '';
    }

    tile.querySelector('.tile-buildings')?.remove();
    if (houses > 0) {
        const bld = document.createElement('div');
        bld.className = 'tile-buildings';
        if (houses >= 5) {
            const h = document.createElement('div'); h.className = 'hotel-peg'; bld.appendChild(h);
        } else {
            for (let i = 0; i < houses; i++) { const h = document.createElement('div'); h.className = 'house-peg'; bld.appendChild(h); }
        }
        tile.appendChild(bld);
    }
}

function updateAllProperties() {
    const listIds = ['my-props-list', 'msp-assets-list'];
    listIds.forEach(id => {
        const list = document.getElementById(id);
        if (!list || !gameState || !gameState.players) return;
        let totalOwned = 0, html = '';
        gameState.players.forEach(p => {
            if (p.bankrupt) return;
            const ownedTiles = (gameState.tiles || []).filter(t => t.owner === p.id);
            if (ownedTiles.length > 0) {
                totalOwned += ownedTiles.length;
                html += `
                    <div style="margin-bottom:10px; background:rgba(255,255,255,0.04); padding:8px 10px; border-radius:10px; border-left:3px solid ${p.color || '#aaa'};">
                        <div style="font-weight:700; font-size:0.82rem; color:white; margin-bottom:6px;">${p.token || ''} ${p.name} <span style="color:var(--green); font-size:0.75rem;">($${p.money})</span></div>
                        <div style="display:flex; flex-wrap:wrap; gap:4px;">
                            ${ownedTiles.map(t => {
                                const badge = t.hotel ? '🏨' : t.houses ? `🏠x${t.houses}` : '';
                                return `<span style="font-size:0.7rem; background:rgba(0,0,0,0.45); padding:3px 7px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); color:var(--text-dim);">${t.name} ${badge}</span>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        });
        list.innerHTML = totalOwned === 0 ? '<p class="tile-detail-hint">Belum ada tanah/aset dibeli.</p>' : html;
    });
}

// ─── Tile Detail Sidebar ──────────────────────────────────────────────────────
let CURRENT_SELECTED_TILE = null;

function hasCompleteColorSetClient(player, group) {
    if (!group || !player || !player.properties || !gameState?.tiles) return false;
    const groupTiles = gameState.tiles.filter(t => t && t.group === group);
    if (groupTiles.length === 0) return false;
    return groupTiles.every(t => player.properties[t.id]);
}

function showTileDetail(tile, autoOpenMobile = false) {
    CURRENT_SELECTED_TILE = tile;
    if (!tile) return;
    const color  = tile.group ? GROUP_COLORS[tile.group] : null;
    const owner  = gameState?.players?.find(p => p.id === tile.owner);
    const me     = gameState?.players?.find(p => p.id === MY_ID);
    const isMine = tile.owner === MY_ID && tile.type === 'property';
    const myProp = isMine ? me?.properties?.[tile.id] : null;
    const hasSet = owner && tile.group && hasCompleteColorSetClient(owner, tile.group);
    const mult   = hasSet ? 2 : 1;

    let actionHtml = '';
    if (isMine && myProp && !myProp.hotel) {
        const isMyTurn = gameState?.players?.[gameState.turnIndex]?.id === MY_ID;
        const isOnTile = me?.pos === tile.id;
        if (!isMyTurn) {
            actionHtml = `<div class="tile-detail-hint" style="margin-top:10px;">⏳ Hanya bisa membangun saat giliranmu.</div>`;
        } else if (!isOnTile) {
            actionHtml = `<div class="tile-detail-hint" style="margin-top:10px;">📍 Pionmu harus berada di petak ini untuk membangun.</div>`;
        } else if (!gameState?.diceRolledThisTurn) {
            actionHtml = `<div class="tile-detail-hint" style="color:#ffaa00;font-weight:700;margin-top:10px;">⏳ Kamu harus mengocok dadu dan berjalan terlebih dahulu. Tidak bisa langsung membangun di awal giliran sebelum pindah/mampir!</div>`;
        } else if (myProp.justBought) {
            actionHtml = `<div class="tile-detail-hint" style="color:#ffaa00;font-weight:700;margin-top:10px;">⏳ Lahan ini baru saja kamu beli pada putaran/kunjungan ini! Kamu harus memutar keliling papan dulu dan mampir lagi ke sini pada putaran berikutnya untuk bisa membangun rumah/hotel.</div>`;
        } else if (gameState?.actionDoneThisTurn || gameState?.actedTileThisTurn === tile.id) {
            actionHtml = `<div class="tile-detail-hint" style="color:#ffaa00;font-weight:700;margin-top:10px;">✅ Giliran ini kamu sudah melakukan pembangunan di sini (Maks 1x per giliran). Tunggu giliran berikutnya saat kamu mampir ke sini lagi!</div>`;
        } else {
            const nextBld = (myProp.houses || 0) < 4 ? `🏠 Bangun Rumah (${(myProp.houses||0)+1}/4)` : `🏨 Upgrade ke HOTEL Mewah`;
            actionHtml = `<button class="btn-act btn-start-game" style="width:100%; margin-top:10px; padding:10px; font-size:0.95rem; font-weight:800; white-space:normal; height:auto; line-height:1.4;" onclick="buildHouse(${tile.id}); closeMobilePanel();">🏗️ ${nextBld} <br><span style="font-size:0.8rem;opacity:0.85;">Harga: $${tile.housePrice}</span></button>`;
        }
    } else if (isMine && myProp?.hotel) {
        actionHtml = `<div class="tile-detail-hint" style="color:var(--red);font-weight:700;margin-top:10px;">👑 Sudah mencapai level HOTEL maksimal!</div>`;
    }

    const htmlContent = `
        ${color ? `<div style="background:${color};height:6px;border-radius:4px;margin-bottom:10px;"></div>` : ''}
        <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px;">${tile.name}</div>
        ${tile.price ? `<div style="color:var(--green);font-weight:700;font-size:0.85rem;margin-bottom:6px;">Harga: $${tile.price}</div>` : ''}
        ${owner ? `<div style="font-size:0.74rem;color:var(--gold);margin-bottom:8px;">Pemilik: ${owner.token} ${owner.name} ${hasSet ? '<span style="color:#ff5555;font-weight:800;">(1 Set! Sewa x2)</span>' : ''}</div>` : ''}
        ${tile.rent ? `
            <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:8px;font-size:0.73rem;color:var(--text-dim);">
                <div style="margin-bottom:2px; ${hasSet ? 'color:#ffaa00;font-weight:700;' : ''}">Sewa Dasar ${hasSet ? '(x2)' : ''}: $${tile.rent[0] * mult}</div>
                <div style="margin-bottom:2px;">1 Rumah: $${tile.rent[1] * mult}</div>
                <div style="margin-bottom:2px;">2 Rumah: $${tile.rent[2] * mult}</div>
                <div style="margin-bottom:2px;">3 Rumah: $${tile.rent[3] * mult}</div>
                <div style="margin-bottom:2px;">4 Rumah: $${tile.rent[4] * mult}</div>
                <div style="color:var(--red);font-weight:700;">Hotel: $${tile.rent[5] * mult}</div>
            </div>
        ` : tile.desc ? `<div style="font-size:0.78rem;color:var(--text-dim);line-height:1.5;">${tile.desc}</div>` : ''}
        ${actionHtml}
    `;

    ['tile-detail-box', 'tile-detail-box-msp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = htmlContent;
    });

    if (autoOpenMobile && window.innerWidth <= 768) {
        openMobilePanel('tile');
    }
}

function buildHouse(tileId) {
    SFX.buy();
    socket.emit('mono_build_house', { sessionId: SESSION_ID, discordId: MY_ID, tileId });
}

// ─── Log Rendering ────────────────────────────────────────────────────────────
function renderLogs(logs) {
    ['log-scroll', 'log-scroll-mobile', 'log-scroll-msp'].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerHTML = '';
    });
    (logs || []).forEach(entry => appendLog(entry));
}

function appendLog(entry) {
    ['log-scroll', 'log-scroll-mobile', 'log-scroll-msp'].forEach(id => {
        const scroll = document.getElementById(id);
        if (!scroll) return;
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span>${entry.icon || '📌'}</span><span style="flex:1;">${entry.text}</span><span class="log-time">${entry.time || ''}</span>`;
        scroll.appendChild(div);
        scroll.scrollTop = scroll.scrollHeight;
    });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
function sendChat(e, mode) {
    e.preventDefault();
    const inputId = mode === 'lobby' ? 'lobby-chat-input' : mode === 'msp' ? 'msp-chat-input' : 'game-chat-input';
    const input = document.getElementById(inputId);
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';
    socket.emit('mono_chat', { sessionId: SESSION_ID, discordId: MY_ID, text });
}

function appendChatMsg(msg) {
    ['lobby-chat-scroll', 'game-chat-scroll', 'msp-chat-scroll'].forEach(id => {
        const scroll = document.getElementById(id);
        if (!scroll) return;
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `
            <img src="${msg.avatar}" class="chat-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(msg.name)}'">
            <div class="chat-content">
                <div class="chat-author" style="color:${msg.color || '#f0c040'};">
                    <span>${msg.token || ''} ${msg.name}</span>
                    <span class="chat-time">${msg.time}</span>
                </div>
                <div class="chat-text">${msg.text}</div>
            </div>
        `;
        scroll.appendChild(div);
        scroll.scrollTop = scroll.scrollHeight;
    });
}

function renderChatHistory(chatList) {
    ['lobby-chat-scroll', 'game-chat-scroll', 'msp-chat-scroll'].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerHTML = '';
    });
    (chatList || []).forEach(m => appendChatMsg(m));
}

// ─── Visual Effects ───────────────────────────────────────────────────────────

// Floating money text at a tile position
function showFloatingText(tileIdOrPos, text, color = '#f43f5e') {
    const board = document.getElementById('monopoly-board');
    const tile  = document.getElementById(`tile-${tileIdOrPos}`);
    if (!board || !tile) return;

    const boardRect = board.getBoundingClientRect();
    const tileRect  = tile.getBoundingClientRect();

    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.color = color;
    el.style.left = (tileRect.left + tileRect.width/2) + 'px';
    el.style.top  = (tileRect.top) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

// Confetti burst at a tile
function triggerConfetti(tileId, color = '#f0c040') {
    const tile = document.getElementById(`tile-${tileId}`);
    if (!tile) return;
    const rect = tile.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;

    const colors = [color, '#ffffff', '#f0c040', '#34d399', '#38bdf8'];
    for (let i = 0; i < 18; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-dot';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.left = cx + 'px';
        el.style.top  = cy + 'px';
        const angle = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const dist  = 35 + Math.random() * 45;
        el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        el.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1300);
    }
}

// Screen flash effect
function triggerScreenFlash(type = 'red') {
    const el = document.getElementById('screen-flash');
    if (!el) return;
    el.className = `screen-flash flash-${type}`;
    setTimeout(() => { el.className = 'screen-flash'; }, 600);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function showModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const box     = document.getElementById('modal-box');
    box.innerHTML = html;
    overlay.classList.add('open');
}
function closeModal() { document.getElementById('modal-overlay')?.classList.remove('open'); }

function showHowToPlayModal() {
    showModal(`
        <div class="modal-icon" style="font-size:3rem; margin-bottom:8px;">📖</div>
        <div class="modal-title" style="color:var(--gold); font-size:1.4rem;">Cara Main Monopoly Negara Dunia</div>
        <div class="modal-desc" style="text-align:left; font-size:0.92rem; line-height:1.6; max-height:60vh; overflow-y:auto; padding:10px; margin:10px 0; border-top:1px solid rgba(255,255,255,0.1); border-bottom:1px solid rgba(255,255,255,0.1);">
            <b style="color:#38bdf8;">🎲 Giliran & Lempar Dadu:</b><br>
            • Pada giliranmu, klik tombol <b>🎲 Kocok Dadu</b>. Bidakmu akan berjalan keliling papan sesuai angka dadu.<br>
            • Jika dapat <b>Dadu Kembar (Double)</b>, kamu mendapat ekstra 1 giliran (maksimal 3x berurutan sebelum masuk penjara!).<br><br>
            <b style="color:#10b981;">🏛️ Beli & Bangun Properti:</b><br>
            • Mendarat di negara kosong? Kamu bisa membelinya dari bank.<br>
            • Jika mendarat di negara milik pemain lain, kamu harus membayar <b>Sewa (Rent)</b>.<br>
            • Lengkapi satu blok warna (Monopoli) untuk bisa membangun <b>Rumah 🏠</b> dan <b>Hotel 🏨</b> agar harga sewa melonjak!<br><br>
            <b style="color:#f59e0b;">🔒 Penjara & Petak Khusus:</b><br>
            • <b>Masuk Penjara:</b> Bisa keluar jika bayar denda $50, dapat dadu kembar, atau pakai kartu bebas penjara.<br>
            • <b>Pajak / Peluang / Dana Umum:</b> Hati-hati, kartu bisa memberi keuntungan atau kerugian dadakan!<br><br>
            <b style="color:#ec4899;">👑 Syarat Menang:</b><br>
            • Bangkrutkan pemain lawan dengan membuat mereka kehabisan uang saat membayar sewa!<br>
            • Pemain terakhir yang bertahan dengan harta tertinggi menjadi pemenang utama!
        </div>
        <div class="modal-btns">
            <button class="btn-act btn-roll-dice" style="width:100%;" onclick="closeModal()">✓ Mengerti & Lanjutkan</button>
        </div>
    `);
}
window.showHowToPlayModal = showHowToPlayModal;

// ─── Announcement Banner ──────────────────────────────────────────────────────
let annTimeout = null;
function showAnnouncement(text) {
    const banner = document.getElementById('ann-banner');
    if (!banner) return;
    banner.innerHTML = `<div class="ann-inner">${text}</div>`;
    banner.classList.add('show');
    clearTimeout(annTimeout);
    annTimeout = setTimeout(() => banner.classList.remove('show'), 4500);
}

// ─── Action Emitters ──────────────────────────────────────────────────────────
function startGame()  { socket.emit('mono_start', { sessionId: SESSION_ID, discordId: MY_ID }); }

function rollDice() {
    const btn = document.getElementById('btn-roll');
    if (btn) { btn.disabled = true; setTimeout(() => { if(btn) btn.disabled = false; }, 1500); }
    socket.emit('mono_roll_dice', { sessionId: SESSION_ID, discordId: MY_ID });
}

function endTurn()    { socket.emit('mono_end_turn', { sessionId: SESSION_ID, discordId: MY_ID }); }
function payBail()    { socket.emit('mono_pay_jail_bail', { sessionId: SESSION_ID, discordId: MY_ID }); }

function confirmBuy() {
    SFX.buy();
    socket.emit('mono_buy_property', { sessionId: SESSION_ID, discordId: MY_ID });
    closeModal();
}

// ─── Kick / Leave / End Session / Give Up ─────────────────────────────────────
function kickPlayer(targetId) {
    const target = gameState?.players?.find(p => p.id === targetId);
    if (!target) return;
    showModal(`<div class="modal-title" style="color:var(--red);">🥾 Kick Pemain?</div><div class="modal-desc">Apakah kamu yakin ingin mengeluarkan <strong>${target.name}</strong> dari room?</div><div class="modal-btns"><button class="btn-act btn-end-turn" onclick="doKick('${targetId}')">Ya, Kick!</button><button class="btn-act btn-secondary" onclick="closeModal()">Batal</button></div>`);
}
function doKick(targetId) { socket.emit('mono_kick', { sessionId: SESSION_ID, discordId: MY_ID, targetId }); closeModal(); }

function confirmEndSession() {
    showModal(`<div style="font-size:2.5rem;margin-bottom:10px;">🔚</div><div class="modal-title" style="color:var(--red);">Akhiri Sesi?</div><div class="modal-desc">Room dan semua data game akan dihapus permanen. Semua pemain akan dikeluarkan.</div><div class="modal-btns"><button class="btn-act btn-end-turn" onclick="doEndSession()">Ya, Akhiri!</button><button class="btn-act btn-secondary" onclick="closeModal()">Batal</button></div>`);
}
function doEndSession() { socket.emit('mono_end_session', { sessionId: SESSION_ID, discordId: MY_ID }); closeModal(); }

function leaveRoom() {
    showModal(`<div style="font-size:2.5rem;margin-bottom:10px;">🚪</div><div class="modal-title">Keluar dari Room?</div><div class="modal-desc">Kamu akan keluar dari lobby. Kamu bisa masuk kembali menggunakan link yang sama.</div><div class="modal-btns"><button class="btn-act btn-end-turn" onclick="doLeaveRoom()">Ya, Keluar</button><button class="btn-act btn-secondary" onclick="closeModal()">Batal</button></div>`);
}
function doLeaveRoom() { socket.emit('mono_leave', { sessionId: SESSION_ID, discordId: MY_ID }); closeModal(); }

function confirmGiveUp() {
    const myPlayer = gameState?.players?.find(p => p.id === MY_ID);
    if (!myPlayer || myPlayer.bankrupt) return;
    showModal(`<div style="font-size:2.5rem;margin-bottom:10px;">🏳️</div><div class="modal-title" style="color:var(--red);">Menyerah?</div><div class="modal-desc">Kamu akan menyerah dan keluar dari permainan. Semua propertimu dikembalikan ke bank. Aksi ini <strong>tidak bisa diurungkan!</strong></div><div class="modal-btns"><button class="btn-act btn-end-turn" onclick="doGiveUp()">🏳️ Menyerah</button><button class="btn-act btn-secondary" onclick="closeModal()">Lanjut Main</button></div>`);
}
function doGiveUp() { socket.emit('mono_giveup', { sessionId: SESSION_ID, discordId: MY_ID }); closeModal(); }
