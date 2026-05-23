// Boss.js — pure game logic, no browser APIs, no canvas
// Compatible with both Node (CommonJS) and browser (ESM)

const BOSS_CONFIGS = {
  conquest: { hp:30, maxHp:30, attackInterval:90, attacksBeforeStun:3, stunDuration:180, name:'КОНКВЕСТ', speed:0.04, size:250, imgKey:'boss' },
  kregg:    { hp:60, maxHp:60, attackInterval:75, attacksBeforeStun:4, stunDuration:150, name:'КРЕГГ',   speed:0.05, size:250, imgKey:'kregg' },
  thragg:   { hp:120,maxHp:120,attackInterval:55, attacksBeforeStun:5, stunDuration:120, name:'ТРАГГ',   speed:0.07, size:280, imgKey:'thragg' },
};

const PHASE_NAMES     = ['','ФАЗА 1','ЯРОСТЬ','ОТЧАЯНИЕ','ФИНАЛ'];
const PHASE_COLORS    = ['','#ff8800','#ff4400','#ff0000','#ff0044'];
const PHASE_THRESHOLDS = [
  null,                        // phase 0 unused
  null,                        // phase 1 is starting phase
  { hpPct: 0.70, intervalDelta: -16, shake: 20, notif: { type:'warning', title:'ФАЗА 2 — ЯРОСТЬ', text:'Босс разозлён!', priority:1 } },
  { hpPct: 0.40, intervalDelta: -15, shake: 30, notif: { type:'danger', title:'ФАЗА 3 — ОТЧАЯНИЕ', text:'Атаки учащаются!', priority:2 } },
  { hpPct: 0.15, intervalDelta: -12, shake: 40, notif: { type:'danger', title:'ФИНАЛЬНАЯ ФАЗА!', text:'Он не сдастся!', priority:3 } },
];

class Boss {
  constructor(type, difficultyScale) {
    const cfg = BOSS_CONFIGS[type];
    if (!cfg) throw new Error('Unknown boss type: ' + type);

    this.type = type;
    this.x = 600;
    this.y = -300;
    this.timer = 0;
    this.attackInterval = cfg.attackInterval;
    this.attackTimer = cfg.attackInterval;
    this.attacksBeforeStun = cfg.attacksBeforeStun;
    this.attacksUntilStun = cfg.attacksBeforeStun;
    this.stunDuration = cfg.stunDuration;
    this.stunned = false;
    this.stunTimer = 0;
    this.entered = false;
    this.phase = 1;
    this.attackPhase = 0;

    // Config values that may be mutated
    this.hp = cfg.hp;
    this.maxHp = cfg.maxHp;
    this.name = cfg.name;
    this.speed = cfg.speed;
    this.size = cfg.size;
    this.imgKey = cfg.imgKey;

    // Difficulty scaling
    if (difficultyScale && difficultyScale !== 1) {
      this.maxHp = Math.floor(this.maxHp * difficultyScale);
      this.hp = this.maxHp;
    }

    this._lastPlayerX = 0;
  }

