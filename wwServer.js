const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/game/:sessionId', (req, res) => res.sendFile(path.join(__dirname, 'public', 'game.html')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ─── Session Storage ───────────────────────────────────────────────────────────
const OWNER_IDS = ['571492745676587009', '1421922204626587820', '1281505068746543181'];
const sessions = new Map();

function createSession(hostId, hostName, hostAvatar, avatarMap = {}, guildId = null, botToken = null) {
    const sessionId = uuidv4().split('-')[0] + uuidv4().split('-')[0];
    sessions.set(sessionId, {
        sessionId, phase: 'lobby', dayCount: 1,
        host: hostId, players: [], roles: {}, alive: [], dead: [],
        killers: {}, announcements: [], gameEnded: false,
        avatarMap, guildId, botToken,
        // Role state
        nightActions: {}, bgInjured: [],
        glitchedNext: null, glitchedToday: null,
        breadGivenTo: null, swActiveToday: false,
        berserkActive: false, berserkUsed: [],
        pwUsed: [], swUsed: [], cwUses: {}, nwUses: {},
        astroMoonUsed: [], astroMeteorUsed: [],
        princessRevealed: [], pacifistRevealed: [], priestUsed: [], pacifistUsed: [], votingDisabledToday: false,
        couple: [], cupidDone: false,
        hhTarget: {}, // hhId -> targetId
        jwRevenge: {}, // jwId -> targetId
        grTarget: {}, // grId -> targetId
        mediumUsed: [],
        judgeUses: {}, judgeTarget: {},
        policeUses: {},
        shapeshifterSeenAs: {}, // ssId -> fakeRole
        dousedPlayers: [],
        nwSleeping: null, // sleeping next night
        cwActive: false, // CW identity mask active this night
        bgProtecting: null,
        sectMembers: [],
        isRandomMode: false,
        randomRoleCounts: { ww: 1, special: 0, solo: 0 },
        roleSettings: {
            ww:1, seer:1, det:0, doc:1, priest:0, cursed:0,
            gr:0, nw:0, jw:0, bw:0, cw:0, pw:0, sw:0, ws:0, wolfen:0,
            hh:0, cupid:0, badut:0, med:0, princess:0, ss:0,
            hakim:0, polisi:0, bg:0, arson:0, cor:0, astro:0, baker:0, jailer:0, sect:0, pacifist:0
        },
        mvpScores: {},
        nightTimer: null, dayTimer: null, voteTimer: null, lobbyTimer: null
    });

    // Auto-delete lobby after 5 minutes (300,000 ms)
    sessions.get(sessionId).lobbyTimer = setTimeout(() => {
        const game = sessions.get(sessionId);
        if (game && game.phase === 'lobby') {
            bcast(sessionId, 'error', { message: 'Lobby dihapus otomatis karena tidak dimulai dalam 5 menit.' });
            sessions.delete(sessionId);
        }
    }, 300000);

    return sessionId;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const WW_ROLES = ['Werewolf','Nightmare Wolf','Junior Wolf','Berserk Werewolf','Confusion Wolf','Party Werewolf','Shadow Wolf','Werewolf Seer','Wolffluencer'];
const SOLO_ROLES = ['Head Hunter','Badut','Shapeshifter','Arsonist','Corruptor','Sect Leader'];
function dEmoji(id) { return `<img src="https://cdn.discordapp.com/emojis/${id}.png" class="discord-emoji">`; }

const ROLE_EMOJI = {
    'Werewolf': dEmoji('1511214606326956122'),
    'Nightmare Wolf': dEmoji('1511802299801014475'),
    'Junior Wolf': dEmoji('1512176704351895782'),
    'Berserk Werewolf': dEmoji('1513271839474974750'),
    'Confusion Wolf': dEmoji('1513999536681517106'),
    'Party Werewolf': dEmoji('1516365512936788018'),
    'Shadow Wolf': dEmoji('1516540536872370337'),
    'Werewolf Seer': dEmoji('1521244118553198794'),
    'Wolffluencer': dEmoji('1524842152155414698'),
    'Penerawang': dEmoji('1511215348479950858'),
    'Detektif': dEmoji('1514165095423541298'),
    'Dokter': dEmoji('1511217847752327249'),
    'Pendeta': dEmoji('1511217800860143616'),
    'Cursed': dEmoji('1511463888800190605'),
    'Grave Robber': dEmoji('1511802262328971315'),
    'Cupid': dEmoji('1511961217739264091'),
    'Medium': dEmoji('1512177285904601220'),
    'Princess': dEmoji('1513267111840059534'),
    'Hakim': dEmoji('1513427146381459627'),
    'Polisi': dEmoji('1513279387557171200'),
    'Bodyguard': dEmoji('1513999469148901557'),
    'Shapeshifter': dEmoji('1513270676092489778'),
    'Arsonist': dEmoji('1513999508990591106'),
    'Head Hunter': dEmoji('1511827452278608054'),
    'Badut': dEmoji('1511962572260380863'),
    'Corruptor': dEmoji('1513269938595299358'),
    'Astronomer': dEmoji('1516381258614181980'),
    'Baker': dEmoji('1516536682789470360'),
    'Jailer': dEmoji('1520707527900266556'),
    'Sect Leader': dEmoji('1521244062567366778'),
    'Pacifist': dEmoji('1524838530822574140'),
    'Villager': '🧑‍🌾'
};

function isVillageTeam(role) {
    return !WW_ROLES.includes(role) && !SOLO_ROLES.includes(role);
}

// ─── Role Pool Builder ─────────────────────────────────────────────────────────
function buildRolePool(game, count) {
    const pool = [];
    if (game.isRandomMode) {
        const counts = game.randomRoleCounts;
        let nwAssigned = 0; let jwAssigned = 0; let bwAssigned = 0; let cwAssigned = 0; let pwAssigned = 0; let swAssigned = 0; let wsAssigned = 0; let wfAssigned = 0;
        for (let i = 0; i < counts.ww; i++) {
            let rnd = Math.random();
            if (rnd < 0.14 && nwAssigned < 1) { pool.push('Nightmare Wolf'); nwAssigned++; }
            else if (rnd >= 0.14 && rnd < 0.28 && jwAssigned < 1) { pool.push('Junior Wolf'); jwAssigned++; }
            else if (rnd >= 0.28 && rnd < 0.42 && bwAssigned < 1) { pool.push('Berserk Werewolf'); bwAssigned++; }
            else if (rnd >= 0.42 && rnd < 0.56 && cwAssigned < 1) { pool.push('Confusion Wolf'); cwAssigned++; }
            else if (rnd >= 0.56 && rnd < 0.68 && pwAssigned < 1) { pool.push('Party Werewolf'); pwAssigned++; }
            else if (rnd >= 0.68 && rnd < 0.80 && swAssigned < 1) { pool.push('Shadow Wolf'); swAssigned++; }
            else if (rnd >= 0.80 && rnd < 0.90 && wsAssigned < 1) { pool.push('Werewolf Seer'); wsAssigned++; }
            else if (rnd >= 0.90 && rnd < 0.98 && wfAssigned < 1) { pool.push('Wolffluencer'); wfAssigned++; }
            else { pool.push('Werewolf'); }
        }
        let availableSpecials = ['Penerawang', 'Detektif', 'Dokter', 'Pendeta', 'Cursed', 'Grave Robber', 'Cupid', 'Medium', 'Princess', 'Hakim', 'Polisi', 'Bodyguard', 'Astronomer', 'Baker', 'Jailer', 'Pacifist'];
        availableSpecials.sort(() => Math.random() - 0.5);
        let pickedSpecials = availableSpecials.slice(0, counts.special);
        for (let r of pickedSpecials) pool.push(r);

        if (counts.solo > 0) {
            let availableSolos = ['Head Hunter', 'Badut', 'Shapeshifter', 'Arsonist', 'Corruptor', 'Sect Leader'];
            availableSolos.sort(() => Math.random() - 0.5); 
            pool.push(availableSolos[0]);
        }
    } else {
        const settings = game.roleSettings;
        const add = (key, name) => { for (let i = 0; i < (settings[key]||0); i++) pool.push(name); };
        add('ww','Werewolf'); add('nw','Nightmare Wolf'); add('jw','Junior Wolf');
        add('bw','Berserk Werewolf'); add('cw','Confusion Wolf'); add('pw','Party Werewolf'); add('sw','Shadow Wolf'); add('ws','Werewolf Seer'); add('wolfen','Wolffluencer');
        add('seer','Penerawang'); add('det','Detektif'); add('doc','Dokter'); add('priest','Pendeta');
        add('cursed','Cursed'); add('gr','Grave Robber'); add('cupid','Cupid'); add('med','Medium');
        add('princess','Princess'); add('hakim','Hakim'); add('polisi','Polisi'); add('bg','Bodyguard');
        add('hh','Head Hunter'); add('badut','Badut'); add('ss','Shapeshifter');
        add('arson','Arsonist'); add('cor','Corruptor'); add('astro','Astronomer'); add('baker','Baker'); add('jailer','Jailer'); add('sect','Sect Leader'); add('pacifist','Pacifist');
    }
    
    while (pool.length < count) pool.push('Villager');
    if (pool.length > count) pool.length = count;
    return pool;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const bcast = (sid, ev, data) => io.to(sid).emit(ev, data);
const send  = (sockId, ev, data) => io.to(sockId).emit(ev, data);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pName = (game, id) => game.players.find(p=>p.id===id)?.name || '???';
const pSock = (game, id) => game.players.find(p=>p.id===id)?.socketId;

function killPlayer(game, id, killer='unknown') {
    if (!game.alive.includes(id)) return false;
    game.alive = game.alive.filter(x=>x!==id);
    game.dead.push(id);
    game.killers[id] = killer;
    game.shownRoles = game.shownRoles || {};
    const isMystery = killer === 'glitch' || killer === 'corruptor' || game.glitchedToday === id || game.cwActive;
    game.shownRoles[id] = isMystery ? '???' : game.roles[id];
    const p = game.players.find(x=>x.id===id);
    if (p) {
        p.alive = false;
        p.deadReason = getDeathReason(game, id);
    }
    return true;
}

function getDeathReason(game, id) {
    const k = game.killers[id];
    if (!k) return 'default';
    if (['ww', 'arson', 'god', 'glitch', 'polisi', 'vote', 'injury', 'meteor', 'hakim', 'corruptor', 'slash', 'shoot', 'sect_ritual', 'sect_sacrifice_member', 'sect_cascade'].includes(k)) return k;
    const kRole = game.roles[k];
    if (kRole === 'Party Werewolf') return 'bomb';
    if (kRole === 'Junior Wolf' || kRole === 'Jailer') return 'shoot';
    if (kRole === 'Shapeshifter') return 'slash';
    return 'default';
}

function clearTimers(game) {
    if (game.nightTimer) clearTimeout(game.nightTimer);
    if (game.dayTimer)  clearTimeout(game.dayTimer);
    if (game.voteTimer) clearTimeout(game.voteTimer);
}

function getPublicState(game, viewerId = null) {
    return {
        sessionId: game.sessionId, phase: game.phase, dayCount: game.dayCount, host: game.host,
        swActiveToday: game.swActiveToday, berserkActive: game.berserkActive,
        isRandomMode: game.isRandomMode, randomRoleCounts: game.randomRoleCounts, roleSettings: game.roleSettings,
        players: game.players.filter(p => p.role !== 'Spectator').map(p => {
            const isViewerCouple = viewerId && game.couple.includes(viewerId);
            const isViewerCupid = viewerId && game.roles[viewerId] === 'Cupid';
            const showCouple = game.couple.includes(p.id) && (isViewerCouple || isViewerCupid);
            const showPartnerRole = showCouple && p.id !== viewerId && isViewerCouple;
            const isViewerWW = viewerId && WW_ROLES.includes(game.roles[viewerId]);
            const isTargetWW = WW_ROLES.includes(game.roles[p.id]);
            const showWWRole = isViewerWW && isTargetWW;
            const isViewerOwnerSpectator = viewerId && OWNER_IDS.includes(viewerId) && game.roles[viewerId] === 'Spectator';
            const isViewerSect = viewerId && (game.sectMembers||[]).includes(viewerId);
            const isTargetSect = (game.sectMembers||[]).includes(p.id);
            const showSect = (isViewerSect || isViewerOwnerSpectator) && isTargetSect;
            return {
                id: p.id, name: p.name, avatar: p.avatar, alive: p.alive,
                deadReason: p.deadReason || (p.alive ? null : getDeathReason(game, p.id)),
                isDoused: (game.dousedPlayers || []).includes(p.id),
                isJailed: game.jailedTonight === p.id && game.phase === 'night',
                role: isViewerOwnerSpectator ? game.roles[p.id] : (showWWRole ? game.roles[p.id] : (showPartnerRole ? game.roles[p.id] : ((!p.alive || (game.shownRoles && game.shownRoles[p.id])) ? ((game.shownRoles && game.shownRoles[p.id]) || game.roles[p.id]) : '???'))),
                isGlitched: game.glitchedToday === p.id,
                princessRevealed: game.princessRevealed.includes(p.id),
                pacifistRevealed: (game.pacifistRevealed || []).includes(p.id),
                isCouple: showCouple,
                isSect: showSect
            };
        }),
        roleSettings: game.roleSettings
    };
}

function bcastPhaseChange(game, phase, message, voteTargets = null) {
    game.players.forEach(p => {
        send(p.socketId, 'phase_change', {
            phase, dayCount: game.dayCount, message, voteTargets,
            state: getPublicState(game, p.id)
        });
    });
}

function bcastLobbyUpdate(game, message) {
    game.players.forEach(p => {
        send(p.socketId, 'lobby_update', {
            game: getPublicState(game, p.id),
            message
        });
    });
}

// ─── Win Condition ─────────────────────────────────────────────────────────────
function checkWin(game) {
    const aliveWW     = game.alive.filter(id => WW_ROLES.includes(game.roles[id]));
    const aliveSolo   = game.alive.filter(id => SOLO_ROLES.includes(game.roles[id]));
    const aliveVill   = game.alive.filter(id => isVillageTeam(game.roles[id]));
    const total       = game.alive.length;

    // Couple win — if couple is the only ones alive
    if (game.couple.length === 2) {
        const [c1, c2] = game.couple;
        const bothAlive = game.alive.includes(c1) && game.alive.includes(c2);
        if (bothAlive && total === 2) {
            return { winner:'Cupid Couple', reason:`${pName(game,c1)} & ${pName(game,c2)} adalah pasangan yang selamat bersama!` };
        }
    }

    const aliveLethalSolo = game.alive.filter(id => ['Shapeshifter', 'Arsonist', 'Corruptor', 'Sect Leader'].includes(game.roles[id]));

    // Sect win condition (all living players are sect members, no WW or rival solo killers)
    const aliveSectLeader = game.alive.find(id => game.roles[id] === 'Sect Leader');
    if (aliveSectLeader && aliveWW.length === 0 && game.alive.filter(id => ['Shapeshifter', 'Arsonist', 'Corruptor'].includes(game.roles[id])).length === 0) {
        if (game.alive.every(id => (game.sectMembers||[]).includes(id))) {
            return { winner: 'Sect Leader', reason: 'Sekte Gelap mengonversi dan menguasai seluruh desa!' };
        }
    }

    // Solo killer role (Corruptor, Arsonist, Shapeshifter, Sect Leader) win when total <= 2
    if (aliveLethalSolo.length > 0 && total <= 2) {
        const lastId = aliveLethalSolo[0];
        const lastRole = game.roles[lastId];
        return { winner: lastRole, reason: `${pName(game,lastId)} (${lastRole}) berhasil mendominasi pemain terakhir!` };
    }

    // WW win (only if no lethal solo killer remains!)
    if (aliveWW.length >= aliveVill.length + aliveSolo.length && aliveWW.length > 0 && aliveLethalSolo.length === 0) {
        return { winner:'Werewolf', reason:'Tim Werewolf menguasai desa!' };
    }

    // Village win (no WW + no problematic solo killer)
    if (aliveWW.length === 0 && aliveLethalSolo.length === 0) {
        return { winner:'Village', reason:'Semua ancaman dieliminasi! Desa menang!' };
    }
    if (aliveWW.length === 0 && total <= 1) {
        return { winner:'Village', reason:'Desa berhasil bertahan!' };
    }

    return null;
}

function addMvpScore(game, playerId, points) {
    if (!game.mvpScores) game.mvpScores = {};
    if (!game.mvpScores[playerId]) game.mvpScores[playerId] = 0;
    game.mvpScores[playerId] += points;
}

function triggerWin(game, result) {
    if (game.gameEnded) return;
    game.gameEnded = true;

    clearTimers(game);

    // Give survive bonus
    for (const id of game.alive) {
        addMvpScore(game, id, 3);
        if (game.roles[id] === 'Princess' && game.princessRevealed.includes(id)) {
            addMvpScore(game, id, 2); // Princess survived after reveal bonus
        }
    }

    // HH, Badut, Cupid win MVP bonuses
    if (result.winner === 'Head Hunter') {
        const hhId = game.players.find(p=>game.roles[p.id]==='Head Hunter')?.id;
        if (hhId) addMvpScore(game, hhId, 10);
    }
    if (result.winner === 'Badut') {
        const badutId = game.players.find(p=>game.roles[p.id]==='Badut')?.id;
        if (badutId) addMvpScore(game, badutId, 10);
    }
    if (result.winner === 'Cupid Couple') {
        const cupidId = game.players.find(p=>game.roles[p.id]==='Cupid')?.id;
        if (cupidId) addMvpScore(game, cupidId, 7);
    }
    if (result.winner === 'Sect Leader') {
        const sectId = game.players.find(p=>game.roles[p.id]==='Sect Leader')?.id;
        if (sectId) addMvpScore(game, sectId, 10);
    }

    // Determine MVP ID
    let mvpId = null;
    let maxMvpScore = -999;
    const winnerGroup = result.winner.toLowerCase();
    
    for (const id of Object.keys(game.mvpScores || {})) {
        const role = game.roles[id];
        let isWinner = false;
        
        if (winnerGroup === 'cupid couple' && game.couple.includes(id)) isWinner = true;
        else if (winnerGroup === 'village' && isVillageTeam(role)) isWinner = true;
        else if (winnerGroup === 'werewolf' && WW_ROLES.includes(role)) isWinner = true;
        else if (winnerGroup === 'head hunter' && role === 'Head Hunter') isWinner = true;
        else if (winnerGroup === 'badut' && role === 'Badut') isWinner = true;
        else if (winnerGroup === 'arsonist' && role === 'Arsonist') isWinner = true;
        else if (winnerGroup === 'corruptor' && role === 'Corruptor') isWinner = true;
        else if (winnerGroup === 'shapeshifter' && role === 'Shapeshifter') isWinner = true;
        else if (winnerGroup === 'sect leader' && (role === 'Sect Leader' || (game.sectMembers||[]).includes(id))) isWinner = true;
        
        if (isWinner && game.mvpScores[id] > maxMvpScore) {
            maxMvpScore = game.mvpScores[id];
            mvpId = id;
        }
    }

    bcast(game.sessionId, 'game_over', {
        winner: result.winner, reason: result.reason,
        mvpId: mvpId,
        players: game.players.map(p => ({ ...p, role: p.role }))
    });
    setTimeout(() => sessions.delete(game.sessionId), 30000);
}

// ─── Death Cascade ─────────────────────────────────────────────────────────────
async function handleDeathCascade(game, deadId, deathList) {
    // Grave Robber steal role
    for (const [grId, target] of Object.entries(game.grTarget)) {
        if (target === deadId && game.alive.includes(grId) && game.roles[grId] === 'Grave Robber') {
            const stolenRole = game.roles[target] || 'Villager';
            game.roles[grId] = stolenRole;
            game.players.find(p=>p.id===grId).role = stolenRole;
            if (stolenRole === 'Nightmare Wolf') game.nwUses[grId] = 2;
            if (stolenRole === 'Confusion Wolf') game.cwUses[grId] = 2;
            if (stolenRole === 'Medium') game.mediumUsed = game.mediumUsed.filter(x=>x!==grId);
            if (stolenRole === 'Pendeta') game.priestUsed = game.priestUsed.filter(x=>x!==grId);
            if (stolenRole === 'Berserk Werewolf') game.berserkUsed = game.berserkUsed.filter(x=>x!==grId);
            if (stolenRole === 'Party Werewolf') game.pwUsed = game.pwUsed.filter(x=>x!==grId);
            if (stolenRole === 'Shadow Wolf') game.swUsed = game.swUsed.filter(x=>x!==grId);
            if (stolenRole === 'Astronomer') { game.astroMoonUsed = game.astroMoonUsed.filter(x=>x!==grId); game.astroMeteorUsed = game.astroMeteorUsed.filter(x=>x!==grId); }
            if (stolenRole === 'Princess') game.princessRevealed = game.princessRevealed.filter(x=>x!==grId);
            if (stolenRole === 'Pacifist') { game.pacifistUsed = game.pacifistUsed.filter(x=>x!==grId); game.pacifistRevealed = (game.pacifistRevealed||[]).filter(x=>x!==grId); }
            if (stolenRole === 'Hakim') game.judgeUses[grId] = 1;
            if (stolenRole === 'Polisi') game.policeUses[grId] = {shoot: 1, reveal: 1};
            if (stolenRole === 'Jailer') game.jailerBullet = Object.assign(game.jailerBullet || {}, { [grId]: 1 });
            
            const extra = {};
            if (stolenRole === 'Head Hunter') {
                const others = game.players.filter(x => x.id !== grId && x.alive && isVillageTeam(game.roles[x.id]) && game.roles[x.id] !== 'Cursed');
                game.hhTarget[grId] = others[Math.floor(Math.random()*others.length)]?.id || game.players.find(x => x.id !== grId && x.alive)?.id;
                extra.hhTarget = pName(game, game.hhTarget[grId]);
                extra.hhTargetId = game.hhTarget[grId];
            }

            const team = WW_ROLES.includes(stolenRole) ? 'ww' : (SOLO_ROLES.includes(stolenRole) ? 'solo' : 'village');
            const wwAllies = WW_ROLES.includes(stolenRole) ? game.players.filter(x=>WW_ROLES.includes(x.role)&&x.id!==grId&&x.alive).map(x=>({ name: `${x.name} (${x.role})` })) : [];
            const gameRolesList = [...new Set(Object.values(game.roles))];

            send(pSock(game,grId), 'role_assigned', { role: stolenRole, emoji: ROLE_EMOJI[stolenRole]||'❓', team, wwAllies, gameRoles: gameRolesList, ...extra });
            send(pSock(game,grId), 'gr_result', {stolenRole, emoji:ROLE_EMOJI[stolenRole]||'?'});
            send(pSock(game,grId), 'action_confirmed', {text:`${ROLE_EMOJI['Grave Robber']} Targetmu mati! Kamu merampok makamnya dan kini menjadi ${ROLE_EMOJI[stolenRole]||'?'} ${stolenRole}!`});
        }
    }
    // Junior Wolf revenge
    for (const [jwId, target] of Object.entries(game.jwRevenge)) {
        if (jwId === deadId && game.alive.includes(target)) {
            killPlayer(game, target, jwId);
            addMvpScore(game, jwId, 5); // MVP: JW revenge killed someone
            deathList.push({ type:'death', playerId:target, playerName:pName(game,target), role:game.roles[target], cause:'jw_revenge', reason:'heart' });
        }
    }
    // Cupid couple death
    if (game.couple.includes(deadId)) {
        const other = game.couple.find(id => id !== deadId);
        if (other && game.alive.includes(other)) {
            killPlayer(game, other, 'cupid');
            deathList.push({ type:'death', playerId:other, playerName:pName(game,other), role:game.roles[other], cause:'couple', reason:'heart' });
        }
    }
    // Sect Leader death cascade
    if (game.roles[deadId] === 'Sect Leader') {
        const aliveSect = game.alive.filter(id => (game.sectMembers||[]).includes(id));
        for (const sectId of aliveSect) {
            if (killPlayer(game, sectId, 'sect_cascade')) {
                deathList.push({ type: 'death', playerId: sectId, playerName: pName(game, sectId), role: game.roles[sectId], cause: 'sect_cascade', reason: 'sect_cascade' });
            }
        }
    }
}

// ─── Game Start ────────────────────────────────────────────────────────────────
async function startGame(game) {
    if (game.lobbyTimer) { clearTimeout(game.lobbyTimer); game.lobbyTimer = null; }
    const count = game.players.length;
    if (count < 4) return;

    const pool = shuffle(buildRolePool(game, count));
    game.players.forEach((p, i) => { p.role = pool[i]; game.roles[p.id] = pool[i]; p.alive = true; });
    game.alive = game.players.map(p => p.id);

    // Init per-role state
    game.players.forEach(p => {
        const r = p.role;
        if (r === 'Nightmare Wolf') game.nwUses[p.id] = 2;
        if (r === 'Confusion Wolf') game.cwUses[p.id] = 2;
        if (r === 'Junior Wolf') {
            const others = game.players.filter(x => x.id !== p.id);
            game.jwRevenge[p.id] = others[Math.floor(Math.random()*others.length)].id;
        }
        if (r === 'Head Hunter') {
            const others = game.players.filter(x => x.id !== p.id && isVillageTeam(game.roles[x.id]) && game.roles[x.id] !== 'Cursed');
            game.hhTarget[p.id] = others[Math.floor(Math.random()*others.length)]?.id || game.players.find(x => x.id !== p.id)?.id;
        }
        if (r === 'Hakim') game.judgeUses[p.id] = 1;
        if (r === 'Polisi') game.policeUses[p.id] = {shoot: 1, reveal: 1};
        if (r === 'Jailer') game.jailerBullet = Object.assign(game.jailerBullet || {}, { [p.id]: 1 });
        if (r === 'Medium') game.mediumUsed = game.mediumUsed || [];
    });

    // Collect unique roles used in this game for the gacha reveal
    const gameRolesList = [...new Set(Object.values(game.roles))];
    game.sectMembers = game.players.filter(p => game.roles[p.id] === 'Sect Leader').map(p => p.id);

    // Notify each player their role
    game.players.forEach(p => {
        const r = p.role;
        const wwAllies = WW_ROLES.includes(r) ? game.players.filter(x=>WW_ROLES.includes(x.role)&&x.id!==p.id).map(x=>({ name: `${x.name} (${x.role})` })) : [];
        const sectAllies = game.sectMembers.includes(p.id) ? game.players.filter(x=>game.sectMembers.includes(x.id)&&x.id!==p.id).map(x=>({ id: x.id, name: x.name })) : [];
        const extra = {};
        if (r === 'Junior Wolf') {
            extra.jwTarget = pName(game, game.jwRevenge[p.id]);
            extra.jwTargetId = game.jwRevenge[p.id];
        }
        if (r === 'Head Hunter') {
            extra.hhTarget = pName(game, game.hhTarget[p.id]);
            extra.hhTargetId = game.hhTarget[p.id];
        }
        send(p.socketId, 'role_assigned', { role:r, emoji:ROLE_EMOJI[r]||'❓', team: WW_ROLES.includes(r)?'ww':(SOLO_ROLES.includes(r)?'solo':'village'), wwAllies, sectAllies, isSectMember: game.sectMembers.includes(p.id), gameRoles: gameRolesList, ...extra });
    });

    bcast(game.sessionId, 'game_started', { playerCount: count });
    await sleep(2000);
    startNight(game);
}

// ─── NIGHT PHASE ───────────────────────────────────────────────────────────────
async function startNight(game) {
    if (game.gameEnded) return;
    game.phase = 'night';
    game.nightActions = {
        wwVotes: {}, wwTarget: null,
        docTarget: null, bgTarget: null,
        seerTarget: null,
        corTarget: null,
        astroMoon: false, astroMeteorTarget: null,
        bakerTarget: null,
        cwToggle: false,
        wolffluencerTarget: null,
        nwSleepTarget: null,
        jwRevengeTarget: null,
        grTarget: null,
        cupidPair: [],
        mediumTarget: null,
        ssTarget: null,
        sectConvertTarget: null, sectSacrificeTarget: null, sectSacrificeMember: null,
        arsonDouse: null, arsonIgnite: false,
        hakim: null
    };

    const isJailerAlive = game.alive.some(id => game.roles[id] === 'Jailer');
    game.jailedTonight = (isJailerAlive && game.jailerTargetToday && game.alive.includes(game.jailerTargetToday)) ? game.jailerTargetToday : null;
    game.jailerTargetToday = null;
    game.jailerExecute = false;

    bcastPhaseChange(game, 'night', `🌃 Malam ke-${game.dayCount} tiba...`);

    const aliveList = game.alive.map(id => { const p=game.players.find(x=>x.id===id); return {id:p.id,name:p.name,avatar:p.avatar}; });
    const deadVillagers = game.dead.filter(id=>isVillageTeam(game.roles[id]));

    game.players.filter(p=>p.alive).forEach(p => {
        const r = game.roles[p.id];
        const isAsleep = game.nwSleeping === p.id;
        let ui = null;

        if (isAsleep) { send(p.socketId,'night_ui',{type:'sleeping',isNwSleep:true,reason:'😴 Kamu tertidur akibat efek Nightmare Wolf!'}); return; }
        if (game.jailedTonight === p.id) { send(p.socketId,'night_ui',{type:'jailed',reason:'🔒 Kamu sedang dikurung di penjara oleh Jailer malam ini! Skill malammu diblokir.'}); return; }

        if (r === 'Werewolf Seer') {
            const aliveWWCount = game.alive.filter(id => WW_ROLES.includes(game.roles[id])).length;
            if (aliveWWCount <= 1) {
                game.roles[p.id] = 'Werewolf'; p.role = 'Werewolf';
                send(p.socketId, 'announcement', { text: `🐺 Kamu adalah Werewolf terakhir yang tersisa! Kekuatan terawangmu hilang dan kamu berubah menjadi Werewolf biasa untuk membunuh sasaran malam ini!` });
                const allies = [];
                const targets = aliveList.filter(x=>x.id!==p.id&&!WW_ROLES.includes(game.roles[x.id]));
                ui = {type:'ww_vote', targets, allies, role:'Werewolf'};
            } else {
                const allies = game.players.filter(x=>WW_ROLES.includes(game.roles[x.id])&&x.alive&&x.id!==p.id).map(x=>({id:x.id,name:x.name,avatar:x.avatar}));
                const targets = aliveList.filter(x=>x.id!==p.id);
                ui = {type:'ws_check', targets, allies, role:r};
            }
        } else if (WW_ROLES.includes(r)) {
            const allies = game.players.filter(x=>WW_ROLES.includes(game.roles[x.id])&&x.alive&&x.id!==p.id).map(x=>({id:x.id,name:x.name,avatar:x.avatar}));
            const targets = aliveList.filter(x=>x.id!==p.id&&!WW_ROLES.includes(game.roles[x.id]));
            ui = {type:'ww_vote', targets, allies, role:r, hasCW: r==='Confusion Wolf' && (game.cwUses[p.id]||0)>0, hasJW: r==='Junior Wolf', hasWF: r==='Wolffluencer'};
        } else if (r==='Dokter') {
            ui = {type:'doc_protect', targets:aliveList.filter(x=>x.id!==p.id)};
        } else if (r==='Bodyguard') {
            ui = {type:'bg_protect', targets:aliveList.filter(x=>x.id!==p.id)};
        } else if (r==='Penerawang') {
            ui = {type:'seer_check', targets:aliveList.filter(x=>x.id!==p.id)};
        } else if (r==='Detektif') {
            ui = deadVillagers.length>0
                ? {type:'det_investigate', targets:deadVillagers.map(id=>({id,name:pName(game,id)}))}
                : {type:'sleeping', reason:'🔍 Tidak ada korban warga untuk diselidiki malam ini.'};
        } else if (r==='Corruptor') {
            ui = {type:'cor_glitch', targets:aliveList.filter(x=>x.id!==p.id)};
        } else if (r==='Astronomer') {
            ui = {type:'astro_action', targets:aliveList.filter(x=>x.id!==p.id), canMoon:!game.astroMoonUsed.includes(p.id), canMeteor:!game.astroMeteorUsed.includes(p.id)};
        } else if (r==='Baker') {
            ui = {type:'baker_bread', targets:aliveList.filter(x=>x.id!==p.id)};
        } else if (r==='Arsonist') {
            ui = {type:'arson_action', targets:aliveList.filter(x=>x.id!==p.id), dousedCount:game.dousedPlayers.length};
        } else if (r==='Grave Robber') {
            if (game.dayCount === 1) {
                ui = {type:'gr_target', targets:aliveList.filter(x=>x.id!==p.id)};
            } else {
                ui = {type:'sleeping', reason:'⚰️ Menunggu targetmu mati...'};
            }
        } else if (r==='Cupid' && !game.cupidDone && game.dayCount===1) {
            ui = {type:'cupid_pair', targets:aliveList.filter(x=>x.id!==p.id)};
        } else if (r==='Medium' && !game.mediumUsed.includes(p.id)) {
            const deadRevivable = deadVillagers.map(id=>({id,name:pName(game,id)}));
            ui = deadRevivable.length>0 ? {type:'medium_revive',targets:deadRevivable} : {type:'sleeping',reason:'👻 Belum ada roh warga untuk dipanggil kembali.'};
        } else if (r==='Shapeshifter') {
            ui = {type:'ss_kill', targets:aliveList.filter(x=>x.id!==p.id)};
        } else if (r==='Jailer') {
            ui = game.jailedTonight
                ? {type:'jailer_action', targets:[{id:game.jailedTonight, name:pName(game,game.jailedTonight)}], bullet: (game.jailerBullet && game.jailerBullet[p.id]) ? game.jailerBullet[p.id] : 0, hasJailed: true}
                : {type:'sleeping', reason:'👮 Kamu tidak memiliki tahanan di penjara malam ini.'};
        } else if (r==='Sect Leader') {
            const aliveSect = game.alive.filter(id => (game.sectMembers||[]).includes(id));
            const targets = aliveList.filter(x=>x.id!==p.id);
            const sacrificeMembers = aliveList.filter(x => x.id !== p.id && (game.sectMembers||[]).includes(x.id));
            ui = {
                type: 'sect_action',
                targets,
                sacrificeMembers,
                sectCount: aliveSect.length,
                canConvert: aliveSect.length < 5
            };
        } else {
            ui = {type:'sleeping'};
        }

        if (ui) send(p.socketId, 'night_ui', ui);
    });

    game.phaseEndTime = Date.now() + 35000;
    bcast(game.sessionId, 'timer_start', {duration:35, phase:'night'});
    game.nightTimer = setTimeout(() => resolveNight(game), 35000);
}

function executeDetInvestigation(game, detId, targetId) {
    if (!detId || !targetId) return;
    let killer = game.killers[targetId];
    
    // Resolve role string causes to actual player IDs
    if (killer === 'ww' || killer === 'berserk_bg') killer = game.alive.find(id => WW_ROLES.includes(game.roles[id])) || game.players.find(p=>WW_ROLES.includes(game.roles[p.id]))?.id;
    else if (killer === 'arsonist' || killer === 'fire') killer = game.players.find(p=>game.roles[p.id]==='Arsonist')?.id;
    else if (killer === 'corruptor' || killer === 'glitch') killer = game.players.find(p=>game.roles[p.id]==='Corruptor')?.id;
    else if (killer === 'shoot') killer = game.players.find(p=>game.roles[p.id]==='Jailer')?.id;
    else if (killer === 'polisi') killer = game.players.find(p=>game.roles[p.id]==='Polisi')?.id;
    else if (killer === 'hakim') killer = game.players.find(p=>game.roles[p.id]==='Hakim')?.id;
    else if (killer === 'bomb') killer = game.players.find(p=>game.roles[p.id]==='Party Werewolf')?.id;
    else if (killer === 'shapeshifter' || killer === 'slash') killer = game.players.find(p=>game.roles[p.id]==='Shapeshifter')?.id;
    else if (killer === 'cupid') killer = game.players.find(p=>game.roles[p.id]==='Cupid')?.id;
    else if (killer === 'injury') killer = game.alive.find(id => WW_ROLES.includes(game.roles[id])) || game.players.find(p=>WW_ROLES.includes(game.roles[p.id]))?.id;

    if (killer === 'vote' || killer === 'god' || killer === 'meteor') {
        const causeText = killer === 'vote' ? 'Eksekusi Hukuman Gantung Warga (Vote)' : 'Bencana Alam / Meteor';
        send(pSock(game, detId), 'action_confirmed', { text: `🕵️ Makam ${pName(game, targetId)} tewas karena: ${causeText}. Tidak ada suspek pembunuh gelap!` });
    } else {
        // Fallback if killer is not a valid player ID (or unknown) so it NEVER returns ???
        if (!game.players.some(p => p.id === killer)) {
            const possibleKillers = game.players.filter(p => p.alive && p.id !== detId && p.id !== targetId);
            killer = possibleKillers.length > 0 ? possibleKillers[Math.floor(Math.random() * possibleKillers.length)].id : detId;
        }

        const killerName = pName(game, killer);
        let decoys = game.players.filter(x => x.alive && x.id !== killer && x.id !== detId && x.id !== targetId);
        if (decoys.length === 0) decoys = game.players.filter(x => x.id !== killer && x.id !== detId && x.id !== targetId);
        const decoyId = decoys.length > 0 ? decoys[Math.floor(Math.random() * decoys.length)].id : killer;
        const decoyName = pName(game, decoyId);

        if (killer && killer !== 'unknown') addMvpScore(game, detId, 3);

        send(pSock(game, detId), 'det_result', {
            target: pName(game, targetId),
            real: killerName,
            realId: killer,
            decoy: decoyName,
            decoyId: decoyId
        });
    }
}

// ─── NIGHT RESOLUTION ──────────────────────────────────────────────────────────
async function resolveNight(game) {
    if (game.gameEnded) return;
    clearTimeout(game.nightTimer);
    const na = game.nightActions;
    const deathList = [];
    const cwMask = na.cwToggle;

    // === Cupid pair (Night 1) ===
    if (!game.cupidDone && na.cupidPair && na.cupidPair.length===2) {
        game.couple = na.cupidPair;
        game.cupidDone = true;
        na.cupidPair.forEach(id => {
            const other = na.cupidPair.find(x=>x!==id);
            send(pSock(game,id),'cupid_paired',{partnerId:other,partnerName:pName(game,other)});
        });
    }

    // === Grave Robber night 1 target ===
    if (na.grTarget) {
        const grId = game.alive.find(id=>game.roles[id]==='Grave Robber');
        if (grId && game.dayCount === 1) {
            game.grTarget[grId] = na.grTarget;
            send(pSock(game,grId), 'action_confirmed', {text: `${ROLE_EMOJI['Grave Robber']} Target dikunci: Jika ${pName(game,na.grTarget)} mati, kamu akan mencuri rolenya!`});
        }
    }

    // === Shapeshifter Kill ===
    if (na.ssTarget && game.alive.includes(na.ssTarget)) {
        const ssId = game.alive.find(id=>game.roles[id]==='Shapeshifter');
        const bgIdSS = game.alive.find(id=>game.roles[id]==='Bodyguard');
        if (ssId) {
            if (na.ssTarget === game.jailedTonight) {
                deathList.push({type:'info', text:'🔒 Serangan misterius gagal karena target dilindungi oleh jeruji besi penjara!'});
            } else if (bgIdSS && (na.bgTarget === na.ssTarget || na.ssTarget === bgIdSS)) {
                if (!game.bgInjured.includes(bgIdSS)) game.bgInjured.push(bgIdSS);
                send(pSock(game, bgIdSS), 'bg_attacked_notify', { attackerName: `${pName(game, ssId)} (Shapeshifter)` });
                deathList.push({type:'info', text:'🛡️ Seseorang berhasil dilindungi dari serangan misterius malam ini!'});
            } else {
                const trueRole = game.roles[na.ssTarget];
                if (killPlayer(game,na.ssTarget,'shapeshifter')) {
                    deathList.push({type:'death',playerId:na.ssTarget,playerName:pName(game,na.ssTarget),role:cwMask?'???':trueRole,cause:'shapeshifter', reason:'slash'});
                    game.shapeshifterSeenAs[ssId] = trueRole; // Update seen as to last killed target
                    await handleDeathCascade(game,na.ssTarget,deathList);
                }
            }
        }
    }

    // === Sect Leader actions ===
    const sectLeaderId = game.alive.find(id => game.roles[id] === 'Sect Leader');
    if (sectLeaderId) {
        if (na.sectSacrificeTarget && na.sectSacrificeMember && game.alive.includes(na.sectSacrificeTarget) && game.alive.includes(na.sectSacrificeMember)) {
            const sacId = na.sectSacrificeMember;
            const vicId = na.sectSacrificeTarget;
            const sacRole = game.roles[sacId];
            const vicRole = game.roles[vicId];
            if (killPlayer(game, sacId, 'sect_sacrifice_member')) {
                deathList.push({ type: 'death', playerId: sacId, playerName: pName(game, sacId), role: cwMask ? '???' : sacRole, cause: 'sect_sacrifice_member', reason: 'sect_sacrifice_member' });
                await handleDeathCascade(game, sacId, deathList);
            }
            if (game.alive.includes(vicId) && killPlayer(game, vicId, 'sect_ritual')) {
                addMvpScore(game, sectLeaderId, 4); // MVP: Sect Leader sacrifice kill
                deathList.push({ type: 'death', playerId: vicId, playerName: pName(game, vicId), role: '???', cause: 'sect_ritual', reason: 'sect_ritual' });
                await handleDeathCascade(game, vicId, deathList);
            }
        } else if (na.sectConvertTarget && game.alive.includes(na.sectConvertTarget)) {
            const targetId = na.sectConvertTarget;
            const targetRole = game.roles[targetId];
            const aliveSect = game.alive.filter(id => (game.sectMembers||[]).includes(id));
            if (targetId === game.jailedTonight) {
                deathList.push({ type: 'info', text: '🔒 Ritual konversi Sekte terhalang oleh dinding penjara malam ini!' });
            } else if (!WW_ROLES.includes(targetRole) && !['Arsonist', 'Shapeshifter', 'Corruptor', 'Cursed'].includes(targetRole) && (isVillageTeam(targetRole) || ['Head Hunter', 'Badut'].includes(targetRole))) {
                if (aliveSect.length < 5 && !(game.sectMembers||[]).includes(targetId)) {
                    game.sectMembers.push(targetId);
                    addMvpScore(game, sectLeaderId, 3); // MVP: Sect Leader successful conversion
                    send(pSock(game, targetId), 'sect_converted', {});
                    deathList.push({ type: 'info', text: '🔮 Seseorang telah berhasil dikonversi ke dalam Sekte Gelap malam ini!' });
                } else {
                    deathList.push({ type: 'info', text: '🔮 Ritual konversi Sekte Gelap malam ini gagal karena batas sekte penuh atau target sudah menjadi anggota!' });
                }
            } else {
                deathList.push({ type: 'info', text: '🔮 Ritual konversi Sekte Gelap malam ini gagal! Target kebal terhadap konversi.' });
            }
        }
    }

    // === NW Sleep carry-over clearing ===
    game.nwSleeping = null; // Clear NW sleeping so it doesn't persist forever


    // === CW toggle ===
    game.cwActive = na.cwToggle;

    // === Corruptor glitch ===
    game.glitchedToday = (na.corTarget && game.alive.includes(na.corTarget)) ? na.corTarget : null;
    game.glitchedNext = null;

    // === Baker bread ===
    game.breadGivenTo = na.bakerTarget || null;

    // === WW kill target ===
    const wwVotes = {};
    Object.values(na.wwVotes).forEach(tid => { wwVotes[tid]=(wwVotes[tid]||0)+1; });
    let killedId = null;
    Object.entries(wwVotes).forEach(([tid,c]) => { if (!killedId||c>wwVotes[killedId]) killedId=tid; });
    if (!killedId) killedId = na.wwTarget;
    if (killedId && killedId === game.jailedTonight) {
        deathList.push({type:'info', text:'🔒 Serangan Werewolf malam ini gagal karena target berlindung di dalam penjara besi!'});
        killedId = null;
    }
    const wwKillerId = killedId ? Object.keys(na.wwVotes).find(vid=>na.wwVotes[vid]===killedId) : null;

    // New Moon blocks WW kill
    if (na.astroMoon) {
        if (killedId) {
            const astroId = game.alive.find(id=>game.roles[id]==='Astronomer');
            if (astroId) addMvpScore(game, astroId, 4); // MVP: Moon blocked WW kill
        }
        deathList.push({type:'info', text:'🌑 New Moon! Serangan Werewolf malam ini diblokir oleh Astronomer.'});
        killedId = null;
    }

    // Protected?
    let isDocProtected = false;
    const bgIdAlive = game.alive.find(id=>game.roles[id]==='Bodyguard');
    let isBgProtected = bgIdAlive && (na.bgTarget === killedId || killedId === bgIdAlive);

    if (na.docTarget === killedId) {
        if (game.berserkActive) {
            deathList.push({type:'info', text:'🩸 FRENZY! Serangan buas Werewolf menembus perlindungan Dokter!'});
        } else {
            isDocProtected = true;
        }
    }

    if (killedId && game.alive.includes(killedId)) {
        if (!isDocProtected && !isBgProtected) {
            if (game.roles[killedId]==='Cursed') {
                game.roles[killedId]='Werewolf'; const cP = game.players.find(p=>p.id===killedId); if (cP) cP.role='Werewolf';
                send(pSock(game,killedId), 'curse_transform', {});
                deathList.push({type:'info', text:'🐺 Terdengar lolongan aneh... tidak ada korban pagi ini!'});
            } else if (['Corruptor', 'Arsonist', 'Shapeshifter'].includes(game.roles[killedId])) {
                deathList.push({type:'info', text:'🛡️ Werewolf mencoba menyerang, tapi targetnya kebal!'});
            } else {
                if (killPlayer(game, killedId, 'ww')) {
                    // MVP: WW Kill success
                    for (const id of game.alive) {
                        if (WW_ROLES.includes(game.roles[id])) addMvpScore(game, id, 1);
                    }
                    if (game.berserkActive && wwKillerId) addMvpScore(game, wwKillerId, 3); // Berserk bonus

                    const role = cwMask ? '???' : game.roles[killedId];
                    deathList.push({type:'death', playerId:killedId, playerName:pName(game,killedId), role, cause:'werewolf', reason:'ww'});
                    await handleDeathCascade(game, killedId, deathList);
                }
            }
        } else {
            if (isDocProtected) {
                const docId = game.alive.find(id=>game.roles[id]==='Dokter');
                if (docId) {
                    if (isVillageTeam(game.roles[killedId])) addMvpScore(game, docId, 5); // MVP: Doc protected village
                    else addMvpScore(game, docId, -2); // MVP Penalty: Doc protected enemy
                }
            }
            if (isBgProtected && bgIdAlive) {
                if (!game.bgInjured.includes(bgIdAlive)) game.bgInjured.push(bgIdAlive);
                const attackerName = wwKillerId ? `${pName(game, wwKillerId)} (${game.roles[wwKillerId]})` : 'Komplotan Werewolf';
                send(pSock(game, bgIdAlive), 'bg_attacked_notify', { attackerName });
                if (isVillageTeam(game.roles[killedId])) addMvpScore(game, bgIdAlive, 5); // MVP: BG protected village
                else addMvpScore(game, bgIdAlive, -2); // MVP Penalty: BG protected enemy
                if (game.berserkActive) { // BG can die from berserk
                    if (killPlayer(game,bgIdAlive,'ww')) deathList.push({type:'death',playerId:bgIdAlive,playerName:pName(game,bgIdAlive),role:'Bodyguard',cause:'berserk_bg', reason:'ww'});
                }
            }
            deathList.push({type:'info', text:'🛡️ Seseorang berhasil dilindungi malam ini!'});
        }
    } else if (!killedId && !na.astroMoon) {
        deathList.push({type:'info', text:'😴 Malam berlangsung damai. Tidak ada korban!'});
    }

    // === Astronomer Meteor ===
    if (na.astroMeteorTarget && game.alive.includes(na.astroMeteorTarget)) {
        if (na.astroMeteorTarget === game.jailedTonight) {
            deathList.push({type:'info', text:'🔒 Hantaman meteor meleset karena target aman di dalam penjara besi!'});
        } else {
            const astroId = game.alive.find(id=>game.roles[id]==='Astronomer');
            const mtId = na.astroMeteorTarget;
            if (killPlayer(game,mtId,astroId)) {
                deathList.push({type:'death',playerId:mtId,playerName:pName(game,mtId),role:cwMask?'???':game.roles[mtId],cause:'meteor', reason:'meteor'});
                await handleDeathCascade(game,mtId,deathList);
                if (isVillageTeam(game.roles[mtId]) && astroId && game.alive.includes(astroId)) {
                    addMvpScore(game, astroId, -3); // MVP Penalty: Astronomer meteor village
                    if (killPlayer(game,astroId,'god')) {
                        deathList.push({type:'death',playerId:astroId,playerName:pName(game,astroId),role:'Astronomer',cause:'meteor_backfire', reason:'meteor_backfire'});
                    }
                } else if (WW_ROLES.includes(game.roles[mtId]) && astroId) {
                    addMvpScore(game, astroId, 5); // MVP: Astronomer killed WW
                }
            }
        }
    }

    // === Arsonist ===
    if (na.arsonIgnite && game.dousedPlayers.length > 0) {
        const arsonId=game.alive.find(id=>game.roles[id]==='Arsonist');
        for (const id of [...game.dousedPlayers]) {
            if (game.alive.includes(id)) {
                if (id === game.jailedTonight) continue; // Protected inside jail!
                if (killPlayer(game,id,'arsonist')) {
                    if (arsonId) addMvpScore(game, arsonId, 3); // MVP: Arsonist ignite kill
                    deathList.push({type:'death',playerId:id,playerName:pName(game,id),role:cwMask?'???':game.roles[id],cause:'fire', reason:'arson'});
                    await handleDeathCascade(game,id,deathList);
                }
            }
        }
        game.dousedPlayers=[];
    } else if (na.arsonDouse && !game.dousedPlayers.includes(na.arsonDouse)) {
        game.dousedPlayers.push(na.arsonDouse);
        const arsonId=game.alive.find(id=>game.roles[id]==='Arsonist');
        if (arsonId) {
            addMvpScore(game, arsonId, 1); // MVP: Arsonist douse
            send(pSock(game,arsonId),'action_confirmed',{text:`🛢️ ${pName(game,na.arsonDouse)} telah disiram bensin!`});
        }
    }

    // === Medium revive ===
    if (na.mediumTarget && game.dead.includes(na.mediumTarget)) {
        const medId=game.alive.find(id=>game.roles[id]==='Medium');
        if (medId) {
            game.mediumUsed.push(medId);
            const rid=na.mediumTarget;
            game.dead=game.dead.filter(x=>x!==rid); game.alive.push(rid);
            const rp=game.players.find(p=>p.id===rid); if(rp) rp.alive=true;
            deathList.push({type:'info',text:`✨ KEAJAIBAN! Roh ${pName(game,rid)} dipanggil kembali! Mereka hidup kembali!`});
            
            // MVP: Medium revived a crucial village role
            if (isVillageTeam(game.roles[rid])) {
                addMvpScore(game, medId, 4);
            } else {
                addMvpScore(game, medId, -2); // MVP Penalty: revived an enemy
            }
            
            // Notify revived player privately
            send(pSock(game,rid),'revived',{});
            // Broadcast revive visual to ALL players
            bcast(game.sessionId,'player_revived',{ playerId: rid, playerName: pName(game,rid) });
        }
    }

    // === Detektif result ===
    if (na.detTarget && !na.detTargetDone) {
        const detId = game.alive.find(id => game.roles[id] === 'Detektif');
        if (detId) {
            executeDetInvestigation(game, detId, na.detTarget);
        }
    }

    // (Jailer execution is handled immediately upon clicking shoot at night)

    // Notify glitched & bread
    if (game.glitchedToday) { const gp=game.players.find(p=>p.id===game.glitchedToday); if(gp) send(gp.socketId,'glitch_notify',{message:'🖥️ Kamu di-GLITCH! Hari ini tidak bisa bicara, voting, atau skill. Kamu akan mati setelah voting.'}); }
    if (game.breadGivenTo) { const bp=game.players.find(p=>p.id===game.breadGivenTo); if(bp) send(bp.socketId,'bread_notify',{message:'🍞 Kamu menerima roti hangat pagi ini! Suara votingmu bernilai +1 hari ini.'}); }

    bcast(game.sessionId, 'night_resolved', { deaths:deathList.filter(d=>d.type==='death').map(d=>d.playerId), announcements:deathList });

    const win=checkWin(game); if(win){await sleep(3000);triggerWin(game,win);return;}
    const deathCount = deathList.filter(d => d.type === 'death').length;
    let animWait = 1500;
    if (deathCount > 0) {
        animWait = deathList.length * 3700 + 1800;
    } else if (deathList.length > 0) {
        animWait = 2500;
    }
    await sleep(animWait);
    startDay(game);
}

// ─── DAY PHASE ─────────────────────────────────────────────────────────────────
async function startDay(game) {
    if (game.gameEnded) return;
    game.phase = 'day'; game.dayVotesMap = {};
    game.berserkActive = false;
    game.votingDisabledToday = false;
    const isWfAlive = game.alive.some(id => game.roles[id] === 'Wolffluencer');
    game.influencedPlayerToday = (isWfAlive && game.nightActions && game.nightActions.wolffluencerTarget && game.alive.includes(game.nightActions.wolffluencerTarget)) ? game.nightActions.wolffluencerTarget : null;
    if (game.influencedPlayerToday) {
        const infId = game.influencedPlayerToday;
        send(pSock(game, infId), 'wolffluencer_puppet_notify', { message: '🧵 Kamu sedang DIKONTROL (Puppet) oleh Wolffluencer hari ini! Suara votingmu otomatis mengikuti voting Wolffluencer dan kamu tidak bisa melakukan vote mandiri.' });
    }
    game.phaseEndTime = Date.now() + 60000;
    bcastPhaseChange(game, 'day', `☀️ Hari ke-${game.dayCount} — Diskusikan siapa Werewolf!`);
    bcast(game.sessionId,'timer_start',{duration:60,phase:'day'});

    // Day abilities
    const aliveList=game.alive.map(id=>{const p=game.players.find(x=>x.id===id);return{id:p.id,name:p.name,avatar:p.avatar};});
    game.players.filter(p=>p.alive&&p.id!==game.glitchedToday).forEach(p=>{
        const r=game.roles[p.id];
        if (r==='Berserk Werewolf'&&!game.berserkUsed.includes(p.id)) send(p.socketId,'day_ability',{type:'berserk_activate'});
        if (r==='Party Werewolf'&&!game.pwUsed.includes(p.id)) send(p.socketId,'day_ability',{type:'pw_kill',targets:aliveList.filter(x=>x.id!==p.id)});
        if (r==='Shadow Wolf'&&!game.swUsed.includes(p.id)) send(p.socketId,'day_ability',{type:'sw_manipulate'});
        if (r==='Princess'&&!game.princessRevealed.includes(p.id)) send(p.socketId,'day_ability',{type:'princess_reveal'});
        if (r==='Hakim'&&(game.judgeUses[p.id]||0)>0) send(p.socketId,'day_ability',{type:'hakim_execute',targets:aliveList.filter(x=>x.id!==p.id)});
        if (r==='Polisi' && game.policeUses[p.id]) {
            const uses = game.policeUses[p.id];
            if (uses.shoot > 0 || uses.reveal > 0) {
                send(p.socketId,'day_ability',{type:'polisi_action', targets:aliveList.filter(x=>x.id!==p.id), canShoot: uses.shoot > 0, canReveal: uses.reveal > 0});
            }
        }
        if (r==='Jailer') send(p.socketId,'day_ability',{type:'jailer_select', targets:aliveList.filter(x=>x.id!==p.id)});
        if (r==='Nightmare Wolf' && (game.nwUses[p.id]||0)>0) send(p.socketId,'day_ability',{type:'nw_sleep', targets:aliveList.filter(x=>x.id!==p.id && !WW_ROLES.includes(game.roles[x.id]))});
        if (r==='Pendeta' && !game.priestUsed.includes(p.id)) send(p.socketId,'day_ability',{type:'priest_holy', targets:aliveList.filter(x=>x.id!==p.id)});
        if (r==='Junior Wolf') send(p.socketId,'day_ability',{type:'jw_revenge_select'});
        if (r==='Pacifist' && !game.pacifistUsed.includes(p.id)) send(p.socketId,'day_ability',{type:'pacifist_reveal', targets:aliveList.filter(x=>x.id!==p.id)});
    });
    if (game.glitchedToday) send(pSock(game,game.glitchedToday),'day_ability',{type:'glitched'});

    game.dayTimer=setTimeout(()=>startVote(game),60000);
}

// ─── VOTE PHASE ────────────────────────────────────────────────────────────────
async function startVote(game) {
    if (game.gameEnded) return;
    clearTimeout(game.dayTimer); game.phase='vote'; game.dayVotesMap={};
    if (game.votingDisabledToday) {
        bcastPhaseChange(game, 'vote', '🕊️ Voting dibatalkan oleh Pacifist hari ini!', []);
        await sleep(3000);
        const anns = [{ type: 'info', text: '🕊️ **Voting dibatalkan oleh Pacifist!** Tidak ada pemain yang dieksekusi hari ini.' }];
        bcast(game.sessionId, 'vote_result', { tally: {}, announcements: anns });
        await sleep(4000);
        await checkGameEnd(game) || startNight(game);
        return;
    }
    const targets=game.alive.map(id=>{const p=game.players.find(x=>x.id===id);return{id:p.id,name:p.name,avatar:p.avatar};});
    bcastPhaseChange(game, 'vote', '🗳️ Waktunya voting!', targets);
    game.phaseEndTime = Date.now() + 30000;
    bcast(game.sessionId,'timer_start',{duration:30,phase:'vote'});
    game.voteTimer=setTimeout(()=>resolveVote(game),30000);
}

// ─── VOTE RESOLUTION ───────────────────────────────────────────────────────────
async function resolveVote(game) {
    if (game.gameEnded) return;
    clearTimeout(game.voteTimer);
    const anns=[];

    if (game.votingDisabledToday) {
        anns.push({ type: 'info', text: '🕊️ **Voting dibatalkan oleh Pacifist!** Tidak ada pemain yang dieksekusi hari ini.' });
        bcast(game.sessionId, 'vote_result', { tally: {}, announcements: anns });
        await sleep(4000);
        await checkGameEnd(game) || startNight(game);
        return;
    }

    // Tally
    if (game.influencedPlayerToday && game.alive.includes(game.influencedPlayerToday)) {
        const wfId = game.alive.find(id => game.roles[id] === 'Wolffluencer');
        if (wfId && game.dayVotesMap[wfId]) {
            game.dayVotesMap[game.influencedPlayerToday] = game.dayVotesMap[wfId];
        }
    }
    const tally={};
    for (const voterId of game.alive) {
        if (game.glitchedToday===voterId) continue;
        const target=game.dayVotesMap[voterId]||'skip';
        let w=game.princessRevealed.includes(voterId)?2:1;
        if (game.breadGivenTo===voterId) w+=1;
        if (game.swActiveToday&&WW_ROLES.includes(game.roles[voterId])) w*=2;
        tally[target]=(tally[target]||0)+w;
    }
    game.breadGivenTo=null; game.swActiveToday=false; game.influencedPlayerToday=null;

    // Hakim override
    if (game.hakimForceExec && game.alive.includes(game.hakimForceExec)) {
        const forced=game.hakimForceExec; game.hakimForceExec=null;
        const fRole=game.roles[forced];
        
        // Check if Hakim killed a villager!
        const hakimId = game.alive.find(id=>game.roles[id]==='Hakim');
        if (isVillageTeam(fRole) && hakimId) {
            // Hakim suicide!
            if (killPlayer(game,hakimId,'god')) {
                anns.push({type:'info', text:`${ROLE_EMOJI['Hakim']} Hakim menjatuhkan vonis ke warga tak bersalah! Keadilan berbalik, Hakim mati!`});
                anns.push({type:'death',playerId:hakimId,playerName:pName(game,hakimId),role:'Hakim',cause:'hakim_suicide', reason:'hakim_suicide'});
                const deathList=[]; await handleDeathCascade(game,hakimId,deathList); anns.push(...deathList);
            }
        } else {
            if (killPlayer(game,forced,'hakim')) {
                // MVP: Hakim correct judgment
                if (!isVillageTeam(fRole) && hakimId) {
                    addMvpScore(game, hakimId, 5);
                } else if (hakimId) {
                    addMvpScore(game, hakimId, -3); // MVP Penalty: Hakim executed village
                }
                anns.push({type:'execution',playerId:forced,playerName:pName(game,forced),role:fRole,votes:tally,forced:true, reason:'hakim'});
                const deathList=[];
                await handleDeathCascade(game,forced,deathList);
                anns.push(...deathList);
                if (fRole==='Badut') { triggerWin(game,{winner:'Badut',reason:`${pName(game,forced)} (Badut) berhasil dijebak! Badut menang!`}); return; }
                const hhWin=checkHHWin(game,forced,'vote'); if(hhWin){await sleep(2000);triggerWin(game,hhWin);return;}
            }
        }
    } else {
        let maxV=0,execId=null,isTie=false;
        for (const [tid,c] of Object.entries(tally)) {
            if (c>maxV){maxV=c;execId=tid;isTie=false;}
            else if (c===maxV) isTie=true;
        }
        if (!isTie&&execId&&execId!=='skip'&&game.alive.includes(execId)) {
            const isGlitch=game.glitchedToday===execId;
            const execRole=isGlitch?'???':game.roles[execId];
            if (killPlayer(game,execId,'vote')) {
                // MVP: Reward players who voted out a bad guy
                const victimRole = game.roles[execId];
                if (!isVillageTeam(victimRole)) {
                    for (const [voterId, targetId] of Object.entries(game.dayVotesMap)) {
                        if (targetId === execId && isVillageTeam(game.roles[voterId])) {
                            // Villager guessed correctly
                            addMvpScore(game, voterId, game.roles[voterId] === 'Villager' ? 2 : 1);
                        } else if (targetId === execId && game.roles[voterId] === 'Shadow Wolf' && game.swActiveToday && isVillageTeam(victimRole)) {
                            // Shadow wolf successfully manipulated vote to hang villager
                            addMvpScore(game, voterId, 3);
                        }
                    }
                }
                
                anns.push({type:'execution',playerId:execId,playerName:pName(game,execId),role:execRole,votes:tally, reason:'vote'});
                const dl=[]; await handleDeathCascade(game,execId,dl); anns.push(...dl);
                if (!isGlitch&&game.roles[execId]==='Badut'){triggerWin(game,{winner:'Badut',reason:`${pName(game,execId)} (Badut) berhasil dijebak!`});return;}
                if (!isGlitch){const hhW=checkHHWin(game,execId,'vote');if(hhW){await sleep(2000);triggerWin(game,hhW);return;}}
            }
        } else {
            anns.push({type:'no_execution',votes:tally,reason:isTie?'Seri! Tidak ada yang digantung.':'Voting di-skip!'});
        }
    }

    // Kill glitched after vote
    if (game.glitchedToday&&game.alive.includes(game.glitchedToday)) {
        const gId=game.glitchedToday;
        if (killPlayer(game,gId,'corruptor')) {
            anns.push({type:'death',playerId:gId,playerName:pName(game,gId),role:'???',cause:'glitch', reason:'glitch'});
            const dl=[]; await handleDeathCascade(game,gId,dl); anns.push(...dl);
        }
    }
    game.glitchedToday=null;

    // === Resolve Bodyguard Death from Injury ===
    if (game.bgInjured && game.bgInjured.length > 0) {
        for (const injuredBgId of game.bgInjured) {
            if (game.alive.includes(injuredBgId)) {
                if (killPlayer(game, injuredBgId, 'injury')) {
                    anns.push({type:'death', playerId:injuredBgId, playerName:pName(game,injuredBgId), role:'Bodyguard', cause:'bg_injury', reason:'injury'});
                    const dl=[]; await handleDeathCascade(game, injuredBgId, dl); anns.push(...dl);
                }
            }
        }
        game.bgInjured = []; // Clear after death
    }

    bcast(game.sessionId,'vote_resolved',{announcements:anns,votes:tally});
    const win=checkWin(game); if(win){await sleep(3000);triggerWin(game,win);return;}
    await sleep(4000);
    game.dayCount++;
    startNight(game);
}

function checkHHWin(game, executedId, cause) {
    for (const [hhId, target] of Object.entries(game.hhTarget)) {
        if (target===executedId && cause==='vote' && game.alive.includes(hhId)) {
            return {winner:'Head Hunter', reason:`${pName(game,hhId)} (Head Hunter) berhasil! Target mereka ${pName(game,executedId)} digantung warga!`};
        }
    }
    return null;
}

// ─── Socket.io Events ──────────────────────────────────────────────────────────
io.on('connection', socket => {

    socket.on('join_game', async ({sessionId,discordId,name,avatar}) => {
        if (!sessionId || !discordId || !name) {
            return socket.emit('error', { message: 'Data join tidak lengkap/valid.' });
        }
        const game=sessions.get(sessionId);
        if (!game) return socket.emit('error',{message:'Session tidak ditemukan! Link mungkin sudah kadaluarsa.'});
        if (game.phase!=='lobby'&&!game.players.find(p=>p.id===discordId)) {
            if (!OWNER_IDS.includes(discordId)) {
                return socket.emit('error',{message:'Game sudah dimulai dan kamu belum terdaftar!'});
            }
        }
        if (name && typeof name === 'string') {
            const nameConflict = game.players.some(p => p.id !== discordId && p.name.trim().toLowerCase() === name.trim().toLowerCase());
            if (nameConflict) {
                return socket.emit('error', { message: `❌ Nama "${name.trim()}" sudah digunakan oleh pemain lain di room ini! Silakan gunakan nama lain.` });
            }
        }

        let finalAvatar = avatar;
        if (game.avatarMap && game.avatarMap[name.toLowerCase()]) {
            finalAvatar = game.avatarMap[name.toLowerCase()];
        } else if (game.guildId && game.botToken) {
            try {
                const fetchFunc = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
                const res = await fetchFunc(`https://discord.com/api/v10/guilds/${game.guildId}/members/search?query=${encodeURIComponent(name)}&limit=1`, {
                    headers: { 'Authorization': `Bot ${game.botToken}` }
                });
                const data = await res.json();
                if (data && data.length > 0) {
                    const u = data[0].user;
                    if (u.avatar) {
                        finalAvatar = `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`;
                        if (!game.avatarMap) game.avatarMap = {};
                        game.avatarMap[name.toLowerCase()] = finalAvatar;
                    }
                }
            } catch(e) { console.error('Dynamic avatar fetch error:', e.message); }
        }

        const existing=game.players.find(p=>p.id===discordId);
        if (existing) { 
            existing.socketId=socket.id; existing.name=name; existing.avatar=finalAvatar; 
            socket.join(sessionId); 
            if (game.phase !== 'lobby') {
                const pRole = game.roles[discordId];
                socket.emit('game_started', { playerCount: game.players.length });
                let team = 'village';
                if (WW_ROLES.includes(pRole)) team = 'ww'; else if (SOLO_ROLES.includes(pRole)) team = 'solo';
                let wwAllies = [];
                if (team === 'ww') wwAllies = game.players.filter(x => WW_ROLES.includes(game.roles[x.id])).map(x => ({ name: x.name, role: game.roles[x.id] }));
                socket.emit('role_assigned', { role: pRole, emoji: ROLE_EMOJI[pRole]||'❓', team, wwAllies });
                socket.emit('joined',{game:getPublicState(game, discordId),isHost:game.host===discordId,playerId:discordId});
                const voteTargets = Object.entries(game.dayVotesMap || {}).map(([v, t]) => ({ voterId: v, targetId: t }));
                socket.emit('phase_change', { phase: game.phase, dayCount: game.dayCount, message: 'Menghubungkan kembali...', voteTargets, state: getPublicState(game, discordId) });
                if (game.phaseEndTime) {
                    const remaining = Math.floor((game.phaseEndTime - Date.now()) / 1000);
                    if (remaining > 0) socket.emit('timer_start', { duration: remaining, phase: game.phase });
                }
            } else {
                socket.emit('joined',{game:getPublicState(game, discordId),isHost:game.host===discordId,playerId:discordId}); 
            }
            return; 
        }

        if (game.phase !== 'lobby' && OWNER_IDS.includes(discordId)) {
            game.players.push({socketId:socket.id,id:discordId,name:name,avatar:finalAvatar||'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',role:'Spectator',alive:false});
            game.roles[discordId] = 'Spectator';
            socket.join(sessionId);
            socket.emit('game_started', { playerCount: game.players.length });
            socket.emit('role_assigned', { role: 'Spectator', emoji: '👁️', team: 'village', wwAllies: [] });
            socket.emit('joined', { game: getPublicState(game, discordId), isHost: false, playerId: discordId });
            socket.emit('phase_change', { phase: game.phase, dayCount: game.dayCount, message: 'Menghubungkan sebagai Spectator...', voteTargets: [], state: getPublicState(game, discordId) });
            return;
        }

        game.players.push({socketId:socket.id,id:discordId,name,avatar:finalAvatar,role:null,alive:true});
        socket.join(sessionId);
        socket.emit('joined',{game:getPublicState(game, discordId),isHost:game.host===discordId,playerId:discordId});
        bcastLobbyUpdate(game, `${name} bergabung!`);
    });

    socket.on('update_role_settings',({sessionId,discordId,roleSettings})=>{
        const game=sessions.get(sessionId);
        if(!game||game.host!==discordId||game.phase!=='lobby') return;
        game.roleSettings={...game.roleSettings,...roleSettings};
        bcast(sessionId,'lobby_update',{game:getPublicState(game)});
    });

    socket.on('update_game_mode',({sessionId,discordId,isRandomMode})=>{
        const game=sessions.get(sessionId);
        if(!game||game.host!==discordId||game.phase!=='lobby') return;
        game.isRandomMode = isRandomMode;
        bcast(sessionId,'lobby_update',{game:getPublicState(game)});
    });

    socket.on('update_random_counts',({sessionId,discordId,randomRoleCounts})=>{
        const game=sessions.get(sessionId);
        if(!game||game.host!==discordId||game.phase!=='lobby') return;
        game.randomRoleCounts={...game.randomRoleCounts,...randomRoleCounts};
        bcast(sessionId,'lobby_update',{game:getPublicState(game)});
    });

    socket.on('kick_player', ({sessionId, hostId, targetId}) => {
        const game = sessions.get(sessionId);
        if (!game || game.host !== hostId || game.phase !== 'lobby') return;
        
        const targetPlayer = game.players.find(p => p.id === targetId);
        if (targetPlayer) {
            send(targetPlayer.socketId, 'kicked', {});
            game.players = game.players.filter(p => p.id !== targetId);
            bcast(sessionId, 'lobby_update', {game: getPublicState(game), message: `${targetPlayer.name} telah di-kick oleh Host.`});
        }
    });

    socket.on('leave_game', ({sessionId, discordId}) => {
        const game = sessions.get(sessionId);
        if (!game || game.phase !== 'lobby') return;
        
        const targetPlayer = game.players.find(p => p.id === discordId);
        if (targetPlayer) {
            game.players = game.players.filter(p => p.id !== discordId);
            bcast(sessionId, 'lobby_update', {game: getPublicState(game), message: `${targetPlayer.name} telah keluar dari lobby.`});
        }
    });

    socket.on('close_session', ({sessionId, hostId}) => {
        const game = sessions.get(sessionId);
        if (!game || game.host !== hostId || game.phase !== 'lobby') return;
        bcast(sessionId, 'session_closed', {});
        sessions.delete(sessionId);
    });

    socket.on('lobby_chat', ({sessionId, discordId, text}) => {
        const game = sessions.get(sessionId);
        if (!game || game.phase !== 'lobby') return;
        const player = game.players.find(p => p.id === discordId);
        if (player) {
            bcast(sessionId, 'lobby_chat_msg', { senderId: discordId, senderName: player.name, avatar: player.avatar, text });
        }
    });

    socket.on('start_game',({sessionId,discordId})=>{
        const game=sessions.get(sessionId);
        if(!game||game.host!==discordId) return socket.emit('error',{message:'Hanya host yang bisa memulai!'});
        if(game.players.length<4) return socket.emit('error',{message:'Minimal 4 pemain!'});
        
        let totalWw = 0;
        let totalSpecial = 0;
        if (game.isRandomMode) {
            totalWw = game.randomRoleCounts.ww;
            totalSpecial = totalWw + game.randomRoleCounts.special + game.randomRoleCounts.solo;
            if (totalWw < 1) return socket.emit('error',{message:'Minimal 1 Random Werewolf!'});
        } else {
            const rs = game.roleSettings;
            totalWw = (rs.ww||0) + (rs.nw||0) + (rs.jw||0) + (rs.bw||0) + (rs.cw||0) + (rs.pw||0) + (rs.sw||0);
            totalSpecial = Object.values(rs).reduce((a,b)=>a+b,0);
            if (totalWw < 1) return socket.emit('error',{message:'Minimal harus ada 1 Serigala!'});
        }
        
        if (totalSpecial > game.players.length) return socket.emit('error',{message:'Role terlalu banyak melebihi jumlah pemain!'});
        
        startGame(game);
    });

    // ─── Night Actions ────────────────────────────────────────────────────────
    socket.on('night_action',({sessionId,discordId,action,targetId,extra})=>{
        const game=sessions.get(sessionId);
        if(!game||game.phase!=='night'||!game.alive.includes(discordId)) return;
        const role=game.roles[discordId];
        const na=game.nightActions;
        if (game.nwSleeping === discordId || game.glitchedToday === discordId || game.jailedTonight === discordId) return;

        if (WW_ROLES.includes(role)) {
            if (action==='ww_vote') {
                if (WW_ROLES.includes(game.roles[targetId])) {
                    return socket.emit('glitch_warning', {message:'🔴 Kamu tidak bisa memangsa sesama Werewolf!'});
                }
                na.wwVotes[discordId]=targetId; na.wwTarget=targetId;
                const wwVoteCounts = {};
                Object.values(na.wwVotes).forEach(tid => { wwVoteCounts[tid] = (wwVoteCounts[tid] || 0) + 1; });
                const wwPlayers = game.players.filter(p=>WW_ROLES.includes(game.roles[p.id])&&p.alive);
                wwPlayers.forEach(a=>send(a.socketId,'ww_vote_update',{voter:pName(game,discordId),target:pName(game,targetId),votes:wwVoteCounts}));
            }
            if (action==='cw_toggle'&&role==='Confusion Wolf'&&(game.cwUses[discordId]||0)>0) {
                na.cwToggle=!na.cwToggle; game.cwUses[discordId]--;
                socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Confusion Wolf']} Identity Mask: ${na.cwToggle?'AKTIF':'NONAKTIF'} (Sisa ${game.cwUses[discordId]}x)`});
            }
        }
        else if (role==='Dokter'&&action==='doc_protect') { na.docTarget=targetId; socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Dokter']} Perlindungan dikunci ke ${pName(game,targetId)}`}); }
        else if (role==='Bodyguard'&&action==='bg_protect') { na.bgTarget=targetId; socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Bodyguard']} Siap menjaga ${pName(game,targetId)}`}); }
        else if (role==='Penerawang'&&action==='seer_check') {
            if (na.seerTargetDone) return socket.emit('action_confirmed', { text: '❌ Kamu sudah menerawang malam ini!' });
            if (!game.alive.includes(targetId)) return socket.emit('action_confirmed', { text: '❌ Target sudah mati! Tidak bisa diterawang.' });
            na.seerTarget=targetId;
            na.seerTargetDone=true;
            const trueRole=game.shapeshifterSeenAs[targetId]||game.roles[targetId];
            const isWW=WW_ROLES.includes(trueRole);
            const isSolo=SOLO_ROLES.includes(trueRole);
            if (isWW || isSolo) addMvpScore(game, discordId, 3);
            socket.emit('seer_result',{targetId,targetName:pName(game,targetId),isWerewolf:isWW,role:trueRole,emoji:ROLE_EMOJI[trueRole]||'?'});
        }
        else if (role==='Werewolf Seer'&&action==='ws_check') {
            if (na.wsTargetDone) return socket.emit('action_confirmed', { text: '❌ Kamu sudah menerawang malam ini!' });
            if (!game.alive.includes(targetId)) return socket.emit('action_confirmed', { text: '❌ Target sudah mati! Tidak bisa diterawang.' });
            na.wsTarget=targetId;
            na.wsTargetDone=true;
            const trueRole=game.shapeshifterSeenAs[targetId]||game.roles[targetId];
            const isWW=WW_ROLES.includes(trueRole);
            const isSolo=SOLO_ROLES.includes(trueRole);
            if (isVillageTeam(trueRole) || isSolo) addMvpScore(game, discordId, 3);
            socket.emit('seer_result',{targetId,targetName:pName(game,targetId),isWerewolf:isWW,role:trueRole,emoji:ROLE_EMOJI[trueRole]||'❓',isWolfSeer:true});
        }
        else if (role==='Werewolf Seer'&&action==='ws_resign') {
            game.roles[discordId] = 'Werewolf';
            const pObj = game.players.find(x => x.id === discordId);
            if (pObj) pObj.role = 'Werewolf';
            socket.emit('announcement', { text: '🐺 Kamu telah melepaskan kekuatan terawangmu selamanya dan berubah menjadi Werewolf biasa!' });
            const aliveList = game.alive.map(id => { const p=game.players.find(x=>x.id===id); return {id:p.id,name:p.name,avatar:p.avatar}; });
            const allies = game.players.filter(x=>WW_ROLES.includes(game.roles[x.id])&&x.alive&&x.id!==discordId).map(x=>({id:x.id,name:x.name,avatar:x.avatar}));
            const targets = aliveList.filter(x=>x.id!==discordId&&!WW_ROLES.includes(game.roles[x.id]));
            send(socket.id, 'night_ui', { type:'ww_vote', targets, allies, role:'Werewolf' });
        }
        else if (role==='Detektif'&&action==='det_investigate') { 
            if (na.detTargetDone) return socket.emit('action_confirmed', { text: '❌ Kamu sudah menyelidiki malam ini!' });
            if (game.alive.includes(targetId)) return socket.emit('action_confirmed', { text: '❌ Pilih makam pemain yang sudah mati!' });
            na.detTarget=targetId; 
            na.detTargetDone=true;
            socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Detektif']} Menyelidiki makam ${pName(game,targetId)}...`}); 
            executeDetInvestigation(game, discordId, targetId);
        }
        else if (role==='Corruptor'&&action==='cor_glitch') { 
            na.corTarget=targetId; 
            addMvpScore(game, discordId, 2); // MVP: Corruptor glitch
            socket.emit('action_confirmed',{text:`🖥️ Target Glitch dikunci: ${pName(game,targetId)}`}); 
        }
        else if (role==='Baker'&&action==='baker_bread') { 
            na.bakerTarget=targetId; 
            const targetRole = game.roles[targetId];
            if (isVillageTeam(targetRole)) addMvpScore(game, discordId, 2); // MVP: Baker gave bread to village
            else addMvpScore(game, discordId, -1); // MVP Penalty: Baker gave bread to enemy
            socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Baker']} Roti akan dikirim ke ${pName(game,targetId)}`}); 
        }
        else if (role==='Arsonist') {
            if(action==='arson_douse'){na.arsonDouse=targetId;na.arsonIgnite=false;socket.emit('action_confirmed',{text:`🛢️ ${pName(game,targetId)} disiram bensin!`});}
            if(action==='arson_ignite'){na.arsonIgnite=true;na.arsonDouse=null;socket.emit('action_confirmed',{text:'🔥 API DINYALAKAN!'});}
        }
        else if (role==='Grave Robber'&&action==='gr_target') { 
            na.grTarget=targetId; 
            addMvpScore(game, discordId, 2); // MVP: GR target lock
            socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Grave Robber']} Menargetkan ${pName(game,targetId)} untuk dicuri rolenya kelak!`}); 
        }
        else if (role==='Cupid'&&action==='cupid_pair'&&!game.cupidDone) {
            if(!na.cupidPair.includes(targetId)&&na.cupidPair.length<2) {
                na.cupidPair.push(targetId);
                if (na.cupidPair.length === 2) addMvpScore(game, discordId, 3); // MVP: Cupid pair
                socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Cupid']} (${na.cupidPair.length}/2) ${pName(game,targetId)} dipilih!`});
            }
        }
        else if (role==='Medium'&&action==='medium_revive'&&!game.mediumUsed.includes(discordId)) { 
            if (game.alive.includes(targetId)) return socket.emit('action_confirmed', { text: '❌ Pilih roh pemain yang sudah mati!' });
            na.mediumTarget=targetId; 
            socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Medium']} Memanggil roh ${pName(game,targetId)}...`}); 
        }
        else if (role==='Junior Wolf'&&action==='jw_target'&&targetId) { 
            if (WW_ROLES.includes(game.roles[targetId])) return socket.emit('glitch_warning',{message:'🔴 Kamu tidak bisa menargetkan sesama Werewolf!'});
            game.jwRevenge[discordId]=targetId; socket.emit('action_confirmed',{text:`🎯 Target Balas Dendam diganti ke ${pName(game,targetId)}!`}); socket.emit('jw_target_update',{targetId}); 
        }
        else if (role==='Wolffluencer'&&action==='wolffluencer_influence'&&targetId) { 
            if (WW_ROLES.includes(game.roles[targetId])) return socket.emit('glitch_warning',{message:'🔴 Kamu tidak bisa meng-influence sesama Werewolf!'});
            na.wolffluencerTarget=targetId; 
            addMvpScore(game, discordId, 2);
            socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Wolffluencer']} Mengontrol (influence) ${pName(game,targetId)} untuk menjadi Puppet esok hari!`}); 
        }
        else if (role==='Astronomer') {
            if(action==='astro_moon'&&!game.astroMoonUsed.includes(discordId)){na.astroMoon=true;game.astroMoonUsed.push(discordId);na.astroMeteorTarget=null;socket.emit('action_confirmed',{text:'🌑 New Moon diaktifkan!'});}
            if(action==='astro_meteor'&&!game.astroMeteorUsed.includes(discordId)){na.astroMeteorTarget=targetId;game.astroMeteorUsed.push(discordId);na.astroMoon=false;socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Astronomer']} Meteor dikunci ke ${pName(game,targetId)}`});}
        }
        else if (role==='Shapeshifter'&&action==='ss_kill') { na.ssTarget=targetId; socket.emit('action_confirmed',{text:`${ROLE_EMOJI['Shapeshifter']} Menargetkan ${pName(game,targetId)} untuk dibunuh!`}); }
        else if (role==='Jailer'&&action==='jailer_execute') {
            if ((game.jailerBullet && game.jailerBullet[discordId]) > 0 && game.jailedTonight && game.alive.includes(game.jailedTonight)) {
                game.jailerBullet[discordId]--;
                const targetId = game.jailedTonight;
                const targetRole = game.roles[targetId];
                addMvpScore(game, discordId, isVillageTeam(targetRole) ? -3 : 4);
                if (killPlayer(game, targetId, 'shoot')) {
                    socket.emit('action_confirmed',{text:`💥 Tahanan dieksekusi mati di sel! (Sisa Peluru: ${game.jailerBullet[discordId]})`});
                    bcast(sessionId, 'announcement', { text: `💥 DOR! **${pName(game,discordId)} (Jailer)** langsung menembak mati tahanannya **${pName(game,targetId)}** di dalam sel!` });
                    bcast(sessionId, 'player_died', { playerId: targetId, playerName: pName(game,targetId), role: targetRole, reason: 'shoot' });
                    const dl = [];
                    handleDeathCascade(game, targetId, dl).then(() => {
                        if (dl.length) bcast(sessionId, 'announcements_list', dl);
                        const w = checkWin(game); if (w) triggerWin(game, w);
                    });
                }
            } else {
                socket.emit('glitch_warning',{message:'Peluru habis atau tahanan sudah mati!'});
            }
        }
        else if (role === 'Sect Leader' && action === 'sect_convert') {
            if (!game.alive.includes(targetId)) return socket.emit('glitch_warning', { message: '🔴 Kamu tidak bisa mengonversi pemain yang sudah mati!' });
            const aliveSect = game.alive.filter(id => (game.sectMembers||[]).includes(id));
            if (aliveSect.length >= 5) return socket.emit('glitch_warning', { message: '🔴 Anggota sekte hidup sudah mencapai batas maksimal (5 orang)!' });
            na.sectConvertTarget = targetId;
            na.sectSacrificeTarget = null; na.sectSacrificeMember = null;
            socket.emit('action_confirmed', { text: `🔮 Target konversi dikunci ke ${pName(game, targetId)}` });
        }
        else if (role === 'Sect Leader' && action === 'sect_sacrifice') {
            const sacrificeMember = extra?.sacrificeMember;
            if (!sacrificeMember || !targetId) return socket.emit('glitch_warning', { message: '🔴 Pilih anggota untuk dikorbankan dan korban bunuh!' });
            if (!game.alive.includes(targetId) || !game.alive.includes(sacrificeMember)) return socket.emit('glitch_warning', { message: '🔴 Target atau anggota sekte yang dikorbankan sudah mati!' });
            const sectMembers = game.sectMembers || [];
            if (!sectMembers.includes(sacrificeMember)) return socket.emit('glitch_warning', { message: '🔴 Pilihan pengorbanan harus dari anggota sekte!' });
            if (sacrificeMember === discordId) return socket.emit('glitch_warning', { message: '🔴 Sect Leader tidak bisa mengorbankan diri sendiri!' });
            if (sectMembers.includes(targetId) || targetId === discordId) return socket.emit('glitch_warning', { message: '🔴 Target bunuh tidak boleh sesama anggota sekte!' });
            na.sectSacrificeMember = sacrificeMember;
            na.sectSacrificeTarget = targetId;
            na.sectConvertTarget = null;
            socket.emit('action_confirmed', { text: `🗡️ Ritual pengorbanan dikunci: Mengorbankan ${pName(game, sacrificeMember)} untuk membunuh ${pName(game, targetId)}!` });
        }
    });

    // ─── Day Actions ──────────────────────────────────────────────────────────
    socket.on('day_action',({sessionId,discordId,action,targetId})=>{
        const game=sessions.get(sessionId);
        if(!game||!['day','vote'].includes(game.phase)||!game.alive.includes(discordId)) return;
        if(game.glitchedToday===discordId) return socket.emit('glitch_warning',{message:'👾 Kamu di-glitch! Tidak bisa menggunakan skill.'});
        const role=game.roles[discordId];

        if(action==='berserk_activate'&&role==='Berserk Werewolf'&&!game.berserkUsed.includes(discordId)){
            game.berserkUsed.push(discordId); game.berserkActive=true;
            bcast(sessionId,'announcement',{text:'🩸 **Werewolf Mengamuk malam ini!**'});
        }
        if(action==='pw_kill'&&role==='Party Werewolf'&&!game.pwUsed.includes(discordId)&&targetId){
            if (WW_ROLES.includes(game.roles[targetId])) return socket.emit('glitch_warning',{message:'🔴 Kamu tidak bisa meledakkan sesama Werewolf!'});
            game.pwUsed.push(discordId);
            const tRole = game.roles[targetId];
            if (killPlayer(game,targetId,'pw')) {
                addMvpScore(game, discordId, 4); // MVP: PW bomb
                bcast(sessionId,'announcement',{text:`${ROLE_EMOJI['Party Werewolf']} BAAANG! **${pName(game,discordId)}** menembakkan kembang api mematikan ke **${pName(game,targetId)}**! Identitasnya sebagai Party Wolf terbongkar!`});
                bcast(sessionId,'pw_explosion',{killer:pName(game,discordId), killerId:discordId, target:pName(game,targetId), targetId, targetRole:tRole});
                bcast(sessionId,'player_died',{playerId:targetId,playerName:pName(game,targetId),role:tRole, reason:'bomb'});
                const dl=[]; handleDeathCascade(game,targetId,dl).then(()=>{
                    if(dl.length)bcast(sessionId,'announcements_list',dl);
                    const w=checkWin(game);if(w)triggerWin(game,w);
                });
            }
        }
        if(action==='sw_manipulate'&&role==='Shadow Wolf'&&!game.swUsed.includes(discordId)){
            game.swUsed.push(discordId); game.swActiveToday=true;
            bcast(sessionId,'announcement',{text:`${ROLE_EMOJI['Shadow Wolf']} Bayangan gelap menyelimuti desa! Suara voting WW berlipat ganda hari ini!`});
        }
        if(action==='princess_reveal'&&role==='Princess'&&!game.princessRevealed.includes(discordId)){
            game.princessRevealed.push(discordId);
            addMvpScore(game, discordId, 3); // MVP: Princess reveal
            bcast(sessionId,'announcement',{text:`${ROLE_EMOJI['Princess']} **${pName(game,discordId)}** mengungkap dirinya sebagai Princess! Suaranya kini 2x!`});
            bcast(sessionId,'princess_revealed',{playerId:discordId});
        }
        if(action==='hakim_execute'&&role==='Hakim'&&(game.judgeUses[discordId]||0)>0&&targetId){
            game.judgeUses[discordId]--; game.hakimForceExec=targetId;
            bcast(sessionId,'announcement',{text:`${ROLE_EMOJI['Hakim']} Hakim Agung telah menjatuhkan vonis rahasia! Voting hari ini mungkin akan berakhir tak terduga!`});
        }
        if(action==='polisi_reveal'&&role==='Polisi'&&game.policeUses[discordId]?.reveal>0&&targetId){
            game.policeUses[discordId].reveal--;
            const tRole = game.roles[targetId];
            socket.emit('announcement',{text:`🔍 **RAHASIA POLISI:** Identitas **${pName(game,targetId)}** adalah ${ROLE_EMOJI[tRole]||'❓'} **${tRole}**!`});
            socket.emit('action_confirmed',{text:`🔍 ${pName(game,targetId)} = ${tRole}`});
            socket.emit('polisi_investigate_result',{targetId, role: tRole});
        }
        if(action==='polisi_shoot'&&role==='Polisi'&&game.policeUses[discordId]?.shoot>0&&targetId){
            game.policeUses[discordId].shoot--;
            const tRole = game.roles[targetId];
            if (killPlayer(game,targetId,'polisi')) {
                // MVP: Polisi kills WW or Solo
                if (!isVillageTeam(tRole)) addMvpScore(game, discordId, 5);
                else addMvpScore(game, discordId, -3); // MVP Penalty: Polisi shoots village

                bcast(sessionId,'announcement',{text:`${ROLE_EMOJI['Polisi']} DOR! **${pName(game,discordId)}** menembak **${pName(game,targetId)}**!`});
                bcast(sessionId,'player_died',{playerId:targetId,playerName:pName(game,targetId),role:tRole, reason:'shoot'});
                const dl=[]; handleDeathCascade(game,targetId,dl).then(()=>{if(dl.length)bcast(sessionId,'announcements_list',dl);const w=checkWin(game);if(w)triggerWin(game,w);});
            }
        }
        if(action==='nw_sleep'&&role==='Nightmare Wolf'&&(game.nwUses[discordId]||0)>0&&targetId){
            if (WW_ROLES.includes(game.roles[targetId])) return socket.emit('glitch_warning',{message:'🔴 Kamu tidak bisa menargetkan sesama Werewolf!'});
            game.nwUses[discordId]--;
            game.nwSleeping = targetId;
            addMvpScore(game, discordId, 3); // MVP: NW Sleep
            socket.emit('action_confirmed',{text:`😴 **${pName(game,targetId)}** akan ditidurkan malam ini! (Sisa ${game.nwUses[discordId]}x)`});
        }
        if(action==='jw_target'&&role==='Junior Wolf'&&targetId){
            game.jwRevenge[discordId] = targetId;
            socket.emit('action_confirmed', {text:`🎯 Target Balas Dendam diganti ke ${pName(game,targetId)}!`});
            socket.emit('jw_target_update', {targetId});
        }
        if(action==='jailer_select'&&role==='Jailer'&&targetId){
            game.jailerTargetToday = targetId;
            socket.emit('action_confirmed',{text:`🔒 **${pName(game,targetId)}** akan dikurung di penjara malam ini!`});
        }
        if(action==='pacifist_reveal'&&role==='Pacifist'&&!game.pacifistUsed.includes(discordId)&&targetId){
            game.pacifistUsed.push(discordId);
            game.votingDisabledToday = true;
            addMvpScore(game, discordId, 3); // MVP: Pacifist reveal
            game.shownRoles = game.shownRoles || {};
            game.shownRoles[discordId] = 'Pacifist';
            game.pacifistRevealed = game.pacifistRevealed || [];
            if (!game.pacifistRevealed.includes(discordId)) game.pacifistRevealed.push(discordId);
            const tRole = game.roles[targetId];
            socket.emit('announcement', { text: `${ROLE_EMOJI['Pacifist']} **RAHASIA PACIFIST:** Identitas **${pName(game,targetId)}** adalah ${ROLE_EMOJI[tRole]||'❓'} **${tRole}**!` });
            socket.emit('action_confirmed', { text: `🕊️ ${pName(game,targetId)} = ${tRole} (Voting hari ini dihentikan!)` });
            socket.emit('pacifist_investigate_result', { targetId, role: tRole });
            bcast(sessionId, 'announcement', { text: `${ROLE_EMOJI['Pacifist']} **${pName(game,discordId)}** (Pacifist) telah menggunakan skill Damai! Seluruh voting untuk hari ini dibatalkan dan tidak ada eksekusi!` });
            bcast(sessionId, 'pacifist_revealed', { playerId: discordId });
            if (game.phase === 'vote') {
                clearTimeout(game.voteTimer);
                game.dayVotesMap = {};
                bcast(sessionId, 'vote_update', { votes: {}, tally: {}, totalAlive: game.alive.filter(id=>id!==game.glitchedToday).length });
                resolveVote(game);
            }
        }
        if(action==='priest_holy'&&role==='Pendeta'&&!game.priestUsed.includes(discordId)&&targetId){
            game.priestUsed.push(discordId);
            const targetRole = game.roles[targetId];
            if(WW_ROLES.includes(targetRole)){
                if(killPlayer(game,targetId,'god')){
                    addMvpScore(game, discordId, 5); // MVP: Priest killed WW
                    bcast(sessionId,'announcement',{text:`💦 PENDETA **${pName(game,discordId)}** menyiram air suci ke **${pName(game,targetId)}**! Dia terbakar karena dia adalah Werewolf!`});
                    bcast(sessionId,'player_died',{playerId:targetId,playerName:pName(game,targetId),role:targetRole, reason:'holy_water'});
                    const dl=[]; handleDeathCascade(game,targetId,dl).then(()=>{if(dl.length)bcast(sessionId,'announcements_list',dl);const w=checkWin(game);if(w)triggerWin(game,w);});
                }
            } else {
                addMvpScore(game, discordId, -3); // MVP penalty: Priest missed
                if(killPlayer(game,discordId,'god')){
                    bcast(sessionId,'announcement',{text:`${ROLE_EMOJI['Pendeta']} PENDETA **${pName(game,discordId)}** menyiram air suci ke **${pName(game,targetId)}**, namun berbalik menghancurkan dirinya sendiri! Target bukan Werewolf...`});
                    bcast(sessionId,'player_died',{playerId:discordId,playerName:pName(game,discordId),role:'Pendeta', reason:'lightning'});
                    const dl=[]; handleDeathCascade(game,discordId,dl).then(()=>{if(dl.length)bcast(sessionId,'announcements_list',dl);const w=checkWin(game);if(w)triggerWin(game,w);});
                }
            }
        }
    });

    socket.on('day_chat',({sessionId,discordId,text})=>{
        const game=sessions.get(sessionId);
        if(!game||!['day', 'vote'].includes(game.phase)||!game.alive.includes(discordId)) return;
        if(game.glitchedToday===discordId) return socket.emit('glitch_warning',{message:'🖥️ Kamu di-glitch! Tidak bisa bicara.'});
        bcast(sessionId,'day_chat_msg',{senderId:discordId,senderName:pName(game,discordId),avatar:game.players.find(p=>p.id===discordId)?.avatar,text});
    });

    socket.on('cast_vote',({sessionId,discordId,targetId})=>{
        const game=sessions.get(sessionId);
        if(!game||game.phase!=='vote'||!game.alive.includes(discordId)) return;
        if(game.glitchedToday===discordId) return socket.emit('glitch_warning',{message:'🖥️ Kamu di-glitch! Tidak bisa voting.'});
        if(game.votingDisabledToday) return socket.emit('glitch_warning',{message:'🕊️ Voting hari ini telah dibatalkan oleh Pacifist!'});
        if(game.influencedPlayerToday===discordId) return socket.emit('glitch_warning',{message:'🧵 Kamu sedang dikontrol (Puppet) oleh Wolffluencer! Suaramu otomatis mengikuti voting Wolffluencer.'});
        game.dayVotesMap[discordId]=targetId;
        if(game.roles[discordId]==='Wolffluencer' && game.influencedPlayerToday && game.alive.includes(game.influencedPlayerToday)) {
            game.dayVotesMap[game.influencedPlayerToday] = targetId;
        }
        const tally = {};
        for (const voterId of game.alive) {
            if (game.glitchedToday === voterId) continue;
            const target = game.dayVotesMap[voterId];
            if (!target) continue;
            let w = game.princessRevealed.includes(voterId) ? 2 : 1;
            if (game.breadGivenTo === voterId) w += 1;
            if (game.swActiveToday && WW_ROLES.includes(game.roles[voterId])) w *= 2;
            tally[target] = (tally[target] || 0) + w;
        }
        bcast(sessionId,'vote_update',{votes:game.dayVotesMap, tally, totalAlive:game.alive.filter(id=>id!==game.glitchedToday).length});
    });

    socket.on('ww_chat',({sessionId,discordId,text})=>{
        const game=sessions.get(sessionId);
        if(!game||game.phase!=='night'||!WW_ROLES.includes(game.roles[discordId])||!game.alive.includes(discordId)||game.jailedTonight===discordId) return;
        game.players.filter(p=>WW_ROLES.includes(game.roles[p.id])&&p.alive&&game.jailedTonight!==p.id).forEach(p=>{
            send(p.socketId,'ww_chat_msg',{sender:pName(game,discordId),avatar:game.players.find(x=>x.id===discordId)?.avatar,text});
        });
    });

    socket.on('dead_chat',({sessionId,discordId,text})=>{
        const game=sessions.get(sessionId);
        if(!game) return;
        const isDead = game.dead.includes(discordId);
        const isMediumAtNight = game.alive.includes(discordId) && game.roles[discordId] === 'Medium' && game.phase === 'night' && game.jailedTonight !== discordId && game.nwSleeping !== discordId;
        
        if (!isDead && !isMediumAtNight) return; // Only dead players or active Medium at night can use dead chat

        const p = game.players.find(x=>x.id===discordId);
        const senderName = p ? p.name : 'Ghost';
        const senderAvatar = p ? p.avatar : '';

        // Receivers: All dead players + living active Mediums (only during night)
        const receivers = game.players.filter(p => {
            if (game.dead.includes(p.id)) return true;
            if (game.phase === 'night' && game.roles[p.id] === 'Medium' && game.alive.includes(p.id) && game.jailedTonight !== p.id && game.nwSleeping !== p.id) return true;
            return false;
        });

        receivers.forEach(p => {
            send(p.socketId, 'dead_chat_msg', { sender: senderName, avatar: senderAvatar, text });
        });
    });

    socket.on('jailer_chat', ({sessionId, discordId, text}) => {
        const game = sessions.get(sessionId);
        if (!game || game.phase !== 'night' || !game.jailedTonight) return;
        const isJailer = game.roles[discordId] === 'Jailer' && game.alive.includes(discordId);
        const isJailed = game.jailedTonight === discordId;
        if (!isJailer && !isJailed) return;
        if (isJailer && (game.nwSleeping === discordId || game.glitchedToday === discordId)) return;

        const jailerId = game.players.find(p => game.roles[p.id] === 'Jailer' && p.alive)?.id;
        if (!jailerId || game.nwSleeping === jailerId || game.glitchedToday === jailerId) return;

        const senderName = isJailer ? '🔒 [Jailer Anonim]' : '🔒 [Tahanan]';
        [jailerId, game.jailedTonight].forEach(id => {
            send(pSock(game, id), 'jailer_chat_msg', { sender: senderName, text });
        });
    });

    socket.on('sect_chat', ({sessionId, discordId, text}) => {
        const game = sessions.get(sessionId);
        if (!game || !(game.sectMembers||[]).includes(discordId) || !game.alive.includes(discordId)) return;
        if (game.glitchedToday === discordId) return socket.emit('glitch_warning', {message:'🖥️ Kamu di-glitch! Tidak bisa bicara.'});
        game.players.filter(p => (game.sectMembers||[]).includes(p.id) && p.alive).forEach(p => {
            send(p.socketId, 'sect_chat_msg', { sender: pName(game, discordId), avatar: game.players.find(x=>x.id===discordId)?.avatar, text });
        });
    });
});

// ─── REST API (for Discord Bot) ────────────────────────────────────────────────
const createSessionHandler = (req, res) => {
    const apiKey = process.env.WW_API_KEY;
    if (apiKey && req.headers['x-api-key'] !== apiKey) return res.status(401).json({ error: 'Unauthorized' });
    const { hostId, hostName, hostAvatar, avatarMap, guildId, botToken } = req.body;
    if (!hostId || !hostName) return res.status(400).json({ error: 'Missing hostId or hostName' });
    const sessionId = createSession(hostId, hostName, hostAvatar || '', avatarMap || {}, guildId, botToken);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    res.json({ sessionId, url: `${baseUrl}/game/${sessionId}` });
};
app.post('/api/create-session', createSessionHandler);
app.post('/api/werewolf/create', createSessionHandler);
app.post('/api/session/create', createSessionHandler);

app.get('/api/health', (req, res) => res.json({ status: 'ok', sessions: sessions.size }));

app.get('/api/live-sessions', (req, res) => {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const wwList = Array.from(sessions.values()).map(g => ({
        sessionId: g.sessionId, phase: g.phase, dayCount: g.dayCount, host: g.hostName || g.host, playerCount: g.players.length, url: `${baseUrl}/game/${g.sessionId}`
    }));
    let monoList = [];
    try {
        const monoMap = require('./monopolyServer.js').getSessions ? require('./monopolyServer.js').getSessions() : null;
        if (monoMap) monoList = Array.from(monoMap.values()).map(g => ({
            sessionId: g.sessionId, phase: g.phase, host: g.hostName || g.host, playerCount: g.players.length, url: `${baseUrl}/monopoly/${g.sessionId}`
        }));
    } catch(e){}
    let drawList = [];
    try {
        const drawMap = require('./drawServer.js').getSessions ? require('./drawServer.js').getSessions() : null;
        if (drawMap) drawList = Array.from(drawMap.values()).map(g => ({
            sessionId: g.sessionId, phase: g.phase, host: g.hostName || g.hostId, playerCount: g.players.length, url: `${baseUrl}/draw/${g.sessionId}`
        }));
    } catch(e){}
    res.json({ ww: wwList, monopoly: monoList, draw: drawList });
});

// ─── Monopoly Web Engine Mount ─────────────────────────────────────────────────
try {
    const monopolyServer = require('./monopolyServer.js');
    monopolyServer.attach(app, io);
} catch(e) { console.error('[Monopoly Web] Init error:', e.message); }

// ─── Draw & Guess Web Engine Mount ─────────────────────────────────────────────
try {
    const drawServer = require('./drawServer.js');
    drawServer.attach(app, io);
} catch(e) { console.error('[Draw Web] Init error:', e.message); }

// ─── Start ─────────────────────────────────────────────────────────────────────
function start(port = 3001) {
    server.listen(port, () => console.log(`[WW Web] Running at http://localhost:${port}`));
}

module.exports = { start, createSession };

if (require.main === module) {
    start(process.env.PORT || 3001);
}
