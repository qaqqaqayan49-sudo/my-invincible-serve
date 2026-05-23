// Player.js — pure game logic, no browser APIs, no canvas
// Compatible with both Node (CommonJS) and browser (ESM)

var GAME_WIDTH = 1200;
var GAME_HEIGHT = 900;
const DASH_SPEED = 16;
const DASH_DURATION = 14;

class Player {
  constructor(options = {}) {
    this.x = options.x ?? 600;
    this.y = options.y ?? 700;
    this.targetX = options.targetX ?? 600;
    this.targetY = options.targetY ?? 700;
    this.angle = options.angle ?? 0;
    this.hp = options.hp ?? 3;
    this.maxHp = options.maxHp ?? 3;
    this.invulnerable = options.invulnerable ?? 0;
    this.rage = options.rage ?? 0;
    this.isRage = options.isRage ?? false;
    this.level = options.level ?? 1;
    this.xp = options.xp ?? 0;
    this.xpToNext = options.xpToNext ?? 80;
    this.dashCooldown = options.dashCooldown ?? 0;
    this.dashCooldownMax = options.dashCooldownMax ?? 50;
    this.dashDmg = options.dashDmg ?? 1;
    this.dashRadius = options.dashRadius ?? 70;
    this.projectileBlock = options.projectileBlock ?? false;
    this.isDashing = options.isDashing ?? false;
    this.dashTimer = options.dashTimer ?? 0;
    this.dashVX = options.dashVX ?? 0;
    this.dashVY = options.dashVY ?? 0;
  }

  get hitboxRadius() {
    return 20;
  }

  update() {
    const events = {};

    if (this.invulnerable > 0) this.invulnerable--;
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.dashTimer > 0) {
      this.dashTimer--;
      if (this.dashTimer <= 0) this.isDashing = false;
    }

    if (this.isDashing) {
      this.x += this.dashVX;
      this.y += this.dashVY;
    } else {
      const lerpSpeed = 0.035;
      this.x += (this.targetX - this.x) * lerpSpeed;
      this.y += (this.targetY - this.y) * lerpSpeed;
    }

    const margin = 40;
    this.x = Math.max(margin, Math.min(GAME_WIDTH - margin, this.x));
    this.y = Math.max(margin, Math.min(GAME_HEIGHT - margin, this.y));

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    if (Math.hypot(dx, dy) > 5) {
      const targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
      this.angle += (targetAngle - this.angle) * 0.15;
    }

    if (this.rage >= 100 && !this.isRage) {
      this.isRage = true;
      events.rageActivated = true;
    }
    if (this.isRage) {
      this.rage -= 0.4;
      this.invulnerable = 2;
      if (this.rage <= 0) {
        this.rage = 0;
        this.isRage = false;
        events.rageDeactivated = true;
      }
    }

    return events;
  }

  startDash(targetX, targetY) {
    if (this.dashCooldown > 0) return false;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.dashVX = (dx / len) * DASH_SPEED;
    this.dashVY = (dy / len) * DASH_SPEED;
    this.isDashing = true;
    this.dashTimer = DASH_DURATION;
    this.dashCooldown = this.dashCooldownMax;
    return true;
  }

  takeDamage(amount = 1) {
    if (this.invulnerable > 0 || this.isRage) return null;
    this.hp -= amount;
    this.invulnerable = 60;
    if (this.hp <= 0) {
      this.hp = 0;
      return { killed: true, hp: 0 };
    }
    return { killed: false, hp: this.hp };
  }

  heal(amount = 1) {
    const healed = Math.min(amount, this.maxHp - this.hp);
    if (healed <= 0) return 0;
    this.hp += healed;
    return healed;
  }

  addRage(amount) {
    this.rage = Math.min(100, this.rage + amount);
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  distanceTo(x, y) {
    return Math.hypot(this.x - x, this.y - y);
  }

  isCollidingWith(x, y, otherRadius) {
    return this.distanceTo(x, y) < this.hitboxRadius + (otherRadius || 0);
  }

  toDTO() {
    return { x:this.x, y:this.y, hp:this.hp, maxHp:this.maxHp, angle:this.angle, level:this.level, xp:this.xp, isDashing:this.isDashing, isRage:this.isRage };
  }

  addXp(amount) {
    this.xp += amount;
    let count = 0;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(this.xpToNext * 1.25 + 10);
      count++;
    }
    return { leveledUp: count > 0, times: count, level: this.level };
  }

  applyLevelUpBonus(bonusIndex) {
    const bonuses = [
      () => { this.maxHp++; this.hp = Math.min(this.hp + 1, this.maxHp); return { type: 'maxhp', text: '❤️ +1 Жизнь' }; },
      () => { this.dashCooldownMax = Math.max(15, this.dashCooldownMax - 6); return { type: 'dashCd', text: '⚡ Рывок быстрее' }; },
      () => { this.dashRadius += 15; return { type: 'dashRadius', text: '💥 Радиус рывка +15' }; },
      () => { return { type: 'ability', index: 0, label: 'cd', text: '🛡️ Щит дольше и CD−' }; },
      () => { return { type: 'ability', index: 1, label: 'cd', text: '⚡ Молния CD−' }; },
      () => { return { type: 'ability', index: 1, label: 'range', text: '⚡ Радиус молнии +40' }; },
      () => { return { type: 'ability', index: 2, label: 'cd', text: '💣 Взрыв CD−' }; },
      () => { this.dashRadius += 20; this.dashDmg += 0.5; return { type: 'dashDmg', text: '💥 Рывок сильнее +радиус' }; },
      () => { this.maxHp++; this.hp = Math.min(this.hp + 1, this.maxHp); return { type: 'maxhp', text: '❤️ +1 Жизнь' }; },
      () => { return { type: 'ability', index: 0, label: 'cd_and_duration', text: '🛡️ Щит ещё быстрее' }; },
    ];
    const idx = (bonusIndex != null)
      ? bonusIndex
      : ((this.level - 2 + bonuses.length) % bonuses.length);
    return bonuses[idx]();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Player;
}
if (typeof window !== 'undefined') window.Player = Player;
