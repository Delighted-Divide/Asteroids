// Model Predictive Control (MPC) Engine for Superhuman Asteroids AI

class GameState {
    constructor() {
        // Ship state
        this.ship = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            angle: 0,
            alive: true,
            radius: 15,
            hasShield: false,
            hasRapidFire: false,
            hasTripleShot: false,
            hasLaser: false
        };
        
        // Asteroids array
        this.asteroids = [];
        
        // Boss state (if present)
        this.boss = null;
        
        // Bullets array
        this.bullets = [];
        
        // Power-ups array
        this.powerUps = [];
        
        // Game parameters
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.frameCount = 0;
    }
    
    // Clone the entire game state for simulation
    clone() {
        const newState = new GameState();
        
        // Deep copy ship
        newState.ship = { ...this.ship };
        
        // Deep copy asteroids
        newState.asteroids = this.asteroids.map(a => ({
            x: a.x,
            y: a.y,
            vx: a.vx,
            vy: a.vy,
            radius: a.radius,
            size: a.size,
            points: a.points
        }));
        
        // Deep copy boss if present
        if (this.boss) {
            newState.boss = {
                x: this.boss.x,
                y: this.boss.y,
                vx: this.boss.vx,
                vy: this.boss.vy,
                health: this.boss.health,
                radius: this.boss.radius,
                shootCooldown: this.boss.shootCooldown
            };
        }
        
        // Deep copy bullets
        newState.bullets = this.bullets.map(b => ({
            x: b.x,
            y: b.y,
            vx: b.vx,
            vy: b.vy,
            radius: b.radius,
            type: b.type,
            lifetime: b.lifetime
        }));
        
        // Deep copy power-ups
        newState.powerUps = this.powerUps.map(p => ({
            x: p.x,
            y: p.y,
            type: p.type,
            radius: p.radius
        }));
        
        newState.canvasWidth = this.canvasWidth;
        newState.canvasHeight = this.canvasHeight;
        newState.frameCount = this.frameCount;
        
        return newState;
    }
    
    // Create state snapshot from actual game
    static fromGame(game, canvas) {
        const state = new GameState();
        
        // Copy ship state
        if (game.ship) {
            state.ship.x = game.ship.x;
            state.ship.y = game.ship.y;
            state.ship.vx = game.ship.vx;
            state.ship.vy = game.ship.vy;
            state.ship.angle = game.ship.angle;
            state.ship.alive = game.ship.alive;
            state.ship.radius = game.ship.radius;
            state.ship.hasShield = !!game.powerUpActive.shield;
            state.ship.hasRapidFire = !!game.powerUpActive.rapidFire;
            state.ship.hasTripleShot = !!game.powerUpActive.tripleShot;
            state.ship.hasLaser = !!game.powerUpActive.laser;
        }
        
        // Copy asteroids
        state.asteroids = game.asteroids.map(a => ({
            x: a.x,
            y: a.y,
            vx: a.vx,
            vy: a.vy,
            radius: a.radius,
            size: a.size,
            points: typeof a.getPoints === 'function' ? a.getPoints() : (a.points || 100)
        }));
        
        // Copy boss if present
        if (game.boss) {
            state.boss = {
                x: game.boss.x,
                y: game.boss.y,
                vx: game.boss.vx || 0,
                vy: game.boss.vy || 0,
                health: game.boss.health,
                radius: game.boss.radius,
                shootCooldown: game.boss.shootCooldown || 0
            };
        }
        
        // Copy bullets
        state.bullets = game.bullets.map(b => ({
            x: b.x,
            y: b.y,
            vx: b.vx,
            vy: b.vy,
            radius: b.radius,
            type: b.type || 'player',
            lifetime: b.lifetime || 60
        }));
        
        // Copy power-ups
        state.powerUps = game.powerUps.map(p => ({
            x: p.x,
            y: p.y,
            type: p.type,
            radius: p.radius
        }));
        
        state.canvasWidth = canvas.width;
        state.canvasHeight = canvas.height;
        
        return state;
    }
    
    // Convert to plain object for serialization
    toPlainObject() {
        return {
            ship: { ...this.ship },
            asteroids: this.asteroids.map(a => ({ ...a })),
            boss: this.boss ? { ...this.boss } : null,
            bullets: this.bullets.map(b => ({ ...b })),
            powerUps: this.powerUps.map(p => ({ ...p })),
            canvasWidth: this.canvasWidth,
            canvasHeight: this.canvasHeight,
            frameCount: this.frameCount
        };
    }
    
    // Create from plain object (for worker deserialization)
    static fromPlainObject(obj) {
        const state = new GameState();
        Object.assign(state, obj);
        return state;
    }
}

