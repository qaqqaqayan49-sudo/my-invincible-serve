/**
 * Оптимизированная система синергий между способностями
 */
class SynergySystem {
    constructor() {
        this.activeSynergies = [];
        this.chainLightningCooldown = 0;
        this.megaExplosionCooldown = 0;
        this.lastUpdate = 0;
        this.updateInterval = 1000 / 60; // 60 FPS
    }
    
    /**
     * Проверка синергий с оптимизацией
     */
    checkSynergy(type, context) {
        const now = Date.now();
        
        // Оптимизация: проверяем не чаще чем раз в 100мс
        if (now - this.lastUpdate < 100) return;
        
        this.lastUpdate = now;
        
        switch(type) {
            case 'dash':
                this.checkDashSynergy(context);
                break;
            case 'lightning':
                this.checkLightningSynergy(context);
                break;
            case 'explosion':
                this.checkExplosionSynergy(context);
                break;
        }
    }
    
    /**
     * Синергия Dash + Lightning = Chain Attack
     */
    checkDashSynergy(context) {
        if (player.hasChainLightning && this.chainLightningCooldown <= 0) {
            this.createChainLightning(context.x, context.y);
            this.chainLightningCooldown = 120; // 2 секунды
        }
        
        if (player.hasLightningDash) {
            this.createLightningTrail(context.x, context.y);
        }
    }
    
    /**
     * Синергия Lightning + Chain Attack
     */
    checkLightningSynergy(context) {
        if (player.hasChainLightning && this.chainLightningCooldown <= 0) {
            this.createChainLightning(context.x, context.y);
            this.chainLightningCooldown = 120;
        }
    }
    
    /**
     * Создание цепной молнии (оптимизировано)
     */
    createChainLightning(x, y) {
        const chainTargets = [];
        const maxChains = 5;
        const chainRange = 200;
        
        // Оптимизация: используем spatial hashing для поиска врагов
        const nearbyEnemies = this.getNearbyEnemies(x, y, chainRange);
        
        // Сортируем по расстоянию
        nearbyEnemies.sort((a, b) => {
            const distA = Math.hypot(a.x - x, a.y - y);
            const distB = Math.hypot(b.x - x, b.y - y);
            return distA - distB;
        });
        
        // Берем ближайших
        const targets = nearbyEnemies.slice(0, maxChains);
        
        // Создаем цепь
        let currentX = x;
        let currentY = y;
        
        targets.forEach((target, index) => {
            // Визуальный эффект молнии
            this.createLightningBolt(currentX, currentY, target.x, target.y);
            
            // Урон по цели
            target.hp--;
            target.hitFlash = 8;
            OptimizedParticles.createImpactEffect(target.x, target.y, '#00ffff', 'small');
            
            // Дополнительные эффекты
            if (index === 0) {
                camera.addShake(10, 15, 0.4);
            }
            
            // Следующая цель
            currentX = target.x;
            currentY = target.y;
            
            // Проверяем уничтожение
            if (target.hp <= 0) {
                const index = enemies.indexOf(target);
                if (index > -1) {
                    enemies.splice(index, 1);
                    addScore(target.scoreValue || 100);
                    player.rage = Math.min(100, player.rage + 5);
                }
            }
        });
    }
    
    /**
     * Электрический след рывка
     */
    createLightningTrail(x, y) {
        for (let i = 0; i < 3; i++) {
            const particle = particlePool.get();
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30;
            
            particle.x = x + Math.cos(angle) * distance;
            particle.y = y + Math.sin(angle) * distance;
            particle.vx = (Math.random() - 0.5) * 4;
            particle.vy = (Math.random() - 0.5) * 4;
            particle.life = 30;
            particle.maxLife = 30;
            particle.size = 3 + Math.random() * 3;
            particle.color = '#00ffff';
            particle.type = 'electric';
            particle.active = true;
            
            particlePool.active.push(particle);
        }
    }
    
    /**
     * Создание визуального эффекта молнии
     */
    createLightningBolt(x1, y1, x2, y2) {
        const segments = 8;
        const points = [{x: x1, y: y1}];
        
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 20;
            const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 20;
            points.push({x, y});
        }
        points.push({x: x2, y: y2});
        
