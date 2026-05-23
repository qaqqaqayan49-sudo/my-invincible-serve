/**
 * Обработчик ввода из оригинального кода
 */

// Глобальные переменные для ввода
let keys = {};
let mousePos = { x: 0, y: 0 };
let isMouseDown = false;

// Система обработки ввода
class InputHandler {
    constructor() {
        this.setupEventListeners();
        this.initializeState();
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            this.handleKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            keys[e.key] = false;
            this.handleKeyUp(e);
        });
        
        // Мышь
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                mousePos.x = e.clientX - rect.left;
                mousePos.y = e.clientY - rect.top;
                this.handleMouseMove(e);
            });
            
            canvas.addEventListener('mousedown', (e) => {
                isMouseDown = true;
                this.handleMouseDown(e);
            });
            
            canvas.addEventListener('mouseup', (e) => {
                isMouseDown = false;
                this.handleMouseUp(e);
            });
            
            canvas.addEventListener('click', (e) => {
                this.handleClick(e);
            });
            
            // Предотвращение контекстного меню
            canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        }
        
        // Prevent default для клавиш
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab', 'Escape', '1', '2', '3', '4', '5'].includes(e.key)) {
                e.preventDefault();
            }
        });
    }
    
    /**
     * Инициализация состояния
     */
    initializeState() {
        // Сброс всех клавиш
        keys = {};
        
        // Начальная позиция мыши
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            mousePos.x = rect.width / 2;
            mousePos.y = rect.height / 2;
        }
        
        isMouseDown = false;
    }
    
    /**
     * Обработка нажатия клавиши
     */
    handleKeyDown(e) {
        // Способности (цифры)
        if (e.key >= '1' && e.key <= '5') {
            const abilityIndex = parseInt(e.key) - 1;
            if (typeof synergySystem !== 'undefined' && synergySystem.useAbility) {
                synergySystem.useAbility(abilityIndex);
            }
        }
        
        // Специальные действия
        switch(e.key) {
            case 'Escape':
                if (typeof uiController !== 'undefined' && uiController.togglePause) {
                    uiController.togglePause();
                }
                break;
            case 'Tab':
                if (typeof uiController !== 'undefined' && uiController.toggleShop) {
                    e.preventDefault();
                    uiController.toggleShop();
                }
                break;
            case ' ':
                // Атака ближнего боя
                if (typeof meleeCombat !== 'undefined' && meleeCombat.performAttack) {
                    meleeCombat.performAttack();
                }
                break;
        }
    }
    
    /**
     * Обработка отпускания клавиши
     */
    handleKeyUp(e) {
        // Дополнительная логика при отпускании клавиш
        switch(e.key) {
            case ' ':
                // Логика для удержания атаки
                break;
        }
    }
    
    /**
     * Обработка движения мыши
     */
    handleMouseMove(e) {
        // Обновление угла игрока для поворота к мыши
        if (player && gameState === 'playing') {
            const dx = mousePos.x - player.x;
            const dy = mousePos.y - player.y;
            player.angle = Math.atan2(dy, dx);
        }
    }
    
    /**
     * Обработка нажатия мыши
     */
    handleMouseDown(e) {
        // Логика для зажатой кнопки мыши
        if (e.button === 0) { // Левая кнопка
            // Можно добавить логику для автоповторения атаки
        }
    }
    
    /**
     * Обработка отпускания мыши
     */
    handleMouseUp(e) {
        // Логика при отпускании кнопки мыши
        if (e.button === 0) { // Левая кнопка
            // Можно добавить логику для разовой атаки
        }
    }
    
    /**
     * Обработка клика мыши
     */
    handleClick(e) {
        // Основная атака по клику
        if (gameState === 'playing') {
            if (typeof meleeCombat !== 'undefined' && meleeCombat.performAttack) {
                meleeCombat.performAttack();
            }
        }
    }
    
    /**
     * Получение состояния клавиши
     */
    isKeyPressed(key) {
        return keys[key] || false;
    }
    
    /**
     * Получение состояния мыши
     */
    getMousePosition() {
        return { ...mousePos };
    }
    
    /**
     * Получение состояния кнопки мыши
     */
    isMouseButtonDown(button = 0) {
        return isMouseDown;
    }
    
    /**
     * Сброс состояния ввода
     */
    reset() {
        this.initializeState();
    }
    
    /**
     * Обновление (для плавной обработки)
     */
    update() {
        // Постоянная обработка ввода
        this.processContinuousInput();
    }
    
    /**
     * Обработка постоянного ввода
     */
    processContinuousInput() {
        if (gameState !== 'playing' || !player) return;
        
        // Движение
        let dx = 0, dy = 0;
        const speed = player.speed || 5;
        
        if (keys['ArrowLeft'] || keys['a']) {
            dx = -speed;
        }
        if (keys['ArrowRight'] || keys['d']) {
            dx = speed;
        }
        if (keys['ArrowUp'] || keys['w']) {
            dy = -speed;
        }
        if (keys['ArrowDown'] || keys['s']) {
            dy = speed;
        }
        
        // Обновление позиции игрока
        if (dx !== 0 || dy !== 0) {
            const dist = Math.hypot(dx, dy);
            player.x += (dx / dist) * speed;
            player.y += (dy / dist) * speed;
            
            // Ограничение движения
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
                player.y = Math.max(20, Math.min(canvas.height - 20, player.y));
            }
        }
        
        // Рывок
        if ((keys['Shift'] || keys['x']) && player.dashCooldown <= 0 && !player.isDashing) {
            this.performDash();
        }
    }
    
    /**
     * Выполнение рывка
     */
    performDash() {
        if (!player || player.dashCooldown > 0 || player.isDashing) return;
        
        player.isDashing = true;
        player.dashCooldown = player.dashCooldownMax || 50;
        player.invulnerable = 15;
        
        // Вектор рывка к мыши
        const dx = mousePos.x - player.x;
        const dy = mousePos.y - player.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0) {
            player.dashVX = (dx / dist) * 15;
            player.dashVY = (dy / dist) * 15;
        } else {
            player.dashVX = 0;
            player.dashVY = 0;
        }
        
        // Эффекты
        if (typeof spawnParticles === 'function') {
            spawnParticles(player.x, player.y, 10, ['#00ffff', '#ffffff'], 4, 20, 8);
        }
        
        // Конец рывка
        setTimeout(() => {
            player.isDashing = false;
            player.dashVX = 0;
            player.dashVY = 0;
        }, 200);
    }
    
    /**
     * Получение направления движения
     */
    getMovementDirection() {
        let direction = { x: 0, y: 0 };
        
        if (keys['ArrowLeft'] || keys['a']) direction.x = -1;
        if (keys['ArrowRight'] || keys['d']) direction.x = 1;
        if (keys['ArrowUp'] || keys['w']) direction.y = -1;
        if (keys['ArrowDown'] || keys['s']) direction.y = 1;
        
        return direction;
    }
    
    /**
     * Проверка комбинации клавиш
     */
    checkKeyCombo(combo) {
        const currentKeys = Object.keys(keys).filter(key => keys[key]);
        return combo.every(key => currentKeys.includes(key));
    }
}

// Глобальный экземпляр
let inputHandler;

// Функции для совместимости с оригинальным кодом
function updatePlayer() {
    if (inputHandler) {
        inputHandler.update();
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        InputHandler,
        inputHandler,
        keys,
        mousePos,
        isMouseDown,
        updatePlayer
    };
}
