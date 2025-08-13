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
        this.bombCount = 0;  // Stack bombs for death explosion
        this.powerUpUpgrades = {};  // Track upgrades from boss kills
        
        this.lastAsteroidSpawn = 0;
        this.asteroidSpawnInterval = 5000;  // Spawn more frequently
        this.minAsteroids = 5;  // Keep more asteroids minimum
        this.maxAsteroids = 30;  // Allow more asteroids total
        
        this.aiMode = false;
        this.aiPlayer = null;
        this.aiStats = {
            shotsFired: 0,
            hits: 0,
            accuracy: 0,
            decisionsPerSecond: 0,
            survivalTime: 0,
            score: 0
        };
        
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
        console.log('Starting normal game mode');
        this.gameState = 'playing';
        this.lives = 3;
        this.wave = 1;
        this.asteroidSpeed = 1;
        this.aiMode = false;
        
        this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2, this.ui.currentShip);
        console.log('Ship created:', this.ship);
        this.bullets = [];
        this.asteroids = [];
        this.powerUps = [];
        this.boss = null;
        this.powerUpActive = {};
        
        this.ui.reset();
        this.ui.updateBombCount(0);  // Initialize bomb counter
        this.createAsteroids(5);
        this.waveTransition.start(1);
    }
    
    startAIMode() {
        this.gameState = 'playing';
        this.lives = 3;
        this.wave = 1;
        this.asteroidSpeed = 1;
        this.aiMode = true;
        
        // Check if AIPlayer exists
        if (typeof AIPlayer === 'undefined') {
            console.error('AIPlayer class not found! Check entities.js');
            alert('AI Mode error: AIPlayer class not loaded');
            return;
        }
        
        this.aiPlayer = new AIPlayer(this.canvas.width / 2, this.canvas.height / 2, this.ui.currentShip);
        this.ship = this.aiPlayer;
        console.log('AI Mode started, ship created:', this.ship);
        this.bullets = [];
        this.asteroids = [];
        this.powerUps = [];
        this.boss = null;
        this.powerUpActive = {};
        
        this.aiStats = {
            shotsFired: 0,
            hits: 0,
            accuracy: 0,
            decisionsCount: 0,
            decisionsPerSecond: 0,
            survivalTime: Date.now(),
            score: 0
        };
        
        this.ui.reset();
        this.ui.setAIMode(true);
        this.ui.updateBombCount(0);  // Initialize bomb counter
        this.createAsteroids(5);
        this.waveTransition.start(1);
    }
    
    restart() {
        // Restart in the same mode we were in
        if (this.aiMode) {
            this.startAIMode();
        } else {
            this.start();
        }
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
        if (Math.random() < 0.2) {  // Increased from 10% to 20%
            const types = [
                'shield', 'shield',  // Shield appears more often
                'rapidFire', 'tripleShot', 'slowTime',
                'laser', 'bomb', 'speedBoost', 
                'doublePoints', 'autoAim', 'extraLife'
            ];
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
    
    applyAutoAim(bullet) {
        // Find nearest asteroid
        let nearest = null;
        let minDist = 200; // Max auto-aim range
        
        for (const asteroid of this.asteroids) {
            const dist = Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = asteroid;
            }
        }
        
        if (nearest) {
            // Adjust bullet velocity slightly toward target
            const dx = nearest.x - bullet.x;
            const dy = nearest.y - bullet.y;
            const angle = Math.atan2(dy, dx);
            const currentAngle = Math.atan2(bullet.vy, bullet.vx);
            const diff = angle - currentAngle;
            
            // Apply 20% correction toward target
            const correction = diff * 0.2;
            const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
            const newAngle = currentAngle + correction;
            
            bullet.vx = Math.cos(newAngle) * speed;
            bullet.vy = Math.sin(newAngle) * speed;
        }
    }
    
    handleInput() {
        if (!this.ship || !this.ship.alive) return;
        
        // Debug: Log when keys are pressed
        if (Object.keys(this.keys).some(k => this.keys[k])) {
            console.log('Keys pressed:', Object.keys(this.keys).filter(k => this.keys[k]));
        }
        
        // Support both Arrow keys and WASD
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.ship.rotateLeft();
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.ship.rotateRight();
        }
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
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
            const now = performance.now();
            const cooldown = this.powerUpActive.rapidFire ? 50 : this.shootCooldown;
            
            if (now - this.lastShootTime > cooldown) {
                this.lastShootTime = now;
                
                if (this.powerUpActive.laser) {
                    // Create laser beam
                    const laser = this.ship.shoot();
                    laser.type = 'laser';
                    laser.penetrating = true;
                    laser.damage = 3;
                    laser.radius = 3;
                    laser.speed = 30;
                    const laserSpeed = 30;
                    laser.vx = Math.cos(this.ship.angle) * laserSpeed;
                    laser.vy = Math.sin(this.ship.angle) * laserSpeed;
                    this.bullets.push(laser);
                } else if (this.powerUpActive.tripleShot) {
                    for (let i = -1; i <= 1; i++) {
                        const bullet = this.ship.shoot();
                        const angle = Math.atan2(bullet.vy, bullet.vx) + (i * 0.2);
                        const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                        bullet.vx = Math.cos(angle) * speed;
                        bullet.vy = Math.sin(angle) * speed;
                        
                        // Add auto-aim adjustment
                        if (this.powerUpActive.autoAim) {
                            this.applyAutoAim(bullet);
                        }
                        
                        this.bullets.push(bullet);
                    }
                } else {
                    const bullet = this.ship.shoot();
                    
                    // Add auto-aim adjustment
                    if (this.powerUpActive.autoAim) {
                        this.applyAutoAim(bullet);
                    }
                    
                    this.bullets.push(bullet);
                }
                
                this.soundManager.play('shoot');
            }
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        if (this.aiMode && this.aiPlayer) {
            this.aiPlayer.makeDecisions(this.asteroids, this.boss, this.powerUps, this.canvas, this);
        } else {
            this.handleInput();
        }
        
        if (this.ship && this.ship.alive) {
            // Apply speed boost if active
            if (this.powerUpActive.speedBoost) {
                const originalMaxSpeed = this.ship.maxSpeed;
                const originalRotationSpeed = this.ship.rotationSpeed;
                this.ship.maxSpeed = originalMaxSpeed * 1.5;
                this.ship.rotationSpeed = originalRotationSpeed * 1.5;
                this.ship.update(this.canvas);
                this.ship.maxSpeed = originalMaxSpeed;
                this.ship.rotationSpeed = originalRotationSpeed;
            } else {
                this.ship.update(this.canvas);
            }
            this.shipTrail.addPoint(this.ship.x, this.ship.y);
        }
        this.shipTrail.update();
        
        this.bullets = this.bullets.filter(bullet => bullet.update(this.canvas));
        
        // SlowTime effect: stop movement initially, then permanent 5% reduction
        this.asteroids.forEach(asteroid => {
            if (this.powerUpActive.slowTime) {
                // Stop movement completely during slowTime
                const storedVx = asteroid.vx;
                const storedVy = asteroid.vy;
                asteroid.vx = 0;
                asteroid.vy = 0;
                asteroid.update(this.canvas);
                asteroid.vx = storedVx;
                asteroid.vy = storedVy;
            } else {
                asteroid.update(this.canvas);
            }
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
        // Removed maintainAsteroidCount() to allow waves to complete
        
        if (this.aiMode && this.aiPlayer) {
            const secs = (Date.now() - this.aiStats.survivalTime) / 1000;
            this.aiStats.accuracy = this.aiStats.shotsFired ? (this.aiStats.hits / this.aiStats.shotsFired) : 0;
            this.aiStats.decisionsPerSecond = this.aiPlayer ? (this.aiPlayer.decisionTicks / secs) : 0; // Think ticks/s at 60Hz ≈ 60
            this.aiStats.actionSwitchesPerSecond = (this.aiStats.decisionsCount || 0) / secs; // State changes/s
            this.ui.updateAIStats(this.aiStats);
        }
    }
    
    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const asteroid = this.asteroids[j];
                const dist = Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y);
                
                if (dist < bullet.radius + asteroid.radius) {
                    // Don't remove laser bullets - they penetrate
                    if (!bullet.penetrating) {
                        this.bullets.splice(i, 1);
                    }
                    
                    if (this.aiMode) {
                        this.aiStats.hits++;
                    }
                    
                    const fragments = asteroid.break();
                    this.asteroids.splice(j, 1);
                    this.asteroids.push(...fragments);
                    
                    // Apply double points if active
                    const points = asteroid.getPoints() * (this.powerUpActive.doublePoints ? 2 : 1);
                    this.ui.updateScore(points);
                    this.particleSystem.createAsteroidExplosion(asteroid.x, asteroid.y, asteroid.radius);
                    this.soundManager.play('explosion');
                    this.screenShake.shake(5, 10);
                    
                    this.spawnPowerUp(asteroid.x, asteroid.y);
                    
                    if (!bullet.penetrating) {
                        break;
                    }
                }
            }
            
            if (this.boss && bullet.type !== 'boss') {
                const dist = Math.hypot(bullet.x - this.boss.x, bullet.y - this.boss.y);
                if (dist < bullet.radius + this.boss.radius) {
                    this.bullets.splice(i, 1);
                    
                    if (this.aiMode) {
                        this.aiStats.hits++;
                    }
                    
                    this.boss.takeDamage(bullet.damage);
                    this.particleSystem.createBulletImpact(bullet.x, bullet.y);
                    this.soundManager.play('hit');
                    
                    if (!this.boss.alive) {
                        this.ui.updateScore(this.boss.points);
                        this.particleSystem.createExplosion(this.boss.x, this.boss.y, '#ff0000', 50);
                        this.soundManager.play('explosion');
                        this.screenShake.shake(20, 30);
                        this.boss = null;
                        
                        // Boss kill upgrades all power-ups
                        this.upgradePowerUps();
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
                        // Shield now provides invulnerability, just show effect
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
                        // Shield provides invulnerability
                        this.particleSystem.createExplosion(this.ship.x, this.ship.y, '#00ff00', 15);
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
                            // Shield provides invulnerability
                            this.particleSystem.createExplosion(bullet.x, bullet.y, '#00ff00', 10);
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
    
    triggerBombExplosion(x, y, bombCount) {
        // Explosion radius increases with bomb count and upgrades
        const bombUpgrade = this.powerUpUpgrades.bomb || 1;
        const bombRadius = 150 * bombCount * bombUpgrade;
        let destroyed = 0;
        
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            const dist = Math.hypot(x - asteroid.x, y - asteroid.y);
            
            if (dist < bombRadius) {
                // Small asteroids are completely destroyed
                if (asteroid.size === 'small') {
                    this.asteroids.splice(i, 1);
                } else {
                    // Medium and large break into fragments
                    const fragments = asteroid.break();
                    this.asteroids.splice(i, 1);
                    this.asteroids.push(...fragments);
                }
                this.ui.updateScore(asteroid.getPoints() * (this.powerUpActive.doublePoints ? 2 : 1));
                this.particleSystem.createAsteroidExplosion(asteroid.x, asteroid.y, asteroid.radius);
                destroyed++;
            }
        }
        
        if (destroyed > 0 || bombCount > 0) {
            // Bigger explosion with more bombs
            this.particleSystem.createExplosion(x, y, '#ff8800', 40 * bombCount);
            this.screenShake.shake(10 * bombCount, 15 * bombCount);
            this.soundManager.play('explosion');
        }
    }
    
    upgradePowerUps() {
        // Upgrade all power-up types after boss kill
        const types = ['shield', 'rapidFire', 'tripleShot', 'slowTime', 'laser', 
                      'speedBoost', 'doublePoints', 'autoAim', 'bomb'];
        
        for (const type of types) {
            if (!this.powerUpUpgrades[type]) {
                this.powerUpUpgrades[type] = 1;
            }
            
            if (type === 'bomb') {
                // Bomb gets damage upgrade instead of duration
                this.powerUpUpgrades[type] *= 1.2; // 20% damage increase
            } else {
                // Other power-ups get 10% duration increase
                this.powerUpUpgrades[type] *= 1.1;
            }
        }
        
        // Visual feedback
        this.particleSystem.createExplosion(this.ship.x, this.ship.y, '#ffff00', 30);
        console.log('Power-ups upgraded!', this.powerUpUpgrades);
    }
    
    activatePowerUp(powerUp) {
        const type = powerUp.type;
        let duration = powerUp.types[type].duration;
        
        // Apply upgrades from boss kills
        const upgrade = this.powerUpUpgrades[type] || 1;
        if (type !== 'bomb') {
            duration *= upgrade;  // Apply duration upgrade
        }
        
        // Handle instant-use power-ups
        if (type === 'bomb') {
            if (this.bombCount >= 5) {
                // At max stacks, trigger mega explosion and reset
                this.triggerBombExplosion(this.ship.x, this.ship.y, this.bombCount);
                this.bombCount = 0;
                this.ui.updateBombCount(0);
            } else {
                // Stack the bomb
                this.bombCount++;
                this.ui.updateBombCount(this.bombCount);
            }
            return;
        } else if (type === 'extraLife') {
            this.lives++;
            this.ui.updateLives(this.lives);
            this.soundManager.play('powerup');
            return;
        }
        
        // Handle duration-based power-ups (stackable)
        if (this.powerUpActive[type]) {
            // Stack duration by adding to existing
            clearTimeout(this.powerUpActive[type].timeout);
            const existingDuration = this.powerUpActive[type].endTime - performance.now();
            duration = Math.max(0, existingDuration) + duration; // Add to remaining time
        }
        
        // Special handling for shield - add invulnerability
        if (type === 'shield') {
            this.ship.invulnerable = true;
            this.ship.invulnerableStart = performance.now();
            this.ship.invulnerableTime = duration;
        }
        
        // SlowTime now only stops during active period, no permanent reduction
        
        const timeoutId = setTimeout(() => {
            delete this.powerUpActive[type];
            this.ui.removePowerUp(type);
            
            // Remove invulnerability when shield expires
            if (type === 'shield') {
                this.ship.invulnerable = false;
            }
        }, duration);
        
        this.powerUpActive[type] = {
            timeout: timeoutId,
            endTime: performance.now() + duration
        };
        
        this.ui.addPowerUp(type, duration);
    }
    
    shipHit() {
        // Trigger bomb explosion on death if bombs are stacked
        if (this.bombCount > 0) {
            this.triggerBombExplosion(this.ship.x, this.ship.y, this.bombCount);
            this.bombCount = 0;
            this.ui.updateBombCount(0);
        }
        
        this.particleSystem.createShipExplosion(this.ship.x, this.ship.y);
        this.soundManager.play('explosion');
        this.screenShake.shake(15, 20);
        this.shipTrail.clear();
        
        this.lives--;
        this.ui.updateLives(this.lives);
        
        if (this.lives > 0) {
            // Create the correct ship type based on game mode
            if (this.aiMode) {
                this.aiPlayer = new AIPlayer(this.canvas.width / 2, this.canvas.height / 2, this.ui.currentShip);
                this.ship = this.aiPlayer;
                console.log('AI respawned');
            } else {
                this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2, this.ui.currentShip);
            }
        } else {
            this.ship.alive = false;
            this.gameOver();
        }
    }
    
    maintainAsteroidCount() {
        // Don't spawn new asteroids if we're close to completing a wave
        if (this.asteroids.length <= 2) {
            return; // Allow wave to complete
        }
        
        const now = Date.now();
        const largeAsteroids = this.asteroids.filter(a => a.size === 'large').length;
        
        if (this.asteroids.length < this.minAsteroids || 
            (now - this.lastAsteroidSpawn > this.asteroidSpawnInterval && 
             this.asteroids.length < this.maxAsteroids && 
             largeAsteroids < 5)) {  // Allow more large asteroids
            
            this.lastAsteroidSpawn = now;
            
            const edge = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(edge) {
                case 0: x = -50; y = Math.random() * this.canvas.height; break;
                case 1: x = this.canvas.width + 50; y = Math.random() * this.canvas.height; break;
                case 2: x = Math.random() * this.canvas.width; y = -50; break;
                case 3: x = Math.random() * this.canvas.width; y = this.canvas.height + 50; break;
            }
            
            const asteroid = new Asteroid(x, y, 40, 'large');
            asteroid.vx = (Math.random() - 0.5) * 4 * this.asteroidSpeed;
            asteroid.vy = (Math.random() - 0.5) * 4 * this.asteroidSpeed;
            
            const towardsCenterX = (this.canvas.width / 2 - x) / this.canvas.width;
            const towardsCenterY = (this.canvas.height / 2 - y) / this.canvas.height;
            asteroid.vx += towardsCenterX * 2;
            asteroid.vy += towardsCenterY * 2;
            
            this.asteroids.push(asteroid);
        }
    }
    
    checkWaveComplete() {
        if (this.asteroids.length === 0 && this.gameState === 'playing') {
            this.wave++;
            this.ui.updateWave(this.wave);
            this.asteroidSpeed += 0.1;
            this.bossSpawnChance += 0.001;
            
            // Wave completion rewards
            if (this.ship && this.ship.alive) {
                // Collect all existing power-ups on map
                for (const powerUp of this.powerUps) {
                    this.activatePowerUp(powerUp);
                    this.particleSystem.createPowerUpCollect(powerUp.x, powerUp.y, powerUp.types[powerUp.type].color);
                }
                this.powerUps = [];
                
                // Grant 2 of a random power-up
                const rewardTypes = ['shield', 'rapidFire', 'tripleShot', 'laser', 'speedBoost', 'doublePoints', 'autoAim'];
                const rewardType = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];
                
                // Create temporary power-up object for activation
                const tempPowerUp = { type: rewardType, types: new PowerUp(0, 0, rewardType).types };
                this.activatePowerUp(tempPowerUp);
                this.activatePowerUp(tempPowerUp); // Stack it twice
                
                this.ui.updateScore(100 * this.wave);
            }
            
            this.createAsteroids(Math.min(5 + this.wave, 15));  // More asteroids per wave
            this.waveTransition.start(this.wave);
            this.soundManager.play('waveComplete');
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
        const STEP = 1000 / 60; // 60 Hz fixed timestep
        if (!this._t0) {
            this._t0 = performance.now();
            this._acc = 0;
        }

        const t = performance.now();
        this._acc += t - this._t0;
        this._t0 = t;

        // Run update in fixed quanta for consistent physics
        while (this._acc >= STEP) {
            this.update();
            this._acc -= STEP;
        }
        
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

const game = new Game();