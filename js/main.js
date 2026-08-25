/* ============================================================
   GRAAMA — interactions
   Vanilla JS, no dependencies. All motion respects
   prefers-reduced-motion.
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- rAF scroll bus ---------- */
  var subs = [], ticking = false;
  function onScroll(fn) { subs.push(fn); }
  function flush() {
    ticking = false;
    var y = window.pageYOffset;
    for (var i = 0; i < subs.length; i++) subs[i](y);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(flush); }
  }, { passive: true });
  window.addEventListener('resize', function () { requestAnimationFrame(flush); }, { passive: true });

  /* ---------- 1. Hero headline: split into chars ---------- */
  $$('[data-split]').forEach(function (el) {
    var txt = el.textContent.trim();
    el.textContent = '';
    txt.split('').forEach(function (ch, i) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i);
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
    });
  });

  /* ---------- 2. Preloader ---------- */
  (function loader() {
    var el = $('#loader'), fill = $('#loadFill'), pct = $('#loadPct');
    if (!el) { document.body.classList.add('ready'); return; }

    function finish() {
      el.classList.add('done');
      document.body.classList.add('ready');
      setTimeout(function () { el.style.display = 'none'; }, 1800);
    }

    if (REDUCED) { if (pct) pct.textContent = '100%'; finish(); return; }

    var DUR = 1700, t0 = performance.now(), done = false;
    function set(p) {
      if (pct) pct.textContent = Math.round(p * 100) + '%';
      if (fill) fill.style.transform = 'scaleX(' + p + ')';
    }
    function end() {
      if (done) return;
      done = true;
      set(1);
      setTimeout(finish, 200);
    }
    // failsafe: never trap the visitor behind the curtain
    var guard = setTimeout(end, DUR + 1400);
    (function step(t) {
      if (done) return;
      var p = clamp((t - t0) / DUR, 0, 1);
      set(1 - Math.pow(1 - p, 2.2));
      if (p < 1) requestAnimationFrame(step);
      else { clearTimeout(guard); end(); }
    })(t0);
  })();

  /* ---------- 3. Reveal on enter ---------- */
  (function reveals() {
    var targets = $$('[data-obs]').concat($$('.reveal')).filter(function (el, i, a) { return a.indexOf(el) === i; });
    if (!('IntersectionObserver' in window) || REDUCED) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- 4. Nav: hide on scroll down, solidify past hero ---------- */
  (function nav() {
    var nav = $('#nav'), last = 0;
    onScroll(function (y) {
      nav.classList.toggle('solid', y > window.innerHeight * 0.86);
      if (y > last && y > 260 && !document.body.classList.contains('menu-open')) nav.classList.add('hide');
      else nav.classList.remove('hide');
      last = y;
    });

    var toggle = $('#navToggle');
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      document.body.classList.toggle('is-locked', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('#drawer a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('menu-open', 'is-locked');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) toggle.click();
    });
  })();

  /* ---------- 5. Scroll progress bar ---------- */
  (function progress() {
    var bar = $('#progBar');
    onScroll(function (y) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? clamp(y / h, 0, 1) : 0) + ')';
    });
  })();

  /* ---------- 6. Hero: parallax drift on the film ---------- */
  (function heroParallax() {
    if (REDUCED) return;
    var art = $('#heroArt');
    if (!art) return;
    var mx = 0, my = 0, tx = 0, ty = 0, sy = 0;

    window.addEventListener('pointermove', function (e) {
      if (window.innerWidth < 860) return;
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    onScroll(function (y) { sy = y; });

    (function loop() {
      var vh = window.innerHeight;
      if (sy < vh * 1.25) {
        mx += (tx - mx) * 0.055;
        my += (ty - my) * 0.055;
        var p = Math.min(sy / vh, 1);
        art.style.transform =
          'translate3d(' + (mx * -14).toFixed(2) + 'px,' + (sy * 0.2 + my * -10).toFixed(1) + 'px,0)' +
          ' scale(' + (1.06 + p * 0.07).toFixed(3) + ')';
      }
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------- 6b. Play heavy video only while it is on screen ---------- */
  (function lazyVideo() {
    var vids = $$('video');
    if (!vids.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (v.preload === 'none') { v.preload = 'auto'; v.load(); }
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.15 });
    vids.forEach(function (v) { io.observe(v); });
  })();

  /* ---------- 7. Marquee: duplicate for a seamless loop ---------- */
  (function marquee() {
    var t = $('#mq');
    if (!t) return;
    t.innerHTML = t.innerHTML + t.innerHTML;
  })();

  /* ---------- 8. Count-up numbers ---------- */
  (function counters() {
    var nodes = $$('[data-count]');
    if (!nodes.length) return;
    if (REDUCED || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.textContent = n.getAttribute('data-count') + (n.getAttribute('data-suffix') || ''); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target;
        var to = parseFloat(el.getAttribute('data-count'));
        var suf = el.getAttribute('data-suffix') || '';
        var dur = 1500, t0 = performance.now(), settled = false;
        function settle() { if (!settled) { settled = true; el.textContent = to + suf; } }
        // rAF stalls in a background tab; make sure the final number lands regardless
        var guard = setTimeout(settle, dur + 400);
        (function tick(t) {
          if (settled) return;
          var p = clamp((t - t0) / dur, 0, 1);
          el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suf;
          if (p < 1) requestAnimationFrame(tick);
          else { clearTimeout(guard); settle(); }
        })(t0);
      });
    }, { threshold: 0.5 });
    nodes.forEach(function (n) { io.observe(n); });
  })();

  /* ---------- 9. Master plan — the real blueprint, unit by unit ---------- */
  (function masterplan() {
    var stage = $('#planStage'), canvas = $('#planCanvas'), hit = $('#planHit'),
        cap = $('#planCap'), list = $('#planList'), zl = $('#zoomLevel');
    if (!stage || !hit || typeof GRAAMA_UNITS === 'undefined') return;
    var NS = 'http://www.w3.org/2000/svg';

    /* -- build one <g> per traced unit, plus its row in the side list -- */
    var byId = {};
    GRAAMA_UNITS.forEach(function (u) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'unit');
      g.setAttribute('data-kind', u.kind);
      g.setAttribute('data-id', u.id);

      var fill = document.createElementNS(NS, 'polygon');
      fill.setAttribute('points', u.pts);
      fill.setAttribute('class', 'fill');

      var edge = document.createElementNS(NS, 'polygon');
      edge.setAttribute('points', u.pts);
      edge.setAttribute('class', 'edge');
      g.appendChild(fill); g.appendChild(edge);
      hit.appendChild(g);

      var li = document.createElement('li');
      li.innerHTML = '<b></b><span></span>';
      li.querySelector('b').textContent = u.name;
      li.querySelector('span').textContent = u.meta;
      list.appendChild(li);

      byId[u.id] = { unit: u, g: g, edge: edge, li: li };

      [g, li].forEach(function (el) {
        el.addEventListener('mouseenter', function () { focus(u.id); });
        el.addEventListener('mouseleave', blur);
      });
      li.addEventListener('click', function () { focus(u.id); });
    });

    /* the outline draws itself on, so each edge needs its own length */
    requestAnimationFrame(function () {
      Object.keys(byId).forEach(function (k) {
        var e = byId[k].edge;
        var len = e.getTotalLength ? e.getTotalLength() : 200;
        e.style.setProperty('--len', len);   // CSS owns dasharray/offset so .on can win
      });
    });

    var current = null;
    function focus(id) {
      if (current === id) return;
      blur();
      current = id;
      var rec = byId[id]; if (!rec) return;
      rec.g.classList.add('on');
      rec.li.classList.add('on');
      stage.classList.add('focus');
      cap.innerHTML = '<b></b><span></span>';
      cap.querySelector('b').textContent = rec.unit.name;
      cap.querySelector('span').textContent = rec.unit.meta + '  ·  ' + rec.unit.note;
    }
    function blur() {
      if (!current) return;
      var rec = byId[current];
      if (rec) { rec.g.classList.remove('on'); rec.li.classList.remove('on'); }
      current = null;
      stage.classList.remove('focus');
      cap.innerHTML = '<b>Hover a unit</b><span>to trace it on the plan</span>';
    }
    hit.addEventListener('mouseleave', blur);

    /* -- zoom & pan, so the printed plot numbers stay readable -- */
    var scale = 1, tx = 0, ty = 0, MIN = 1, MAX = 4.5;
    function apply() {
      var r = stage.getBoundingClientRect();
      var lim = function (v, size) { return Math.min(0, Math.max(v, size - size * scale)); };
      tx = lim(tx, r.width); ty = lim(ty, r.height);
      canvas.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + scale.toFixed(3) + ')';
      canvas.style.transformOrigin = '0 0';
      if (zl) zl.textContent = scale.toFixed(1) + '\u00d7';
    }
    function zoomAt(factor, cx, cy) {
      var next = clamp(scale * factor, MIN, MAX);
      if (next === scale) return;
      // keep the point under the cursor fixed
      tx = cx - (cx - tx) * (next / scale);
      ty = cy - (cy - ty) * (next / scale);
      scale = next; apply();
    }
    // only pinch / ctrl+wheel zooms — a plain scroll must still move the page
    stage.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.16 : 1 / 1.16, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    // double-click steps in, and again at the top to reset
    stage.addEventListener('dblclick', function (e) {
      var r = stage.getBoundingClientRect();
      if (scale >= MAX - 0.01) { scale = 1; tx = ty = 0; apply(); return; }
      zoomAt(1.8, e.clientX - r.left, e.clientY - r.top);
    });

    $('#zoomIn').addEventListener('click', function () {
      var r = stage.getBoundingClientRect(); zoomAt(1.35, r.width / 2, r.height / 2);
    });
    $('#zoomOut').addEventListener('click', function () {
      var r = stage.getBoundingClientRect(); zoomAt(1 / 1.35, r.width / 2, r.height / 2);
    });

    var down = false, px = 0, py = 0;
    canvas.addEventListener('pointerdown', function (e) {
      if (scale <= 1) return;
      down = true; px = e.clientX; py = e.clientY;
      canvas.classList.add('dragging');
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!down) return;
      tx += e.clientX - px; ty += e.clientY - py;
      px = e.clientX; py = e.clientY; apply();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      canvas.addEventListener(ev, function () { down = false; canvas.classList.remove('dragging'); });
    });
    apply();
  })();

  /* ---------- 10. Pinned horizontal pillars ---------- */
  (function pinned() {
    var sec = $('#pillars'), track = $('#pinTrack'), bar = $('#pinBar'), count = $('#pinCount');
    if (!sec || !track) return;
    var cards = $$('.pillar', track);

    function layout() {
      if (window.innerWidth <= 860 || REDUCED) {
        sec.style.height = '';
        track.style.transform = '';
        return 0;
      }
      var dist = track.scrollWidth - window.innerWidth + 32;
      dist = Math.max(dist, 0);
      sec.style.height = (window.innerHeight + dist * 1.15) + 'px';
      return dist;
    }
    var dist = layout();
    window.addEventListener('resize', function () { dist = layout(); }, { passive: true });

    onScroll(function (y) {
      if (!dist) return;
      var top = sec.offsetTop;
      var p = clamp((y - top) / (sec.offsetHeight - window.innerHeight), 0, 1);
      track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      if (count) {
        var n = clamp(Math.round(p * (cards.length - 1)) + 1, 1, cards.length);
        count.textContent = String(n).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
      }
    });
  })();

  /* ---------- 11. Mandala petals (CTA band) ---------- */
  (function mandala() {
    var g = $('#petals');
    if (!g) return;
    var NS = 'http://www.w3.org/2000/svg';
    for (var i = 0; i < 24; i++) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M300 300 C 360 240 360 140 300 60 C 240 140 240 240 300 300 Z');
      p.setAttribute('transform', 'rotate(' + (i * 15) + ' 300 300)');
      g.appendChild(p);
    }
  })();

  /* ---------- 12. Location list ⇄ map ---------- */
  (function locList() {
    var stage = $('#locStage'), v = $('#locMap');
    if (!stage || !v) return;
    // scrubbing back to the start makes the landmark labels redraw on demand
    $$('.loc-list li').forEach(function (li) {
      li.addEventListener('mouseenter', function () {
        if (REDUCED || v.readyState < 2) return;
        v.currentTime = 0;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      });
    });
  })();

  /* ---------- 13. Floating WhatsApp reveal ---------- */
  (function wa() {
    var el = $('#floatWa');
    onScroll(function (y) { el.classList.toggle('on', y > window.innerHeight * 0.7); });
  })();

  /* ---------- 14. Enquiry form (client-side only) ---------- */
  (function form() {
    var f = $('#enquiryForm');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      ['#fn', '#em', '#ph'].forEach(function (sel) {
        var i = $(sel);
        if (!i.value.trim()) { ok = false; i.style.borderBottomColor = 'var(--laterite)'; }
      });
      if (!ok) return;
      f.classList.add('sent');
    });
    $$('#enquiryForm input, #enquiryForm textarea').forEach(function (i) {
      i.addEventListener('input', function () { i.style.borderBottomColor = ''; });
    });
  })();

  /* ---------- 15. Active nav link by section ---------- */
  (function spy() {
    var map = [['#story', 'story'], ['#plan', 'plan'], ['#location', 'location']];
    var links = $$('#navLinks a');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = '#' + e.target.id;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === id); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    map.forEach(function (m) { var el = $(m[0]); if (el) io.observe(el); });
  })();

  /* first paint */
  requestAnimationFrame(flush);
})();
