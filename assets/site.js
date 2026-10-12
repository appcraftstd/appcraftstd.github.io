/* Appcraft — studio site behaviour. No dependencies, no trackers, no cookies.
   Everything here is decoration except the language toggle; the page reads
   correctly with JavaScript off. */
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ language */
  // Same storage key as the game pages, so the choice carries across the site.
  var buttons = document.querySelectorAll('.langs button');
  function setLang(lang) {
    root.classList.toggle('tr', lang === 'tr');
    root.setAttribute('lang', lang);
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
    try { localStorage.setItem('appcraft.lang', lang); } catch (e) {}
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.lang); });
  });
  var saved;
  try { saved = localStorage.getItem('appcraft.lang'); } catch (e) {}
  if (!saved && (navigator.language || '').toLowerCase().indexOf('tr') === 0) saved = 'tr';
  if (saved === 'tr') setLang('tr');

  /* ----------------------------------------------------------------- nav */
  var nav = document.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------- reveal + counters */
  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    if (reduce || !target) { el.textContent = el.dataset.count; return; }
    var start = null, dur = 1400;
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        e.target.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* -------------------------------------------- pointer light + card tilt */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    if (!reduce) {
      document.querySelectorAll('[data-tilt]').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = 'perspective(1400px) rotateY(' + (x * 5) + 'deg) rotateX(' + (-y * 5) + 'deg)';
        });
        el.addEventListener('pointerleave', function () { el.style.transform = ''; });
      });
    }
  }

  /* ---------------------------------------------- table of contents spy */
  var tocLinks = document.querySelectorAll('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        tocLinks.forEach(function (a) { a.classList.remove('active'); });
        var a = byId[e.target.id];
        if (a) a.classList.add('active');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(byId).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  /* ------------------------------------------------- hero starfield canvas */
  var canvas = document.getElementById('stars');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w, h, pts = [], mouse = { x: -9999, y: -9999 }, running = true, raf;
  var colors = ['77,226,216', '139,124,255', '242,112,95'];

  function resize() {
    var r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.min(110, Math.round(w * h / 14000));
    pts = [];
    for (var i = 0; i < n; i++) {
      pts.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.6 + 0.4,
        c: colors[Math.random() < 0.6 ? 0 : (Math.random() < 0.7 ? 1 : 2)]
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!reduce) {
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 16000) { var f = (16000 - d2) / 16000 * 0.6; p.x += dx / 60 * f; p.y += dy / 60 * f; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      }
      for (var j = i + 1; j < pts.length; j++) {
        var q = pts[j], ex = p.x - q.x, ey = p.y - q.y, e2 = ex * ex + ey * ey;
        if (e2 < 12000) {
          ctx.strokeStyle = 'rgba(' + p.c + ',' + (0.14 * (1 - e2 / 12000)) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(' + p.c + ',.85)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function loop() {
    draw();
    if (running && !reduce) raf = requestAnimationFrame(loop);
  }

  resize();
  loop();
  window.addEventListener('resize', function () { resize(); if (reduce) draw(); });
  canvas.parentElement.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.parentElement.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });

  // Stop drawing when the hero is off screen or the tab is hidden.
  if ('IntersectionObserver' in window && !reduce) {
    var onScreen = true;
    function update() {
      var vis = onScreen && !document.hidden;
      if (vis && !running) { running = true; loop(); }
      if (!vis && running) { running = false; cancelAnimationFrame(raf); }
    }
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      update();
    }).observe(canvas);
    document.addEventListener('visibilitychange', update);
  }
})();