class Simulator {
    constructor() {
        // Physics constants
        this.THRUST = 0.5;
        this.ROTATION_SPEED = 0.1;
        this.FRICTION = 0.99;
        this.MAX_SPEED = 10;
        this.BULLET_SPEED = 15;
        this.BOSS_SHOOT_COOLDOWN = 120; // frames
    }
    
    // Simulate one frame of the game
    simulateFrame(state, action) {
        // Update ship based on action
        this.simulateShip(state, action);
        
        // Update asteroids
        this.simulateAsteroids(state);
        
        // Update boss
        if (state.boss) {
            this.simulateBoss(state);
        }
        
        // Update bullets
        this.simulateBullets(state);
        
        // Check collisions
        this.checkCollisions(state);
        
        // Handle shooting if action includes it
        if (action.shoot && state.ship.alive) {
            this.handleShooting(state);
        }
        
        state.frameCount++;
        return state;
    }
    
    simulateShip(state, action) {
        if (!state.ship.alive) return;
        
        const ship = state.ship;
        
        // Apply rotation
        if (action.rotateLeft) {
            ship.angle -= this.ROTATION_SPEED;
        }
        if (action.rotateRight) {
            ship.angle += this.ROTATION_SPEED;
        }
        
        // Apply thrust
        if (action.thrust) {
            ship.vx += Math.cos(ship.angle) * this.THRUST;
            ship.vy += Math.sin(ship.angle) * this.THRUST;
            
            // Limit max speed
            const speed = Math.hypot(ship.vx, ship.vy);
            if (speed > this.MAX_SPEED) {
                ship.vx = (ship.vx / speed) * this.MAX_SPEED;
                ship.vy = (ship.vy / speed) * this.MAX_SPEED;
            }
        }
        
        // Apply friction
        ship.vx *= this.FRICTION;
        ship.vy *= this.FRICTION;
        
        // Update position
        ship.x += ship.vx;
        ship.y += ship.vy;
        
        // Wrap around screen
        this.wrapPosition(ship, state);
    }
    
    simulateAsteroids(state) {
        for (const asteroid of state.asteroids) {
            asteroid.x += asteroid.vx;
            asteroid.y += asteroid.vy;
            this.wrapPosition(asteroid, state);
        }
    }
    
    simulateBoss(state) {
        if (!state.boss) return;
        
        const boss = state.boss;
        
        // Simple boss movement (can be enhanced)
        boss.x += boss.vx;
        boss.y += boss.vy;
        this.wrapPosition(boss, state);
        
        // Boss shooting
        boss.shootCooldown--;
        if (boss.shootCooldown <= 0 && state.ship.alive) {
            // Create boss bullet aimed at ship
            const dx = state.ship.x - boss.x;
            const dy = state.ship.y - boss.y;
            const angle = Math.atan2(dy, dx);
            
            state.bullets.push({
                x: boss.x,
                y: boss.y,
                vx: Math.cos(angle) * 8,
                vy: Math.sin(angle) * 8,
                radius: 5,
                type: 'boss',
                lifetime: 120
            });
            
            boss.shootCooldown = this.BOSS_SHOOT_COOLDOWN;
        }
    }
    
