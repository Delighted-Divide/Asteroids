// Boss classes for Asteroids game
// Separated from entities.js to reduce file size

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
        this.levelUps = 1; // How many level-ups this boss gives
        
        // Default hexagon shape
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
        const color = this.color || `hsl(${healthPercent * 120}, 100%, 50%)`;
        
        ctx.strokeStyle = color;
        ctx.fillStyle = `${color}33`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        
        // Draw custom shape
        this.drawShape(ctx);
        
        // Draw core
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Draw health bar
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(this.x - 40, this.y - 60, 80, 5);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x - 40, this.y - 60, 80 * healthPercent, 5);
        ctx.restore();
    }
    
    drawShape(ctx) {
        // Default hexagon shape
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
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

// Speed Boss - Faster, rapid-fire attacks
class SpeedBoss extends Boss {
    constructor(x, y) {
        super(x, y);
        this.speed = 4;
        this.shootInterval = 30;
        this.health = 8;
        this.maxHealth = 8;
        this.radius = 35;
        this.points = 600;
        this.levelUps = 1;
        this.color = '#00ffff';
        
        // Arrow/dart shape for speed
        this.vertices = [
            { x: 45, y: 0 },      // Sharp front
            { x: 15, y: -15 },
            { x: -20, y: -25 },
            { x: -30, y: -10 },
            { x: -30, y: 10 },
            { x: -20, y: 25 },
            { x: 15, y: 15 }
        ];
    }
    
    drawShape(ctx) {
        // Draw main body
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw afterburner effect
        if (Math.random() > 0.3) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(-30, -5);
            ctx.lineTo(-45 - Math.random() * 15, 0);
            ctx.lineTo(-30, 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            this.shootCooldown = this.shootInterval;
            const bullet = new Bullet(this.x, this.y, this.angle);
            bullet.speed = 8;
            bullet.vx = Math.cos(this.angle) * bullet.speed;
            bullet.vy = Math.sin(this.angle) * bullet.speed;
            bullet.type = 'boss';
            bullet.radius = 4;
            return bullet;
        }
        return null;
    }
}

// Tank Boss - Slower, more health, explosive shots
class TankBoss extends Boss {
    constructor(x, y) {
        super(x, y);
        this.speed = 1;
        this.shootInterval = 90;
        this.health = 20;
        this.maxHealth = 20;
        this.radius = 50;
        this.points = 800;
        this.levelUps = 2;
        this.color = '#ff4444';
        
        // Octagonal fortress shape
        this.vertices = [];
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const radius = i % 2 === 0 ? 50 : 45; // Armor plate effect
            this.vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
    }
    
    drawShape(ctx) {
        // Draw main octagon
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw armor plates
        ctx.strokeStyle = '#880000';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i += 2) {
            const v = this.vertices[i];
            ctx.beginPath();
            ctx.arc(v.x * 0.7, v.y * 0.7, 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            this.shootCooldown = this.shootInterval;
            const bullet = new Bullet(this.x, this.y, this.angle);
            bullet.speed = 4;
            bullet.vx = Math.cos(this.angle) * bullet.speed;
            bullet.vy = Math.sin(this.angle) * bullet.speed;
            bullet.type = 'boss';
            bullet.radius = 8;
            bullet.explosive = true;
            return bullet;
        }
        return null;
    }
}

// Sniper Boss - Long range, high damage precision shots
class SniperBoss extends Boss {
    constructor(x, y) {
        super(x, y);
        this.speed = 1.5;
        this.shootInterval = 120;
        this.health = 10;
        this.maxHealth = 10;
        this.radius = 40;
        this.points = 700;
        this.levelUps = 2;
        this.color = '#ffff00';
        this.preferredDistance = 400;
        this.laserSightAlpha = 0;
        
        // Long triangle with scope
        this.vertices = [
            { x: 50, y: 0 },      // Long barrel
            { x: 35, y: -8 },
            { x: 0, y: -15 },
            { x: -25, y: -20 },
            { x: -30, y: 0 },
            { x: -25, y: 20 },
            { x: 0, y: 15 },
            { x: 35, y: 8 }
        ];
    }
    
    update(canvas, ship) {
        const dx = ship.x - this.x;
        const dy = ship.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.targetAngle = Math.atan2(dy, dx);
        
        const angleDiff = this.targetAngle - this.angle;
        this.angle += angleDiff * 0.02;
        
        // Laser sight effect when aiming
        if (this.shootCooldown < 30) {
            this.laserSightAlpha = Math.min(1, this.laserSightAlpha + 0.1);
        } else {
            this.laserSightAlpha = Math.max(0, this.laserSightAlpha - 0.05);
        }
        
        // Maintain preferred distance
        if (distance < this.preferredDistance - 50) {
            this.vx = -Math.cos(this.angle) * this.speed;
            this.vy = -Math.sin(this.angle) * this.speed;
        } else if (distance > this.preferredDistance + 50) {
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
        } else {
            // Strafe
            const strafeAngle = this.angle + Math.PI/2;
            this.vx = Math.cos(strafeAngle) * this.speed * 0.5;
            this.vy = Math.sin(strafeAngle) * this.speed * 0.5;
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
        
        this.shootCooldown--;
    }
    
    drawShape(ctx) {
        // Draw main body
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw scope
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(20, 0, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.moveTo(20, -8);
        ctx.lineTo(20, 8);
        ctx.moveTo(12, 0);
        ctx.lineTo(28, 0);
        ctx.stroke();
        
        // Draw laser sight
        if (this.laserSightAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.laserSightAlpha * 0.3;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(50, 0);
            ctx.lineTo(500, 0);
            ctx.stroke();
            ctx.restore();
        }
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            this.shootCooldown = this.shootInterval;
            const bullet = new Bullet(this.x, this.y, this.angle);
            bullet.speed = 15;
            bullet.vx = Math.cos(this.angle) * bullet.speed;
            bullet.vy = Math.sin(this.angle) * bullet.speed;
            bullet.type = 'boss';
            bullet.radius = 3;
            bullet.damage = 2;
            return bullet;
        }
        return null;
    }
}

// Swarm Boss - Spawns mini-bosses
class SwarmBoss extends Boss {
    constructor(x, y) {
        super(x, y);
        this.speed = 2;
        this.shootInterval = 45;
        this.health = 12;
        this.maxHealth = 12;
        this.radius = 45;
        this.points = 900;
        this.levelUps = 2;
        this.color = '#ff00ff';
        this.spawnCooldown = 0;
        this.spawnInterval = 300;
        this.pulsePhase = 0;
        
        // Organic blob shape
        this.generateBlobShape();
    }
    
    generateBlobShape() {
        this.vertices = [];
        const segments = 12;
        for (let i = 0; i < segments; i++) {
            const angle = (Math.PI * 2 * i) / segments;
            const radius = this.radius + Math.sin(this.pulsePhase + i) * 5;
            this.vertices.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
    }
    
    update(canvas, ship) {
        super.update(canvas, ship);
        this.spawnCooldown--;
        this.pulsePhase += 0.1;
        this.generateBlobShape();
    }
    
    drawShape(ctx) {
        // Draw organic blob
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            const prev = this.vertices[i - 1];
            const curr = this.vertices[i];
            const cpx = (prev.x + curr.x) / 2;
            const cpy = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
        }
        ctx.quadraticCurveTo(
            this.vertices[this.vertices.length - 1].x,
            this.vertices[this.vertices.length - 1].y,
            this.vertices[0].x,
            this.vertices[0].y
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    spawnMiniBoss() {
        if (this.spawnCooldown <= 0) {
            this.spawnCooldown = this.spawnInterval;
            const angle = Math.random() * Math.PI * 2;
            const mini = new Boss(
                this.x + Math.cos(angle) * 100,
                this.y + Math.sin(angle) * 100
            );
            mini.radius = 20;
            mini.health = 3;
            mini.maxHealth = 3;
            mini.speed = 3;
            mini.shootInterval = 80;
            mini.points = 100;
            mini.levelUps = 0.5; // Half a level-up
            return mini;
        }
        return null;
    }
}

// Shield Boss - Has rotating shields, vulnerable windows
class ShieldBoss extends Boss {
    constructor(x, y) {
        super(x, y);
        this.speed = 1.5;
        this.shootInterval = 60;
        this.health = 15;
        this.maxHealth = 15;
        this.radius = 40;
        this.points = 1000;
        this.levelUps = 3;
        this.color = '#00ff00';
        this.shieldAngle = 0;
        this.shieldActive = true;
        this.shieldTimer = 0;
        this.shieldDuration = 180;
        this.shieldCooldown = 120;
    }
    
    update(canvas, ship) {
        super.update(canvas, ship);
        
        this.shieldAngle += 0.05;
        
        this.shieldTimer++;
        if (this.shieldActive && this.shieldTimer > this.shieldDuration) {
            this.shieldActive = false;
            this.shieldTimer = 0;
        } else if (!this.shieldActive && this.shieldTimer > this.shieldCooldown) {
            this.shieldActive = true;
            this.shieldTimer = 0;
        }
    }
    
    takeDamage(damage) {
        if (!this.shieldActive) {
            this.health -= damage;
            if (this.health <= 0) {
                this.alive = false;
            }
        }
    }
    
    draw(ctx, theme) {
        super.draw(ctx, theme);
        
        // Draw shield if active
        if (this.shieldActive) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.shieldAngle);
            
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            // Draw hexagonal shield with gaps
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 * i) / 6;
                const x = Math.cos(angle) * (this.radius + 15);
                const y = Math.sin(angle) * (this.radius + 15);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
            
            // Inner shield layer
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 * i) / 6 + Math.PI / 6;
                const x = Math.cos(angle) * (this.radius + 10);
                const y = Math.sin(angle) * (this.radius + 10);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
            
            ctx.restore();
        } else {
            // Show vulnerability indicator
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// Legendary Boss - Appears every 25 waves
class LegendaryBoss extends Boss {
    constructor(x, y, baseType) {
        super(x, y);
        this.baseType = baseType;
        this.isLegendary = true;
        
        // Copy properties from base type and enhance
        const baseStats = this.getBaseStats(baseType);
        Object.assign(this, baseStats);
        
        // Legendary enhancements
        this.health *= 10;
        this.maxHealth *= 10;
        this.radius *= 2;
        this.points *= 10;
        this.levelUps = 5;
        this.speed *= 1.5;
        this.shootInterval = Math.max(10, this.shootInterval * 0.5);
        
        // Golden color overlay
        this.legendaryGlow = 0;
    }
    
    getBaseStats(type) {
        const stats = {
            'speed': {
                speed: 6,
                shootInterval: 15,
                color: '#00ffff',
                vertices: SpeedBoss.prototype.vertices
            },
            'tank': {
                speed: 1.5,
                shootInterval: 45,
                color: '#ff4444',
                vertices: TankBoss.prototype.vertices
            },
            'sniper': {
                speed: 2,
                shootInterval: 60,
                color: '#ffff00',
                vertices: SniperBoss.prototype.vertices
            },
            'swarm': {
                speed: 3,
                shootInterval: 20,
                color: '#ff00ff',
                vertices: SwarmBoss.prototype.vertices
            },
            'shield': {
                speed: 2,
                shootInterval: 30,
                color: '#00ff00',
                vertices: ShieldBoss.prototype.vertices
            }
        };
        return stats[type] || stats['tank'];
    }
    
    update(canvas, ship) {
        super.update(canvas, ship);
        this.legendaryGlow = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
    }
    
    draw(ctx, theme) {
        // Golden aura
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = this.legendaryGlow * 0.5;
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ffdd00';
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + i * 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
        
        // Draw base boss
        super.draw(ctx, theme);
        
        // Legendary crown indicator
        ctx.save();
        ctx.translate(this.x, this.y - this.radius - 20);
        ctx.fillStyle = '#ffdd00';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👑', 0, 0);
        ctx.restore();
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            this.shootCooldown = this.shootInterval;
            
            // Enhanced shooting patterns based on type
            if (this.baseType === 'tank') {
                // Carpet bombing
                const bullets = [];
                for (let i = -2; i <= 2; i++) {
                    const angle = this.angle + i * 0.2;
                    const bullet = new Bullet(this.x, this.y, angle);
                    bullet.speed = 5;
                    bullet.vx = Math.cos(angle) * bullet.speed;
                    bullet.vy = Math.sin(angle) * bullet.speed;
                    bullet.type = 'boss';
                    bullet.radius = 10;
                    bullet.explosive = true;
                    bullets.push(bullet);
                }
                return bullets;
            } else if (this.baseType === 'speed') {
                // Triple burst
                const bullets = [];
                for (let i = 0; i < 3; i++) {
                    const bullet = new Bullet(this.x, this.y, this.angle);
                    bullet.speed = 10 + i * 2;
                    bullet.vx = Math.cos(this.angle) * bullet.speed;
                    bullet.vy = Math.sin(this.angle) * bullet.speed;
                    bullet.type = 'boss';
                    bullet.radius = 5;
                    bullets.push(bullet);
                }
                return bullets;
            } else {
                // Default enhanced shot
                const bullet = super.shoot();
                if (bullet) {
                    bullet.radius *= 1.5;
                    bullet.damage = (bullet.damage || 1) * 2;
                }
                return bullet;
            }
        }
        return null;
    }
}