        // Создаем частицы молнии
        for (let i = 0; i < points.length - 1; i++) {
            const particle = particlePool.get();
            particle.x = points[i].x;
            particle.y = points[i].y;
            particle.vx = 0;
            particle.vy = 0;
            particle.life = 10;
            particle.maxLife = 10;
            particle.size = 2;
            particle.color = '#00ffff';
            particle.type = 'electric';
            particle.data = { endX: points[i + 1].x, endY: points[i + 1].y };
            particle.active = true;
            
            particlePool.active.push(particle);
        }
    }
    
    /**
     * Синергия Rage + Explosion = Huge AOE
     */
    checkExplosionSynergy(context) {
        if (player.hasMegaExplosion && player.isRage && this.megaExplosionCooldown <= 0) {
            this.createMegaExplosion(context.x, context.y);
            this.megaExplosionCooldown = 180; // 3 секунды
        }
    }
    
    /**
     * Создание мега-взрыва
     */
    createMegaExplosion(x, y) {
        const hugeRadius = 400;
        const damageWaves = 3;
        
        // Создаем несколько волн взрыва
        for (let wave = 0; wave < damageWaves; wave++) {
            setTimeout(() => {
                const currentRadius = (hugeRadius / damageWaves) * (wave + 1);
                
                // Визуальный эффект волны
                const particle = particlePool.get();
                particle.x = x;
                particle.y = y;
                particle.vx = 0;
                particle.vy = 0;
                particle.life = 20;
                particle.maxLife = 20;
                particle.size = currentRadius;
                particle.color = wave === 0 ? '#ff0000' : wave === 1 ? '#ff6600' : '#ffaa00';
                particle.type = 'shockwave';
                particle.scale = 0.1;
                particle.expansionRate = currentRadius / 20;
                particle.active = true;
                
                particlePool.active.push(particle);
                
                // Наносим урон врагам в радиусе
                const nearbyEnemies = this.getNearbyEnemies(x, y, currentRadius);
                
                nearbyEnemies.forEach(enemy => {
                    const dist = Math.hypot(enemy.x - x, enemy.y - y);
                    if (dist < currentRadius) {
                        const damage = Math.ceil((1 - dist / currentRadius) * 3);
                        enemy.hp -= damage;
                        enemy.hitFlash = 8;
                        
                        // Отбрасывание от центра
                        const angle = Math.atan2(enemy.y - y, enemy.x - x);
                        const knockback = (1 - dist / currentRadius) * 10;
                        enemy.x += Math.cos(angle) * knockback;
                        enemy.y += Math.sin(angle) * knockback;
                        
                        OptimizedParticles.createImpactEffect(enemy.x, enemy.y, '#ff6600', 'medium');
                    }
                });
                
                // Удаляем уничтоженных врагов
                for (let i = enemies.length - 1; i >= 0; i--) {
                    if (enemies[i].hp <= 0) {
                        OptimizedParticles.spawnExplosion(enemies[i].x, enemies[i].y, [enemies[i].color || '#ff88ff', '#ffffff'], 1.2);
                        addScore(enemies[i].scoreValue || 100);
                        player.rage = Math.min(100, player.rage + 8);
                        enemies.splice(i, 1);
                    }
                }
                
                camera.addShake(20 + wave * 5, 30, 0.3 + wave * 0.1);
            }, wave * 100);
        }
        
        // Центральный взрыв
        OptimizedParticles.spawnExplosion(x, y, ['#ff0000', '#ff6600', '#ffaa00', '#ffffff'], 2);
    }
    
    /**
     * Получение ближайших врагов (spatial hashing оптимизация)
     */
    getNearbyEnemies(x, y, radius) {
        const nearby = [];
        const radiusSq = radius * radius;
        
        for (let enemy of enemies) {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < radiusSq) {
                nearby.push(enemy);
            }
        }
        
        return nearby;
    }
    
    /**
     * Обновление кулдаунов синергий
     */
    update() {
        if (this.chainLightningCooldown > 0) this.chainLightningCooldown--;
        if (this.megaExplosionCooldown > 0) this.megaExplosionCooldown--;
    }
    
    /**
     * Сброс всех синергий
     */
    reset() {
        this.activeSynergies = [];
        this.chainLightningCooldown = 0;
        this.megaExplosionCooldown = 0;
    }
    
    /**
     * Получение активных синергий
     */
    getActiveSynergies() {
        return this.activeSynergies;
    }
}
