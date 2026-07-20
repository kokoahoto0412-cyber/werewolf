// ═══════════════════════════════════════════════════
//  DEATH EFFECTS - CANVAS PARTICLE ENGINE
//  Realistic death animations using Canvas + SVG overlay
// ═══════════════════════════════════════════════════

window.DeathFX = (() => {
    function play(cardId, reason) {
        const card = document.getElementById(`card-${cardId}`);
        if (!card) return;
        const rect = card.getBoundingClientRect();
        switch (reason) {
            case 'ww':              playWerewolf(card, rect); break;
            case 'slash':           playSlash(card, rect); break;
            case 'arson':           playFire(card, rect); break;
            case 'lightning':       playLightning(card, rect); break;
            case 'god':             playLightning(card, rect); break; // divine kills
            case 'holy_water':      playSplash(card, rect); break;
            case 'bomb':
            case 'explosion':       playBomb(card, rect); break; // PW bomb
            case 'shoot':           playShoot(card, rect); break;
            case 'glitch':          playGlitch(card, rect); break;
            case 'heart':           playHeartbreak(card, rect); break;
            case 'hakim':           playHakim(card, rect, false); break; // gold hammer – Hakim's target
            case 'hakim_suicide':   playHakim(card, rect, true); break;  // red hammer – Hakim's own death
            case 'meteor':          playMeteor(card, rect, false); break;
            case 'meteor_backfire': playMeteor(card, rect, true); break;
            case 'vote':                  playGuillotine(card, rect); break;
            case 'injury':                playBleeding(card, rect); break;
            case 'sect_sacrifice_member': playSectSacrificeMember(card, rect); break;
            case 'sect_ritual':           playSectRitualCircle(card, rect); break;
            case 'sect_cascade':          playSectCascade(card, rect); break;
        }
    }

    function makeCanvas(duration) {
        const c = document.createElement('canvas');
        c.style.cssText = 'position:fixed;top:0;left:0;z-index:9000;pointer-events:none;width:100vw;height:100vh;';
        c.width = window.innerWidth; c.height = window.innerHeight;
        document.body.appendChild(c);
        if (duration) setTimeout(() => c.remove(), duration);
        return c;
    }

    function makeCardSVG(card, duration) {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 100 140');
        svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:20;overflow:visible;';
        card.appendChild(svg);
        if (duration) setTimeout(() => svg.remove(), duration);
        return svg;
    }

    // 🐺 WEREWOLF – 3 SVG claw slashes + blood drips
    function playWerewolf(card, rect) {
        const svg = makeCardSVG(card, 1600);
        const ns = 'http://www.w3.org/2000/svg';
        const claws = [
            { d: 'M20,10 Q30,50 22,110', delay: 0 },
            { d: 'M38,5 Q48,55 40,115', delay: 60 },
            { d: 'M56,8 Q66,50 58,112', delay: 120 },
        ];
        claws.forEach(({ d, delay }) => {
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke', '#cc0000');
            path.setAttribute('stroke-width', '4');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('fill', 'none');
            path.setAttribute('opacity', '0');
            svg.appendChild(path);
            const len = 120;
            path.style.strokeDasharray = len;
            path.style.strokeDashoffset = len;
            setTimeout(() => {
                path.setAttribute('opacity', '1');
                path.style.transition = 'stroke-dashoffset 0.18s ease-out';
                path.style.strokeDashoffset = '0';
                setTimeout(() => { path.style.transition = 'opacity 0.5s'; path.style.opacity = '0'; }, 500);
            }, delay);
        });
        const canvas = makeCanvas(900);
        const ctx = canvas.getContext('2d');
        const cx = rect.left + rect.width * 0.45;
        const cy = rect.top + rect.height * 0.4;
        const drops = Array.from({ length: 14 }, () => ({
            x: cx + (Math.random() - 0.5) * rect.width * 0.8,
            y: cy + Math.random() * rect.height * 0.3,
            vy: 1 + Math.random() * 3, r: 2 + Math.random() * 4, alpha: 1
        }));
        let frame = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drops.forEach(d => {
                d.y += d.vy; d.alpha -= 0.018; if (d.alpha <= 0) return;
                ctx.save(); ctx.globalAlpha = d.alpha; ctx.fillStyle = '#cc0000';
                ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * 0.6, d.r, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            });
            if (frame++ < 55) requestAnimationFrame(draw);
        }
        setTimeout(draw, 80);
    }

    // 🔪 SLASH – diagonal blood line + flying knife
    function playSlash(card, rect) {
        const svg = makeCardSVG(card, 1200);
        const ns = 'http://www.w3.org/2000/svg';
        const slash = document.createElementNS(ns, 'path');
        slash.setAttribute('d', 'M85,5 L15,135');
        slash.setAttribute('stroke', '#ff0000');
        slash.setAttribute('stroke-width', '3.5');
        slash.setAttribute('stroke-linecap', 'round');
        slash.setAttribute('fill', 'none');
        const len = 155;
        slash.style.strokeDasharray = len; slash.style.strokeDashoffset = len;
        svg.appendChild(slash);
        requestAnimationFrame(() => {
            slash.style.transition = 'stroke-dashoffset 0.12s ease-out';
            slash.style.strokeDashoffset = '0';
            setTimeout(() => { slash.style.transition = 'opacity 0.4s ease 0.4s'; slash.style.opacity = '0'; }, 120);
        });
        const knife = document.createElement('div');
        knife.textContent = '🔪';
        knife.style.cssText = `position:fixed;font-size:2.2rem;pointer-events:none;z-index:9100;top:${rect.top - 30}px;left:${rect.right + 20}px;transform:rotate(-135deg);transition:none;`;
        document.body.appendChild(knife);
        requestAnimationFrame(() => {
            knife.style.transition = 'top 0.15s ease-in, left 0.15s ease-in, opacity 0.2s ease 0.2s';
            knife.style.top = `${rect.bottom + 20}px`; knife.style.left = `${rect.left - 20}px`; knife.style.opacity = '0';
        });
        setTimeout(() => knife.remove(), 600);
        const canvas = makeCanvas(700);
        const ctx = canvas.getContext('2d');
        const cx = rect.left + rect.width * 0.5, cy = rect.top + rect.height * 0.45;
        const drops = Array.from({ length: 10 }, () => ({
            x: cx + (Math.random() - 0.5) * rect.width * 0.6, y: cy + (Math.random() - 0.5) * rect.height * 0.4,
            vy: 1.5 + Math.random() * 2.5, r: 2 + Math.random() * 3, alpha: 0.9
        }));
        let frame = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drops.forEach(d => {
                d.y += d.vy; d.alpha -= 0.02; if (d.alpha <= 0) return;
                ctx.save(); ctx.globalAlpha = d.alpha; ctx.fillStyle = '#cc0000';
                ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * 0.55, d.r, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            });
            if (frame++ < 45) requestAnimationFrame(draw);
        }
        setTimeout(draw, 100);
    }

    // 🔥 ARSON – real fire particle fountain
    function playFire(card, rect) {
        const canvas = makeCanvas(2200);
        const ctx = canvas.getContext('2d');
        const baseX = rect.left + rect.width / 2;
        const baseY = rect.bottom;
        const cardW = rect.width;
        const particles = [];
        const colors = ['#ff2200','#ff6600','#ff9900','#ffcc00','#fff700'];
        let elapsed = 0; const maxTime = 2000;
        let t = 0;
        function spawn() {
            for (let i = 0; i < 4; i++) {
                particles.push({
                    x: baseX + (Math.random() - 0.5) * cardW * 0.9, y: baseY,
                    vx: (Math.random() - 0.5) * 1.5, vy: -(2.5 + Math.random() * 4),
                    r: 4 + Math.random() * 8, life: 1.0, decay: 0.015 + Math.random() * 0.012,
                    color: colors[Math.floor(Math.random() * colors.length)], wave: Math.random() * Math.PI * 2
                });
            }
        }
        function draw() {
            ctx.clearRect(rect.left - 20, rect.top - 100, rect.width + 40, rect.height + 120);
            spawn();
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx + Math.sin(t * 0.1 + p.wave) * 0.5;
                p.y += p.vy; p.vy *= 0.98; p.r *= 0.985; p.life -= p.decay;
                if (p.life <= 0 || p.r < 0.5) { particles.splice(i, 1); continue; }
                ctx.save(); ctx.globalAlpha = p.life * 0.85;
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                grad.addColorStop(0, '#fff7a0'); grad.addColorStop(0.3, p.color); grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            }
            t++; elapsed += 16;
            if (elapsed < maxTime) requestAnimationFrame(draw);
        }
        draw();
    }

    // ⚡ LIGHTNING – bolt from above + screen flash
    function playLightning(card, rect) {
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;inset:0;z-index:8999;background:white;pointer-events:none;opacity:0;transition:opacity 0.05s;';
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.opacity = '1'; }, 10);
        setTimeout(() => { flash.style.opacity = '0'; flash.style.transition = 'opacity 0.15s'; }, 80);
        setTimeout(() => { flash.style.opacity = '0.5'; flash.style.transition = 'opacity 0.03s'; }, 160);
        setTimeout(() => { flash.style.opacity = '0'; flash.style.transition = 'opacity 0.3s'; }, 210);
        setTimeout(() => flash.remove(), 700);
        const canvas = makeCanvas(1000);
        const ctx = canvas.getContext('2d');
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.bottom;
        function drawBolt(startY, endY, x, spread, alpha) {
            ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = '#88bbff'; ctx.shadowBlur = 18; ctx.lineWidth = 3;
            ctx.beginPath(); let y = startY, cx2 = x; ctx.moveTo(cx2, y);
            while (y < endY) {
                y += 8 + Math.random() * 10;
                cx2 += (Math.random() - 0.5) * spread;
                cx2 = Math.max(rect.left, Math.min(rect.right, cx2));
                ctx.lineTo(cx2, Math.min(y, endY));
            }
            ctx.stroke();
            ctx.lineWidth = 8; ctx.globalAlpha = alpha * 0.25; ctx.strokeStyle = '#aad4ff'; ctx.stroke();
            ctx.restore();
        }
        let frame = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (frame < 4) { drawBolt(-20, targetY, targetX, 25, 0.95); if (frame % 2 === 0) drawBolt(-20, targetY, targetX + 8, 18, 0.5); }
            else if (frame < 8) { drawBolt(-20, targetY, targetX, 30, 0.6); }
            if (frame < 10) {
                const g = ctx.createRadialGradient(targetX, targetY, 0, targetX, targetY, 40 + frame * 5);
                g.addColorStop(0, `rgba(180,220,255,${0.7 - frame * 0.07})`); g.addColorStop(1, 'transparent');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(targetX, targetY, 40 + frame * 5, 0, Math.PI * 2); ctx.fill();
            }
            frame++;
            if (frame < 18) requestAnimationFrame(draw);
        }
        setTimeout(draw, 60);
    }

    // 💦 HOLY WATER – ring ripples + droplets
    function playSplash(card, rect) {
        const canvas = makeCanvas(900);
        const ctx = canvas.getContext('2d');
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        const drops = Array.from({ length: 20 }, (_, i) => {
            const angle = (i / 20) * Math.PI * 2, speed = 2.5 + Math.random() * 3;
            return { x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
                vy_gravity: 0, r: 2 + Math.random() * 4, alpha: 1,
                color: `hsl(${195 + Math.random() * 20},90%,${55 + Math.random() * 20}%)` };
        });
        const rings = [{ r: 0, maxR: rect.width * 0.7, alpha: 1, speed: 4 }, { r: -30, maxR: rect.width * 0.5, alpha: 0.7, speed: 5.5 }];
        let frame = 0;
        function draw() {
            ctx.clearRect(cx - 200, cy - 200, 400, 400);
            rings.forEach(ring => {
                ring.r += ring.speed; ring.alpha = Math.max(0, 1 - ring.r / ring.maxR);
                if (ring.r <= 0 || ring.alpha <= 0) return;
                ctx.save(); ctx.globalAlpha = ring.alpha * 0.7; ctx.strokeStyle = '#00cfff';
                ctx.shadowColor = '#00cfff'; ctx.shadowBlur = 8; ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.arc(cx, cy, ring.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            });
            drops.forEach(d => {
                d.vy_gravity += 0.2; d.x += d.vx; d.y += d.vy + d.vy_gravity;
                d.vx *= 0.96; d.alpha -= 0.022; if (d.alpha <= 0) return;
                ctx.save(); ctx.globalAlpha = d.alpha; ctx.fillStyle = d.color;
                ctx.shadowColor = '#00cfff'; ctx.shadowBlur = 6;
                ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            });
            frame++;
            if (frame < 55) requestAnimationFrame(draw);
        }
        draw();
    }

    // 💣 BOMB – shockwave ring + explosion particles
    function playBomb(card, rect) {
        const canvas = makeCanvas(900);
        const ctx = canvas.getContext('2d');
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        const cols = ['#ffeb3b','#ff9800','#f44336','#fff','#ff5722'];
        const particles = Array.from({ length: 30 }, () => {
            const angle = Math.random() * Math.PI * 2, speed = 3 + Math.random() * 7;
            return { x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                r: 3 + Math.random() * 6, alpha: 1, color: cols[Math.floor(Math.random() * cols.length)] };
        });
        let shockR = 0, shockAlpha = 1, frame = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            shockR += 12; shockAlpha -= 0.05;
            if (shockAlpha > 0) {
                ctx.save(); ctx.globalAlpha = shockAlpha; ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 4; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.arc(cx, cy, shockR, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            }
            if (frame < 4) {
                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 - frame * 12);
                g.addColorStop(0, `rgba(255,255,220,${0.9 - frame * 0.2})`); g.addColorStop(1, 'transparent');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 60 - frame * 10, 0, Math.PI * 2); ctx.fill();
            }
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.r *= 0.96; p.alpha -= 0.025; if (p.alpha <= 0) return;
                ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 6;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            });
            frame++;
            if (frame < 50) requestAnimationFrame(draw);
        }
        draw();
    }

    // 💥 SHOOT – bullet hole + sparks
    function playShoot(card, rect) {
        const canvas = makeCanvas(700);
        const ctx = canvas.getContext('2d');
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height * 0.35;
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;inset:0;z-index:8999;background:rgba(255,240,200,0.7);pointer-events:none;transition:opacity 0.2s;';
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.opacity = '0'; }, 60);
        setTimeout(() => flash.remove(), 350);
        const sparks = Array.from({ length: 12 }, () => {
            const angle = Math.random() * Math.PI * 2;
            return { x: cx, y: cy, vx: Math.cos(angle) * (1 + Math.random() * 3), vy: Math.sin(angle) * (1 + Math.random() * 3), alpha: 1, r: 1.5 + Math.random() * 2 };
        });
        let frame = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const holeR = Math.min(frame * 1.5, 10);
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, holeR, 0, Math.PI * 2); ctx.fill();
            if (frame > 3) {
                ctx.strokeStyle = '#444'; ctx.lineWidth = 0.8;
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2;
                    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * holeR, cy + Math.sin(a) * holeR);
                    ctx.lineTo(cx + Math.cos(a) * (holeR + 8 + i * 2), cy + Math.sin(a) * (holeR + 8 + i * 2)); ctx.stroke();
                }
            }
            sparks.forEach(s => {
                s.x += s.vx; s.y += s.vy; s.vy += 0.1; s.alpha -= 0.035; if (s.alpha <= 0) return;
                ctx.save(); ctx.globalAlpha = s.alpha; ctx.fillStyle = '#ffd700';
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            });
            frame++;
            if (frame < 40) requestAnimationFrame(draw);
        }
        draw();
    }

    // 👾 GLITCH – scanline corruption on card canvas
    function playGlitch(card, rect) {
        const canvas = makeCanvas(800);
        const ctx = canvas.getContext('2d');
        const lines = Array.from({ length: 18 }, () => ({
            y: rect.top + Math.random() * rect.height,
            w: 10 + Math.random() * rect.width,
            x: rect.left + Math.random() * rect.width * 0.3,
            h: 2 + Math.random() * 6,
            color: `hsl(${Math.random() > 0.5 ? 170 : 320},100%,60%)`,
            alpha: 0.5 + Math.random() * 0.5, life: 0.8 + Math.random() * 0.2
        }));
        let frame = 0;
        function draw() {
            ctx.clearRect(rect.left - 5, rect.top - 5, rect.width + 10, rect.height + 10);
            const jitter = frame < 20 ? Math.sin(frame * 1.3) * 8 : 0;
            lines.forEach(l => {
                l.life -= 0.03; l.x += (Math.random() - 0.5) * 8; l.y += (Math.random() - 0.5) * 3; if (l.life <= 0) return;
                ctx.save(); ctx.globalAlpha = l.life * l.alpha; ctx.fillStyle = l.color;
                ctx.fillRect(l.x + jitter, l.y, l.w, l.h); ctx.restore();
            });
            if (frame % 3 === 0) { ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#00ffcc'; ctx.fillRect(rect.left, rect.top, rect.width, rect.height); ctx.restore(); }
            frame++;
            if (frame < 48) requestAnimationFrame(draw);
        }
        draw();
    }

    // 💔 HEARTBREAK – heart shatters into pieces
    function playHeartbreak(card, rect) {
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height * 0.38;
        const heart = document.createElement('div');
        heart.textContent = '💔';
        heart.style.cssText = `position:fixed;top:${cy - 20}px;left:${cx - 18}px;font-size:2.2rem;pointer-events:none;z-index:9101;opacity:1;`;
        document.body.appendChild(heart);
        setTimeout(() => { heart.style.transition = 'transform 0.15s ease'; heart.style.transform = 'scale(1.5)'; }, 100);
        setTimeout(() => {
            heart.style.opacity = '0'; heart.remove();
            [-1, 1].forEach(dir => {
                const half = document.createElement('div');
                half.textContent = '🖤';
                half.style.cssText = `position:fixed;top:${cy - 16}px;left:${cx - 14}px;font-size:1.8rem;pointer-events:none;z-index:9100;transition:none;`;
                document.body.appendChild(half);
                requestAnimationFrame(() => {
                    half.style.transition = 'top 0.6s ease-in,left 0.5s ease-out,opacity 0.4s ease 0.4s,transform 0.6s ease';
                    half.style.top = `${cy + 40}px`; half.style.left = `${cx - 14 + dir * 25}px`;
                    half.style.opacity = '0'; half.style.transform = `rotate(${dir * 25}deg)`;
                });
                setTimeout(() => half.remove(), 900);
            });
        }, 300);
        const canvas = makeCanvas(900);
        const ctx = canvas.getContext('2d');
        const pieces = Array.from({ length: 10 }, () => ({
            x: cx + (Math.random() - 0.5) * 40, y: cy + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2, alpha: 0.9, r: 3 + Math.random() * 4
        }));
        let frame = 0;
        function draw() {
            ctx.clearRect(cx - 100, cy - 60, 200, 200);
            pieces.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.alpha -= 0.02; if (p.alpha <= 0) return;
                ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = '#cc0044';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            });
            frame++;
            if (frame < 50) requestAnimationFrame(draw);
        }
        draw();
    }

    // ⚖️ HAKIM JUDGMENT – palu SVG ayun + retakan avatar
    function playHakim(card, rect, isSuicide) {
        const cx        = rect.left + rect.width  / 2;
        const cy        = rect.top  + rect.height * 0.28;   // titik impak
        const ns        = 'http://www.w3.org/2000/svg';
        const glowColor = isSuicide ? '#ff5500' : '#ffd700';

        /* ── 1. PALU HAKIM SVG (kepala di bawah, gagang di atas) ── */
        const headFill   = isSuicide ? '#7B1010' : '#4A2808';
        const bandFill   = isSuicide ? '#CC3300' : '#B8860B';
        const handleFill = isSuicide ? '#6B1010' : '#7A4020';

        const gsvg = document.createElementNS(ns, 'svg');
        gsvg.setAttribute('viewBox', '0 0 50 82');
        gsvg.setAttribute('width',  '66');
        gsvg.setAttribute('height', '108');

        const mkR = (attrs) => {
            const e = document.createElementNS(ns, 'rect');
            Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
            return e;
        };
        // Gagang (atas)
        gsvg.appendChild(mkR({ x:'21', y:'0',  width:'8',  height:'58', rx:'3',
                                fill:handleFill, stroke:bandFill, 'stroke-width':'0.8' }));
        // Kepala palu (bawah)
        gsvg.appendChild(mkR({ x:'3',  y:'54', width:'44', height:'22', rx:'4',
                                fill:headFill,   stroke:bandFill, 'stroke-width':'1.5' }));
        // Ban logam kiri-kanan
        gsvg.appendChild(mkR({ x:'3',  y:'54', width:'8',  height:'22', rx:'3',
                                fill:bandFill, opacity:'0.85' }));
        gsvg.appendChild(mkR({ x:'39', y:'54', width:'8',  height:'22', rx:'3',
                                fill:bandFill, opacity:'0.85' }));
        // Highlight kepala
        gsvg.appendChild(mkR({ x:'10', y:'56', width:'30', height:'4', rx:'2',
                                fill:'rgba(255,255,255,0.18)' }));

        // Posisi awal: di atas kartu, miring seperti hendak ayun
        const startRot = isSuicide ? 42 : -42;
        const endRot   = isSuicide ? 6  : -6;
        gsvg.style.cssText = `
            position:fixed; pointer-events:none; z-index:9200;
            left:${cx - 33}px;
            top:${rect.top - 155}px;
            transform-origin: 50% 18%;
            transform: rotate(${startRot}deg);
            transition: none;
            filter: drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 2px 4px rgba(0,0,0,.5));
        `;
        document.body.appendChild(gsvg);

        // Ayun turun ke titik impak (kepala mencapai cy)
        requestAnimationFrame(() => setTimeout(() => {
            gsvg.style.transition = 'top .13s cubic-bezier(.7,0,1,1), transform .13s cubic-bezier(.7,0,1,1)';
            gsvg.style.top        = `${cy - 99}px`;
            gsvg.style.transform  = `rotate(${endRot}deg) scale(1.08)`;
        }, 20));

        // Rekoil + fade
        setTimeout(() => {
            gsvg.style.transition = 'top .22s ease-out, opacity .22s ease, transform .22s ease';
            gsvg.style.top        = `${cy - 125}px`;
            gsvg.style.opacity    = '0';
            gsvg.style.transform  = `rotate(${isSuicide ? 22 : -28}deg) scale(0.85)`;
        }, 245);
        setTimeout(() => gsvg.remove(), 560);

        /* ── 2. KILAT IMPAK ── */
        setTimeout(() => {
            const f = document.createElement('div');
            f.style.cssText = `position:fixed;inset:0;z-index:8999;pointer-events:none;
                background:${isSuicide ? 'rgba(210,70,0,.5)' : 'rgba(255,215,0,.42)'};
                opacity:0;transition:opacity .04s;`;
            document.body.appendChild(f);
            setTimeout(() => { f.style.opacity = '1'; }, 5);
            setTimeout(() => { f.style.opacity = '0'; f.style.transition = 'opacity .22s'; }, 75);
            setTimeout(() => f.remove(), 400);
        }, 130);

        /* ── 3. RETAKAN DI AVATAR KARTU ── */
        setTimeout(() => {
            const svg = makeCardSVG(card, 2600);
            // Titik impak dalam koordinat viewBox (0 0 100 140)
            const ox = 50, oy = 26;
            const cc = isSuicide ? '#882200' : '#6E4800';   // warna retakan
            const hc = isSuicide ? 'rgba(255,80,0,.18)' : 'rgba(255,220,0,.18)'; // highlight retak

            // Retakan utama memancar dari titik impak
            const cracks = [
                // Turun-kiri
                { d:`M${ox},${oy} L${ox-9},${oy+28}  L${ox-17},${oy+58} L${ox-7},${oy+92} L${ox-13},${oy+138}`, delay:0,  w:2.1 },
                // Turun-kanan
                { d:`M${ox},${oy} L${ox+11},${oy+30} L${ox+5}, ${oy+62} L${ox+17},${oy+98} L${ox+9},${oy+138}`, delay:10, w:1.9 },
                // Kiri
                { d:`M${ox},${oy} L${ox-22},${oy+12} L${ox-44},${oy+9}  L${ox-66},${oy+18}`,                    delay:14, w:1.5 },
                // Kanan
                { d:`M${ox},${oy} L${ox+24},${oy+10} L${ox+48},${oy+6}  L${ox+70},${oy+15}`,                    delay:7,  w:1.5 },
                // Atas-kiri
                { d:`M${ox},${oy} L${ox-15},${oy-14} L${ox-28},${oy-30}`,                                       delay:20, w:1.2 },
                // Atas-kanan
                { d:`M${ox},${oy} L${ox+17},${oy-12} L${ox+32},${oy-26}`,                                       delay:26, w:1.2 },
                // Cabang dari retak kiri
                { d:`M${ox-17},${oy+58} L${ox-36},${oy+70} L${ox-52},${oy+66}`,                                 delay:52, w:0.95 },
                // Cabang dari retak kanan
                { d:`M${ox+5}, ${oy+62} L${ox+27},${oy+76} L${ox+46},${oy+73}`,                                 delay:57, w:0.95 },
                // Cabang kecil kiri-tengah
                { d:`M${ox-22},${oy+12} L${ox-18},${oy+34} L${ox-27},${oy+50}`,                                 delay:35, w:0.8  },
                // Cabang kecil atas
                { d:`M${ox-15},${oy-14} L${ox-8}, ${oy-22} L${ox-20},${oy-30}`,                                 delay:45, w:0.7  },
            ];

            cracks.forEach(({ d, delay, w }) => {
                // Layer bawah: highlight terang
                const hi = document.createElementNS(ns, 'path');
                hi.setAttribute('d', d);
                hi.setAttribute('stroke', hc);
                hi.setAttribute('stroke-width', String(w + 1.2));
                hi.setAttribute('stroke-linecap', 'round');
                hi.setAttribute('stroke-linejoin', 'round');
                hi.setAttribute('fill', 'none');
                hi.setAttribute('opacity', '0');
                hi.style.strokeDasharray  = '350';
                hi.style.strokeDashoffset = '350';
                svg.appendChild(hi);

                // Layer atas: garis retak gelap
                const path = document.createElementNS(ns, 'path');
                path.setAttribute('d', d);
                path.setAttribute('stroke', cc);
                path.setAttribute('stroke-width', String(w));
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                path.setAttribute('fill', 'none');
                path.setAttribute('opacity', '0');
                path.style.strokeDasharray  = '350';
                path.style.strokeDashoffset = '350';
                svg.appendChild(path);

                const dur = (.07 + Math.random() * .05).toFixed(3);
                setTimeout(() => {
                    hi.setAttribute('opacity', '0.55');
                    hi.style.transition       = `stroke-dashoffset ${dur}s ease-out`;
                    hi.style.strokeDashoffset = '0';

                    path.setAttribute('opacity', '0.9');
                    path.style.transition       = `stroke-dashoffset ${dur}s ease-out`;
                    path.style.strokeDashoffset = '0';
                }, delay);
            });

            // Lingkaran impak kecil di pusat
            const ring = document.createElementNS(ns, 'circle');
            ring.setAttribute('cx', String(ox)); ring.setAttribute('cy', String(oy));
            ring.setAttribute('r', '5');
            ring.setAttribute('fill', 'none');
            ring.setAttribute('stroke', isSuicide ? '#ff6600' : '#ffd700');
            ring.setAttribute('stroke-width', '1.8');
            ring.setAttribute('opacity', '0.85');
            svg.appendChild(ring);
            setTimeout(() => { ring.style.transition = 'opacity .3s ease'; ring.setAttribute('opacity', '0'); }, 280);

            // Fade semua retak setelah beberapa saat
            setTimeout(() => {
                svg.querySelectorAll('path').forEach(p => {
                    p.style.transition = 'opacity .9s ease';
                    p.setAttribute('opacity', '0');
                });
            }, 2000);

        }, 133);

        /* ── 4. GELOMBANG KEJUT + DEBU BATU (canvas) ── */
        setTimeout(() => {
            const canvas = makeCanvas(950);
            const ctx    = canvas.getContext('2d');
            const iX = cx, iY = cy;
            const dustColors = isSuicide
                ? ['#ff5500', '#cc2200', '#ff8800', '#ffcc44']
                : ['#ffd700', '#cc9900', '#fff8aa', '#ffffff'];

            const particles = Array.from({ length: 24 }, () => {
                const a = Math.random() * Math.PI * 2;
                const s = 1.5 + Math.random() * 6.5;
                return { x:iX, y:iY, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 2.8,
                         r:1.5 + Math.random()*3.2, alpha:.96,
                         color: dustColors[Math.floor(Math.random()*dustColors.length)] };
            });

            let frame = 0;
            function draw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Gelombang kejut melingkar
                if (frame < 16) {
                    const sr = frame * 6;
                    const a  = Math.max(0, .95 - frame * .065);
                    ctx.save(); ctx.globalAlpha = a;
                    ctx.strokeStyle = glowColor; ctx.lineWidth = 3.5;
                    ctx.shadowColor = glowColor; ctx.shadowBlur  = 14;
                    ctx.beginPath(); ctx.arc(iX, iY, sr, 0, Math.PI*2); ctx.stroke();
                    ctx.restore();
                }

                // Partikel debu
                particles.forEach(p => {
                    p.x += p.vx; p.y += p.vy; p.vy += 0.24; p.vx *= .97;
                    p.alpha -= .024; if (p.alpha <= 0) return;
                    ctx.save(); ctx.globalAlpha = p.alpha;
                    ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 9;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
                });

                frame++;
                if (frame < 60) requestAnimationFrame(draw);
            }
            draw();
        }, 133);
    }

    // ✨ MEDIUM REVIVE – divine light aura + holy particles (all players see it)
    function playRevive(cardId) {
        const card = document.getElementById(`card-${cardId}`);
        if (!card) return;

        // Remove dead class with a glow pulse on the card
        card.classList.remove('dead', 'dying');
        // Strip dead-* classes
        card.className = card.className.replace(/dead-\S+/g, '').trim();
        card.style.transition = 'filter 0.8s ease, opacity 0.8s ease';
        card.style.filter = 'brightness(3) saturate(0)';
        setTimeout(() => { card.style.filter = ''; }, 800);

        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const canvas = makeCanvas(3000);
        const ctx = canvas.getContext('2d');

        // Holy particles flying upward
        const particles = Array.from({ length: 40 }, () => ({
            x: cx + (Math.random() - 0.5) * rect.width * 0.8,
            y: cy + rect.height * 0.3,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -(1.5 + Math.random() * 3.5),
            r: 1.5 + Math.random() * 3.5,
            alpha: 0.9 + Math.random() * 0.1,
            color: ['#ffffff','#fffacd','#e0f0ff','#ffd700','#c8f0ff'][Math.floor(Math.random()*5)],
            twinkle: Math.random() * Math.PI * 2
        }));

        let elapsed = 0;
        function draw() {
            ctx.clearRect(cx - 150, cy - 250, 300, 450);

            // Divine aura rings expanding outward
            const ringT = elapsed / 2500;
            for (let i = 0; i < 3; i++) {
                const phase = (ringT + i * 0.33) % 1;
                const r = phase * rect.width * 1.2;
                const a = Math.max(0, 0.5 * (1 - phase));
                ctx.save(); ctx.globalAlpha = a;
                const g = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r);
                g.addColorStop(0, 'transparent');
                g.addColorStop(0.7, 'rgba(255,250,200,0.3)');
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            }

            // Inner glow at avatar center
            const glow = ctx.createRadialGradient(cx, cy - 10, 0, cx, cy - 10, 50);
            glow.addColorStop(0, `rgba(255,255,220,${0.6 * Math.sin(elapsed / 200 + 1) * 0.4 + 0.3})`);
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy - 10, 50, 0, Math.PI * 2); ctx.fill();

            // Particles
            particles.forEach(p => {
                p.x += p.vx + Math.sin(elapsed * 0.002 + p.twinkle) * 0.4;
                p.y += p.vy;
                p.alpha -= 0.005;
                if (p.alpha <= 0) {
                    // Respawn from bottom
                    p.x = cx + (Math.random() - 0.5) * rect.width * 0.8;
                    p.y = cy + rect.height * 0.3;
                    p.alpha = 0.9;
                    p.vy = -(1.5 + Math.random() * 3.5);
                }
                ctx.save(); ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 6;
                // Star shape
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });

            elapsed += 16;
            if (elapsed < 3000) requestAnimationFrame(draw);
        }
        draw();

        // Heavenly light column from above
        const col = document.createElement('div');
        col.style.cssText = `
            position:fixed;
            left:${cx - 40}px; top:0; width:80px; height:${rect.top + rect.height * 0.5}px;
            background:linear-gradient(180deg, transparent 0%, rgba(255,255,200,0.7) 60%, rgba(255,255,220,0.9) 100%);
            pointer-events:none; z-index:8998;
            animation:reviveBeam 2.5s ease-out forwards;
        `;
        document.body.appendChild(col);
        setTimeout(() => col.remove(), 2600);

        // Add keyframes for beam
        if (!document.getElementById('revive-beam-style')) {
            const s = document.createElement('style');
            s.id = 'revive-beam-style';
            s.textContent = '@keyframes reviveBeam { 0%{opacity:0;filter:blur(8px)} 15%{opacity:1;filter:blur(4px)} 80%{opacity:0.6} 100%{opacity:0;filter:blur(2px)} }';
            document.head.appendChild(s);
        }
    }

    // ☄️ METEOR STRIKE – meteor dari langit menghantam kartu
    // isBackfire = true → Astronomer salah tebak, meteor membalik menghantam dirinya sendiri
    function playMeteor(card, rect, isBackfire) {
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height * 0.35;

        /* ── 1. TREK METEOR (batu berpijar dari sudut kanan-atas layar) ── */
        const canvas = makeCanvas(3500);
        const ctx = canvas.getContext('2d');

        // Titik awal meteor (atas kanan layar) → titik impak (kartu)
        const startX = window.innerWidth * (isBackfire ? 0.1 : 0.85);
        const startY = 0;
        const endX = cx, endY = cy;
        const dx = endX - startX, dy = endY - startY;
        const dist = Math.hypot(dx, dy);
        const nx = dx / dist, ny = dy / dist;  // unit vector

        // Warna meteor: merah/oranye untuk normal, biru/ungu untuk backfire
        const coreColor  = isBackfire ? '#cc88ff' : '#ff8844';
        const glowColor  = isBackfire ? '#8800ff' : '#ff4400';
        const trailColor = isBackfire ? 'rgba(160,80,255,' : 'rgba(255,100,0,';
        const sparkColor = isBackfire ? '#bb66ff' : '#ffcc44';

        let progress = 0; // 0→1 (meteor travel)
        const totalFrames = 45; // ~0.75s perjalanan

        // Partikel debu setelah impak
        const debris = [];
        let impacted = false;
        let postImpactFrame = 0;

        function spawnDebris() {
            for (let i = 0; i < 40; i++) {
                const a = Math.random() * Math.PI * 2;
                const s = 2 + Math.random() * 9;
                debris.push({
                    x: endX, y: endY,
                    vx: Math.cos(a) * s, vy: Math.sin(a) * s - 5,
                    r: 1.2 + Math.random() * 3.5,
                    alpha: 1,
                    color: Math.random() > 0.5 ? coreColor : sparkColor
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (!impacted) {
                // Meteor saat terbang
                const mx = startX + dx * progress;
                const my = startY + dy * progress;

                // Ekor (trail) — semakin panjang seiring progress
                const trailLen = 120 * progress;
                const grad = ctx.createLinearGradient(
                    mx, my,
                    mx - nx * trailLen, my - ny * trailLen
                );
                grad.addColorStop(0, trailColor + '0.9)');
                grad.addColorStop(0.4, trailColor + '0.45)');
                grad.addColorStop(1, trailColor + '0)');
                ctx.save();
                ctx.strokeStyle = grad;
                ctx.lineWidth   = 14 * (0.4 + progress * 0.6);
                ctx.lineCap     = 'round';
                ctx.shadowColor = glowColor;
                ctx.shadowBlur  = 24;
                ctx.beginPath();
                ctx.moveTo(mx, my);
                ctx.lineTo(mx - nx * trailLen, my - ny * trailLen);
                ctx.stroke();
                ctx.restore();

                // Inti meteor (lingkaran berpijar)
                const r = 10 + progress * 6;
                const radGrad = ctx.createRadialGradient(mx, my, 0, mx, my, r * 2);
                radGrad.addColorStop(0,   '#ffffff');
                radGrad.addColorStop(0.3, coreColor);
                radGrad.addColorStop(1,   'transparent');
                ctx.save();
                ctx.globalAlpha = 0.95;
                ctx.fillStyle   = radGrad;
                ctx.shadowColor = glowColor; ctx.shadowBlur = 30;
                ctx.beginPath(); ctx.arc(mx, my, r * 2, 0, Math.PI * 2); ctx.fill();
                ctx.restore();

                progress += 1 / totalFrames;
                if (progress >= 1) {
                    impacted = true;
                    spawnDebris();
                    // Kilat impak layar
                    const flash = document.createElement('div');
                    flash.style.cssText = `position:fixed;inset:0;z-index:8999;pointer-events:none;
                        background:${isBackfire ? 'rgba(180,100,255,0.55)' : 'rgba(255,130,0,0.55)'};
                        opacity:1;transition:opacity 0.3s;`;
                    document.body.appendChild(flash);
                    setTimeout(() => { flash.style.opacity = '0'; }, 20);
                    setTimeout(() => flash.remove(), 400);
                }
            } else {
                // Gelombang kejut melingkar setelah impak
                if (postImpactFrame < 20) {
                    const sr = postImpactFrame * 9;
                    const sa = Math.max(0, 0.9 - postImpactFrame * 0.05);
                    ctx.save();
                    ctx.globalAlpha   = sa;
                    ctx.strokeStyle   = glowColor;
                    ctx.lineWidth     = 4;
                    ctx.shadowColor   = glowColor; ctx.shadowBlur = 18;
                    ctx.beginPath(); ctx.arc(endX, endY, sr, 0, Math.PI * 2); ctx.stroke();
                    // Second ring slightly behind
                    if (postImpactFrame > 3) {
                        const sr2 = (postImpactFrame - 3) * 8;
                        ctx.globalAlpha = sa * 0.5;
                        ctx.strokeStyle = sparkColor;
                        ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.arc(endX, endY, sr2, 0, Math.PI * 2); ctx.stroke();
                    }
                    ctx.restore();
                }

                // Debu dan serpihan
                debris.forEach(p => {
                    p.x += p.vx; p.y += p.vy;
                    p.vy += 0.28; p.vx *= 0.97;
                    p.alpha -= 0.022; if (p.alpha <= 0) return;
                    ctx.save();
                    ctx.globalAlpha = p.alpha;
                    ctx.fillStyle   = p.color;
                    ctx.shadowColor = p.color; ctx.shadowBlur = 8;
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                });
                postImpactFrame++;
            }

            const done = impacted && postImpactFrame > 70;
            if (!done) requestAnimationFrame(draw);
        }
        draw();

        /* ── 2. KAWAH / BEKAS TUMBUKAN di kartu (SVG) ── */
        setTimeout(() => {
            const ns  = 'http://www.w3.org/2000/svg';
            const svg = makeCardSVG(card, 3000);

            // Lingkaran kawah terluar
            const outer = document.createElementNS(ns, 'ellipse');
            outer.setAttribute('cx', '50'); outer.setAttribute('cy', '35');
            outer.setAttribute('rx', '22'); outer.setAttribute('ry', '10');
            outer.setAttribute('fill', isBackfire ? 'rgba(120,40,180,0.35)' : 'rgba(100,40,0,0.35)');
            outer.setAttribute('stroke', isBackfire ? '#9933cc' : '#cc5500');
            outer.setAttribute('stroke-width', '1.5');
            svg.appendChild(outer);

            // Lingkaran dalam (panas)
            const inner = document.createElementNS(ns, 'ellipse');
            inner.setAttribute('cx', '50'); inner.setAttribute('cy', '35');
            inner.setAttribute('rx', '11'); inner.setAttribute('ry', '5');
            inner.setAttribute('fill', isBackfire ? 'rgba(180,100,255,0.5)' : 'rgba(220,100,0,0.5)');
            svg.appendChild(inner);

            // Titik inti (berpendar)
            const core = document.createElementNS(ns, 'circle');
            core.setAttribute('cx', '50'); core.setAttribute('cy', '35');
            core.setAttribute('r', '4');
            core.setAttribute('fill', isBackfire ? '#cc88ff' : '#ff9944');
            core.setAttribute('opacity', '0.9');
            svg.appendChild(core);

            // Retakan memanjang keluar dari kawah
            const cracks = [
                `M50,35 L38,18 L32,10`,
                `M50,35 L62,20 L70,14`,
                `M50,35 L28,38 L18,42`,
                `M50,35 L72,40 L82,45`,
                `M50,35 L45,55 L42,70`,
                `M50,35 L56,52 L60,68`,
            ];
            cracks.forEach((d, i) => {
                const p = document.createElementNS(ns, 'path');
                p.setAttribute('d', d);
                p.setAttribute('stroke', isBackfire ? '#8800bb' : '#882200');
                p.setAttribute('stroke-width', '1.2');
                p.setAttribute('stroke-linecap', 'round');
                p.setAttribute('fill', 'none');
                p.setAttribute('opacity', '0.8');
                p.style.strokeDasharray  = '200';
                p.style.strokeDashoffset = '200';
                svg.appendChild(p);
                setTimeout(() => {
                    p.style.transition = 'stroke-dashoffset 0.12s ease-out';
                    p.style.strokeDashoffset = '0';
                }, i * 18);
            });

            // Fade kawah setelah beberapa detik
            setTimeout(() => {
                svg.querySelectorAll('ellipse,circle,path').forEach(el => {
                    el.style.transition = 'opacity 1s ease';
                    el.setAttribute('opacity', '0');
                });
            }, 2500);
        }, 700); // sedikit delay setelah impak

        /* ── 3. Teks ASTRONOMER BACKFIRE (opsional label) ── */
        if (isBackfire) {
            setTimeout(() => {
                const lbl = document.createElement('div');
                lbl.textContent = '☄️ Backfire!';
                lbl.style.cssText = `
                    position:fixed; left:${cx - 55}px; top:${cy + 30}px;
                    color:#cc88ff; font-family:'Cinzel',serif; font-size:1rem;
                    font-weight:700; letter-spacing:0.08em;
                    text-shadow:0 0 12px #8800ff; pointer-events:none; z-index:9300;
                    opacity:0; transition:opacity 0.2s;
                `;
                document.body.appendChild(lbl);
                setTimeout(() => { lbl.style.opacity = '1'; }, 10);
                setTimeout(() => { lbl.style.opacity = '0'; lbl.style.transition = 'opacity 0.5s'; }, 1200);
                setTimeout(() => lbl.remove(), 1800);
            }, 800);
        }
    }

    // 🗡️ GUILLOTINE – blade drops from above + massive blood splatter
    function playGuillotine(card, rect) {
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height * 0.22;
        const ns = 'http://www.w3.org/2000/svg';

        /* ── 1. SCAFFOLD + BLADE SVG (floating above card) ── */
        const gsvg = document.createElementNS(ns, 'svg');
        gsvg.setAttribute('viewBox', '0 0 80 120');
        gsvg.setAttribute('width', '80');
        gsvg.setAttribute('height', '120');
        const mkEl = (tag, attrs) => {
            const e = document.createElementNS(ns, tag);
            Object.entries(attrs).forEach(([k,v]) => e.setAttribute(k, v));
            return e;
        };

        // Frame kiri-kanan (tiang kayu)
        gsvg.appendChild(mkEl('rect', { x:'4', y:'0', width:'8', height:'100', rx:'2', fill:'#5c3d18', stroke:'#3b2408', 'stroke-width':'1' }));
        gsvg.appendChild(mkEl('rect', { x:'68', y:'0', width:'8', height:'100', rx:'2', fill:'#5c3d18', stroke:'#3b2408', 'stroke-width':'1' }));
        // Palang atas
        gsvg.appendChild(mkEl('rect', { x:'4', y:'0', width:'72', height:'9', rx:'2', fill:'#7a5229', stroke:'#3b2408', 'stroke-width':'1' }));
        // Rail pemandu bilah (garis)
        gsvg.appendChild(mkEl('rect', { x:'15', y:'8', width:'4', height:'85', rx:'1', fill:'#aaa' }));
        gsvg.appendChild(mkEl('rect', { x:'61', y:'8', width:'4', height:'85', rx:'1', fill:'#aaa' }));
        // BILAH / BLADE utama – trapesoid miring
        const blade = mkEl('polygon', { points:'18,12 62,12 60,50 20,50', fill:'#d0d0d0', stroke:'#888', 'stroke-width':'1.5' });
        gsvg.appendChild(blade);
        // Highlight bilah (kilauan logam)
        gsvg.appendChild(mkEl('polygon', { points:'22,13 55,13 53,28 24,28', fill:'rgba(255,255,255,0.35)' }));
        // Tepi bawah bilah (sangat tajam)
        gsvg.appendChild(mkEl('polygon', { points:'20,48 60,48 62,54 18,54', fill:'#888', stroke:'#555', 'stroke-width':'0.8' }));
        // Berat bilah (blok atas)
        gsvg.appendChild(mkEl('rect', { x:'25', y:'6', width:'30', height:'10', rx:'2', fill:'#666', stroke:'#444', 'stroke-width':'0.8' }));

        // Posisi awal: bilah di atas, card berada di bawah
        gsvg.style.cssText = `
            position:fixed; pointer-events:none; z-index:9200;
            left:${cx - 40}px;
            top:${rect.top - 130}px;
            transform-origin: 50% 0%;
            filter: drop-shadow(0 4px 12px rgba(0,0,0,0.9));
            transition: none;
        `;
        document.body.appendChild(gsvg);

        // — Fase 1: Bilah jatuh ke bawah cepat (0.14s) —
        requestAnimationFrame(() => setTimeout(() => {
            gsvg.style.transition = 'top 0.13s cubic-bezier(0.7,0,1,0.8)';
            gsvg.style.top = `${cy - 56}px`; // bilah menyentuh leher
        }, 30));

        // — Fase 2: Rekoil sedikit ke bawah —
        setTimeout(() => {
            gsvg.style.transition = 'top 0.08s ease-out, opacity 0.3s ease 0.3s';
            gsvg.style.top = `${cy - 42}px`;
        }, 200);

        // — Fade bilah —
        setTimeout(() => {
            gsvg.style.opacity = '0';
        }, 450);
        setTimeout(() => gsvg.remove(), 800);

        /* ── 2. SCREEN FLASH MERAH – kilat impak ── */
        setTimeout(() => {
            const flash = document.createElement('div');
            flash.style.cssText = 'position:fixed;inset:0;z-index:8999;pointer-events:none;background:rgba(180,0,0,0.55);opacity:1;transition:opacity 0.25s;';
            document.body.appendChild(flash);
            setTimeout(() => { flash.style.opacity = '0'; }, 20);
            setTimeout(() => flash.remove(), 400);
        }, 150);

        /* ── 3. BLOOD SPLATTER – canvas partikel darah besar ── */
        setTimeout(() => {
            const canvas = makeCanvas(2200);
            const ctx = canvas.getContext('2d');
            const ox = cx, oy = cy + 10;

            // Drops darah terbang ke berbagai arah
            const dropColors = ['#990000','#cc0000','#dd1111','#aa0000','#bb0000'];
            const drops = Array.from({ length: 50 }, () => {
                const angle = Math.PI * (0.1 + Math.random() * 0.8); // mostly sideways & downward
                const speed = 2.5 + Math.random() * 11;
                return {
                    x: ox + (Math.random()-0.5)*rect.width*0.4,
                    y: oy,
                    vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
                    vy: Math.sin(angle) * speed - 3,
                    r: 2 + Math.random() * 6,
                    alpha: 0.95,
                    color: dropColors[Math.floor(Math.random() * dropColors.length)],
                    squish: 0.4 + Math.random() * 0.6 // elongation from gravity
                };
            });

            // Static splatter splatches (circular pools)
            const splatches = Array.from({ length: 8 }, () => ({
                x: ox + (Math.random()-0.5)*rect.width * 1.5,
                y: oy + 20 + Math.random()*rect.height*0.5,
                r: 5 + Math.random() * 14,
                alpha: 0
            }));

            let frame = 0;
            function draw() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Genangan darah di bawah
                splatches.forEach(s => {
                    if (frame < 15) s.alpha = Math.min(0.75, frame * 0.07);
                    ctx.save(); ctx.globalAlpha = s.alpha;
                    ctx.fillStyle = '#880000';
                    ctx.beginPath(); ctx.ellipse(s.x, s.y, s.r, s.r * 0.45, 0, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                });

                drops.forEach(d => {
                    d.x += d.vx; d.y += d.vy;
                    d.vy += 0.35; // gravity
                    d.vx *= 0.97;
                    d.alpha -= 0.016;
                    if (d.alpha <= 0) return;
                    const elongation = Math.min(2.5, 1 + Math.abs(d.vy) * d.squish * 0.12);
                    const angle2 = Math.atan2(d.vy, d.vx);
                    ctx.save();
                    ctx.globalAlpha = d.alpha;
                    ctx.fillStyle = d.color;
                    ctx.shadowColor = d.color; ctx.shadowBlur = 4;
                    ctx.translate(d.x, d.y);
                    ctx.rotate(angle2);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, d.r * elongation, d.r * 0.6, 0, 0, Math.PI*2);
                    ctx.fill();
                    ctx.restore();
                });

                frame++;
                if (frame < 100) requestAnimationFrame(draw);
            }
            draw();
        }, 160);

        /* ── 4. BILAH MEMBELAH KARTU – SVG slash horizontal di kartu ── */
        setTimeout(() => {
            const svg = makeCardSVG(card, 3000);
            // Garis potongan horizontal di bagian leher avatar
            const slash = document.createElementNS(ns, 'line');
            slash.setAttribute('x1', '0'); slash.setAttribute('y1', '22');
            slash.setAttribute('x2', '100'); slash.setAttribute('y2', '22');
            slash.setAttribute('stroke', '#cc0000');
            slash.setAttribute('stroke-width', '2.5');
            slash.setAttribute('stroke-linecap', 'round');
            slash.setAttribute('opacity', '0');
            const len = 130;
            slash.style.strokeDasharray = len; slash.style.strokeDashoffset = len;
            svg.appendChild(slash);
            requestAnimationFrame(() => {
                slash.setAttribute('opacity', '1');
                slash.style.transition = 'stroke-dashoffset 0.1s ease-out';
                slash.style.strokeDashoffset = '0';
            });

            // Tetes darah menetes ke bawah dari garis
            for (let i = 0; i < 7; i++) {
                const drip = document.createElementNS(ns, 'path');
                const bx = 10 + Math.random() * 80;
                const blen = 8 + Math.random() * 30;
                drip.setAttribute('d', `M${bx},22 L${bx-1},${22+blen} Q${bx},${22+blen+6} ${bx+1},${22+blen}`);
                drip.setAttribute('stroke', '#aa0000');
                drip.setAttribute('stroke-width', '1.8');
                drip.setAttribute('fill', 'none');
                drip.setAttribute('opacity', '0');
                drip.setAttribute('stroke-linecap', 'round');
                svg.appendChild(drip);
                setTimeout(() => {
                    drip.setAttribute('opacity', '0.9');
                    drip.style.transition = `stroke-dashoffset 0.4s ease ${0.1 + i*0.05}s`;
                    drip.style.strokeDasharray = '60'; drip.style.strokeDashoffset = '60';
                    setTimeout(() => { drip.style.strokeDashoffset = '0'; }, 20);
                }, 200 + i*60);
            }

            // Fade out setelah beberapa saat
            setTimeout(() => {
                svg.querySelectorAll('line,path').forEach(el => {
                    el.style.transition = 'opacity 0.8s ease';
                    el.setAttribute('opacity', '0');
                });
            }, 2500);
        }, 160);
    }

    // 🩸 BLEEDING – lightweight tetes darah dari luka (Bodyguard Injury)
    function playBleeding(card, rect) {
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height * 0.3;
        const ns = 'http://www.w3.org/2000/svg';

        /* ── 1. LUKA SAYATAN di kartu (SVG CSS-animated, zero canvas cost) ── */
        const svg = makeCardSVG(card, 2800);

        // Sayatan diagonal di dada
        const cut = document.createElementNS(ns, 'path');
        cut.setAttribute('d', 'M28,32 Q50,38 72,30');
        cut.setAttribute('stroke', '#cc0000');
        cut.setAttribute('stroke-width', '3');
        cut.setAttribute('stroke-linecap', 'round');
        cut.setAttribute('fill', 'none');
        cut.setAttribute('opacity', '0');
        const cutLen = 60;
        cut.style.strokeDasharray = cutLen; cut.style.strokeDashoffset = cutLen;
        svg.appendChild(cut);

        const cutEdge = document.createElementNS(ns, 'path');
        cutEdge.setAttribute('d', 'M28,32 Q50,38 72,30');
        cutEdge.setAttribute('stroke', '#660000');
        cutEdge.setAttribute('stroke-width', '1.2');
        cutEdge.setAttribute('stroke-linecap', 'round');
        cutEdge.setAttribute('fill', 'none');
        cutEdge.setAttribute('opacity', '0');
        cutEdge.style.strokeDasharray = cutLen; cutEdge.style.strokeDashoffset = cutLen;
        svg.appendChild(cutEdge);

        requestAnimationFrame(() => {
            cut.setAttribute('opacity', '0.9');
            cut.style.transition = 'stroke-dashoffset 0.15s ease-out';
            cut.style.strokeDashoffset = '0';
            cutEdge.setAttribute('opacity', '0.6');
            cutEdge.style.transition = 'stroke-dashoffset 0.15s ease-out 0.02s';
            cutEdge.style.strokeDashoffset = '0';
        });

        /* ── 2. SVG DRIPS – CSS transitions only, no canvas ── */
        const dripXs = [33, 48, 63, 40, 57];
        dripXs.forEach((bx, i) => {
            const endY = 34 + 25 + Math.random() * 28;
            const drip = document.createElementNS(ns, 'path');
            drip.setAttribute('d', `M${bx},34 L${bx},${endY} Q${bx},${endY+5} ${bx+1},${endY+2}`);
            drip.setAttribute('stroke', '#bb0000');
            drip.setAttribute('stroke-width', '1.8');
            drip.setAttribute('stroke-linecap', 'round');
            drip.setAttribute('fill', 'none');
            drip.setAttribute('opacity', '0');
            const dLen = endY - 20;
            drip.style.strokeDasharray = dLen; drip.style.strokeDashoffset = dLen;
            svg.appendChild(drip);
            setTimeout(() => {
                drip.setAttribute('opacity', '0.85');
                drip.style.transition = `stroke-dashoffset 0.5s ease-in`;
                drip.style.strokeDashoffset = '0';
            }, 180 + i * 120);
        });

        // Fade luka setelah 2s
        setTimeout(() => {
            svg.querySelectorAll('path').forEach(el => {
                el.style.transition = 'opacity 0.8s ease';
                el.setAttribute('opacity', '0');
            });
        }, 2000);

        /* ── 3. CANVAS – fixed pool of 18 drops, max 1.2s, no trails, no shadowBlur ── */
        const canvas = makeCanvas(1400);
        const ctx = canvas.getContext('2d');

        // Spawn all drops at once from the wound area — fixed pool, no growth
        const POOL = 18;
        const drops = Array.from({ length: POOL }, (_, i) => ({
            x: cx + (Math.random() - 0.5) * rect.width * 0.5,
            y: cy + rect.height * 0.22,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 0.4 + Math.random() * 1.5,
            r: 2 + Math.random() * 3,
            alpha: 0.9,
            delay: i * 60 // stagger spawning so they don't all appear at once
        }));

        let frame = 0;
        const MAX_FRAMES = 75; // ~1.25s at 60fps
        const startTime = performance.now();

        function draw() {
            ctx.clearRect(cx - rect.width, cy - 5, rect.width * 2 + 20, rect.height + 80);
            const now = performance.now() - startTime;

            drops.forEach(d => {
                if (now < d.delay) return; // staggered spawn
                d.x += d.vx;
                d.y += d.vy;
                d.vy += 0.12; // gentle gravity
                d.alpha -= 0.012;
                if (d.alpha <= 0.05) return;

                // elongate drop in direction of travel
                const elongation = Math.min(1.8, 1 + d.vy * 0.12);
                ctx.globalAlpha = d.alpha;
                ctx.fillStyle = '#cc0000';
                ctx.beginPath();
                ctx.ellipse(d.x, d.y, d.r * 0.55, d.r * elongation, 0, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;

            frame++;
            if (frame < MAX_FRAMES) requestAnimationFrame(draw);
        }
        setTimeout(draw, 250); // slight delay to let SVG luka appear first

        /* ── 4. SINGLE screen tint – replaces 3 DOM pulse elements ── */
        const tint = document.createElement('div');
        tint.style.cssText = 'position:fixed;inset:0;z-index:8996;pointer-events:none;background:rgba(160,0,0,0.15);opacity:0;transition:opacity 0.2s;';
        document.body.appendChild(tint);
        setTimeout(() => { tint.style.opacity = '1'; }, 100);
        setTimeout(() => { tint.style.opacity = '0'; tint.style.transition = 'opacity 0.6s'; }, 450);
        setTimeout(() => tint.remove(), 1100);
    }

    // 🔮 SECT SACRIFICE MEMBER – Shouts "LONG LIVE SECT!" word-by-word + Soul release + dissolve
    function playSectSacrificeMember(card, rect) {
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;

        // Full-screen purple flash overlay
        const flashEl = document.createElement('div');
        flashEl.style.cssText = `position:fixed;inset:0;z-index:99990;pointer-events:none;background:rgba(80,20,120,0);transition:background 0.12s ease;`;
        document.body.appendChild(flashEl);

        // Dark aura canvas behind the card
        const auraCanvas = makeCanvas(2200);
        const actx = auraCanvas.getContext('2d');
        let auraRad = 0, auraAlpha = 0.0, auraGrowing = true;
        function drawAura() {
            actx.clearRect(0, 0, auraCanvas.width, auraCanvas.height);
            if (auraRad > 0) {
                const g = actx.createRadialGradient(cx, cy, 0, cx, cy, auraRad);
                g.addColorStop(0, `rgba(80,10,130,${auraAlpha * 0.7})`);
                g.addColorStop(0.5, `rgba(50,5,90,${auraAlpha * 0.45})`);
                g.addColorStop(1, 'rgba(10,2,20,0)');
                actx.fillStyle = g;
                actx.beginPath(); actx.arc(cx, cy, auraRad, 0, Math.PI*2); actx.fill();
            }
            requestAnimationFrame(drawAura);
        }
        drawAura();

        // Shout box for LONG LIVE SECT!
        const shoutBox = document.createElement('div');
        shoutBox.style.cssText = `
            position: fixed;
            left: ${cx}px;
            top: ${rect.top - 30}px;
            transform: translate(-50%, 0);
            display: flex;
            gap: 22px;
            background: rgba(18, 5, 30, 0.97);
            border: 2px solid #9b59b6;
            box-shadow: 0 0 35px #8e44ad, inset 0 0 18px rgba(142,68,173,0.6);
            padding: 10px 28px;
            border-radius: 36px;
            z-index: 99999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.18s ease;
        `;

        const words = ['LONG', 'LIVE', 'SECT!'];
        words.forEach((w, idx) => {
            const span = document.createElement('span');
            span.textContent = w;
            span.style.cssText = `
                color: #f5eef8;
                font-family: 'Montserrat', sans-serif;
                font-weight: 900;
                font-size: ${idx === 2 ? '1.25rem' : '1.05rem'};
                letter-spacing: ${idx === 2 ? '3px' : '2px'};
                opacity: 0;
                transform: scale(0.2) translateY(14px);
                transition: all 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.4);
                text-shadow: 0 0 10px #d2b4de, 0 0 22px #8e44ad;
                display: inline-block;
            `;
            shoutBox.appendChild(span);
        });
        document.body.appendChild(shoutBox);

        // Helper: flash screen purple
        function purpleFlash(intensity = 0.35) {
            flashEl.style.background = `rgba(90,20,140,${intensity})`;
            setTimeout(() => { flashEl.style.background = 'rgba(80,20,120,0)'; }, 130);
        }

        // Helper: shake card
        function shakeCard(intensity = 6, duration = 180) {
            const start = Date.now();
            function tick() {
                if (Date.now() - start > duration) { card.style.transform = ''; return; }
                card.style.transform = `scale(0.97) translate(${(Math.random()-0.5)*intensity}px, ${(Math.random()-0.5)*intensity*0.6}px)`;
                setTimeout(tick, 35);
            }
            tick();
        }

        // Grow aura
        setTimeout(() => { shoutBox.style.opacity = '1'; auraGrowing = true; }, 30);
        let auraT = 0;
        const auraIntv = setInterval(() => {
            auraRad = Math.min(auraRad + 4, 110);
            auraAlpha = Math.min(auraAlpha + 0.05, 0.65);
        }, 16);

        // LONG
        setTimeout(() => {
            const sp = shoutBox.children[0];
            if (sp) { sp.style.opacity = '1'; sp.style.transform = 'scale(1.12) translateY(0)'; }
            shakeCard(4, 150);
            purpleFlash(0.2);
        }, 80);

        // LIVE
        setTimeout(() => {
            const sp = shoutBox.children[1];
            if (sp) { sp.style.opacity = '1'; sp.style.transform = 'scale(1.12) translateY(0)'; }
            shakeCard(6, 160);
            purpleFlash(0.28);
        }, 360);

        // SECT!
        setTimeout(() => {
            const sp = shoutBox.children[2];
            if (sp) {
                sp.style.opacity = '1';
                sp.style.transform = 'scale(1.35) translateY(0)';
                sp.style.color = '#ffffff';
                sp.style.textShadow = '0 0 18px #f5eef8, 0 0 35px #8e44ad';
            }
            shoutBox.style.transform = 'translate(-50%, -10px) scale(1.12)';
            shoutBox.style.boxShadow = '0 0 55px #9b59b6, inset 0 0 25px #8e44ad';
            shakeCard(12, 300);
            purpleFlash(0.55);
            auraRad = 140; auraAlpha = 0.85;
        }, 640);

        // Fade out shout box + spawn soul-rise particles
        setTimeout(() => {
            clearInterval(auraIntv);
            shoutBox.style.opacity = '0';
            shoutBox.style.transform = 'translate(-50%, -42px) scale(0.75)';
            setTimeout(() => shoutBox.remove(), 350);

            // Soul-rising particles
            const pCanvas = makeCanvas(1800);
            const pctx = pCanvas.getContext('2d');
            const souls = Array.from({ length: 60 }, () => ({
                x: cx + (Math.random()-0.5)*rect.width*0.7,
                y: cy + (Math.random()-0.5)*rect.height*0.7,
                vx: (Math.random()-0.5)*1.2,
                vy: -2.5 - Math.random()*3.5,
                r: 2 + Math.random()*5,
                color: Math.random()>0.5 ? '#d2b4de' : '#f5eef8',
                alpha: 1
            }));
            let fr = 0;
            function drawSouls() {
                pctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
                souls.forEach(p => {
                    p.x += p.vx; p.y += p.vy; p.alpha -= 0.018;
                    if (p.alpha <= 0) return;
                    pctx.save(); pctx.globalAlpha = p.alpha;
                    pctx.fillStyle = p.color; pctx.shadowColor = '#8e44ad'; pctx.shadowBlur = 10;
                    pctx.beginPath(); pctx.arc(p.x, p.y, p.r, 0, Math.PI*2); pctx.fill(); pctx.restore();
                });
                if (fr++ < 70) requestAnimationFrame(drawSouls);
            }
            drawSouls();
            // Fade aura out
            const fadeI = setInterval(() => { auraAlpha -= 0.06; if (auraAlpha <= 0) { auraAlpha = 0; auraRad = 0; clearInterval(fadeI); } }, 30);
        }, 1500);

        setTimeout(() => { flashEl.remove(); }, 2000);
    }


    // 🗡️ SECT RITUAL CIRCLE – Full-screen formation: outer ring draws → pentagram forms → dark void swallows card
    function playSectRitualCircle(card, rect) {
        const _cx = rect.left + rect.width * 0.5;
        const _cy = rect.top + rect.height * 0.5;
        const _R  = Math.max(rect.width, rect.height) * 1.2; // covers card + extends beyond

        // ── Dark vignette over whole screen ──
        const vignette = document.createElement('div');
        vignette.style.cssText = `
            position:fixed;inset:0;z-index:8990;pointer-events:none;
            background:radial-gradient(ellipse at ${_cx}px ${_cy}px, transparent 0%, rgba(10,2,20,0.75) 75%);
            opacity:0;transition:opacity 0.6s ease;
        `;
        document.body.appendChild(vignette);
        setTimeout(() => { vignette.style.opacity = '1'; }, 30);

        // ── Canvas for ritual geometry + particles ──
        const canvas = makeCanvas(3200);
        const ctx = canvas.getContext('2d');

        if (!document.getElementById('sect-ritual-style')) {
            const st = document.createElement('style');
            st.id = 'sect-ritual-style';
            st.innerHTML = `
                @keyframes spinRotate    { to { transform: rotate(360deg);  } }
                @keyframes spinRotateRev { to { transform: rotate(-360deg); } }
            `;
            document.head.appendChild(st);
        }

        // Pentagram points
        function pentagramPts(cx, cy, r) {
            const pts = [];
            for (let i = 0; i < 5; i++) {
                const a = (i * 4 * Math.PI / 5) - Math.PI / 2;
                pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
            }
            return pts;
        }
        const starPts = pentagramPts(_cx, _cy, _R * 0.68);

        let phase = 'ring';
        let ringProgress = 0, starProgress = 0, abyssProgress = 0;
        let particles = [], lightnings = [];
        let ringStart = 0, starStart = 0, abyssStart = 0;
        let raf;

        function spawnRingParticle() {
            const a = Math.random() * Math.PI * 2;
            const dist = _R * (0.85 + Math.random() * 0.3);
            particles.push({
                x: _cx + dist * Math.cos(a), y: _cy + dist * Math.sin(a),
                vx: (_cx - (_cx + dist*Math.cos(a))) * 0.018,
                vy: (_cy - (_cy + dist*Math.sin(a))) * 0.018,
                r: 1.5 + Math.random() * 3.5,
                color: Math.random() > 0.45 ? '#d2b4de' : '#8e44ad', alpha: 1
            });
        }
        function spawnLightning() {
            const a1 = Math.random()*Math.PI*2, a2 = a1 + 0.8 + Math.random()*1.2;
            lightnings.push({
                x1: _cx+_R*Math.cos(a1), y1: _cy+_R*Math.sin(a1),
                x2: _cx+_R*Math.cos(a2), y2: _cy+_R*Math.sin(a2),
                life: 8 + Math.floor(Math.random()*7)
            });
        }

        function draw(ts) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (phase === 'ring') {
                if (!ringStart) ringStart = ts;
                ringProgress = Math.min((ts - ringStart) / 750, 1);
                // Draw outer ring progressively
                ctx.save();
                ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 4.5;
                ctx.shadowColor = '#d2b4de'; ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(_cx, _cy, _R, -Math.PI/2, -Math.PI/2 + Math.PI*2*ringProgress);
                ctx.stroke();
                // Inner ring
                if (ringProgress > 0.2) {
                    const ip = Math.min((ringProgress-0.2)/0.8, 1);
                    ctx.strokeStyle = '#e8daef'; ctx.lineWidth = 1.8; ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.arc(_cx, _cy, _R*0.86, -Math.PI/2, -Math.PI/2 + Math.PI*2*ip);
                    ctx.stroke();
                }
                ctx.restore();
                if (Math.random()<0.45) spawnRingParticle();
                if (Math.random()<0.12) spawnLightning();
                if (ringProgress >= 1) { phase = 'star'; starStart = ts; }

            } else if (phase === 'star') {
                if (!starStart) starStart = ts;
                starProgress = Math.min((ts - starStart) / 1200, 1);
                // Full ring
                ctx.save();
                ctx.strokeStyle='#8e44ad'; ctx.lineWidth=4.5; ctx.shadowColor='#d2b4de'; ctx.shadowBlur=22;
                ctx.beginPath(); ctx.arc(_cx,_cy,_R,0,Math.PI*2); ctx.stroke();
                ctx.strokeStyle='#e8daef'; ctx.lineWidth=1.8; ctx.shadowBlur=12;
                ctx.beginPath(); ctx.arc(_cx,_cy,_R*0.86,0,Math.PI*2); ctx.stroke();
                ctx.restore();
                // Pentagram segments appear one by one
                const drawn = starProgress * 5;
                for (let i = 0; i < 5; i++) {
                    const seg = Math.min(Math.max(drawn - i, 0), 1);
                    if (seg <= 0) break;
                    const fr = starPts[i], to = starPts[(i+2)%5];
                    ctx.save();
                    ctx.strokeStyle = `rgba(245,238,248,${0.55 + seg*0.45})`;
                    ctx.lineWidth=2.2; ctx.shadowColor='#d2b4de'; ctx.shadowBlur=22;
                    ctx.beginPath();
                    ctx.moveTo(fr.x, fr.y);
                    ctx.lineTo(fr.x+(to.x-fr.x)*seg, fr.y+(to.y-fr.y)*seg);
                    ctx.stroke(); ctx.restore();
                }
                // Dark fill building inside
                ctx.save();
                ctx.beginPath(); ctx.arc(_cx,_cy,_R*0.82,0,Math.PI*2);
                ctx.fillStyle = `rgba(10,2,20,${starProgress*0.5})`; ctx.fill(); ctx.restore();

                if (Math.random()<0.6) spawnRingParticle();
                if (Math.random()<0.25) spawnLightning();
                // Card trembles
                if (starProgress > 0.4) {
                    const sh = (Math.random()-0.5)*5;
                    card.style.transform = `scale(0.98) rotate(${sh*0.4}deg) translate(${sh}px,${(Math.random()-0.5)*3}px)`;
                }
                if (starProgress >= 1) { phase = 'abyss'; abyssStart = ts; }

            } else if (phase === 'abyss') {
                if (!abyssStart) abyssStart = ts;
                abyssProgress = Math.min((ts - abyssStart) / 1050, 1);
                // Pulsing ring
                const pulse = 0.6 + Math.sin(ts*0.008)*0.4;
                ctx.save();
                ctx.strokeStyle=`rgba(142,68,173,${pulse})`; ctx.lineWidth=7;
                ctx.shadowColor='#d2b4de'; ctx.shadowBlur=40;
                ctx.beginPath(); ctx.arc(_cx,_cy,_R,0,Math.PI*2); ctx.stroke(); ctx.restore();
                // Full pentagram glow
                for (let i=0;i<5;i++) {
                    const fr=starPts[i], to=starPts[(i+2)%5];
                    ctx.save();
                    ctx.strokeStyle=`rgba(245,238,248,${0.5+Math.sin(ts*0.006+i)*0.35})`;
                    ctx.lineWidth=2.2; ctx.shadowColor='#d2b4de'; ctx.shadowBlur=22;
                    ctx.beginPath(); ctx.moveTo(fr.x,fr.y); ctx.lineTo(to.x,to.y); ctx.stroke(); ctx.restore();
                }
                // Black hole grows
                const holeR = _R * 0.12 + _R * 0.72 * abyssProgress;
                const grad = ctx.createRadialGradient(_cx,_cy,0,_cx,_cy,holeR);
                grad.addColorStop(0,'rgba(4,0,10,1)');
                grad.addColorStop(0.65,'rgba(12,2,25,0.97)');
                grad.addColorStop(1,'rgba(30,10,55,0)');
                ctx.save(); ctx.beginPath(); ctx.arc(_cx,_cy,holeR,0,Math.PI*2);
                ctx.fillStyle=grad; ctx.fill(); ctx.restore();
                // Card spirals into hole
                const sc = 1 - abyssProgress * 0.98;
                const rot = abyssProgress * 300;
                card.style.transition = 'none';
                card.style.transform = `scale(${Math.max(sc,0.01)}) rotate(${rot}deg)`;
                card.style.opacity = `${Math.max(1-abyssProgress*0.98, 0)}`;

                if (Math.random()<0.9) spawnRingParticle();
                if (Math.random()<0.4) spawnLightning();
            }

            // Particles
            for (let i = particles.length-1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx; p.y += p.vy; p.alpha -= 0.02;
                if (p.alpha <= 0) { particles.splice(i,1); continue; }
                ctx.save(); ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color;
                ctx.shadowColor='#9b59b6'; ctx.shadowBlur=9;
                ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.restore();
            }
            // Lightnings
            for (let i = lightnings.length-1; i >= 0; i--) {
                const l = lightnings[i]; l.life--;
                if (l.life <= 0) { lightnings.splice(i,1); continue; }
                ctx.save();
                ctx.strokeStyle = `rgba(226,214,240,${l.life/15})`;
                ctx.lineWidth=1.5; ctx.shadowColor='#d2b4de'; ctx.shadowBlur=12;
                ctx.beginPath(); ctx.moveTo(l.x1,l.y1);
                ctx.quadraticCurveTo(
                    (l.x1+l.x2)/2+(Math.random()-0.5)*32,
                    (l.y1+l.y2)/2+(Math.random()-0.5)*32,
                    l.x2, l.y2);
                ctx.stroke(); ctx.restore();
            }

            if (phase !== 'abyss' || abyssProgress < 1) raf = requestAnimationFrame(draw);
        }
        raf = requestAnimationFrame(draw);

        // Hide card permanently
        setTimeout(() => {
            cancelAnimationFrame(raf);
            card.style.transition = '';
            card.style.transform  = '';
            card.style.opacity    = '0';
            card.style.visibility = 'hidden';
            card.style.pointerEvents = 'none';
            card.classList.add('dead', 'dead-sect_ritual');
            vignette.style.opacity = '0';
            setTimeout(() => vignette.remove(), 500);
        }, 3000);
    }

    // 💀 SECT CASCADE – Chains sequentially bind the card one by one then shatter into glowing shards
    function playSectCascade(card, rect) {
        const chainOverlay = document.createElement('div');
        chainOverlay.style.cssText = `
            position: fixed;
            left: ${rect.left - 15}px;
            top: ${rect.top - 15}px;
            width: ${rect.width + 30}px;
            height: ${rect.height + 30}px;
            pointer-events: none;
            z-index: 9005;
        `;
        chainOverlay.innerHTML = `
            <svg viewBox="0 0 100 140" style="width:100%;height:100%;overflow:visible;">
                <g id="ch-1" style="opacity:0; transform:scaleX(0); transform-origin:0% 20%; transition:all 0.18s ease-out;">
                    <path d="M-15,15 Q50,70 115,125" stroke="#4a235a" stroke-width="12" stroke-linecap="round" fill="none" style="filter:drop-shadow(0 0 8px #8e44ad);"/>
                    <path d="M-15,15 Q50,70 115,125" stroke="#d2b4de" stroke-width="6" stroke-dasharray="14,8" stroke-linecap="round" fill="none"/>
                </g>

                <g id="ch-2" style="opacity:0; transform:scaleX(0); transform-origin:0% 50%; transition:all 0.18s ease-out;">
                    <path d="M-20,70 Q50,75 120,70" stroke="#4a235a" stroke-width="13" stroke-linecap="round" fill="none" style="filter:drop-shadow(0 0 10px #8e44ad);"/>
                    <path d="M-20,70 Q50,75 120,70" stroke="#f5eef8" stroke-width="6.5" stroke-dasharray="14,8" stroke-linecap="round" fill="none"/>
                </g>

                <g id="ch-3" style="opacity:0; transform:scaleX(0); transform-origin:0% 80%; transition:all 0.18s ease-out;">
                    <path d="M-15,125 Q50,70 115,15" stroke="#4a235a" stroke-width="12" stroke-linecap="round" fill="none" style="filter:drop-shadow(0 0 8px #8e44ad);"/>
                    <path d="M-15,125 Q50,70 115,15" stroke="#d2b4de" stroke-width="6" stroke-dasharray="14,8" stroke-linecap="round" fill="none"/>
                </g>
            </svg>
        `;
        document.body.appendChild(chainOverlay);

        setTimeout(() => {
            const g = chainOverlay.querySelector('#ch-1');
            if (g) { g.style.opacity = '1'; g.style.transform = 'scaleX(1)'; }
            card.style.transform = 'scale(0.98) rotate(-2deg)';
        }, 20);

        setTimeout(() => {
            const g = chainOverlay.querySelector('#ch-2');
            if (g) { g.style.opacity = '1'; g.style.transform = 'scaleX(1)'; }
            card.style.transform = 'scale(0.96) rotate(2deg)';
        }, 220);

        setTimeout(() => {
            const g = chainOverlay.querySelector('#ch-3');
            if (g) { g.style.opacity = '1'; g.style.transform = 'scaleX(1)'; }
            card.style.transform = 'scale(0.93) rotate(0deg)';
        }, 420);

        setTimeout(() => {
            card.style.transition = 'transform 0.08s ease-in-out';
            let s = 0;
            const intv = setInterval(() => {
                s++;
                card.style.transform = `scale(0.92) translate(${(Math.random()-0.5)*8}px, ${(Math.random()-0.5)*8}px)`;
                if (s >= 5) clearInterval(intv);
            }, 70);
        }, 620);

        setTimeout(() => {
            chainOverlay.style.transition = 'all 0.25s ease-out';
            chainOverlay.style.transform = 'scale(1.3)';
            chainOverlay.style.opacity = '0';
            setTimeout(() => chainOverlay.remove(), 250);

            card.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.6s ease';
            card.style.transform = 'scale(0.85) rotate(-8deg) translateY(20px)';
            card.style.opacity = '0.3';

            const canvas = makeCanvas(1600);
            const ctx = canvas.getContext('2d');
            const cx = rect.left + rect.width * 0.5;
            const cy = rect.top + rect.height * 0.5;
            const shards = Array.from({ length: 80 }, () => {
                const angle = Math.random() * Math.PI * 2;
                const speed = 4 + Math.random() * 9;
                return {
                    x: cx, y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2.0,
                    size: 4 + Math.random() * 7,
                    rot: Math.random() * Math.PI * 2,
                    vRot: (Math.random() - 0.5) * 0.35,
                    color: ['#8e44ad', '#d2b4de', '#6c3483', '#f5eef8', '#4a235a'][Math.floor(Math.random() * 5)],
                    alpha: 1
                };
            });

            let frame = 0;
            function drawShards() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                shards.forEach(s => {
                    s.x += s.vx;
                    s.y += s.vy;
                    s.vy += 0.28;
                    s.rot += s.vRot;
                    s.alpha -= 0.015;
                    if (s.alpha <= 0) return;

                    ctx.save();
                    ctx.globalAlpha = s.alpha;
                    ctx.translate(s.x, s.y);
                    ctx.rotate(s.rot);
                    ctx.fillStyle = s.color;
                    ctx.shadowColor = '#8e44ad';
                    ctx.shadowBlur = 8;
                    ctx.fillRect(-s.size / 2, -s.size / 4, s.size, s.size * 0.6);
                    ctx.restore();
                });
                if (frame++ < 70) requestAnimationFrame(drawShards);
            }
            drawShards();
        }, 950);

        setTimeout(() => {
            card.style.transition = '';
            card.style.transform = '';
            card.style.opacity = '';
        }, 1900);
    }

    return { play, playRevive };
})();