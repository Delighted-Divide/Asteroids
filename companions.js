// Companion system for Asteroids game
// Replaces the laser power-up with helper ships

class Companion {
    constructor(parent, offset, level = 1) {
        this.parent = parent; // The main ship
        this.offset = offset; // Position offset from parent
        this.level = level;
        this.x = parent.x;
        this.y = parent.y;
        this.angle = parent.angle;
        this.radius = 10; // Smaller than main ship
        this.alive = true;
        this.respawnTimer = 0;
        this.respawnDelay = 300; // 5 seconds at 60fps
        this.shootCooldown = 0;
        this.hasShield = level >= 15;
        this.shieldHits = this.hasShield ? 2 : 0;
        
        // Damage multiplier based on level
        this.damageMultiplier = level < 5 ? 0.5 : level < 10 ? 0.75 : level < 15 ? 1.0 : 1.5;
        
        // Mini ship design
        this.vertices = [
            { x: 10, y: 0 },
            { x: -7, y: -5 },
            { x: -5, y: 0 },
            { x: -7, y: 5 }
        ];
    }
    
    update(canvas, game) {
        if (!this.alive) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return;
        }
        
        // Follow parent with offset
        const targetX = this.parent.x + Math.cos(this.parent.angle + this.offset.angle) * this.offset.distance;
        const targetY = this.parent.y + Math.sin(this.parent.angle + this.offset.angle) * this.offset.distance;
        
        // Smooth movement
        this.x += (targetX - this.x) * 0.2;
        this.y += (targetY - this.y) * 0.2;
        
        // Match parent angle with slight delay
        const angleDiff = this.parent.angle - this.angle;
        this.angle += angleDiff * 0.15;
        
        // Handle screen wrapping
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
        
        // Shooting logic
        this.shootCooldown--;
        if (this.shootCooldown <= 0) {
            this.autoShoot(game);
        }
    }
    
    autoShoot(game) {
        // Find nearest target
        let nearestTarget = null;
        let minDist = Infinity;
        
        // Check asteroids
        for (const asteroid of game.asteroids) {
            const dist = Math.hypot(asteroid.x - this.x, asteroid.y - this.y);
            if (dist < minDist) {
                minDist = dist;
                nearestTarget = asteroid;
            }
        }
        
        // Check bosses
        for (const boss of game.bosses) {
            const dist = Math.hypot(boss.x - this.x, boss.y - this.y);
            if (dist < minDist) {
                minDist = dist;
                nearestTarget = boss;
            }
        }
        
        if (nearestTarget && minDist < 400) {
            // Calculate lead angle
            const dx = nearestTarget.x - this.x;
            const dy = nearestTarget.y - this.y;
            const targetAngle = Math.atan2(dy, dx);
            
            // Check if we're roughly aimed
            const angleDiff = Math.abs(this.normalizeAngle(targetAngle - this.angle));
            if (angleDiff < Math.PI / 4) {
                this.shoot(game);
            }
        }
    }
    
    shoot(game) {
        this.shootCooldown = game.powerUpActive.rapidFire ? 10 : 20;
        
        // Create bullet(s) based on parent's power-ups
        if (game.powerUpActive.tripleShot) {
            // Triple shot for companions too
            const bullets = [];
            for (let i = -1; i <= 1; i++) {
                const bullet = new Bullet(
                    this.x + Math.cos(this.angle) * this.radius,
                    this.y + Math.sin(this.angle) * this.radius,
                    Math.cos(this.angle + i * 0.2) * 15,
                    Math.sin(this.angle + i * 0.2) * 15,
                    'companion'
                );
                bullet.damage = this.damageMultiplier;
                bullets.push(bullet);
            }
            game.bullets.push(...bullets);
        } else {
            const bullet = new Bullet(
                this.x + Math.cos(this.angle) * this.radius,
                this.y + Math.sin(this.angle) * this.radius,
                Math.cos(this.angle) * 15,
                Math.sin(this.angle) * 15,
                'companion'
            );
            bullet.damage = this.damageMultiplier;
            game.bullets.push(bullet);
        }
        
        game.soundManager.play('shoot');
    }
    
    takeDamage() {
        if (this.hasShield && this.shieldHits > 0) {
            this.shieldHits--;
            return false; // Not destroyed
        }
        
        this.alive = false;
        this.respawnTimer = this.respawnDelay;
        return true; // Destroyed
    }
    
    respawn() {
        this.alive = true;
        this.x = this.parent.x;
        this.y = this.parent.y;
        this.angle = this.parent.angle;
        if (this.hasShield) {
            this.shieldHits = 2;
        }
    }
    
    draw(ctx, theme) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Companion color based on level
        const color = this.level >= 20 ? '#ffdd00' : 
                     this.level >= 15 ? '#ff00ff' : 
                     this.level >= 10 ? '#00ffff' : '#00ff00';
        
        ctx.strokeStyle = color;
        ctx.fillStyle = `${color}33`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        
        // Draw mini ship
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw shield if active
        if (this.hasShield && this.shieldHits > 0) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }
}

