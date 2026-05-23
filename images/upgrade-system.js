/**
 * Оптимизированная система апгрейдов при level up
 */
class UpgradeSystem {
    constructor() {
        this.upgrades = [
            // Оружие и урон
            {
                id: 'damage_boost',
                name: 'Усиление урона',
                description: 'Увеличивает урон на 25%',
                icon: '⚔️',
                apply: () => { player.damageMultiplier = (player.damageMultiplier || 1) * 1.25; }
            },
            {
                id: 'fire_rate',
                name: 'Быстрый рывок',
                description: 'Уменьшает кулдаун рывка на 30%',
                icon: '�',
                apply: () => { player.dashCooldownMax = Math.max(10, (player.dashCooldownMax || 50) * 0.7); }
            },
            {
                id: 'multishot',
                name: 'Расширенный рывок',
                description: 'Увеличивает радиус рывка на 20px',
                icon: '🌀',
                apply: () => { player.dashRadius = (player.dashRadius || 70) + 20; }
            },
            
            // Защита и здоровье
            {
                id: 'health_boost',
                name: 'Дополнительное здоровье',
                description: 'Увеличивает максимальное здоровье на 1',
                icon: '❤️',
                apply: () => { 
                    player.maxHp++;
                    player.hp++;
                    updateHearts();
                }
            },
            {
                id: 'shield',
                name: 'Силовой удар',
                description: 'Урон рывка +1',
                icon: '🛡️',
                apply: () => { player.dashDmg = (player.dashDmg || 1) + 1; }
            },
            {
                id: 'regeneration',
                name: 'Регенерация',
                description: 'Восстанавливает 1 HP в секунду',
                icon: '💚',
                apply: () => { player.regen = (player.regen || 0) + 1; }
            },
            
            // Мобильность
            {
                id: 'speed_boost',
                name: 'Ускорение',
                description: 'Увеличивает скорость на 20%',
                icon: '👟',
                apply: () => { player.speed *= 1.2; }
            },
            {
                id: 'dash_improvement',
                name: 'Улучшенный рывок',
                description: 'Рывок наносит урон и имеет меньший кулдаун',
                icon: '💨',
                apply: () => { 
                    player.dashDamage = true;
                    player.dashCooldownMax = Math.max(10, player.dashCooldownMax * 0.8);
                }
            },
            {
                id: 'dash_radius',
                name: 'Расширение рывка',
                description: 'Увеличивает радиус рывка на 50%',
                icon: '🌀',
                apply: () => { player.dashRadius *= 1.5; }
            },
            
            // Способности
            {
                id: 'lightning_cooldown',
                name: 'Быстрая молния',
                description: 'Уменьшает кулдаун молнии на 30%',
                icon: '⚡',
                apply: () => { 
                    if (ABILITIES[1]) ABILITIES[1].cooldown *= 0.7;
                }
            },
            {
                id: 'explosion_power',
                name: 'Мощный взрыв',
                description: 'Увеличивает длительность оглушения взрыва на 50%',
                icon: '💥',
                apply: () => { player.explosionStunDuration = (player.explosionStunDuration || 150) * 1.5; }
            },
            {
                id: 'rage_duration',
                name: 'Длительная ярость',
                description: 'Увеличивает длительность ярости на 50%',
                icon: '😠',
                apply: () => { player.rageDuration = (player.rageDuration || 300) * 1.5; }
            },
            
            // Синергии
            {
                id: 'chain_lightning',
                name: 'Цепная молния',
                description: 'Рывок и молния создают цепную атаку',
                icon: '⚡',
                synergy: true,
                apply: () => { player.hasChainLightning = true; }
            },
            {
                id: 'mega_explosion',
                name: 'Мега-взрыв',
                description: 'Ярость + взрыв = огромная AOE атака',
                icon: '🔥',
                synergy: true,
                apply: () => { player.hasMegaExplosion = true; }
            },
            {
                id: 'lightning_dash',
                name: 'Электрический рывок',
                description: 'Рывок оставляет электрический след',
                icon: '⚡',
                synergy: true,
                apply: () => { player.hasLightningDash = true; }
            },
            {
                id: 'rage_amplifier',
                name: 'Усиление ярости',
                description: 'Ярость дает +50% урона',
                icon: '🔥',
                synergy: true,
                apply: () => { player.rageDamageBonus = 0.5; }
            }
        ];
        
        this.availableUpgrades = [];
        this.selectedUpgrades = [];
        this.isShowing = false;
    }
    