    simulateBullets(state) {
        // Update bullet positions and remove expired ones
        state.bullets = state.bullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.lifetime--;
            
            this.wrapPosition(bullet, state);
            return bullet.lifetime > 0;
        });
    }
    
    handleShooting(state) {
        const ship = state.ship;
        
        // Add cooldown to prevent shooting every frame
        if (!state.shootCooldown) state.shootCooldown = 0;
        if (state.shootCooldown > 0) {
            state.shootCooldown--;
            return;
        }
        
        // Set cooldown based on power-ups
        state.shootCooldown = ship.hasRapidFire ? 3 : 8; // frames between shots
        
        if (ship.hasTripleShot) {
            // Triple shot
            for (let i = -1; i <= 1; i++) {
                const angle = ship.angle + (i * 0.2);
                state.bullets.push({
                    x: ship.x + Math.cos(angle) * ship.radius,
                    y: ship.y + Math.sin(angle) * ship.radius,
                    vx: Math.cos(angle) * this.BULLET_SPEED + ship.vx * 0.5, // Inherit some ship velocity
                    vy: Math.sin(angle) * this.BULLET_SPEED + ship.vy * 0.5,
                    radius: 3,
                    type: 'player',
                    lifetime: 60
                });
            }
        } else if (ship.hasLaser) {
            // Laser beam - faster and penetrating
            state.bullets.push({
                x: ship.x + Math.cos(ship.angle) * ship.radius,
                y: ship.y + Math.sin(ship.angle) * ship.radius,
                vx: Math.cos(ship.angle) * this.BULLET_SPEED * 2 + ship.vx * 0.5,
                vy: Math.sin(ship.angle) * this.BULLET_SPEED * 2 + ship.vy * 0.5,
                radius: 4,
                type: 'player',
                lifetime: 60
            });
        } else {
            // Single shot
            state.bullets.push({
                x: ship.x + Math.cos(ship.angle) * ship.radius,
                y: ship.y + Math.sin(ship.angle) * ship.radius,
                vx: Math.cos(ship.angle) * this.BULLET_SPEED + ship.vx * 0.5,
                vy: Math.sin(ship.angle) * this.BULLET_SPEED + ship.vy * 0.5,
                radius: 3,
                type: 'player',
                lifetime: 60
            });
        }
    }
    
    checkCollisions(state) {
        const ship = state.ship;
        
        // Ship-asteroid collisions
        if (ship.alive && !ship.hasShield) {
            for (const asteroid of state.asteroids) {
                const dist = this.distance(ship, asteroid, state);
                if (dist < ship.radius + asteroid.radius) {
                    ship.alive = false;
                    return;
                }
            }
        }
        
        // Ship-boss collision
        if (ship.alive && state.boss && !ship.hasShield) {
            const dist = this.distance(ship, state.boss, state);
            if (dist < ship.radius + state.boss.radius) {
                ship.alive = false;
                return;
            }
        }
        
        // Ship-bullet collisions (boss bullets)
        if (ship.alive && !ship.hasShield) {
            for (const bullet of state.bullets) {
                if (bullet.type === 'boss') {
                    const dist = this.distance(ship, bullet, state);
                    if (dist < ship.radius + bullet.radius) {
                        ship.alive = false;
                        return;
                    }
                }
            }
        }
        
        // Bullet-asteroid collisions (no duplicates, no holes)
        const ast = state.asteroids;
        const bullets = state.bullets;
        
        const aliveAst = new Array(ast.length).fill(true);
        const nextBullets = [];
        const spawned = [];
        
        for (const bullet of bullets) {
            let consumed = false;
            
            if (bullet.type === 'player') {
                for (let i = 0; i < ast.length; i++) {
                    if (!aliveAst[i]) continue;
                    const A = ast[i];
                    if (this.distance(A, bullet, state) < A.radius + bullet.radius) {
                        aliveAst[i] = false;
                        consumed = !state.ship.hasLaser;       // lasers pierce
                        // spawn fragments without touching ast[i]
                        if (A.size === 'large')   spawned.push(...this.spawnFragments(A, 'medium'));
                        else if (A.size === 'medium') spawned.push(...this.spawnFragments(A, 'small'));
                        if (consumed) break;
                    }
                }
            }
            
            if (!consumed) nextBullets.push(bullet);
        }
        
        // rebuild arrays compactly (no nulls)
        const nextAst = [];
        for (let i = 0; i < ast.length; i++) if (aliveAst[i]) nextAst.push(ast[i]);
        state.asteroids = nextAst.concat(spawned);
        state.bullets   = nextBullets;
        
        // end-of-frame sanitation (belt & suspenders)
        state.asteroids = state.asteroids.filter(Boolean);
        state.bullets   = state.bullets.filter(Boolean);
        state.powerUps  = state.powerUps.filter(Boolean);
        
        // Bullet-boss collisions
        if (state.boss) {
            for (const bullet of state.bullets) {
                if (bullet.type === 'player') {
                    const dist = this.distance(state.boss, bullet, state);
                    if (dist < state.boss.radius + bullet.radius) {
                        state.boss.health--;
                        if (state.boss.health <= 0) {
                            state.boss = null;
                        }
                    }
                }
            }
        }
        
        // Power-up collection
        state.powerUps = state.powerUps.filter(powerUp => {
            if (ship.alive) {
                const dist = this.distance(ship, powerUp, state);
                if (dist < ship.radius + powerUp.radius) {
                    // Apply power-up effect
                    this.applyPowerUp(state, powerUp.type);
                    return false; // Remove collected power-up
                }
            }
            return true;
        });
    }
    
    applyPowerUp(state, type) {
        switch(type) {
            case 'shield':
                state.ship.hasShield = true;
                break;
            case 'rapidFire':
                state.ship.hasRapidFire = true;
                break;
            case 'tripleShot':
                state.ship.hasTripleShot = true;
                break;
            case 'laser':
                state.ship.hasLaser = true;
                break;
        }
    }
    
    distance(a, b, state) {
        // Always safe. If anything is missing, treat as "far away".
        if (!a || !b || a.x == null || b.x == null || !isFinite(a.x) || !isFinite(b.x))
            return Number.POSITIVE_INFINITY;
        
        // Torus wrap shortest distance
        const W = state.canvasWidth, H = state.canvasHeight;
        let dx = a.x - b.x; 
        dx -= Math.round(dx / W) * W;
        let dy = a.y - b.y; 
        dy -= Math.round(dy / H) * H;
        return Math.hypot(dx, dy);
    }
    
    // Create fragments from destroyed asteroid
    spawnFragments(asteroid, newSize) {
        const fragments = [];
        const angle = Math.atan2(asteroid.vy, asteroid.vx);
        const count = 2;
        
        for (let i = 0; i < count; i++) {
            const spreadAngle = angle + (i === 0 ? 0.5 : -0.5);
            const speed = newSize === 'medium' ? 3 : 5;
            const radius = newSize === 'medium' ? 20 : 10;
            const points = newSize === 'medium' ? 50 : 100;
            
            fragments.push({
                x: asteroid.x,
                y: asteroid.y,
                vx: Math.cos(spreadAngle) * speed,
                vy: Math.sin(spreadAngle) * speed,
                radius: radius,
                size: newSize,
                points: points
            });
        }
        
        return fragments;
    }
    
    wrapPosition(obj, state) {
        if (obj.x < 0) obj.x += state.canvasWidth;
        if (obj.x > state.canvasWidth) obj.x -= state.canvasWidth;
        if (obj.y < 0) obj.y += state.canvasHeight;
        if (obj.y > state.canvasHeight) obj.y -= state.canvasHeight;
    }
}

