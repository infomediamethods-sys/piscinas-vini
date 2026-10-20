/* site.js — comportamento próprio da Vava Piscinas (funil de WhatsApp). Sem dependências.
   Sem JS, todo link de WhatsApp já funciona pelo href estático (mensagem padrão da página).
   NÚMERO DO WHATSAPP: provisório. Trocar aqui E no href estático dos links (busca por 5500000000000). */
(function () {
  'use strict';
  if (/[?&]rascunho\b/.test(location.search)) document.documentElement.classList.add('ver-rascunho');
  var WA = '5500000000000';
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
  var barra = document.querySelector('[data-pedido]');
  var lista = barra.querySelector('[data-pedido-lista]');
  var contador = barra.querySelector('[data-pedido-contador]');
  var enviar = barra.querySelector('[data-pedido-enviar]');
  var abrirLista = barra.querySelector('[data-pedido-abrir]');
  var nomes = {};
  grade.querySelectorAll('[data-produto]').forEach(function (c) { nomes[c.getAttribute('data-produto')] = c.getAttribute('data-nome'); });
  var ler = function () { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } };
  var pedido = ler();
  Object.keys(pedido).forEach(function (k) { if (!nomes[k] || !(pedido[k] > 0)) delete pedido[k]; });

  function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(pedido)); } catch (e) {} }
  function render() {
    var ids = Object.keys(pedido);
    var total = ids.reduce(function (s, k) { return s + pedido[k]; }, 0);
    barra.hidden = total === 0;
    document.body.toggleAttribute('data-com-pedido', total > 0);
    contador.textContent = total === 1 ? '1 item' : total + ' itens';
    lista.innerHTML = '';
    ids.forEach(function (k) {
      var li = document.createElement('li');
      li.innerHTML = '<span class="pedido__nome"></span><span class="pedido__qtd">' +
        '<button type="button" data-menos aria-label="Tirar um">−</button><output></output>' +
        '<button type="button" data-mais aria-label="Pôr mais um">+</button></span>';
      li.querySelector('.pedido__nome').textContent = nomes[k];
      li.querySelector('output').textContent = pedido[k];
      li.querySelector('[data-menos]').addEventListener('click', function () { mudar(k, -1); });
      li.querySelector('[data-mais]').addEventListener('click', function () { mudar(k, 1); });
      lista.appendChild(li);
    });
    var itens = ids.map(function (k) { return pedido[k] + '× ' + nomes[k]; }).join(', ');
    enviar.href = link('Olá! Vim pelo site e quero pedir: ' + itens + '. Qual o valor e o prazo? Entrega ou retirada?');
    grade.querySelectorAll('[data-produto]').forEach(function (c) {
      var q = pedido[c.getAttribute('data-produto')] || 0;
      var b = c.querySelector('[data-adicionar]');
      b.setAttribute('aria-pressed', q > 0 ? 'true' : 'false');
      b.querySelector('[data-rotulo]').textContent = q > 0 ? 'No pedido (' + q + ')' : 'Adicionar';
    });
  }
  function mudar(k, d) {
    pedido[k] = (pedido[k] || 0) + d;
    if (pedido[k] <= 0) delete pedido[k];
    salvar(); render();
  }
  grade.addEventListener('click', function (e) {
    var b = e.target.closest('[data-adicionar]');
    if (!b) return;
    mudar(b.closest('[data-produto]').getAttribute('data-produto'), 1);
  });
  document.querySelectorAll('[data-guia-adicionar]').forEach(function (b) {
    b.addEventListener('click', function () {
      b.getAttribute('data-guia-adicionar').split(' ').forEach(function (k) { if (nomes[k] && !pedido[k]) pedido[k] = 1; });
      salvar(); render();
      b.querySelector('[data-rotulo]').textContent = 'Adicionado ao pedido';
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
