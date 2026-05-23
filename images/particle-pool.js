/**
 * Оптимизированная система частиц с Object Pooling
 * Устраняет проблему постоянного создания/удаления объектов
 */
class ParticlePool {
    constructor() {
        this.pool = [];
        this.active = [];
        this.maxSize = 500; // Максимальное количество частиц
    }
    
    /**
     * Получить частицу из пула
     */
    get() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        
        // Создаем новую частицу только если нет в пуле
        return {
            x: 0, y: 0,
            vx: 0, vy: 0,
            life: 0, maxLife: 0,
            size: 0,
            color: '#ffffff',
            type: 'dot',
            rotation: 0,
            rotationSpeed: 0,
            scale: 1,
            gravity: 0,
            active: false
        };
    }
    
    /**
     * Вернуть частицу в пул
     */
    release(particle) {
        if (this.pool.length < this.maxSize) {
            // Сбрасываем частицу к состоянию по умолчанию
            particle.active = false;
            particle.life = 0;
            particle.x = 0;
            particle.y = 0;
            particle.vx = 0;
            particle.vy = 0;
            
            this.pool.push(particle);
        }
    }
    
    /**
     * Очистить все активные частицы
     */
    clear() {
        for (let particle of this.active) {
            this.release(particle);
        }
        this.active.length = 0;
    }
    
    /**
     * Получить количество активных частиц
     */
    getActiveCount() {
        return this.active.length;
    }
}

// Глобальный экземпляр пула частиц
const particlePool = new ParticlePool();

/**
 * Оптимизированные функции для работы с частицами
 */