  update(playerX, playerY) {
    const events = {};

    this.timer++;
    this._lastPlayerX = playerX;

    if (!this.entered) {
      this.y += 3;
      if (this.y >= 200) {
        this.y = 200;
        this.entered = true;
        events.entered = true;
      }
    }

    if (this.entered) {
      this.x += (playerX - this.x) * this.speed * 0.3;
    }

    // Phase transitions
    const hpPct = this.hp / this.maxHp;
    if (hpPct <= 0.15 && this.phase < 4) {
      this.phase = 4;
      this.attackInterval = Math.max(12, this.attackInterval + PHASE_THRESHOLDS[4].intervalDelta);
      events.phaseChanged = { phase: 4, ...PHASE_THRESHOLDS[4] };
    } else if (hpPct <= 0.40 && this.phase < 3) {
      this.phase = 3;
      this.attackInterval = Math.max(20, this.attackInterval + PHASE_THRESHOLDS[3].intervalDelta);
      events.phaseChanged = { phase: 3, ...PHASE_THRESHOLDS[3] };
    } else if (hpPct <= 0.70 && this.phase < 2) {
      this.phase = 2;
      this.attackInterval = Math.max(30, this.attackInterval + PHASE_THRESHOLDS[2].intervalDelta);
      events.phaseChanged = { phase: 2, ...PHASE_THRESHOLDS[2] };
    }

    // Stun / attack logic
    if (this.stunned) {
      this.stunTimer--;
      if (this.stunTimer <= 0) {
        this.stunned = false;
        this.attacksUntilStun = this.attacksBeforeStun;
        this.attackTimer = this.attackInterval;
        events.stunEnded = true;
      }

      // Check if player dashed into boss during stun
      if (this.stunTimer === this.stunDuration - 2) {
        events.stunTriggered = true;
      }
    } else {
      this.attackTimer--;
      if (this.attackTimer <= 0 && this.entered) {
        const attack = this.getAttackDescriptor(playerX, playerY);
        if (attack) {
          this.attacksUntilStun--;
          this.attackTimer = this.attackInterval;
          events.attack = attack;
          if (this.attacksUntilStun <= 0) {
            this.stunned = true;
            this.stunTimer = this.stunDuration;
            events.stunned = true;
          }
        }
      }
    }

    return events;
  }

  handleStunHit(isDashing, isRage, dashDmg) {
    const dmg = isRage ? dashDmg * 3 : dashDmg;
    this.hp -= dmg;
    const killed = this.hp <= 0;
    if (killed) this.hp = 0;
    // Knockback
    this.x += (this.x - this._lastPlayerX) * 0.15;
    return { damage: dmg, killed };
  }

  isContactDamage(isInvulnerable, isRage, shieldActive) {
    if (isInvulnerable > 0 || isRage || shieldActive) return false;
    return true;
  }

  getContactDistance() {
    return this.size * 0.38;
  }

  getStunDistance() {
    return this.size * 0.45;
  }