class CompanionSystem {
    constructor(ship) {
        this.ship = ship;
        this.companions = [];
        this.maxCompanions = 0;
        this.level = 1;
    }
    
    updateLevel(level) {
        this.level = level;
        
        // Determine number of companions based on level
        const newMax = level < 10 ? 1 : level < 20 ? 2 : 3;
        
        if (newMax !== this.maxCompanions) {
            this.maxCompanions = newMax;
            this.setupCompanions();
        } else {
            // Update existing companions' level
            for (const companion of this.companions) {
                companion.level = level;
                companion.damageMultiplier = level < 5 ? 0.5 : level < 10 ? 0.75 : level < 15 ? 1.0 : 1.5;
                companion.hasShield = level >= 15;
                if (companion.hasShield && companion.alive) {
                    companion.shieldHits = 2;
                }
            }
        }
    }
    
    setupCompanions() {
        // Clear existing companions
        this.companions = [];
        
        // Create new companions with proper positioning
        for (let i = 0; i < this.maxCompanions; i++) {
            const angleOffset = (Math.PI * 2 * i) / this.maxCompanions + Math.PI;
            const companion = new Companion(
                this.ship,
                {
                    angle: angleOffset,
                    distance: 50 + i * 20
                },
                this.level
            );
            this.companions.push(companion);
        }
    }
    
    update(canvas, game) {
        for (const companion of this.companions) {
            companion.update(canvas, game);
        }
    }
    
    draw(ctx, theme) {
        for (const companion of this.companions) {
            companion.draw(ctx, theme);
        }
    }
    
    checkCollisions(asteroids, bosses, bullets) {
        for (const companion of this.companions) {
            if (!companion.alive) continue;
            
            // Check asteroid collisions
            for (const asteroid of asteroids) {
                const dist = Math.hypot(asteroid.x - companion.x, asteroid.y - companion.y);
                if (dist < asteroid.radius + companion.radius) {
                    if (companion.takeDamage()) {
                        // Companion destroyed
                        return { destroyed: true, companion };
                    }
                }
            }
            
            // Check boss collisions
            for (const boss of bosses) {
                const dist = Math.hypot(boss.x - companion.x, boss.y - companion.y);
                if (dist < boss.radius + companion.radius) {
                    if (companion.takeDamage()) {
                        return { destroyed: true, companion };
                    }
                }
            }
            
            // Check bullet collisions (only boss bullets)
            for (const bullet of bullets) {
                if (bullet.type === 'boss') {
                    const dist = Math.hypot(bullet.x - companion.x, bullet.y - companion.y);
                    if (dist < bullet.radius + companion.radius) {
                        if (companion.takeDamage()) {
                            return { destroyed: true, companion, bullet };
                        }
                    }
                }
            }
        }
        
        return { destroyed: false };
    }
    
    deactivate() {
        this.companions = [];
        this.maxCompanions = 0;
    }
}