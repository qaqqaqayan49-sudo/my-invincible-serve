/**
 * Оптимизированный класс игрока
 */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.radius = 20;
        this.hp = 3;
        this.maxHp = 3;
        this.angle = 0;
        this.fireRate = 10;
        this.lastShot = 0;
        this.bullets = [];
        this.damageMultiplier = 1;
        this.multishot = 1;
        this.shield = 0;
        this.regen = 0;
        this.dashCooldown = 0;
        this.dashCooldownMax = 60;
        this.dashRadius = 50;
        this.dashDamage = false;
        this.isDashing = false;
        this.invulnerable = 0;
        this.rage = 0;
        this.rageDuration = 300;
        this.isRage = false;
        this.rageDamageBonus = 0;
        this.explosionDamage = 1;
        this.hasChainLightning = false;
        this.hasMegaExplosion = false;
        this.hasLightningDash = false;
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 500;
        this.score = 0;
    }
    
    update(keys, deltaTime) {
        // Движение
        if (keys['ArrowLeft'] || keys['a']) {
            this.vx = -this.speed;
        } else if (keys['ArrowRight'] || keys['d']) {
            this.vx = this.speed;
        } else {
            this.vx *= 0.9;
        }
        
        if (keys['ArrowUp'] || keys['w']) {
            this.vy = -this.speed;
        } else if (keys['ArrowDown'] || keys['s']) {
            this.vy = this.speed;
        } else {
            this.vy *= 0.9;
        }
        
        // Обновление позиции
        this.x += this.vx;
        this.y += this.vy;
        
        // Ограничение движения
        this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));
        
        // Обновление угла
        if (this.vx !== 0 || this.vy !== 0) {
            this.angle = Math.atan2(this.vy, this.vx);
        }
        
        // Стрельба
        if (keys[' '] && Date.now() - this.lastShot > this.fireRate * 16) {
            this.shoot();
            this.lastShot = Date.now();
        }
        
        // Рывок
        if ((keys['Shift'] || keys['x']) && this.dashCooldown <= 0) {
            this.dash();
        }
        
        // Обновление кулдаунов
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.invulnerable > 0) this.invulnerable--;
        
        // Регенерация
        if (this.regen > 0 && this.hp < this.maxHp) {
            if (Date.now() % 60 === 0) {
                this.hp = Math.min(this.maxHp, this.hp + this.regen);
            }
        }
        
        // Ярость
        if (this.rage >= 100 && !this.isRage) {
            this.activateRage();
        }
        
        if (this.isRage) {
            this.rageDuration--;
            if (this.rageDuration <= 0) {
                this.deactivateRage();
            }
        }
        
        // Обновление пуль
        this.updateBullets();
    }
    
    shoot() {
        const baseAngle = this.angle;
        const spread = Math.PI / 8;
        
        for (let i = 0; i < this.multishot; i++) {
            const angle = baseAngle + (i - (this.multishot - 1) / 2) * spread;
            const bullet = {
                x: this.x + Math.cos(angle) * 30,
                y: this.y + Math.sin(angle) * 30,
                vx: Math.cos(angle) * 10,
                vy: Math.sin(angle) * 10,
                damage: 1 * this.damageMultiplier,
                radius: 5,
                life: 60
            };
            this.bullets.push(bullet);
        }
        
        // Эффект выстрела
        OptimizedParticles.spawnParticles(this.x, this.y, 3, ['#ffffff', '#00ffff'], 3, 2, 15, 'dot');
    }
    
    dash() {
        this.isDashing = true;
        this.dashCooldown = this.dashCooldownMax;
        this.invulnerable = 20;
        
        // Эффект рывка
        OptimizedParticles.createDashTrail(this.x, this.y);
        
        // Урон при рывке
        if (this.dashDamage) {
            // Проверка попадания по врагам
            for (let enemy of enemies) {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < this.dashRadius) {
                    enemy.hp -= 2;
                    enemy.hitFlash = 8;
                    OptimizedParticles.createImpactEffect(enemy.x, enemy.y, '#00ffff', 'small');
                }
            }
        }
        
        // Проверка синергий
        if (synergySystem) {
            synergySystem.checkSynergy('dash', {x: this.x, y: this.y});
        }
        
        setTimeout(() => {
            this.isDashing = false;
        }, 200);
    }
    
    activateRage() {
        this.isRage = true;
        this.rageDuration = 300;
        this.speed *= 1.5;
        this.damageMultiplier *= 1.5;
        
        // Визуальный эффект
        OptimizedParticles.spawnParticles(this.x, this.y, 10, ['#ff0000', '#ff6600'], 5, 8, 30, 'dot');
    }
    
    deactivateRage() {
        this.isRage = false;
        this.rage = 0;
        this.speed /= 1.5;
        this.damageMultiplier /= 1.5;
    }
    
    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.life--;
            
            // Удаление пуль вне экрана
            if (bullet.x < 0 || bullet.x > GAME_WIDTH || 
                bullet.y < 0 || bullet.y > GAME_HEIGHT || 
                bullet.life <= 0) {
                this.bullets.splice(i, 1);
            }
        }
    }
    
    takeDamage(damage) {
        if (this.invulnerable > 0) return;
        
        if (this.shield > 0) {
            this.shield--;
            OptimizedParticles.createImpactEffect(this.x, this.y, '#00ff00', 'medium');
            return;
        }
        
        this.hp -= damage;
        this.invulnerable = 60;
        
        // Эффект попадания
        OptimizedParticles.createImpactEffect(this.x, this.y, '#ff0000', 'large');
        
        if (this.hp <= 0) {
            this.die();
        }
    }
    
    die() {
        // Эффект смерти
        OptimizedParticles.spawnExplosion(this.x, this.y, ['#ff0000', '#ff6600', '#ffffff'], 2);
        
        // Конец игры
        gameState = 'gameOver';
    }
    
    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        OptimizedParticles.spawnParticles(this.x, this.y, 5, ['#00ff00', '#ffffff'], 2, 4, 20, 'dot');
    }
    
    addRage(amount) {
        this.rage = Math.min(100, this.rage + amount);
    }
    
    addXP(amount) {
        this.xp += amount;
        
        while (this.xp >= this.xpToNext) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.xp -= this.xpToNext;
        this.xpToNext = Math.floor(this.xpToNext * 1.3);
        
        // Восстановление здоровья
        this.hp = this.maxHp;
        
        // Показываем выбор апгрейдов
        if (upgradeSystem) {
            upgradeSystem.showUpgradeSelection();
        }
    }
    
    render(ctx) {
        ctx.save();
        
        // Неуязвимость (мигание)
        if (this.invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }
        
        // Эффект ярости
        if (this.isRage) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff0000';
        }
        
        // Эффект рывка
        if (this.isDashing) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ffff';
        }
        
        // Отрисовка игрока
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Отрисовка направления
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.angle) * 30,
            this.y + Math.sin(this.angle) * 30
        );
        ctx.stroke();
        
        ctx.restore();
        
        // Отрисовка пуль
        this.renderBullets(ctx);
    }
    
    renderBullets(ctx) {
        ctx.fillStyle = '#00ff00';
        for (let bullet of this.bullets) {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    reset() {
        this.x = GAME_WIDTH / 2;
        this.y = GAME_HEIGHT / 2;
        this.vx = 0;
        this.vy = 0;
        this.hp = this.maxHp;
        this.bullets = [];
        this.rage = 0;
        this.isRage = false;
        this.dashCooldown = 0;
        this.invulnerable = 0;
        this.shield = 0;
    }
}
