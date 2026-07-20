// ─── Parse URL Params ──────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const SESSION_ID = window.location.pathname.split('/').pop();
let MY_ID = null;
let MY_NAME = null;
let MY_AVATAR = null;

function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

window.showHowToPlayModal = function() {
    const el = document.getElementById('how-to-play-overlay');
    if (el) el.style.display = 'flex';
};

const savedSession = localStorage.getItem(`ww_${SESSION_ID}`);
if (params.get('uid')) {
    MY_ID = params.get('uid');
    MY_NAME = params.get('name') ? decodeURIComponent(params.get('name')) : null;
    MY_AVATAR = params.get('avatar') ? decodeURIComponent(params.get('avatar')) : null;
    localStorage.setItem(`ww_${SESSION_ID}`, JSON.stringify({ id: MY_ID, name: MY_NAME, avatar: MY_AVATAR }));
} else if (savedSession) {
    try {
        const parsed = JSON.parse(savedSession);
        MY_ID = parsed.id; MY_NAME = parsed.name; MY_AVATAR = parsed.avatar;
    } catch(e) {}
}

// ─── Socket Init ───────────────────────────────────────────────────────────────
const socket = io({ autoConnect: false });


// ─── ROLE DESCRIPTIONS ─────────────────────────────────────────────────────────
const ROLE_DESCRIPTIONS = {
    'Werewolf': {
        desc: 'Kamu adalah makhluk buas pemakan daging manusia yang menyamar sebagai warga desa di siang hari.',
        abil: 'Setiap malam, kamu akan dibangunkan untuk berdiskusi dengan sesama Werewolf dan memilih 1 target warga untuk dibunuh.',
        win: 'Tim Serigala menguasai desa (Jumlah Serigala yang hidup sama dengan atau lebih banyak dari sisa pemain lain).'
    },
    'Nightmare Wolf': {
        desc: 'Kamu adalah varian buas dari Werewolf yang mampu memberikan mimpi buruk mematikan.',
        abil: 'Kamu tergabung dalam tim Werewolf. TAPI, 2x per game saat SIANG HARI, kamu bisa membuat target tertidur di malam selanjutnya sehingga ia tidak bisa menggunakan kemampuannya!',
        win: 'Tim Serigala menguasai desa.'
    },
    'Junior Wolf': {
        desc: 'Anak serigala yang sangat lucu namun sangat mematikan.',
        abil: 'Kamu tergabung dalam tim Werewolf. Di malam hari, kamu bisa memilih 1 target balas dendam. Jika kamu mati kapanpun, targetmu akan ikut mati akibat serangan jantung karena kelucuanmu!',
        win: 'Tim Serigala menguasai desa.'
    },
    'Berserk Werewolf': {
        desc: 'Serigala ganas yang bisa mengamuk tanpa ampun.',
        abil: '1x per game di Siang Hari, kamu bisa mengaktifkan Frenzy. Malam harinya, serangan Serigala akan menembus semua perlindungan dan ikut membunuh Dokter yang melindungi target!',
        win: 'Tim Serigala menguasai desa.'
    },
    'Confusion Wolf': {
        desc: 'Serigala penyebar kebingungan yang mampu menutupi jejak pembunuhan.',
        abil: '2x per game saat malam hari, kamu bisa mengaktifkan Kekacauan. Semua pemain yang mati malam itu identitasnya akan disembunyikan (???) dari desa esok harinya. Hanya Tim Serigala yang akan tahu identitas asli korban!',
        win: 'Tim Serigala menguasai desa.'
    },
    'Party Werewolf': {
        desc: 'Serigala pesta yang suka keributan dan ledakan.',
        abil: '1x per game saat siang hari, kamu bisa membunuh 1 orang dengan kembang api mematikan! Namun, tindakan ini akan mengungkap identitas aslimu sebagai Party Wolf ke seluruh desa!',
        win: 'Tim Serigala menguasai desa.'
    },
    'Shadow Wolf': {
        desc: 'Serigala bayangan yang bisa memanipulasi pikiran warga desa.',
        abil: 'Bisa berdiskusi dan voting dengan WW lain di malam hari. 1x/game di siang hari, kamu bisa memanipulasi voting sehingga seluruh suara dari komplotan Werewolf akan bernilai Ganda (2x lipat)!',
        win: 'Tim Werewolf berhasil menang.'
    },
    'Werewolf Seer': {
        desc: 'Penerawang gelap dari komplotan Serigala.',
        abil: 'Setiap malam dapat menerawang identitas 1 pemain dan membagikan hasilnya di chat Werewolf. Namun, kamu TIDAK BISA ikut voting membunuh mangsa kecuali kamu melepaskan kekuatan terawangmu selamanya dan berubah menjadi Werewolf biasa! Jika kamu adalah Werewolf terakhir, kekuatanmu otomatis hilang.',
        win: 'Tim Serigala menguasai desa.'
    },
    'Wolffluencer': {
        desc: 'Serigala influencer yang memiliki kekuatan kendali pikiran atas pemain lain.',
        abil: 'Setiap malam, kamu bisa berbicara dan voting dengan Werewolf lain, plus memilih 1 pemain untuk di-influence (dikontrol). Keesokan harinya, pemain yang di-influence akan menjadi bonekamu (Puppet): suaranya saat voting akan otomatis mengikuti voting yang kamu lakukan dan ia tidak bisa melakukan voting sendiri.',
        win: 'Tim Serigala menguasai desa.'
    },
    'Penerawang': {
        desc: 'Kamu memiliki mata batin supranatural yang mampu menembus tipu muslihat monster.',
        abil: 'Setiap malam, kamu bisa melihat peran asli 1 pemain.',
        win: 'Tim Warga Desa berhasil membunuh/menggantung seluruh Serigala & ancaman Solo, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Detektif': {
        desc: 'Seorang detektif swasta brilian yang mampu mencari jejak di TKP.',
        abil: 'Setiap malam, periksa makam dari 1 warga desa yang telah mati. Kamu akan mendapatkan 2 nama, salah satunya adalah pembunuh asli dari korban tersebut dan satu lagi adalah warga acak.',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Dokter': {
        desc: 'Kamu adalah ahli medis desa yang sangat cekatan dalam merawat luka fatal.',
        abil: 'Setiap malam, kamu bisa memilih 1 pemain (KECUALI dirimu sendiri) untuk dilindungi. Jika pemain itu diserang Werewolf biasa, ia tidak akan mati.',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Bodyguard': {
        desc: 'Pelindung berani mati yang siap mengorbankan nyawanya untuk warga desa.',
        abil: 'Setiap malam lindungi 1 pemain. Jika kamu ATAU pemain itu diserang, kalian berdua selamat dan kamu akan tahu siapa penyerang aslinya! NAMUN, kamu akan mati karena luka parah di penghujung hari berikutnya.',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Pendeta': {
        desc: 'Kamu adalah tokoh suci yang memiliki relik air suci dari dewa, digunakan untuk memusnahkan kejahatan.',
        abil: '1x per game (Siang hari), ketik `Holy @nama`. Jika dia serigala, dia mati terbakar. Jika dia warga biasa, KAMU yang akan tersambar petir mati.',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Cursed': {
        desc: 'Kamu adalah warga desa biasa, namun darah monster tertidur di dalam nadimu.',
        abil: 'Pasif: Jika kamu dibunuh oleh Werewolf di malam hari, kamu TIDAK MATI. Sebaliknya, kamu akan bangkit dan bergabung menjadi tim Werewolf!',
        win: 'Jika belum digigit: Menang bersama Warga Desa (kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader). Jika sudah digigit: Menang bersama Tim Serigala.'
    },
    'Medium': {
        desc: 'Seorang spiritualis yang mampu membawa roh kembali dari alam baka, dan berkomunikasi dengan mereka.',
        abil: 'Setiap malam, kamu bisa membaca dan membalas obrolan para arwah! Selain itu, 1x per game di malam hari, kamu bisa membangkitkan 1 pemain mati dari Tim Warga Desa.',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Princess': {
        desc: 'Sang Putri yang memiliki kuasa politik mutlak di desa.',
        abil: 'Kapanpun saat siang hari, kamu bisa mengungkap identitasmu. Mulai saat itu hingga akhir game, suara votingmu akan dihitung Ganda (2 VOTE)!',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Hakim': {
        desc: 'Pemegang palu keadilan tertinggi di desa.',
        abil: 'Pilih target dari DM setiap siang. Jika voting warga berujung Skip/Seri, kamu akan mengeksekusi targetmu. Jika targetmu adalah Tim Warga, KAMU yang mati! (Maks 1x Vonis per game).',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Polisi': {
        desc: 'Penegak hukum bersenjata dari desa.',
        abil: 'Siang hari via DM, kamu bisa Menembak (membunuh) ATAU Melihat Identitas 1 orang. Masing-masing skill hanya bisa 1x/game (Tidak bisa dipakai di hari yang sama).',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Grave Robber': {
        desc: 'Kamu adalah Perampok Makam yang rakus. Kamu hidup dari mencuri identitas orang mati.',
        abil: 'Di malam pertama, pilih satu target. Saat target mati, kamu mencuri identitasnya dan mendapat skillnya secara penuh (Fresh Reset)!',
        win: 'Sesuai dengan Role yang kamu curi dari target makammu.'
    },
    'Astronomer': {
        desc: 'Seorang penelaah langit malam, memiliki koneksi magis dengan bintang.',
        abil: '1x/game Summon New Moon (Blokir serangan WW semalaman) ATAU 1x/game jatuhkan Meteor ke 1 pemain (Instan Kill). Jika Meteor mengenai sesama Warga Desa, kamu akan ikut tewas!',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Baker': {
        desc: 'Pembuat roti lezat yang berkeliling membagikan roti hangat setiap malam.',
        abil: 'Pilih 1 orang setiap malam. Esok harinya, suara voting orang tersebut akan bernilai Ganda (+1).',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Jailer': {
        desc: 'Sipir penjara desa yang tegas. Bisa mengurung dan menginterogasi pemain mencurigakan.',
        abil: 'Di siang hari, pilih 1 pemain untuk dikurung malam harinya (skill malam tahanan diblokir & kebal dari serangan luar). Kamu bisa obrolan anonim dengan tahanan dan punya 1 peluru untuk mengeksekusinya!',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Pacifist': {
        desc: 'Seorang pecinta damai yang berusaha menghentikan kekerasan dan perselisihan di dalam desa.',
        abil: '1x per game saat siang hari, kamu bisa menargetkan 1 pemain untuk melihat perannya (hanya kamu yang bisa melihat role pemain tersebut). Setelah kamu menggunakan skill ini, seluruh voting pada hari itu akan langsung dihentikan/dibatalkan (tidak ada yang bisa voting hari itu).',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    },
    'Cupid': {
        desc: 'Dewa asmara yang suka menjodohkan warga desa.',
        abil: 'Di malam pertama, pilih 2 pemain (Bukan dirimu) untuk dijadikan Pasangan. Jika salah satu mati, yang lain mati.',
        win: 'Menang bersama Warga Desa, ATAU (Kemenangan Cinta) jika yang tersisa di akhir game hanyalah Pasangan tersebut.'
    },
    'Shapeshifter': {
        desc: 'Pembunuh berantai misterius dari Solo Team. Bisa mencuri wajah.',
        abil: 'Setiap malam bunuh 1 pemain. Kamu kebal terhadap gigitan Serigala di malam hari. Di mata Penerawang, kamu akan terlihat sebagai role target terakhir yang kamu bunuh.',
        win: 'Bertahan menjadi satu-satunya pemain yang hidup di akhir game (Solo Win).'
    },
    'Arsonist': {
        desc: 'Sosiopat piromaniak dari Solo Team yang ingin melihat dunia terbakar.',
        abil: 'Setiap malam pilih aksi: Siram bensin (Douse) 1 orang, atau Nyalakan Api (Ignite) untuk membunuh semua orang yang sudah disiram sekaligus! Kamu kebal gigitan WW.',
        win: 'Bertahan menjadi satu-satunya pemain yang hidup di akhir game (Solo Win).'
    },
    'Head Hunter': {
        desc: 'Kamu adalah pemburu kepala independen dari Solo Team.',
        abil: 'Di awal permainan, kamu mendapatkan 1 target. Hasut warga untuk menggantung targetmu di siang hari. Jika target mati malam hari/air suci, kamu gagal.',
        win: 'Targetmu digantung mati oleh warga desa saat voting (Solo Win).'
    },
    'Corruptor': {
        desc: 'Entitas peretas digital dari Solo Team yang mampu merusak kewarasan.',
        abil: 'Setiap malam glitch 1 orang. Esoknya ia tak bisa chat/vote/skill dan akan mati setelah voting tanpa diketahui identitas aslinya (???). Kamu kebal serangan Werewolf biasa.',
        win: 'Bertahan menjadi satu-satunya pemain yang hidup di akhir game (Solo Win).'
    },
    'Sect Leader': {
        desc: 'Pemimpin sekte rahasia yang merekrut pengikut dalam kegelapan (Solo Team).',
        abil: 'Setiap malam pilih 1 pemain untuk dikonversi menjadi anggota Sekte (Maksimal 5 anggota hidup). ATAU korbankan 1 anggota Sekte untuk membunuh pemain lain menembus semua perlindungan! Kamu bisa berkomunikasi pribadi dengan seluruh anggota Sekte kapan pun. Jika kamu mati, seluruh anggota Sekte akan ikut tewas!',
        win: 'Semua pemain tersisa adalah anggota Sekte dan seluruh Werewolf atau Solo Killer lain tewas (Solo Win).'
    },
    'Badut': {
        desc: 'Kamu adalah si bodoh yang gila perhatian. Bagian dari Solo Team.',
        abil: 'Kamu tidak punya skill malam. Jika kamu berhasil memanipulasi warga untuk menggantungmu di siang hari, kamu LANGSUNG MENANG secara sepihak!',
        win: 'Dirimu sendiri digantung oleh Warga Desa di siang hari (Solo Win).'
    },
    'Villager': {
        desc: 'Kamu adalah warga desa biasa yang mencoba bertahan hidup dari teror malam hari.',
        abil: 'Gunakan kemampuan deduksi saat diskusi siang hari untuk menggantung Werewolf yang menyamar!',
        win: 'Tim Warga Desa berhasil menang, kecuali jika diubah menjadi tim lain oleh role seperti Cupid/Sect Leader.'
    }
};

// ═══════════════════════════════════════════════════
//  AUDIO MANAGER
// ═══════════════════════════════════════════════════
const bgm = new Audio();
bgm.loop = true;

function playSoundtrack(track, loop = true) {
    const src = `/Soundtrack/${track}`;
    if (bgm.src.endsWith(src) && !bgm.paused) return;
    bgm.src = src;
    bgm.loop = loop;
    bgm.play().catch(e => console.log('BGM Play Error:', e));
}

function stopSoundtrack() {
    bgm.pause();
    bgm.currentTime = 0;
    bgm.src = '';
}

// Global click listener for Autoplay policy workaround
document.addEventListener('click', () => {
    if (bgm.paused && bgm.src) {
        bgm.play().catch(e => console.log('Autoplay still blocked:', e));
    }
});

// Role lists (mirrors server-side; used for MVP team detection)
const WW_ROLES_CLIENT   = ['Werewolf','Nightmare Wolf','Junior Wolf','Berserk Werewolf','Confusion Wolf','Party Werewolf','Shadow Wolf','Werewolf Seer','Wolffluencer'];
const SOLO_ROLES_CLIENT = ['Corruptor','Badut','Head Hunter','Arsonist','Cupid','Shapeshifter','Sect Leader'];

let gameState = null;
let myRole = null;
let myTeam = null;
let myHhTargetId = null;
let myJwTargetId = null;
let currentPhase = null;
let selectedTarget = null;
let timerInterval = null;
let isHost = false;
let timerMax = 60;
let isGameOver = false;

// Stores the publicly revealed role for dead players (may be '???' if CW/Corruptor/SS masked it)
const playerRevealedRoles = {};

// Convert Discord-style markdown to HTML
function mdToHtml(text) {
    if (!text) return '';
    const str = String(text);

    // Split by existing HTML tags (like <img> from ROLE_EMOJI) to preserve them
    const parts = str.split(/(<[^>]+>)/);
    const processed = parts.map((part, i) => {
        // Even indices = plain text segments, odd indices = HTML tags → keep as-is
        if (i % 2 === 1) return part;
        // Escape only the plain text parts, then apply markdown
        return part
            .replace(/&/g, '&amp;')
            // Discord custom emote <:name:id> → img (before > escaping)
            .replace(/\u003c([a-zA-Z0-9_]+):(\d+)\u003e/g, '<img src="https://cdn.discordapp.com/emojis/$2.png" class="discord-emoji" alt="$1">')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>');
    });
    return processed.join('');
}

// Render a role label — handles '???' gracefully
function renderRoleLabel(role) {
    if (!role || role === '???' || role === '?') {
        return `❓ ???`;
    }
    return `${ROLE_EMOJI[role] || '❓'} ${role}`;
}

function dEmoji(id) { return `<img src="https://cdn.discordapp.com/emojis/${id}.png" class="discord-emoji">`; }

const ROLE_EMOJI = {
    'Werewolf':        dEmoji('1511214606326956122'),
    'Nightmare Wolf':  dEmoji('1511802299801014475'),
    'Junior Wolf':     dEmoji('1512176704351895782'),
    'Berserk Werewolf':dEmoji('1513271839474974750'),
    'Confusion Wolf':  dEmoji('1513999536681517106'),
    'Party Werewolf':  dEmoji('1516365512936788018'),
    'Shadow Wolf':     dEmoji('1516540536872370337'),
    'Werewolf Seer':   dEmoji('1521244118553198794'),
    'Wolffluencer':    dEmoji('1524842152155414698'),
    'Penerawang':      dEmoji('1511215348479950858'),
    'Detektif':        dEmoji('1514165095423541298'),
    'Dokter':          dEmoji('1511217847752327249'),
    'Pendeta':         dEmoji('1511217800860143616'),
    'Cursed':          dEmoji('1511463888800190605'),
    'Grave Robber':    dEmoji('1511802262328971315'),
    'Cupid':           dEmoji('1511961217739264091'),
    'Medium':          dEmoji('1512177285904601220'),
    'Princess':        dEmoji('1513267111840059534'),
    'Hakim':           dEmoji('1513427146381459627'),
    'Polisi':          dEmoji('1513279387557171200'),
    'Bodyguard':       dEmoji('1513999469148901557'),
    'Shapeshifter':    dEmoji('1513270676092489778'),
    'Arsonist':        dEmoji('1513999508990591106'),
    'Head Hunter':     dEmoji('1511827452278608054'),
    'Badut':           dEmoji('1511962572260380863'),
    'Corruptor':       dEmoji('1513269938595299358'),
    'Astronomer':      dEmoji('1516381258614181980'),
    'Baker':           dEmoji('1516536682789470360'),
    'Jailer':          dEmoji('1520707527900266556'),
    'Sect Leader':     dEmoji('1521244062567366778'),
    'Pacifist':        dEmoji('1524838530822574140'),
    'Villager': '🧑‍🌾'
};

// ═══════════════════════════════════════════════════
//  SCREEN MANAGEMENT
// ═══════════════════════════════════════════════════
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.add('active');
}

