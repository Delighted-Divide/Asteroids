class UI {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.highScore = localStorage.getItem('asteroidsHighScore') || 0;
        this.currentTheme = 'space';
        this.currentShip = 'classic';
        this.powerUps = {};
        this.initializeUI();
    }
    
    initializeUI() {
        this.updateHighScore();
        this.setupMenuButtons();
        this.setupThemeSelection();
        this.setupShipSelection();
        this.drawShipPreviews();
    }
    
    setupMenuButtons() {
        document.getElementById('startBtn').addEventListener('click', () => {
            this.hideAllMenus();
            window.game.start();
        });
        
        document.getElementById('themesBtn').addEventListener('click', () => {
            this.showMenu('themes-menu');
        });
        
        document.getElementById('shipsBtn').addEventListener('click', () => {
            this.showMenu('ships-menu');
            this.drawShipPreviews();
        });
        
        document.getElementById('controlsBtn').addEventListener('click', () => {
            this.showMenu('controls-menu');
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.hideAllMenus();
            window.game.resume();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.hideAllMenus();
            window.game.restart();
        });
        
        document.getElementById('mainMenuBtn').addEventListener('click', () => {
            this.showMenu('menu');
        });
        
        document.getElementById('mainMenuBtn2').addEventListener('click', () => {
            this.showMenu('menu');
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.hideAllMenus();
            window.game.restart();
        });
        
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showMenu('menu');
            });
        });
    }
    
    setupThemeSelection() {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.setTheme(theme);
                this.showMenu('menu');
            });
        });
    }
    
    setupShipSelection() {
        document.querySelectorAll('.ship-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const ship = e.currentTarget.dataset.ship;
                this.currentShip = ship;
                this.showMenu('menu');
            });
        });
    }
    
    drawShipPreviews() {
        const shipDesigns = {
            classic: [
                { x: 15, y: 0 },
                { x: -10, y: -10 },
                { x: -5, y: 0 },
                { x: -10, y: 10 }
            ],
            fighter: [
                { x: 20, y: 0 },
                { x: -10, y: -12 },
                { x: 0, y: -5 },
                { x: 0, y: 5 },
                { x: -10, y: 12 }
            ],
            speeder: [
                { x: 18, y: 0 },
                { x: -12, y: -8 },
                { x: -12, y: 8 }
            ],
            tank: [
                { x: 15, y: 0 },
                { x: 10, y: -10 },
                { x: -10, y: -10 },
                { x: -10, y: 10 },
                { x: 10, y: 10 }
            ]
        };
        
        document.querySelectorAll('.ship-preview').forEach(canvas => {
            const ctx = canvas.getContext('2d');
            const shipType = canvas.parentElement.dataset.ship;
            const design = shipDesigns[shipType];
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            ctx.strokeStyle = '#00ffff';
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffff';
            
            ctx.beginPath();
            ctx.moveTo(design[0].x, design[0].y);
            for (let i = 1; i < design.length; i++) {
                ctx.lineTo(design[i].x, design[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        });
    }
    
    setTheme(theme) {
        this.currentTheme = theme;
        const container = document.getElementById('gameContainer');
        
        const themes = {
            space: {
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0033 50%, #000011 100%)',
                shipColor: '#00ffff',
                bulletColor: '#ffff00',
                asteroidColor: '#888888',
                effectColor: '#ff6600'
            },
            neon: {
                background: 'linear-gradient(135deg, #0a0a2e 0%, #2e0a2e 50%, #2e0a0a 100%)',
                shipColor: '#ff00ff',
                bulletColor: '#00ff00',
                asteroidColor: '#ff00ff',
                effectColor: '#00ffff'
            },
            retro: {
                background: 'linear-gradient(135deg, #2d1b69 0%, #0f3057 50%, #1e5f74 100%)',
                shipColor: '#ff6b35',
                bulletColor: '#f7931e',
                asteroidColor: '#c9302c',
                effectColor: '#fdc830'
            },
            dark: {
                background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #0a0a0a 100%)',
                shipColor: '#ffffff',
                bulletColor: '#ffffff',
                asteroidColor: '#333333',
                effectColor: '#666666'
            }
        };
        
        const selectedTheme = themes[theme];
        container.style.background = selectedTheme.background;
        
        return selectedTheme;
    }
    
    getTheme() {
        const themes = {
            space: {
                shipColor: '#00ffff',
                shipFill: 'rgba(0, 255, 255, 0.2)',
                bulletColor: '#ffff00',
                asteroidColor: '#888888',
                effectColor: '#ff6600'
            },
            neon: {
                shipColor: '#ff00ff',
                shipFill: 'rgba(255, 0, 255, 0.2)',
                bulletColor: '#00ff00',
                asteroidColor: '#ff00ff',
                effectColor: '#00ffff'
            },
            retro: {
                shipColor: '#ff6b35',
                shipFill: 'rgba(255, 107, 53, 0.2)',
                bulletColor: '#f7931e',
                asteroidColor: '#c9302c',
                effectColor: '#fdc830'
            },
            dark: {
                shipColor: '#ffffff',
                shipFill: 'rgba(255, 255, 255, 0.2)',
                bulletColor: '#ffffff',
                asteroidColor: '#333333',
                effectColor: '#666666'
            }
        };
        
        return themes[this.currentTheme];
    }
    
    updateScore(points) {
        this.score += points;
        document.getElementById('score').textContent = this.score;
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.updateHighScore();
        }
    }
    
    updateLives(lives) {
        this.lives = lives;
        const livesContainer = document.getElementById('lives');
        livesContainer.innerHTML = '';
        
        for (let i = 0; i < lives; i++) {
            const lifeIcon = document.createElement('div');
            lifeIcon.className = 'life-icon';
            livesContainer.appendChild(lifeIcon);
        }
    }
    
    updateWave(wave) {
        this.wave = wave;
        document.getElementById('wave').textContent = wave;
    }
    
    updateHighScore() {
        document.getElementById('highScoreValue').textContent = this.highScore;
        localStorage.setItem('asteroidsHighScore', this.highScore);
    }
    
    showMenu(menuId) {
        this.hideAllMenus();
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.classList.add('active');
        }
    }
    
    hideAllMenus() {
        document.querySelectorAll('.menu-screen').forEach(menu => {
            menu.classList.remove('active');
        });
    }
    
    showGameOver() {
        document.getElementById('finalScore').textContent = this.score;
        this.showMenu('game-over');
    }
    
    showPauseMenu() {
        this.showMenu('pause-menu');
    }
    
    reset() {
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.updateScore(0);
        this.updateLives(3);
        this.updateWave(1);
        this.clearPowerUps();
    }
    
    addPowerUp(type, duration) {
        const powerUpDisplay = document.getElementById('powerup-display');
        
        if (this.powerUps[type]) {
            clearTimeout(this.powerUps[type].timeout);
            this.powerUps[type].element.remove();
        }
        
        const powerUpElement = document.createElement('div');
        powerUpElement.className = 'powerup-indicator active';
        powerUpElement.dataset.type = type;
        
        const icons = {
            shield: '🛡️',
            rapidFire: '⚡',
            tripleShot: '🔱',
            slowTime: '⏱️'
        };
        
        powerUpElement.innerHTML = `
            ${icons[type]}
            <div class="powerup-timer"></div>
        `;
        
        powerUpDisplay.appendChild(powerUpElement);
        
        const timer = powerUpElement.querySelector('.powerup-timer');
        const startTime = Date.now();
        
        const updateTimer = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, duration - elapsed);
            const percent = remaining / duration;
            timer.style.width = `${percent * 100}%`;
            
            if (remaining > 0) {
                requestAnimationFrame(updateTimer);
            }
        };
        
        updateTimer();
        
        this.powerUps[type] = {
            element: powerUpElement,
            timeout: setTimeout(() => {
                powerUpElement.remove();
                delete this.powerUps[type];
            }, duration)
        };
    }
    
    removePowerUp(type) {
        if (this.powerUps[type]) {
            clearTimeout(this.powerUps[type].timeout);
            this.powerUps[type].element.remove();
            delete this.powerUps[type];
        }
    }
    
    clearPowerUps() {
        Object.keys(this.powerUps).forEach(type => {
            this.removePowerUp(type);
        });
    }
}