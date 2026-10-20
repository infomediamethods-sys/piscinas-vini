/* movimento.js — movimento da Vava Piscinas (specs/design.md §10).
   Herói: bolhas em canvas que sobem mais rápido conforme a pessoa rola (manual "Hero com bolhas", adaptado à §0:
   sem trilho preso de 250svh, sem blur no texto; o texto afunda e esmaece só com transform/opacity).
   Tudo que reage à rolagem passa por window.aoRolar (main.js). Medidas fora do handler, refeitas no resize. */
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var heroi = document.querySelector('[data-heroi-agua]');
  if (!heroi) return;
  var canvas = heroi.querySelector('canvas[data-bolhas]');
  var texto = heroi.querySelector('[data-heroi-texto]');
  var dica = heroi.querySelector('[data-heroi-dica]');
  var altura = heroi.offsetHeight;
  var progresso = 0;
  var medir = function () { altura = heroi.offsetHeight || window.innerHeight; };
  window.addEventListener('resize', medir);

  window.aoRolar(function (d) {
    progresso = Math.min(1, Math.max(0, d.scroll / altura));
    if (texto) {
      texto.style.transform = 'translate3d(0,' + (progresso * 72).toFixed(1) + 'px,0)';
      texto.style.opacity = Math.max(0, 1 - progresso * 1.6).toFixed(3);
    }
    if (dica) dica.style.opacity = progresso > 0.05 ? '0' : '1';
  });

  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var celular = window.matchMedia('(max-width: 899px)').matches;
  var N = celular ? 26 : 50;
  var dpr = Math.min(window.devicePixelRatio || 1, celular ? 1.5 : 2);
  var L = 0, A = 0;

  /* gerador com semente fixa: a animação é a mesma a cada visita */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(42);
  var bolhas = [];
  for (var i = 0; i < N; i++) {
    var r = rnd();
    bolhas.push({ x: rnd(), y: 0.2 + rnd() * 1.2, raio: 3 + 19 * r * r, vel: 20 + rnd() * 60, amp: 4 + rnd() * 10, fase: rnd() * 6.28, amb: i < 4, ordem: i, alpha: i < 4 ? 1 : 0 });
  }
  /* Ajustes r4 (S3): UMA bolha pré-desenhada num canvas fora da tela (64px, gradiente + contorno + brilho);
     a cada quadro só drawImage escalado com o globalAlpha da bolha (antes: um createRadialGradient por bolha por quadro). */
  var S = 64, sprite = document.createElement('canvas');
  sprite.width = sprite.height = S;
  (function () {
    var c = sprite.getContext('2d'), m = S / 2, R = m - 1.5;
    var g = c.createRadialGradient(m, m, 0, m, m, R);
    g.addColorStop(0, 'rgba(56,211,230,0.10)'); g.addColorStop(1, 'rgba(56,211,230,0)');
    c.beginPath(); c.arc(m, m, R, 0, 6.2832); c.fillStyle = g; c.fill();
    c.lineWidth = 1.5 * R / 12; c.strokeStyle = 'rgba(255,255,255,0.55)'; c.stroke();
    c.beginPath(); c.arc(m - R * 0.3, m - R * 0.3, R * 0.18, 0, 6.2832); c.fillStyle = 'rgba(255,255,255,0.8)'; c.fill();
  })();
  function dimensionar() {
    L = canvas.clientWidth; A = canvas.clientHeight;
    canvas.width = Math.round(L * dpr); canvas.height = Math.round(A * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  dimensionar();
  window.addEventListener('resize', dimensionar);

  var rodando = false, ultimo = 0, t = 0;
  function quadro(agora) {
    if (!rodando) return;
    var dt = Math.min(0.05, (agora - (ultimo || agora)) / 1000); ultimo = agora; t += dt;
    ctx.clearRect(0, 0, L, A);
    /* Ajustes r1 (A1): cada bolha tem opacidade própria que persegue o alvo com suavização, nos dois sentidos,
       e o alvo de cada uma é escalonado pela ordem: descendo elas surgem aos poucos, subindo se apagam aos poucos. */
    var fator = 0.5 + progresso * 2.2;
    var k = Math.min(1, dt * 3.5);
    for (var i = 0; i < bolhas.length; i++) {
      var b = bolhas[i];
      var alvo = b.amb ? 1 : Math.min(1, Math.max(0, (progresso - 0.02 - b.ordem * 0.01) / 0.14));
      b.alpha += (alvo - b.alpha) * k;
      var v = 12 + (b.vel * fator - 12) * b.alpha;
      b.y -= (v * dt) / A;
      if (b.alpha < 0.01) { if (b.y * A < -b.raio) { b.y = 1 + b.raio / A; b.x = rnd(); } continue; }
      if (b.y * A < -b.raio) { b.y = 1 + b.raio / A; b.x = rnd(); }
      var px = b.x * L + Math.sin(t * 1.2 + b.fase) * b.amp;
      var py = b.y * A;
      ctx.globalAlpha = 0.9 * b.alpha;
      ctx.drawImage(sprite, px - b.raio, py - b.raio, b.raio * 2, b.raio * 2);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(quadro);
  }
  function ligar(sim) {
    if (sim && !rodando && !document.hidden) { rodando = true; ultimo = 0; requestAnimationFrame(quadro); }
    else if (!sim) rodando = false;
  }
  var visivel = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visivel = en[0].isIntersecting; ligar(visivel); }).observe(heroi);
  } else ligar(true);
  document.addEventListener('visibilitychange', function () { ligar(visivel && !document.hidden); });
})();