// ═══════════════════════════════════════════════════
//  STARS & ATMOSPHERE
// ═══════════════════════════════════════════════════
function generateStars() {
    const container = document.getElementById('stars');
    for (let i = 0; i < 140; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2.8 + 0.4;
        star.style.cssText = `
            left: ${Math.random() * 100}%; top: ${Math.random() * 100}%;
            width: ${size}px; height: ${size}px;
            --dur: ${Math.random() * 4 + 2}s;
            animation-delay: ${Math.random() * 5}s;
        `;
        container.appendChild(star);
    }

    // Random shooting stars
    function shootingStar() {
        const s = document.createElement('div');
        s.className = 'shooting-star';
        s.style.cssText = `
            left: ${Math.random() * 60}%;
            top: ${Math.random() * 40}%;
            width: ${Math.random() * 80 + 60}px;
            --dur: ${Math.random() * 1.5 + 1}s;
            transform: rotate(${Math.random() * 30 + 15}deg);
        `;
        container.appendChild(s);
        setTimeout(() => s.remove(), 3000);
    }
    setInterval(shootingStar, Math.random() * 8000 + 5000);
    setTimeout(shootingStar, 2000);
}

// ═══════════════════════════════════════════════════
//  PHASE THEME
// ═══════════════════════════════════════════════════
function setPhaseTheme(phase) {
    document.body.className = `phase-${phase}`;
    if (phase === 'night' && gameState && gameState.berserkActive) {
        document.body.classList.add('berserk-active');
    }
    currentPhase = phase;
}

// ═══════════════════════════════════════════════════
//  ROLE INFO POPUP TOGGLE
// ═══════════════════════════════════════════════════
function toggleRoleInfo() {
    const popup = document.getElementById('role-info-popup');
    if (!popup) return;
    const hud = document.getElementById('hud');
    
    // Close it if open
    if (!popup.classList.contains('rip-hide') && popup.style.display !== 'none') {
        popup.classList.add('rip-hide');
        if (hud) hud.classList.remove('info-open');
        setTimeout(() => { popup.style.display = 'none'; popup.classList.remove('rip-hide'); }, 200);
        return;
    }

    // Otherwise, show it and populate content based on current role
    if (myRole && ROLE_DESCRIPTIONS[myRole]) {
        const info = ROLE_DESCRIPTIONS[myRole];
        document.getElementById('rip-title').textContent = myRole;
        document.getElementById('rip-desc').textContent = info.desc;
        document.getElementById('rip-abil').textContent = info.abil;
        document.getElementById('rip-win').textContent = window.isSectMember ? 'Menang bersama Sect Leader: Semua pemain tersisa adalah anggota Sekte dan seluruh ancaman lain tewas.' : info.win;
    } else {
        document.getElementById('rip-title').textContent = myRole || '???';
        document.getElementById('rip-desc').textContent = 'Informasi peran tidak ditemukan.';
        document.getElementById('rip-abil').textContent = '-';
        document.getElementById('rip-win').textContent = window.isSectMember ? 'Menang bersama Sect Leader: Semua pemain tersisa adalah anggota Sekte dan seluruh ancaman lain tewas.' : '-';
    }

    if (hud) hud.classList.add('info-open');
    popup.style.display = 'block';
}

// ═══════════════════════════════════════════════════
//  HISTORY PANEL TOGGLE
// ═══════════════════════════════════════════════════
function toggleHistory() {
    const panel = document.getElementById('history-panel');
    const badge = document.getElementById('history-badge');
    const badgeMini = document.getElementById('history-badge-mini');
    panel.classList.toggle('open');
    // Reset badge when opening
    if (panel.classList.contains('open')) {
        if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
        if (badgeMini) { badgeMini.textContent = '0'; badgeMini.style.display = 'none'; }
    }
}

// ═══════════════════════════════════════════════════
//  SCREEN FLASH
// ═══════════════════════════════════════════════════
function triggerScreenFlash(type = 'red') {
    const flash = document.getElementById('screen-flash');
    if (!flash) return;
    flash.className = `screen-flash flash-${type}`;
    setTimeout(() => { flash.className = 'screen-flash'; }, 600);
}

// ═══════════════════════════════════════════════════
//  LOBBY UI
// ═══════════════════════════════════════════════════
function renderLobby(game) {
    document.getElementById('session-badge').textContent = `Session: ${game.sessionId}`;
    document.getElementById('player-count').textContent = game.players.length;
    document.getElementById('player-total').textContent = game.players.length;

    const playerList = document.getElementById('player-list');
    playerList.innerHTML = '';
    game.players.forEach(p => {
        const el = document.createElement('div');
        el.className = 'player-item';
        let rightBadge = '';
        if (p.id === game.host) {
            rightBadge = '<span class="host-badge">👑 Host</span>';
        } else if (isHost) {
            rightBadge = `<button onclick="kickPlayer('${p.id}')" class="kick-badge" title="Kick Player">Kick ✕</button>`;
        }
        el.innerHTML = `
            <img class="avatar" src="${p.avatar}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random'" alt="${p.name}">
            <span class="pname">${p.name}</span>
            ${rightBadge}
        `;
        playerList.appendChild(el);
    });

    if (isHost) {
        renderRoleSettings(game);
        document.getElementById('btn-start').disabled = game.players.length < 4;
        document.getElementById('btn-start').style.display = 'inline-block';
        document.getElementById('btn-close-session').style.display = 'inline-block';
        document.getElementById('btn-leave').style.display = 'none';
    } else {
        document.getElementById('role-settings-panel').style.display = 'none';
        document.getElementById('btn-start').style.display = 'none';
        document.getElementById('btn-close-session').style.display = 'none';
        document.getElementById('btn-leave').style.display = 'inline-block';
    }
}

function leaveGame() {
    if (confirm('Yakin ingin keluar dari lobby ini?')) {
        socket.emit('leave_game', { sessionId: SESSION_ID, discordId: MY_ID });
        localStorage.removeItem(`ww_${SESSION_ID}`);
        window.location.href = '/';
    }
}

function closeSession() {
    if (confirm('Yakin ingin membatalkan permainan dan menutup sesi ini?')) {
        socket.emit('close_session', { sessionId: SESSION_ID, hostId: MY_ID });
    }
}

const ROLE_DEFS = [
    { key: 'ww',      emoji: ROLE_EMOJI['Werewolf'],         label: 'Werewolf',    type: 'ww',      max: 5 },
    { key: 'nw',      emoji: ROLE_EMOJI['Nightmare Wolf'],   label: 'Night. Wolf', type: 'ww',      max: 1 },
    { key: 'jw',      emoji: ROLE_EMOJI['Junior Wolf'],      label: 'Junior Wolf', type: 'ww',      max: 1 },
    { key: 'bw',      emoji: ROLE_EMOJI['Berserk Werewolf'], label: 'Berserk W',   type: 'ww',      max: 1 },
    { key: 'cw',      emoji: ROLE_EMOJI['Confusion Wolf'],   label: 'Confusion W', type: 'ww',      max: 1 },
    { key: 'pw',      emoji: ROLE_EMOJI['Party Werewolf'],   label: 'Party Wolf',  type: 'ww',      max: 1 },
    { key: 'sw',      emoji: ROLE_EMOJI['Shadow Wolf'],      label: 'Shadow Wolf', type: 'ww',      max: 1 },
    { key: 'ws',      emoji: ROLE_EMOJI['Werewolf Seer'],    label: 'Wolf Seer',   type: 'ww',      max: 1 },
    { key: 'wolfen',  emoji: ROLE_EMOJI['Wolffluencer'],     label: 'Wolffluencer',type: 'ww',      max: 1 },
    { key: 'seer',    emoji: ROLE_EMOJI['Penerawang'],       label: 'Seer',        type: 'village', max: 1 },
    { key: 'det',     emoji: ROLE_EMOJI['Detektif'],         label: 'Detektif',    type: 'village', max: 1 },
    { key: 'doc',     emoji: ROLE_EMOJI['Dokter'],           label: 'Dokter',      type: 'village', max: 1 },
    { key: 'priest',  emoji: ROLE_EMOJI['Pendeta'],          label: 'Pendeta',     type: 'village', max: 1 },
    { key: 'cursed',  emoji: ROLE_EMOJI['Cursed'],           label: 'Cursed',      type: 'village', max: 1 },
    { key: 'gr',      emoji: ROLE_EMOJI['Grave Robber'],     label: 'Grave Robber',type: 'village', max: 1 },
    { key: 'cupid',   emoji: ROLE_EMOJI['Cupid'],            label: 'Cupid',       type: 'village', max: 1 },
    { key: 'med',     emoji: ROLE_EMOJI['Medium'],           label: 'Medium',      type: 'village', max: 1 },
    { key: 'princess',emoji: ROLE_EMOJI['Princess'],         label: 'Princess',    type: 'village', max: 1 },
    { key: 'hakim',   emoji: ROLE_EMOJI['Hakim'],            label: 'Hakim',       type: 'village', max: 1 },
    { key: 'polisi',  emoji: ROLE_EMOJI['Polisi'],           label: 'Polisi',      type: 'village', max: 1 },
    { key: 'bg',      emoji: ROLE_EMOJI['Bodyguard'],        label: 'Bodyguard',   type: 'village', max: 1 },
    { key: 'astro',   emoji: ROLE_EMOJI['Astronomer'],       label: 'Astronomer',  type: 'village', max: 1 },
    { key: 'baker',   emoji: ROLE_EMOJI['Baker'],            label: 'Baker',       type: 'village', max: 1 },
    { key: 'jailer',  emoji: ROLE_EMOJI['Jailer'],           label: 'Jailer',      type: 'village', max: 1 },
    { key: 'pacifist',emoji: ROLE_EMOJI['Pacifist'],         label: 'Pacifist',    type: 'village', max: 1 },
    { key: 'hh',      emoji: ROLE_EMOJI['Head Hunter'],      label: 'Head Hunter', type: 'solo',    max: 1 },
    { key: 'badut',   emoji: ROLE_EMOJI['Badut'],            label: 'Badut',       type: 'solo',    max: 1 },
    { key: 'ss',      emoji: ROLE_EMOJI['Shapeshifter'],     label: 'Shapeshifter',type: 'solo',    max: 1 },
    { key: 'arson',   emoji: ROLE_EMOJI['Arsonist'],         label: 'Arsonist',    type: 'solo',    max: 1 },
    { key: 'cor',     emoji: ROLE_EMOJI['Corruptor'],        label: 'Corruptor',   type: 'solo',    max: 1 },
    { key: 'sect',    emoji: ROLE_EMOJI['Sect Leader'],      label: 'Sect Leader', type: 'solo',    max: 1 },
];

function renderRoleSettings(game) {
    const manualGrid = document.getElementById('role-settings-grid');
    const randomGrid = document.getElementById('random-settings-grid');
    const btnToggle  = document.getElementById('btn-toggle-mode');

    if (btnToggle) {
        btnToggle.textContent = game.isRandomMode ? 'Mode: Random' : 'Mode: Manual';
        btnToggle.style.background = game.isRandomMode ? '#7d3c98' : '#d35400';
    }

    if (game.isRandomMode) {
        manualGrid.style.display = 'none';
        randomGrid.style.display = 'grid';
        document.getElementById('rand-ww-count').textContent      = game.randomRoleCounts.ww;
        document.getElementById('rand-special-count').textContent = game.randomRoleCounts.special;
        document.getElementById('rand-solo-count').textContent    = game.randomRoleCounts.solo;
    } else {
        randomGrid.style.display = 'none';
        manualGrid.style.display = 'grid';
        manualGrid.innerHTML = '';
        const rs = game.roleSettings;

        ROLE_DEFS.forEach(rd => {
            const count = rs[rd.key] !== undefined ? rs[rd.key] : 0;
            const el = document.createElement('div');
            el.className = `role-setting-item ${rd.type === 'ww' ? 'ww-role' : ''} ${count > 0 ? 'active' : ''}`;
            el.innerHTML = `
                <div class="role-emoji">${rd.emoji}</div>
                <div class="role-label">${rd.label}</div>
                <div class="role-count">${count}</div>
            `;
            el.onclick = () => toggleRole(rd.key, rd.max, count);
            manualGrid.appendChild(el);
        });
    }
    updateRoleTotal(game);
}

function toggleGameMode() {
    if (!gameState || gameState.host !== MY_ID) return;
    socket.emit('update_game_mode', { sessionId: SESSION_ID, discordId: MY_ID, isRandomMode: !gameState.isRandomMode });
}

function updateRandomSetting(key, delta) {
    if (!gameState || gameState.host !== MY_ID) return;
    let val = gameState.randomRoleCounts[key] + delta;
    if (val < 0) val = 0;
    if (key === 'solo' && val > 1) val = 1;
    if (key === 'ww' && val > 5) val = 5;
    if (key === 'ww' && val < 1) val = 1;
    if (key === 'special' && val > 14) val = 14;
    socket.emit('update_random_counts', { sessionId: SESSION_ID, discordId: MY_ID, randomRoleCounts: { [key]: val } });
}

function toggleRole(key, max, current) {
    const curr = current !== undefined ? current : 0;
    const newVal = curr >= max ? 0 : curr + 1;
    socket.emit('update_role_settings', { sessionId: SESSION_ID, discordId: MY_ID, roleSettings: { [key]: newVal } });
}

