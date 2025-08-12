class Ship {
    constructor(x, y, type = 'classic') {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = -Math.PI / 2;
        this.rotationSpeed = 0.1;
        this.thrust = 0.5;
        this.maxSpeed = 10;
        this.friction = 0.99;
        this.radius = 15;
        this.type = type;
        this.invulnerable = true;
        this.invulnerableTime = 3000;
        this.invulnerableStart = Date.now();
        this.thrusting = false;
        this.alive = true;
        
        this.shipDesigns = {
            classic: {
                points: [
                    { x: 15, y: 0 },
                    { x: -10, y: -10 },
                    { x: -5, y: 0 },
                    { x: -10, y: 10 }
                ],
                thrustPoints: [
                    { x: -5, y: -5 },
                    { x: -15, y: 0 },
                    { x: -5, y: 5 }
                ]
            },
            fighter: {
                points: [
                    { x: 20, y: 0 },
                    { x: -10, y: -12 },
                    { x: 0, y: -5 },
                    { x: 0, y: 5 },
                    { x: -10, y: 12 }
                ],
                thrustPoints: [
                    { x: -10, y: -6 },
                    { x: -20, y: 0 },
                    { x: -10, y: 6 }
                ]
            },
            speeder: {
                points: [
                    { x: 18, y: 0 },
                    { x: -12, y: -8 },
                    { x: -12, y: 8 }
                ],
                thrustPoints: [
                    { x: -12, y: -4 },
                    { x: -22, y: 0 },
                    { x: -12, y: 4 }
                ]
            },
            tank: {
                points: [
                    { x: 15, y: 0 },
                    { x: 10, y: -10 },
                    { x: -10, y: -10 },
                    { x: -10, y: 10 },
                    { x: 10, y: 10 }
                ],
                thrustPoints: [
                    { x: -10, y: -7 },
                    { x: -18, y: 0 },
                    { x: -10, y: 7 }
                ]
            }
        };
    }
    
    update(canvas) {
        if (this.thrusting) {
            this.vx += Math.cos(this.angle) * this.thrust;
            this.vy += Math.sin(this.angle) * this.thrust;
        }
        
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }
        
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
        
        if (this.invulnerable && Date.now() - this.invulnerableStart > this.invulnerableTime) {
            this.invulnerable = false;
        }
    }
    
    draw(ctx, theme) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        if (this.invulnerable) {
            ctx.globalAlpha = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
        }
        
        const design = this.shipDesigns[this.type];
        
        ctx.strokeStyle = theme.shipColor || '#00ffff';
        ctx.fillStyle = theme.shipFill || 'rgba(0, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = theme.shipColor || '#00ffff';
        
        ctx.beginPath();
        ctx.moveTo(design.points[0].x, design.points[0].y);
        for (let i = 1; i < design.points.length; i++) {
            ctx.lineTo(design.points[i].x, design.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        if (this.thrusting && Math.random() > 0.3) {
            ctx.strokeStyle = '#ff6600';
            ctx.fillStyle = 'rgba(255, 102, 0, 0.5)';
            ctx.shadowColor = '#ff6600';
            
            ctx.beginPath();
            ctx.moveTo(design.thrustPoints[0].x, design.thrustPoints[0].y);
            for (let i = 1; i < design.thrustPoints.length; i++) {
                ctx.lineTo(design.thrustPoints[i].x, design.thrustPoints[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    rotateLeft() {
        this.angle -= this.rotationSpeed;
    }
    
    rotateRight() {
        this.angle += this.rotationSpeed;
    }
    
    // Smooth rotation for AI with proportional control
    rotateToAngle(targetAngle, kP = 0.15) {
        let angleDiff = targetAngle - this.angle;
        
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Proportional controller with max turn rate
        const turnRate = Math.min(Math.max(angleDiff * kP, -this.rotationSpeed * 1.5), this.rotationSpeed * 1.5);
        this.angle += turnRate;
        
        return Math.abs(angleDiff) < 0.05; // Return true if we're close enough
    }
    
    // Smoother, faster aim with PD controller on angle
    rotateToAnglePD(targetAngle, { kp = 0.5, kd = 0.15, maxTurn = this.rotationSpeed * 2 } = {}) {
        let err = targetAngle - this.angle;
        while (err > Math.PI) err -= 2 * Math.PI;
        while (err < -Math.PI) err += 2 * Math.PI;
        
        // Estimate angular velocity (derivative) from last frame
        if (this._prevAngle === undefined) this._prevAngle = this.angle;
        const angVel = this.angle - this._prevAngle;
        
        let turn = kp * err - kd * angVel;
        turn = Math.max(-maxTurn, Math.min(maxTurn, turn));
        this.angle += turn;
        this._prevAngle = this.angle;
        
        return Math.abs(err) < 0.06; // ~3.4 degrees
    }
    
    setThrust(thrusting) {
        this.thrusting = thrusting;
    }
    
    shoot() {
        return new Bullet(
            this.x + Math.cos(this.angle) * this.radius,
            this.y + Math.sin(this.angle) * this.radius,
            Math.cos(this.angle) * 15 + this.vx,
            Math.sin(this.angle) * 15 + this.vy
        );
    }
}

class Bullet {
    constructor(x, y, vx, vy, type = 'normal') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 3;
        this.lifetime = 60;
        this.type = type;
        this.damage = type === 'power' ? 2 : 1;
    }
    
    update(canvas) {
        this.x += this.vx;
        this.y += this.vy;
        this.lifetime--;
        
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
        
        return this.lifetime > 0;
    }
    
    draw(ctx, theme) {
        ctx.save();
        
        ctx.fillStyle = theme.bulletColor || '#ffff00';
        ctx.shadowBlur = 15;
        ctx.shadowColor = theme.bulletColor || '#ffff00';
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.type === 'power') {
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

class Asteroid {
    constructor(x, y, radius, size = 'large') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.size = size;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.rotation = Math.random() * Math.PI * 2;
        
        this.vertices = [];
        const numVertices = Math.floor(Math.random() * 6) + 8;
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const variance = 0.4 + Math.random() * 0.6;
            this.vertices.push({
                x: Math.cos(angle) * radius * variance,
                y: Math.sin(angle) * radius * variance
            });
        }
        
        this.points = {
            large: 20,
            medium: 50,
            small: 100
        };
    }
    
    update(canvas) {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        
        if (this.x < -this.radius) this.x = canvas.width + this.radius;
        if (this.x > canvas.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = canvas.height + this.radius;
        if (this.y > canvas.height + this.radius) this.y = -this.radius;
    }
    
    draw(ctx, theme) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.strokeStyle = theme.asteroidColor || '#888888';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = theme.asteroidColor || '#888888';
        
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
    }
    
    break() {
        const fragments = [];
        if (this.size === 'large') {
            for (let i = 0; i < 2; i++) {
                const angle = (Math.PI * 2 * i / 2) + (Math.random() - 0.5) * 0.5;
                const spread = this.radius * 0.8; // Closer together but still separated
                const fragment = new Asteroid(
                    this.x + Math.cos(angle) * spread,
                    this.y + Math.sin(angle) * spread,
                    this.radius / 2,
                    'medium'
                );
                // Inherit parent velocity and add moderate spread velocity
                fragment.vx = this.vx + Math.cos(angle) * 2;
                fragment.vy = this.vy + Math.sin(angle) * 2;
                fragments.push(fragment);
            }
        } else if (this.size === 'medium') {
            for (let i = 0; i < 2; i++) {
                const angle = (Math.PI * 2 * i / 2) + (Math.random() - 0.5) * 0.5;
                const spread = this.radius * 0.8;
                const fragment = new Asteroid(
                    this.x + Math.cos(angle) * spread,
                    this.y + Math.sin(angle) * spread,
                    this.radius / 2,
                    'small'
                );
                // Inherit parent velocity and add moderate spread velocity
                fragment.vx = this.vx + Math.cos(angle) * 2.5;
                fragment.vy = this.vy + Math.sin(angle) * 2.5;
                fragments.push(fragment);
            }
        }
        return fragments;
    }
    
    getPoints() {
        return this.points[this.size];
    }
}

class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = 40;
        this.health = 10;
        this.maxHealth = 10;
        this.angle = 0;
        this.targetAngle = 0;
        this.speed = 2;
        this.shootCooldown = 0;
        this.shootInterval = 60;
        this.alive = true;
        this.points = 500;
        
        this.vertices = [
            { x: 40, y: 0 },
            { x: 20, y: -30 },
            { x: -20, y: -30 },
            { x: -40, y: 0 },
            { x: -20, y: 30 },
            { x: 20, y: 30 }
        ];
    }
    
    update(canvas, ship) {
        const dx = ship.x - this.x;
        const dy = ship.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.targetAngle = Math.atan2(dy, dx);
        
        const angleDiff = this.targetAngle - this.angle;
        this.angle += angleDiff * 0.05;
        
        if (distance > 200) {
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
        } else {
            this.vx *= 0.95;
            this.vy *= 0.95;
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
        
        this.shootCooldown--;
    }
    
    draw(ctx, theme) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const healthPercent = this.health / this.maxHealth;
        const color = `hsl(${healthPercent * 120}, 100%, 50%)`;
        
        ctx.strokeStyle = color;
        ctx.fillStyle = `hsla(${healthPercent * 120}, 100%, 50%, 0.2)`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(this.x - 40, this.y - 60, 80, 5);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - 40, this.y - 60, 80 * healthPercent, 5);
        ctx.restore();
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            this.shootCooldown = this.shootInterval;
            return new Bullet(
                this.x + Math.cos(this.angle) * this.radius,
                this.y + Math.sin(this.angle) * this.radius,
                Math.cos(this.angle) * 8,
                Math.sin(this.angle) * 8,
                'boss'
            );
        }
        return null;
    }
    
    takeDamage(damage = 1) {
        this.health -= damage;
        if (this.health <= 0) {
            this.alive = false;
        }
    }
}

