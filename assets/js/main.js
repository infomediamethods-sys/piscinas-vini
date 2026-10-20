/* main.js — comportamento base da agência. Sem dependências.
   Nada aqui é necessário para o conteúdo aparecer: sem JS, o site funciona. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Rolagem: UM canal só para tudo que reage à rolagem (regra do Armin, 19/10/2026: rolagem leve no celular).
     window.aoRolar(fn) chama fn({scroll, progress}) no máximo uma vez por quadro, pelo scroll nativo
     (sem Lenis: regra do Armin, 20/10/2026, rolagem nativa em todos os aparelhos). Dentro de fn: só trocar classe/atributo ou escrever transform/opacity.
     NUNCA medir (getBoundingClientRect, offsetTop, scrollHeight) dentro de fn: meça fora, uma vez, e remeça no resize. */
  var ouvintes = [], agendado = false;
  function disparar() {
    agendado = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var y = window.scrollY;
    var dados = { scroll: y, progress: max > 0 ? Math.min(1, Math.max(0, y / max)) : 0 };
    for (var i = 0; i < ouvintes.length; i++) ouvintes[i](dados);
  }
  function pedir() { if (!agendado) { agendado = true; requestAnimationFrame(disparar); } }
  window.addEventListener('scroll', pedir, { passive: true });
  window.aoRolar = function (fn) { ouvintes.push(fn); pedir(); };

  /* Cabeçalho: marca rolagem e mede a altura (usada no scroll-margin das âncoras) */
  var header = document.querySelector('[data-header]');
  if (header) {
    var medir = function () { document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px'); };
    medir();
    window.addEventListener('resize', medir);
    window.aoRolar(function (d) { header.toggleAttribute('data-rolado', d.scroll > 80); });
  }

  /* Menu de celular: abre, fecha, Esc, foco */
  var menu = document.querySelector('.menu-celular');
  var abrir = document.querySelector('[data-abrir-menu]');
  var fechar = document.querySelectorAll('[data-fechar-menu]');
  function estado(aberto) {
    if (!menu) return;
    menu.dataset.aberto = aberto ? 'true' : 'false';
    menu.setAttribute('aria-hidden', aberto ? 'false' : 'true');
    document.body.dataset.menu = aberto ? 'true' : 'false';
    if (abrir) abrir.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    if (aberto) { var p = menu.querySelector('a, button'); if (p) p.focus(); } else if (abrir) abrir.focus();
  }
  if (abrir) abrir.addEventListener('click', function () { estado(true); });
  fechar.forEach(function (b) { b.addEventListener('click', function () { estado(false); }); });
  if (menu) menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { estado(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu && menu.dataset.aberto === 'true') estado(false); });

  /* Entrada de seção (ajustes r4, 20/10/2026): só opacidade, curta, disparada meia tela ANTES do bloco entrar na tela.
     Numa rolagem rápida (>1,2 px/ms), ou se o bloco já está na tela ou acima dela, aparece na hora, sem
     transição: nada fica apagado nem "se realoca" quando a pessoa para de rolar. Atraso escalonado máx. 3 × 40ms. */
  var itens = document.querySelectorAll('.revelar');
  if (reduzir || !('IntersectionObserver' in window)) {
    itens.forEach(function (el) { el.classList.add('visivel'); });
  } else {
    /* velocidade medida pelo canal aoRolar (um valor por quadro): acima de 1,2 px/ms (~20px por quadro) é arrasto,
       inércia ou âncora suave, e o bloco aparece na hora; rolagem de leitura continua com o fade */
    var ultY = window.scrollY, ultT = performance.now(), vel = 0;
    window.aoRolar(function (d) {
      var t = performance.now();
      vel = Math.abs(d.scroll - ultY) / Math.max(1, t - ultT);
      ultY = d.scroll; ultT = t;
    });
    var naHora = function (el) {
      el.style.transition = 'none'; el.classList.add('visivel');
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.transition = ''; }); });
    };
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.unobserve(en.target);
        var rapido = vel > 1.2 && performance.now() - ultT < 120;
        if (rapido || en.boundingClientRect.top < window.innerHeight) return naHora(en.target);
        var irmaos = Array.prototype.filter.call(en.target.parentNode.children, function (c) { return c.classList.contains('revelar'); });
        var i = Math.min(irmaos.indexOf(en.target), 3);
        en.target.style.transitionDelay = (i > 0 ? i * 40 : 0) + 'ms';
        en.target.classList.add('visivel');
        en.target.addEventListener('transitionend', function () { en.target.style.transitionDelay = ''; }, { once: true });
      });
    }, { rootMargin: '0px 0px 50% 0px', threshold: 0 });
    itens.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) naHora(el);
      else obs.observe(el);
    });
  }

  /* Imagens de cima para baixo (regra do Armin, 19/10/2026): depois que a primeira tela carregou (evento load),
     as imagens com loading="lazy" são carregadas uma por vez, na ordem da página, em tempo ocioso. Quando a pessoa
     rola, a imagem já está no cache: nada "aparece atrasado". Com economia de dados ligada, fica no lazy nativo.
     Toda imagem está num <picture> com srcset/sizes: o eager carrega o tamanho que o aparelho escolheria
     (480/960 no celular), nunca o de 2400px. */
  var conexao = navigator.connection || {};
  if (!conexao.saveData) {
    var fila = Array.prototype.slice.call(document.querySelectorAll('img[loading="lazy"]'));
    var aquecer = function () {
      var img = fila.shift();
      if (!img) return;
      if (img.complete && img.naturalWidth) return aquecer();
      img.addEventListener('load', aquecer, { once: true });
      img.addEventListener('error', aquecer, { once: true });
      img.loading = 'eager';
    };
    window.addEventListener('load', function () { (window.requestIdleCallback || function (f) { setTimeout(f, 300); })(aquecer); });
  }

  /* Botão fixo de WhatsApp (celular, modo A da §0): com data-sempre fica visível do topo ao fim */
  var fixo = document.querySelector('.whatsapp-fixo');
  if (fixo && fixo.hasAttribute('data-sempre')) fixo.dataset.visivel = 'true';
  else if (fixo) {
    var alvo = document.querySelector('[data-heroi]') || document.querySelector('main > :first-child');
    var fimHeroi = 0;
    var medirHeroi = function () { fimHeroi = alvo ? alvo.offsetTop + alvo.offsetHeight : window.innerHeight * 0.6; };
    medirHeroi();
    window.addEventListener('resize', medirHeroi);
    window.aoRolar(function (d) { fixo.dataset.visivel = d.scroll > Math.min(fimHeroi, window.innerHeight * 0.6) ? 'true' : 'false'; });
  }
})();
