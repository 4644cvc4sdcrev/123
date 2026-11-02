/**
 * 極限倖存者：魔法割草大冒險 (Rogue Survivor)
 * 核心遊戲邏輯主程式
 */

// --- 1. 聲音合成引擎 (Web Audio API) ---
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playGem() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  playHit() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playLightning() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  playExplosion() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  playLevelUp() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      const t = now + idx * 0.08;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }
}

const sound = new SoundEngine();

// --- 2. 遊戲常數與 DOM 元件快取 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;
canvas.width = W;
canvas.height = H;

// DOM 元素
const startOverlay = document.getElementById('startOverlay');
const levelUpOverlay = document.getElementById('levelUpOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const hud = document.getElementById('hud');
const cardsContainer = document.getElementById('cardsContainer');
const expBar = document.getElementById('expBar');
const expText = document.getElementById('expText');
const hpBar = document.getElementById('hpBar');
const hpText = document.getElementById('hpText');
const killCountEl = document.getElementById('killCount');
const timeText = document.getElementById('timeText');
const waveText = document.getElementById('waveText');
const activeSkillsBar = document.getElementById('activeSkillsBar');
const soundBtn = document.getElementById('soundBtn');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const bestKillsText = document.getElementById('bestKillsText');
const finalTime = document.getElementById('finalTime');
const finalKills = document.getElementById('finalKills');
const finalLevel = document.getElementById('finalLevel');
const rankTitle = document.getElementById('rankTitle');

let bestKills = parseInt(localStorage.getItem('survivor_best_kills') || '0', 10);
bestKillsText.innerText = bestKills;

// --- 3. 遊戲狀態機 ---
let gameState = 'START'; // START, PLAYING, LEVELUP, GAMEOVER
let gameTime = 0;
let kills = 0;
let level = 1;
let exp = 0;
let nextExp = 10;

// 玩家屬性
const player = {
  x: W / 2,
  y: H / 2,
  size: 16,
  hp: 100,
  maxHp: 100,
  speed: 3.2,
  targetX: W / 2,
  targetY: H / 2,
  isMovingToTouch: false,
  invulnTime: 0
};

// 武器與技能升級天賦樹
const skills = {
  orbit: { level: 1, maxLevel: 5, name: '奧術法球', icon: '🔮', desc: '環繞高速法球，粉碎近身敵人' },
  lightning: { level: 0, maxLevel: 5, name: '連鎖閃電', icon: '⚡', desc: '自動引天雷劈擊多名隨機怪獸' },
  fireball: { level: 0, maxLevel: 5, name: '追蹤火球', icon: '🔥', desc: '射出爆炸火球引發範圍燃燒' },
  frost: { level: 0, maxLevel: 5, name: '冰霜新星', icon: '❄️', desc: '大範圍冰凍敵群並造成減速' },
  boots: { level: 0, maxLevel: 3, name: '疾風之靴', icon: '👟', desc: '提升角色 15% 走位移動速度' },
  heart: { level: 0, maxLevel: 3, name: '泰坦之心', icon: '💖', desc: '立即回復 35 HP 並提升生命上限' }
};

// 實體容器
let enemies = [];
let gems = [];
let bullets = [];
let damageTexts = [];
let particles = [];

// 冷卻計時器
let orbitAngle = 0;
let lightningTimer = 0;
let fireballTimer = 0;
let frostTimer = 0;

// --- 4. 鍵盤與滑鼠觸控輸入監聽 ---
const keys = { w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = true;
  if (k === 'a' || k === 'arrowleft') keys.a = true;
  if (k === 's' || k === 'arrowdown') keys.s = true;
  if (k === 'd' || k === 'arrowright') keys.d = true;
  player.isMovingToTouch = false;
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = false;
  if (k === 'a' || k === 'arrowleft') keys.a = false;
  if (k === 's' || k === 'arrowdown') keys.s = false;
  if (k === 'd' || k === 'arrowright') keys.d = false;
});

function handlePointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  player.targetX = (clientX - rect.left) * scaleX;
  player.targetY = (clientY - rect.top) * scaleY;
  player.isMovingToTouch = true;
}

canvas.addEventListener('mousemove', (e) => {
  if (e.buttons === 1 && gameState === 'PLAYING') handlePointer(e.clientX, e.clientY);
});
canvas.addEventListener('mousedown', (e) => {
  if (gameState === 'PLAYING') handlePointer(e.clientX, e.clientY);
});
canvas.addEventListener('touchmove', (e) => {
  if (gameState === 'PLAYING' && e.touches.length > 0) {
    handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: true });
canvas.addEventListener('touchstart', (e) => {
  if (gameState === 'PLAYING' && e.touches.length > 0) {
    handlePointer(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: true });

window.addEventListener('mouseup', () => { player.isMovingToTouch = false; });
window.addEventListener('touchend', () => { player.isMovingToTouch = false; });

// UI 按鈕交互
soundBtn.addEventListener('click', () => {
  sound.init();
  sound.enabled = !sound.enabled;
  soundBtn.innerText = sound.enabled ? '🔊 音效: 開' : '🔇 音效: 關';
});

startBtn.addEventListener('click', () => {
  sound.init();
  startGame();
});

restartBtn.addEventListener('click', () => {
  sound.init();
  startGame();
});

// --- 5. 遊戲啟動與狀態重置 ---
function startGame() {
  player.x = W / 2;
  player.y = H / 2;
  player.hp = 100;
  player.maxHp = 100;
  player.speed = 3.2;
  player.invulnTime = 0;

  kills = 0;
  level = 1;
  exp = 0;
  nextExp = 10;
  gameTime = 0;

  // 重置天賦
  skills.orbit.level = 1;
  skills.lightning.level = 0;
  skills.fireball.level = 0;
  skills.frost.level = 0;
  skills.boots.level = 0;
  skills.heart.level = 0;

  enemies = [];
  gems = [];
  bullets = [];
  damageTexts = [];
  particles = [];

  startOverlay.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  levelUpOverlay.classList.add('hidden');
  hud.classList.remove('hidden');

  updateExpBar();
  updateHpBar();
  updateActiveSkillsUI();

  gameState = 'PLAYING';
}

function updateActiveSkillsUI() {
  let html = '<span class="skills-label">法術:</span>';
  for (const k in skills) {
    if (skills[k].level > 0) {
      html += `<span class="skill-tag">${skills[k].icon} Lv.${skills[k].level}</span>`;
    }
  }
  activeSkillsBar.innerHTML = html;
}

function updateExpBar() {
  const pct = Math.min(100, (exp / nextExp) * 100);
  expBar.style.width = `${pct}%`;
  expText.innerText = `LV. ${level} (${exp} / ${nextExp} EXP)`;
}

function updateHpBar() {
  const pct = Math.max(0, (player.hp / player.maxHp) * 100);
  hpBar.style.width = `${pct}%`;
  hpText.innerText = `${Math.round(player.hp)}/${player.maxHp}`;
}

// --- 6. 怪物生成波次配置 ---
function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * W; y = -20; }
  else if (edge === 1) { x = W + 20; y = Math.random() * H; }
  else if (edge === 2) { x = Math.random() * W; y = H + 20; }
  else { x = -20; y = Math.random() * H; }

  const seconds = Math.floor(gameTime / 60);
  let type = 'slime';
  let hp = 15 + Math.floor(seconds * 1.2);
  let speed = 1.3 + Math.random() * 0.4;
  let size = 13;
  let color = '#22c55e';
  let emoji = '🟢';
  let expVal = 2;

  if (seconds > 30 && Math.random() < 0.35) {
    type = 'bat';
    hp = 25 + Math.floor(seconds * 1.5);
    speed = 2.1 + Math.random() * 0.5;
    size = 14;
    color = '#a855f7';
    emoji = '🦇';
    expVal = 4;
  }
  if (seconds > 60 && Math.random() < 0.2) {
    type = 'ghost';
    hp = 50 + Math.floor(seconds * 2.0);
    speed = 1.1;
    size = 18;
    color = '#38bdf8';
    emoji = '👻';
    expVal = 8;
  }

  enemies.push({ x, y, hp, maxHp: hp, speed, size, color, emoji, expVal, freezeTime: 0 });
}

function addDamageText(x, y, text, color = '#fef08a') {
  damageTexts.push({ x, y, text, color, vy: -1.4, alpha: 1, decay: 0.035 });
}

function addParticles(x, y, color, count = 6) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      color,
      alpha: 1,
      size: 2 + Math.random() * 3,
      decay: 0.04
    });
  }
}

