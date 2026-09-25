/* Studio portfolio — router, page templates and interactions. No dependencies. */
(() => {
  'use strict';

  /* ───────────────────────── helpers ───────────────────────── */
  const S = window.STUDIO || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const canVT = typeof document.startViewTransition === 'function' && !reduced;
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  };
  const projectsLabel = (n) => `${pad(n)} ${n === 1 ? 'PROJECT' : 'PROJECTS'}`;

  /* ───────────────────────── data ───────────────────────── */
  const ALL = window.PROJECTS || [];
  const CATS = (window.CATEGORIES || [])
    .map((c) => ({ ...c, projects: ALL.filter((p) => p.cat === c.id) }))
    .filter((c) => c.projects.length > 0);
  CATS.forEach((c, i) => { c.num = pad(i + 1); });
  const catById = Object.fromEntries(CATS.map((c) => [c.id, c]));
  const ORDER = CATS.flatMap((c) => c.projects);
  const full = (p, f) => `assets/work/${p.id}/${f}`;
  const thumb = (p, f) => `assets/thumbs/${p.id}/${f}`;
  const nextOf = (p) => ORDER[(ORDER.indexOf(p) + 1) % ORDER.length];

  /* word splitting for reveals */
  let wordIndex = 0;
  const words = (text, reset = false) => {
    if (reset) wordIndex = 0;
    return String(text).split(' ').map((w) => `<span class="w"><span style="--i:${wordIndex++}">${esc(w)}</span></span>`).join(' ');
  };
  const lines = (arr, cls = '') => {
    wordIndex = 0;
    return arr.map((l, i) => `<span class="line${i === 0 && cls ? ' ' + cls : ''}">${words(l)}</span>`).join('');
  };

  /* ───────────────────────── shared templates ───────────────────────── */
  const arrow = '<span class="btn-arrow" aria-hidden="true">→</span>';

  function folder(c, i) {
    const shots = c.projects.slice(0, 3);
    const names = c.projects.map((p) => p.title).join(', ');
    return `
    <a class="folder" href="#/work/${c.id}" data-cat="${c.id}" data-cursor="Открыть" style="--tint:${c.tint};--fi:${i}"
       aria-label="${esc(c.name)} — ${esc(c.ru)}, ${c.projects.length} ${plural(c.projects.length, 'проект', 'проекта', 'проектов')}">
      <div class="folder-body">
        <div class="folder-back"><span class="folder-tab">${c.num}</span></div>
        <div class="folder-sheets">
          ${shots.map((p, k) => `<figure class="sheet" data-k="${k}" data-vt="shot-${p.id}" style="--k:${k}"><img src="${thumb(p, p.cover)}" alt="" decoding="async"></figure>`).reverse().join('')}
        </div>
        <div class="folder-front" data-vt="panel-${c.id}">
          <div class="ff-top"><span>${projectsLabel(c.projects.length)}</span></div>
          <div>
            <h3 class="ff-name">${esc(c.name)}</h3>
            <p class="ff-ru">${esc(c.ru)}</p>
          </div>
          <div class="ff-bottom">
            <p class="ff-list">${esc(names)}</p>
            <span class="ff-arrow" aria-hidden="true"><i>→</i><i>→</i></span>
          </div>
        </div>
      </div>
    </a>`;
  }

  const folders = (compact = false) => `
    <div class="folders${compact ? ' folders--compact' : ''}" style="--n:${CATS.length <= 4 ? CATS.length : 3}">
      ${CATS.map(folder).join('')}
    </div>`;

  /* card layouts: sizes and offsets make the grid asymmetric */
  const SHIFT_L = 'clamp(40px, 9vw, 150px)';
  const SHIFT_M = 'clamp(30px, 6vw, 100px)';
  function layoutFor(i, n) {
    if (n === 1) return { span: 12, ratio: '21 / 10' };
    if (n === 2) return [{ span: 7, ratio: '16 / 10' }, { span: 5, ratio: '4 / 5', portrait: true, shift: SHIFT_L }][i];
    if (n === 3) return [{ span: 12, ratio: '21 / 9' }, { span: 5, ratio: '4 / 5', portrait: true }, { span: 7, ratio: '16 / 10', shift: SHIFT_M }][i];
    const cycle = [
      { span: 7, ratio: '16 / 10' },
      { span: 5, ratio: '4 / 5', portrait: true, shift: SHIFT_L },
      { span: 5, ratio: '4 / 5', portrait: true },
      { span: 7, ratio: '16 / 10', shift: SHIFT_M },
    ];
    const L = cycle[i % 4];
    if (i === n - 1 && i % 2 === 0) return { span: 12, ratio: '21 / 9' };
    return L;
  }
  function cardVars(p, L) {
    const src = L.portrait && p.portrait ? p.portrait : p.cover;
    const pos = L.portrait && !p.portrait ? (p.portraitPos || '6% 0%') : '50% 0%';
    return { src, style: `--span:${L.span};--ratio:${L.ratio};--shift:${L.shift || '0px'};--tint:${p.tint};--pos:${pos}` };
  }
  function card(p, L) {
    const c = catById[p.cat];
    const v = cardVars(p, L);
    return `
    <a class="card" href="#/work/${p.cat}/${p.id}" data-id="${p.id}" data-cat="${p.cat}" data-cursor="Открыть" style="${v.style}">
      <div class="card-media rv-img" data-reveal data-vt="shot-${p.id}">
        <div class="rv-scale"><div class="card-img"><img src="${thumb(p, v.src)}" alt="${esc(p.title)}: ${esc(p.kind)}" loading="lazy" decoding="async"></div></div>
        <div class="card-veil"></div>
        <div class="card-over"><span class="card-cat">${esc(c.ru)}</span><span class="card-arrow" aria-hidden="true">→</span></div>
      </div>
      <div class="card-cap rv-up" data-reveal style="--d:120ms">
        <h3 class="card-title">${esc(p.title)}</h3><span class="card-year">${p.year}</span>
        <p class="card-kind">${esc(p.kind)}</p>
      </div>
    </a>`;
  }

  const PRINCIPLES = [
    ['Показываем до договора', 'Концепт собираем на реальных данных компании: отзывах, ценах, адресах. Сначала вы видите сайт, потом решаете.', ['dobrovet', 'goldskin', 'starker']],
    ['Ключи — только на сервере', 'Виджеты обращаются к СДЭК, DaData и ABCP через наш сервер. Посетитель сайта не увидит ни одного ключа доступа.', ['tilda-widgets', 'autoparts']],
    ['Сначала данные', 'Прежде чем рисовать, читаем отзывы и считаем рынок. Главная жалоба клиентов становится главным экраном.', ['goldskin', 'market-research']],
  ];
  const byId = Object.fromEntries(ALL.map((p) => [p.id, p]));
  const principles = () => `
    <div class="principles">
      ${PRINCIPLES.map(([t, d, ids], i) => `
        <article class="principle rv-up" data-reveal style="--d:${i * 120}ms">
          <h3>${esc(t)}</h3><p>${esc(d)}</p>
          <div class="links">${ids.filter((id) => byId[id] && catById[byId[id].cat]).map((id) => `<a class="chip" href="#/work/${byId[id].cat}/${id}">${esc(byId[id].title)}</a>`).join('')}</div>
        </article>`).join('')}
    </div>`;

  const cta = () => `
    <section class="cta" data-cta>
      <div class="cta-glow" aria-hidden="true"></div>
      <div class="cta-rings" aria-hidden="true">${[360, 640, 940, 1260].map((r) => `<i style="--r:${r}"></i>`).join('')}</div>
      <div class="wrap">
        <p class="cta-kicker rv-up" data-reveal>What’s next?</p>
        <h2 class="display cta-title" data-reveal data-fit>${lines(["LET’S BUILD", 'SOMETHING GREAT.'], 'thin')}</h2>
        <div class="cta-row">
          <p class="lead rv-up" data-reveal style="--d:200ms">Есть идея? Давайте превратим её в цифровой продукт.</p>
          <a class="btn btn--solid magnetic rv-up" data-reveal style="--d:320ms" href="#/contact"><span>Обсудить проект ${arrow}</span></a>
        </div>
      </div>
    </section>`;

  const footer = () => `
    <footer class="footer">
      <div class="wrap footer-in">
        <span>© ${new Date().getFullYear()} ${esc(S.name || 'Studio')}${S.city ? ', ' + esc(S.city) : ''}</span>
        <nav aria-label="Навигация в подвале"><a href="#/work">Work</a><a href="#/about">About</a><a href="#/contact">Contact</a></nav>
        <button class="to-top" type="button" data-top>Наверх <span aria-hidden="true">↑</span></button>
      </div>
    </footer>`;

  /* ───────────────────────── pages ───────────────────────── */
  function pageHome() {
    const cats = CATS.length;
    return `
    <div class="page page--home">
      <section class="hero wrap" data-hero>
        <div class="hero-floor" aria-hidden="true"></div>
        <div class="hero-spot" aria-hidden="true"></div>
        <div class="hero-top">
          <h1 class="display hero-title" data-reveal data-fit>${lines(['WE BUILD', 'DIGITAL', 'EXPERIENCES.'], 'thin')}</h1>
          <div class="hero-aside">
            <p class="lead rv-up" data-reveal style="--d:420ms">Наши проекты — сайты, интерфейсы, программные продукты и визуальные решения.</p>
            <p class="hero-meta rv-up" data-reveal style="--d:560ms">
              <span><b>${ALL.length}</b> ${plural(ALL.length, 'проект', 'проекта', 'проектов')}</span>
              <span><b>${cats}</b> ${plural(cats, 'направление', 'направления', 'направлений')}</span>
              ${S.city ? `<span>${esc(S.city)}</span>` : ''}
            </p>
          </div>
        </div>
        <div class="hero-folders">${folders()}</div>
      </section>

      <section class="section wrap">
        <div class="section-head">
          <h2 class="section-title" data-reveal>${lines(['ALL PROJECTS'])}</h2>
          <a class="back rv-up" data-reveal href="#/work">Смотреть сеткой <span class="back-arrow" aria-hidden="true">→</span></a>
        </div>
        <div class="index-list" data-index>
          ${ORDER.map((p, i) => `
            <a class="index-row" href="#/work/${p.cat}/${p.id}" data-id="${p.id}" style="--tint:${p.tint}">
              <span class="ir-thumb"><img src="${thumb(p, p.cover)}" alt="" loading="lazy" decoding="async"></span>
              <span class="ir-num">${pad(i + 1)}</span>
              <span class="ir-title">${esc(p.title)}</span>
              <span class="ir-kind">${esc(p.kind)}</span>
              <span class="ir-cat">${esc(catById[p.cat].name)}</span>
              <span class="ir-year">${p.year}</span>
              <span class="ir-go" aria-hidden="true">↗</span>
            </a>`).join('')}
        </div>
      </section>

      <section class="section wrap" style="padding-top:0">
        <div class="section-head"><h2 class="section-title" data-reveal>${lines(['HOW WE WORK'])}</h2></div>
        ${principles()}
      </section>
      ${cta()}
      ${footer()}
    </div>`;
  }

  function pageWork() {
    return `
    <div class="page">
      <section class="wrap page-head">
        <h1 class="display page-title" data-reveal>${lines(['WORK'])}</h1>
        <div class="page-head-row">
          <p class="lead rv-up" data-reveal style="--d:200ms">${ALL.length} ${plural(ALL.length, 'проект', 'проекта', 'проектов')} в ${CATS.length} ${plural(CATS.length, 'направлении', 'направлениях', 'направлениях')}. Откройте папку или отфильтруйте сетку.</p>
        </div>
      </section>
      <section class="wrap">${folders(true)}</section>
      <section class="wrap section">
        <div class="filters rv-up" data-reveal role="group" aria-label="Фильтр по направлению">
          <button class="chip" type="button" aria-pressed="true" data-filter="all">Все <sup>${ALL.length}</sup></button>
          ${CATS.map((c) => `<button class="chip" type="button" aria-pressed="false" data-filter="${c.id}">${esc(c.ru)} <sup>${c.projects.length}</sup></button>`).join('')}
        </div>
        <div class="grid" data-grid style="padding-top:0">
          ${ORDER.map((p, i) => card(p, layoutFor(i, ORDER.length))).join('')}
        </div>
      </section>
      ${cta()}
      ${footer()}
    </div>`;
  }

  function pageCategory(c) {
    const i = CATS.indexOf(c);
    const n = CATS[(i + 1) % CATS.length];
    return `
    <div class="page" style="--tint:${c.tint}">
      <section class="wrap">
        <div class="cat-panel" data-vt="panel-${c.id}">
          <div class="cat-panel-top">
            <a class="back" href="#/work"><span class="back-arrow" aria-hidden="true">←</span> All projects</a>
            <span class="ff-num">${c.num} / ${pad(CATS.length)}</span>
          </div>
          <h1 class="display cat-title" data-reveal data-fit>${lines(c.title, 'thin')}</h1>
          <div class="cat-panel-bottom">
            <p class="lead rv-up" data-reveal style="--d:250ms">${esc(c.lead)}</p>
            <span class="cat-count rv-up" data-reveal style="--d:350ms">${projectsLabel(c.projects.length)}</span>
          </div>
        </div>
        <div class="grid">
          ${c.projects.map((p, k) => card(p, layoutFor(k, c.projects.length))).join('')}
        </div>
      </section>
      ${n && n !== c ? `
      <section class="wrap">
        <a class="next-cat" href="#/work/${n.id}" data-cursor="Открыть" style="--tint:${n.tint}">
          <p class="next-cat-label">Следующая папка — ${n.num}</p>
          <div class="next-cat-row">
            <h2 class="display next-cat-title" data-fit>${esc(n.name)}</h2>
            <div class="next-cat-strip" aria-hidden="true">${n.projects.slice(0, 3).map((p) => `<span><img src="${thumb(p, p.cover)}" alt="" loading="lazy"></span>`).join('')}</div>
          </div>
        </a>
      </section>` : ''}
      ${cta()}
      ${footer()}
    </div>`;
  }

  function frame(p, file, opts = {}) {
    const url = p.live && /^https?:/.test(p.live) ? (p.liveLabel || p.live) : p.title;
    const vt = opts.hero ? ` data-vt="shot-${p.id}"` : '';
    const img = `<img src="${full(p, file)}" alt="${esc(p.title)}: ${esc(opts.alt || 'экран')}" ${opts.hero ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
    return `
      <div class="frame${opts.plain ? ' frame--plain' : ''}${opts.contain ? ' frame--contain' : ''}"${opts.bg ? ` style="--hero-bg:${opts.bg}"` : ''}>
        ${opts.plain ? '' : `<div class="frame-bar" aria-hidden="true"><span class="frame-dots"><i></i><i></i><i></i></span><span class="frame-url">${esc(url)}</span></div>`}
        <div class="frame-shot"${vt}>${opts.hero ? `<div class="par" data-speed="-0.06">${img}</div>` : img}</div>
      </div>`;
  }

  function galleryBlock(p, b) {
    const cap = b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : '';
    switch (b.type) {
      case 'frame':
        return `<figure class="g-block rv-up" data-reveal>${frame(p, b.src, { alt: b.caption })}${cap}</figure>`;
      case 'pair':
        return `<figure class="g-block"><div class="g-pair">${b.items.map((f, i) => `<div class="rv-up" data-reveal style="--d:${i * 120}ms">${frame(p, f, { alt: b.caption })}</div>`).join('')}</div>${cap}</figure>`;
      case 'bleed':
        return `<figure class="g-block g-bleed"><div class="bleed-in" style="--bg:${b.bg || '#111'}"><img class="rv-up" data-reveal src="${full(p, b.src)}" alt="${esc(p.title)}: ${esc(b.caption || '')}" loading="lazy" decoding="async"></div>${cap}</figure>`;
      case 'phones':
        return `<figure class="g-block g-bleed"><div class="phones" style="--bg:${b.bg || '#111'}">${b.items.map((f, i) => `<div class="phone rv-up" data-reveal style="--d:${i * 120}ms"><img src="${full(p, f)}" alt="${esc(p.title)}: мобильный экран ${i + 1}" loading="lazy" decoding="async"></div>`).join('')}</div>${cap}</figure>`;
      case 'ui':
        return `<figure class="g-block"><div class="g-ui">${b.items.map((f, i) => `<div class="ui-card rv-up${/mobile/.test(f) ? ' ui-card--narrow' : ''}" data-reveal style="--d:${i * 120}ms${b.items.length === 1 ? ';--mw:1100px' : ''}"><img src="${full(p, f)}" alt="${esc(p.title)}: ${esc(b.caption || 'интерфейс')}" loading="lazy" decoding="async"></div>`).join('')}</div>${cap}</figure>`;
      case 'module':
        return MODULES[b.module] ? MODULES[b.module](p) : '';
      default:
        return '';
    }
  }

  function pageProject(c, p) {
    const n = nextOf(p);
    const idx = c.projects.indexOf(p) + 1;
    return `
    <article class="page case" style="--tint:${p.tint}">
      <header class="wrap case-head">
        <div class="crumbs">
          <a class="back" href="#/work/${c.id}"><span class="back-arrow" aria-hidden="true">←</span> ${esc(c.name)}</a>
          <span class="crumbs-path"><a href="#/work">Work</a> / <a href="#/work/${c.id}">${esc(c.ru)}</a> / ${pad(idx)} из ${pad(c.projects.length)}</span>
        </div>
        <h1 class="display case-title" data-reveal data-fit>${lines([p.title.toUpperCase()])}</h1>
        <p class="case-kind rv-up" data-reveal style="--d:200ms">${esc(p.kind)}</p>
        <div class="case-intro">
          <p class="case-summary rv-up" data-reveal style="--d:300ms">${esc(p.summary)}</p>
          <div class="rv-up" data-reveal style="--d:420ms">
            <dl class="facts">
              ${[['Категория', c.ru], ['Год', p.year], ...p.facts.filter(([k]) => k !== 'Год')].map(([k, v]) => `<div class="fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
            </dl>
            ${p.live ? `<div class="case-actions"><a class="btn btn--solid magnetic" href="${esc(p.live)}" target="_blank" rel="noopener"><span>${/^https?:/.test(p.live) ? 'Открыть сайт' : esc(p.liveLabel || 'Открыть')} <span class="btn-arrow" aria-hidden="true">↗</span></span></a></div>` : ''}
          </div>
        </div>
      </header>

      <section class="wrap case-hero rv-up" data-reveal style="--d:250ms">${p.heroModule
        ? `<div data-vt="shot-${p.id}">${MODULES[p.heroModule](p)}</div>`
        : frame(p, p.cover, { hero: true, alt: 'главный экран', plain: p.frame === false, contain: p.heroFit === 'contain', bg: p.heroBg })}</section>

      <section class="wrap section">
        <div class="features">
          <div class="features-side"><h2 class="section-title" data-reveal>${lines(['WHAT', 'WE DID'])}</h2></div>
          <div>${p.features.map(([t, d], i) => `<div class="feature rv-up" data-reveal style="--d:${i * 90}ms"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div>
        </div>
      </section>

      <section class="wrap" style="padding-bottom:clamp(70px,10vw,150px)">
        <div class="gallery">${p.gallery.filter((b) => !(b.type === 'module' && b.module === p.heroModule)).map((b) => galleryBlock(p, b)).join('')}</div>
        ${p.note ? `<p class="case-note">${esc(p.note)}</p>` : ''}
      </section>

      <a class="next-proj wrap" href="#/work/${n.cat}/${n.id}" data-cursor="Далее" style="--tint:${n.tint}">
        <div>
          <p class="next-cat-label">Следующий проект</p>
          <h2 class="display next-proj-title" data-fit>${esc(n.title)}</h2>
          <p class="muted" style="margin-top:14px">${esc(n.kind)}</p>
        </div>
        <div class="next-proj-media" data-vt="shot-${n.id}"><img src="${thumb(n, n.cover)}" alt="" loading="lazy" decoding="async"></div>
      </a>
      ${cta()}
      ${footer()}
    </article>`;
  }

  const CAPS = [
    ['Сайты', ['Концепт на реальных данных компании', 'Адаптив под телефон', 'Онлайн-запись и заявки', 'Калькуляторы и интерактивные блоки']],
    ['Виджеты и интеграции', ['СДЭК: расчёт, отслеживание, пункты выдачи', 'DaData: реквизиты по ИНН', 'ABCP: цены, наличие и аналоги', 'Встраивание в Tilda и ABCP']],
    ['Боты и серверы', ['Telegram-боты на aiogram', 'Уведомления и статусы заявок', 'Backend на Java и Node.js', 'Кэш в Redis']],
    ['Аналитика', ['Сбор и очистка данных', 'Модели оценки', 'Интерактивные отчёты', 'Инфографика и схемы']],
  ];
  const STACK = ['HTML', 'CSS', 'JavaScript', 'Canvas', 'Java 21', 'Spring Boot', 'Redis', 'Node.js', 'Python', 'aiogram', 'SQLite', 'Docker', 'Yandex Cloud Functions', 'Leaflet', 'OpenStreetMap', 'API СДЭК', 'DaData', 'ABCP'];

  function pageAbout() {
    return `
    <div class="page">
      <section class="wrap about-hero">
        <h1 class="display about-title" data-reveal data-fit>${lines(['NO TEMPLATES.', 'REAL CODE.'], 'thin')}</h1>
        <div class="about-lead">
          <p class="rv-up" data-reveal style="--d:300ms">Делаем сайты, виджеты, ботов и аналитику для бизнеса. Код пишем сами, без конструкторов, и показываем концепт до договора.</p>
          <p class="about-count rv-up" data-reveal style="--d:420ms"><b>${ALL.length}</b> ${plural(ALL.length, 'проект', 'проекта', 'проектов')} в <b>${CATS.length}</b> ${plural(CATS.length, 'направлении', 'направлениях', 'направлениях')}: ${CATS.map((c) => esc(c.ru.toLowerCase())).join(', ')}.</p>
        </div>
      </section>
      <section class="section wrap">
        <div class="section-head"><h2 class="section-title" data-reveal>${lines(['HOW WE WORK'])}</h2></div>
        ${principles()}
      </section>
      <section class="section wrap" style="padding-top:0">
        <div class="section-head"><h2 class="section-title" data-reveal>${lines(['WHAT WE DO'])}</h2></div>
        <div class="caps">${CAPS.map(([t, items], i) => `<div class="cap rv-up" data-reveal style="--d:${i * 100}ms"><h3>${esc(t)}</h3><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
      </section>
      <section class="section wrap" style="padding-top:0">
        <div class="section-head"><h2 class="section-title" data-reveal>${lines(['STACK'])}</h2></div>
        <div class="stack rv-up" data-reveal>${STACK.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
      </section>
      ${cta()}
      ${footer()}
    </div>`;
  }

  function channels() {
    const list = [];
    if (S.telegram) list.push(['Telegram', S.telegram, S.telegram.replace(/^https?:\/\/t\.me\//, '@')]);
    if (S.email) list.push(['Почта', 'mailto:' + S.email, S.email]);
    if (S.phone) list.push(['Телефон', 'tel:' + S.phone.replace(/[^\d+]/g, ''), S.phone]);
    return list;
  }

  function pageContact() {
    const ch = channels();
    return `
    <div class="page">
      <section class="wrap contact">
        <h1 class="display page-title" data-reveal>${lines(['LET’S', 'TALK.'], 'thin')}</h1>
        <div class="contact-grid">
          <form class="form rv-up" data-reveal data-form novalidate>
            <div class="field"><label for="f-name">Как вас зовут</label><input id="f-name" name="name" autocomplete="name" required></div>
            <div class="field"><label for="f-contact">Как с вами связаться</label><input id="f-contact" name="contact" placeholder="Телефон, Telegram или почта" required></div>
            <fieldset class="field"><legend>Что нужно</legend>
              <div class="chips">${['Сайт', 'Виджет или интеграция', 'Telegram-бот', 'Аналитика', 'Другое'].map((t) => `<button type="button" class="chip" aria-pressed="false">${t}</button>`).join('')}</div>
            </fieldset>
            <div class="field"><label for="f-msg">Расскажите об идее</label><textarea id="f-msg" name="message" placeholder="Пара предложений о задаче и сроках"></textarea></div>
            <div><button class="btn btn--solid magnetic" type="submit"><span>Отправить заявку ${arrow}</span></button></div>
            <p class="form-note" data-note role="status" aria-live="polite"></p>
          </form>
          <aside class="contact-aside rv-up" data-reveal style="--d:200ms">
            <p>Ответим, уточним задачу и, если нужно, соберём концепт на ваших данных до договора.</p>
            ${ch.length ? `<div class="channels" style="margin-top:32px">${ch.map(([k, href, label]) => `<a class="channel" href="${esc(href)}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ''}><span>${esc(label)}</span><small>${k}</small></a>`).join('')}</div>` : ''}
          </aside>
        </div>
      </section>
      ${footer()}
    </div>`;
  }

  const page404 = () => `
    <div class="page"><section class="wrap empty">
      <h1 class="display page-title" data-reveal>${lines(['404'])}</h1>
      <p class="lead rv-up" data-reveal style="margin:24px auto 36px">Такой страницы нет. Все проекты — в разделе Work.</p>
      <a class="btn btn--solid magnetic" href="#/work"><span>Открыть Work ${arrow}</span></a>
    </section>${footer()}</div>`;

  /* ───────────────────────── modules ───────────────────────── */
  const MODULES = {
    autoparts: (p) => `
      <div class="module rv-up" data-reveal style="--tint:${p.tint}">
        <div class="module-head"><h3 class="module-title">Как устроено</h3><p class="muted">Браузер обращается только к нашему backend</p></div>
        <div class="arch">
          <div class="arch-col"><h4>Сайт магазина · ABCP</h4>
            <div class="arch-box arch-box--hl"><code>autoparts-widgets.js</code><small>vin, catalog, oem</small><span class="arch-flow"></span></div>
            <div class="arch-box">Shadow DOM<small>стили магазина не ломаются</small></div>
          </div>
          <div class="arch-col"><h4>Backend · Spring Boot</h4>
            <div class="arch-box arch-box--hl"><code>/api/v1/*</code><small>PartsController</small><span class="arch-flow"></span></div>
            <div class="arch-box">PartsLookupService<small>кэширует ответы</small></div>
            <div class="arch-box">VehicleCatalog, CrossReferenceService<small>поставщики за интерфейсами</small></div>
          </div>
          <div class="arch-col"><h4>Поставщики</h4>
            <div class="arch-box">ABCP API<small>цены, наличие, кроссы</small></div>
            <div class="arch-box arch-box--dim">Laximo.OEM<small>VIN и узлы — следующий этап</small></div>
          </div>
          <div class="arch-cache">Кэш в Redis: <span class="ttl">справочники <b>7 дней</b></span><span class="ttl">VIN <b>сутки</b></span><span class="ttl">цены <b>15 минут</b></span></div>
        </div>
      </div>`,

    niches: (p) => {
      const N = (window.NICHES || []).map((x) => ({ ...x, share: x.total ? x.noSite / x.total : 0 }));
      const total = N.reduce((s, x) => s + x.total, 0);
      const no = N.reduce((s, x) => s + x.noSite, 0);
      const sorted = [...N].sort((a, b) => b.share - a.share);
      return `
      <div class="module" style="--tint:${p.tint}" data-niches>
        <div class="module-head">
          <div class="niche-facts">
            <span><b>${total}</b>${plural(total, 'компания', 'компании', 'компаний')}</span>
            <span class="hot"><b>${no}</b>без своего сайта</span>
            <span><b>${Math.round((no / total) * 100)}%</b>от всех</span>
          </div>
          <div class="niche-sort" role="group" aria-label="Сортировка">
            <button class="chip" type="button" aria-pressed="true" data-sort="share">По доле</button>
            <button class="chip" type="button" aria-pressed="false" data-sort="count">По числу</button>
          </div>
        </div>
        <div class="niches rv-fade" data-reveal>
          ${sorted.map((x, i) => `
            <div class="niche" data-share="${x.share}" data-count="${x.noSite}" style="--i:${i}">
              <span class="niche-name">${esc(x.name)}</span>
              <span class="niche-bar"><i style="--w:${(x.share * 100).toFixed(1)}%"></i></span>
              <span class="niche-val"><b>${Math.round(x.share * 100)}%</b> · ${x.noSite} из ${x.total}</span>
            </div>`).join('')}
        </div>
      </div>`;
    },

    bot: () => `
      <div class="module" data-bot>
        <div class="module-head"><h3 class="module-title">Заявка глазами клиента и администратора</h3>
          <button class="chip" type="button" data-bot-replay>Повторить диалог ↺</button></div>
        <div class="bot">
          ${['client', 'admin'].map((who) => `
          <div class="bot-side">
            <div class="bot-label"><span>${who === 'client' ? 'Клиент' : 'Администратор'}</span><span>Telegram</span></div>
            <div class="tg">
              <div class="tg-top"><span class="tg-ava" aria-hidden="true">Б</span><span><span class="tg-name">Бот заявок</span><br><span class="tg-status">бот</span></span></div>
              <div class="tg-feed" data-feed="${who}" aria-live="off"></div>
              <div class="tg-kb" data-kb="${who}"></div>
            </div>
          </div>`).join('')}
        </div>
      </div>`,
  };

  /* bot dialogue: texts and buttons as written in the bot's code */
  const KB_MAIN = [['🛒 Сделать заказ', '📝 Оставить заявку'], ['📋 Мои заявки']];
  const CARD = '👤 Имя: Анна\n📞 Телефон: +7 900 123-45-67\n💬 Хочу узнать сроки и стоимость';
  const BOT_SCRIPT = [
    { to: 'client', me: true, text: '/start' },
    { to: 'client', text: 'Здравствуйте, Анна! 👋\n\nЗдесь можно оформить заказ или оставить заявку: мы сразу её получим и свяжемся с вами.\n\nВыберите действие в меню ниже 👇', kb: KB_MAIN },
    { to: 'client', me: true, text: '📝 Оставить заявку' },
    { to: 'client', text: 'Как к вам обращаться?', kb: [['❌ Отмена']] },
    { to: 'client', me: true, text: 'Анна' },
    { to: 'client', text: 'Оставьте номер телефона: нажмите кнопку ниже или напишите его вручную.', kb: [['📱 Отправить мой номер'], ['❌ Отмена']] },
    { to: 'client', me: true, text: '+7 900 123-45-67' },
    { to: 'client', text: 'Опишите ваш вопрос или задачу.', kb: [['❌ Отмена']] },
    { to: 'client', me: true, text: 'Хочу узнать сроки и стоимость' },
    { to: 'client', text: `Проверьте, всё ли верно:\n\n<b>📝 Заявка</b>\n\n${CARD}`, inline: [['✅ Отправить'], ['✏️ Заполнить заново'], ['❌ Отмена']] },
    { to: 'client', text: '✅ Отправлено! Номер обращения: <b>№12</b>.\nМы свяжемся с вами в ближайшее время.\n\nСтатус можно посмотреть в разделе «📋 Мои заявки».', kb: KB_MAIN, clearInline: true },
    { to: 'admin', text: `🔔 <b>Новое обращение!</b>\n\n<b>📝 Заявка №12</b>\nСтатус: 🆕 Новая\n\n${CARD}\n\n🆔 Клиент: @anna\n🕒 Создана: 2026-09-25 14:05`, inline: [['✅ Принята', '🔧 В работе'], ['🏁 Выполнена', '❌ Отклонена']] },
    { to: 'admin', edit: true, text: `<b>📝 Заявка №12</b>\nСтатус: ✅ Принята\n\n${CARD}\n\n🆔 Клиент: @anna\n🕒 Создана: 2026-09-25 14:05`, inline: [['🆕 Новая', '🔧 В работе'], ['🏁 Выполнена', '❌ Отклонена']] },
    { to: 'client', text: '📝 Заявка №12\nСтатус изменён: <b>✅ Принята</b>' },
  ];

  /* ───────────────────────── router ───────────────────────── */
  const view = $('#view');
  const nav = $('#nav');
  let current = null;
  let cleanups = [];
  const scrollMemo = {};
  let firstRender = true;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function parse(hash) {
    const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'work') {
      if (!parts[1]) return { name: 'work' };
      const c = catById[parts[1]];
      if (!c) return { name: '404' };
      if (!parts[2]) return { name: 'category', c };
      const p = c.projects.find((x) => x.id === parts[2]);
      return p ? { name: 'project', c, p } : { name: '404' };
    }
    if (parts[0] === 'about') return { name: 'about' };
    if (parts[0] === 'contact') return { name: 'contact' };
    return { name: '404' };
  }

  function render() {
    const r = parse(location.hash);
    cleanups.forEach((fn) => fn());
    cleanups = [];
    const brand = S.name || 'Studio';
    let html = '';
    let title = `${brand} — сайты, программные продукты и аналитика`;
    let tint = '#FF7A3D';
    switch (r.name) {
      case 'home': html = pageHome(); break;
      case 'work': html = pageWork(); title = `Work — ${brand}`; break;
      case 'category': html = pageCategory(r.c); title = `${r.c.name} — ${brand}`; tint = r.c.tint; break;
      case 'project': html = pageProject(r.c, r.p); title = `${r.p.title} — ${brand}`; tint = r.p.tint; break;
      case 'about': html = pageAbout(); title = `About — ${brand}`; break;
      case 'contact': html = pageContact(); title = `Contact — ${brand}`; break;
      default: html = page404(); title = `404 — ${brand}`;
    }
    view.innerHTML = html;
    document.title = title;
    document.body.style.setProperty('--page-tint', tint);
    current = r;
    updateNav(r);
    fitTitles(view);
    initPage(r);
    return r;
  }

  /* big display words must never overflow: shrink until the longest word fits */
  function fitTitles(root) {
    $$('[data-fit]', root).forEach((el) => {
      el.style.fontSize = '';
      let fs = parseFloat(getComputedStyle(el).fontSize);
      let guard = 0;
      while (el.scrollWidth > el.clientWidth + 1 && guard++ < 40) {
        fs *= 0.96;
        el.style.fontSize = `${fs}px`;
      }
    });
  }
  let fitTimer;
  addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => fitTitles(view), 120); });

  /* names for shared-element morphs */
  function collectMorph(fromEl) {
    const list = [];
    const add = (el, name, cls) => { if (el && name && !list.some((m) => m[1] === name)) list.push([el, name, cls]); };
    if (current && current.name === 'project') add($('.case-hero [data-vt]'), `shot-${current.p.id}`, 'shot');
    if (current && current.name === 'category') add($('.cat-panel'), `panel-${current.c.id}`, 'panel');
    if (fromEl) {
      if (fromEl.matches('.folder')) {
        add($('.folder-front', fromEl), `panel-${fromEl.dataset.cat}`, 'panel');
        $$('.sheet', fromEl).forEach((s) => add(s, s.dataset.vt, 'shot'));
      } else if (fromEl.matches('.card')) {
        add($('.card-media', fromEl), `shot-${fromEl.dataset.id}`, 'shot');
      } else if (fromEl.matches('.next-proj')) {
        const m = $('.next-proj-media', fromEl);
        add(m, m.dataset.vt, 'shot');
      }
    }
    return list;
  }
  const setName = (el, name, cls) => {
    el.style.viewTransitionName = name;
    if (cls) el.style.setProperty('view-transition-class', cls);
  };
  const clearNames = () => $$('[style*="view-transition-name"]').forEach((el) => {
    el.style.viewTransitionName = '';
    el.style.removeProperty('view-transition-class');
  });

  async function navigate(href, fromEl, isPop = false) {
    const target = href || '#/';
    if (current) scrollMemo[currentHash] = scrollY;
    const morph = canVT ? collectMorph(fromEl) : [];
    const update = () => {
      if (!isPop) history.pushState(null, '', target);
      currentHash = location.hash || '#/';
      render();
      window.scrollTo(0, isPop ? (scrollMemo[currentHash] || 0) : 0);
      morph.forEach(([, name, cls]) => {
        const el = $(`#view .card [data-vt="${name}"]`) || $(`#view [data-vt="${name}"]`);
        if (!el) return;
        setName(el, name, cls);
        el.classList.add('is-in');
        el.closest('[data-reveal]')?.classList.add('is-in');
        el.closest('.folder')?.classList.add('is-open');
      });
    };

    if (canVT) {
      morph.forEach(([el, name, cls]) => setName(el, name, cls));
      const t = document.startViewTransition(update);
      try { await t.finished; } catch (e) { /* skipped */ }
      clearNames();
      $$('.folder.is-open').forEach((f) => { if (!f.matches(':hover')) f.classList.remove('is-open'); });
    } else if (!reduced) {
      const curtain = $('.curtain');
      curtain.classList.add('is-on');
      await new Promise((r) => setTimeout(r, 380));
      update();
      requestAnimationFrame(() => curtain.classList.remove('is-on'));
    } else {
      update();
    }
    view.focus({ preventScroll: true });
  }
  let currentHash = location.hash || '#/';

  document.addEventListener('click', (e) => {
    const top = e.target.closest('[data-top]');
    if (top) { window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); return; }
    const a = e.target.closest('a[href^="#/"], a[href="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    if (href === (location.hash || '#/')) { window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); return; }
    navigate(href, a);
  });
  window.addEventListener('popstate', () => {
    if ((location.hash || '#/') === currentHash) return;
    navigate(location.hash, null, true);
  });

  /* ───────────────────────── nav ───────────────────────── */
  function updateNav(r) {
    const key = r.name === 'category' || r.name === 'project' ? 'work' : r.name;
    let active = null;
    $$('.nav-links a').forEach((a) => {
      const on = a.dataset.nav === key;
      a.toggleAttribute('aria-current', on);
      if (on) { a.setAttribute('aria-current', 'page'); active = a; }
    });
    const dot = $('.nav-dot');
    if (active) {
      dot.style.opacity = '1';
      dot.style.transform = `translateX(${active.offsetLeft + active.offsetWidth / 2 - 2.5}px)`;
    } else {
      dot.style.opacity = '0';
    }
    $('.nav-cta').style.visibility = r.name === 'contact' ? 'hidden' : '';
  }
  $$('[data-studio-name]').forEach((el) => { el.textContent = S.name || 'Studio'; });

  let lastY = 0;
  function onScrollNav() {
    const y = scrollY;
    nav.classList.toggle('is-solid', y > 30);
    nav.classList.toggle('is-hidden', y > 320 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove('is-hidden');
    lastY = y;
  }
  addEventListener('scroll', onScrollNav, { passive: true });
  addEventListener('resize', () => current && updateNav(current));

  /* ───────────────────────── page init ───────────────────────── */
  let io;
  const parallax = [];

  function initPage(r) {
    const root = view;
    if (!firstRender || reduced) root.querySelector('.page')?.classList.add('is-ready');
    else requestAnimationFrame(() => requestAnimationFrame(() => root.querySelector('.page')?.classList.add('is-ready')));
    firstRender = false;

    // reveals
    io?.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('[data-reveal], [data-cta]', root).forEach((el) => (reduced ? el.classList.add('is-in') : io.observe(el)));

    // parallax
    parallax.length = 0;
    if (!reduced) $$('[data-speed]', root).forEach((el) => parallax.push({ el, speed: parseFloat(el.dataset.speed) }));

    initMagnetic(root);
    initFolders(root);
    initCards(root);
    if (r.name === 'home') { initHero(root); initIndex(root); }
    if (r.name === 'work') initFilters(root);
    initCta(root);
    initNiches(root);
    initBot(root);
    initForm(root);
  }

  function on(el, type, fn, opts) {
    el.addEventListener(type, fn, opts);
    cleanups.push(() => el.removeEventListener(type, fn, opts));
  }

  /* magnetic buttons */
  function initMagnetic(root) {
    if (!fine || reduced) return;
    $$('.magnetic', document).forEach((el) => {
      if (el.dataset.mag) return;
      el.dataset.mag = '1';
      const inner = el.firstElementChild;
      el.addEventListener('pointermove', (e) => {
        const b = el.getBoundingClientRect();
        const x = e.clientX - (b.left + b.width / 2);
        const y = e.clientY - (b.top + b.height / 2);
        el.style.transform = `translate(${x * 0.28}px, ${y * 0.38}px)`;
        if (inner) inner.style.transform = `translate(${x * 0.12}px, ${y * 0.16}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = '';
        if (inner) inner.style.transform = '';
      });
    });
  }

  /* folders: open on hover / focus, tilt toward the cursor, open in view on touch */
  function initFolders(root) {
    const list = $$('.folder', root);
    if (!list.length) return;
    list.forEach((f) => {
      const body = $('.folder-body', f);
      on(f, 'focus', () => f.classList.add('is-open'));
      on(f, 'blur', () => f.classList.remove('is-open'));
      if (fine) {
        on(f, 'pointerenter', () => f.classList.add('is-open'));
        on(f, 'pointerleave', () => {
          f.classList.remove('is-open');
          body.style.removeProperty('--rx');
          body.style.removeProperty('--ry');
        });
        if (!reduced) on(f, 'pointermove', (e) => {
          const b = f.getBoundingClientRect();
          const x = (e.clientX - b.left) / b.width - 0.5;
          const y = (e.clientY - b.top) / b.height - 0.5;
          body.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
          body.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
        });
      }
    });
    if (!fine) {
      const fio = new IntersectionObserver((entries) => {
        entries.forEach((en) => en.target.classList.toggle('is-open', en.isIntersecting));
      }, { rootMargin: '-38% 0px -38% 0px' });
      list.forEach((f) => fio.observe(f));
      cleanups.push(() => fio.disconnect());
    }
  }

  /* cards: image drifts against the cursor */
  function initCards(root) {
    if (!fine || reduced) return;
    $$('.card', root).forEach((c) => {
      const img = $('.card-img', c);
      on(c, 'pointermove', (e) => {
        const b = c.getBoundingClientRect();
        const x = (e.clientX - b.left) / b.width - 0.5;
        const y = (e.clientY - b.top) / b.height - 0.5;
        img.style.setProperty('--px', `${(-x * 18).toFixed(1)}px`);
        img.style.setProperty('--py', `${(-y * 14).toFixed(1)}px`);
      });
      on(c, 'pointerleave', () => { img.style.removeProperty('--px'); img.style.removeProperty('--py'); });
    });
  }

  function initHero(root) {
    const hero = $('[data-hero]', root);
    if (!hero || !fine || reduced) return;
    on(hero, 'pointermove', (e) => {
      const b = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', `${e.clientX - b.left}px`);
      hero.style.setProperty('--my', `${e.clientY - b.top}px`);
    });
  }

  /* index list with a floating preview that follows the cursor */
  const pf = $('.preview-float');
  const pfIn = $('.preview-float-in');
  const pfPos = { x: 0, y: 0, tx: 0, ty: 0, on: false };
  function initIndex(root) {
    const list = $('[data-index]', root);
    if (!list || !fine) return;
    pfIn.innerHTML = ORDER.map((p) => `<img src="${thumb(p, p.cover)}" alt="" data-id="${p.id}" decoding="async">`).join('');
    const imgs = $$('img', pfIn);
    $$('.index-row', list).forEach((row) => {
      on(row, 'pointerenter', (e) => {
        imgs.forEach((im) => im.classList.toggle('is-cur', im.dataset.id === row.dataset.id));
        if (!pfPos.on) { pfPos.x = pfPos.tx = e.clientX; pfPos.y = pfPos.ty = e.clientY; }
        pfPos.on = true;
        pf.classList.add('is-on');
      });
    });
    on(list, 'pointerleave', () => { pfPos.on = false; pf.classList.remove('is-on'); });
    cleanups.push(() => { pfPos.on = false; pf.classList.remove('is-on'); });
  }

  /* work page filters: grid rebuilds with a morph */
  function initFilters(root) {
    const grid = $('[data-grid]', root);
    if (!grid) return;
    const cards = $$('.card', grid);
    const chips = $$('[data-filter]', root);
    const apply = (val) => {
      cards.forEach((c) => c.classList.toggle('is-hidden', val !== 'all' && c.dataset.cat !== val));
      const vis = cards.filter((c) => !c.classList.contains('is-hidden'));
      vis.forEach((c, i) => {
        const p = byId[c.dataset.id];
        const v = cardVars(p, layoutFor(i, vis.length));
        c.setAttribute('style', v.style);
        const im = $('.card-img img', c);
        const src = thumb(p, v.src);
        if (!im.src.endsWith(src)) im.src = src;
        $$('.rv-img, .rv-up', c).forEach((el) => el.classList.add('is-in'));
      });
    };
    chips.forEach((chip) => on(chip, 'click', async () => {
      if (chip.getAttribute('aria-pressed') === 'true') return;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      const val = chip.dataset.filter;
      if (canVT) {
        document.documentElement.classList.add('vt-local');
        cards.forEach((c) => { if (!c.classList.contains('is-hidden')) c.style.viewTransitionName = `card-${c.dataset.id}`; });
        const t = document.startViewTransition(() => {
          apply(val);
          cards.forEach((c) => { c.style.viewTransitionName = c.classList.contains('is-hidden') ? '' : `card-${c.dataset.id}`; });
        });
        try { await t.finished; } catch (e) { /* skipped */ }
        cards.forEach((c) => { c.style.viewTransitionName = ''; });
        document.documentElement.classList.remove('vt-local');
      } else {
        apply(val);
      }
    }));
  }

  function initCta(root) {
    const s = $('[data-cta]', root);
    if (!s || !fine || reduced) return;
    const glow = $('.cta-glow', s);
    on(s, 'pointermove', (e) => {
      const b = s.getBoundingClientRect();
      glow.style.setProperty('--gx', `${(e.clientX - b.left - b.width / 2) * 0.3}px`);
      glow.style.setProperty('--gy', `${(e.clientY - b.top - b.height * 0.6) * 0.3}px`);
    });
    on(s, 'pointerleave', () => { glow.style.removeProperty('--gx'); glow.style.removeProperty('--gy'); });
  }

  /* niches chart: FLIP re-sort */
  function initNiches(root) {
    const m = $('[data-niches]', root);
    if (!m) return;
    const wrap = $('.niches', m);
    $$('[data-sort]', m).forEach((btn) => on(btn, 'click', () => {
      $$('[data-sort]', m).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const rows = $$('.niche', wrap);
      const first = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
      const key = btn.dataset.sort;
      rows.sort((a, b) => (+b.dataset[key] - +a.dataset[key]) || (+b.dataset.share - +a.dataset.share));
      rows.forEach((r) => wrap.appendChild(r));
      if (reduced) return;
      rows.forEach((r) => {
        const d = first.get(r) - r.getBoundingClientRect().top;
        if (!d) return;
        r.style.transition = 'none';
        r.style.transform = `translateY(${d}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => { r.style.transition = ''; r.style.transform = ''; }));
      });
    }));
  }

  /* bot dialogue */
  function initBot(root) {
    const m = $('[data-bot]', root);
    if (!m) return;
    let timers = [];
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    cleanups.push(clearTimers);
    const feed = (w) => $(`[data-feed="${w}"]`, m);
    const kbEl = (w) => $(`[data-kb="${w}"]`, m);
    const setKb = (w, rows) => {
      kbEl(w).innerHTML = (rows || []).map((r) => r.map((b) => `<span${r.length === 1 ? ' class="wide"' : ''}>${esc(b)}</span>`).join('')).join('');
    };
    const bubble = (s) => {
      const el = document.createElement('div');
      el.className = `msg ${s.me ? 'msg--me' : 'msg--bot'}`;
      // bot texts use Telegram HTML (<b>); everything else is escaped
      el.innerHTML = s.text.split(/(<b>.*?<\/b>)/).map((part) => (/^<b>.*<\/b>$/.test(part) ? `<b>${esc(part.slice(3, -4))}</b>` : esc(part))).join('') +
        (s.inline ? `<div class="msg-kb" style="--cols:${Math.max(...s.inline.map((r) => r.length))}">${s.inline.flat().map((b) => `<span>${esc(b)}</span>`).join('')}</div>` : '') +
        '<span class="msg-time">14:05</span>';
      return el;
    };
    const play = () => {
      clearTimers();
      ['client', 'admin'].forEach((w) => { feed(w).innerHTML = ''; setKb(w, w === 'client' ? KB_MAIN : []); });
      let t = 400;
      const put = (s, f) => {
        if (s.clearInline) $$('.msg-kb', f).forEach((k) => k.remove());
        const last = s.edit ? [...f.querySelectorAll('.msg--bot')].pop() : null;
        if (last) last.replaceWith(bubble(s)); else f.appendChild(bubble(s));
        if (s.kb) setKb(s.to, s.kb);
      };
      BOT_SCRIPT.forEach((s) => {
        const f = feed(s.to);
        if (reduced) { put(s, f); return; }
        if (s.me) {
          timers.push(setTimeout(() => put(s, f), t));
          t += 900;
        } else {
          let typing;
          timers.push(setTimeout(() => { typing = document.createElement('div'); typing.className = 'typing'; typing.innerHTML = '<i></i><i></i><i></i>'; f.appendChild(typing); }, t));
          t += 800;
          timers.push(setTimeout(() => { typing?.remove(); put(s, f); }, t));
          t += s.text.length > 90 ? 1500 : 900;
        }
      });
    };
    const bio = new IntersectionObserver((en) => { if (en[0].isIntersecting) { play(); bio.disconnect(); } }, { threshold: 0.35 });
    bio.observe(m);
    cleanups.push(() => bio.disconnect());
    on($('[data-bot-replay]', m), 'click', play);
  }

  /* contact form: builds a message and opens mail or Telegram */
  function initForm(root) {
    const form = $('[data-form]', root);
    if (!form) return;
    const note = $('[data-note]', form);
    $$('.chips .chip', form).forEach((c) => on(c, 'click', () => c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'))));
    on(form, 'submit', async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const contact = form.contact.value.trim();
      note.classList.remove('is-warn');
      if (!name || !contact) {
        note.textContent = !name ? 'Напишите, как к вам обращаться.' : 'Оставьте телефон, Telegram или почту, чтобы мы могли ответить.';
        note.classList.add('is-warn');
        (!name ? form.name : form.contact).focus();
        return;
      }
      const need = $$('.chips .chip[aria-pressed="true"]', form).map((c) => c.textContent).join(', ');
      const body = `Имя: ${name}\nКонтакт: ${contact}${need ? `\nНужно: ${need}` : ''}${form.message.value.trim() ? `\n\n${form.message.value.trim()}` : ''}`;
      if (S.email) {
        location.href = `mailto:${S.email}?subject=${encodeURIComponent('Заявка с сайта')}&body=${encodeURIComponent(body)}`;
        note.textContent = 'Открываем почту с готовым письмом. Осталось нажать «Отправить».';
      } else if (S.telegram) {
        try { await navigator.clipboard.writeText(body); note.textContent = 'Текст заявки скопирован. Вставьте его в чат Telegram.'; } catch (err) { note.textContent = 'Откроем Telegram — опишите задачу в чате.'; }
        window.open(S.telegram, '_blank', 'noopener');
      } else {
        note.textContent = 'Контакты студии ещё не указаны: заполните email или telegram в assets/js/data.js.';
        note.classList.add('is-warn');
      }
    });
  }

  /* ───────────────────────── cursor + frame loop ───────────────────────── */
  const cursor = $('.cursor');
  const cursorLabel = $('.cursor-label');
  const pt = { x: -100, y: -100, cx: -100, cy: -100 };
  if (fine) {
    addEventListener('pointermove', (e) => {
      pt.x = e.clientX; pt.y = e.clientY;
      pfPos.tx = e.clientX; pfPos.ty = e.clientY;
      cursor.classList.add('is-visible');
    }, { passive: true });
    addEventListener('mouseout', (e) => { if (!e.relatedTarget) cursor.classList.remove('is-visible'); });
    document.addEventListener('pointerover', (e) => {
      const lab = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button, [role="button"], input, textarea, label');
      cursor.classList.toggle('is-label', !!lab);
      cursor.classList.toggle('is-link', !lab && !!link);
      if (lab) cursorLabel.textContent = lab.dataset.cursor;
    });
  }

  function frameLoop() {
    if (fine) {
      const k = reduced ? 1 : 0.2;
      pt.cx = lerp(pt.cx, pt.x, k);
      pt.cy = lerp(pt.cy, pt.y, k);
      cursor.style.transform = `translate3d(${pt.cx}px, ${pt.cy}px, 0)`;
      pfPos.x = lerp(pfPos.x, pfPos.tx, 0.14);
      pfPos.y = lerp(pfPos.y, pfPos.ty, 0.14);
      if (pfPos.on) pf.style.transform = `translate3d(${pfPos.x}px, ${pfPos.y}px, 0) rotate(${clamp((pfPos.tx - pfPos.x) * 0.04, -6, 6)}deg)`;
    }
    for (const { el, speed } of parallax) {
      const b = el.parentElement.getBoundingClientRect();
      if (b.bottom < -200 || b.top > innerHeight + 200) continue;
      const prog = (b.top + b.height / 2 - innerHeight / 2) / innerHeight;
      el.style.transform = `translate3d(0, ${(prog * speed * 100 * 4).toFixed(1)}px, 0)`;
    }
    requestAnimationFrame(frameLoop);
  }

  /* a project added without previews still shows up: fall back to the full image */
  document.addEventListener('error', (e) => {
    const im = e.target;
    if (im.tagName === 'IMG' && im.src.includes('/assets/thumbs/')) im.src = im.src.replace('/assets/thumbs/', '/assets/work/');
  }, true);

  /* ───────────────────────── boot ───────────────────────── */
  currentHash = location.hash || '#/';
  render();
  onScrollNav();
  requestAnimationFrame(frameLoop);
  document.fonts?.ready.then(() => { if (current) { updateNav(current); fitTitles(view); } });
})();
