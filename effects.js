class Particle {
    constructor(x, y, vx, vy, color, size, lifetime) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.lifetime--;
        this.rotation += this.rotationSpeed;
        return this.lifetime > 0;
    }
    
    draw(ctx) {
        const alpha = this.lifetime / this.maxLifetime;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }
    
    update() {
        this.particles = this.particles.filter(particle => particle.update());
    }
    
    draw(ctx) {
        this.particles.forEach(particle => particle.draw(ctx));
    }
    
    createExplosion(x, y, color = '#ff6600', count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            this.particles.push(new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                2 + Math.random() * 4,
                30 + Math.random() * 30
            ));
        }
    }
    
    createShipExplosion(x, y) {
        const colors = ['#00ffff', '#0088ff', '#ffffff', '#ff6600'];
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 6;
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                2 + Math.random() * 6,
                40 + Math.random() * 40
            ));
        }
    }
    
    createAsteroidExplosion(x, y, radius) {
        const count = Math.floor(radius / 2);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            this.particles.push(new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#888888',
                2 + Math.random() * 4,
                20 + Math.random() * 20
            ));
        }
    }
    
    createBulletImpact(x, y, color = '#ffff00') {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            this.particles.push(new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                1 + Math.random() * 2,
                10 + Math.random() * 10
            ));
        }
    }
    
    createThrustParticles(x, y, angle) {
        for (let i = 0; i < 3; i++) {
            const spread = (Math.random() - 0.5) * 0.5;
            const thrustAngle = angle + Math.PI + spread;
            const speed = 2 + Math.random() * 2;
            this.particles.push(new Particle(
                x,
                y,
                Math.cos(thrustAngle) * speed,
                Math.sin(thrustAngle) * speed,
                '#ff6600',
                1 + Math.random() * 2,
                10 + Math.random() * 10
            ));
        }
    }
    
    createPowerUpCollect(x, y, color) {
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 3 + Math.random() * 2;
            this.particles.push(new Particle(
                x,
                y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                color,
                2 + Math.random() * 3,
                30 + Math.random() * 20
            ));
        }
    }
}

class StarField {
    constructor(width, height) {
        this.stars = [];
        this.width = width;
        this.height = height;
        this.generateStars();
    }
    
    generateStars() {
        const starCount = 200;
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2,
                brightness: Math.random(),
                twinkleSpeed: 0.01 + Math.random() * 0.02
            });
        }
    }
    
    update(width, height) {
        if (this.width !== width || this.height !== height) {
            this.width = width;
            this.height = height;
            this.generateStars();
        }
        
        this.stars.forEach(star => {
            star.brightness += Math.sin(Date.now() * star.twinkleSpeed) * 0.01;
            star.brightness = Math.max(0.3, Math.min(1, star.brightness));
        });
    }
    
    draw(ctx) {
        this.stars.forEach(star => {
            ctx.save();
            ctx.globalAlpha = star.brightness;
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = star.size * 2;
            ctx.shadowColor = '#ffffff';
            ctx.fillRect(star.x, star.y, star.size, star.size);
            ctx.restore();
        });
    }
}

class Trail {
    constructor(maxLength = 20) {
        this.points = [];
        this.maxLength = maxLength;
    }
    
    addPoint(x, y) {
        this.points.push({ x, y, alpha: 1 });
        if (this.points.length > this.maxLength) {
            this.points.shift();
        }
    }
    
    update() {
        this.points.forEach((point, index) => {
            point.alpha = (index + 1) / this.points.length;
        });
    }
    
    draw(ctx, color = '#00ffff') {
        if (this.points.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        
        for (let i = 1; i < this.points.length; i++) {
            ctx.beginPath();
            ctx.globalAlpha = this.points[i].alpha * 0.5;
            ctx.lineWidth = (i / this.points.length) * 3;
            ctx.moveTo(this.points[i - 1].x, this.points[i - 1].y);
            ctx.lineTo(this.points[i].x, this.points[i].y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    clear() {
        this.points = [];
    }
}

class ScreenShake {
    constructor() {
        this.intensity = 0;
        this.duration = 0;
        this.x = 0;
        this.y = 0;
    }
    
    shake(intensity, duration) {
        this.intensity = intensity;
        this.duration = duration;
    }
    
    update() {
        if (this.duration > 0) {
            this.duration--;
            this.x = (Math.random() - 0.5) * this.intensity;
            this.y = (Math.random() - 0.5) * this.intensity;
            this.intensity *= 0.9;
        } else {
            this.x = 0;
            this.y = 0;
        }
    }
    
    apply(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
    }
    
    reset(ctx) {
        ctx.restore();
    }
}

class WaveTransition {
    constructor() {
        this.active = false;
        this.progress = 0;
        this.waveNumber = 1;
    }
    
    start(waveNumber) {
        this.active = true;
        this.progress = 0;
        this.waveNumber = waveNumber;
    }
    
    update() {
        if (this.active) {
            this.progress += 0.02;
            if (this.progress >= 1) {
                this.active = false;
            }
        }
    }
    
    draw(ctx, canvas) {
        if (!this.active) return;
        
        const alpha = this.progress < 0.5 
            ? this.progress * 2 
            : (1 - this.progress) * 2;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';
        
        ctx.fillText(`WAVE ${this.waveNumber}`, canvas.width / 2, canvas.height / 2);
        
        if (this.waveNumber > 1) {
            ctx.font = '30px Courier New';
            ctx.fillText('Asteroids speed increased!', canvas.width / 2, canvas.height / 2 + 60);
        }
        
        ctx.restore();
    }
}