class ActionSequence {
    constructor(length = 60) {
        this.actions = [];
        this.length = length;
        this.score = -Infinity;
        
        // Initialize with empty actions
        for (let i = 0; i < length; i++) {
            this.actions.push({
                thrust: false,
                rotateLeft: false,
                rotateRight: false,
                shoot: false
            });
        }
    }
    
    // Generate a random action sequence
    static generateRandom(length = 60) {
        const seq = new ActionSequence(length);
        
        for (let i = 0; i < length; i++) {
            // Bias toward reasonable actions
            seq.actions[i] = {
                thrust: Math.random() < 0.6,  // Thrust 60% of time
                rotateLeft: Math.random() < 0.15,
                rotateRight: Math.random() < 0.15,
                shoot: Math.random() < 0.3  // Shoot 30% of time
            };
            
            // Prevent conflicting rotations
            if (seq.actions[i].rotateLeft && seq.actions[i].rotateRight) {
                seq.actions[i].rotateRight = false;
            }
        }
        
        return seq;
    }
    
    // Mutate an existing sequence
    mutate(mutationRate = 0.1) {
        const newSeq = new ActionSequence(this.length);
        
        for (let i = 0; i < this.length; i++) {
            if (Math.random() < mutationRate) {
                // Mutate this action
                newSeq.actions[i] = {
                    thrust: Math.random() < 0.6,
                    rotateLeft: Math.random() < 0.15,
                    rotateRight: Math.random() < 0.15,
                    shoot: Math.random() < 0.3
                };
                
                if (newSeq.actions[i].rotateLeft && newSeq.actions[i].rotateRight) {
                    newSeq.actions[i].rotateRight = false;
                }
            } else {
                // Copy existing action
                newSeq.actions[i] = { ...this.actions[i] };
            }
        }
        
        return newSeq;
    }
    
