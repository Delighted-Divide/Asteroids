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
                fragments.push(new Asteroid(
                    this.x + (Math.random() - 0.5) * this.radius,
                    this.y + (Math.random() - 0.5) * this.radius,
                    this.radius / 2,
                    'medium'
                ));
            }
        } else if (this.size === 'medium') {
            for (let i = 0; i < 2; i++) {
                fragments.push(new Asteroid(
                    this.x + (Math.random() - 0.5) * this.radius,
                    this.y + (Math.random() - 0.5) * this.radius,
                    this.radius / 2,
                    'small'
                ));
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