function updateRoleTotal(game) {
    let total = 0;
    if (game.isRandomMode) {
        total = (game.randomRoleCounts.ww || 0) + (game.randomRoleCounts.special || 0) + (game.randomRoleCounts.solo || 0);
    } else {
        total = Object.values(game.roleSettings || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    }
    document.getElementById('role-total-count').textContent = total;
}

function startGame() {
    socket.emit('start_game', { sessionId: SESSION_ID, discordId: MY_ID });
}

// ═══════════════════════════════════════════════════
//  PLAYER ARENA
// ═══════════════════════════════════════════════════
function renderArena(players) {
    const container = document.getElementById('player-cards');
    container.innerHTML = '';
    players.forEach((p, i) => {
        const card = createPlayerCard(p);
        card.style.animationDelay = `${i * 0.04}s`;
        container.appendChild(card);
    });
}

function renderAllPlayers() {
    if (gameState && gameState.players) {
        renderArena(gameState.players);
    }
}

function createPlayerCard(p) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.id = `card-${p.id}`;
    if (!p.alive) {
        card.classList.add('dead');
        if (p.deadReason) card.classList.add(`dead-${p.deadReason}`);
        if (p.deadReason === 'sect_ritual') {
            card.style.opacity = '0';
            card.style.visibility = 'hidden';
            card.style.pointerEvents = 'none';
        }
    }
    if (p.id === MY_ID) card.classList.add('my-card');
    if (p.isGlitched) card.classList.add('glitched');
    if (p.isCouple) card.classList.add('couple-card');
    if (p.isDoused) card.classList.add('doused');
    if (p.isJailed) card.classList.add('jailed');

    if (p.princessRevealed || playerRevealedRoles[p.id] === 'Princess' || p.role === 'Princess') {
        if (!card.querySelector('.princess-badge')) {
            const badge = document.createElement('span');
            badge.className = 'princess-badge';
            badge.innerHTML = ROLE_EMOJI['Princess'] || '👑';
            badge.title = 'Princess (Voting 2x)';
            card.appendChild(badge);
        }
    }
    if (p.pacifistRevealed || playerRevealedRoles[p.id] === 'Pacifist' || (p.role === 'Pacifist' && p.id !== MY_ID && p.role !== '???')) {
        if (!card.querySelector('.pacifist-badge')) {
            const badge = document.createElement('span');
            badge.className = 'pacifist-badge';
            badge.innerHTML = ROLE_EMOJI['Pacifist'] || '🕊️';
            badge.title = 'Pacifist (Damai)';
            card.appendChild(badge);
        }
    }
    if (p.isCouple) {
        const cbadge = document.createElement('span');
        cbadge.className = 'couple-badge';
        cbadge.innerHTML = '💞';
        card.appendChild(cbadge);
    }

    const isMeWW = (myTeam === 'ww' || (myRole && WW_ROLES_CLIENT.includes(myRole)));
    const isTeammateWW = isMeWW && p.role && WW_ROLES_CLIENT.includes(p.role) && p.id !== MY_ID;
    if (isTeammateWW) {
        card.classList.add('ww-ally-card');
        const wwBadge = document.createElement('span');
        wwBadge.className = 'ww-ally-badge';
        wwBadge.innerHTML = `${ROLE_EMOJI[p.role] || '🐺'} <span>${p.role}</span>`;
        wwBadge.title = `Sekutu Tim Werewolf: ${p.role}`;
        card.appendChild(wwBadge);
    }
    if (p.isSect && p.id !== MY_ID) {
        card.classList.add('sect-card');
        const sectBadge = document.createElement('span');
        sectBadge.className = 'sect-badge';
        sectBadge.innerHTML = `${ROLE_EMOJI['Sect Leader'] || '🔮'} <span>Sekte</span>`;
        sectBadge.title = `Anggota Sekte Gelap`;
        card.appendChild(sectBadge);
    }

    // For dead players: use the publicly announced role (may be '???' for CW/Corruptor/SS)
    // For live players: only show own role or revealed roles
    let roleDisplay = '';
    let isRevealedRole = false;
    if (!p.alive) {
        const announcedRole = playerRevealedRoles[p.id];
        if (announcedRole !== undefined) {
            roleDisplay = renderRoleLabel(announcedRole);
            isRevealedRole = true;
        } else {
            roleDisplay = renderRoleLabel(p.role);
        }
    } else if (p.id === MY_ID && myRole) {
        roleDisplay = `${ROLE_EMOJI[myRole] || '?'} ${myRole}`;
    } else if (playerRevealedRoles[p.id] !== undefined) {
        roleDisplay = renderRoleLabel(playerRevealedRoles[p.id]);
        isRevealedRole = true;
    } else if (p.role && p.role !== '???') {
        roleDisplay = renderRoleLabel(p.role);
        if (p.princessRevealed || p.pacifistRevealed) isRevealedRole = true;
    }

    let indicators = '';
    if (p.isJailed) {
        indicators += `<div class="jail-bars-overlay"></div>`;
    }
    if (p.id === myHhTargetId && myRole === 'Head Hunter') {
        indicators += `<div class="target-indicator hh-target" title="Target Eksekusi">🎯</div>`;
    }
    if (p.id === myJwTargetId && myRole === 'Junior Wolf') {
        indicators += `<div class="target-indicator jw-target" title="Target Balas Dendam">🎯</div>`;
    }

    card.innerHTML += `
        <div class="card-anim-layer"></div>
        ${indicators}
        <img class="card-avatar" src="${p.avatar}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random'" alt="${escapeHtml(p.name)}">
        <div class="card-name">${escapeHtml(p.name)}</div>
        <div class="card-role ${isRevealedRole ? 'revealed-role' : ''}">${roleDisplay}</div>
        <div class="vote-indicator" id="votes-${p.id}"></div>
        <div class="card-vote-count" id="vcount-${p.id}">0</div>
    `;
    card.onclick = () => selectTarget(p);
    return card;
}