    // Crossover two sequences
    static crossover(seq1, seq2) {
        const newSeq = new ActionSequence(seq1.length);
        const crossPoint = Math.floor(Math.random() * seq1.length);
        
        for (let i = 0; i < seq1.length; i++) {
            if (i < crossPoint) {
                newSeq.actions[i] = { ...seq1.actions[i] };
            } else {
                newSeq.actions[i] = { ...seq2.actions[i] };
            }
        }
        
        return newSeq;
    }
}

// Lead-aim intercept calculation (2D constant-speed intercept)
function leadIntercept(shooter, target, bulletSpeed, maxT) {
    const rx = target.x - shooter.x, ry = target.y - shooter.y;
    const vx = target.vx || 0, vy = target.vy || 0; // target vel in sim
    const ss = bulletSpeed * bulletSpeed;
    const vv = vx * vx + vy * vy;
    const rdotv = rx * vx + ry * vy;
    
    const a = vv - ss;
    const b = 2 * rdotv;
    const c = rx * rx + ry * ry;
    
    let t;
    if (Math.abs(a) < 1e-6) {
        if (Math.abs(b) < 1e-6) return null;
        t = -c / b;
    } else {
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const s = Math.sqrt(disc);
        const t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a);
        t = t1 > 0 ? t1 : (t2 > 0 ? t2 : null);
    }
    if (!t || (maxT && t > maxT)) return null;
    
    const aimX = target.x + vx * t, aimY = target.y + vy * t;
    const angle = Math.atan2(aimY - shooter.y, aimX - shooter.x);
    return { t, angle, aimX, aimY };
}

class MPCPlanner {
    constructor() {
        this.simulator = new Simulator();
        this.horizon = 45; // 0.75 second lookahead (reduced for performance)
        this.numSequences = 100; // Number of candidate sequences (reduced for performance)
        this.generations = 3; // Evolution generations (reduced for performance)
        
        // Cache for plan reuse
        this.lastBestSequence = null;
        this.planCache = [];
        
        // Lead-aim constants
        this.bulletSpeed = 15;
        this.maxBulletTime = 60; // frames
        
        // Scoring weights (tuned for superhuman aggressive play)
        this.weights = {
            // Kill rewards (prefer fast clearing)
            smallKill: 80,
            mediumKill: 40, 
            largeKill: 20,
            bossDamage: 120,
            powerUp: 90,
            
            // Survival penalties
            death: -100000,
            nearMissAst: 2200,      // sum ~ 1/(d+ε)^2 for asteroid near-misses
            nearMissBoss: 3500,     // stronger penalty near boss
            
            // Behavior penalties
            timePerFrame: -0.6,
            idleFire: -60,          // if >24 frames without a planned shot
            antiPassivity: -200,    // hittable target but plannedShots==0  
            longShotPenalty: -80,   // discourage far snipes; prefer <0.6s ToF
            
            // Smoothness (minimal)
            thrustToggle: -1,
            rotationChange: -1
        };
    }
    
