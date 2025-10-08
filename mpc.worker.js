// mpc.worker.js - Model Predictive Control for AI movement planning
const TAU = Math.PI * 2;
const rnd = (a,b)=>a+Math.random()*(b-a);

function wrapDelta(dx, w) {
  // minimal torus delta in [-w/2, w/2]
  dx = (dx + w/2) % w - w/2;
  return dx;
}

function stepShip(s, a, dt) {
  // s: {x,y,vx,vy,angle, maxSpeed, rotSpeed, thrust}
  // a: action id 0..5
  const turning = (a===2||a===4) ? -1 : (a===3||a===5) ? +1 : 0;
  const thrust  = (a===1||a===4||a===5);

  s.angle += turning * s.rotSpeed * dt;
  if (s.angle > TAU) s.angle -= TAU; if (s.angle < 0) s.angle += TAU;

  if (thrust) {
    s.vx += Math.cos(s.angle) * s.thrust * dt;
    s.vy += Math.sin(s.angle) * s.thrust * dt;
  }
  // clamp speed
  const sp = Math.hypot(s.vx, s.vy);
  if (sp > s.maxSpeed) { s.vx *= s.maxSpeed/sp; s.vy *= s.maxSpeed/sp; }

  // Apply friction
  s.vx *= 0.99;
  s.vy *= 0.99;

  s.x += s.vx * dt;
  s.y += s.vy * dt;
}

function collideCircleTorus(px,py, qx,qy, r, W,H) {
  const dx = wrapDelta(qx-px, W);
  const dy = wrapDelta(qy-py, H);
  return (dx*dx + dy*dy) < r*r;
}

function nearestThreatDist(px,py, threats, W,H) {
  let best = 1e9;
  for (let i=0;i<threats.length;i++){
    const t = threats[i];
    const dx = wrapDelta(t.x - px, W);
    const dy = wrapDelta(t.y - py, H);
    const d = Math.hypot(dx,dy) - t.r;
    if (d < best) best = d;
  }
  return Math.max(0,best);
}

onmessage = (e) => {
  const { type, payload } = e.data;
  if (type !== 'plan') return;

  const {
    ship, asteroids, bullets, boss, powerUps,
    width, height, dt, horizon, controlEvery, samples
  } = payload;

  // Prepack threats WITH VELOCITIES for proper prediction
  const KEEP_OUT = 180;
  const threats = asteroids.map(a=>({
    x:a.x, y:a.y, vx:a.vx||0, vy:a.vy||0, r:a.radius, type:'asteroid'
  })).concat(bullets.map(b=>({
    x:b.x, y:b.y, vx:b.vx||0, vy:b.vy||0, r:b.radius||3, type:'bullet'
  })));
  
  if (boss) threats.push({
    x:boss.x, y:boss.y, vx:boss.vx||0, vy:boss.vy||0, 
    r:(boss.radius||40)+KEEP_OUT, type:'boss'
  });

  let best = { score: -1e9, seq: [] };

  const steps = Math.floor(horizon / controlEvery);
  for (let n=0; n<samples; n++){
    // random open-loop sequence
    const seq = Array.from({length:steps}, _ => (Math.random()*6)|0);

    // local copy of ship and threats for this simulation
    const s = { ...ship };
    s.maxSpeed = s.maxSpeed || 10;
    s.rotSpeed = s.rotSpeed || s.rotationSpeed || 0.1;
    s.thrust = s.thrust || s.acceleration || 0.5;
    s.radius = s.radius || 15;
    
    // Deep copy threats so we can simulate their movement
    const simThreats = threats.map(t => ({...t}));
    
    let score = 0, dead = false;
    let minClearanceSeen = 1e9;

    for (let k=0; k<steps; k++){
      const action = seq[k];
      for (let f=0; f<controlEvery; f++){
        stepShip(s, action, dt);
        
        // CRITICAL: Advance threats according to their velocities!
        for (let t of simThreats) {
          t.x += t.vx * dt;
          t.y += t.vy * dt;
          // Handle wrapping for threats
          if (t.x<0) t.x+=width; if (t.x>=width) t.x-=width;
          if (t.y<0) t.y+=height; if (t.y>=height) t.y-=height;
        }
        
        // torus wrap for ship
        if (s.x<0) s.x+=width; if (s.x>=width) s.x-=width;
        if (s.y<0) s.y+=height; if (s.y>=height) s.y-=height;

        // collision check with MOVING threats
        if (simThreats.some(t=>collideCircleTorus(s.x,s.y,t.x,t.y,t.r + s.radius, width,height))) {
          score -= 1e6;
          dead = true; break;
        }

        // Track minimum clearance for terminal safety barrier
        const clr = nearestThreatDist(s.x,s.y, simThreats, width,height);
        minClearanceSeen = Math.min(minClearanceSeen, clr);
        
        // Clearance reward with convex barrier near danger
        score += Math.min(clr, 300) * 0.2;
        if (clr < 50) {
          score -= (50 - clr) * (50 - clr) * 10; // Quadratic penalty approaching danger
        }

        // power-up lure
        for (let p of powerUps) {
          const dx = wrapDelta(p.x - s.x, width);
          const dy = wrapDelta(p.y - s.y, height);
          const d = Math.hypot(dx,dy);
          if (d < 25) score += 600;            // collect!
          score += (300 - Math.min(d,300)) * 0.02;
        }

        // small speed regularizer near clutter
        if (clr < 200) {
          const sp = Math.hypot(s.vx,s.vy);
          score -= sp * 0.5;
        }
      }
      if (dead) break;
    }
    
    // Terminal safety barrier - huge penalty if we got too close
    if (!dead && minClearanceSeen < 20) {
      score -= 5e5 - 3e3*minClearanceSeen; // Massive penalty with gradient
    }

    // Boss standoff enforcement and radial velocity penalties
    if (boss && !dead) {
      const dx = wrapDelta(boss.x - s.x, width);
      const dy = wrapDelta(boss.y - s.y, height);
      const d = Math.hypot(dx,dy);
      
      // Calculate radial velocity (negative = closing in)
      const rx = dx/(d+1e-6), ry = dy/(d+1e-6);
      const vr = s.vx*rx + s.vy*ry;
      
      // Penalize getting closer to boss
      if (d < 500 && vr < 0) {
        score -= 300 * Math.abs(vr); // Penalty proportional to closing speed
      }
      
      // Reward orbiting at safe standoff distance
      if (d >= 400 && d <= 900) {
        score += 300;
        // Extra reward for tangential movement (not rushing in)
        if (Math.abs(vr) < 2) {
          score += 100;
        }
      }
      
      // Penalty for being in boss's direct line
      const angleToShip = Math.atan2(-dy, -dx);
      const angleDiff = Math.abs(angleToShip - s.angle);
      if (d < 450 && angleDiff < 0.3) {
        score -= 200; // Don't sit in firing line
      }
    }

    if (score > best.score) best = { score, seq };
  }

  postMessage({ type: 'planResult', plan: best });
};