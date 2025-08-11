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
        this.dangerThreshold = 300;  // Much higher danger awareness
        this.shootingAccuracy = 0.9;  // Better accuracy
        this.reactionTime = 2;  // Faster reactions
        this.targetPowerUp = null;
        this.emergencyThreshold = 100;  // Emergency evasion distance
        this.retreatAfterShot = false;  // Flag to retreat after shooting large asteroids
        this.currentAction = null;  // Current action being executed
        this.actionUtilities = {};  // Utility scores for actions
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
    
    makeDecisions(asteroids, boss, powerUps, canvas, game) {
        this.decisionsCount++;
        
        // Calculate delta time
        const now = performance.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
        this.lastUpdateTime = now;
        
        // Reset keys at the START, not at the end
        this.keys = {};
        
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
            evade: emergencyThreats.length * 0.5 + immediateThreats.length * 0.3,
            avoid: immediateThreats.length * 0.2 + (threats.length > 5 ? 0.1 : 0),
            hunt: threats.length > 0 && emergencyThreats.length === 0 ? 0.4 : 0,
            collectPowerup: powerUps.length > 0 && immediateThreats.length < 2 ? 0.35 : 0,
            patrol: threats.length === 0 ? 0.3 : 0
        };
        
        // Add bullet threat weight
        const bulletThreats = threats.filter(t => t.type === 'bullet' && t.timeToCollision < 1);
        this.actionUtilities.evade += bulletThreats.length * 0.7;
        
        // Find the action with highest utility
        const bestAction = Object.keys(this.actionUtilities).reduce((a, b) => 
            this.actionUtilities[a] > this.actionUtilities[b] ? a : b
        );
        
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
        this.currentAction = bestAction;
        switch(bestAction) {
            case 'evade':
                this.emergencyEvade(emergencyThreats.length > 0 ? emergencyThreats : bulletThreats);
                break;
            case 'avoid':
                this.avoidThreats(immediateThreats);
                break;
            case 'hunt':
                // Only hunt if we're not in immediate danger
                if (this.actionUtilities.evade < 0.3) {
                    this.huntTargets(threats, boss, game, canvas);
                }
                break;
            case 'collectPowerup':
                if (!this.targetPowerUp) {
                    this.targetPowerUp = this.findNearestPowerUp(powerUps, canvas);
                }
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
        
        // Now execute movement with the keys that were set
        this.executeMovement(game);
    }
    
    assessThreats(asteroids, boss, bullets, canvas) {
        const threats = [];
        
        // Assess asteroid threats with wrapped distances
        asteroids.forEach(asteroid => {
            const wrapped = this.wrappedDistance(asteroid.x, asteroid.y, canvas);
            const dx = wrapped.dx;
            const dy = wrapped.dy;
            const distance = wrapped.distance;
            
            const relativeVx = asteroid.vx - this.vx;
            const relativeVy = asteroid.vy - this.vy;
            
            const closingSpeed = (dx * relativeVx + dy * relativeVy) / distance;
            const timeToCollision = closingSpeed > 0 ? distance / closingSpeed / 60 : Infinity; // Convert to seconds (60fps baseline)
            
            const futurePosX = asteroid.x + asteroid.vx * 30;
            const futurePosY = asteroid.y + asteroid.vy * 30;
            const futureWrapped = this.wrappedDistance(futurePosX, futurePosY, canvas);
            
            threats.push({
                entity: asteroid,
                distance,
                timeToCollision,
                futureDistance: futureWrapped.distance,
                priority: (asteroid.radius * 2) / distance,
                angle: Math.atan2(dy, dx),
                radius: asteroid.radius,
                type: 'asteroid'
            });
        });
        
        // Assess bullet threats (especially boss bullets)
        if (bullets) {
            bullets.filter(b => b.type === 'boss').forEach(bullet => {
                const wrapped = this.wrappedDistance(bullet.x, bullet.y, canvas);
                const distance = wrapped.distance;
                
                // Bullets are fast and small - very high priority
                const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                const timeToCollision = distance / speed / 60; // seconds
                
                threats.push({
                    entity: bullet,
                    distance,
                    timeToCollision,
                    futureDistance: distance - speed * 0.5, // Bullet position in 0.5 seconds
                    priority: 100 / distance, // Very high priority
                    angle: Math.atan2(wrapped.dy, wrapped.dx),
                    radius: bullet.radius,
                    type: 'bullet'
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
            
            // Only shoot if we're somewhat aligned and it won't slow our escape
            if (aligned && this.actionUtilities.evade < 0.8) {
                const facingThreat = Math.abs(this.normalizeAngle(closestThreat.angle - this.angle)) < Math.PI / 3;
                if (facingThreat) {
                    this.keys = { ...this.keys, Space: true };
                }
            }
        }
    }
    
    avoidThreats(threats) {
        this.avoidanceVector = { x: 0, y: 0 };
        
        threats.forEach(threat => {
            // Stronger avoidance for closer threats
            const weight = (threat.radius + this.radius) / (threat.distance * threat.distance);
            this.avoidanceVector.x -= Math.cos(threat.angle) * weight * 2000;
            this.avoidanceVector.y -= Math.sin(threat.angle) * weight * 2000;
        });
        
        const avoidAngle = Math.atan2(this.avoidanceVector.y, this.avoidanceVector.x);
        const angleDiff = this.normalizeAngle(avoidAngle - this.angle);
        
        if (Math.abs(angleDiff) > 0.1) {
            this.keys = { ...this.keys, [angleDiff > 0 ? 'ArrowRight' : 'ArrowLeft']: true };
        }
        
        this.keys = { ...this.keys, ArrowUp: true };
    }
    
    huntTargets(threats, boss, game, canvas) {
        // Prefer smaller, closer asteroids as targets
        let target = boss;
        if (!target && threats.length > 0) {
            // Sort by combination of distance and size (prefer small close ones)
            const sortedThreats = threats.sort((a, b) => {
                const aPriority = a.distance / 100 + (a.entity.size === 'large' ? 3 : a.entity.size === 'medium' ? 1 : 0);
                const bPriority = b.distance / 100 + (b.entity.size === 'large' ? 3 : b.entity.size === 'medium' ? 1 : 0);
                return aPriority - bPriority;
            });
            target = sortedThreats[0].entity;
        }
        
        if (target) {
            const leadTime = this.calculateLeadTime(target);
            const predictedX = target.x + target.vx * leadTime;
            const predictedY = target.y + target.vy * leadTime;
            
            const targetAngle = Math.atan2(predictedY - this.y, predictedX - this.x);
            const angleDiff = this.normalizeAngle(targetAngle - this.angle);
            const distance = Math.sqrt((target.x - this.x) ** 2 + (target.y - this.y) ** 2);
            
            if (Math.abs(angleDiff) > 0.05) {
                this.keys = { ...this.keys, [angleDiff > 0 ? 'ArrowRight' : 'ArrowLeft']: true };
            } else if (Math.abs(angleDiff) < 0.3) {
                // Different shooting distances for different asteroid sizes
                const minSafeDistance = target.size === 'large' ? 350 : target.size === 'medium' ? 250 : 150;
                const maxShootDistance = target.size === 'large' ? 450 : 500;
                
                const shouldShoot = Math.random() < this.shootingAccuracy && 
                                  distance > minSafeDistance &&  // Don't shoot if too close
                                  distance < maxShootDistance &&
                                  this.decisionCooldown % 5 === 0;
                
                if (shouldShoot) {
                    this.keys = { ...this.keys, Space: true };
                    if (game) {
                        game.aiStats.shotsFired++;
                    }
                    // After shooting a large asteroid, prepare to evade
                    if (target.size === 'large' && distance < 400) {
                        this.retreatAfterShot = true;
                    }
                }
            }
            
            // Movement logic based on target type and distance
            if (threats.length > 0 && !this.retreatAfterShot) {
                const isLargeTarget = target.size === 'large';
                const minEngagementDistance = isLargeTarget ? 400 : 300;
                
                // Only move toward target if we're at a safe distance
                if (distance > minEngagementDistance) {
                    this.keys = { ...this.keys, ArrowUp: true };
                } else if (distance < minEngagementDistance - 50) {
                    // Too close! Back away
                    const reverseAngle = targetAngle + Math.PI;
                    const reverseAngleDiff = this.normalizeAngle(reverseAngle - this.angle);
                    if (Math.abs(reverseAngleDiff) < 0.5) {
                        this.keys = { ...this.keys, ArrowUp: true };
                    }
                }
            }
            
            // Reset retreat flag after some distance
            if (this.retreatAfterShot && distance > 450) {
                this.retreatAfterShot = false;
            }
        }
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
        
        return minDistance < 400 ? nearest : null;
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
        if (this.keys.ArrowUp) {
            this.setThrust(true);
        } else {
            this.setThrust(false);
        }
        
        if (this.keys.Space && game) {
            const now = Date.now();
            const cooldown = game.powerUpActive.rapidFire ? 50 : 200;
            
            if (now - game.lastShootTime > cooldown) {
                game.lastShootTime = now;
                
                if (game.powerUpActive.tripleShot) {
                    for (let i = -1; i <= 1; i++) {
                        const bullet = this.shoot();
                        const angle = Math.atan2(bullet.vy, bullet.vx) + (i * 0.2);
                        const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                        bullet.vx = Math.cos(angle) * speed;
                        bullet.vy = Math.sin(angle) * speed;
                        game.bullets.push(bullet);
                    }
                } else {
                    game.bullets.push(this.shoot());
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
            shield: { icon: '🛡️', color: '#00ff00', duration: 5000 },
            rapidFire: { icon: '⚡', color: '#ffff00', duration: 5000 },
            tripleShot: { icon: '🔱', color: '#ff00ff', duration: 5000 },
            slowTime: { icon: '⏱️', color: '#00ffff', duration: 3000 }
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