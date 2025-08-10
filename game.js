class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.ship = null;
        this.bullets = [];
        this.asteroids = [];
        this.powerUps = [];
        this.boss = null;
        
        this.ui = new UI();
        this.soundManager = new SoundManager();
        this.particleSystem = new ParticleSystem();
        this.starField = null;
        this.screenShake = new ScreenShake();
        this.waveTransition = new WaveTransition();
        this.shipTrail = new Trail(15);
        
        this.keys = {};
        this.gameState = 'menu';
        this.lives = 3;
        this.wave = 1;
        this.asteroidSpeed = 1;
        this.bossSpawnChance = 0.001;
        
        this.powerUpActive = {};
        this.lastShootTime = 0;
        this.shootCooldown = 200;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.starField = new StarField(this.canvas.width, this.canvas.height);
        window.game = this;
        this.gameLoop();
    }
    
    setupCanvas() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'KeyP' && this.gameState === 'playing') {
                this.pause();
            } else if (e.code === 'Escape') {
                if (this.gameState === 'playing') {
                    this.pause();
                } else if (this.gameState === 'paused') {
                    this.resume();
                }
            } else if (e.code === 'KeyT' && this.gameState === 'playing') {
                this.cycleTheme();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        document.addEventListener('click', () => {
            if (this.soundManager.audioContext && this.soundManager.audioContext.state === 'suspended') {
                this.soundManager.audioContext.resume();
            }
        });
    }
    
    start() {
        this.gameState = 'playing';
        this.lives = 3;
        this.wave = 1;
        this.asteroidSpeed = 1;
        
        this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2, this.ui.currentShip);
        this.bullets = [];
        this.asteroids = [];
        this.powerUps = [];
        this.boss = null;
        this.powerUpActive = {};
        
        this.ui.reset();
        this.createAsteroids(5);
        this.waveTransition.start(1);
    }
    
    restart() {
        this.start();
    }
    
    pause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.ui.showPauseMenu();
        }
    }
    
    resume() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.ui.hideAllMenus();
        }
    }
    
    cycleTheme() {
        const themes = ['space', 'neon', 'retro', 'dark'];
        const currentIndex = themes.indexOf(this.ui.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.ui.setTheme(themes[nextIndex]);
    }
    
    createAsteroids(count) {
        for (let i = 0; i < count; i++) {
            let x, y;
            do {
                x = Math.random() * this.canvas.width;
                y = Math.random() * this.canvas.height;
            } while (this.ship && Math.hypot(x - this.ship.x, y - this.ship.y) < 200);
            
            const asteroid = new Asteroid(x, y, 40, 'large');
            asteroid.vx *= this.asteroidSpeed;
            asteroid.vy *= this.asteroidSpeed;
            this.asteroids.push(asteroid);
        }
    }
    
    spawnPowerUp(x, y) {
        if (Math.random() < 0.1) {
            const types = ['shield', 'rapidFire', 'tripleShot', 'slowTime'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.powerUps.push(new PowerUp(x, y, type));
        }
    }
    
    spawnBoss() {
        if (!this.boss && Math.random() < this.bossSpawnChance && this.wave > 2) {
            const edge = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(edge) {
                case 0: x = 0; y = Math.random() * this.canvas.height; break;
                case 1: x = this.canvas.width; y = Math.random() * this.canvas.height; break;
                case 2: x = Math.random() * this.canvas.width; y = 0; break;
                case 3: x = Math.random() * this.canvas.width; y = this.canvas.height; break;
            }
            
            this.boss = new Boss(x, y);
        }
    }
    
    handleInput() {
        if (!this.ship || !this.ship.alive) return;
        
        if (this.keys['ArrowLeft']) {
            this.ship.rotateLeft();
        }
        if (this.keys['ArrowRight']) {
            this.ship.rotateRight();
        }
        if (this.keys['ArrowUp']) {
            this.ship.setThrust(true);
            if (Math.random() < 0.3) {
                this.particleSystem.createThrustParticles(
                    this.ship.x - Math.cos(this.ship.angle) * 10,
                    this.ship.y - Math.sin(this.ship.angle) * 10,
                    this.ship.angle
                );
                this.soundManager.play('thrust');
            }
        } else {
            this.ship.setThrust(false);
        }
        
        if (this.keys['Space']) {
            const now = Date.now();
            const cooldown = this.powerUpActive.rapidFire ? 50 : this.shootCooldown;
            
            if (now - this.lastShootTime > cooldown) {
                this.lastShootTime = now;
                
                if (this.powerUpActive.tripleShot) {
                    for (let i = -1; i <= 1; i++) {
                        const bullet = this.ship.shoot();
                        const angle = Math.atan2(bullet.vy, bullet.vx) + (i * 0.2);
                        const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                        bullet.vx = Math.cos(angle) * speed;
                        bullet.vy = Math.sin(angle) * speed;
                        this.bullets.push(bullet);
                    }
                } else {
                    this.bullets.push(this.ship.shoot());
                }
                
                this.soundManager.play('shoot');
            }
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.handleInput();
        
        if (this.ship && this.ship.alive) {
            this.ship.update(this.canvas);
            this.shipTrail.addPoint(this.ship.x, this.ship.y);
        }
        this.shipTrail.update();
        
        this.bullets = this.bullets.filter(bullet => bullet.update(this.canvas));
        
        const timeSlowFactor = this.powerUpActive.slowTime ? 0.3 : 1;
        
        this.asteroids.forEach(asteroid => {
            const originalVx = asteroid.vx;
            const originalVy = asteroid.vy;
            asteroid.vx *= timeSlowFactor;
            asteroid.vy *= timeSlowFactor;
            asteroid.update(this.canvas);
            asteroid.vx = originalVx;
            asteroid.vy = originalVy;
        });
        
        this.powerUps = this.powerUps.filter(powerUp => powerUp.update());
        
        if (this.boss) {
            this.boss.update(this.canvas, this.ship);
            const bullet = this.boss.shoot();
            if (bullet) {
                this.bullets.push(bullet);
                this.soundManager.play('shoot');
            }
        }
        
        this.particleSystem.update();
        this.screenShake.update();
        this.waveTransition.update();
        this.starField.update(this.canvas.width, this.canvas.height);
        
        this.checkCollisions();
        this.checkWaveComplete();
        this.spawnBoss();
    }
    
    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const asteroid = this.asteroids[j];
                const dist = Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y);
                
                if (dist < bullet.radius + asteroid.radius) {
                    this.bullets.splice(i, 1);
                    
                    const fragments = asteroid.break();
                    this.asteroids.splice(j, 1);
                    this.asteroids.push(...fragments);
                    
                    this.ui.updateScore(asteroid.getPoints());
                    this.particleSystem.createAsteroidExplosion(asteroid.x, asteroid.y, asteroid.radius);
                    this.soundManager.play('explosion');
                    this.screenShake.shake(5, 10);
                    
                    this.spawnPowerUp(asteroid.x, asteroid.y);
                    break;
                }
            }
            
            if (this.boss && bullet.type !== 'boss') {
                const dist = Math.hypot(bullet.x - this.boss.x, bullet.y - this.boss.y);
                if (dist < bullet.radius + this.boss.radius) {
                    this.bullets.splice(i, 1);
                    this.boss.takeDamage(bullet.damage);
                    this.particleSystem.createBulletImpact(bullet.x, bullet.y);
                    this.soundManager.play('hit');
                    
                    if (!this.boss.alive) {
                        this.ui.updateScore(this.boss.points);
                        this.particleSystem.createExplosion(this.boss.x, this.boss.y, '#ff0000', 50);
                        this.soundManager.play('explosion');
                        this.screenShake.shake(20, 30);
                        this.boss = null;
                    }
                }
            }
        }
        
        if (this.ship && this.ship.alive && !this.ship.invulnerable) {
            for (const asteroid of this.asteroids) {
                const dist = Math.hypot(this.ship.x - asteroid.x, this.ship.y - asteroid.y);
                if (dist < this.ship.radius + asteroid.radius) {
                    if (!this.powerUpActive.shield) {
                        this.shipHit();
                    } else {
                        this.ui.removePowerUp('shield');
                        delete this.powerUpActive.shield;
                        this.particleSystem.createExplosion(this.ship.x, this.ship.y, '#00ff00', 15);
                    }
                    break;
                }
            }
            
            if (this.boss) {
                const dist = Math.hypot(this.ship.x - this.boss.x, this.ship.y - this.boss.y);
                if (dist < this.ship.radius + this.boss.radius) {
                    if (!this.powerUpActive.shield) {
                        this.shipHit();
                    } else {
                        this.ui.removePowerUp('shield');
                        delete this.powerUpActive.shield;
                    }
                }
            }
            
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const bullet = this.bullets[i];
                if (bullet.type === 'boss') {
                    const dist = Math.hypot(this.ship.x - bullet.x, this.ship.y - bullet.y);
                    if (dist < this.ship.radius + bullet.radius) {
                        this.bullets.splice(i, 1);
                        if (!this.powerUpActive.shield) {
                            this.shipHit();
                        } else {
                            this.ui.removePowerUp('shield');
                            delete this.powerUpActive.shield;
                        }
                    }
                }
            }
        }
        
        if (this.ship && this.ship.alive) {
            for (let i = this.powerUps.length - 1; i >= 0; i--) {
                const powerUp = this.powerUps[i];
                const dist = Math.hypot(this.ship.x - powerUp.x, this.ship.y - powerUp.y);
                
                if (dist < this.ship.radius + powerUp.radius) {
                    this.activatePowerUp(powerUp);
                    this.powerUps.splice(i, 1);
                    this.particleSystem.createPowerUpCollect(powerUp.x, powerUp.y, powerUp.types[powerUp.type].color);
                    this.soundManager.play('powerup');
                }
            }
        }
    }
    
    activatePowerUp(powerUp) {
        const type = powerUp.type;
        const duration = powerUp.types[type].duration;
        
        if (this.powerUpActive[type]) {
            clearTimeout(this.powerUpActive[type]);
        }
        
        this.powerUpActive[type] = setTimeout(() => {
            delete this.powerUpActive[type];
            this.ui.removePowerUp(type);
        }, duration);
        
        this.ui.addPowerUp(type, duration);
    }
    
    shipHit() {
        this.particleSystem.createShipExplosion(this.ship.x, this.ship.y);
        this.soundManager.play('explosion');
        this.screenShake.shake(15, 20);
        this.shipTrail.clear();
        
        this.lives--;
        this.ui.updateLives(this.lives);
        
        if (this.lives > 0) {
            this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2, this.ui.currentShip);
        } else {
            this.ship.alive = false;
            this.gameOver();
        }
    }
    
    checkWaveComplete() {
        if (this.asteroids.length === 0 && this.gameState === 'playing') {
            this.wave++;
            this.ui.updateWave(this.wave);
            this.asteroidSpeed += 0.1;
            this.bossSpawnChance += 0.001;
            
            this.createAsteroids(Math.min(4 + this.wave, 12));
            this.waveTransition.start(this.wave);
            this.soundManager.play('waveComplete');
            
            if (this.ship && this.ship.alive) {
                this.ui.updateScore(100 * this.wave);
            }
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.soundManager.play('gameOver');
        setTimeout(() => {
            this.ui.showGameOver();
        }, 1000);
    }
    
    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.starField.draw(this.ctx);
        
        this.screenShake.apply(this.ctx);
        
        const theme = this.ui.getTheme();
        
        this.shipTrail.draw(this.ctx, theme.shipColor);
        
        this.asteroids.forEach(asteroid => asteroid.draw(this.ctx, theme));
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
        
        if (this.boss) {
            this.boss.draw(this.ctx, theme);
        }
        
        this.bullets.forEach(bullet => bullet.draw(this.ctx, theme));
        
        if (this.ship && this.ship.alive) {
            this.ship.draw(this.ctx, theme);
        }
        
        this.particleSystem.draw(this.ctx);
        
        this.screenShake.reset(this.ctx);
        
        this.waveTransition.draw(this.ctx, this.canvas);
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

const game = new Game();