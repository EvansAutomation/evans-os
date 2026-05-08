// Animated canvas background — orbs + node grid
(function () {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, t = 0;
  const orbs = [], nodes = [];

  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  resize();
  addEventListener('resize', resize);

  for (let i = 0; i < 9; i++)
    orbs.push({ x: Math.random() * 1200, y: Math.random() * 800, r: 120 + Math.random() * 260, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, hue: 255 + Math.random() * 45, alpha: .055 + Math.random() * .08 });
  for (let i = 0; i < 22; i++)
    nodes.push({ x: Math.random() * 1400, y: Math.random() * 900, p: Math.random() * Math.PI * 2, s: .008 + Math.random() * .018, r: 1.2 + Math.random() * 2.2 });

  function frame() {
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(W * .35, H * .3, 0, W * .5, H * .5, W * .85);
    bg.addColorStop(0, '#160e32'); bg.addColorStop(.5, '#0d0b1a'); bg.addColorStop(1, '#08060f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    orbs.forEach(o => {
      o.x += o.vx; o.y += o.vy;
      if (o.x < -o.r) o.x = W + o.r; if (o.x > W + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = H + o.r; if (o.y > H + o.r) o.y = -o.r;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      g.addColorStop(0, `hsla(${o.hue},80%,52%,${o.alpha})`);
      g.addColorStop(.55, `hsla(${o.hue},70%,38%,${o.alpha * .35})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
    });

    ctx.strokeStyle = 'rgba(107,33,232,0.055)'; ctx.lineWidth = 1;
    const sp = 64;
    for (let x = 0; x < W; x += sp) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += sp) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    t += .016;
    nodes.forEach((n, i) => {
      n.p += n.s;
      const a = .15 + .55 * Math.abs(Math.sin(n.p));
      const nr = n.r * (1 + .35 * Math.sin(n.p));
      const nx = n.x % W, ny = n.y % H;
      ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,85,247,${a})`; ctx.fill();
      nodes.forEach((n2, j) => {
        if (j <= i) return;
        const dx = nx - (n2.x % W), dy = ny - (n2.y % H);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 130) {
          ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(n2.x % W, n2.y % H);
          ctx.strokeStyle = `rgba(139,60,247,${.09 * (1 - d / 130)})`;
          ctx.lineWidth = .7; ctx.stroke();
        }
      });
    });
    requestAnimationFrame(frame);
  }
  frame();
})();
