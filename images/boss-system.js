/**
 * Система управления босс-файтами
 * Отдельный модуль для управления состоянием boss fight без изменения существующей логики
 */
class BossSystem {
    constructor() {
        this.isActive = false;
        this.currentBoss = null;
        this.bossType = null;
    }

    /**
     * Проверить активен ли boss fight
     */
    isBossFightActive() {
        return this.isActive;
    }

    /**
     * Начать boss fight
     */
    startBossFight(bossType, bossData) {
        this.isActive = true;
        this.bossType = bossType;
        this.currentBoss = bossData;
        
        // Очистить обычных врагов при начале boss fight
        if (typeof enemies !== 'undefined') {
            enemies = [];
        }
        if (typeof miniBosses !== 'undefined') {
            miniBosses = [];
        }
        if (typeof projectiles !== 'undefined') {
            projectiles = [];
        }
    }

    /**
     * Завершить boss fight
     */
    endBossFight() {
        this.isActive = false;
        this.currentBoss = null;
        this.bossType = null;
    }

    /**
     * Получить текущего босса
     */
    getCurrentBoss() {
        return this.currentBoss;
    }

    /**
     * Получить тип босса
     */
    getBossType() {
        return this.bossType;
    }
}

// Глобальный экземпляр системы боссов
const bossSystem = new BossSystem();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BossSystem, bossSystem };
}
