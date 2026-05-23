/**
 * Оптимизированная система камеры с следованием и shake эффектами
 */
class CameraSystem {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeFrequency = 0;
        this.followSpeed = 0.1;
        this.zoom = 1;
        this.targetZoom = 1;
        this.rotation = 0;
        this.targetRotation = 0;
        
        // Оптимизация: кэширование матриц трансформации
        this.transformMatrix = null;
        this.needsUpdate = true;
    }
    
    /**
     * Установка цели для следования камеры
     */
    setTarget(x, y, instant = false) {
        this.targetX = x;
        this.targetY = y;
        if (instant) {
            this.x = x;
            this.y = y;
            this.needsUpdate = true;
        }
    }
    
    /**
     * Добавление shake эффекта
     */
    addShake(intensity, duration = 30, frequency = 0.3) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
        this.shakeFrequency = frequency;
        this.needsUpdate = true;
    }
    
    /**
     * Обновление камеры (оптимизировано)
     */
    update() {
        let needsUpdate = false;
        
        // Плавное следование за целью
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            this.x += dx * this.followSpeed;
            this.y += dy * this.followSpeed;
            needsUpdate = true;
        }
        
        // Обновление shake эффекта
        if (this.shakeDuration > 0) {
            this.shakeDuration--;
            
            const shakeX = Math.sin(Date.now() * this.shakeFrequency) * this.shakeIntensity;
            const shakeY = Math.cos(Date.now() * this.shakeFrequency * 1.3) * this.shakeIntensity;
            
            if (Math.abs(shakeX - this.shakeX) > 0.1 || Math.abs(shakeY - this.shakeY) > 0.1) {
                this.shakeX = shakeX;
                this.shakeY = shakeY;
                needsUpdate = true;
            }
            
            // Затухание shake
            if (this.shakeDuration <= 0) {
                this.shakeIntensity *= 0.9;
                this.shakeX = 0;
                this.shakeY = 0;
                needsUpdate = true;
            }
        }
        
        // Обновление зума
        if (Math.abs(this.targetZoom - this.zoom) > 0.01) {
            this.zoom += (this.targetZoom - this.zoom) * 0.1;
            needsUpdate = true;
        }
        
        // Обновление вращения
        if (Math.abs(this.targetRotation - this.rotation) > 0.01) {
            this.rotation += (this.targetRotation - this.rotation) * 0.1;
            needsUpdate = true;
        }
        
        this.needsUpdate = this.needsUpdate || needsUpdate;
    }
    
    /**
     * Применение трансформации камеры к контексту
     */
    apply(ctx) {
        if (!this.needsUpdate && this.transformMatrix) {
            // Используем кэшированную матрицу
            ctx.setTransform(this.transformMatrix);
            return;
        }
        
        // Расчет центра канваса
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;
        
        // Применение трансформаций
        ctx.save();
        
        // Сначала перемещаем в центр
        ctx.translate(centerX, centerY);
        
        // Применяем зум
        ctx.scale(this.zoom, this.zoom);
        
        // Применяем вращение
        if (this.rotation !== 0) {
            ctx.rotate(this.rotation);
        }
        
        // Применяем shake эффект
        if (this.shakeDuration > 0) {
            ctx.translate(this.shakeX, this.shakeY);
        }
        
        // Перемещаем к позиции камеры
        ctx.translate(-this.x, -this.y);
        
        // Кэшируем матрицу трансформации
        this.transformMatrix = ctx.getTransform();
        this.needsUpdate = false;
    }
    
    /**
     * Сброс камеры
     */
    reset() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeFrequency = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.rotation = 0;
        this.targetRotation = 0;
        this.transformMatrix = null;
        this.needsUpdate = true;
    }
    
    /**
     * Преобразование мировых координат в экранные
     */
    worldToScreen(worldX, worldY) {
        const screenX = (worldX - this.x) * this.zoom + GAME_WIDTH / 2 + this.shakeX;
        const screenY = (worldY - this.y) * this.zoom + GAME_HEIGHT / 2 + this.shakeY;
        return { x: screenX, y: screenY };
    }
    
    /**
     * Преобразование экранных координат в мировые
     */
    screenToWorld(screenX, screenY) {
        const worldX = (screenX - GAME_WIDTH / 2 - this.shakeX) / this.zoom + this.x;
        const worldY = (screenY - GAME_HEIGHT / 2 - this.shakeY) / this.zoom + this.y;
        return { x: worldX, y: worldY };
    }
    
    /**
     * Проверка видимости объекта
     */
    isVisible(obj, margin = 100) {
        const screenPos = this.worldToScreen(obj.x, obj.y);
        const halfWidth = GAME_WIDTH / 2;
        const halfHeight = GAME_HEIGHT / 2;
        
        return screenPos.x > -margin && 
               screenPos.x < GAME_WIDTH + margin &&
               screenPos.y > -margin && 
               screenPos.y < GAME_HEIGHT + margin;
    }
    
    /**
     * Получение границ видимой области
     */
    getVisibleBounds() {
        const halfWidth = (GAME_WIDTH / 2) / this.zoom;
        const halfHeight = (GAME_HEIGHT / 2) / this.zoom;
        
        return {
            left: this.x - halfWidth,
            right: this.x + halfWidth,
            top: this.y - halfHeight,
            bottom: this.y + halfHeight
        };
    }
    
    /**
     * Установка зума
     */
    setZoom(zoom, instant = false) {
        this.targetZoom = Math.max(0.5, Math.min(2, zoom));
        if (instant) {
            this.zoom = this.targetZoom;
            this.needsUpdate = true;
        }
    }
    
    /**
     * Установка вращения
     */
    setRotation(rotation, instant = false) {
        this.targetRotation = rotation;
        if (instant) {
            this.rotation = this.targetRotation;
            this.needsUpdate = true;
        }
    }
    
    /**
     * Получение текущего состояния
     */
    getState() {
        return {
            x: this.x,
            y: this.y,
            zoom: this.zoom,
            rotation: this.rotation,
            shakeIntensity: this.shakeIntensity,
            shakeDuration: this.shakeDuration
        };
    }
}
