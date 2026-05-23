/**
 * Мини-боссы Конквест и Трэгг из оригинального кода
 */

// Типы мини-боссов с правильными очками
const MINI_BOSS_TYPES = [
    { 
        name: 'КОНКВЕСТ', 
        color: '#aa44ff', 
        size: 80, 
        hp: 15, 
        speed: 2.5, 
        reward: 300, // Правильные очки
        pattern: 'orbit', 
        imgKey: 'mb_guard' 
    },
    { 
        name: 'ТРЭГГ', 
        color: '#ff6600', 
        size: 70, 
        hp: 10, 
        speed: 4, 
        reward: 1000, // Правильные очки
        pattern: 'zigzag', 
        imgKey: 'mb_hunter' 
    },
    { 
        name: 'БОМБАРДИР', 
        color: '#ff2244', 
        size: 90, 
        hp: 20, 
        speed: 1.5, 
        reward: 500, 
        pattern: 'shoot', 
        imgKey: 'mb_bomber' 
    }
];

// Класс мини-босса
class MiniBoss {
    constructor(type) {
        Object.assign(this, type);
        this.maxHp = this.hp;
        this.x = Math.random() * GAME_WIDTH;
        this.y = -80;
        this.timer = 0;
        this.shootTimer = 0;
        this.angle = 0;
        this.phase = 0;
        this.hitFlash = 0;
        this.statusEffects = {};
    }
    
    update() {
        this.timer++;
        
        // Движение к игроку
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 100) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        }
        
        // Паттерны атаки
        switch(this.pattern) {
            case 'orbit':
                this.orbitPattern();
                break;
            case 'zigzag':
                this.zigzagPattern();
                break;
            case 'shoot':
                this.shootPattern();
                break;
        }
        
        // Обновление эффектов
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }
        
        // Обновление статус-эффектов
        if (typeof updateStatusEffects === 'function') {
            updateStatusEffects(this);
        }
    }
    
    orbitPattern() {
        // Движение по орбите
        this.angle += 0.05;
        const orbitRadius = 80;
        const targetX = player.x + Math.cos(this.angle) * orbitRadius;
        const targetY = player.y + Math.sin(this.angle) * orbitRadius;
        
        this.x += (targetX - this.x) * 0.1;
        this.y += (targetY - this.y) * 0.1;
    }
    
    zigzagPattern() {
        // Z-образное движение
        this.angle += 0.1;
        const zigzagRadius = 60;
        const targetX = player.x + Math.cos(this.angle) * zigzagRadius;
        const targetY = player.y + Math.sin(this.angle * 2) * zigzagRadius * 0.5;
        
        this.x += (targetX - this.x) * 0.15;
        this.y += (targetY - this.y) * 0.15;
    }
    
    shootPattern() {
        // Стрельба по игроку
        this.shootTimer++;
        if (this.shootTimer > 90) {
            this.shootTimer = 0;
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            
            // Создаем пулю
            const bullet = {
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * 6,
                vy: Math.sin(angle) * 6,
                damage: 2,
                radius: 4,
                life: 120,
                isEnemy: true
            };
            
            if (!window.enemyBullets) {
                window.enemyBullets = [];
            }
            window.enemyBullets.push(bullet);
        }
    }
    
    takeDamage(damage) {
        this.hp -= damage;
        this.hitFlash = 8;
        
        // Эффект попадания
        if (typeof spawnParticles === 'function') {
            spawnParticles(this.x, this.y, 5, [this.color || '#ffffff'], 3, 2, 15);
        }
        
        if (this.hp <= 0) {
            this.onDeath();
        }
    }
    
    onDeath() {
        // Начисление очков
        if (typeof addScore === 'function') {
            addScore(this.reward);
        }
        
        // Эффект взрыва
        if (typeof spawnExplosion === 'function') {
            spawnExplosion(this.x, this.y, [this.color || '#aa44ff', '#ffffff']);
        }
        
        // Эффекты камеры
        if (typeof addShake === 'function') {
            addShake(15, 25);
        }
    }
    
    render(ctx) {
        ctx.save();
        
        // Эффект попадания
        if (this.hitFlash > 0) {
            ctx.globalAlpha = 0.5 + (this.hitFlash / 8) * 0.5;
        }
        
        // Отрисовка босса
        if (images[this.imgKey] && images[this.imgKey].complete) {
            ctx.drawImage(
                images[this.imgKey], 
                -this.size/2, 
                -this.size/2, 
                this.size, 
                this.size
            );
        } else {
            // Запасной вариант - цветная фигура
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Отрисовка здоровья
        if (this.hp < this.maxHp) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(
                -this.size/2,
                -this.size/2 - 15,
                this.size * (this.hp / this.maxHp),
                5
            );
        }
        
        // Отрисовка статус-эффектов
        this.renderStatusEffects(ctx);
        
        ctx.restore();
    }
    
    renderStatusEffects(ctx) {
        let yOffset = -this.size/2 - 30;
        
        Object.keys(this.statusEffects).forEach((effectType, index) => {
            const effect = this.statusEffects[effectType];
            const statusEffect = STATUS_EFFECTS[effectType];
            
            if (statusEffect) {
                ctx.fillStyle = statusEffect.color;
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(statusEffect.icon, 0, yOffset - index * 20);
            }
        });
    }
}

// Функция спавна мини-боссов
function spawnMiniBoss() {
    const type = MINI_BOSS_TYPES[Math.floor(Math.random() * MINI_BOSS_TYPES.length)];
    const boss = new MiniBoss(type);
    
    miniBosses.push(boss);
    
    // Эффект появления
    if (typeof addShake === 'function') {
        addShake(10, 20);
    }
    
    if (typeof spawnParticles === 'function') {
        spawnParticles(boss.x, boss.y, 20, [boss.color, '#ffffff'], 8, 4, 30);
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MINI_BOSS_TYPES,
        MiniBoss,
        spawnMiniBoss
    };
}