  getAttackDescriptor(playerX, playerY) {
    const t = this.type;
    const p = this.phase;
    const scale = [1, 1, 1.5, 2, 2.8][p - 1] || 1;
    const count = (n) => Math.round(n * scale);

    const projectiles = [];
    const effects = [];

    const spawnProj = (x, y, vx, vy, type, color, radius) => {
      projectiles.push({ x, y, vx, vy, type: type || 'ball', color: color || '#ff4400', radius: radius || 12, life: 0 });
    };

    const fireLaser = (bx, by, tx, ty, color) => {
      const angle = Math.atan2(ty - by, tx - bx);
      projectiles.push({ x: bx, y: by, angle, type: 'laser', color: color || '#ff2200', length: 0, maxLength: 700, speed: 28, width: 18, life: 0, maxLife: 80 });
    };

    const fireSpread = (bx, by, tx, ty, cnt, color, radius) => {
      const base = Math.atan2(ty - by, tx - bx);
      const spread = 0.45;
      for (let i = 0; i < cnt; i++) {
        const a = base + (i - (cnt - 1) / 2) * spread;
        const spd = 7 + Math.random() * 2;
        spawnProj(bx, by, Math.cos(a) * spd, Math.sin(a) * spd, 'ball', color, radius || 14);
      }
    };

    const fireCircle = (bx, by, cnt, color, speed) => {
      for (let i = 0; i < cnt; i++) {
        const a = (i / cnt) * Math.PI * 2;
        const spd = speed || 6;
        spawnProj(bx, by, Math.cos(a) * spd, Math.sin(a) * spd, 'fist', color || '#ff6600', 16);
      }
    };

    const addEffect = (type, ex, ey, opts) => {
      effects.push({ type, x: ex, y: ey, ...opts });
    };

    if (t === 'conquest') {
      addEffect('shockwave', this.x, this.y, { color: '#ff8800', size: 40, life: 30 });
      addEffect('lasercharge', playerX - 40, playerY, { color: '#ff8800', life: 15 });
      fireLaser(this.x, this.y, playerX, playerY, '#ff8800');
      if (p >= 2) fireLaser(this.x, this.y, playerX + 120 * scale, playerY, '#ffaa00');
      if (p >= 3) {
        fireLaser(this.x, this.y, playerX - 120 * scale, playerY, '#ff4400');
        spawnProj(this.x, this.y, (playerX - this.x) * 0.05, (playerY - this.y) * 0.05, 'ball', '#ff6600', 12);
      }
      if (p >= 4) {
        fireSpread(this.x, this.y, playerX, playerY, count(5), '#ff2200', 10);
        fireLaser(this.x, this.y, playerX + 60, playerY, '#ff0000');
        addEffect('slam', this.x, this.y, { color: '#ff0000', size: 80, life: 25 });
      }
    } else if (t === 'kregg') {
      const c = count(p >= 3 ? 12 : 8);
      if (this.attackPhase % 2 === 0) {
        fireCircle(this.x, this.y, c, '#ff4444', p >= 3 ? 7 : 5);
        addEffect('shockwave', this.x, this.y, { color: '#ff4444', size: 50, life: 25 });
      } else {
        fireSpread(this.x, this.y, playerX, playerY, count(p >= 3 ? 5 : 3), '#ff2200', p >= 3 ? 12 : 14);
        addEffect('summon', playerX, playerY - 100, { color: '#ffaa00', size: 30, life: 20 });
      }
      if (p >= 4) {
        fireCircle(this.x, this.y, 16, '#ff0000', 8);
        fireSpread(this.x, this.y, playerX, playerY, 6, '#ff0000', 10);
        addEffect('slam', this.x, this.y, { color: '#ff0000', size: 100, life: 30 });
      }
      this.attackPhase++;
    } else if (t === 'thragg') {
      fireSpread(this.x, this.y, playerX, playerY, count(p >= 3 ? 7 : 5), '#ff1100', p >= 3 ? 12 : 16);
      const a = Math.atan2(playerY - this.y, playerX - this.x);
      spawnProj(this.x, this.y, Math.cos(a) * (p >= 3 ? 18 : 14), Math.sin(a) * (p >= 3 ? 18 : 14), 'ball', '#fff', p >= 3 ? 8 : 10);
      if (p >= 3) {
        fireCircle(this.x, this.y, count(10), '#ff0000', 6);
        addEffect('summon', this.x, this.y, { color: '#ff0000', size: 50, life: 15 });
      }
      if (p >= 4) {
        for (let i = 0; i < 3; i++) {
          const ai = a + (i - 1) * 0.4;
          spawnProj(this.x, this.y, Math.cos(ai) * 20, Math.sin(ai) * 20, 'ball', '#ff0000', 8);
        }
        fireCircle(this.x, this.y, 20, '#ff0000', 9);
        addEffect('slam', this.x, this.y, { color: '#ff0000', size: 120, life: 30 });
        addEffect('meteor', this.x + 100, 50, { color: '#ff4400', vx: -4, vy: 4, size: 20, life: 40 });
        addEffect('meteor', this.x - 100, 50, { color: '#ff4400', vx: 4, vy: 4, size: 20, life: 40 });
      }
      addEffect('dash', this.x, this.y, { color: '#ff1100', vx: (playerX - this.x) * 0.03, vy: (playerY - this.y) * 0.03, life: 20 });
    }

    if (projectiles.length === 0 && effects.length === 0) return null;
    return { projectiles, effects };
  }

  getPhaseName() {
    return PHASE_NAMES[this.phase] || '';
  }

  getPhaseColor() {
    return PHASE_COLORS[this.phase] || '#ff6600';
  }

  getHpPercent() {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }

  toDTO() {
    return { type:this.type, x:this.x, y:this.y, hp:this.hp, maxHp:this.maxHp, phase:this.phase, stunned:this.stunned, stunTimer:this.stunTimer, entered:this.entered, name:this.name, attackInterval:this.attackInterval };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Boss;
}
if (typeof window !== 'undefined') window.Boss = Boss;