    /**
     * Получение случайных апгрейдов для выбора
     */
    getRandomUpgrades(count = 3) {
        const available = this.upgrades.filter(upgrade => {
            return !this.selectedUpgrades.includes(upgrade.id);
        });
        
        const shuffled = available.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }
    
    /**
     * Показать выбор апгрейдов (оптимизировано)
     */
    showUpgradeSelection() {
        if (this.isShowing) return;
        this.isShowing = true;
        
        const upgrades = this.getRandomUpgrades(3);
        
        // Используем DocumentFragment для оптимизации DOM
        const fragment = document.createDocumentFragment();
        
        const overlay = document.createElement('div');
        overlay.id = 'upgrade-selection';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            font-family: 'Courier New', monospace;
        `;
        
        // Создаем HTML для карточек
        const cardsHTML = upgrades.map((upgrade, index) => `
            <div class="upgrade-card" data-index="${index}" style="
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border: 2px solid ${upgrade.synergy ? '#FFD700' : '#444'};
                border-radius: 10px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 200px;
                max-width: 250px;
                position: relative;
                overflow: hidden;
            ">
                ${upgrade.synergy ? '<div style="position: absolute; top: 5px; right: 5px; background: #FFD700; color: #000; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">СИНЕРГИЯ</div>' : ''}
                <div style="font-size: 32px; margin-bottom: 10px;">${upgrade.icon}</div>
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #fff;">
                    ${upgrade.name}
                </div>
                <div style="font-size: 12px; color: #aaa; line-height: 1.4;">
                    ${upgrade.description}
                </div>
            </div>
        `).join('');
        
        overlay.innerHTML = `
            <div style="text-align: center; color: white; max-width: 900px; padding: 20px;">
                <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #FFD700;">
                    ⭐ LEVEL UP! ⭐
                </div>
                <div style="font-size: 18px; margin-bottom: 30px; color: #ccc;">
                    Выберите улучшение (Уровень ${player.level})
                </div>
                <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                    ${cardsHTML}
                </div>
            </div>
        `;
        
        fragment.appendChild(overlay);
        document.body.appendChild(fragment);
        
        // Trigger fade-in animation
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.style.transform = 'scale(1)';
        });
        
        // Добавляем стили для hover эффекта
        const style = document.createElement('style');
        style.textContent = `
            .upgrade-card:hover {
                transform: translateY(-5px);
                border-color: #FFD700 !important;
                box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
        
        // Оптимизированные обработчики событий
        const handleClick = (e) => {
            const card = e.target.closest('.upgrade-card');
            if (card) {
                const index = parseInt(card.dataset.index);
                this.selectUpgrade(upgrades[index]);
                
                // Очистка
                overlay.remove();
                style.remove();
                this.isShowing = false;
            }
        };
        
        overlay.addEventListener('click', handleClick);
        
        // Ставим игру на паузу
        isPaused = true;
    }
    
    /**
     * Применить выбранный апгрейд
     */
    selectUpgrade(upgrade) {
        upgrade.apply();
        this.selectedUpgrades.push(upgrade.id);
        
        // Показываем эффект
        if (camera) {
            camera.addShake(20, 25, 0.5);
        }
        
        OptimizedParticles.spawnExplosion(GAME_WIDTH/2, GAME_HEIGHT/2, ['#FFD700', '#FFA500', '#FFF'], 1.2);
        
        // Сообщение о полученном апгрейде
        this.showUpgradeNotification(upgrade);
        
        // Возобновляем игру
        isPaused = false;
    }
    
    /**
     * Показать уведомление о полученном апгрейде
     */
    showUpgradeNotification(upgrade) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #000;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 1001;
            box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">${upgrade.icon}</span>
                <div>
                    <div style="font-size: 14px; font-weight: bold;">${upgrade.name}</div>
                    <div style="font-size: 12px; opacity: 0.8;">Получено!</div>
                </div>
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
     * Сброс системы апгрейдов
     */
    reset() {
        this.selectedUpgrades = [];
        this.availableUpgrades = [];
        this.isShowing = false;
    }
    
    /**
     * Получение выбранных апгрейдов
     */
    getSelectedUpgrades() {
        return this.selectedUpgrades;
    }
    
    /**
     * Проверка доступности апгрейда
     */
    isUpgradeAvailable(upgradeId) {
        return !this.selectedUpgrades.includes(upgradeId);
    }
}