    // Main planning function
    plan(gameState) {
        // Generate initial population of sequences
        let population = this.generateInitialPopulation();
        
        // Evolutionary optimization
        for (let gen = 0; gen < this.generations; gen++) {
            // Evaluate all sequences
            for (const seq of population) {
                if (seq.score === -Infinity) {
                    seq.score = this.evaluateSequence(seq, gameState);
                }
            }
            
            // Sort by score
            population.sort((a, b) => b.score - a.score);
            
            // Keep best sequences and generate new ones
            const elite = population.slice(0, this.numSequences / 4);
            const newPop = [...elite];
            
            // Generate offspring through crossover and mutation
            while (newPop.length < this.numSequences) {
                const parent1 = elite[Math.floor(Math.random() * elite.length)];
                const parent2 = elite[Math.floor(Math.random() * elite.length)];
                
                if (Math.random() < 0.7) {
                    // Crossover
                    const child = ActionSequence.crossover(parent1, parent2);
                    newPop.push(child);
                } else {
                    // Mutation
                    const mutant = parent1.mutate(0.2);
                    newPop.push(mutant);
                }
            }
            
            population = newPop;
        }
        
        // Final evaluation and selection
        for (const seq of population) {
            if (seq.score === -Infinity) {
                seq.score = this.evaluateSequence(seq, gameState);
            }
        }
        
        population.sort((a, b) => b.score - a.score);
        
        // Cache the best sequence for next planning cycle
        this.lastBestSequence = population[0];
        
        return population[0]; // Return best sequence
    }
    
    generateInitialPopulation() {
        const population = [];
        
        // Reuse previous best sequence if available (shifted by replan interval)
        if (this.lastBestSequence && this.lastBestSequence.score > -1000) {
            // Shift the sequence forward
            const shifted = new ActionSequence(this.horizon);
            const shiftAmount = 2; // Matches replanInterval
            for (let i = 0; i < this.horizon; i++) {
                if (i + shiftAmount < this.lastBestSequence.actions.length) {
                    shifted.actions[i] = { ...this.lastBestSequence.actions[i + shiftAmount] };
                } else {
                    // Fill with smart defaults for the end
                    shifted.actions[i] = {
                        thrust: true, // Keep moving
                        rotateLeft: false,
                        rotateRight: false,
                        shoot: i % 10 === 0 // Periodic shooting
                    };
                }
            }
            population.push(shifted);
            
            // Add mutations of the previous best
            for (let i = 0; i < 5; i++) {
                population.push(shifted.mutate(0.15));
            }
        }
        
        // Generate purposeful sequences based on behavior mode
        const modes = ['attack', 'powerup', 'evade'];
        const modeDistribution = [0.5, 0.25, 0.25]; // 50% attack, 25% power-up, 25% evade
        
        let generatedCount = this.lastBestSequence ? 6 : 0;
        
        for (let modeIdx = 0; modeIdx < modes.length; modeIdx++) {
            const mode = modes[modeIdx];
            const count = Math.floor(this.numSequences * modeDistribution[modeIdx]);
            
            for (let i = 0; i < count && generatedCount < this.numSequences; i++) {
                const seq = this.generateSequenceForMode(mode);
                population.push(seq);
                generatedCount++;
            }
        }
        
        // Fill remainder with random sequences
        while (generatedCount < this.numSequences) {
            population.push(ActionSequence.generateRandom(this.horizon));
            generatedCount++;
        }
        
        return population;
    }
    
    // Generate a sequence tailored for specific behavior mode
    generateSequenceForMode(mode) {
        const seq = new ActionSequence(this.horizon);
        
        if (mode === 'attack') {
            // Aggressive attack sequences with lead-aim
            for (let i = 0; i < this.horizon; i++) {
                seq.actions[i] = {
                    thrust: i % 8 < 6, // Mostly thrust
                    rotateLeft: Math.random() < 0.1, // Occasional rotation adjustments
                    rotateRight: Math.random() < 0.1,
                    shoot: i % 6 < 2 // Frequent burst fire
                };
            }
        } else if (mode === 'powerup') {
            // Power-up collection sequences
            for (let i = 0; i < this.horizon; i++) {
                seq.actions[i] = {
                    thrust: true, // Keep moving toward power-up
                    rotateLeft: i < 15 && Math.random() < 0.2, // Early course correction
                    rotateRight: i < 15 && Math.random() < 0.2,
                    shoot: i % 12 === 0 // Occasional defensive shots
                };
            }
        } else if (mode === 'evade') {
            // Evasive maneuvers
            const dodgePattern = Math.random() < 0.5 ? 'left' : 'right';
            for (let i = 0; i < this.horizon; i++) {
                const phase = Math.floor(i / 10);
                seq.actions[i] = {
                    thrust: phase % 2 === 0, // Alternating thrust
                    rotateLeft: dodgePattern === 'left' && i % 5 < 2,
                    rotateRight: dodgePattern === 'right' && i % 5 < 2,
                    shoot: i > 20 && i % 8 === 0 // Defensive shots after dodge
                };
            }
        }
        
        // Prevent conflicting rotation commands
        for (const action of seq.actions) {
            if (action.rotateLeft && action.rotateRight) {
                action.rotateRight = false;
            }
        }
        
        return seq;
    }
    
