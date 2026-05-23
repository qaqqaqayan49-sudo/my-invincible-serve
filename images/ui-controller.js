/**
 * UI контроллер из оригинального кода
 */

// Глобальные переменные UI
let isPaused = false;
let bossLoaderActive = false;
let coins = 0;

// Система управления UI
class UIController {
    constructor() {
        this.elements = {};
        this.initializeElements();
        this.setupEventListeners();
    }
    
    /**
     * Инициализация элементов UI
     */
    initializeElements() {
        // Основные элементы
        this.elements.hpBar = document.getElementById('hp-bar');
        this.elements.scoreDisplay = document.getElementById('score');
        this.elements.waveDisplay = document.getElementById('wave');
        this.elements.rageBar = document.getElementById('rage-bar');
        this.elements.xpBar = document.getElementById('xp-bar');
        this.elements.levelDisplay = document.getElementById('level');
        
        // Модальные окна
        this.elements.deathScreen = document.getElementById('death-screen');
        this.elements.pauseOverlay = document.getElementById('pause-overlay');
        this.elements.upgradeOverlay = document.getElementById('upgrade-overlay');
        
        // Кнопки
        this.elements.startButton = document.getElementById('start-button');
        this.elements.shopButton = document.getElementById('shop-button');
    }
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.togglePause();
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleShop();
            }
        });
        
        // Кнопки
        if (this.elements.startButton) {
            this.elements.startButton.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        if (this.elements.shopButton) {
            this.elements.shopButton.addEventListener('click', () => {
                this.toggleShop();
            });
        }
    }
    
    /**
     * Обновление здоровья игрока
     */
    updateHealth() {
        if (!this.elements.hpBar) return;
        
        this.elements.hpBar.innerHTML = '';
        for (let i = 1; i <= player.maxHp; i++) {
            const heart = document.createElement('div');
            heart.className = i > player.hp ? 'heart empty' : 'heart';
            this.elements.hpBar.appendChild(heart);
        }
    }
    
    /**
     * Обновление очков
     */
    updateScore() {
        if (this.elements.scoreDisplay) {
            this.elements.scoreDisplay.textContent = `Очки: ${score}`;
        }
    }
    
    /**
     * Обновление волны
     */
    updateWave() {
        if (this.elements.waveDisplay) {
            this.elements.waveDisplay.textContent = `Волна: ${wave}`;
        }
    }
    
    /**
     * Обновление ярости
     */
    updateRage() {
        if (!this.elements.rageBar) return;
        
        const ragePercent = (player.rage / 100) * 100;
        this.elements.rageBar.style.width = `${ragePercent}%`;
        
        // Изменение цвета при активной ярости
        if (player.isRage) {
            this.elements.rageBar.style.background = 'linear-gradient(90deg, #ff0000, #ff6600)';
        } else {
            this.elements.rageBar.style.background = 'linear-gradient(90deg, #ff6600, #ffaa00)';
        }
    }
    
    /**
     * Обновление опыта и уровня
     */
    updateXP() {
        if (!this.elements.xpBar || !this.elements.levelDisplay) return;
        
        const xpPercent = (player.xp / player.xpToNext) * 100;
        this.elements.xpBar.style.width = `${xpPercent}%`;
        this.elements.levelDisplay.textContent = `Уровень: ${player.level}`;
        
        // Проверка повышения уровня
        if (player.xp >= player.xpToNext) {
            this.levelUp();
        }
    }
    
    /**
     * Повышение уровня
     */
    levelUp() {
        player.level++;
        player.xp -= player.xpToNext;
        player.xpToNext = Math.floor(player.xpToNext * 1.3);
        player.hp = player.maxHp;
        
        // Показать выбор улучшений
        if (typeof upgradeSystem !== 'undefined' && upgradeSystem.showUpgradeSelection) {
            upgradeSystem.showUpgradeSelection();
        }
        
        // Эффекты
        this.showNotification(`Уровень ${player.level}!`, '⭐');
        if (typeof spawnParticles === 'function') {
            spawnParticles(player.x, player.y, 20, ['#00ff00', '#ffffff'], 8, 40, 12);
        }
    }
    
    /**
     * Переключение паузы
     */
    togglePause() {
        if (gameState !== 'playing') return;
        
        isPaused = !isPaused;
        
        if (isPaused) {
            this.showPauseOverlay();
        } else {
            this.hidePauseOverlay();
        }
    }
    
    /**
     * Показать оверлей паузы
     */
    showPauseOverlay() {
        if (!this.elements.pauseOverlay) {
            this.createPauseOverlay();
        }
        this.elements.pauseOverlay.style.display = 'flex';
        
        // Trigger fade-in animation
        this.elements.pauseOverlay.style.opacity = '0';
        this.elements.pauseOverlay.style.transform = 'scale(0.9)';
        requestAnimationFrame(() => {
            this.elements.pauseOverlay.style.opacity = '1';
            this.elements.pauseOverlay.style.transform = 'scale(1)';
        });
    }
    
    /**
     * Скрыть оверлей паузы
     */
    hidePauseOverlay() {
        if (this.elements.pauseOverlay) {
            this.elements.pauseOverlay.style.display = 'none';
        }
    }
    
    /**
     * Создание оверлея паузы
     */
    createPauseOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'pause-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            opacity: 0;
            transform: scale(0.9);
            transition: opacity 0.25s ease, transform 0.25s ease;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <h1 style="font-size: 48px; margin-bottom: 20px; color: #FFD700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">ПАУЗА</h1>
                <p style="font-size: 24px; color: #ccc;">Нажми ESC для продолжения</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.elements.pauseOverlay = overlay;
    }
    
    /**
     * Показать экран смерти
     */
    showDeathScreen() {
        if (!this.elements.deathScreen) {
            this.createDeathScreen();
        }
        
        this.elements.deathScreen.querySelector('#death-score').textContent = `${score} очков`;
        
        const highScore = parseInt(localStorage.getItem('highScore') || '0', 10) || 0;
        const isNewRecord = score >= highScore;
        
        this.elements.deathScreen.querySelector('#death-hs').textContent = 
            isNewRecord ? '🏆 НОВЫЙ РЕКОРД!' : `Рекорд: ${highScore}`;
        
        this.elements.deathScreen.style.display = 'flex';
        
        // Сохранение рекорда
        if (isNewRecord) {
            localStorage.setItem('highScore', score.toString());
        }
    }
    
    /**
     * Создание экрана смерти
     */
    createDeathScreen() {
        const screen = document.createElement('div');
        screen.id = 'death-screen';
        screen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        screen.innerHTML = `
            <div style="text-align: center; color: white; background: rgba(0, 0, 0, 0.8); padding: 40px; border-radius: 20px; border: 2px solid #ff0000;">
                <h1 style="font-size: 48px; margin-bottom: 20px; color: #ff0000;">ИГРА ОКОНЧЕНА</h1>
                <p style="font-size: 24px; margin-bottom: 10px;">Очки: <span id="death-score">0</span></p>
                <p style="font-size: 20px; color: #FFD700;" id="death-hs">Рекорд: 0</p>
                <button onclick="location.reload()" style="
                    background: #ff0000;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    font-size: 18px;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 20px;
                ">Начать заново</button>
            </div>
        `;
        
        document.body.appendChild(screen);
        this.elements.deathScreen = screen;
    }
    
    /**
     * Переключение магазина
     */
    toggleShop() {
        if (typeof upgradeSystem !== 'undefined' && upgradeSystem) {
            if (upgradeSystem.isShopOpen) {
                upgradeSystem.closeShop();
            } else {
                upgradeSystem.openShop();
            }
        }
    }
    
    /**
     * Показать уведомление
     */
    showNotification(message, icon = '') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00ff00, #00aa00);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 1001;
            box-shadow: 0 5px 15px rgba(0, 255, 0, 0.3);
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">${icon}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Автоматическое скрытие
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    /**
     * Обновление всего UI
     */
    update() {
        this.updateHealth();
        this.updateScore();
        this.updateWave();
        this.updateRage();
        this.updateXP();
    }
    
    /**
     * Сброс UI
     */
    reset() {
        score = 0;
        wave = 1;
        coins = 0;
        isPaused = false;
        bossLoaderActive = false;
        
        this.update();
        this.hidePauseOverlay();
        
        if (this.elements.deathScreen) {
            this.elements.deathScreen.style.display = 'none';
        }
    }
}

// Глобальный экземпляр
let uiController;

// Функции для совместимости с оригинальным кодом
function updateHearts() {
    if (uiController) {
        uiController.updateHealth();
    }
}

function showNotification(message, icon = '') {
    if (uiController) {
        uiController.showNotification(message, icon);
    }
}

function showDeathScreen() {
    if (uiController) {
        uiController.showDeathScreen();
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UIController,
        uiController,
        updateHearts,
        showNotification,
        showDeathScreen
    };
}
