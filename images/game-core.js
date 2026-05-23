/**
 * Основной игровой движок - оптимизированная версия
 */
class GameCore {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 800;
        this.height = 600;
        this.fps = 60;
        this.frameCount = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Инициализация глобальных переменных
        window.GAME_WIDTH = this.width;
        window.GAME_HEIGHT = this.height;
        window.gameState = 'menu';
        window.isPaused = false;
        window.score = 0;
        window.wave = 1;
        window.enemies = [];
        window.enemyBullets = [];
        window.particles = [];
        
        // Системы игры
        this.cameraSystem = new CameraSystem();
        window.camera = this.cameraSystem;
        
        this.synergySystem = new SynergySystem();
        window.synergySystem = this.synergySystem;
        
        this.upgradeSystem = new UpgradeSystem();
        window.upgradeSystem = this.upgradeSystem;
        
        // Игровые объекты
        this.player = new Player(this.width / 2, this.height / 2);
        window.player = this.player;
        
        this.init();
    }
    
    init() {
        // Инициализация canvas
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Загрузка изображений
        this.loadImages();
        
        // Установка обработчиков событий
        this.setupEventListeners();
        
        // Инициализация игрока
        this.player = new Player(this.width / 2, this.height / 2);
        
        // Запуск игрового цикла
        this.startGameLoop();
    }
    
    loadImages() {
        const imageSources = {
            player: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            enemy: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            // Другие изображения...
        };
        
        this.images = {};
        let loadedCount = 0;
        const totalImages = Object.keys(imageSources).length;
        
        for (let [key, src] of Object.entries(imageSources)) {
            const img = new Image();
            img.onload = () => {
                loadedCount++;
                if (loadedCount === totalImages) {
                    this.onImagesLoaded();
                }
            };
            img.src = src;
            this.images[key] = img;
        }
    }
    
    onImagesLoaded() {
        console.log('Все изображения загружены');
        this.gameState = 'menu';
    }
    
    setupEventListeners() {
        // Управление клавиатурой
        this.keys = {};
        
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === 'Escape') {
                this.togglePause();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Управление мышью
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'playing') {
                this.player.shoot();
            }
        });
    }
    
    startGameLoop() {
        const gameLoop = (currentTime) => {
            this.deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            
            this.update(this.deltaTime);
            this.render();
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
    
    update(deltaTime) {
        if (this.isPaused || this.gameState !== 'playing') return;
        
        // Обновление игрока
        this.player.update(this.keys, deltaTime);
        
        // Обновление врагов (оптимизировано)
        this.updateEnemies(deltaTime);
        
        // Обновление систем
        this.particleSystem.updateParticles();
        this.cameraSystem.update();
        this.synergySystem.update();
        
        // Проверка коллизий (оптимизирована)
        this.checkCollisions();
        
        // Обновление UI
        this.updateUI();
        
        this.frameCount++;
    }
    
    updateEnemies(deltaTime) {
        // Оптимизация: обновляем врагов не каждый кадр
        if (this.frameCount % 2 === 0) {
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                enemy.update(deltaTime);
                
                if (enemy.isDead) {
                    this.onEnemyDeath(enemy);
                    this.enemies.splice(i, 1);
                }
            }
        }
    }
    
    checkCollisions() {
        // Оптимизированная проверка коллизий
        const playerBullets = this.player.bullets;
        
        for (let i = playerBullets.length - 1; i >= 0; i--) {
            const bullet = playerBullets[i];
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                
                if (this.checkCollision(bullet, enemy)) {
                    enemy.takeDamage(bullet.damage);
                    playerBullets.splice(i, 1);
                    break;
                }
            }
        }
        
        // Проверка коллизий игрока с врагами
        for (let enemy of this.enemies) {
            if (this.checkCollision(this.player, enemy)) {
                this.player.takeDamage(enemy.damage);
            }
        }
    }
    
    checkCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < obj1.radius + obj2.radius;
    }
    
    onEnemyDeath(enemy) {
        this.score += enemy.score;
        this.particleSystem.spawnExplosion(enemy.x, enemy.y, enemy.colors);
        
        // Шанс выпадения апгрейда
        if (Math.random() < 0.1) {
            this.spawnUpgrade(enemy.x, enemy.y);
        }
    }
    
    spawnUpgrade(x, y) {
        // Логика спавна апгрейдов
    }
    
    render() {
        // Очистка canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        if (this.gameState === 'menu') {
            this.renderMenu();
        } else if (this.gameState === 'playing') {
            this.renderGame();
        } else if (this.gameState === 'paused') {
            this.renderGame();
            this.renderPauseOverlay();
        } else if (this.gameState === 'gameOver') {
            this.renderGameOver();
        }
    }
    
    renderGame() {
        this.ctx.save();
        
        // Применение камеры
        this.cameraSystem.apply(this.ctx);
        
        // Отрисовка фона
        this.renderBackground();
        
        // Отрисовка игровых объектов
        this.renderEnemies();
        this.renderPlayer();
        this.renderProjectiles();
        this.renderParticles();
        
        this.ctx.restore();
        
        // Отрисовка UI
        this.renderUI();
    }
    
    renderBackground() {
        // Оптимизированный рендеринг фона
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#0a0a0a');
        gradient.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    renderPlayer() {
        this.player.render(this.ctx);
    }
    
    renderEnemies() {
        for (let enemy of this.enemies) {
            enemy.render(this.ctx);
        }
    }
    
    renderProjectiles() {
        for (let projectile of this.projectiles) {
            projectile.render(this.ctx);
        }
    }
    
    renderParticles() {
        this.particleSystem.drawParticles();
    }
    
    renderUI() {
        // Отрисовка интерфейса
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        this.ctx.fillText(`Wave: ${this.wave}`, 10, 50);
        this.ctx.fillText(`FPS: ${Math.round(1000 / this.deltaTime)}`, 10, 70);
    }
    
    renderMenu() {
        // Отрисовка меню
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SPACE SHOOTER', this.width / 2, this.height / 2 - 50);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Press SPACE to Start', this.width / 2, this.height / 2 + 50);
    }
    
    renderPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);
    }
    
    renderGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 50);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 50);
        this.ctx.fillText('Press SPACE to Restart', this.width / 2, this.height / 2 + 100);
    }
    
    updateUI() {
        // Обновление UI элементов
        document.getElementById('score').textContent = this.score;
        document.getElementById('wave').textContent = this.wave;
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.isPaused = !this.isPaused;
            this.gameState = this.isPaused ? 'paused' : 'playing';
        }
    }
    
    startNewGame() {
        this.gameState = 'playing';
        this.isPaused = false;
        this.score = 0;
        this.wave = 1;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.player.reset();
        this.spawnWave();
    }
    
    spawnWave() {
        const enemyCount = 5 + this.wave * 2;
        
        for (let i = 0; i < enemyCount; i++) {
            const x = Math.random() * this.width;
            const y = -50 - Math.random() * 200;
            const type = this.getRandomEnemyType();
            
            this.enemies.push(new Enemy(x, y, type));
        }
    }
    
    getRandomEnemyType() {
        const types = ['basic', 'fast', 'tank', 'shooter'];
        const weights = [0.5, 0.3, 0.15, 0.05];
        
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < types.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return types[i];
            }
        }
        
        return 'basic';
    }
    
    // Оптимизированный метод для очистки памяти
    cleanup() {
        this.particleSystem.clear();
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
    }
}

// Глобальный экземпляр игры
let game;
