/**
 * Игровые сущности из оригинального кода (2.7k строк)
 */

// Игрок Марк из оригинального кода
let player = {
    x: 600, y: 450, targetX: 600, targetY: 450,
    angle: 0, isDashing: false, dashTimer: 0,
    hp: 3, maxHp: 3, invulnerable: 0,
    rage: 0, isRage: false,
    level: 1, xp: 0, xpToNext: 500,
    dashCooldown: 0,
    dashDmg: 1, dashRadius: 70, dashCooldownMax: 50,
    projectileBlock: false,
    // FIX: вектор рывка — куда летит игрок во время dash
    dashVX: 0, dashVY: 0,
    // Статус-эффекты
    statusEffects: {}
};

// Враги из оригинального кода
let enemies = [];
let miniBosses = [];

// Класс врага (из оригинального кода)
class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.setupType();
        this.hitFlash = 0;
        this.isDead = false;
        this.statusEffects = {};
    }
    
    setupType() {
        const types = {
            basic: { hp: 1, speed: 2, radius: 15, color: '#ff4444', score: 100 },
            fast: { hp: 1, speed: 4, radius: 12, color: '#44ff44', score: 150 },
            tank: { hp: 3, speed: 1, radius: 20, color: '#4444ff', score: 200 },
            shooter: { hp: 2, speed: 1.5, radius: 18, color: '#ffff44', score: 175 }
        };
        
        const config = types[this.type] || types.basic;
        Object.assign(this, config);
        this.maxHp = this.hp;
    }
    
    update() {
        // Движение к игроку
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        
        // Обновление эффектов
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }
        
        // Проверка выхода за границы
        this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));
    }
    
    takeDamage(damage) {
        this.hp -= damage;
        this.hitFlash = 8;
        
        // Эффект попадания
        if (typeof spawnParticles === 'function') {
            spawnParticles(this.x, this.y, 5, [this.color || '#ffffff'], 3, 2, 15);
        }
        
        if (this.hp <= 0) {
            this.isDead = true;
        }
    }
    
    render(ctx) {
        ctx.save();
        
        // Эффект попадания
        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.5 + (this.hitFlash / 8) * 0.5;
        }
        
        // Отрисовка врага
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Отрисовка здоровья (для танков)
        if (this.type === 'tank' && this.hp < this.maxHp) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(
                this.x - this.radius,
                this.y - this.radius - 10,
                this.radius * 2 * (this.hp / this.maxHp),
                3
            );
        }
        
        ctx.restore();
    }
}

// Статус-эффекты из оригинального кода
const STATUS_EFFECTS = {
    burn: { icon: '🔥', color: '#ff4400', damage: 1, interval: 30, duration: 300 },
    slow: { icon: '❄️', color: '#00ccff', speedMultiplier: 0.5, duration: 180 },
    stun: { icon: '⚡', color: '#ffaa00', duration: 120 },
    poison: { icon: '☠️', color: '#00ff00', damage: 2, interval: 60, duration: 240 }
};

function applyStatusEffect(target, effectType, customDuration = null) {
    if (!target.statusEffects) target.statusEffects = {};
    
    const effect = { ...STATUS_EFFECTS[effectType] };
    if (customDuration) effect.duration = customDuration;
    
    target.statusEffects[effectType] = {
        ...effect,
        timer: effect.duration,
        lastTick: effect.interval || 0
    };
}

function updateStatusEffects(target) {
    if (!target.statusEffects) return;
    
    Object.keys(target.statusEffects).forEach(effectType => {
        const effect = target.statusEffects[effectType];
        effect.timer--;
        
        // Обработка урона со временем (burn, poison)
        if ((effectType === 'burn' || effectType === 'poison') && effect.damage) {
            effect.lastTick--;
            if (effect.lastTick <= 0) {
                target.hp -= effect.damage;
                effect.lastTick = effect.interval;
                
                // Визуальный эффект
                if (typeof spawnParticles === 'function') {
                    spawnParticles(target.x, target.y, 2, [effect.color], 2, 3, 20);
                }
            }
        }
        
        // Удаление истекшего эффекта
        if (effect.timer <= 0) {
            delete target.statusEffects[effectType];
        }
    });
}

// Функции для совместимости с оригинальным кодом
function playerDie() {
    gameState = 'dead';
    isPaused = true;
    document.getElementById('death-score').innerText = score + ' очков';
    try {
        const hs = parseInt(localStorage.getItem('highScore') || '0', 10) || 0;
        document.getElementById('death-hs').innerText = score >= hs ? '🏆 НОВЫЙ РЕКОРД!' : 'Рекорд: ' + hs;
    } catch (e) {}
    document.getElementById('death-screen').style.display = 'block';
    for (let i = 0; i < 5; i++) setTimeout(() => spawnParticles(player.x, player.y, 20, ['#ff0000', '#cc0000', '#ff4400'], 12, 60, 10), i * 120);
}

function updateHearts() {
    const bar = document.getElementById('hp-bar');
    bar.innerHTML = '';
    for (let i = 1; i <= player.maxHp; i++) {
        const d = document.createElement('div');
        d.className = i > player.hp ? 'heart empty' : 'heart';
        bar.appendChild(d);
    }
}

function addScore(points) {
    score += points;
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        player,
        enemies,
        miniBosses,
        Enemy,
        STATUS_EFFECTS,
        applyStatusEffect,
        updateStatusEffects,
        playerDie,
        updateHearts,
        addScore
    };
}