class AIPlayer extends Ship {
    constructor(x, y, type = 'classic') {
        super(x, y, type);
        this.decisionCooldown = 0;
        this.targetAsteroid = null;
        this.avoidanceVector = { x: 0, y: 0 };
        this.lastDecisionTime = Date.now();
        this.lastUpdateTime = performance.now();
        this.decisionsCount = 0;
        this.decisionTicks = 0;  // Track think cycles for metrics
        this.dangerThreshold = 300;  // Much higher danger awareness
        this.shootingAccuracy = 0.9;  // Better accuracy
        this.reactionTime = 2;  // Faster reactions
        this.targetPowerUp = null;
        this.emergencyThreshold = 100;  // Emergency evasion distance
        this.currentAction = null;  // Current action being executed
        this.actionUtilities = {};  // Utility scores for actions
        this.aiNextFireAt = 0;  // AI's next allowed fire time (monotonic)
    }
    
    // Calculate wrapped distance considering screen edges
    wrappedDistance(targetX, targetY, canvas) {
        const dx = [targetX - this.x, targetX - this.x - canvas.width, targetX - this.x + canvas.width];
        const dy = [targetY - this.y, targetY - this.y - canvas.height, targetY - this.y + canvas.height];
        
        let minDist = Infinity;
        let bestDx = 0, bestDy = 0;
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const dist = Math.sqrt(dx[i] * dx[i] + dy[j] * dy[j]);
                if (dist < minDist) {
                    minDist = dist;
                    bestDx = dx[i];
                    bestDy = dy[j];
                }
            }
        }
        
        return { distance: minDist, dx: bestDx, dy: bestDy };
    }
    
    // Calculate time to closest point of approach (more accurate collision prediction)
    closestApproach(threat, tvx, tvy, canvas) {
        // r = wrapped relative position (shortest vector on torus)
        const { dx, dy } = this.wrappedDistance(threat.x, threat.y, canvas);
        const rvx = tvx - this.vx;
        const rvy = tvy - this.vy; // relative velocity
        const rv2 = rvx * rvx + rvy * rvy;
        
        // Time to closest point of approach (in seconds at 60 Hz step)
        const tCPA = rv2 > 0 ? Math.max(0, -(dx * rvx + dy * rvy) / rv2) : 0;
        
        // Position at CPA (converting frames to pixels)
        const cx = dx + rvx * (tCPA * 60);
        const cy = dy + rvy * (tCPA * 60);
        const dCPA2 = cx * cx + cy * cy; // Squared distance at CPA
        
        return { tCPA, dCPA2, angle: Math.atan2(dy, dx) };
    }
    
    // Get current speed
    currentSpeed() {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }
    
    // Compute aim plan independent of movement action
    computeAimPlan(game, canvas) {
        // 1) Choose target: small > medium > large, then nearest
        const rocks = game.asteroids.slice().sort((a, b) => {
            const rk = s => s === 'small' ? 0 : s === 'medium' ? 1 : 2;
            const ra = rk(a.size), rb = rk(b.size);
            const da = this.wrappedDistance(a.x, a.y, canvas).distance;
            const db = this.wrappedDistance(b.x, b.y, canvas).distance;
            return (ra - rb) || (da - db);
        });
        const target = rocks[0] || game.boss;
        if (!target) return null;
        
        // 2) Exact first-order intercept
        const s = 15; // bullet speed
        const sol = this.solveInterceptWrapped(target, s, canvas);
        let aimAngle, tFrames = Infinity;
        if (sol) {
            aimAngle = sol.aimAngle;
            tFrames = sol.t;
        } else {
            // No real root → direct aim fallback only when very close
            const w = this.wrappedDistance(target.x, target.y, canvas);
            if (w.distance > 140) return null;
            aimAngle = Math.atan2(w.dy, w.dx);
        }
        
        // 3) Distance gates (smalls allowed close)
        const dist = this.wrappedDistance(target.x, target.y, canvas).distance;
        const minSafe = target.size === 'large' ? 280 : target.size === 'medium' ? 120 : 0; // Let smalls be point-blank
        const onlyLarge = game.asteroids.length > 0 && game.asteroids.every(a => a.size === 'large');
        const maxRange = onlyLarge ? 900 : 700;
        
        return {
            target,
            aimAngle,
            dist,
            okLifetime: (tFrames <= 60) || !sol,
            inRange: dist > minSafe && dist < maxRange
        };
    }
    
    // Select action and track decision changes
    selectAction(newAction, game) {
        if (newAction !== this.currentAction && game?.aiStats) {
            game.aiStats.decisionsCount = (game.aiStats.decisionsCount || 0) + 1;
        }
        this.currentAction = newAction;
        return newAction;
    }
    
    // Calculate intercept time for projectile vs moving target
    interceptTime(target, bulletSpeed) {
        // Relative position/velocity (no wrap here yet)
        const rx = target.x - this.x;
        const ry = target.y - this.y;
        const rvx = target.vx - this.vx;
        const rvy = target.vy - this.vy;

        const a = rvx * rvx + rvy * rvy - bulletSpeed * bulletSpeed;
        const b = 2 * (rx * rvx + ry * rvy);
        const c = rx * rx + ry * ry;

        // Solve a*t^2 + b*t + c = 0 for smallest positive t
        let t = Infinity;
        if (Math.abs(a) < 1e-6) { // Linear fallback
            if (Math.abs(b) > 1e-6) t = -c / b;
        } else {
            const disc = b * b - 4 * a * c;
            if (disc >= 0) {
                const s = Math.sqrt(disc);
                const t1 = (-b - s) / (2 * a);
                const t2 = (-b + s) / (2 * a);
                // Choose smallest positive time
                if (t1 > 0 && t2 > 0) {
                    t = Math.min(t1, t2);
                } else if (t1 > 0) {
                    t = t1;
                } else if (t2 > 0) {
                    t = t2;
                }
            }
        }
        return t > 0 && isFinite(t) ? t : Infinity;
    }
    
    // Calculate intercept time using wrapped distances for toroidal topology
    interceptTimeWrapped(target, bulletSpeed, canvas) {
        // Get wrapped distance to target
        const wrapped = this.wrappedDistance(target.x, target.y, canvas);
        const rx = wrapped.dx;
        const ry = wrapped.dy;
        const rvx = target.vx - this.vx;
        const rvy = target.vy - this.vy;

        const a = rvx * rvx + rvy * rvy - bulletSpeed * bulletSpeed;
        const b = 2 * (rx * rvx + ry * rvy);
        const c = rx * rx + ry * ry;

        // Solve a*t^2 + b*t + c = 0 for smallest positive t
        let t = Infinity;
        if (Math.abs(a) < 1e-6) { // Linear fallback
            if (Math.abs(b) > 1e-6) t = -c / b;
        } else {
            const disc = b * b - 4 * a * c;
            if (disc >= 0) {
                const s = Math.sqrt(disc);
                const t1 = (-b - s) / (2 * a);
                const t2 = (-b + s) / (2 * a);
                // Choose smallest positive time
                if (t1 > 0 && t2 > 0) {
                    t = Math.min(t1, t2);
                } else if (t1 > 0) {
                    t = t1;
                } else if (t2 > 0) {
                    t = t2;
                }
            }
        }
        return t > 0 && isFinite(t) ? t : Infinity;
    }
    
    // Exact intercept solver with shooter velocity + toroidal wrap
    // NOTE: with per-frame velocities, returned t is in FRAMES (not seconds)
    solveInterceptWrapped(target, bulletSpeed, canvas) {
        const wrap = this.wrappedDistance(target.x, target.y, canvas); // r on a torus
        const rx = wrap.dx;
        const ry = wrap.dy;
        const wvx = target.vx - this.vx;
        const wvy = target.vy - this.vy; // w = v_target - v_ship
        
        const a = (wvx * wvx + wvy * wvy) - bulletSpeed * bulletSpeed;
        const b = 2 * (rx * wvx + ry * wvy);
        const c = rx * rx + ry * ry;
        
        let t = Infinity;
        if (Math.abs(a) < 1e-6) {
            if (Math.abs(b) > 1e-6) t = -c / b;
        } else {
            const disc = b * b - 4 * a * c;
            if (disc >= 0) {
                const s = Math.sqrt(disc);
                const t1 = (-b - s) / (2 * a);
                const t2 = (-b + s) / (2 * a);
                if (t1 > 0 && t2 > 0) {
                    t = Math.min(t1, t2);
                } else if (t1 > 0) {
                    t = t1;
                } else if (t2 > 0) {
                    t = t2;
                }
            }
        }
        
        if (!(t > 0 && isFinite(t))) return null;
        
        // Aim direction n = (r + w*t) / (s*t)
        const nx = (rx + wvx * t) / (bulletSpeed * t);
        const ny = (ry + wvy * t) / (bulletSpeed * t);
        const aimAngle = Math.atan2(ny, nx);
        
        return { t, aimAngle };
    }
    
    makeDecisions(asteroids, boss, powerUps, canvas, game) {
        this.decisionsCount++;
        this.decisionTicks++;  // Track think cycles
        
        // Calculate delta time
        const now = performance.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
        this.lastUpdateTime = now;
        
        // Reset keys at the START, not at the end
        this.keys = {};
        
        // Compute aim plan first (independent of movement)
        const plan = this.computeAimPlan(game, canvas);
        
        const threats = this.assessThreats(asteroids, boss, game.bullets, canvas);
        // Check for emergency threats (very close)
        const emergencyThreats = threats.filter(t => t.distance < this.emergencyThreshold + (t.radius || 0));
        // Check for immediate threats (approaching soon) - now using time in seconds
        const immediateThreats = threats.filter(t => 
            (t.timeToCollision < 1.5 && t.distance < this.dangerThreshold) || // 1.5 seconds
            t.distance < this.emergencyThreshold + (t.radius || 0)
        );
        
        // Calculate utility scores for each action
        this.actionUtilities = {
            evade: emergencyThreats.length * 0.5 + immediateThreats.length * 0.25,
            avoid: immediateThreats.length * 0.15,
            hunt: threats.length >= 1 && emergencyThreats.length === 0 ? 0.55 : 0,
            collectPowerup: 0,
            patrol: threats.length === 0 ? 0.25 : 0
        };
        
        // Add bullet threat weight
        const bulletThreats = threats.filter(t => t.type === 'bullet' && t.timeToCollision < 1);
        this.actionUtilities.evade += bulletThreats.length * 0.7;
        
        // Find best power-up and adjust utilities
        const candidatePU = this.findBestPowerUp(powerUps, canvas, game);
        if (candidatePU) {
            this.targetPowerUp = candidatePU;
            // Make power-up collection competitive with hunting when safe
            this.actionUtilities.collectPowerup = Math.max(0.5, this.actionUtilities.hunt - 0.05);
        }
        
        // Find the action with highest utility
        const bestAction = Object.keys(this.actionUtilities).reduce((a, b) => 
            this.actionUtilities[a] > this.actionUtilities[b] ? a : b
        );
        
        // Track action changes
        this.selectAction(bestAction, game);
        
        // Debug AI decisions
        if (this.decisionsCount % 60 === 0) {
            console.log('AI Status:', {
                action: bestAction,
                utilities: this.actionUtilities,
                threats: threats.length,
                bulletThreats: bulletThreats.length,
                immediateThreats: immediateThreats.length
            });
        }
        
        // Execute the best action (only one at a time for clarity)
        switch(this.currentAction) {
            case 'evade':
                this.emergencyEvade(emergencyThreats.length > 0 ? emergencyThreats : bulletThreats);
                break;
            case 'avoid':
                this.avoidThreats(immediateThreats);
                break;
            case 'hunt':
                // Always hunt, even during danger
                this.huntTargets(threats, boss, game, canvas);
                break;
            case 'collectPowerup':
                // targetPowerUp already set in utility calculation
                if (this.targetPowerUp) {
                    this.navigateToPowerUp(this.targetPowerUp, canvas);
                }
                break;
            case 'patrol':
                // Just drift for now
                break;
        }
        
        if (this.decisionCooldown <= 0) {
            this.decisionCooldown = this.reactionTime;
        }
        this.decisionCooldown--;
        
        // After movement action, always try to steer toward aim
        if (plan) {
            // PD steer toward the aim while avoiding/moving
            // Keeps the nose near target so alignment happens often
            this.rotateToAnglePD(plan.aimAngle, { 
                kp: 0.6, 
                kd: 0.2, 
                maxTurn: this.rotationSpeed * 3.2 
            });
        }
        
        // Try to fire every frame (no latches)
        if (plan && plan.okLifetime && plan.inRange) {
            const err = Math.abs(this.normalizeAngle(plan.aimAngle - this.angle));
            // Loosen requirements during threats
            const underThreat = this.actionUtilities.evade > 0.3;
            const angleOK = underThreat ? err < 0.45 :  // Very loose during evasion
                (plan.target.size === 'small' ? err < 0.10 :   // Tighter for smalls
                 plan.target.size === 'medium' ? err < 0.16 :
                 err < 0.30);  // Large can be looser
            
            if (angleOK) {
                this.keys = { ...this.keys, Space: true };
            }
        }
        
        // Now execute movement with the keys that were set
        this.executeMovement(game);
    }
    
    assessThreats(asteroids, boss, bullets, canvas) {
        const threats = [];
        
        // Assess asteroid threats with wrapped distances and closest approach
        asteroids.forEach(asteroid => {
            const wrapped = this.wrappedDistance(asteroid.x, asteroid.y, canvas);
            const distance = wrapped.distance;
            
            // Use closest approach for more accurate collision prediction
            const approach = this.closestApproach(asteroid, asteroid.vx, asteroid.vy, canvas);
            const radiusSum = this.radius + asteroid.radius;
            const radiusSum2 = radiusSum * radiusSum;
            
            // Will it actually hit us at closest approach?
            const willCollide = approach.dCPA2 < radiusSum2;
            const timeToCollision = willCollide ? approach.tCPA : Infinity;
            
            // Future position check for movement planning
            const futurePosX = asteroid.x + asteroid.vx * 30;
            const futurePosY = asteroid.y + asteroid.vy * 30;
            const futureWrapped = this.wrappedDistance(futurePosX, futurePosY, canvas);
            
            threats.push({
                entity: asteroid,
                distance,
                timeToCollision,
                futureDistance: futureWrapped.distance,
                priority: willCollide ? (asteroid.radius * 3) / (approach.tCPA + 0.1) : (asteroid.radius * 2) / distance,
                angle: approach.angle,
                radius: asteroid.radius,
                type: 'asteroid',
                willCollide,
                dCPA: Math.sqrt(approach.dCPA2)
            });
        });
        
        // Assess bullet threats (especially boss bullets)
        if (bullets) {
            bullets.filter(b => b.type === 'boss').forEach(bullet => {
                const wrapped = this.wrappedDistance(bullet.x, bullet.y, canvas);
                const distance = wrapped.distance;
                
                // Use closest approach for bullet threats too
                const approach = this.closestApproach(bullet, bullet.vx, bullet.vy, canvas);
                const radiusSum = this.radius + bullet.radius;
                const radiusSum2 = radiusSum * radiusSum;
                
                // Will the bullet hit us?
                const willCollide = approach.dCPA2 < radiusSum2;
                const timeToCollision = willCollide ? approach.tCPA : Infinity;
                
                threats.push({
                    entity: bullet,
                    distance,
                    timeToCollision,
                    futureDistance: Math.sqrt(approach.dCPA2),
                    priority: willCollide ? 200 / (approach.tCPA + 0.05) : 50 / distance, // Extreme priority if will hit
                    angle: approach.angle,
                    radius: bullet.radius,
                    type: 'bullet',
                    willCollide,
                    dCPA: Math.sqrt(approach.dCPA2)
                });
            });
        }
        
        if (boss) {
            const dx = boss.x - this.x;
            const dy = boss.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            threats.push({
                entity: boss,
                distance,
                timeToCollision: distance / 5,
                futureDistance: distance,
                priority: 1000 / distance,
                angle: Math.atan2(dy, dx)
            });
        }
        
        return threats.sort((a, b) => b.priority - a.priority);
    }
    
    emergencyEvade(threats) {
        // In emergency, move directly away from the closest threat
        const closestThreat = threats.sort((a, b) => a.distance - b.distance)[0];
        
        if (closestThreat) {
            // Calculate escape angle (opposite direction from threat)
            const escapeAngle = closestThreat.angle + Math.PI;
            
            // Use smooth rotation even in emergency
            const aligned = this.rotateToAngle(escapeAngle, 0.25); // Higher kP for faster turn
            
            // Always thrust in emergency
            this.keys = { ...this.keys, ArrowUp: true };
            
            // Always try to shoot at threats while escaping
            // Check if we can see any threat to shoot at (not necessarily the closest)
            const canShootAnything = threats.some(t => {
                const angleToThreat = Math.abs(this.normalizeAngle(t.angle - this.angle));
                return angleToThreat < Math.PI / 2; // Can shoot if threat is in front 90° arc
            });
            
            if (canShootAnything) {
                this.keys = { ...this.keys, Space: true };
            }
        }
    }
    
    avoidThreats(threats) {
        this.avoidanceVector = { x: 0, y: 0 };
        
        threats.forEach(threat => {
            // Stronger avoidance for closer threats
            const weight = (threat.radius + this.radius) / (threat.distance * threat.distance);
            // Push AWAY from threats (positive, not negative)
            this.avoidanceVector.x += Math.cos(threat.angle + Math.PI) * weight * 2000;
            this.avoidanceVector.y += Math.sin(threat.angle + Math.PI) * weight * 2000;
        });
        
        const avoidAngle = Math.atan2(this.avoidanceVector.y, this.avoidanceVector.x);
        const angleDiff = this.normalizeAngle(avoidAngle - this.angle);
        
        if (Math.abs(angleDiff) > 0.1) {
            this.keys = { ...this.keys, [angleDiff > 0 ? 'ArrowRight' : 'ArrowLeft']: true };
        }
        
        this.keys = { ...this.keys, ArrowUp: true };
        
        // Allow shooting during avoidance
        const canShootAnything = threats.some(t => {
            const angleToThreat = Math.abs(this.normalizeAngle(t.angle - this.angle));
            return angleToThreat < Math.PI / 2; // Can shoot if threat is in front 90° arc
        });
        
        if (canShootAnything) {
            this.keys = { ...this.keys, Space: true };
        }
    }
    
    huntTargets(threats, boss, game, canvas) {
        const interesting = threats.filter(t => t.type === 'asteroid');
        
        // Prefer small > medium > large; then nearest
        interesting.sort((a, b) => {
            const rank = s => (s === 'small' ? 0 : s === 'medium' ? 1 : 2);
            const ra = rank(a.entity.size), rb = rank(b.entity.size);
            return (ra - rb) || (a.distance - b.distance);
        });
        
        const target = interesting[0]?.entity || boss;
        if (!target) return;
        
        const bulletSpeed = 15;
        const sol = this.solveInterceptWrapped(target, bulletSpeed, canvas);
        if (!sol) return;
        
        const { t: tFrames, aimAngle } = sol;  // NOTE: t is in FRAMES (not seconds)
        const bulletLifetimeFrames = 60;        // matches Bullet.lifetime
        const okLifetime = tFrames <= bulletLifetimeFrames;
        
        // PD turn: snappier for small fragments
        const aligned = this.rotateToAnglePD(aimAngle, {
            kp: 0.6,
            kd: 0.2,
            maxTurn: this.rotationSpeed * 3
        });
        
        const dist = this.wrappedDistance(target.x, target.y, canvas).distance;
        const totalAsteroids = game.asteroids.length;
        const onlyLargeLeft = game.asteroids.length > 0 && game.asteroids.every(a => a.size === 'large');
        
        // Engage distances
        const fewAsteroids = totalAsteroids <= 3;
        const minSafe = target.size === 'large' ? (fewAsteroids ? 260 : 320) :
                       target.size === 'medium' ? (fewAsteroids ? 140 : 180) :
                       110;
        const maxRange = onlyLargeLeft ? 900 : 650;  // Let us shoot big rocks from farther
        const inRange = dist > minSafe && dist < maxRange;
        
        // "Cleanup" bias for small shards
        const smallCount = game.asteroids.filter(a => a.size === 'small').length;
        const cleanup = smallCount >= 4;
        
        // Be willing to shoot large rocks earlier when they're all that exists
        const largeKick = (onlyLargeLeft && Math.abs(this.normalizeAngle(aimAngle - this.angle)) < 0.35);
        
        // Debug shooting logic
        if (this.decisionsCount % 30 === 0) {
            console.log('Aimbot debug:', {
                targetSize: target.size,
                interceptTime: tFrames.toFixed(2),
                distance: dist.toFixed(1),
                aligned,
                okLifetime,
                inRange,
                cleanup,
                onlyLargeLeft,
                largeKick
            });
        }
        
        if (okLifetime && inRange && (aligned || cleanup || largeKick)) {
            this.keys = { ...this.keys, Space: true };
        }
        
        // Close distance so fragments don't accumulate
        this.keys = { ...this.keys, ArrowUp: true };
    }
    
    navigateToPowerUp(powerUp, canvas) {
        const wrapped = this.wrappedDistance(powerUp.x, powerUp.y, canvas);
        const distance = wrapped.distance;
        const targetAngle = Math.atan2(wrapped.dy, wrapped.dx);
        
        // Use smooth rotation
        const aligned = this.rotateToAngle(targetAngle, 0.12);
        
        if (distance > 50 && aligned) {
            this.keys = { ...this.keys, ArrowUp: true };
        }
        
        if (distance < 30) {
            this.targetPowerUp = null;
        }
    }
    
    // Calculate desirability of a power-up based on type and game state
    powerUpDesire(powerUp, game) {
        const type = powerUp.type;
        const needShield = !game.powerUpActive.shield && type === 'shield' ? 1.0 : 0.0;
        const bossBoost = game.boss ? 0.3 : 0.0;
        const manyRocks = game.asteroids.length >= 8 ? 0.2 : 0.0;
        
        const base = {
            shield: 0.8,
            rapidFire: 0.6,
            tripleShot: 0.55,
            slowTime: 0.45
        }[type] || 0.3;
        
        return base + needShield + bossBoost + manyRocks;
    }
    
    // Find best power-up based on desirability and distance
    findBestPowerUp(powerUps, canvas, game) {
        let best = null;
        let bestScore = 0;
        
        for (const p of powerUps) {
            const { distance } = this.wrappedDistance(p.x, p.y, canvas);
            if (distance > 900) continue; // Expanded search radius
            
            const desirability = this.powerUpDesire(p, game);
            const score = desirability * (1.0 - distance / 900);
            
            if (score > bestScore) {
                bestScore = score;
                best = p;
            }
        }
        
        return best;
    }
    
    findNearestPowerUp(powerUps, canvas) {
        let nearest = null;
        let minDistance = Infinity;
        
        powerUps.forEach(powerUp => {
            const wrapped = this.wrappedDistance(powerUp.x, powerUp.y, canvas);
            if (wrapped.distance < minDistance) {
                minDistance = wrapped.distance;
                nearest = powerUp;
            }
        });
        
        return minDistance < 900 ? nearest : null; // Expanded from 400 to 900
    }
    
    calculateLeadTime(target) {
        const bulletSpeed = 15;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const initialLeadTime = distance / bulletSpeed;
        
        const futureX = target.x + target.vx * initialLeadTime;
        const futureY = target.y + target.vy * initialLeadTime;
        const futureDistance = Math.sqrt((futureX - this.x) ** 2 + (futureY - this.y) ** 2);
        
        return futureDistance / bulletSpeed;
    }
    
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }
    
    executeMovement(game) {
        if (this.keys.ArrowLeft) this.rotateLeft();
        if (this.keys.ArrowRight) this.rotateRight();
        
        // Intelligent throttle control - ease off near danger
        if (game && game.asteroids) {
            const distances = game.asteroids.map(a => this.wrappedDistance(a.x, a.y, game.canvas).distance);
            const nearest = Math.min(...distances.concat([Infinity]));
            
            // Dynamic safety bubble based on proximity
            const safe = Math.max(140, Math.min(380, nearest - 80));
            const desired = (nearest < 260) ? 2.8 : 7.0; // Bolder speeds: was 2.5 / 5.5
            const speed = this.currentSpeed();
            
            // Only thrust if below desired speed
            const allowThrust = speed < desired;
            
            if (this.keys.ArrowUp && !allowThrust) {
                this.keys.ArrowUp = false; // Override thrust decision if going too fast
            }
        }
        
        if (this.keys.ArrowUp) {
            this.setThrust(true);
        } else {
            this.setThrust(false);
        }
        
        if (this.keys.Space && game) {
            const now = performance.now();
            
            if (now >= this.aiNextFireAt) {
                const cooldown = game.powerUpActive.rapidFire ? 50 : 200;
                this.aiNextFireAt = now + cooldown;
                
                let fired = 0;
                if (game.powerUpActive.tripleShot) {
                    for (let i = -1; i <= 1; i++) {
                        const bullet = this.shoot();
                        const angle = Math.atan2(bullet.vy, bullet.vx) + (i * 0.2);
                        const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                        bullet.vx = Math.cos(angle) * speed;
                        bullet.vy = Math.sin(angle) * speed;
                        game.bullets.push(bullet);
                        fired++;
                    }
                } else {
                    game.bullets.push(this.shoot());
                    fired = 1;
                }
                
                // Count actual shots fired, not just intentions
                if (game.aiStats) {
                    game.aiStats.shotsFired += fired;
                }
                
                game.soundManager.play('shoot');
            }
        }
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 20;
        this.lifetime = 600;
        this.rotation = 0;
        
        this.types = {
            shield: { icon: '🛡️', color: '#00ff00', duration: 7500 },  // 75% of 10000
            rapidFire: { icon: '⚡', color: '#ffff00', duration: 5000 },
            tripleShot: { icon: '🔱', color: '#ff00ff', duration: 5000 },
            slowTime: { icon: '⏱️', color: '#00ffff', duration: 3000 },
            laser: { icon: '🔦', color: '#ff0000', duration: 6000 },  // 50% increase
            bomb: { icon: '💣', color: '#ff8800', duration: 0 },  // Stackable
            speedBoost: { icon: '🚀', color: '#00ffff', duration: 7500 },  // 25% increase
            doublePoints: { icon: '💎', color: '#ffff00', duration: 8000 },
            autoAim: { icon: '🎯', color: '#ff00ff', duration: 7000 },
            extraLife: { icon: '❤️', color: '#ff0000', duration: 0 }  // Instant use
        };
    }
    
    update() {
        this.lifetime--;
        this.rotation += 0.05;
        return this.lifetime > 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        const powerupInfo = this.types[this.type];
        
        ctx.strokeStyle = powerupInfo.color;
        ctx.fillStyle = powerupInfo.color + '33';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = powerupInfo.color;
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * this.radius;
            const y = Math.sin(angle) * this.radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(powerupInfo.icon, 0, 0);
        
        ctx.restore();
    }
}