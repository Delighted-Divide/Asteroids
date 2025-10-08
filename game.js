class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.ship = null;
        this.bullets = [];
        this.asteroids = [];
        this.powerUps = [];
        this.bosses = [];
        this.companionSystem = null; // Initialize when ship is created
        
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
        this.powerUpStacks = {};  // Track how many times each power-up has been stacked
        this.powerUpLevels = {};  // Track level for each power-up type
        this.powerUpTimers = {};  // Track actual timers for stacked durations
        this.expiredPowerUps = [];  // Track recently expired power-ups for 10% chance recovery
        this.bossKills = 0;  // Track boss kills for leveling
        this.lastShootTime = 0;
        this.shootCooldown = 200;
        this.bombCount = 0;  // Stack bombs for death explosion
        
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
        this.companionSystem = new CompanionSystem(this.ship);
        console.log('Ship created:', this.ship);
        this.bullets = [];
        this.asteroids = [];
        this.powerUps = [];
        this.bosses = [];
        this.powerUpActive = {};
        this.powerUpStacks = {};
        this.powerUpTimers = {};
        this.expiredPowerUps = [];
        
        // Initialize all power-up levels if not already set
        const powerUpTypes = ['shield', 'rapidFire', 'tripleShot', 'slowTime', 'companion', 
                              'bomb', 'speedBoost', 'doublePoints', 'autoAim', 'extraLife'];
        powerUpTypes.forEach(type => {
            if (!this.powerUpLevels[type]) {
                this.powerUpLevels[type] = 1;
            }
        });
        
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
        this.bosses = [];
        this.powerUpActive = {};
        this.powerUpStacks = {};
        this.powerUpTimers = {};
        this.expiredPowerUps = [];
        
        // Initialize all power-up levels if not already set
        const powerUpTypes = ['shield', 'rapidFire', 'tripleShot', 'slowTime', 'companion', 
                              'bomb', 'speedBoost', 'doublePoints', 'autoAim', 'extraLife'];
        powerUpTypes.forEach(type => {
            if (!this.powerUpLevels[type]) {
                this.powerUpLevels[type] = 1;
            }
        });
        
        // Initialize MPC worker for AI planning
        this.mpcWorker = new Worker('mpc.worker.js', { type: 'module' });
        this._mpcPlan = null;
        this._mpcTick = 0;
        
        this.mpcWorker.onmessage = (e) => {
            if (e.data?.type === 'planResult') {
                this._mpcPlan = { seq: e.data.plan.seq, i: 0, ts: performance.now() };
            }
        };
        
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
        if (Math.random() < 0.2) {  // 20% chance to spawn power-up
            // Weighted drop rates for better balance
            const dropTable = [
                { type: 'shield', weight: 3 },       // 3% (significantly reduced)
                { type: 'slowTime', weight: 3 },     // 3% (significantly reduced)
                { type: 'rapidFire', weight: 12 },   // 12%
                { type: 'tripleShot', weight: 10 },  // 10%
                { type: 'companion', weight: 8 },    // 8%
                { type: 'bomb', weight: 10 },        // 10%
                { type: 'speedBoost', weight: 12 },  // 12%
                { type: 'doublePoints', weight: 10 }, // 10%
                { type: 'autoAim', weight: 8 },      // 8%
                { type: 'extraLife', weight: 6 },    // 6%
                { type: 'doubleDamage', weight: 8 }  // 8% (new)
                // Total: 90% to leave room for future additions
            ];
            
            // Calculate total weight
            const totalWeight = dropTable.reduce((sum, item) => sum + item.weight, 0);
            
            // Select random power-up based on weights
            let random = Math.random() * totalWeight;
            let selected = null;
            
            for (const item of dropTable) {
                random -= item.weight;
                if (random <= 0) {
                    selected = item.type;
                    break;
                }
            }
            
            if (selected) {
                this.powerUps.push(new PowerUp(x, y, selected));
            }
        }
    }
    
    spawnBoss() {
        // Allow multiple bosses at higher waves
        const maxBosses = Math.min(Math.floor(this.wave / 5) + 1, 3); // Max 3 bosses
        if (this.bosses.length < maxBosses && Math.random() < this.bossSpawnChance && this.wave > 2) {
            const edge = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(edge) {
                case 0: x = 0; y = Math.random() * this.canvas.height; break;
                case 1: x = this.canvas.width; y = Math.random() * this.canvas.height; break;
                case 2: x = Math.random() * this.canvas.width; y = 0; break;
                case 3: x = Math.random() * this.canvas.width; y = this.canvas.height; break;
            }
            
            // Randomly select a boss type based on wave
            const bossTypes = [Boss]; // Basic boss always available
            
            if (this.wave >= 3) bossTypes.push(SpeedBoss);
            if (this.wave >= 4) bossTypes.push(TankBoss);
            if (this.wave >= 5) bossTypes.push(SniperBoss);
            if (this.wave >= 6) bossTypes.push(SwarmBoss);
            if (this.wave >= 7) bossTypes.push(ShieldBoss);
            
            const BossClass = bossTypes[Math.floor(Math.random() * bossTypes.length)];
            const boss = new BossClass(x, y);
            
            // Scale boss health with wave
            const healthMultiplier = 1 + (this.wave - 3) * 0.1; // +10% health per wave after 3
            boss.health = Math.floor(boss.health * healthMultiplier);
            boss.maxHealth = Math.floor(boss.maxHealth * healthMultiplier);
            
            this.bosses.push(boss);
            
            console.log(`Spawned ${BossClass.name} with ${boss.health} HP`);
        }
    }
    
    applyAutoAim(bullet) {
        const level = this.powerUpLevels.autoAim || 1;
        
        // Scale auto-aim strength with level
        const baseCorrection = 0.3; // Increased from 0.2
        const correctionBonus = 0.05 * (level - 1); // +5% per level
        const maxCorrection = Math.min(0.8, baseCorrection + correctionBonus); // Cap at 80%
        
        // Scale detection range with level
        const baseRange = 200;
        const rangeBonus = 20 * level; // +20px per level
        const maxRange = baseRange + rangeBonus;
        
        // Find nearest asteroid or boss
        let nearest = null;
        let minDist = maxRange;
        
        // Check asteroids
        for (const asteroid of this.asteroids) {
            const dist = Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y);
            // Prioritize dangerous (larger) asteroids at higher levels
            const priorityBonus = level >= 5 && asteroid.size === 'large' ? -50 : 0;
            const effectiveDist = dist + priorityBonus;
            
            if (effectiveDist < minDist) {
                minDist = effectiveDist;
                nearest = asteroid;
            }
        }
        
        // Also consider bosses if present
        for (const boss of this.bosses) {
            const dist = Math.hypot(bullet.x - boss.x, bullet.y - boss.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = boss;
            }
        }
        
        if (nearest) {
            // Adjust bullet velocity toward target
            const dx = nearest.x - bullet.x;
            const dy = nearest.y - bullet.y;
            const angle = Math.atan2(dy, dx);
            const currentAngle = Math.atan2(bullet.vy, bullet.vx);
            let diff = angle - currentAngle;
            
            // Normalize angle difference
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            
            // Apply correction based on level
            const correction = diff * maxCorrection;
            const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
            const newAngle = currentAngle + correction;
            
            bullet.vx = Math.cos(newAngle) * speed;
            bullet.vy = Math.sin(newAngle) * speed;
            
            // At level 10+, add slight homing effect
            if (level >= 10) {
                const homingStrength = 0.5 * ((level - 10) / 10); // 0.5 at lvl 10, 1.0 at lvl 20
                bullet.vx += (dx / minDist) * homingStrength;
                bullet.vy += (dy / minDist) * homingStrength;
            }
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
            const now = Date.now();
            const cooldown = this.powerUpActive.rapidFire ? 50 : this.shootCooldown;
            
            if (now - this.lastShootTime > cooldown) {
                this.lastShootTime = now;
                
                if (this.powerUpActive.tripleShot) {
                    // Enhanced multi-shot with level milestones
                    const tripleLevel = this.powerUpLevels.tripleShot || 1;
                    let shotCount = 3; // Base triple shot
                    if (tripleLevel >= 10) shotCount = 7; // Level 10: 7 shots
                    else if (tripleLevel >= 5) shotCount = 5; // Level 5: 5 shots
                    
                    const spreadAngle = 0.2; // Base spread
                    const startAngle = -Math.floor(shotCount / 2);
                    
                    for (let i = 0; i < shotCount; i++) {
                        const bullet = this.ship.shoot();
                        const angleOffset = (startAngle + i) * spreadAngle;
                        const angle = Math.atan2(bullet.vy, bullet.vx) + angleOffset;
                        const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                        bullet.vx = Math.cos(angle) * speed;
                        bullet.vy = Math.sin(angle) * speed;
                        
                        // Apply double damage if active
                        if (this.powerUpActive.doubleDamage) {
                            const ddLevel = this.powerUpLevels.doubleDamage || 1;
                            let damageMultiplier = 2;
                            if (ddLevel >= 15) damageMultiplier = 4;
                            else if (ddLevel >= 10) damageMultiplier = 3;
                            else if (ddLevel >= 5) damageMultiplier = 2.5;
                            bullet.damage = (bullet.damage || 1) * damageMultiplier;
                        }
                        
                        // Add auto-aim adjustment
                        if (this.powerUpActive.autoAim) {
                            this.applyAutoAim(bullet);
                        }
                        
                        this.bullets.push(bullet);
                    }
                } else {
                    const bullet = this.ship.shoot();
                    
                    // Apply double damage if active
                    if (this.powerUpActive.doubleDamage) {
                        const ddLevel = this.powerUpLevels.doubleDamage || 1;
                        let damageMultiplier = 2;
                        if (ddLevel >= 15) damageMultiplier = 4;
                        else if (ddLevel >= 10) damageMultiplier = 3;
                        else if (ddLevel >= 5) damageMultiplier = 2.5;
                        bullet.damage = (bullet.damage || 1) * damageMultiplier;
                    }
                    
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
            // Pass first boss for compatibility, but AI should be updated to handle multiple
            const primaryBoss = this.bosses.length > 0 ? this.bosses[0] : null;
            this.aiPlayer.makeDecisions(this.asteroids, primaryBoss, this.powerUps, this.canvas, this);
            
            // Send MPC planning request - adaptive frequency based on danger
            if (this.mpcWorker && this.aiPlayer) {
                // Calculate danger level for adaptive replanning
                const minAsteroidDist = this.asteroids.length > 0 ? 
                    Math.min(...this.asteroids.map(a => 
                        Math.hypot(a.x - this.aiPlayer.x, a.y - this.aiPlayer.y) - a.radius
                    )) : Infinity;
                
                const bossDist = this.bosses.length > 0 ? 
                    Math.min(...this.bosses.map(b => Math.hypot(b.x - this.aiPlayer.x, b.y - this.aiPlayer.y))) : Infinity;
                
                // Determine danger level and control frequency
                const inDanger = minAsteroidDist < 150 || bossDist < 300;
                const replanEvery = inDanger ? 2 : 6; // Replan every 2 frames in danger, 6 normally
                
                if ((this._mpcTick = (this._mpcTick||0)+1) % replanEvery === 0) {
                    const controlEvery = inDanger ? 2 : 5; // Tighter control in danger
                    const horizon = inDanger ? 90 : 120; // Shorter horizon when replanning fast
                    
                    const snap = {
                        ship: {
                            x: this.aiPlayer.x, y: this.aiPlayer.y, vx: this.aiPlayer.vx, vy: this.aiPlayer.vy, angle: this.aiPlayer.angle,
                            maxSpeed: this.aiPlayer.maxSpeed, rotSpeed: this.aiPlayer.rotationSpeed, thrust: this.aiPlayer.thrust,
                            radius: this.aiPlayer.radius
                        },
                        // Include velocities for proper prediction!
                        asteroids: this.asteroids.map(a=>({
                            x: a.x, y: a.y, vx: a.vx, vy: a.vy, radius: a.radius
                        })),
                        // Include ALL bullets, not just boss
                        bullets: this.bullets.map(b=>({
                            x: b.x, y: b.y, vx: b.vx, vy: b.vy, radius: b.radius||3, type: b.type
                        })),
                        boss: this.bosses.length > 0 ? this.bosses[0] : null, // MPC uses first boss for now
                        bosses: this.bosses.map(b => ({
                            x: b.x, y: b.y,
                            vx: b.vx || 0, vy: b.vy || 0,
                            radius: b.radius
                        })),
                        powerUps: this.powerUps.map(p=>({x:p.x,y:p.y})),
                        width: this.canvas.width, height: this.canvas.height,
                        dt: 1/60, horizon, controlEvery, samples: inDanger ? 256 : 512
                    };
                    
                    this.mpcWorker.postMessage({ type: 'plan', payload: snap });
                }
            }
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
        
        // Handle power-up updates
        this.powerUps = this.powerUps.filter(powerUp => powerUp.update());
        
        // Update all bosses
        const newBosses = []; // For mini-bosses spawned by SwarmBoss
        for (const boss of this.bosses) {
            // Freeze bosses completely during slowTime
            if (!this.powerUpActive.slowTime) {
                boss.update(this.canvas, this.ship);
                const bullet = boss.shoot();
                if (bullet) {
                    this.bullets.push(bullet);
                    this.soundManager.play('shoot');
                }
                
                // Check if this is a SwarmBoss that wants to spawn mini-bosses
                if (boss instanceof SwarmBoss) {
                    const miniBoss = boss.spawnMiniBoss();
                    if (miniBoss && this.bosses.length < 5) { // Limit total bosses
                        newBosses.push(miniBoss);
                        this.particleSystem.createExplosion(miniBoss.x, miniBoss.y, '#ff00ff', 20);
                        this.soundManager.play('powerup');
                    }
                }
            }
            // Bosses are frozen during slowTime - no movement or shooting
        }
        // Add any newly spawned mini-bosses
        this.bosses.push(...newBosses);
        
        this.particleSystem.update();
        this.screenShake.update();
        this.waveTransition.update();
        
        // Update companion system
        if (this.companionSystem && this.powerUpActive.companion) {
            this.companionSystem.update(this.canvas, this);
        }
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
                    
                    // Handle explosive bullets
                    if (bullet.explosive) {
                        // Explosion damages nearby asteroids
                        const explosionRadius = 100;
                        for (let k = this.asteroids.length - 1; k >= 0; k--) {
                            if (k === j) continue; // Skip the directly hit asteroid
                            const nearbyAsteroid = this.asteroids[k];
                            const explDist = Math.hypot(bullet.x - nearbyAsteroid.x, bullet.y - nearbyAsteroid.y);
                            if (explDist < explosionRadius) {
                                // Destroy nearby asteroids in explosion
                                const fragments = nearbyAsteroid.break();
                                this.asteroids.splice(k, 1);
                                this.asteroids.push(...fragments);
                                this.ui.updateScore(nearbyAsteroid.getPoints());
                            }
                        }
                        this.particleSystem.createExplosion(bullet.x, bullet.y, '#ff8800', 30);
                        this.screenShake.shake(8, 15);
                    }
                    
                    // Asteroid is destroyed immediately on hit
                    const fragments = asteroid.break();
                    this.asteroids.splice(j, 1);
                    this.asteroids.push(...fragments);
                    
                    // Apply double points with level scaling
                    let multiplier = 1;
                    if (this.powerUpActive.doublePoints) {
                        const doubleLevel = this.powerUpLevels.doublePoints || 1;
                        if (doubleLevel >= 10) {
                            multiplier = 3 + Math.floor((doubleLevel - 10) / 5) * 0.5; // 3x at lvl 10, +0.5x every 5 levels
                        } else if (doubleLevel >= 5) {
                            multiplier = 2.5; // 2.5x at level 5
                        } else {
                            multiplier = 2; // 2x base
                        }
                    }
                    const points = asteroid.getPoints() * multiplier;
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
            
            // Check collision with all bosses
            if (bullet.type !== 'boss') {
                for (let k = this.bosses.length - 1; k >= 0; k--) {
                    const boss = this.bosses[k];
                    const dist = Math.hypot(bullet.x - boss.x, bullet.y - boss.y);
                    if (dist < bullet.radius + boss.radius) {
                        if (!bullet.penetrating) {
                            this.bullets.splice(i, 1);
                        }
                        
                        if (this.aiMode) {
                            this.aiStats.hits++;
                        }
                        
                        boss.takeDamage(bullet.damage);
                        this.particleSystem.createBulletImpact(bullet.x, bullet.y);
                        this.soundManager.play('hit');
                        
                        if (!boss.alive) {
                            this.ui.updateScore(boss.points);
                            this.particleSystem.createExplosion(boss.x, boss.y, '#ff0000', 50);
                            this.soundManager.play('explosion');
                            this.screenShake.shake(20, 30);
                            this.bosses.splice(k, 1);
                            
                            // Level up ONE random power-up on boss kill
                            this.bossKills++;
                            this.levelUpRandomPowerUp();
                        }
                        
                        if (!bullet.penetrating) {
                            break;
                        }
                    }
                }
            }
        }
        
        if (this.ship && this.ship.alive && !this.ship.invulnerable) {
            for (const asteroid of this.asteroids) {
                const dist = Math.hypot(this.ship.x - asteroid.x, this.ship.y - asteroid.y);
                if (dist < this.ship.radius + asteroid.radius) {
                    if (!this.ship.invulnerable) {
                        this.shipHit();
                    } else {
                        // Invulnerable, just show effect
                        this.particleSystem.createExplosion(this.ship.x, this.ship.y, '#00ff00', 15);
                    }
                    break;
                }
            }
            
            // Check collision with all bosses
            for (const boss of this.bosses) {
                const dist = Math.hypot(this.ship.x - boss.x, this.ship.y - boss.y);
                if (dist < this.ship.radius + boss.radius) {
                    if (!this.ship.invulnerable) {
                        this.shipHit();
                        break; // Only hit once
                    } else {
                        // Invulnerable, just show effect
                        this.particleSystem.createExplosion(this.ship.x, this.ship.y, '#00ff00', 15);
                    }
                }
            }
            
            // Check companion collisions
            if (this.companionSystem && this.powerUpActive.companion) {
                const collisionResult = this.companionSystem.checkCollisions(this.asteroids, this.bosses, this.bullets);
                if (collisionResult.destroyed) {
                    // Visual feedback for companion destruction
                    this.particleSystem.createExplosion(collisionResult.companion.x, collisionResult.companion.y, '#00ff00', 10);
                    this.soundManager.play('hit');
                    
                    // Remove bullet if it hit a companion
                    if (collisionResult.bullet) {
                        const bulletIndex = this.bullets.indexOf(collisionResult.bullet);
                        if (bulletIndex > -1) {
                            this.bullets.splice(bulletIndex, 1);
                        }
                    }
                }
            }
            
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const bullet = this.bullets[i];
                if (bullet.type === 'boss') {
                    const dist = Math.hypot(this.ship.x - bullet.x, this.ship.y - bullet.y);
                    if (dist < this.ship.radius + bullet.radius) {
                        this.bullets.splice(i, 1);
                        if (!this.ship.invulnerable) {
                            this.shipHit();
                        } else {
                            // Invulnerable, just show effect
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
        // Explosion radius increases with bomb count and level
        const bombLevel = this.powerUpLevels.bomb || 1;
        const levelRadiusBonus = Math.floor(bombLevel / 2) * 0.15; // +15% every 2 levels
        const radiusMultiplier = 1 + levelRadiusBonus;
        const bombRadius = 150 * bombCount * radiusMultiplier;
        let destroyed = 0;
        
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            const dist = Math.hypot(x - asteroid.x, y - asteroid.y);
            
            if (dist < bombRadius) {
                destroyed++;
                // Small asteroids are completely destroyed
                if (asteroid.size === 'small') {
                    this.asteroids.splice(i, 1);
                } else {
                    // Medium and large break into fragments
                    const fragments = asteroid.break();
                    this.asteroids.splice(i, 1);
                    this.asteroids.push(...fragments);
                }
                
                // Apply double points with level scaling
                let multiplier = 1;
                if (this.powerUpActive.doublePoints) {
                    const doubleLevel = this.powerUpLevels.doublePoints || 1;
                    if (doubleLevel >= 10) {
                        multiplier = 3 + Math.floor((doubleLevel - 10) / 5) * 0.5;
                    } else if (doubleLevel >= 5) {
                        multiplier = 2.5;
                    } else {
                        multiplier = 2;
                    }
                }
                this.ui.updateScore(asteroid.getPoints() * multiplier);
                this.particleSystem.createAsteroidExplosion(asteroid.x, asteroid.y, asteroid.radius);
            }
        }
        
        if (destroyed > 0 || bombCount > 0) {
            // Bigger explosion with more bombs
            this.particleSystem.createExplosion(x, y, '#ff8800', 40 * bombCount);
            this.screenShake.shake(10 * bombCount, 15 * bombCount);
            this.soundManager.play('explosion');
        }
    }
    
    getPlayerLevel() {
        // Player level based on boss kills
        return this.bossKills + 1;
    }
    
    levelUpRandomPowerUp(count = 1) {
        const powerUpTypes = ['shield', 'rapidFire', 'tripleShot', 'slowTime', 'companion', 
                              'bomb', 'speedBoost', 'doublePoints', 'autoAim', 'extraLife', 'doubleDamage'];
        
        // Filter out max level power-ups
        const availableTypes = powerUpTypes.filter(type => {
            const currentLevel = this.powerUpLevels[type] || 1;
            return currentLevel < 30; // Max level cap
        });
        
        if (availableTypes.length === 0) {
            console.log('All power-ups at max level!');
            return;
        }
        
        // Pick a random power-up to level
        const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const oldLevel = this.powerUpLevels[randomType] || 1;
        const newLevel = Math.min(30, oldLevel + count); // Ensure we don't exceed max level
        this.powerUpLevels[randomType] = newLevel;
        
        // Update player level display
        const playerLevel = this.getPlayerLevel();
        document.getElementById('level').textContent = playerLevel;
        
        // Update level progress bar
        const progressBar = document.querySelector('.level-progress');
        if (progressBar) {
            progressBar.style.setProperty('--progress', '0%');
        }
        
        // Visual feedback for level up
        if (this.ship) {
            this.particleSystem.createExplosion(this.ship.x, this.ship.y, '#ffff00', 30);
        }
        this.soundManager.play('powerup');
        
        // Show notification with power-up name
        const powerUpNames = {
            shield: 'Shield',
            rapidFire: 'Rapid Fire',
            tripleShot: 'Triple Shot',
            slowTime: 'Slow Time',
            companion: 'Companion',
            bomb: 'Bomb',
            speedBoost: 'Speed Boost',
            doublePoints: 'Double Points',
            autoAim: 'Auto Aim',
            extraLife: 'Extra Life',
            doubleDamage: 'Double Damage'
        };
        
        const message = `LEVEL UP! ${powerUpNames[randomType]} is now level ${newLevel}${newLevel === 30 ? ' (MAX)' : ''}`;
        console.log(message);
        
        // Show visual notification (could add UI toast later)
        if (count > 1) {
            console.log(`+${count} levels to ${powerUpNames[randomType]}!`);
        }
    }
    
    activatePowerUp(powerUp) {
        const type = powerUp.type;
        const level = this.powerUpLevels[type] || 1;
        let baseDuration = powerUp.types[type].duration;
        
        // Apply level bonus to duration (5% for slowTime, 10% for others)
        if (baseDuration > 0) {
            const durationBonus = type === 'slowTime' ? 0.05 : 0.1;
            baseDuration = Math.floor(baseDuration * (1 + (level - 1) * durationBonus));
        }
        
        // Handle instant-use power-ups
        if (type === 'bomb') {
            // Stack the bomb first
            this.bombCount++;
            
            // Check if we should explode (6 or more bombs)
            if (this.bombCount >= 6) {
                // Trigger mega explosion at 6+ stacks
                this.triggerBombExplosion(this.ship.x, this.ship.y, this.bombCount);
                this.bombCount = 0;
                this.ui.updateBombCount(0);
            } else {
                this.ui.updateBombCount(this.bombCount);
            }
            return;
        } else if (type === 'extraLife') {
            // Level 5: Grant random power-up, Level 10: Give 2 hearts
            const heartsToGive = level >= 10 ? 2 : 1;
            this.lives += heartsToGive;
            this.ui.updateLives(this.lives);
            
            // Level 5 milestone: grant random power-up
            if (level >= 5) {
                const powerUpTypes = ['shield', 'rapidFire', 'tripleShot', 'speedBoost', 'autoAim'];
                const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                const fakePowerUp = { type: randomType, types: powerUp.types };
                setTimeout(() => this.activatePowerUp(fakePowerUp), 100);
            }
            
            // Level 15: Also grant shield
            if (level >= 15) {
                const fakePowerUp = { type: 'shield', types: powerUp.types };
                setTimeout(() => this.activatePowerUp(fakePowerUp), 200);
            }
            
            this.soundManager.play('powerup');
            return;
        }
        
        // Handle duration-based power-ups with stacking
        if (!this.powerUpStacks[type]) {
            this.powerUpStacks[type] = 0;
        }
        
        // Clear existing timer if active
        if (this.powerUpTimers[type]) {
            clearTimeout(this.powerUpTimers[type]);
        }
        
        // Calculate total duration: base + (base * stack_count)
        this.powerUpStacks[type]++;
        const totalDuration = baseDuration * this.powerUpStacks[type];
        
        // Mark power-up as active
        this.powerUpActive[type] = true;
        
        // Special handling for shield - hit-based protection
        if (type === 'shield') {
            this.ship.hasShield = true;
            this.ship.shieldHits = 0;
            this.ship.maxShieldHits = 3;
            this.ship.shieldLevel = level;
            
            // Level abilities
            if (level >= 15) {
                // Level 15: Full invulnerability
                this.ship.invulnerable = true;
                this.ship.invulnerableStart = Date.now();
                this.ship.invulnerableTime = totalDuration;
            }
            if (level >= 10) {
                // Level 10: Reflect bullets
                this.ship.reflectBullets = true;
            }
        }
        
        // Special handling for slowTime - apply permanent 5% reduction
        if (type === 'slowTime') {
            this.asteroids.forEach(asteroid => {
                asteroid.vx *= 0.95;  // Permanent 5% reduction
                asteroid.vy *= 0.95;
            });
        }
        
        // Special handling for companion power-up
        if (type === 'companion') {
            if (!this.companionSystem) {
                this.companionSystem = new CompanionSystem(this.ship);
            }
            this.companionSystem.updateLevel(level);
        }
        
        // Set timer for power-up expiration
        this.powerUpTimers[type] = setTimeout(() => {
            delete this.powerUpActive[type];
            delete this.powerUpTimers[type];
            this.powerUpStacks[type] = 0;
            this.ui.removePowerUp(type);
            
            // Remove shield when it expires
            if (type === 'shield') {
                this.ship.hasShield = false;
                this.ship.invulnerable = false;
                this.ship.reflectBullets = false;
                this.ship.shieldHits = 0;
            }
            
            // Deactivate companions when power-up expires
            if (type === 'companion' && this.companionSystem) {
                this.companionSystem.deactivate();
            }
        }, totalDuration);
        
        // Update UI with stacked duration, pass level for sprite display
        this.ui.addPowerUp(type, totalDuration, this.powerUpStacks[type], level);
    }
    
    shipHit() {
        // Trigger bomb explosion on ANY hit if bombs are stacked
        if (this.bombCount > 0) {
            this.triggerBombExplosion(this.ship.x, this.ship.y, this.bombCount);
            this.bombCount = 0;
            this.ui.updateBombCount(0);
            // Bomb explosion protects from this hit
            return;
        }
        
        // Check if shield blocks the hit
        if (this.ship.hasShield && this.ship.shieldHits < this.ship.maxShieldHits) {
            this.ship.shieldHits++;
            
            // Shield level abilities
            const shieldLevel = this.ship.shieldLevel;
            
            // Level 5: Deal damage when blocking
            if (shieldLevel >= 5) {
                // Create damaging explosion at ship location
                this.particleSystem.createExplosion(this.ship.x, this.ship.y, '#00ff00', 10);
                // Damage nearby asteroids
                this.asteroids.forEach(asteroid => {
                    const dist = Math.hypot(asteroid.x - this.ship.x, asteroid.y - this.ship.y);
                    if (dist < 100) {
                        asteroid.hp = (asteroid.hp || 1) - 1;
                        if (asteroid.hp <= 0) {
                            const index = this.asteroids.indexOf(asteroid);
                            if (index > -1) {
                                this.asteroids.splice(index, 1);
                                this.ui.updateScore(asteroid.getPoints());
                            }
                        }
                    }
                });
            }
            
            // Level 20: Shockwave on hit
            if (shieldLevel >= 20) {
                this.screenShake.shake(15, 15);
                this.particleSystem.createExplosion(this.ship.x, this.ship.y, '#00ffff', 30);
            }
            
            // Check if shield is depleted
            if (this.ship.shieldHits >= this.ship.maxShieldHits) {
                this.ship.hasShield = false;
                this.powerUpActive.shield = false;
                this.ui.removePowerUp('shield');
            }
            
            // Visual feedback for shield hit
            this.particleSystem.createExplosion(this.ship.x, this.ship.y, '#00ff00', 5);
            this.soundManager.play('hit');
            
            // Update UI to show remaining shield hits
            console.log(`Shield hit! ${this.ship.maxShieldHits - this.ship.shieldHits} hits remaining`);
            return; // Don't lose a life
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
            // Auto-collect all power-ups on wave completion
            if (this.powerUps.length > 0 && this.ship && this.ship.alive) {
                const powerUpsToCollect = [...this.powerUps];
                this.powerUps = []; // Clear power-ups array
                
                // Activate each power-up with full duration
                powerUpsToCollect.forEach((powerUp, index) => {
                    setTimeout(() => {
                        this.activatePowerUp(powerUp);
                        this.particleSystem.createPowerUpCollect(
                            this.ship.x + (Math.random() - 0.5) * 100,
                            this.ship.y + (Math.random() - 0.5) * 100,
                            powerUp.types[powerUp.type].color
                        );
                        this.soundManager.play('powerup');
                    }, index * 100); // Stagger collection for visual effect
                });
            }
            
            this.wave++;
            this.ui.updateWave(this.wave);
            this.asteroidSpeed += 0.1;
            this.bossSpawnChance += 0.001;
            
            // Add 2 level-ups to the same random ability on wave completion
            this.levelUpRandomPowerUp(2);
            
            this.createAsteroids(Math.min(5 + this.wave, 15));  // More asteroids per wave
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
        
        // Clean up MPC worker if it exists
        if (this.mpcWorker) {
            this.mpcWorker.terminate();
            this.mpcWorker = null;
            this._mpcPlan = null;
        }
        
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
        
        // Draw all bosses
        for (const boss of this.bosses) {
            boss.draw(this.ctx, theme);
        }
        
        this.bullets.forEach(bullet => bullet.draw(this.ctx, theme));
        
        if (this.ship && this.ship.alive) {
            this.ship.draw(this.ctx, theme);
        }
        
        // Draw companions
        if (this.companionSystem && this.powerUpActive.companion) {
            this.companionSystem.draw(this.ctx, theme);
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