// --- 7. 升級卡牌三選一 (Roguelite Card Selection) ---
function triggerLevelUp() {
  level++;
  exp = 0;
  nextExp = Math.round(nextExp * 1.45);
  updateExpBar();
  sound.playLevelUp();
  gameState = 'LEVELUP';

  const available = Object.keys(skills).filter(k => skills[k].level < skills[k].maxLevel);
  available.sort(() => Math.random() - 0.5);
  const choices = available.slice(0, 3);

  cardsContainer.innerHTML = '';
  choices.forEach(key => {
    const item = skills[key];
    const nextLv = item.level + 1;
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <div class="card-icon">${item.icon}</div>
      <h4 class="card-name">${item.name}</h4>
      <span class="card-lvl">Lv.${item.level} ➔ Lv.${nextLv}</span>
      <p class="card-desc">${item.desc}</p>
    `;
    card.addEventListener('click', () => {
      selectUpgrade(key);
    });
    cardsContainer.appendChild(card);
  });

  levelUpOverlay.classList.remove('hidden');
}

function selectUpgrade(key) {
  skills[key].level++;
  if (key === 'boots') player.speed += 0.45;
  if (key === 'heart') {
    player.maxHp += 25;
    player.hp = Math.min(player.maxHp, player.hp + 35);
    updateHpBar();
  }
  updateActiveSkillsUI();
  levelUpOverlay.classList.add('hidden');
  gameState = 'PLAYING';
}

// --- 8. 主邏輯更新 (Update Loop) ---
function update() {
  if (gameState !== 'PLAYING') return;

  gameTime++;

  // 1. 移動處理
  let dx = 0;
  let dy = 0;
  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071;
    dy *= 0.7071;
  }

  if (player.isMovingToTouch) {
    const dist = Math.hypot(player.targetX - player.x, player.targetY - player.y);
    if (dist > 8) {
      dx = (player.targetX - player.x) / dist;
      dy = (player.targetY - player.y) / dist;
    }
  }

  player.x = Math.max(player.size, Math.min(W - player.size, player.x + dx * player.speed));
  player.y = Math.max(player.size, Math.min(H - player.size, player.y + dy * player.speed));

  if (player.invulnTime > 0) player.invulnTime--;

  // 2. 怪物生成波次
  const spawnRate = Math.max(16, 50 - Math.floor(gameTime / 180));
  if (gameTime % spawnRate === 0) spawnEnemy();

  // 3. 武器自動攻擊機制
  // (1) 奧術法球
  orbitAngle += 0.04 + skills.orbit.level * 0.012;
  const orbitCount = skills.orbit.level;
  const orbitRadius = 65 + skills.orbit.level * 5;

  // (2) 連鎖閃電
  if (skills.lightning.level > 0) {
    lightningTimer++;
    const lightningCooldown = Math.max(40, 110 - skills.lightning.level * 14);
    if (lightningTimer >= lightningCooldown && enemies.length > 0) {
      lightningTimer = 0;
      sound.playLightning();
      const targetCount = Math.min(enemies.length, 1 + skills.lightning.level);
      const targets = [...enemies].sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y)).slice(0, targetCount);

      targets.forEach(t => {
        const dmg = 25 + skills.lightning.level * 10;
        t.hp -= dmg;
        addDamageText(t.x, t.y - 12, `⚡${dmg}`, '#38bdf8');
        addParticles(t.x, t.y, '#38bdf8', 6);
      });
    }
  }

  // (3) 追蹤火球
  if (skills.fireball.level > 0) {
    fireballTimer++;
    const fireballCooldown = Math.max(45, 120 - skills.fireball.level * 15);
    if (fireballTimer >= fireballCooldown && enemies.length > 0) {
      fireballTimer = 0;
      const nearest = enemies.reduce((prev, curr) => Math.hypot(curr.x - player.x, curr.y - player.y) < Math.hypot(prev.x - player.x, prev.y - player.y) ? curr : prev);
      const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
      bullets.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * 5.5,
        vy: Math.sin(angle) * 5.5,
        life: 90,
        radius: 8,
        damage: 35 + skills.fireball.level * 15
      });
    }
  }

  // (4) 冰霜新星
  if (skills.frost.level > 0) {
    frostTimer++;
    const frostCooldown = Math.max(90, 240 - skills.frost.level * 25);
    if (frostTimer >= frostCooldown) {
      frostTimer = 0;
      sound.playLightning();
      enemies.forEach(e => {
        e.freezeTime = 90 + skills.frost.level * 30;
        e.hp -= 15 + skills.frost.level * 6;
        addDamageText(e.x, e.y - 10, '❄️凍結!', '#67e8f9');
      });
      addParticles(player.x, player.y, '#67e8f9', 24);
    }
  }

  // 4. 更新子彈 (火球)
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;

    let hit = false;
    for (const e of enemies) {
      if (Math.hypot(e.x - b.x, e.y - b.y) < (e.size + b.radius)) {
        hit = true;
        sound.playExplosion();
        const splashRadius = 55;
        enemies.forEach(target => {
          if (Math.hypot(target.x - b.x, target.y - b.y) < splashRadius) {
            target.hp -= b.damage;
            addDamageText(target.x, target.y - 10, `💥${b.damage}`, '#f97316');
            addParticles(target.x, target.y, '#f97316', 8);
          }
        });
        break;
      }
    }

    if (hit || b.life <= 0) bullets.splice(i, 1);
  }

  // 5. 更新敵人移動與法球碰撞
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    if (e.freezeTime > 0) {
      e.freezeTime--;
    } else {
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      e.x += Math.cos(angle) * e.speed;
      e.y += Math.sin(angle) * e.speed;
    }

    // 奧術法球判定
    for (let j = 0; j < orbitCount; j++) {
      const oAngle = orbitAngle + (j * (Math.PI * 2 / orbitCount));
      const ox = player.x + Math.cos(oAngle) * orbitRadius;
      const oy = player.y + Math.sin(oAngle) * orbitRadius;

      if (Math.hypot(e.x - ox, e.y - oy) < (e.size + 10)) {
        const dmg = 8 + skills.orbit.level * 4;
        e.hp -= dmg;
        sound.playHit();
        addDamageText(e.x, e.y - 8, dmg, '#c084fc');
        addParticles(ox, oy, '#c084fc', 4);
        e.x -= Math.cos(oAngle) * 8;
        e.y -= Math.sin(oAngle) * 8;
      }
    }

    // 玩家碰撞受傷
    if (Math.hypot(e.x - player.x, e.y - player.y) < (e.size + player.size)) {
      if (player.invulnTime <= 0) {
        player.hp -= 12;
        player.invulnTime = 30;
        sound.playHit();
        updateHpBar();
        addDamageText(player.x, player.y - 20, '-12', '#f43f5e');

        if (player.hp <= 0) {
          gameOver();
          return;
        }
      }
    }

    // 敵人死亡判定
    if (e.hp <= 0) {
      kills++;
      killCountEl.innerText = kills;
      gems.push({ x: e.x, y: e.y, exp: e.expVal });
      enemies.splice(i, 1);
    }
  }

  // 6. 經驗寶石吸取
  const magnetDist = 90;
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    const dist = Math.hypot(player.x - g.x, player.y - g.y);

    if (dist < magnetDist) {
      g.x += (player.x - g.x) * 0.18;
      g.y += (player.y - g.y) * 0.18;
    }

    if (dist < 18) {
      sound.playGem();
      exp += g.exp;
      gems.splice(i, 1);
      updateExpBar();

      if (exp >= nextExp) {
        triggerLevelUp();
        return;
      }
    }
  }

  // 7. 更新粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  // 8. 更新飄字
  for (let i = damageTexts.length - 1; i >= 0; i--) {
    const t = damageTexts[i];
    t.y += t.vy;
    t.alpha -= t.decay;
    if (t.alpha <= 0) damageTexts.splice(i, 1);
  }

  // 計時與波次更新
  const totalSecs = Math.floor(gameTime / 60);
  const m = String(Math.floor(totalSecs / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  timeText.innerText = `${m}:${s}`;
  waveText.innerText = `第 ${Math.floor(totalSecs / 25) + 1} 波怪潮`;
}

// --- 9. 遊戲結束結算 ---
function gameOver() {
  gameState = 'GAMEOVER';
  hud.classList.add('hidden');

  if (kills > bestKills) {
    bestKills = kills;
    localStorage.setItem('survivor_best_kills', bestKills.toString());
    bestKillsText.innerText = bestKills;
  }

  const totalSecs = Math.floor(gameTime / 60);
  const m = String(Math.floor(totalSecs / 60)).padStart(2, '0');
  const s = String(totalSecs % 60).padStart(2, '0');
  finalTime.innerText = `${m}:${s}`;
  finalKills.innerText = kills;
  finalLevel.innerText = `LV. ${level}`;

  let title = "初級魔法學徒 🧙‍♂️";
  if (kills >= 300) title = "滅世傳奇大法師 ⚡🌌";
  else if (kills >= 150) title = "狂暴元素賢者 🔮🔥";
  else if (kills >= 70) title = "精銳魔導士 ⚔️";
  rankTitle.innerText = `獲得稱號：${title}`;

  gameOverOverlay.classList.remove('hidden');
}

// --- 10. 畫面渲染 (Render Loop) ---
function render() {
  ctx.clearRect(0, 0, W, H);

  // 地磚格線
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 1;
  const step = 45;
  for (let x = 0; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // 繪製經驗水晶
  for (const g of gems) {
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 繪製火球
  for (const b of bullets) {
    ctx.save();
    ctx.fillStyle = '#f97316';
    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 繪製敵人
  for (const e of enemies) {
    ctx.save();
    ctx.font = `${e.size * 1.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.emoji, e.x, e.y);

    if (e.hp < e.maxHp) {
      const bw = 24;
      const bh = 3;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - bw / 2, e.y - e.size - 6, bw, bh);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(e.x - bw / 2, e.y - e.size - 6, bw * (e.hp / e.maxHp), bh);
    }
    ctx.restore();
  }

  // 繪製粒子
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 繪製玩家角色
  ctx.save();
  if (player.invulnTime > 0 && Math.floor(player.invulnTime / 4) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧙‍♂️', player.x, player.y);
  ctx.restore();

  // 繪製奧術旋轉法球
  if (skills.orbit.level > 0) {
    const orbitCount = skills.orbit.level;
    const orbitRadius = 65 + skills.orbit.level * 5;
    for (let j = 0; j < orbitCount; j++) {
      const oAngle = orbitAngle + (j * (Math.PI * 2 / orbitCount));
      const ox = player.x + Math.cos(oAngle) * orbitRadius;
      const oy = player.y + Math.sin(oAngle) * orbitRadius;

      ctx.save();
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ox, oy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 繪製傷害飄字
  for (const t of damageTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.alpha);
    ctx.fillStyle = t.color;
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }

  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  update();
  render();
}

// 啟動循環
requestAnimationFrame(gameLoop);
