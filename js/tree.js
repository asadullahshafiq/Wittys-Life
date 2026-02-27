// ===== TREE.JS - Canvas Tree Renderer =====

const TreeRenderer = {
  canvas: null,
  ctx: null,
  animFrame: null,
  particles: [],

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.draw();
  },

  getTreeStage(totalWater, days) {
    // Stages based on days primarily, water accelerates
    const waterBonus = Math.floor(totalWater / 50);
    const effectiveDays = days + waterBonus;

    if (effectiveDays === 0) return 'seed';
    if (effectiveDays < 5) return 'sprout';
    if (effectiveDays < 15) return 'sapling';
    if (effectiveDays < 30) return 'young';
    if (effectiveDays < 50) return 'growing';
    if (effectiveDays < 75) return 'mature';
    if (effectiveDays < 100) return 'leafy';
    if (effectiveDays < 150) return 'fruit';
    if (effectiveDays < 200) return 'lush';
    return 'ancient';
  },

  getStageName(stage) {
    const names = {
      seed: '🌰 Seed', sprout: '🌱 Sprout', sapling: '🪴 Sapling',
      young: '🌿 Young Tree', growing: '🌲 Growing',
      mature: '🌳 Mature', leafy: '🍃 Full Leaves',
      fruit: '🍎 Bearing Fruit', lush: '🌴 Lush Tree', ancient: '🏛️ Ancient Tree'
    };
    return names[stage] || 'Seed';
  },

  draw(options = {}) {
    const tree = Store.getTree();
    const streak = Store.getStreak();
    const settings = Store.getSettings();

    const totalWater = tree.totalWater || 0;
    const days = streak.current || 0;
    const stage = this.getTreeStage(totalWater, days);
    const frozen = streak.freezeUsed;

    if (!this.canvas) return stage;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    const isDark = ['dark', 'ocean'].includes(settings.theme || 'dark');
    bgGrad.addColorStop(0, frozen ? '#0a1528' : isDark ? '#0d1117' : '#1a2a1a');
    bgGrad.addColorStop(1, frozen ? '#0d1e35' : isDark ? '#161b22' : '#0d1710');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Ground
    const groundGrad = ctx.createLinearGradient(0, h - 40, 0, h);
    groundGrad.addColorStop(0, frozen ? '#1a2a4a' : '#1a3a0a');
    groundGrad.addColorStop(1, frozen ? '#0d1e35' : '#0d2005');
    ctx.fillStyle = groundGrad;
    ctx.beginPath();
    ctx.ellipse(w / 2, h - 20, 100, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    const cx = w / 2;
    const groundY = h - 30;

    // Draw based on stage
    if (stage === 'seed') {
      this.drawSeed(ctx, cx, groundY, frozen);
    } else if (stage === 'sprout') {
      this.drawSprout(ctx, cx, groundY, frozen);
    } else {
      this.drawTree(ctx, cx, groundY, stage, frozen, days);
    }

    // Weather effects
    if (days > 0 && days % 3 === 0 && !frozen) {
      this.drawSpring(ctx, w, h);
    }

    // Stars / snow if frozen
    if (frozen) {
      this.drawFrost(ctx, w, h);
    }

    // 365 day burst effect placeholder
    if (days >= 365) {
      this.drawGlow(ctx, cx, groundY - 100, '#ffd700');
    }

    return stage;
  },

  drawSeed(ctx, cx, groundY, frozen) {
    ctx.fillStyle = frozen ? '#4a6a9a' : '#8B4513';
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 8, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // crack
    ctx.strokeStyle = frozen ? '#6a8aba' : '#6B3010';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, groundY - 16);
    ctx.lineTo(cx - 4, groundY);
    ctx.stroke();
  },

  drawSprout(ctx, cx, groundY, frozen) {
    // Stem
    ctx.strokeStyle = frozen ? '#4a7a4a' : '#2d5a1b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, groundY);
    ctx.bezierCurveTo(cx - 5, groundY - 20, cx + 5, groundY - 35, cx, groundY - 50);
    ctx.stroke();
    // Leaf
    if (!frozen) {
      ctx.fillStyle = '#4ade80';
    } else {
      ctx.fillStyle = '#6ab0e0';
    }
    ctx.beginPath();
    ctx.ellipse(cx + 14, groundY - 35, 14, 8, -0.5, 0, Math.PI * 2);
    ctx.fill();
  },

  drawTree(ctx, cx, groundY, stage, frozen, days) {
    const stageIdx = ['sapling', 'young', 'growing', 'mature', 'leafy', 'fruit', 'lush', 'ancient'].indexOf(stage);
    const trunkH = 30 + stageIdx * 15;
    const trunkW = 4 + stageIdx * 2;
    const crownR = 20 + stageIdx * 10;

    // Tilt if frozen
    const tiltAngle = frozen ? 0.1 : 0;

    ctx.save();
    ctx.translate(cx, groundY);
    ctx.rotate(tiltAngle);

    // Trunk
    const trunkGrad = ctx.createLinearGradient(-trunkW, 0, trunkW, 0);
    trunkGrad.addColorStop(0, frozen ? '#3a5a7a' : '#4a2c0a');
    trunkGrad.addColorStop(0.5, frozen ? '#4a7a9a' : '#6B3A1F');
    trunkGrad.addColorStop(1, frozen ? '#2a4a6a' : '#3a1c05');
    ctx.fillStyle = trunkGrad;
    ctx.beginPath();
    ctx.moveTo(-trunkW, 0);
    ctx.bezierCurveTo(-trunkW - 2, -trunkH / 2, -trunkW, -trunkH, 0, -trunkH);
    ctx.bezierCurveTo(trunkW, -trunkH, trunkW + 2, -trunkH / 2, trunkW, 0);
    ctx.fill();

    // Crown layers
    const numLayers = Math.min(3 + stageIdx, 6);
    for (let i = numLayers; i >= 0; i--) {
      const layerY = -trunkH - (i * crownR * 0.5);
      const layerR = crownR * (0.5 + (i / numLayers) * 0.8);
      const alpha = 0.7 + (i / numLayers) * 0.3;

      let leafColor;
      if (frozen) {
        leafColor = `rgba(100, 180, 220, ${alpha})`;
      } else if (stage === 'lush' || stage === 'ancient') {
        leafColor = `rgba(34, 197, 94, ${alpha})`;
      } else {
        leafColor = `rgba(74, 222, 128, ${alpha})`;
      }

      const grad = ctx.createRadialGradient(0, layerY - layerR * 0.2, 0, 0, layerY, layerR);
      grad.addColorStop(0, leafColor);
      grad.addColorStop(1, frozen ? 'rgba(70,140,200,0)' : 'rgba(34,139,34,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, layerY, layerR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fruits (75+ days)
    if (['fruit', 'lush', 'ancient'].includes(stage)) {
      const fruitCount = Math.min(days - 60, 15);
      for (let i = 0; i < fruitCount; i++) {
        const angle = (i / fruitCount) * Math.PI * 2;
        const r = crownR * 0.5;
        const fx = Math.cos(angle) * r;
        const fy = -trunkH - crownR * 0.3 + Math.sin(angle) * r;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Cup / Medal at 365 days
    if (days >= 365) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆', 0, -trunkH - crownR - 30);
    }

    ctx.restore();
  },

  drawSpring(ctx, w, h) {
    // Random flower particles
    const flowers = ['🌸', '🌺', '🌻'];
    for (let i = 0; i < 3; i++) {
      ctx.font = '12px serif';
      ctx.fillText(flowers[i % flowers.length], 20 + i * 80, 30 + Math.random() * 20);
    }
  },

  drawFrost(ctx, w, h) {
    ctx.fillStyle = 'rgba(150, 200, 255, 0.05)';
    ctx.fillRect(0, 0, w, h);
    // Snowflakes
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.font = '14px serif';
      ctx.fillText('❄️', x, y);
    }
  },

  drawGlow(ctx, cx, cy, color) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
    grad.addColorStop(0, color + '80');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  },

  // Animate water being poured
  animateWater(water, onDone) {
    const drops = [];
    const total = Math.min(water, 20);
    for (let i = 0; i < total; i++) {
      drops.push({ delay: i * 50, done: false });
    }

    const container = document.getElementById('waterDrops');
    if (!container) { if (onDone) onDone(); return; }
    container.innerHTML = '';

    let count = 0;
    drops.forEach((drop, i) => {
      setTimeout(() => {
        const el = document.createElement('span');
        el.className = 'drop';
        el.textContent = '💧';
        el.style.animationDelay = '0s';
        container.appendChild(el);
        count++;
        if (count === drops.length) {
          setTimeout(() => { if (onDone) onDone(); }, 1000);
        }
      }, drop.delay);
    });

    if (total === 0 && onDone) setTimeout(onDone, 500);
  }
};