    evaluateSequence(sequence, initialState) {
        let score = 0;
        let state = initialState.clone();
        
        // Track metrics across the sequence
        let framesSinceLastShot = 0;
        let plannedShots = 0;
        let sumInvSqDistAst = 0;
        let sumInvSqDistBoss = 0;
        let totalShotToF = 0;
        let shotCount = 0;
        
        // Track for smoothness penalties
        let lastThrust = false;
        let lastRotation = 0; // -1 left, 0 none, 1 right
        
        // Early termination threshold - if score is too low, stop evaluating
        const earlyTerminationThreshold = -1000;
        
        // Simulate the sequence
        for (let i = 0; i < sequence.length; i++) {
            // Early termination for performance
            if (score < earlyTerminationThreshold) {
                return score;
            }
            const action = sequence.actions[i];
            
            // Smoothness penalties
            if (action.thrust !== lastThrust) {
                score += this.weights.thrustToggle;
                lastThrust = action.thrust;
            }
            
            const currentRotation = action.rotateLeft ? -1 : (action.rotateRight ? 1 : 0);
            if (currentRotation !== 0 && currentRotation !== lastRotation) {
                score += this.weights.rotationChange;
                lastRotation = currentRotation;
            }
            
            // Count initial state for scoring
            const asteroidsBefore = state.asteroids.length;
            const bossHealthBefore = state.boss ? state.boss.health : 0;
            const powerUpsBefore = state.powerUps.length;
            
            // Track shooting and targets
            if (action.shoot) {
                framesSinceLastShot = 0;
                plannedShots++;
                
                // Calculate shot quality
                const target = this.getBestTarget(state);
                if (target) {
                    const intercept = leadIntercept(state.ship, target, this.bulletSpeed, this.maxBulletTime);
                    if (intercept) {
                        totalShotToF += intercept.t / 60; // convert frames to seconds
                        shotCount++;
                    }
                }
            } else {
                framesSinceLastShot++;
            }
            
            // Simulate frame
            state = this.simulator.simulateFrame(state, action);
            
            // Check for death
            if (!state.ship.alive) {
                return this.weights.death; // Immediate failure
            }
            
            // Near-miss risk accumulation
            for (const asteroid of state.asteroids) {
                const dist = this.simulator.distance(state.ship, asteroid, state);
                const clearance = Math.max(0.1, dist - state.ship.radius - asteroid.radius);
                sumInvSqDistAst += 1 / (clearance * clearance);
            }
            
            // Boss near-miss risk
            if (state.boss) {
                const bossDist = this.simulator.distance(state.ship, state.boss, state);
                const clearance = Math.max(0.1, bossDist - state.ship.radius - state.boss.radius);
                sumInvSqDistBoss += 1 / (clearance * clearance);
            }
            
            // Reward for destroying asteroids by type
            const asteroidsDestroyed = asteroidsBefore - state.asteroids.length;
            if (asteroidsDestroyed > 0) {
                // Simplified: assume we hit medium-sized asteroids mostly
                score += asteroidsDestroyed * this.weights.mediumKill;
            }
            
            // Reward for boss damage
            if (state.boss) {
                const damage = bossHealthBefore - state.boss.health;
                score += damage * this.weights.bossDamage;
            } else if (bossHealthBefore > 0) {
                // Boss was killed
                score += bossHealthBefore * this.weights.bossDamage * 2;
            }
            
            // Reward for collecting power-ups
            const powerUpsCollected = powerUpsBefore - state.powerUps.length;
            score += powerUpsCollected * this.weights.powerUp;
            
            // Time penalty
            score += this.weights.timePerFrame;
        }
        
        // Apply accumulated penalties/bonuses
        if (framesSinceLastShot > 24) {
            score += this.weights.idleFire;
        }
        
        // Check if we have hittable targets but didn't plan to shoot
        const hittableTargets = this.countHittableTargets(initialState);
        if (hittableTargets > 0 && plannedShots === 0) {
            score += this.weights.antiPassivity;
        }
        
        // Long shot penalty
        if (shotCount > 0) {
            const avgShotToF = totalShotToF / shotCount;
            if (avgShotToF > 0.6) {
                score += this.weights.longShotPenalty * (avgShotToF - 0.6);
            }
        }
        
        // Near-miss risk penalty
        score -= sumInvSqDistAst / sequence.length * this.weights.nearMissAst / 1000;
        score -= sumInvSqDistBoss / sequence.length * this.weights.nearMissBoss / 1000;
        
        // Aggression boost when powered
        const boost = 1 
            + 0.35 * (state.ship.hasShield ? 1 : 0)
            + 0.25 * (state.ship.hasRapidFire ? 1 : 0)
            + 0.25 * (state.ship.hasTripleShot ? 1 : 0);
        
        return score * boost;
    }
    
