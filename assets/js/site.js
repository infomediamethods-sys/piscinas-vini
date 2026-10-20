/* site.js — comportamento próprio da Vavá Piscinas (funil de WhatsApp). Sem dependências.
   Sem JS, todo link de WhatsApp já funciona pelo href estático (mensagem padrão da página).
   NÚMERO DO WHATSAPP: (48) 3334-0055, confirmado pelo Vini em 2026-10-19. Trocar aqui E em _fonte/montar.py (WA). */
(function () {
  'use strict';
  if (/[?&]rascunho\b/.test(location.search)) document.documentElement.classList.add('ver-rascunho');
  var WA = '554833340055';
  var link = function (texto) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(texto); };

  /* Qualificador de 3 perguntas (páginas de categoria): as escolhas montam a mensagem; sem escolha, vale a genérica */
  document.querySelectorAll('[data-qualificador]').forEach(function (form) {
    var cta = form.querySelector('[data-qualificador-cta]');
    var resumo = form.querySelector('[data-qualificador-resumo]');
    var base = form.getAttribute('data-mensagem');
    var atualizar = function () {
      var partes = [];
      form.querySelectorAll('fieldset').forEach(function (fs) {
        var marcado = fs.querySelector('input:checked');
        if (marcado) partes.push(fs.getAttribute('data-pergunta') + ': ' + marcado.value + '.');
      });
      var texto = base + (partes.length ? ' ' + partes.join(' ') : '');
      cta.href = link(texto);
      if (resumo) resumo.textContent = partes.length ? '“' + texto + '”' : '';
    };
    form.addEventListener('change', atualizar);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    atualizar();
  });

  /* Monte seu pedido (limpeza.html): lista em localStorage, vira uma mensagem só */
  var grade = document.querySelector('[data-catalogo]');
  if (!grade) return;
  var CHAVE = 'vava-pedido';
  var MAX = 20; /* máximo por item */
  var barra = document.querySelector('[data-pedido]');
  var lista = barra.querySelector('[data-pedido-lista]');
  var contador = barra.querySelector('[data-pedido-contador]');
  var enviar = barra.querySelector('[data-pedido-enviar]');
  var abrirLista = barra.querySelector('[data-pedido-abrir]');
  var nomes = {};
  grade.querySelectorAll('[data-produto]').forEach(function (c) { nomes[c.getAttribute('data-produto')] = c.getAttribute('data-nome'); });
  var ler = function () { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } };
  var pedido = ler();
  Object.keys(pedido).forEach(function (k) { if (!nomes[k] || !(pedido[k] > 0)) delete pedido[k]; else pedido[k] = Math.min(MAX, pedido[k]); });

  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(pedido)); } catch (e) {} }
  function render() {
    var ids = Object.keys(pedido);
    var total = ids.reduce(function (s, k) { return s + pedido[k]; }, 0);
    barra.hidden = total === 0;
    document.body.toggleAttribute('data-com-pedido', total > 0);
    contador.textContent = total === 1 ? '1 item' : total + ' itens';
    /* a lista é recriada: guarda qual item e qual botão tinham o foco para devolver depois */
    var ativo = document.activeElement, liAtivo = lista.contains(ativo) && ativo.closest('li');
    var focoK = liAtivo && liAtivo.dataset.k, focoMais = liAtivo && ativo.hasAttribute('data-mais');
    var ordemAntes = [].map.call(lista.children, function (li) { return li.dataset.k; });
    lista.innerHTML = '';
    if (total === 0) { barra.removeAttribute('data-aberto'); abrirLista.setAttribute('aria-expanded', 'false'); }
    ids.forEach(function (k) {
      var li = document.createElement('li');
      li.dataset.k = k;
      li.innerHTML = '<span class="pedido__nome"></span><span class="pedido__qtd">' +
        '<button type="button" data-menos>−</button><output></output>' +
        '<button type="button" data-mais>+</button></span>';
      li.querySelector('.pedido__nome').textContent = nomes[k];
      li.querySelector('[data-menos]').setAttribute('aria-label', 'Tirar um ' + nomes[k]);
      li.querySelector('[data-mais]').setAttribute('aria-label', 'Pôr mais um ' + nomes[k]);
      li.querySelector('output').textContent = pedido[k];
      li.querySelector('[data-menos]').addEventListener('click', function () { mudar(k, -1); });
      li.querySelector('[data-mais]').addEventListener('click', function () { mudar(k, 1); });
      li.querySelector('[data-mais]').disabled = pedido[k] >= MAX;
      lista.appendChild(li);
    });
    if (focoK) {
      var alvo = lista.querySelector('li[data-k="' + focoK + '"]');
      if (alvo) {
        var mais = alvo.querySelector('[data-mais]');
        (focoMais && !mais.disabled ? mais : alvo.querySelector('[data-menos]')).focus();
      } else {
        /* o item zerou: foco no item que ficou no lugar, ou no "Adicionar" do card */
        var prox = ordemAntes.slice(ordemAntes.indexOf(focoK) + 1).concat(ordemAntes.slice(0, ordemAntes.indexOf(focoK)).reverse())
          .map(function (k) { return lista.querySelector('li[data-k="' + k + '"]'); }).filter(Boolean)[0];
        if (prox) prox.querySelector('[data-menos]').focus();
        else { var ad = grade.querySelector('[data-produto="' + focoK + '"] [data-adicionar]'); ad.hidden = false; ad.focus(); }
      }
    }
    document.querySelectorAll('[data-guia-adicionar]').forEach(function (b) {
      var todos = b.getAttribute('data-guia-adicionar').split(' ').every(function (k) { return !nomes[k] || pedido[k] > 0; });
      b.querySelector('[data-rotulo]').textContent = todos ? 'Adicionado ao pedido' : 'Pôr no pedido';
    });
    var itens = ids.map(function (k) { return pedido[k] + '× ' + nomes[k]; }).join(', ');
    enviar.href = link('Olá! Vim pelo site e quero pedir: ' + itens + '. Qual o valor e o prazo? Entrega ou retirada?');
    grade.querySelectorAll('[data-produto]').forEach(function (c) {
      var q = pedido[c.getAttribute('data-produto')] || 0;
      var b = c.querySelector('[data-adicionar]');
      var qtd = c.querySelector('[data-qtd]');
      var focoNoControle = qtd.contains(document.activeElement);
      b.hidden = q > 0;
      qtd.hidden = q === 0;
      qtd.querySelector('output').textContent = q;
      qtd.querySelector('[data-card-mais]').disabled = q >= MAX;
      if (q === 0 && focoNoControle) b.focus();
    });
  }
  function mudar(k, d) {
    pedido[k] = Math.min(MAX, (pedido[k] || 0) + d);
    if (pedido[k] <= 0) delete pedido[k];
    salvar(); render();
  }
  grade.addEventListener('click', function (e) {
    var b = e.target.closest('[data-adicionar], [data-card-mais], [data-card-menos]');
    if (!b) return;
    var k = b.closest('[data-produto]').getAttribute('data-produto');
    mudar(k, b.hasAttribute('data-card-menos') ? -1 : 1);
    if (b.hasAttribute('data-adicionar')) b.closest('[data-produto]').querySelector('[data-card-mais]').focus();
  });
  document.querySelectorAll('[data-guia-adicionar]').forEach(function (b) {
    b.addEventListener('click', function () {
      b.getAttribute('data-guia-adicionar').split(' ').forEach(function (k) { if (nomes[k] && !pedido[k]) pedido[k] = 1; });
      salvar(); render();
    });
  });
  abrirLista.addEventListener('click', function () {
    var aberto = abrirLista.getAttribute('aria-expanded') === 'true';
    abrirLista.setAttribute('aria-expanded', aberto ? 'false' : 'true');
    barra.toggleAttribute('data-aberto', !aberto);
  });

  /* Filtros por tipo */
  var chips = document.querySelectorAll('[data-filtro]');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var tipo = chip.getAttribute('data-filtro');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      grade.querySelectorAll('[data-produto]').forEach(function (c) {
        c.hidden = tipo !== 'todos' && c.getAttribute('data-tipo') !== tipo;
      });
    });
  });
  render();
})();