function applyNwSleepOverlay(card) {
    if (!card) return;
    card.classList.add('nw-sleeping');
    if (!card.querySelector('.nw-sleep-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'nw-sleep-overlay';
        overlay.innerHTML = '<div class="sleep-clouds"></div><div class="zzz-container"><span class="z1">Z</span><span class="z2">Z</span><span class="z3">Z</span></div>';
        card.appendChild(overlay);
    }
}

function removeNwSleepOverlay(card) {
    if (!card) return;
    card.classList.remove('nw-sleeping');
    const overlay = card.querySelector('.nw-sleep-overlay');
    if (overlay) overlay.remove();
}

function applyPuppetOverlay(card) {
    if (!card) return;
    card.classList.add('puppet-controlled');
    if (!card.querySelector('.puppet-strings-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'puppet-strings-overlay';
        overlay.innerHTML = `
            <div class="marionette-wood-bar">
                <div class="wood-cross-piece"></div>
                <div class="wood-screw p1"></div>
                <div class="wood-screw p2"></div>
                <div class="wood-screw p3"></div>
                <div class="wood-screw p4"></div>
            </div>
            <div class="marionette-string str-left"></div>
            <div class="marionette-string str-mid-left"></div>
            <div class="marionette-string str-mid-right"></div>
            <div class="marionette-string str-right"></div>
            <div class="string-pin pin-1"></div>
            <div class="string-pin pin-2"></div>
            <div class="string-pin pin-3"></div>
            <div class="string-pin pin-4"></div>
        `;
        card.appendChild(overlay);
    }
}

function removePuppetOverlay(card) {
    if (!card) return;
    card.classList.remove('puppet-controlled');
    const overlay = card.querySelector('.puppet-strings-overlay');
    if (overlay) overlay.remove();
}

function applyPuppetControlEffect() {
    let banner = document.getElementById('puppet-control-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'puppet-control-banner';
        banner.className = 'puppet-control-banner';
        banner.innerHTML = `🧵 <strong>KAMU DIKONTROL WOLFFLUENCER (PUPPET)!</strong><br>Suara votingmu otomatis mengikuti Wolffluencer dan kamu tidak bisa melakukan vote mandiri hari ini.`;
        document.body.appendChild(banner);
    }
    const myCard = document.getElementById(`card-${MY_ID}`);
    if (myCard) applyPuppetOverlay(myCard);
}

function updatePlayerCard(p) {
    const card = document.getElementById(`card-${p.id}`);
    if (!card) return;
    if (!p.alive && !card.classList.contains('dead')) {
        const reason = p.deadReason || 'default';
        card.classList.add('dying', `reason-${reason}`);
        setTimeout(() => {
            card.className = card.className.replace(/dying|reason-[a-z_]+/g, '').trim();
            card.classList.add('dead');
            if (p.deadReason) card.classList.add(`dead-${p.deadReason}`);
        }, 1500);
    } else if (!p.alive) {
        card.classList.add('dead');
        if (p.deadReason) card.classList.add(`dead-${p.deadReason}`);
    } else if (p.alive) {
        card.classList.remove('dead');
        card.className = card.className.replace(/\bdead-[a-z_]+\b/g, '').trim();
    }
    if (p.isGlitched) card.classList.add('glitched'); else card.classList.remove('glitched');
    if (p.isDoused) card.classList.add('doused'); else card.classList.remove('doused');
    if (p.isJailed) {
        card.classList.add('jailed');
        if (!card.querySelector('.jail-bars-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'jail-bars-overlay';
            card.appendChild(overlay);
        }
    } else {
        card.classList.remove('jailed');
        const overlay = card.querySelector('.jail-bars-overlay');
        if (overlay) overlay.remove();
    }
    if (currentPhase !== 'night' || !p.alive) {
        removeNwSleepOverlay(card);
    }
    if (currentPhase === 'night' || !p.alive || currentPhase === 'lobby') {
        removePuppetOverlay(card);
        const banner = document.getElementById('puppet-control-banner');
        if (banner) banner.remove();
    }
}

// ═══════════════════════════════════════════════════
//  TARGET SELECTION
// ═══════════════════════════════════════════════════
function selectTarget(p) {
    const me = gameState ? gameState.players.find(x => x.id === MY_ID) : null;
    if (me && !me.alive) return;
    if (window._nightActionType === 'DONE') {
        showActionFeedback('❌ Kamu sudah melakukan aksi malam ini (Sekali Pilih)!');
        return;
    }
    if (['medium_revive', 'det_investigate'].includes(window._nightActionType)) {
        if (p.alive) {
            showActionFeedback('❌ Pilih kartu pemain yang sudah mati!');
            return;
        }
    } else {
        if (!p.alive) {
            showActionFeedback('❌ Pilih kartu pemain yang masih hidup!');
            return;
        }
    }
    if (p.id === MY_ID && currentPhase !== 'vote') return;

    document.querySelectorAll('.player-card.selected-target').forEach(c => c.classList.remove('selected-target'));
    selectedTarget = p.id;
    document.getElementById(`card-${p.id}`)?.classList.add('selected-target');

    if (currentPhase === 'night') {
        confirmNightTarget(p.id);
    } else if (currentPhase === 'vote') {
        confirmVote(p.id);
    } else if (currentPhase === 'day' && window._dayActionType) {
        socket.emit('day_action', { sessionId: SESSION_ID, discordId: MY_ID, action: window._dayActionType, targetId: p.id });
        showActionFeedback(`✅ Aksi dikunci!`);
        document.getElementById('action-buttons').innerHTML = '';
        window._dayActionType = null;
    }
}

// ═══════════════════════════════════════════════════
//  NIGHT UI
// ═══════════════════════════════════════════════════
function handleNightUI(data) {
    const chatArea = document.getElementById('chat-area');
    chatArea.style.display = 'none';
    const msg  = document.getElementById('action-message');
    const btns = document.getElementById('action-buttons');
    btns.innerHTML = '';

    if (data.type === 'sleeping') {
        msg.innerHTML = `😴 <em>${data.reason || 'Kamu tidak punya aksi malam ini...'}</em>`;
        if (myRole === 'Medium') {
            chatArea.style.display = 'flex';
            document.querySelector('#chat-area .chat-input-row').style.display = 'flex';
        }
        return;
    }
    if (data.type === 'glitched') {
        msg.innerHTML = `${ROLE_EMOJI['Corruptor']} <em>Kamu di-GLITCH! Tidak bisa melakukan apapun hari ini.</em>`;
        return;
    }

    if (data.type === 'ws_check') {
        msg.innerHTML = `${ROLE_EMOJI['Werewolf Seer']} <strong>Terawang</strong> identitas seseorang — klik kartu hidup (Sekali Pilih)`;
        chatArea.style.display = 'flex';
        document.querySelector('#chat-area .chat-input-row').style.display = 'flex';
        if (data.allies && data.allies.length > 0) {
            const alliesEl = document.createElement('div');
            alliesEl.style.cssText = 'font-size:0.75rem;color:rgba(255,100,80,0.8);margin-top:4px;text-align:center;';
            alliesEl.textContent = `🐺 Komplotan: ${data.allies.map(a => a.name).join(', ')}`;
            msg.after(alliesEl);
        }
        currentPhase = 'night';
        window._nightActionType = 'ws_check';

        const resignBtn = document.createElement('button');
        resignBtn.className = 'action-btn danger';
        resignBtn.innerHTML = `🐺 Melepaskan Terawang & Ikut Membunuh`;
        resignBtn.onclick = () => {
            if (confirm('Apakah kamu yakin ingin melepaskan kekuatan terawangmu selamanya dan berubah menjadi Werewolf biasa untuk ikut membunuh malam ini?')) {
                socket.emit('night_action', { sessionId: SESSION_ID, discordId: MY_ID, action: 'ws_resign' });
            }
        };
        btns.appendChild(resignBtn);
        return;
    }

    if (data.type === 'ww_vote') {
        msg.innerHTML = `${ROLE_EMOJI['Werewolf']} <strong>Pilih mangsa malam ini</strong> — klik kartu pemain`;
        chatArea.style.display = 'flex';
        document.querySelector('#chat-area .chat-input-row').style.display = 'flex';
        if (data.allies && data.allies.length > 0) {
            const alliesEl = document.createElement('div');
            alliesEl.style.cssText = 'font-size:0.75rem;color:rgba(255,100,80,0.8);margin-top:4px;text-align:center;';
            alliesEl.textContent = `🐺 Komplotan: ${data.allies.map(a => a.name).join(', ')}`;
            msg.after(alliesEl);
        }
        currentPhase = 'night';
        if (data.hasCW) {
            const cwBtn = document.createElement('button');
            cwBtn.className = 'action-btn danger';
            cwBtn.innerHTML = `${ROLE_EMOJI['Confusion Wolf']} Toggle Identity Mask`;
            cwBtn.onclick = () => socket.emit('night_action', { sessionId: SESSION_ID, discordId: MY_ID, action: 'cw_toggle' });
            btns.appendChild(cwBtn);
        }
        if (data.hasJW) {
            const jwBtn = document.createElement('button');
            jwBtn.className = 'action-btn danger';
            jwBtn.innerHTML = `🎯 Pilih/Ganti Target Dendam`;
            jwBtn.onclick = () => {
                msg.innerHTML = `${ROLE_EMOJI['Junior Wolf']} Klik kartu pemain yang ingin kamu jadikan <strong>Target Balas Dendam</strong>!`;
                window._nightActionType = 'jw_target';
                showActionFeedback('🎯 Klik kartu pemain target dendammu!');
            };
            btns.appendChild(jwBtn);
        }
        if (data.hasWF || data.role === 'Wolffluencer') {
            const voteBtn = document.createElement('button');
            voteBtn.className = 'action-btn danger';
            voteBtn.style.cssText = 'background:linear-gradient(135deg, #c0392b, #800000); border-color:#e74c3c; margin-top:6px; margin-right:6px;';
            voteBtn.innerHTML = `🐺 Voting Bunuh Mangsa`;
            voteBtn.onclick = () => {
                msg.innerHTML = `${ROLE_EMOJI['Werewolf']} <strong>Pilih mangsa malam ini</strong> — klik kartu pemain (Bisa diubah)`;
                window._nightActionType = 'ww_vote';
                showActionFeedback('🐺 Mode aktif: Voting membunuh mangsa!');
            };
            btns.appendChild(voteBtn);

            const wfBtn = document.createElement('button');
            wfBtn.className = 'action-btn danger';
            wfBtn.style.cssText = 'background:linear-gradient(135deg, #8A2BE2, #4B0082); border-color:#9370DB; margin-top:6px;';
            wfBtn.innerHTML = `🧵 Pilih Target Influence (Puppet)`;
            wfBtn.onclick = () => {
                msg.innerHTML = `${ROLE_EMOJI['Wolffluencer'] || '🧵'} Klik kartu pemain yang ingin kamu kendalikan suaranya besok (menjadi Puppet)!`;
                window._nightActionType = 'wolffluencer_influence';
                showActionFeedback('🧵 Mode aktif: Klik kartu pemain yang akan di-influence!');
            };
            btns.appendChild(wfBtn);
        }
        return;
    }

    const typeMap = {
        doc_protect:     { icon: ROLE_EMOJI['Dokter'],       text: '<strong>Lindungi</strong> satu orang malam ini — klik kartu (Bisa diubah)', phase: 'night', actionType: 'doc_protect' },
        bg_protect:      { icon: ROLE_EMOJI['Bodyguard'],    text: '<strong>Jaga</strong> satu orang malam ini — klik kartu (Bisa diubah)', phase: 'night', actionType: 'bg_protect' },
        seer_check:      { icon: ROLE_EMOJI['Penerawang'],   text: '<strong>Terawang</strong> identitas seseorang — klik kartu hidup (Sekali Pilih)', phase: 'night', actionType: 'seer_check' },
        det_investigate: { icon: ROLE_EMOJI['Detektif'],     text: '<strong>Selidiki</strong> makam warga mati — klik kartu mati (Sekali Pilih)', phase: 'night', actionType: 'det_investigate' },
        medium_revive:   { icon: ROLE_EMOJI['Medium'],       text: '<strong>Panggil arwah kembali</strong> — klik kartu mati (Bisa diubah)', phase: 'night', actionType: 'medium_revive' },
        cor_glitch:      { icon: ROLE_EMOJI['Corruptor'],    text: '<strong>Glitch</strong> target besok — klik kartu', phase: 'night', actionType: 'cor_glitch' },
        gr_target:       { icon: ROLE_EMOJI['Grave Robber'], text: '<strong>Pilih target</strong> untuk dicuri rolenya kelak — klik kartu', phase: 'night', actionType: 'gr_target' },
        ss_kill:         { icon: ROLE_EMOJI['Shapeshifter'], text: '<strong>Bunuh</strong> target malam ini — klik kartu', phase: 'night', actionType: 'ss_kill' },
        baker_bread:     { icon: ROLE_EMOJI['Baker'],        text: '<strong>Kirim roti</strong> ke seseorang besok — klik kartu', phase: 'night', actionType: 'baker_bread' },
    };

    if (typeMap[data.type]) {
        const t = typeMap[data.type];
        msg.innerHTML = `${t.icon} ${t.text}`;
        currentPhase = t.phase;
        if (t.actionType) window._nightActionType = t.actionType;
        if (data.type === 'medium_revive') {
            chatArea.style.display = 'flex';
            document.querySelector('#chat-area .chat-input-row').style.display = 'flex';
        }
        return;
    }

    if (data.type === 'cupid_pair') {
        msg.innerHTML = `${ROLE_EMOJI['Cupid']} <strong>Pilih 2 pasangan</strong> (${window._cupidCount || 0}/2 dipilih) — klik kartu`;
        window._cupidCount = 0; currentPhase = 'night'; window._nightActionType = 'cupid_pair';
        return;
    }

    if (data.type === 'astro_action') {
        msg.innerHTML = `${ROLE_EMOJI['Astronomer']} <strong>Pilih aksi Astronomer:</strong>`;
        if (data.canMoon) {
            const moonBtn = document.createElement('button');
            moonBtn.className = 'action-btn';
            moonBtn.innerHTML = `🌑 New Moon`;
            moonBtn.onclick = () => {
                socket.emit('night_action', { sessionId: SESSION_ID, discordId: MY_ID, action: 'astro_moon' });
                showActionFeedback('🌑 New Moon diaktifkan!');
                moonBtn.disabled = true;
            };
            btns.appendChild(moonBtn);
        }
        if (data.canMeteor) {
            const metBtn = document.createElement('button');
            metBtn.className = 'action-btn danger';
            metBtn.innerHTML = `☄️ Meteor`;
            metBtn.onclick = () => {
                msg.innerHTML = `${ROLE_EMOJI['Astronomer']} Pilih target <strong>Meteor</strong> — klik kartu`;
                currentPhase = 'night'; window._nightActionType = 'astro_meteor';
                metBtn.disabled = true;
            };
            btns.appendChild(metBtn);
        }
        return;
    }

    if (data.type === 'arson_action') {
        msg.innerHTML = `${ROLE_EMOJI['Arsonist']} <strong>Siram Bensin</strong> — klik kartu pemain (Bisa diubah). ATAU tekan tombol di bawah untuk membakar semua (${data.dousedCount} tersiram):`;
        currentPhase = 'night'; window._nightActionType = 'arson_douse';
        const igniteBtn = document.createElement('button');
        igniteBtn.className = 'action-btn danger';
        igniteBtn.innerHTML = `🔥 NYALAKAN API! (${data.dousedCount} tersiram)`;
        igniteBtn.style.fontWeight = '800';
        igniteBtn.onclick = () => {
            window._nightActionType = 'DONE';
            socket.emit('night_action', { sessionId: SESSION_ID, discordId: MY_ID, action: 'arson_ignite' });
            showActionFeedback('🔥 API DINYALAKAN! (Kamu tidak bisa menyiram malam ini)');
            triggerScreenFlash('orange');
            igniteBtn.disabled = true;
        };
        btns.appendChild(igniteBtn);
        return;
    }

    if (data.type === 'jailed') {
        msg.innerHTML = `🔒 <em>${data.reason || 'Kamu sedang dikurung di penjara!'}</em>`;
        chatArea.style.display = 'flex';
        document.querySelector('#chat-area .chat-input-row').style.display = 'flex';
        return;
    }

    if (data.type === 'jailer_action') {
        chatArea.style.display = 'flex';
        document.querySelector('#chat-area .chat-input-row').style.display = 'flex';
        msg.innerHTML = `${ROLE_EMOJI['Jailer'] || '🔒'} <strong>Tahananmu malam ini: ${data.targets[0]?.name || '???'}</strong> (Sisa Peluru: ${data.bullet})`;
        if (data.bullet > 0) {
            const execBtn = document.createElement('button');
            execBtn.className = 'action-btn danger';
            execBtn.innerHTML = `💥 EKSEKUSI TAHANAN`;
            execBtn.onclick = () => {
                socket.emit('night_action', { sessionId: SESSION_ID, discordId: MY_ID, action: 'jailer_execute' });
                showActionFeedback('💥 Keputusan eksekusi dikunci!');
                execBtn.disabled = true;
            };
            btns.appendChild(execBtn);
        }
        return;
    }

    if (data.type === 'sect_action') {
        currentPhase = 'night';
        window._nightActionType = 'sect_convert';
        msg.innerHTML = `${ROLE_EMOJI['Sect Leader']} <strong>Konversi Anggota</strong> (${data.sectCount}/5 Sekte) — klik kartu pemain`;
        
        const convBtn = document.createElement('button');
        convBtn.className = 'action-btn active';
        convBtn.innerHTML = `🔮 Konversi`;
        
        const sacBtn = document.createElement('button');
        sacBtn.className = 'action-btn danger';
        sacBtn.innerHTML = `🗡️ Korbankan & Bunuh`;
        
        convBtn.onclick = () => {
            window._nightActionType = 'sect_convert';
            window._sectSacrificeMember = null;
            msg.innerHTML = `${ROLE_EMOJI['Sect Leader']} <strong>Konversi Anggota</strong> (${data.sectCount}/5 Sekte) — klik kartu pemain`;
            convBtn.classList.add('active'); sacBtn.classList.remove('active');
            showActionFeedback('🔮 Mode Konversi Aktif — klik kartu sasaran');
        };
        
        sacBtn.onclick = () => {
            if (!data.sacrificeMembers || data.sacrificeMembers.length === 0) {
                showActionFeedback('🔴 Belum ada pengikut sekte lain untuk dikorbankan!');
                return;
            }
            window._nightActionType = 'sect_sacrifice_step1';
            msg.innerHTML = `${ROLE_EMOJI['Sect Leader']} <strong>Langkah 1:</strong> Klik kartu pengikut sekte yang akan <strong>DIKORBANKAN</strong>`;
            sacBtn.classList.add('active'); convBtn.classList.remove('active');
            showActionFeedback('🗡️ Pilih pengikut sekte yang akan dikorbankan!');
        };
        
        btns.appendChild(convBtn);
        btns.appendChild(sacBtn);
        return;
    }
}

function confirmNightTarget(targetId) {
    let action = window._nightActionType;
    if (!action) {
        if (myRole === 'Dokter') action = 'doc_protect';
        else if (myRole === 'Penerawang') action = 'seer_check';
        else if (myRole === 'Werewolf Seer') action = 'ws_check';
        else if (myRole === 'Detektif') action = 'det_investigate';
        else if (myRole === 'Medium') action = 'medium_revive';
        else if (myRole === 'Corruptor') action = 'cor_glitch';
        else if (myRole === 'Baker') action = 'baker_bread';
        else if (myRole === 'Bodyguard') action = 'bg_protect';
        else if (myRole === 'Cupid') action = 'cupid_pair';
        else if (myRole === 'Arsonist') action = 'arson_douse';
        else if (myRole === 'Sect Leader') action = 'sect_convert';
        else if (myTeam === 'ww') action = 'ww_vote';
        else return;
    }

    if (action === 'sect_sacrifice_step1') {
        const targetPlayer = gameState?.players.find(p => p.id === targetId);
        if (targetId === MY_ID) {
            showActionFeedback('🔴 Sect Leader tidak bisa mengorbankan diri sendiri!');
            return;
        }
        if (!targetPlayer?.isSect) {
            showActionFeedback('🔴 Pilih sesama anggota sekte untuk dikorbankan!');
            return;
        }
        window._sectSacrificeMember = targetId;
        window._nightActionType = 'sect_sacrifice_step2';
        document.getElementById('action-message').innerHTML = `${ROLE_EMOJI['Sect Leader']} <strong>Langkah 2:</strong> Korban (${targetPlayer.name}) dipilih. Sekarang klik kartu musuh yang ingin <strong>DIBUNUH</strong>!`;
        showActionFeedback(`🗡️ Mengorbankan ${targetPlayer.name}. Pilih target bunuh!`);
        return;
    }
    if (action === 'sect_sacrifice_step2') {
        const targetPlayer = gameState?.players.find(p => p.id === targetId);
        if (targetId === MY_ID || targetPlayer?.isSect || targetId === window._sectSacrificeMember) {
            showActionFeedback('🔴 Target pembunuhan tidak boleh sesama anggota sekte!');
            return;
        }
        if (!window._sectSacrificeMember) {
            window._nightActionType = 'sect_convert';
            return;
        }
        socket.emit('night_action', { sessionId: SESSION_ID, discordId: MY_ID, action: 'sect_sacrifice', targetId, extra: { sacrificeMember: window._sectSacrificeMember } });
        const tName = gameState?.players.find(p => p.id === targetId)?.name || '?';
        const sacName = gameState?.players.find(p => p.id === window._sectSacrificeMember)?.name || '?';
        showActionFeedback(`🗡️ Ritual Pengorbanan: Mengorbankan ${sacName} untuk membunuh ${tName}`);
        return;
    }
    if (action === 'sect_convert') {
        socket.emit('night_action', { sessionId: SESSION_ID, discordId: MY_ID, action: 'sect_convert', targetId });
        const tName = gameState?.players.find(p => p.id === targetId)?.name || '?';
        showActionFeedback(`🔮 Target konversi dikunci: ${tName}`);
        return;
    }

    if (action === 'cupid_pair') {
        window._cupidCount = (window._cupidCount || 0) + 1;
        document.getElementById('action-message').innerHTML = `${ROLE_EMOJI['Cupid']} <strong>(${window._cupidCount}/2)</strong> pasangan dipilih`;
        if (window._cupidCount >= 2) window._nightActionType = null;
    }
    if (action === 'wolffluencer_influence') {
        socket.emit('night_action', { sessionId: SESSION_ID, discordId: MY_ID, action, targetId });
        const tName = gameState?.players.find(p => p.id === targetId)?.name || '?';
        showActionFeedback(`🧵 Target Puppet dikunci: ${tName}`);
        window._nightActionType = 'ww_vote';
        const actionMsg = document.getElementById('action-message');
        if (actionMsg) actionMsg.innerHTML = `${ROLE_EMOJI['Werewolf']} <strong>Pilih mangsa malam ini</strong> — klik kartu pemain untuk voting membunuh (Bisa diubah)`;
        return;
    }
    if (['seer_check', 'det_investigate', 'jw_target', 'ws_check'].includes(action)) {
        window._nightActionType = 'DONE';
    }
    socket.emit('night_action', { sessionId: SESSION_ID, discordId: MY_ID, action, targetId });
    const tName = gameState?.players.find(p => p.id === targetId)?.name || '?';
    showActionFeedback(`✅ Target dikunci: ${tName}`);
}

function confirmVote(targetId) {
    socket.emit('cast_vote', { sessionId: SESSION_ID, discordId: MY_ID, targetId });
    showActionFeedback(`🗳️ Vote dikirim: ${gameState?.players.find(p => p.id === targetId)?.name || '?'}`);
}

function showActionFeedback(text) {
    const msg = document.getElementById('action-message');
    msg.style.color = '#2ecc71';
    msg.innerHTML = text;
    setTimeout(() => { msg.style.color = ''; }, 2500);
}

// ═══════════════════════════════════════════════════
//  DAY UI
// ═══════════════════════════════════════════════════
function handleDayAbility(data) {
    const btns = document.getElementById('action-buttons');
    const msg  = document.getElementById('action-message');

    if (data.type === 'berserk_activate') {
        msg.innerHTML = `${ROLE_EMOJI['Berserk Werewolf']} <strong>Frenzy:</strong> Aktifkan agar serangan WW menembus perlindungan malam ini?`;
        const btn = document.createElement('button');
        btn.className = 'action-btn danger';
        btn.innerHTML = `🩸 Aktifkan Frenzy`;
        btn.onclick = () => {
            socket.emit('day_action', { sessionId: SESSION_ID, discordId: MY_ID, action: 'berserk_activate' });
            btn.disabled = true; showActionFeedback('🩸 Frenzy diaktifkan!');
        };
        btns.appendChild(btn);
    }
    if (data.type === 'pw_kill') {
        msg.innerHTML = `${ROLE_EMOJI['Party Werewolf']} <strong>Ledakkan seseorang</strong> hari ini!`;
        const btn = document.createElement('button');
        btn.className = 'action-btn danger';
        btn.innerHTML = `💥 Ledakkan!`;
        btn.onclick = () => { window._dayActionType = 'pw_kill'; showActionFeedback('💥 Pilih target di kartu pemain!'); };
        btns.appendChild(btn);
    }
    if (data.type === 'priest_holy') {
        msg.innerHTML = `${ROLE_EMOJI['Pendeta']} <strong>Siram Air Suci</strong> ke satu pemain!`;
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.innerHTML = `💦 Siram Air Suci`;
        btn.onclick = () => { window._dayActionType = 'priest_holy'; showActionFeedback('💦 Pilih target di kartu!'); };
        btns.appendChild(btn);
    }
    if (data.type === 'jw_revenge_select') {
        msg.innerHTML = `${ROLE_EMOJI['Junior Wolf']} <strong>Target Balas Dendam:</strong> Kamu bisa mengganti target kutukan mati kapan pun!`;
        const btn = document.createElement('button');
        btn.className = 'action-btn danger';
        btn.innerHTML = `🎯 Ganti Target Dendam`;
        btn.onclick = () => { window._dayActionType = 'jw_target'; showActionFeedback('🎯 Klik kartu pemain target dendammu!'); };
        btns.appendChild(btn);
    }
    if (data.type === 'sw_manipulate') {
        msg.innerHTML = `${ROLE_EMOJI['Shadow Wolf']} <strong>Manipulasi Voting</strong> — WW 2x vote hari ini?`;
        const btn = document.createElement('button');
        btn.className = 'action-btn danger';
        btn.innerHTML = `🌑 Aktifkan Manipulasi`;
        btn.onclick = () => {
            socket.emit('day_action', { sessionId: SESSION_ID, discordId: MY_ID, action: 'sw_manipulate' });
            btn.disabled = true; showActionFeedback('🌑 Suara WW berlipat!');
        };
        btns.appendChild(btn);
    }
    if (data.type === 'princess_reveal') {
        const btn = document.createElement('button');
        btn.className = 'action-btn gold';
        btn.innerHTML = `${ROLE_EMOJI['Princess']} Reveal sebagai Princess`;
        btn.onclick = () => {
            socket.emit('day_action', { sessionId: SESSION_ID, discordId: MY_ID, action: 'princess_reveal' });
            btn.disabled = true; showActionFeedback('👑 Identitas terungkap! Suaramu 2x!');
        };
        btns.appendChild(btn);
    }
    if (data.type === 'hakim_execute') {
        msg.innerHTML = `${ROLE_EMOJI['Hakim']} <strong>Eksekusi paksa</strong> satu pemain hari ini — klik kartu!`;
        currentPhase = 'day'; window._dayActionType = 'hakim_execute';
    }
    if (data.type === 'nw_sleep') {
        msg.innerHTML = `${ROLE_EMOJI['Nightmare Wolf']} <strong>Tidurkan</strong> satu pemain malam ini — klik kartu!`;
        currentPhase = 'day'; window._dayActionType = 'nw_sleep';
    }
    if (data.type === 'polisi_action') {
        msg.innerHTML = `${ROLE_EMOJI['Polisi']} <strong>Pilih aksi Polisi:</strong>`;
        if (data.canShoot) {
            const shootBtn = document.createElement('button');
            shootBtn.className = 'action-btn danger';
            shootBtn.innerHTML = `🔫 Tembak`;
            shootBtn.onclick = () => {
                msg.innerHTML = `${ROLE_EMOJI['Polisi']} Pilih target untuk <strong>ditembak</strong> — klik kartu!`;
                currentPhase = 'day'; window._dayActionType = 'polisi_shoot'; shootBtn.disabled = true;
            };
            btns.appendChild(shootBtn);
        }
        if (data.canReveal) {
            const revBtn = document.createElement('button');
            revBtn.className = 'action-btn';
            revBtn.innerHTML = `🔍 Selidiki Identitas`;
            revBtn.onclick = () => {
                msg.innerHTML = `${ROLE_EMOJI['Polisi']} Pilih target untuk <strong>diungkap</strong> ke publik — klik kartu!`;
                currentPhase = 'day'; window._dayActionType = 'polisi_reveal'; revBtn.disabled = true;
            };
            btns.appendChild(revBtn);
        }
    }
    if (data.type === 'jailer_select') {
        msg.innerHTML = `${ROLE_EMOJI['Jailer'] || '🔒'} <strong>Kurung</strong> satu pemain malam nanti — klik kartu!`;
        const btn = document.createElement('button');
        btn.className = 'action-btn danger';
        btn.innerHTML = `🔒 Pilih Tahanan`;
        btn.onclick = () => { window._dayActionType = 'jailer_select'; showActionFeedback('🔒 Klik kartu pemain yang akan dikurung!'); };
        btns.appendChild(btn);
    }
    if (data.type === 'pacifist_reveal') {
        const btn = document.createElement('button');
        btn.className = 'action-btn gold';
        btn.innerHTML = `${ROLE_EMOJI['Pacifist'] || '🕊️'} Ungkap Role Target (Hentikan Voting)`;
        btn.onclick = () => {
            msg.innerHTML = `${ROLE_EMOJI['Pacifist'] || '🕊️'} Pilih target yang ingin dilihat role-nya (dan membatalkan voting hari ini) — klik kartu!`;
            currentPhase = 'day'; window._dayActionType = 'pacifist_reveal'; btn.disabled = true;
        };
        btns.appendChild(btn);
    }
    if (data.type === 'glitched') {
        document.getElementById('action-message').innerHTML = `${ROLE_EMOJI['Corruptor']} <em>Kamu di-GLITCH! Tidak bisa bicara, voting, atau pakai skill hari ini.</em>`;
    }
    if (!['glitched'].includes(data.type) && currentPhase === 'day') {
        document.getElementById('chat-area').style.display = 'flex';
    }
}

function kickPlayer(id) {
    if (confirm('Yakin ingin menendang pemain ini?')) {
        socket.emit('kick_player', { sessionId: SESSION_ID, hostId: MY_ID, targetId: id });
    }
}

// ═══════════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════════
function startTimer(duration, phase) {
    clearInterval(timerInterval);
    timerMax = duration;
    let remaining = duration;
    const fill = document.getElementById('timer-fill');
    const text = document.getElementById('timer-text');
    const circumference = 113;

    function update() {
        const progress = remaining / timerMax;
        fill.style.strokeDashoffset = circumference * (1 - progress);
        if (remaining <= 10) {
            fill.style.stroke = '#e74c3c';
            if (remaining <= 5) document.getElementById('timer-ring').style.animation = 'timerUrgent 0.4s ease-in-out infinite alternate';
        } else if (remaining <= 20) {
            fill.style.stroke = '#f39c12';
        } else {
            fill.style.stroke = '#3498db';
            document.getElementById('timer-ring').style.animation = '';
        }
        text.textContent = remaining;
        if (remaining <= 0) { clearInterval(timerInterval); text.textContent = '⏰'; }
        remaining--;
    }
    update();
    timerInterval = setInterval(update, 1000);
}

// ═══════════════════════════════════════════════════
//  ROLE REVEAL OVERLAY
// ═══════════════════════════════════════════════════
function showRoleReveal(role, emoji, team, wwAllies, extra) {
    const overlay = document.getElementById('role-reveal-overlay');
    const cardBack = document.getElementById('role-card-back');
    const revCard  = document.getElementById('role-reveal-card');

    document.getElementById('reveal-emoji').innerHTML = emoji;
    document.getElementById('reveal-name').textContent = role;

    const teamNames = { ww: '🐺 Tim Werewolf', village: '🧑‍🌾 Tim Desa', solo: '⚔️ Solo' };
    document.getElementById('reveal-team').textContent = teamNames[team] || team;

    // Allies text
    const alliesEl = document.getElementById('reveal-allies');
    if (wwAllies && wwAllies.length > 0) {
        alliesEl.innerHTML = `<br>🐺 Sekutu Werewolf: ${wwAllies.map(x => (x.role ? `${x.name} (${x.role})` : (x.name || x))).join(', ')}`;
    } else if (extra?.jwTarget) {
        alliesEl.innerHTML = `<br>🎯 Target balas dendam: <strong>${extra.jwTarget}</strong>`;
    } else if (extra?.hhTarget) {
        alliesEl.innerHTML = `<br>🎯 Target eksekusi: <strong>${extra.hhTarget}</strong>`;
    } else {
        alliesEl.innerHTML = '';
    }

    // Team color
    cardBack.className = `role-card-back team-${team}`;

    const container = document.getElementById('gacha-container');
    const reel = document.getElementById('gacha-reel');

    // Reset UI
    container.classList.remove('gacha-stop');
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';
    container.style.display = 'block';
    revCard.style.display = 'none';
    revCard.classList.remove('flipped');
    overlay.style.background = 'rgba(0,0,0,0.85)';

    // Build gacha reel: use roles from this specific game session if available,
    // otherwise fall back to all roles defined in ROLE_EMOJI.
    const sourceRoles = (window.gameRoles && window.gameRoles.length > 1)
        ? window.gameRoles
        : Object.keys(ROLE_EMOJI).filter(r => r !== 'Villager');

    // Shuffle source roles
    const shuffled = [...sourceRoles];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Build the reel: repeat the shuffled list until we have ~20 items, then the winning role last
    const reelItems = [];
    const minItems = Math.max(20, shuffled.length * 3); // spin at least 3 full cycles
    while (reelItems.length < minItems) {
        reelItems.push(...shuffled);
    }
    reelItems.push(role); // The winning role ALWAYS last

    reel.innerHTML = reelItems.map(r => `
        <div class="gacha-item">
            <div class="emoji">${ROLE_EMOJI[r] || '❓'}</div>
            <div class="name">${r}</div>
        </div>
    `).join('');

    overlay.style.display = 'flex';

    // Start spin animation
    // Height of one item is 300px
    const itemHeight = 300;
    const finalY = -(reelItems.length - 1) * itemHeight;

    // Trigger reflow
    reel.offsetHeight;

    // Spin! (easeOutQuart for a nice slowdown)
    reel.style.transition = 'transform 3.5s cubic-bezier(0.165, 0.84, 0.44, 1)';
    reel.style.transform = `translateY(${finalY}px)`;

    // Play some tick sounds
    let ticks = 0;
    const tickInterval = setInterval(() => {
        // playSoundtrack('tick.mp3') if we had one.
        ticks++;
        if (ticks > 20) clearInterval(tickInterval);
    }, 150);

    // After spin ends
    setTimeout(() => {
        container.classList.add('gacha-stop');
        triggerScreenFlash('white');
        
        // Hide gacha, show card
        setTimeout(() => {
            container.style.display = 'none';
            revCard.style.display = 'block';
            
            // Apply team glow to overlay
            const glowMap = { ww: 'rgba(192,57,43,0.3)', village: 'rgba(52,152,219,0.2)', solo: 'rgba(155,89,182,0.3)' };
            overlay.style.background = `radial-gradient(circle at 50% 50%, ${glowMap[team] || 'transparent'} 0%, rgba(0,0,0,0.85) 60%)`;

            // Flip after a short pause
            setTimeout(() => {
                revCard.classList.add('flipped');
                triggerScreenFlash(team === 'ww' ? 'red' : team === 'solo' ? 'pink' : 'white');
            }, 100);
        }, 1500); // Wait 1.5s on the result before flipping the actual card

    }, 3500); // 3.5s spin duration

    // Auto-close after 12s total
    overlay.onclick = () => { overlay.style.display = 'none'; };
    setTimeout(() => { overlay.style.display = 'none'; }, 12000);
}

// ═══════════════════════════════════════════════════
//  DEATH ANIMATION ENGINE
// ═══════════════════════════════════════════════════
const DEATH_FLASH_MAP = {
    ww: 'red', arson: 'orange', god: 'white', meteor: 'white',
    heart: 'pink', bomb: 'white', glitch: 'red', vote: 'red',
    shoot: 'white', injury: 'red', sect_ritual: 'purple',
    sect_sacrifice_member: 'purple', sect_cascade: 'purple', default: 'red'
};

function triggerDeathAnimation(cardId, reason) {
    const card = document.getElementById(`card-${cardId}`);
    if (!card || card.classList.contains('dead')) return;

    // Remove any existing reason classes
    card.className = card.className.replace(/reason-\S+/g, '').trim();
    card.classList.add('dying', `reason-${reason || 'default'}`);

    // Screen flash
    const flashType = DEATH_FLASH_MAP[reason] || 'red';
    triggerScreenFlash(flashType);

    // Play death song immediately if it's me
    if (cardId === MY_ID && currentPhase !== 'lobby' && !isGameOver) {
        playSoundtrack('Death_Song.mp3');
    }

    // Apply specific CSS animation class based on reason (persistent marks / card shake)
    const cssAnimReasons = ['ww', 'holy_water', 'lightning', 'slash', 'shoot', 'bomb', 'arson', 'heart', 'glitch'];
    if (cssAnimReasons.includes(reason)) {
        card.classList.add(`anim-${reason}`);
    } else if (['god'].includes(reason)) {
        card.classList.add('anim-lightning');
    } else if (['meteor', 'meteor_backfire', 'vote', 'injury'].includes(reason)) {
        card.classList.add('anim-bomb'); // shake effect
    }

    // Canvas particle effects (realistic visuals)
    if (window.DeathFX) {
        const fxReason = reason === 'god' ? 'lightning' : reason;
        window.DeathFX.play(cardId, fxReason);
    }

    // After animation, become dead and update role display
    setTimeout(() => {
        card.className = card.className.replace(/dying|reason-[a-z_]+|anim-[a-z_]+/g, '').trim();
        card.classList.add('dead');
        card.classList.add(`dead-${reason}`); // Persistent visual state
        if (reason === 'sect_ritual') {
            card.style.opacity = '0';
            card.style.visibility = 'hidden';
            card.style.pointerEvents = 'none';
        }
        // Update role label to use the publicly announced role (may be '???' for CW/Corruptor/SS)
        const roleEl = card.querySelector('.card-role');
        if (roleEl) {
            const announcedRole = playerRevealedRoles[cardId];
            roleEl.innerHTML = announcedRole !== undefined ? renderRoleLabel(announcedRole) : '';
        }
    }, 1600);
}

function emitDeathParticles(card, reason) {
    const container = document.getElementById('ann-particles');
    if (!container) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const colors = {
        arson:  ['#ff5722', '#ff8a65', '#ffcc02', '#e64a19'],
        bomb:   ['#ffeb3b', '#ffc107', '#ff5722', '#ffffff'],
        god:    ['#ffffff', '#fffde7', '#fff9c4', '#f0f4ff'],
        meteor: ['#90caf9', '#42a5f5', '#1565c0', '#ffffff'],
    };
    const particleColors = colors[reason] || ['#e74c3c'];

    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        const angle = (i / 18) * 360 + Math.random() * 20;
        const dist  = 60 + Math.random() * 100;
        const size  = 5 + Math.random() * 8;
        const color = particleColors[Math.floor(Math.random() * particleColors.length)];
        p.style.cssText = `
            position:absolute;
            left:${cx}px; top:${cy}px;
            width:${size}px; height:${size}px;
            background:${color};
            border-radius:50%;
            pointer-events:none;
            transform:translate(-50%,-50%);
            transition:none;
            animation: particle-burst-${i} 0.8s ease-out forwards;
        `;
        const rad = angle * Math.PI / 180;
        const tx = Math.cos(rad) * dist;
        const ty = Math.sin(rad) * dist;
        const kf = `@keyframes particle-burst-${i} { 0%{transform:translate(-50%,-50%) scale(1);opacity:1} 100%{transform:translate(calc(-50% + ${tx}px),calc(-50% + ${ty}px)) scale(0);opacity:0} }`;
        const style = document.createElement('style');
        style.textContent = kf;
        document.head.appendChild(style);
        container.appendChild(p);
        setTimeout(() => { p.remove(); style.remove(); }, 900);
    }
}

// ═══════════════════════════════════════════════════
//  ANNOUNCEMENTS
// ═══════════════════════════════════════════════════
const DEATH_ANN_MAP = {
    ww:              { icon: '🐺', cssClass: 'ann-ww',     title: (name) => `${name} direnggut serigala!` },
    arson:           { icon: '🔥', cssClass: 'ann-arson',  title: (name) => `${name} terbakar hidup-hidup!` },
    vote:            { icon: '⚖️', cssClass: 'ann-vote',   title: (name) => `${name} digantung warga!` },
    god:             { icon: '✝️', cssClass: 'ann-god',    title: (name) => `${name} terkena air suci!` },
    heart:           { icon: '💔', cssClass: 'ann-heart',  title: (name) => `${name} mati patah hati!` },
    bomb:            { icon: '💥', cssClass: 'ann-bomb',   title: (name) => `${name} MELEDAK!` },
    shoot:           { icon: '🔫', cssClass: 'ann-shoot',  title: (name) => `${name} ditembak mati!` },
    glitch:          { icon: '🖥️', cssClass: 'ann-glitch', title: (name) => `${name} ter-GLITCH!` },
    meteor:          { icon: '☄️', cssClass: 'ann-meteor', title: (name) => `${name} dihantam meteor!` },
    meteor_backfire: { icon: '☄️', cssClass: 'ann-meteor', title: (name) => `${name} salah target! Meteor berbalik!` },
    jw_revenge:      { icon: '🎯', cssClass: 'ann-heart',  title: (name) => `${name} tewas oleh kutukan balas dendam!` },
    injury:          { icon: '🩸', cssClass: 'ann-injury', title: (name) => `${name} gugur karena luka!` },
    slash:           { icon: '🔪', cssClass: 'ann-slash',  title: (name) => `${name} dibunuh Shapeshifter!` },
    hakim:           { icon: '⚖️', cssClass: 'ann-vote',   title: (name) => `${name} dieksekusi Hakim!` },
    hakim_suicide:   { icon: '⚖️', cssClass: 'ann-vote',   title: (name) => `${name} (Hakim) dihukum oleh keadilannya sendiri!` },
    jailer_exec:           { icon: '💥', cssClass: 'ann-shoot',  title: (name) => `${name} dieksekusi mati di penjara!` },
    sect_ritual:           { icon: '🗡️', cssClass: 'ann-glitch', title: (name) => `Player ${name} was killed by the dark ritual of the sect leader` },
    sect_sacrifice_member: { icon: '🔮', cssClass: 'ann-glitch', title: (name) => `${name} berteriak "LONG LIVE SECT!" dan mengorbankan jiwanya!` },
    sect_cascade:          { icon: '💀', cssClass: 'ann-glitch', title: (name) => `${name} tewas karena Sect Leader gugur!` },
    default:               { icon: '💀', cssClass: '',            title: (name) => `${name} telah meninggal!` },
};

let _annQueue = [];
let _annRunning = false;

function queueAnnouncement(ann, duration = 3500) {
    _annQueue.push({ ann, duration });
    if (!_annRunning) processAnnQueue();
}

function processAnnQueue() {
    if (_annQueue.length === 0) { _annRunning = false; return; }
    _annRunning = true;
    const { ann, duration } = _annQueue.shift();
    _showAnnouncement(ann, duration, () => setTimeout(processAnnQueue, 300));
}

function _showAnnouncement(ann, duration, onDone) {
    const overlay = document.getElementById('announcement-overlay');
    const card    = document.getElementById('announcement-card');
    overlay.style.display = 'flex';

    let html = '';
    let cardClass = 'announcement-card';

    if (ann.type === 'death') {
        const lookupKey = (ann.cause && DEATH_ANN_MAP[ann.cause]) ? ann.cause : (ann.reason || 'default');
        const meta   = DEATH_ANN_MAP[lookupKey] || DEATH_ANN_MAP.default;
        cardClass += ` ${meta.cssClass}`;
        const avatarHtml = ann.avatar ? `<img class="ann-victim-avatar" src="${ann.avatar}" onerror="this.src=''" alt="">` : '';
        const isRoleHidden = !ann.role || ann.role === '???' || ann.role === '?';
        if (ann.playerId) {
            playerRevealedRoles[ann.playerId] = isRoleHidden ? '???' : ann.role;
        }
        const roleStr = isRoleHidden ? '❓ ???' : `${ROLE_EMOJI[ann.role] || '❓'} ${ann.role}`;
        html = `
            <span class="ann-icon">${meta.icon}</span>
            ${avatarHtml}
            <div class="ann-body">
                <div class="ann-title">${meta.title(ann.playerName || '???')}</div>
                <div class="ann-role ${!isRoleHidden ? 'revealed' : ''}">Peran: ${roleStr}</div>
            </div>`;
    } else if (ann.type === 'execution') {
        const meta = DEATH_ANN_MAP[ann.reason] || { icon: '⚖️', cssClass: 'ann-vote' };
        cardClass += ` ${meta.cssClass}`;
        const isRoleHidden = !ann.role || ann.role === '???' || ann.role === '?';
        if (ann.playerId) {
            playerRevealedRoles[ann.playerId] = isRoleHidden ? '???' : ann.role;
        }
        const roleStr = isRoleHidden ? '❓ ???' : `${ROLE_EMOJI[ann.role] || '❓'} ${ann.role}`;
        html = `
            <span class="ann-icon">${meta.icon}</span>
            <div class="ann-body">
                <div class="ann-title">${ann.playerName} digantung warga!</div>
                <div class="ann-role ${!isRoleHidden ? 'revealed' : ''}">Peran: ${roleStr}</div>
            </div>`;
    } else if (ann.type === 'no_execution') {
        html = `<span class="ann-icon">🕊️</span><div class="ann-body"><div class="ann-title">${mdToHtml(ann.reason)}</div></div>`;
    } else if (ann.type === 'info') {
        html = `<span class="ann-icon">📢</span><div class="ann-body"><div class="ann-title">${mdToHtml(ann.text)}</div></div>`;
    } else if (ann.type === 'warning') {
        html = `<span class="ann-icon">⚠️</span><div class="ann-body"><div class="ann-title">${mdToHtml(ann.text)}</div></div>`;
    }

    card.className = cardClass;
    card.innerHTML = html;
    card.style.animation = 'none'; card.offsetHeight; card.style.animation = '';

    const t = setTimeout(() => {
        overlay.style.display = 'none';
        if (onDone) onDone();
    }, duration);
    overlay._clearTimer = () => { clearTimeout(t); overlay.style.display = 'none'; if (onDone) onDone(); };
}

// Legacy function kept for compatibility
function showAnnouncement(ann, duration = 3500) {
    queueAnnouncement(ann, duration);
}

// ═══════════════════════════════════════════════════
//  GLITCH WARNING POPUP (non-blocking)
// ═══════════════════════════════════════════════════
function showGlitchWarning(message) {
    const existing = document.getElementById('glitch-warning-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'glitch-warning-popup';
    popup.className = 'glitch-warning-popup';
    popup.innerHTML = `
        <span class="gwp-icon">🖥️</span>
        <span class="gwp-text">${message}</span>
    `;
    document.body.appendChild(popup);

    // Auto remove after 3s
    setTimeout(() => {
        popup.classList.add('gwp-hide');
        setTimeout(() => popup.remove(), 400);
    }, 3000);
}

// ═══════════════════════════════════════════════════
//  GAME HISTORY LOG
// ═══════════════════════════════════════════════════
const historyLog = [];

function addToHistory(entry) {
    historyLog.push(entry);
    const list = document.getElementById('history-list');
    if (!list) return;

    const item = document.createElement('div');
    item.className = `history-item hist-${entry.type || 'info'}`;
    item.innerHTML = `
        <span class="hist-icon">${entry.icon || '📌'}</span>
        <span class="hist-text">${entry.text}</span>
        <span class="hist-time">${entry.phase || ''}</span>
    `;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;

    // Badge counter
    const badge = document.getElementById('history-badge');
    const badgeMini = document.getElementById('history-badge-mini');
    const panel = document.getElementById('history-panel');
    const isOpen = panel && panel.classList.contains('open');
    if (!isOpen) {
        if (badge) {
            const count = parseInt(badge.textContent || '0') + 1;
            badge.textContent = count;
            badge.style.display = 'flex';
        }
        if (badgeMini) {
            const count = parseInt(badgeMini.textContent || '0') + 1;
            badgeMini.textContent = count;
            badgeMini.style.display = 'flex';
        }
    }
}

// ═══════════════════════════════════════════════════
//  VOTE TALLY
// ═══════════════════════════════════════════════════
let voteMap = {};

function updateVoteTally(players) {
    const tally = document.getElementById('vote-tally');
    if (tally) tally.style.display = 'none';

    const isShadowWolfActive = gameState && gameState.swActiveToday;

    // Update card vote counts
    players.filter(p => p.alive).forEach(p => {
        const countEl = document.getElementById(`vcount-${p.id}`);
        const count = voteMap[p.id] || 0;
        if (countEl) {
            if (isShadowWolfActive) {
                countEl.textContent = '?';
                countEl.className = 'card-vote-count visible';
            } else {
                countEl.textContent = count;
                countEl.className = `card-vote-count ${count > 0 ? 'visible' : ''}`;
            }
        }
    });
}

// ═══════════════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════════════
function sendChat() {
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if (!text) return;

    const me = gameState ? gameState.players.find(x => x.id === MY_ID) : null;
    const isDead = me ? !me.alive : false;
    const isMediumAtNight = me && me.alive && myRole === 'Medium' && currentPhase === 'night';
    const isJailerOrJailedAtNight = me && me.alive && currentPhase === 'night' && (myRole === 'Jailer' || me.isJailed);

    if (isDead || isMediumAtNight) {
        socket.emit('dead_chat', { sessionId: SESSION_ID, discordId: MY_ID, text });
    } else if (isJailerOrJailedAtNight) {
        socket.emit('jailer_chat', { sessionId: SESSION_ID, discordId: MY_ID, text });
    } else if (window.chatMode === 'sect' && window.isSectMember) {
        socket.emit('sect_chat', { sessionId: SESSION_ID, discordId: MY_ID, text });
    } else if (currentPhase === 'night' && myTeam === 'ww') {
        socket.emit('ww_chat', { sessionId: SESSION_ID, discordId: MY_ID, text });
    } else {
        socket.emit('day_chat', { sessionId: SESSION_ID, discordId: MY_ID, text });
    }
    input.value = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.getElementById('chat-input') === document.activeElement) sendChat();
});

function addChatMsg(sender, text, avatarUrl = null) {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    const avHtml = avatarUrl
        ? `<img src="${avatarUrl}" style="width:15px;height:15px;border-radius:50%;vertical-align:middle;margin-right:4px;">`
        : '';
    msg.innerHTML = `${avHtml}<span class="chat-sender">${sender}:</span> ${text}`;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    notifyUnreadChat();
}

function notifyUnreadChat() {
    const chatArea = document.getElementById('chat-area');
    if (chatArea && chatArea.classList.contains('collapsed')) {
        const dot = document.getElementById('chat-unread-dot');
        if (dot) dot.style.display = 'inline';
    }
}

function toggleMobileChat(event) {
    if (event) event.stopPropagation();
    const chatArea = document.getElementById('chat-area');
    if (!chatArea) return;
    chatArea.classList.toggle('collapsed');
    const dot = document.getElementById('chat-unread-dot');
    if (dot && !chatArea.classList.contains('collapsed')) {
        dot.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════════
//  WIN SCREEN PARTICLES (Canvas fireworks)
// ═══════════════════════════════════════════════════
function startWinParticles(winner) {
    const canvas = document.getElementById('win-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = winner === 'Werewolf'
        ? ['#c0392b', '#e74c3c', '#922b21', '#ff6b6b', '#ff0000']
        : winner === 'Village'
            ? ['#2ecc71', '#27ae60', '#f1c40f', '#3498db', '#ffffff']
            : ['#9b59b6', '#8e44ad', '#f39c12', '#e74c3c', '#ffffff'];

    function spawnFirework() {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height * 0.6;
        for (let i = 0; i < 40; i++) {
            const angle = (i / 40) * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.015 + Math.random() * 0.015,
                size: 2 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
    }

    let frame = 0;
    function animate() {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy + 0.05;
            p.vy += 0.06;
            p.life -= p.decay;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        for (let i = particles.length - 1; i >= 0; i--) {
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
        ctx.globalAlpha = 1;
        if (frame % 25 === 0) spawnFirework();
        frame++;
        if (frame < 360) requestAnimationFrame(animate);
    }
    spawnFirework();
    animate();
}

// ═══════════════════════════════════════════════════
//  SOCKET EVENTS
// ═══════════════════════════════════════════════════
socket.on('connect', () => {
    socket.emit('join_game', { sessionId: SESSION_ID, discordId: MY_ID, name: MY_NAME, avatar: MY_AVATAR });
});

socket.on('joined', ({ game, isHost: host, playerId }) => {
    gameState = game;
    isHost = host;
    if (game.phase === 'lobby') {
        setPhaseTheme('lobby');
        renderLobby(game);
        showScreen('lobby');
        playSoundtrack('Lobby_Song.mp3');
    } else {
        showScreen('game');
    }
});

socket.on('lobby_update', ({ game, message }) => {
    gameState = game;
    renderLobby(game);
    if (message) {
        const tip = document.querySelector('.lobby-tip');
        if (tip) {
            tip.textContent = message;
            tip.style.color = '#2ecc71';
            setTimeout(() => { tip.textContent = 'Host mengatur role dan memulai game. Minimal 4 pemain.'; tip.style.color = ''; }, 3000);
        }
    }
});

socket.on('session_closed', () => {
    alert('Host telah membatalkan dan menutup permainan ini.');
    localStorage.removeItem(`ww_${SESSION_ID}`);
    window.location.href = '/';
});

// ─── LOBBY CHAT ──────────────────────────────────────────────────────────────
function sendLobbyChat() {
    const inp = document.getElementById('lobby-chat-input');
    const text = inp.value.trim();
    if (!text) return;

    if (text === '/dev' || text === '/test') {
        const panel = document.getElementById('dev-panel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        
        // Force masuk ke layar in-game untuk testing tanpa butuh 4 orang
        showScreen('game');
        setPhaseTheme('day'); // Default testing phase
        
        // Spawn 1 dummy otomatis jika arena masih kosong
        if (_dummyCount === 0) spawnDummy();
        
        inp.value = '';
        return;
    }

    socket.emit('lobby_chat', { sessionId: SESSION_ID, discordId: MY_ID, text });
    inp.value = '';
}

socket.on('lobby_chat_msg', ({ senderId, senderName, avatar, text }) => {
    const log = document.getElementById('lobby-chat-log');
    if (!log) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg';
    
    // Safety encode HTML
    const safeText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const avatarUrl = avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const nameColor = (senderId === MY_ID) ? '#aaa' : '#3498db';
    
    msg.innerHTML = `<img src="${avatarUrl}" style="width:16px;height:16px;border-radius:50%;vertical-align:middle;margin-right:4px;object-fit:cover;" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'"><span class="chat-sender" style="color:${nameColor}">${senderName}:</span> ${safeText}`;
    
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
});

socket.on('role_assigned', ({ role, emoji, team, wwAllies, sectAllies, isSectMember, jwTarget, jwTargetId, hhTarget, hhTargetId, gameRoles }) => {
    // Store the full list of roles used in this game for the gacha
    if (gameRoles && gameRoles.length) window.gameRoles = gameRoles;
    
    window.isSectMember = isSectMember;
    const sectBtn = document.getElementById('sect-chat-btn');
    if (sectBtn && window.isSectMember) sectBtn.style.display = 'inline-block';

    myHhTargetId = hhTargetId || null;
    myJwTargetId = jwTargetId || null;
    const isInitialReveal = (myRole === null);
    myRole = role; myTeam = team;
    document.getElementById('my-role-emoji').innerHTML = emoji;
    document.getElementById('my-role-name').textContent = role;
    const teamNames = { ww: `🐺 Tim Werewolf`, village: `🧑‍🌾 Tim Desa`, solo: '⚔️ Solo' };
    document.getElementById('my-role-team').innerHTML = teamNames[team] || team;

    const colorMap = {
        ww:      { border: 'rgba(192,57,43,0.6)', bg: 'rgba(192,57,43,0.1)' },
        village: { border: 'rgba(52,152,219,0.5)', bg: 'rgba(52,152,219,0.08)' },
        solo:    { border: 'rgba(155,89,182,0.5)', bg: 'rgba(155,89,182,0.08)' },
    };
    const c = colorMap[team] || {};
    const roleCard = document.getElementById('my-role-card');
    if (c.border) { roleCard.style.borderColor = c.border; roleCard.style.background = c.bg; }

    // Show dramatic role reveal
    if (isInitialReveal) {
        showRoleReveal(role, emoji, team, wwAllies, { jwTarget, hhTarget });
    }
});

socket.on('sect_converted', () => {
    window.isSectMember = true;
    const sectBtn = document.getElementById('sect-chat-btn');
    if (sectBtn) sectBtn.style.display = 'inline-block';
    queueAnnouncement({ type: 'info', text: '🔮 Kamu telah dikonversi ke dalam Sekte Gelap! Kamu sekarang menang bersama Sect Leader!' });
});

window.chatMode = 'public';
function toggleSectChatMode() {
    window.chatMode = (window.chatMode === 'public') ? 'sect' : 'public';
    const btn = document.getElementById('sect-chat-btn');
    const input = document.getElementById('chat-input');
    if (window.chatMode === 'sect') {
        if (btn) { btn.innerHTML = '🔮'; btn.style.background = '#8e44ad'; }
        if (input) input.placeholder = 'Pesan rahasia Sekte...';
    } else {
        if (btn) { btn.innerHTML = '💬'; btn.style.background = 'rgba(255,255,255,0.1)'; }
        if (input) input.placeholder = 'Kirim pesan...';
    }
}

socket.on('game_started', ({ playerCount }) => {
    showScreen('game');
    document.getElementById('phase-subtitle').textContent = `${playerCount} pemain bergabung. Bersiap...`;
});

socket.on('phase_change', ({ phase, dayCount, message, voteTargets, state }) => {
    currentPhase = phase;
    if (state) gameState = state;
    setPhaseTheme(phase);

    if (phase === 'lobby') {
        isGameOver = false;
        playSoundtrack('Lobby_Song.mp3');
    } else {
        const me = state ? state.players.find(x => x.id === MY_ID) : (gameState ? gameState.players.find(x => x.id === MY_ID) : null);
        const isDead = me ? !me.alive : false;

        if (isDead) {
            playSoundtrack('Death_Song.mp3');
        } else if (phase === 'day' || phase === 'vote') {
            playSoundtrack('Day_Phase_Song.mp3');
        } else if (phase === 'night') {
            const isRedMoon = (state && state.berserkActive) || (gameState && gameState.berserkActive);
            const pList = state ? state.players : (gameState ? gameState.players : []);
            const isAnyoneJailed = pList.some(x => x.isJailed);
            const isJailerOrJailed = me && (myRole === 'Jailer' || me.isJailed);
            if (isRedMoon) {
                playSoundtrack('Red_Moon_Phase.mp3');
            } else if (isAnyoneJailed && isJailerOrJailed) {
                playSoundtrack('jailer_song.mp3');
            } else if (myRole === 'Sect Leader' || window.isSectMember || (me && me.isSect)) {
                playSoundtrack('Sect_Song.mp3');
            } else if (myRole === 'Badut') {
                playSoundtrack('Night_Fool.mp3');
            } else if (myRole === 'Arsonist') {
                playSoundtrack('Night_Arson.mp3');
            } else if (myRole === 'Corruptor') {
                playSoundtrack('Night_Cor.mp3');
            } else if (myRole === 'Shapeshifter') {
                playSoundtrack('Night_SS.mp3');
            } else if (myRole === 'Head Hunter') {
                playSoundtrack('Night_HH.mp3');
            } else if (myTeam === 'ww') {
                playSoundtrack('Night_Phase_Werewolfs.mp3');
            } else {
                playSoundtrack('Night_Phase_Village.mp3');
            }
        }
    }

    document.getElementById('action-buttons').innerHTML = '';
    document.getElementById('vote-tally').style.display = 'none';
    voteMap = {};
    selectedTarget = null;
    window._nightActionType = null;
    window._dayActionType = null;
    document.querySelectorAll('.player-card.selected-target').forEach(c => c.classList.remove('selected-target'));
    document.querySelectorAll('.card-vote-count').forEach(c => { c.textContent = '0'; c.classList.remove('visible'); });

    if (phase === 'night') {
        document.getElementById('phase-icon').textContent = '🌙';
        document.getElementById('phase-title').textContent = `Malam ke-${dayCount}`;
        document.getElementById('phase-subtitle').textContent = message;
        document.getElementById('action-message').textContent = 'Menunggu aksi...';
        const me = gameState?.players.find(p => p.id === MY_ID);
        if (me && !me.alive) {
            document.getElementById('chat-area').style.display = 'flex';
            document.querySelector('#chat-area .chat-input-row').style.display = 'flex';
        } else {
            document.getElementById('chat-area').style.display = 'none';
        }
        if (state) renderArena(state.players);
        triggerScreenFlash('red');

    } else if (phase === 'day') {
        document.getElementById('phase-icon').textContent = '☀️';
        document.getElementById('phase-title').textContent = `Hari ke-${dayCount}`;
        document.getElementById('phase-subtitle').textContent = message;
        document.getElementById('action-message').innerHTML = `🧑‍🌾 Diskusikan siapa Werewolf bersama warga!`;
        const me = gameState?.players.find(p => p.id === MY_ID);
        document.getElementById('chat-area').style.display = 'flex';
        document.querySelector('#chat-area .chat-input-row').style.display = (me && me.alive && me.isGlitched) ? 'none' : 'flex';
        if (state) renderArena(state.players);
        triggerScreenFlash('white');

    } else if (phase === 'vote') {
        document.getElementById('phase-icon').textContent = '🗳️';
        document.getElementById('phase-title').textContent = `Voting — Hari ke-${dayCount}`;
        document.getElementById('phase-subtitle').textContent = 'Klik kartu pemain untuk memilih!';
        document.getElementById('action-message').innerHTML = `🔪 Pilih siapa yang digantung — atau Skip!`;

        const me = gameState?.players.find(p => p.id === MY_ID);
        document.getElementById('chat-area').style.display = 'flex';
        document.querySelector('#chat-area .chat-input-row').style.display = (me && me.alive && me.isGlitched) ? 'none' : 'flex';

        const btns = document.getElementById('action-buttons');
        btns.innerHTML = '';
        if (me && me.alive && !me.isGlitched) {
            const skipBtn = document.createElement('button');
            skipBtn.className = 'action-btn';
            skipBtn.innerHTML = `⏭️ Skip Vote`;
            skipBtn.onclick = () => {
                socket.emit('cast_vote', { sessionId: SESSION_ID, discordId: MY_ID, targetId: 'skip' });
                showActionFeedback('✅ Skip Vote terkirim.');
            };
            btns.appendChild(skipBtn);
        } else if (me && !me.alive) {
            document.getElementById('action-message').innerHTML = `👻 Kamu sudah mati, tidak bisa voting.`;
        }
        currentPhase = 'vote';
        if (state) renderArena(state.players);
        triggerScreenFlash('red');
    }
});

socket.on('timer_start', ({ duration, phase }) => startTimer(duration, phase));
socket.on('night_ui',    (data) => handleNightUI(data));
socket.on('day_ability', (data) => handleDayAbility(data));

socket.on('announcement', ({ text }) => {
    queueAnnouncement({ type: 'info', text }, 4000);
});

socket.on('princess_revealed', ({ playerId }) => {
    if (gameState) {
        const p = gameState.players.find(x => x.id === playerId);
        if (p) p.princessRevealed = true;
    }
    playerRevealedRoles[playerId] = 'Princess';
    renderAllPlayers();
});

socket.on('pacifist_revealed', ({ playerId }) => {
    if (gameState) {
        const p = gameState.players.find(x => x.id === playerId);
        if (p) p.pacifistRevealed = true;
    }
    playerRevealedRoles[playerId] = 'Pacifist';
    renderAllPlayers();
});
socket.on('announcements_list', (list) => {
    let delay = 0;
    list.forEach(a => {
        queueAnnouncement(a, 3200);
        // Also trigger death animations for cascade deaths (BG injury, JW revenge, Cupid, Hakim suicide, etc.)
        if (a.type === 'death' && a.playerId) {
            setTimeout(() => triggerDeathAnimation(a.playerId, a.reason || 'default'), delay + 300);
        }
        delay += 3400; // stagger if multiple cascade deaths
    });
});

socket.on('det_result', ({ target, real, realId, decoy, decoyId }) => {
    queueAnnouncement({ type: 'info', text: `🕵️ Penyelidikan makam <strong>${target}</strong>: Dua nama ditemukan — <strong>${real}</strong> dan <strong>${decoy}</strong>. Satu adalah pembunuh aslinya!` }, 7000);

    const ids = [realId, decoyId].filter(Boolean);
    ids.forEach(id => {
        const card = document.getElementById(`card-${id}`);
        if (card && !card.querySelector('.det-suspect-badge')) {
            const badge = document.createElement('div');
            badge.className = 'det-suspect-badge';
            badge.innerHTML = '❓';
            badge.title = 'Suspek Pembunuh';
            card.appendChild(badge);
            setTimeout(() => {
                badge.style.opacity = '0';
                badge.style.transition = 'opacity 0.8s ease';
                setTimeout(() => { if (badge.parentNode) badge.remove(); }, 800);
            }, 8500);
        }
    });
});

socket.on('bg_attacked_notify', ({ attackerName }) => {
    queueAnnouncement({ type: 'warning', text: `🛡️ <strong>SERANGAN DITAHAN!</strong><br>Semalam kamu diserang oleh <strong>${attackerName}</strong>! Kamu berhasil menahannya namun mengalami luka parah (berdarah) dan akan gugur di penghujung hari ini.` }, 10000);
});

socket.on('gr_result', ({ stolenRole, emoji }) => {
    myRole = stolenRole;
    document.getElementById('my-role-emoji').innerHTML = emoji || ROLE_EMOJI[stolenRole] || '?';
    document.getElementById('my-role-name').textContent = stolenRole;
    queueAnnouncement({ type: 'info', text: `⚰️ Kamu berhasil mencuri role ${emoji} ${stolenRole} dari makam!` }, 5000);
});

socket.on('cupid_paired', ({ partnerName }) => {
    queueAnnouncement({ type: 'info', text: `💘 Cupid menyatukan hatimu! Pasanganmu adalah <strong>${partnerName}</strong>.<br>Kalian sehidup semati!` }, 8000);
});

socket.on('revived', () => {
    queueAnnouncement({ type: 'info', text: '✨ Kamu dipanggil kembali oleh Medium! Kamu hidup kembali!' }, 5000);
    const myCard = document.getElementById(`card-${MY_ID}`);
    if (myCard) {
        // Strip ALL death-related classes so card looks fully alive again
        myCard.className = myCard.className
            .replace(/\bdead(-\S+)?\b/g, '')
            .replace(/\bdying\b/g, '')
            .replace(/\breason-\S+/g, '')
            .replace(/\banim-\S+/g, '')
            .trim();
        // Also remove any lingering SVG overlays added by DeathFX
        myCard.querySelectorAll('svg').forEach(s => s.remove());
    }

    if (window.DeathFX) window.DeathFX.playRevive(MY_ID);

    // Restore phase music
    if (currentPhase === 'day' || currentPhase === 'vote') {
        playSoundtrack('Day_Phase_Song.mp3');
    } else if (currentPhase === 'night') {
        const pList = gameState ? gameState.players : [];
        const me = pList.find(x => x.id === MY_ID);
        const isAnyoneJailed = pList.some(x => x.isJailed);
        const isJailerOrJailed = me && (myRole === 'Jailer' || me.isJailed);
        if (isAnyoneJailed && isJailerOrJailed) {
            playSoundtrack('jailer_song.mp3');
        } else if (myRole === 'Sect Leader' || window.isSectMember || (me && me.isSect)) {
            playSoundtrack('Sect_song.mp3');
        } else if (myRole === 'Badut') {
            playSoundtrack('Night_Fool.mp3');
        } else if (myRole === 'Arsonist') {
            playSoundtrack('Night_Arson.mp3');
        } else if (myRole === 'Corruptor') {
            playSoundtrack('Night_Cor.mp3');
        } else if (myRole === 'Shapeshifter') {
            playSoundtrack('Night_SS.mp3');
        } else if (myRole === 'Head Hunter') {
            playSoundtrack('Night_HH.mp3');
        } else if (myTeam === 'ww') {
            playSoundtrack('Night_Phase_Werewolfs.mp3');
        } else {
            playSoundtrack('Night_Phase_Village.mp3');
        }
    }
});

socket.on('player_revived', ({ playerId }) => {
    const rCard = document.getElementById(`card-${playerId}`);
    if (rCard) {
        rCard.className = rCard.className
            .replace(/\bdead(-\S+)?\b/g, '')
            .replace(/\bdying\b/g, '')
            .replace(/\breason-\S+/g, '')
            .replace(/\banim-\S+/g, '')
            .trim();
        rCard.querySelectorAll('svg').forEach(s => s.remove());
    }
    if (playerId !== MY_ID && window.DeathFX) {
        window.DeathFX.playRevive(playerId);
    }
});

socket.on('night_resolved', ({ deaths, announcements }) => {
    clearInterval(timerInterval);
    let delay = 0;
    announcements.forEach((ann, i) => {
        setTimeout(() => {
            queueAnnouncement(ann, 3400);
            if (ann.type === 'death' && ann.playerId) {
                triggerDeathAnimation(ann.playerId, ann.reason || 'default');
            }
            // Log to history
            if (ann.type === 'death') {
                const meta = DEATH_ANN_MAP[ann.reason] || DEATH_ANN_MAP.default;
                addToHistory({ type: 'death', icon: meta.icon, text: meta.title(ann.playerName || '???'), phase: currentPhase === 'night' ? `Malam ${gameState?.dayCount || ''}` : '' });
            } else if (ann.type === 'info' && ann.text) {
                addToHistory({ type: 'info', icon: '📢', text: ann.text.replace(/<[^>]+>/g, ''), phase: `Malam ${gameState?.dayCount || ''}` });
            }
        }, delay);
        delay += 3700;
    });
});

socket.on('vote_update', ({ votes, tally, totalAlive }) => {
    if (!gameState) return;
    if (tally) {
        voteMap = tally;
    } else {
        voteMap = {};
        for (const target of Object.values(votes)) {
            voteMap[target] = (voteMap[target] || 0) + 1;
        }
    }
    updateVoteTally(gameState.players);
    document.getElementById('phase-subtitle').textContent = `${Object.keys(votes).length} / ${totalAlive} telah voting`;
});

socket.on('vote_resolved', ({ announcements, votes }) => {
    clearInterval(timerInterval);
    document.getElementById('vote-tally').style.display = 'none';
    announcements.forEach(ann => {
        queueAnnouncement(ann, 3600);
        if (ann.playerId) {
            setTimeout(() => triggerDeathAnimation(ann.playerId, ann.reason || 'vote'), 200);
        }
        // Log to history
        if (ann.type === 'execution') {
            addToHistory({ type: 'death', icon: '⚖️', text: `${ann.playerName} digantung warga (${ann.role || '???'})`, phase: `Hari ${gameState?.dayCount || ''}` });
        } else if (ann.type === 'no_execution') {
            addToHistory({ type: 'info', icon: '🕊️', text: ann.reason || 'Tidak ada yang digantung', phase: `Hari ${gameState?.dayCount || ''}` });
        } else if (ann.type === 'death') {
            const meta = DEATH_ANN_MAP[ann.reason] || DEATH_ANN_MAP.default;
            addToHistory({ type: 'death', icon: meta.icon, text: meta.title(ann.playerName || '???'), phase: `Hari ${gameState?.dayCount || ''}` });
        }
    });
});

socket.on('pw_explosion', ({ killer, killerId, target, targetId, targetRole }) => {
    triggerScreenFlash('white');
    // Store publicly revealed role
    if (targetId) playerRevealedRoles[targetId] = targetRole || 'default';
    if (killerId) {
        playerRevealedRoles[killerId] = 'Party Werewolf';
        const card = document.getElementById(`card-${killerId}`);
        if (card) {
            const roleEl = card.querySelector('.card-role');
            if (roleEl) roleEl.innerHTML = renderRoleLabel('Party Werewolf');
        }
    }
    queueAnnouncement({ type: 'death', playerName: `${target}`, role: targetRole, playerId: targetId, reason: 'bomb' }, 5000);
    triggerDeathAnimation(targetId, 'bomb');
});

socket.on('player_died', ({ playerId, playerName, role, reason }) => {
    // Only store role if not already masked by an announcement
    if (!(playerId in playerRevealedRoles)) {
        playerRevealedRoles[playerId] = role || 'default';
    }
    triggerDeathAnimation(playerId, reason || 'default');
    // Log to history if not already logged via night_resolved/vote_resolved
    const meta = DEATH_ANN_MAP[reason] || DEATH_ANN_MAP.default;
    addToHistory({ type: 'death', icon: meta.icon, text: meta.title(playerName || '???'), phase: currentPhase || '' });
});

socket.on('curse_transform', () => {
    myRole = 'Werewolf';
    myTeam = 'ww';
    document.getElementById('my-role-emoji').innerHTML = ROLE_EMOJI['Werewolf'];
    document.getElementById('my-role-name').textContent = 'Werewolf';
    document.getElementById('my-role-team').innerHTML = `🐺 Tim Werewolf`;
    document.getElementById('my-role-card').style.borderColor = 'rgba(192,57,43,0.6)';
    document.getElementById('my-role-card').style.background  = 'rgba(192,57,43,0.1)';
    triggerScreenFlash('red');
    queueAnnouncement({ type: 'info', text: '🐺 Kamu digigit dan <strong>BERUBAH MENJADI WEREWOLF!</strong>' }, 5000);
});

socket.on('seer_result', ({ targetId, targetName, isWerewolf, role, emoji, isWolfSeer }) => {
    const msg = isWerewolf
        ? `🔴 <strong>${targetName}</strong> adalah ${emoji} ${role} — WEREWOLF!`
        : `🟢 <strong>${targetName}</strong> adalah ${emoji} ${role} — BUKAN Werewolf.`;
    queueAnnouncement({ type: 'info', text: msg }, 5000);
    showActionFeedback(isWerewolf ? `🔴 ${targetName} = WEREWOLF!` : `🟢 ${targetName} = BUKAN WW`);

    playerRevealedRoles[targetId] = role;
    renderAllPlayers();

    // Trigger Cinematic Seer Animation
    triggerSeerAnimation(targetId, role, emoji, isWolfSeer);
});

function triggerSeerAnimation(targetId, role, emoji, isWolfSeer = false) {
    if (!targetId) { renderAllPlayers(); return; }
    const targetCard = document.getElementById(`card-${targetId}`);
    if (!targetCard) { renderAllPlayers(); return; }

    try { targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e){}

    const isWW = isWolfSeer; // shorthand
    const accent = isWW ? '#e74c3c' : '#00cec9';
    const glow   = isWW ? '#ff6666' : '#55efc4';

    // Dim all other cards
    document.querySelectorAll('.player-card').forEach(c => {
        if (c.id !== `card-${targetId}`) c.classList.add('seer-dimmed');
    });

    // Play sound
    playSoundtrack('Ability_Seer.mp3');

    // ── Canvas: scan line + orbiting particles ──
    const cvs = document.createElement('canvas');
    cvs.style.cssText = 'position:fixed;top:0;left:0;z-index:9500;pointer-events:none;width:100vw;height:100vh;';
    cvs.width = window.innerWidth; cvs.height = window.innerHeight;
    document.body.appendChild(cvs);
    const ctx = cvs.getContext('2d');

    let scanY = null;
    let revealed = false;
    const orbitPts = Array.from({ length: 12 }, (_, i) => ({
        angle: (i / 12) * Math.PI * 2,
        rOffset: Math.random() * 10,
        speed: (0.04 + Math.random() * 0.03) * (Math.random() > 0.5 ? 1 : -1),
        size: 2 + Math.random() * 3.5
    }));

    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, cvs.width, cvs.height);

        const rect = targetCard.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const baseR = Math.max(rect.width, rect.height) * 0.55;
        if (scanY === null || scanY < rect.top) scanY = rect.top;

        // Orbiting particles
        orbitPts.forEach(p => {
            p.angle += p.speed * 0.06;
            const px = cx + Math.cos(p.angle) * (baseR + p.rOffset);
            const py = cy + Math.sin(p.angle) * (baseR + p.rOffset);
            ctx.save();
            ctx.globalAlpha = 0.7 + Math.sin(frame * 0.08 + p.angle) * 0.3;
            ctx.fillStyle = accent;
            ctx.shadowColor = glow; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });

        // Ring around card
        ctx.save();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.shadowColor = glow; ctx.shadowBlur = 18;
        ctx.globalAlpha = 0.5 + Math.sin(frame * 0.07) * 0.3;
        ctx.beginPath();
        ctx.rect(rect.left - 6, rect.top - 6, rect.width + 12, rect.height + 12);
        ctx.stroke();
        ctx.restore();

        // Scan line
        if (!revealed && scanY <= rect.bottom) {
            scanY += Math.max(6, rect.height / 25);
            const grad = ctx.createLinearGradient(rect.left, scanY - 10, rect.left, scanY + 10);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.5, accent + 'cc');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.save();
            ctx.fillStyle = grad;
            ctx.fillRect(rect.left, scanY - 10, rect.width, 22);
            ctx.restore();
        }
        if (!revealed && (scanY > rect.bottom || frame >= 30)) {
            revealed = true;
            setTimeout(() => {
                const overlay = document.createElement('div');
                overlay.className = isWW ? 'seer-vision-overlay ws-vision-overlay' : 'seer-vision-overlay';
                overlay.innerHTML = `
                    <div class="seer-vision-icon">${emoji || (isWW ? '🐺' : '🔮')}</div>
                    <div class="seer-vision-label">${role}</div>
                `;
                targetCard.appendChild(overlay);
                overlay.onclick = cleanup;
                overlayRef = overlay;
            }, 120);
        }

        frame++;
        if (frame < 240) requestAnimationFrame(draw);
        else cleanup();
    }

    let overlayRef = null;
    const cleanup = () => {
        if (overlayRef && overlayRef.parentNode) overlayRef.remove();
        if (cvs && cvs.parentNode) cvs.remove();
        document.querySelectorAll('.player-card.seer-dimmed').forEach(c => c.classList.remove('seer-dimmed'));
        renderAllPlayers();
    };
    setTimeout(cleanup, 4500);
    requestAnimationFrame(draw);
}

socket.on('action_confirmed', ({ text }) => showActionFeedback(text));

socket.on('jw_target_update', ({ targetId }) => {
    myJwTargetId = targetId;
    renderAllPlayers();
});

socket.on('polisi_investigate_result', ({ targetId, role }) => {
    playerRevealedRoles[targetId] = role;
    renderAllPlayers();
});

socket.on('pacifist_investigate_result', ({ targetId, role }) => {
    playerRevealedRoles[targetId] = role;
    renderAllPlayers();
});

socket.on('glitch_notify', ({ message }) => {
    queueAnnouncement({ type: 'info', text: message }, 5000);
    triggerScreenFlash('red');
    addToHistory({ type: 'glitch', icon: '🖥️', text: 'Seseorang di-GLITCH oleh Corruptor!', phase: `Malam ${gameState?.dayCount || ''}` });
});

socket.on('glitch_warning', ({ message }) => {
    showGlitchWarning(message);
});

socket.on('bread_notify', ({ message }) => {
    queueAnnouncement({ type: 'info', text: message }, 4000);
    const myCard = document.getElementById(`card-${MY_ID}`);
    if (myCard) myCard.classList.add('bread-recipient');
});

socket.on('wolffluencer_puppet_notify', ({ message }) => {
    queueAnnouncement({ type: 'info', text: message }, 6000);
    triggerScreenFlash('purple');
    addToHistory({ type: 'puppet', icon: '🧵', text: 'Suaramu dikendalikan oleh Wolffluencer hari ini!', phase: `Hari ${gameState?.dayCount || ''}` });
    applyPuppetControlEffect();
});

socket.on('ww_vote_update', ({ voter, target, votes }) => {
    if (voter && target) addChatMsg('🐺 Tim WW', `${voter} menargetkan: ${target}`);
    if (votes) {
        gameState.players.filter(p => p.alive).forEach(p => {
            const countEl = document.getElementById(`vcount-${p.id}`);
            const count = votes[p.id] || 0;
            if (countEl) {
                countEl.textContent = count;
                countEl.className = `card-vote-count ${count > 0 ? 'visible' : ''}`;
            }
        });
    }
});

socket.on('day_chat_msg', ({ senderId, senderName, avatar, text }) => {
    document.getElementById('chat-area').style.display = 'flex';
    const log = document.getElementById('chat-log');
    const m = document.createElement('div');
    m.className = 'chat-msg';
    m.innerHTML = `<img src="${avatar}" style="width:15px;height:15px;border-radius:50%;vertical-align:middle;margin-right:3px;"><span class="chat-sender" style="color:${senderId === MY_ID ? '#aaa' : '#3498db'}">${senderName}:</span> ${text}`;
    log.appendChild(m); log.scrollTop = log.scrollHeight;
    notifyUnreadChat();
});

socket.on('ww_chat_msg', ({ sender, avatar, text }) => {
    document.getElementById('chat-area').style.display = 'flex';
    addChatMsg(sender, text, avatar);
});

socket.on('dead_chat_msg', ({ sender, avatar, text }) => {
    document.getElementById('chat-area').style.display = 'flex';
    const log = document.getElementById('chat-log');
    const m = document.createElement('div');
    m.className = 'chat-msg';
    m.innerHTML = `<img src="${avatar}" style="width:15px;height:15px;border-radius:50%;vertical-align:middle;margin-right:3px;opacity:0.6;"><span class="chat-sender" style="color:#888;">👻 ${sender}:</span> <span style="color:#aaa; font-style:italic;">${text}</span>`;
    log.appendChild(m); log.scrollTop = log.scrollHeight;
    notifyUnreadChat();
});

socket.on('sect_chat_msg', ({ sender, avatar, text }) => {
    document.getElementById('chat-area').style.display = 'flex';
    const log = document.getElementById('chat-log');
    const m = document.createElement('div');
    m.className = 'chat-msg';
    m.innerHTML = `<img src="${avatar||''}" style="width:15px;height:15px;border-radius:50%;vertical-align:middle;margin-right:3px;border:1px solid #8e44ad;"><span class="chat-sender" style="color:#d2b4de;">🔮 [Sekte] ${sender}:</span> <span style="color:#e8daef;">${text}</span>`;
    log.appendChild(m); log.scrollTop = log.scrollHeight;
    notifyUnreadChat();
});

socket.on('jailer_chat_msg', ({ sender, text }) => {
    document.getElementById('chat-area').style.display = 'flex';
    const log = document.getElementById('chat-log');
    const m = document.createElement('div');
    m.className = 'chat-msg';
    m.innerHTML = `<span class="chat-sender" style="color:#f1c40f;">${sender}:</span> <span style="color:#fff; font-weight:bold;">${text}</span>`;
    log.appendChild(m); log.scrollTop = log.scrollHeight;
    notifyUnreadChat();
});

socket.on('game_over', ({ winner, reason, players, mvpId: serverMvpId }) => {
    isGameOver = true;
    clearInterval(timerInterval);
    
    if (winner === 'Village') {
        playSoundtrack('Village_Win.mp3', false);
    } else if (winner === 'Werewolf') {
        playSoundtrack('Werewolfs_Win.mp3', false);
    } else {
        stopSoundtrack();
    }
    const winEmojis = {
        Village: '🧑‍🌾', Werewolf: '🐺',
        Corruptor: ROLE_EMOJI['Corruptor'], Badut: ROLE_EMOJI['Badut'],
        'Head Hunter': ROLE_EMOJI['Head Hunter'], 'Cupid Couple': '💞',
        Arsonist: ROLE_EMOJI['Arsonist'],
    };
    document.getElementById('win-emoji').innerHTML = winEmojis[winner] || '🏆';
    document.getElementById('win-title').textContent = `${winner} Menang!`;
    document.getElementById('win-reason').textContent = reason;
    setPhaseTheme(winner === 'Werewolf' ? 'night' : 'day');

    const fp = document.getElementById('final-players');
    fp.innerHTML = '';

    // ── Determine MVP ──
    // MVP = player on winning team with most kills/impact. Since we don't have kill count
    // on client, we use this heuristic: if there's only 1 winning player, they are MVP.
    // Otherwise mark the first player in the winner's team shown in the list.
    // The server now sends mvpId if available, else we pick first winner.
    const winnerTeamMap = {
        Village: 'village', Werewolf: 'ww', Corruptor: 'solo',
        Badut: 'solo', 'Head Hunter': 'solo', Arsonist: 'solo', 'Cupid Couple': 'village'
    };
    const winningTeam = winnerTeamMap[winner];
    // Find MVP: prioritize serverMvpId from server, else first alive player on winning team
    let mvpId = serverMvpId;
    if (!mvpId) {
        if (winner === 'Cupid Couple') {
            // Cupid couple: pick from alive players (just first alive)
            const alive = players.filter(p => p.alive);
            if (alive.length) mvpId = alive[0].id;
        } else if (winningTeam) {
            const winnerPlayers = players.filter(p => {
                const t = WW_ROLES_CLIENT.includes(p.role) ? 'ww' : (SOLO_ROLES_CLIENT.includes(p.role) ? 'solo' : 'village');
                return t === winningTeam && p.alive;
            });
            if (winnerPlayers.length) mvpId = winnerPlayers[0].id;
        }
    }

    players.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = 'final-player-item';
        el.style.animationDelay = `${i * 0.08}s`;
        const isMVP = (p.id === mvpId);
        el.innerHTML = `
            ${isMVP ? '<div class="mvp-badge">⭐ MVP</div>' : ''}
            <img src="${p.avatar}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random'" alt="${p.name}">
            <div class="fp-name">${p.name}</div>
            <div class="fp-role">${ROLE_EMOJI[p.role] || '❓'} ${p.role}</div>
        `;
        if (isMVP) el.classList.add('is-mvp');
        fp.appendChild(el);
    });

    setTimeout(() => {
        showScreen('win');
        startWinParticles(winner);
    }, 3000);
});

socket.on('kicked', () => {
    socket.disconnect();
    document.getElementById('error-title').textContent = 'Anda di-kick!';
    document.getElementById('error-msg').textContent   = 'Host mengeluarkan Anda dari lobby.';
    showScreen('error');
    localStorage.removeItem(`ww_${SESSION_ID}`);
});

socket.on('error', ({ message }) => {
    document.getElementById('error-msg').textContent = message;
    showScreen('error');
});

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
generateStars();

// CSS for urgent timer
const urgentStyle = document.createElement('style');
urgentStyle.textContent = `@keyframes timerUrgent { 0%{transform:scale(1)} 100%{transform:scale(1.12)} }`;
document.head.appendChild(urgentStyle);

function submitLogin() {
    const input = document.getElementById('login-name-input');
    const name  = input.value.trim();
    if (!name) return alert('Nama tidak boleh kosong!');
    MY_NAME   = name;
    MY_ID     = 'guest_' + Math.random().toString(36).slice(2, 8);
    MY_AVATAR = `https://ui-avatars.com/api/?name=${encodeURIComponent(MY_NAME)}&background=random`;
    localStorage.setItem(`ww_${SESSION_ID}`, JSON.stringify({ id: MY_ID, name: MY_NAME, avatar: MY_AVATAR }));
    showScreen('loading');
    socket.connect();
}

if (!MY_ID || !MY_NAME) {
    showScreen('login');
} else {
    showScreen('loading');
    socket.connect();
}

setTimeout(() => {
    if (!gameState) {
        if (!SESSION_ID || SESSION_ID === 'game') {
            document.getElementById('error-title').textContent = 'Session Tidak Valid';
            document.getElementById('error-msg').textContent   = 'Link game tidak valid. Minta host untuk memulai game baru dengan m.ww web di Discord.';
            showScreen('error');
        }
    }
}, 5000);

// ═══════════════════════════════════════════════════
//  DEVELOPER CREATIVE MODE UTILITIES
// ═══════════════════════════════════════════════════
let _dummyCount = 0;
window.spawnDummy = function() {
    _dummyCount++;
    const dummyId = `dummy_${_dummyCount}`;
    const p = {
        id: dummyId,
        name: `Dummy Bot ${_dummyCount}`,
        avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712139.png',
        alive: true,
        role: 'Warga',
        isGlitched: false,
        isCouple: false,
        princessRevealed: false
    };
    
    // Inject directly to arena
    const container = document.getElementById('player-cards');
    if (container) {
        const card = createPlayerCard(p);
        card.classList.add('dummy-card');
        container.appendChild(card);
    }
};

window.clearDummies = function() {
    document.querySelectorAll('.dummy-card').forEach(c => c.remove());
    _dummyCount = 0;
};

window.testAnim = function(reason) {
    // Apply animation to all dummy cards, or to self if no dummies exist
    const dummies = document.querySelectorAll('.dummy-card');
    if (dummies.length > 0) {
        dummies.forEach(c => {
            const cardId = c.id.replace('card-', '');
            triggerDeathAnimation(cardId, reason);
            setTimeout(() => {
                c.classList.remove('dead');
                c.className = c.className.replace(/dying|reason-[a-z_]+|anim-[a-z_]+/g, '').trim();
            }, 2000); // Reset after testing
        });
    } else {
        triggerDeathAnimation(MY_ID, reason);
    }
};

window.testRevive = function() {
    const dummies = document.querySelectorAll('.dummy-card');
    if (dummies.length > 0) {
        dummies.forEach(c => {
            const cardId = c.id.replace('card-', '');
            // Simulate dead state first
            c.classList.add('dead');
            setTimeout(() => {
                if (window.DeathFX) window.DeathFX.playRevive(cardId);
            }, 500);
        });
    } else {
        if (window.DeathFX) window.DeathFX.playRevive(MY_ID);
    }
};

window.testJailed = function() {
    const targets = document.querySelectorAll('.dummy-card');
    const cards = targets.length > 0 ? targets : [document.getElementById(`card-${MY_ID}`)];
    cards.forEach(c => {
        if (!c) return;
        if (c.classList.contains('jailed')) {
            c.classList.remove('jailed');
            const overlay = c.querySelector('.jail-bars-overlay');
            if (overlay) overlay.remove();
        } else {
            c.classList.add('jailed');
            if (!c.querySelector('.jail-bars-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'jail-bars-overlay';
                c.appendChild(overlay);
            }
        }
    });
};

window.testRedMoon = function() {
    setPhaseTheme('night');
    document.body.classList.toggle('berserk-active');
};

window.testNwSleep = function() {
    const targets = document.querySelectorAll('.dummy-card');
    const cards = targets.length > 0 ? targets : [document.getElementById(`card-${MY_ID}`)];
    cards.forEach(c => {
        if (!c) return;
        if (c.classList.contains('nw-sleeping')) {
            removeNwSleepOverlay(c);
        } else {
            applyNwSleepOverlay(c);
        }
    });
};

window.testPuppet = function() {
    const targets = document.querySelectorAll('.dummy-card');
    const cards = targets.length > 0 ? targets : [document.getElementById(`card-${MY_ID}`)];
    let isApplied = false;
    cards.forEach(c => {
        if (!c) return;
        if (c.classList.contains('puppet-controlled')) {
            removePuppetOverlay(c);
        } else {
            applyPuppetOverlay(c);
            isApplied = true;
        }
    });
    let banner = document.getElementById('puppet-control-banner');
    if (banner) {
        banner.remove();
    } else if (isApplied) {
        banner = document.createElement('div');
        banner.id = 'puppet-control-banner';
        banner.className = 'puppet-control-banner';
        banner.innerHTML = `🧵 <strong>KAMU DIKONTROL WOLFFLUENCER (PUPPET)!</strong><br>Suara votingmu otomatis mengikuti Wolffluencer dan kamu tidak bisa melakukan vote mandiri hari ini.`;
        document.body.appendChild(banner);
    }
};

window.testGacha = function() {
    showRoleReveal('Princess', ROLE_EMOJI['Princess'] || '👑', 'village', null, null);
};

window.testMVP = function() {
    // Simulate a game_over event with dummy players to preview the MVP screen
    const dummies = document.querySelectorAll('.dummy-card');
    const fakePlayers = [];
    dummies.forEach(c => {
        const id = c.id.replace('card-', '');
        fakePlayers.push({ id, name: c.querySelector('.card-name')?.textContent || 'Dummy', avatar: '', role: 'Villager', alive: true });
    });
    if (MY_ID && MY_NAME) {
        fakePlayers.unshift({ id: MY_ID, name: MY_NAME, avatar: MY_AVATAR || '', role: 'Dokter', alive: true });
    }
    // Manually fire game_over rendering
    const fp = document.getElementById('final-players');
    if (!fp) return;
    fp.innerHTML = '';
    const mvpId = fakePlayers[0]?.id;
    fakePlayers.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = 'final-player-item';
        el.style.animationDelay = `${i * 0.08}s`;
        const isMVP = (p.id === mvpId);
        el.innerHTML = `
            ${isMVP ? '<div class="mvp-badge">⭐ MVP</div>' : ''}
            <img src="${p.avatar}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random'" alt="${p.name}">
            <div class="fp-name">${p.name}</div>
            <div class="fp-role">${ROLE_EMOJI[p.role] || '❓'} ${p.role}</div>
        `;
        if (isMVP) el.classList.add('is-mvp');
        fp.appendChild(el);
    });
    document.getElementById('win-emoji').innerHTML = '🧑‍🌾';
    document.getElementById('win-title').textContent = 'Village Menang!';
    document.getElementById('win-reason').textContent = 'Test MVP Screen dari Dev Mode';
    showScreen('win');
    startWinParticles('Village');
};

window.testSeerAnim = function() {
    const liveCards = Array.from(document.querySelectorAll('.player-card:not(.dead)'));
    const target = liveCards.find(c => c.id !== `card-${MY_ID}`) || liveCards[0] || document.querySelector('.player-card');
    if (target) {
        const targetId = target.id.replace('card-', '');
        triggerSeerAnimation(targetId, 'Werewolf', ROLE_EMOJI['Werewolf'] || '🐺');
    } else {
        alert('Tidak ada kartu pemain di arena untuk dites!');
    }
};

window.testDetAnim = function() {
    const cards = Array.from(document.querySelectorAll('.player-card'));
    if (cards.length >= 2) {
        const id1 = cards[0].id.replace('card-', '');
        const id2 = cards[1].id.replace('card-', '');
        const name1 = cards[0].querySelector('.card-name')?.textContent || 'Suspek 1';
        const name2 = cards[1].querySelector('.card-name')?.textContent || 'Suspek 2';
        socket.listeners('det_result').forEach(fn => fn({ target: 'Makam Korban', real: name1, realId: id1, decoy: name2, decoyId: id2 }));
    } else {
        alert('Butuh minimal 2 kartu pemain di arena untuk tes animasi detektif!');
    }
};

window.testWolfSeerAnim = function() {
    const liveCards = Array.from(document.querySelectorAll('.player-card:not(.dead)'));
    const target = liveCards.find(c => c.id !== `card-${MY_ID}`) || liveCards[0] || document.querySelector('.player-card');
    if (target) {
        const targetId = target.id.replace('card-', '');
        triggerSeerAnimation(targetId, 'Dokter', ROLE_EMOJI['Dokter'] || '💉', true);
    } else {
        alert('Tidak ada kartu pemain di arena untuk dites!');
    }
};
