/**
 * Оптимизированный класс врага
 */
class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.setupType();
        this.hitFlash = 0;
        this.isDead = false;
    }
    
    setupType() {
        const types = {
            basic: {
                hp: 1,
                speed: 2,
                radius: 15,
                color: '#ff4444',
                scoreValue: 100,
                damage: 1
            },
            fast: {
                hp: 1,
                speed: 4,
                radius: 12,
                color: '#44ff44',
                scoreValue: 150,
                damage: 1
            },
            tank: {
                hp: 3,
                speed: 1,
                radius: 20,
                color: '#4444ff',
                scoreValue: 200,
                damage: 2
            },
            shooter: {
                hp: 2,
                speed: 1.5,
                radius: 18,
                color: '#ffff44',
                scoreValue: 175,
                damage: 1,
                shootCooldown: 0,
                shootRate: 120
            }
        };
        
        const config = types[this.type] || types.basic;
        Object.assign(this, config);
        this.maxHp = this.hp;
    }
    
    update(deltaTime) {
        // Движение к игроку
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        
        // Стрельба (для стрелков)
        if (this.type === 'shooter') {
            this.shootCooldown--;
            if (this.shootCooldown <= 0 && distance < 300) {
                this.shoot();
                this.shootCooldown = this.shootRate;
            }
        }
        
        // Обновление эффектов
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }
        
        // Проверка выхода за границы
        this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));
    }
    
    shoot() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        
        const bullet = {
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * 5,
            vy: Math.sin(angle) * 5,
            damage: this.damage,
            radius: 4,
            life: 120,
            isEnemy: true
        };
        
        // Добавляем в глобальный массив пуль врагов
        if (!window.enemyBullets) {
            window.enemyBullets = [];
        }
        window.enemyBullets.push(bullet);
    }
    
    takeDamage(damage) {
        this.hp -= damage;
        this.hitFlash = 8;
        
        // Эффект попадания
        OptimizedParticles.createImpactEffect(this.x, this.y, this.color, 'small');
        
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

/**
 * Фабрика врагов для оптимизации
 */
class EnemyFactory {
    static createEnemy(x, y, wave = 1) {
        const types = ['basic', 'fast', 'tank', 'shooter'];
        const weights = [
            Math.max(0.1, 0.5 - wave * 0.05), // basic
            Math.max(0.05, 0.3 - wave * 0.03), // fast
            Math.max(0.02, 0.15 - wave * 0.02), // tank
            Math.max(0.01, 0.05 - wave * 0.01)  // shooter
        ];
        
        // Выбор типа с учетом весов
        const random = Math.random();
        let cumulative = 0;
        let selectedType = 'basic';
        
        for (let i = 0; i < types.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                selectedType = types[i];
                break;
            }
        }
        
        return new Enemy(x, y, selectedType);
    }
    
    static createWave(wave, count) {
        const enemies = [];
        
        for (let i = 0; i < count; i++) {
            const x = Math.random() * GAME_WIDTH;
            const y = -50 - Math.random() * 200;
            enemies.push(this.createEnemy(x, y, wave));
        }
        
        return enemies;
    }
}
