(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const rubles = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const cards = $$('.dish-card');
  const dishes = cards.map((card, i) => ({
    id: i + 1, name: $('h3', card).textContent, category: $('.dish-top p', card).textContent,
    weight: $('.dish-top small', card).textContent, image: $('img', card).getAttribute('src'),
    price: Number($('.dish-buy strong', card).textContent.replace(/\D/g, '')),
  }));
  const storageKey = 'ugolok-cart-v1';
  let cart = {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved && typeof saved === 'object') dishes.forEach(d => {
      if (Number.isInteger(saved[d.id]) && saved[d.id] > 0) cart[d.id] = Math.min(999, saved[d.id]);
    });
  } catch {}
  const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const total = () => dishes.reduce((sum, dish) => sum + dish.price * (cart[dish.id] || 0), 0);
  const dialog = $('#cart-dialog');
  const content = $('#cart-content');
  let noticeTimer;
  let previousFocus;
  let previousOverflow = '';
  let submitTimer;
  function notify(message) {
    clearTimeout(noticeTimer);
    const notice = $('#notice');
    notice.textContent = message;
    notice.classList.add('is-visible');
    noticeTimer = setTimeout(() => notice.classList.remove('is-visible'), 2800);
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch {}
    const button = $('.cart-button');
    let badge = $('b', button);
    if (!badge) { badge = document.createElement('b'); button.append(badge); }
    badge.textContent = count();
    badge.hidden = count() === 0;
    button.setAttribute('aria-label', `Корзина, товаров: ${count()}`);
  }
  function add(id, amount = 1) { cart[id] = Math.min(999, (cart[id] || 0) + amount); }
  cards.forEach((card, i) => $('.dish-buy button', card).addEventListener('click', () => {
    add(i + 1); save(); notify(`${dishes[i].name} — в корзине`);
  }));
  $('.set-copy button').addEventListener('click', () => {
    add(1, 5); add(5, 2); add(11, 5); save(); notify('Набор «Большой огонь» добавлен');
  });
  const tabs = $$('.category-tabs button');
  function selectCategory(tab) {
    tabs.forEach(button => { const active = button === tab; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
    cards.forEach((card, i) => { card.hidden = tab.textContent !== 'Все' && dishes[i].category !== tab.textContent; card.classList.add('is-visible'); });
  }
  tabs.forEach((tab, i) => {
    tab.tabIndex = i === 0 ? 0 : -1;
    tab.addEventListener('click', () => selectCategory(tab));
    tab.addEventListener('keydown', event => {
      const target = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (target < 0) return;
      event.preventDefault(); selectCategory(tabs[target]); tabs[target].focus();
    });
  });
  const mobile = document.createElement('nav');
  mobile.className = 'mobile-nav'; mobile.id = 'mobile-navigation'; mobile.hidden = true;
  mobile.setAttribute('aria-label', 'Мобильная навигация');
  mobile.innerHTML = '<a href="#menu">Меню</a><a href="#about">Как готовим</a><a href="#contacts">Контакты</a><a href="tel:+79871041282">Позвонить</a>';
  $('.site-header').append(mobile);
  const toggle = $('.mobile-toggle');
  toggle.setAttribute('aria-controls', mobile.id);
  function closeMobile() { mobile.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Открыть меню'); }
  toggle.addEventListener('click', () => { mobile.hidden = !mobile.hidden; toggle.setAttribute('aria-expanded', String(!mobile.hidden)); toggle.setAttribute('aria-label', mobile.hidden ? 'Открыть меню' : 'Закрыть меню'); });
  mobile.addEventListener('click', event => { if (event.target.closest('a')) closeMobile(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMobile(); });
  function heading(title, description) { $('#cart-title').textContent = title; $('#cart-description').textContent = description; }
  function renderCart() {
    heading('Ваш заказ', `${count()} позиций в корзине`);
    if (!count()) {
      content.innerHTML = '<div class="empty-cart"><h3>Здесь пока пусто</h3><p>Выберите шашлык, люля или горячую шаурму из меню.</p><button class="primary-button" data-action="menu" type="button">Смотреть меню</button></div>';
      return;
    }
    content.innerHTML = `<div class="cart-items">${dishes.filter(d => cart[d.id]).map(d => `<article class="cart-item"><img src="${escape(d.image)}" alt=""><div><h3>${escape(d.name)}</h3><p>${escape(d.weight)} · ${rubles(d.price)}</p><div class="quantity"><button type="button" data-action="minus" data-id="${d.id}" aria-label="Уменьшить количество: ${escape(d.name)}">−</button><span>${cart[d.id]}</span><button type="button" data-action="plus" data-id="${d.id}" aria-label="Увеличить количество: ${escape(d.name)}">+</button></div></div><button class="remove-button" type="button" data-action="remove" data-id="${d.id}" aria-label="Удалить: ${escape(d.name)}">×</button></article>`).join('')}</div><div class="cart-summary"><p><span>Итого</span><strong>${rubles(total())}</strong></p><button class="primary-button full" type="button" data-action="checkout">Оформить заказ →</button></div>`;
  }
  $('.cart-button').addEventListener('click', () => {
    closeMobile(); previousFocus = document.activeElement; renderCart();
    previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.showModal();
  });
  $('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog && event.clientX < dialog.getBoundingClientRect().left) dialog.close(); });
  dialog.addEventListener('close', () => { clearTimeout(submitTimer); document.body.style.overflow = previousOverflow; previousFocus?.focus(); });
  content.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = Number(button.dataset.id);
    if (action === 'menu') { dialog.close(); $('#menu').scrollIntoView(); return; }
    if (action === 'close') { dialog.close(); return; }
    if (action === 'checkout') { renderForm(); return; }
    if (action === 'back') { renderCart(); $('.cart-summary button', content)?.focus(); return; }
    if (!dishes.some(d => d.id === id)) return;
    if (action === 'plus') add(id);
    if (action === 'minus') { cart[id] -= 1; if (cart[id] <= 0) delete cart[id]; }
    if (action === 'remove') delete cart[id];
    save(); renderCart();
    ($(`[data-action="${action}"][data-id="${id}"]`, content) || $('button', content) || $('.dialog-close')).focus();
  });
  function renderForm() {
    heading('Оформление', 'Демонстрация оформления заказа');
    content.innerHTML = `<form class="order-form"><fieldset><legend>Как получить заказ</legend><div class="type-choice"><label><input type="radio" name="type" value="pickup" checked><span>Самовывоз</span></label><label><input type="radio" name="type" value="delivery"><span>Доставка</span></label></div></fieldset><label>Ваше имя<input name="name" autocomplete="name" required placeholder="Как к вам обращаться"></label><label>Телефон<input name="phone" type="tel" autocomplete="tel" required placeholder="+7 999 000-00-00"></label><label id="address-field" hidden>Адрес доставки<input name="address" autocomplete="street-address" placeholder="Улица, дом, квартира" disabled></label><label>Комментарий<textarea name="comment" rows="3" placeholder="Например, без лука"></textarea></label><div class="form-actions"><button class="back-button" type="button" data-action="back">← Назад</button><button class="primary-button" type="submit">Заказать · ${rubles(total())}</button></div><p class="demo-note">Это демонстрация: заказ не передаётся ресторану, оплата не списывается. Для настоящего заказа позвоните по номеру на сайте.</p></form>`;
    const form = $('form', content);
    const address = form.elements.address;
    form.addEventListener('change', () => { const delivery = form.elements.type.value === 'delivery'; $('#address-field').hidden = !delivery; address.disabled = !delivery; address.required = delivery; });
    form.addEventListener('input', event => event.target.setCustomValidity?.(''));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = form.elements.name;
      const phone = form.elements.phone;
      name.setCustomValidity(name.value.trim() ? '' : 'Введите имя');
      phone.setCustomValidity(/^[+\d\s()-]+$/.test(phone.value) && phone.value.replace(/\D/g, '').length >= 10 && phone.value.replace(/\D/g, '').length <= 15 ? '' : 'Введите корректный номер телефона');
      address.setCustomValidity(address.disabled || address.value.trim() ? '' : 'Введите адрес');
      if (!form.reportValidity()) return;
      const submit = $('button[type="submit"]', form); submit.disabled = true; submit.textContent = 'Оформляем…'; form.setAttribute('aria-busy', 'true');
      submitTimer = setTimeout(() => {
        cart = {}; save(); heading('Готово', 'Демонстрация завершена');
        content.innerHTML = '<div class="success-state"><span aria-hidden="true">✓</span><h3>Всё получилось!</h3><p>Вы прошли оформление заказа. Это демонстрация: данные не отправлены ресторану, деньги не списаны.</p><button class="primary-button" type="button" data-action="close">Готово</button></div>';
        $('button', content).focus();
      }, 650);
    });
    form.elements.name.focus();
  }
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), { threshold:0.1 });
    document.documentElement.classList.add('motion-enabled');
    $$('[data-reveal]').forEach(node => observer.observe(node));
  }
  let frame = 0;
  const progress = $('.page-progress');
  function updateProgress() { frame = 0; progress.style.transform = `scaleX(${Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))})`; }
  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(updateProgress); }, { passive:true });
  updateProgress(); save();
})();