    // Count targets that can be hit with lead-aim
    countHittableTargets(state) {
        let count = 0;
        const candidates = [...state.asteroids];
        if (state.boss) candidates.push(state.boss);
        
        for (const target of candidates) {
            const intercept = leadIntercept(state.ship, target, this.bulletSpeed, this.maxBulletTime);
            if (intercept && intercept.t < 40) {
                count++;
            }
        }
        
        return count;
    }
    
    // Get the best target for shooting with lead-aim consideration
    getBestTarget(state) {
        const candidates = [...state.asteroids];
        if (state.boss) candidates.push(state.boss);
        
        if (candidates.length === 0) return null;
        
        let bestTarget = null;
        let bestScore = -Infinity;
        
        for (const target of candidates) {
            // Calculate lead-aim intercept
            const intercept = leadIntercept(state.ship, target, this.bulletSpeed, this.maxBulletTime);
            
            // Prioritize boss, then small asteroids
            let score = 0;
            if (target === state.boss) {
                score = 1000; // Boss top priority
            } else {
                // Smaller asteroids are worth more points
                score = target.size === 'small' ? 100 : 
                        target.size === 'medium' ? 50 : 20;
            }
            
            // Factor in distance (closer is better)
            const dist = this.simulator.distance(state.ship, target, state);
            score += 100 / Math.max(1, dist / 100);
            
            // Bonus for targets we can actually hit with lead-aim
            if (intercept && intercept.t < 40) { // Within 40 frames
                score *= 1.5; // Big bonus for hittable targets
                
                // Extra bonus for close, quick shots
                if (intercept.t < 20 && dist < 300) {
                    score *= 2; // Aimbot territory
                }
            } else {
                score *= 0.3; // Penalty for unhittable targets
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestTarget = target;
            }
        }
        
        return bestTarget;
    }
    
    // Calculate optimal aim angle for a target
    getOptimalAim(state, target) {
        if (!target) return state.ship.angle;
        
        const intercept = leadIntercept(state.ship, target, this.bulletSpeed, this.maxBulletTime);
        if (intercept) {
            return intercept.angle;
        }
        
        // Fallback to direct aim
        const dx = target.x - state.ship.x;
        const dy = target.y - state.ship.y;
        return Math.atan2(dy, dx);
    }

    // Get the first action from the best sequence
    getNextAction(gameState) {
        const bestSequence = this.plan(gameState);
        return bestSequence.actions[0];
    }
}

// Export for use in AIPlayer
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState, Simulator, ActionSequence, MPCPlanner };
}