class OptimizedParticles {
    /**
     * Создать частицы через пул
     */
    static spawnParticles(x, y, count, colors, speed, size, life, type = 'dot') {
        for (let i = 0; i < count; i++) {
            const particle = particlePool.get();
            const angle = Math.random() * Math.PI * 2;
            const velocity = speed + Math.random() * speed;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Настраиваем частицу
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle) * velocity;
            particle.vy = Math.sin(angle) * velocity;
            particle.life = life;
            particle.maxLife = life;
            particle.size = size;
            particle.color = color;
            particle.type = type;
            particle.rotation = Math.random() * Math.PI * 2;
            particle.rotationSpeed = (Math.random() - 0.5) * 0.2;
            particle.scale = 1;
            particle.gravity = type === 'debris' ? 0.3 : 0;
            particle.active = true;
            
            // Добавляем в активные
            particlePool.active.push(particle);
        }
    }
    
    /**
     * Оптимизированный взрыв
     */
    static spawnExplosion(x, y, colors, intensity = 1) {
        const count = Math.floor(20 * intensity);
        
        // Основные частицы
        this.spawnParticles(x, y, count, colors, 8, 6, 40, 'explosion');
        
        // Ударная волна
        this.createShockwave(x, y, colors[0]);
    }
    
    /**
     * Ударная волна
     */
    static createShockwave(x, y, color) {
        const particle = particlePool.get();
        particle.x = x;
        particle.y = y;
        particle.vx = 0;
        particle.vy = 0;
        particle.life = 15;
        particle.maxLife = 15;
        particle.size = 10;
        particle.color = color;
        particle.type = 'shockwave';
        particle.scale = 0.1;
        particle.expansionRate = 15;
        particle.active = true;
        
        particlePool.active.push(particle);
    }
    
    /**
     * Эффект попадания
     */
    static createImpactEffect(x, y, color, size = 'medium') {
        const sizes = { small: 8, medium: 12, large: 20 };
        const particleCount = sizes[size] || 12;
        
        // Основной удар
        this.spawnParticles(x, y, particleCount, [color, '#ffffff'], 6, 3, 25, 'impact');
        
        // Искры
        for (let i = 0; i < 6; i++) {
            const particle = particlePool.get();
            const angle = (i / 6) * Math.PI * 2;
            
            particle.x = x + Math.cos(angle) * 12;
            particle.y = y + Math.sin(angle) * 12;
            particle.vx = Math.cos(angle) * 12;
            particle.vy = Math.sin(angle) * 12;
            particle.life = 30;
            particle.maxLife = 30;
            particle.size = 2;
            particle.color = '#ffff00';
            particle.type = 'spark';
            particle.gravity = 0.2;
            particle.active = true;
            
            particlePool.active.push(particle);
        }
    }
    
    /**
     * Частицы статус-эффектов
     */
    static createStatusEffectParticles(x, y, effectType) {
        const effects = {
            burn: {
                colors: ['#ff6600', '#ff9900', '#ffff00'],
                count: 3, speed: 2, size: 4, life: 20
            },
            poison: {
                colors: ['#00ff00', '#00cc00', '#009900'],
                count: 2, speed: 1.5, size: 3, life: 25
            },
            slow: {
                colors: ['#00ccff', '#0099ff', '#0066ff'],
                count: 4, speed: 1, size: 5, life: 30, type: 'ice'
            },
            stun: {
                colors: ['#ffff00', '#ffffcc', '#ffffff'],
                count: 5, speed: 3, size: 3, life: 15, type: 'electric'
            }
        };
        
        const config = effects[effectType];
        if (config) {
            this.spawnParticles(x, y, config.count, config.colors, config.speed, config.size, config.life, config.type || 'dot');
        }
    }
    
    /**
     * След рывка
     */
    static createDashTrail(x, y) {
        const particle = particlePool.get();
        particle.x = x + (Math.random() - 0.5) * 10;
        particle.y = y + (Math.random() - 0.5) * 10;
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = (Math.random() - 0.5) * 2;
        particle.life = 20;
        particle.maxLife = 20;
        particle.size = 15 + Math.random() * 10;
        particle.color = '#00ccaa';
        particle.type = 'dashTrail';
        particle.active = true;
        
        particlePool.active.push(particle);
    }
    
    /**
     * Обновление всех частиц
     */
    static updateParticles() {
        for (let i = particlePool.active.length - 1; i >= 0; i--) {
            const p = particlePool.active[i];
            
            // Базовая физика
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.92;
            p.vy *= 0.92;
            
            // Гравитация
            if (p.gravity) {
                p.vy += p.gravity;
            }
            
            // Специфические типы
            if (p.type === 'shockwave') {
                p.scale += p.expansionRate * 0.1;
                p.size += p.expansionRate * 0.5;
            } else if (p.type === 'trail') {
                p.size *= 0.95;
            } else if (p.type === 'spark') {
                p.vx *= 0.98;
                p.vy *= 0.98;
            }
            
            // Вращение
            if (p.rotation !== undefined) {
                p.rotation += p.rotationSpeed || 0;
            }
            
            p.life--;
            if (p.life <= 0) {
                // Возвращаем в пул вместо splice
                particlePool.release(p);
                particlePool.active.splice(i, 1);
            }
        }
    }
    
    /**
     * Отрисовка частиц
     */
    static drawParticles() {
        for (let particle of particlePool.active) {
            const alpha = particle.life / particle.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            
            if (particle.type === 'shockwave') {
                // Ударная волна
                ctx.strokeStyle = particle.color;
                ctx.lineWidth = 3 * alpha;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.stroke();
            } else if (particle.type === 'trail') {
                // След рывка
                const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size);
                gradient.addColorStop(0, particle.color);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            } else if (particle.type === 'spark') {
                // Искры
                ctx.shadowBlur = 10;
                ctx.shadowColor = particle.color;
                ctx.fillStyle = particle.color;
                ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
            } else if (particle.type === 'ice') {
                // Ледяные частицы
                ctx.fillStyle = particle.color;
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation || 0);
                ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
                ctx.restore();
            } else if (particle.type === 'electric') {
                // Электрические частицы
                ctx.strokeStyle = particle.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(particle.x + particle.vx * 2, particle.y + particle.vy * 2);
                ctx.stroke();
            } else if (particle.type === 'dashTrail') {
                // След рывка с градиентом
                const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size);
                gradient.addColorStop(0, particle.color);
                gradient.addColorStop(0.5, '#00ccaa');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * alpha * particle.scale, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Стандартные частицы
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * particle.scale, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        }
    }
    
    /**
     * Очистка всех частиц
     */
    static clear() {
        particlePool.clear();
    }
}
