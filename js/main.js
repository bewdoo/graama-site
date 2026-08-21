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

  /* ---------- 9. Master plan — generated + interactive ---------- */
  (function masterplan() {
    var svg = $('#planSvg'), stage = $('#planStage'), tip = $('#planTip');
    if (!svg) return;
    var NS = 'http://www.w3.org/2000/svg';
    var W = 1200, H = 675;

    // deterministic pseudo-random so the plan looks the same every load
    var seed = 20260821;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    function mk(tag, attrs) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    }

    var gLand = mk('g', {}), gPlots = mk('g', {}), gLines = mk('g', {}), gLabels = mk('g', {});
    var SITE = 'M60 90 C 300 40 620 62 900 84 C 1080 98 1150 170 1140 300 C 1130 452 1080 570 900 600 C 640 644 320 630 140 574 C 52 546 40 430 52 300 C 60 202 50 118 60 90 Z';

    // clip everything to the site so no line strays off the parcel
    var defs = mk('defs', {});
    var clip = mk('clipPath', { id: 'siteClip' });
    clip.appendChild(mk('path', { d: SITE }));
    defs.appendChild(clip);
    svg.appendChild(defs);
    gLines.setAttribute('clip-path', 'url(#siteClip)');
    gPlots.setAttribute('clip-path', 'url(#siteClip)');

    // site boundary
    gLand.appendChild(mk('path', { d: SITE, fill: 'rgba(58,78,50,.42)', stroke: 'rgba(224,212,188,.34)', 'stroke-width': 1.6 }));

    // cultural green at the heart
    gLand.appendChild(mk('circle', { cx: 600, cy: 336, r: 112, fill: '#B8862A', opacity: '.30' }));
    gLand.appendChild(mk('circle', { cx: 600, cy: 336, r: 74, fill: '#B8862A', opacity: '.55' }));
    gLand.appendChild(mk('circle', { cx: 600, cy: 336, r: 30, fill: '#A4451F' }));

    // eight lanes radiating from the green — each bows a little, the way a
    // walked path does, rather than running dead straight
    var LANES = 8, laneA = [];
    for (var li = 0; li < LANES; li++) {
      var la = (li / LANES) * Math.PI * 2 + Math.PI / LANES;
      laneA.push(la);
      var ex = 600 + Math.cos(la) * 620, ey = 336 + Math.sin(la) * 360;
      var bow = (rnd() - 0.5) * 90;                       // perpendicular sag
      var mxp = (600 + ex) / 2 - Math.sin(la) * bow;
      var myp = (336 + ey) / 2 + Math.cos(la) * bow;
      var p = mk('path', {
        d: 'M600 336 Q' + mxp.toFixed(0) + ' ' + myp.toFixed(0) + ' ' + ex.toFixed(0) + ' ' + ey.toFixed(0),
        stroke: 'rgba(224,212,188,.34)', 'stroke-width': 2.6, fill: 'none', 'stroke-linecap': 'round'
      });
      p.style.strokeDasharray = 800;
      p.style.strokeDashoffset = REDUCED ? 0 : 800;
      p.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.16,.84,.30,1) ' + (0.15 + li * 0.07) + 's';
      gLines.appendChild(p);
    }

    // perimeter road — a hand-walked loop, not a drafted ellipse
    var ptsR = [], N = 22;
    for (var ri2 = 0; ri2 < N; ri2++) {
      var ra = (ri2 / N) * Math.PI * 2;
      var jitter = 1 + (rnd() - 0.5) * 0.075;
      ptsR.push([600 + Math.cos(ra) * 452 * jitter, 336 + Math.sin(ra) * 262 * jitter]);
    }
    var dRing = 'M' + ptsR[0][0].toFixed(1) + ' ' + ptsR[0][1].toFixed(1);
    for (var k = 0; k < N; k++) {
      var cur = ptsR[k], nx = ptsR[(k + 1) % N];
      dRing += ' Q' + cur[0].toFixed(1) + ' ' + cur[1].toFixed(1) + ' ' +
               ((cur[0] + nx[0]) / 2).toFixed(1) + ' ' + ((cur[1] + nx[1]) / 2).toFixed(1);
    }
    gLines.appendChild(mk('path', {
      d: dRing + 'Z', fill: 'none', stroke: 'rgba(224,212,188,.28)',
      'stroke-width': 2.6, 'stroke-dasharray': '15 11', 'stroke-linecap': 'round'
    }));

    // shared landscape belt between the inner and outer precincts
    var belt = mk('ellipse', { cx: 600, cy: 336, rx: 300, ry: 176, fill: 'none', stroke: '#3A4E32', 'stroke-width': 34, opacity: '.55' });
    belt.setAttribute('clip-path', 'url(#siteClip)');
    gLand.appendChild(belt);

    // plots are held back from the lanes so the streets stay legible
    // instead of being paved over by parcels
    function nearLane(a) {
      for (var i = 0; i < laneA.length; i++) {
        var d = Math.abs(Math.atan2(Math.sin(a - laneA[i]), Math.cos(a - laneA[i])));
        if (d < 0.075) return true;
      }
      return false;
    }

    // plots — parcels ringing the cultural green, broken by the lanes
    var names = ['Grove', 'Courtyard', 'Orchard', 'Banyan', 'Terrace', 'Well', 'Kalash', 'Verandah'];
    var rings = [
      { r: 158, n: 18, w: 42, h: 28 },
      { r: 224, n: 24, w: 46, h: 30 },
      { r: 300, n: 30, w: 48, h: 32 },
      { r: 372, n: 34, w: 50, h: 32 }
    ];
    var idx = 0, plots = [];
    rings.forEach(function (ring, ri) {
      for (var i = 0; i < ring.n; i++) {
        var a = (i / ring.n) * Math.PI * 2 + ri * 0.14;
        if (nearLane(a)) continue;
        var rr = ring.r + (rnd() - 0.5) * 20;
        var cx = 600 + Math.cos(a) * rr * 1.16;
        var cy = 336 + Math.sin(a) * rr * 0.70;
        if (cx < 110 || cx > 1100 || cy < 76 || cy > 596) continue;
        idx++;
        var isAmenity = (idx % 13 === 0);
        var w = ring.w * (0.84 + rnd() * 0.34);
        var hh = ring.h * (0.86 + rnd() * 0.3);
        var rect = mk('rect', {
          x: (cx - w / 2).toFixed(1), y: (cy - hh / 2).toFixed(1),
          width: w.toFixed(1), height: hh.toFixed(1), rx: 3.5,
          transform: 'rotate(' + (a * 180 / Math.PI + 90).toFixed(1) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')',
          fill: isAmenity ? '#A4451F' : '#E0D4BC',
          opacity: 0
        });
        rect.dataset.rest = isAmenity ? 1 : (0.78 + rnd() * 0.18).toFixed(2);
        rect.setAttribute('class', 'plot');
        rect.setAttribute('data-label', isAmenity ? 'Amenity · ' + names[idx % names.length] : 'Plot ' + String(idx).padStart(3, '0'));
        rect.setAttribute('data-cx', cx.toFixed(1));
        rect.setAttribute('data-cy', cy.toFixed(1));
        gPlots.appendChild(rect);
        plots.push(rect);
      }
    });

    // annotations — kept to the margins so nothing sits on the drawing
    var acr = mk('text', { x: 86, y: 640, fill: 'rgba(224,212,188,.5)', 'font-family': 'Jost, sans-serif', 'font-size': 13, 'letter-spacing': 2 });
    acr.textContent = '15 CURATED ACRES · INDICATIVE LAYOUT';
    gLabels.appendChild(acr);
    var cnt = mk('text', { x: 1114, y: 640, 'text-anchor': 'end', fill: 'rgba(224,212,188,.5)', 'font-family': 'Jost, sans-serif', 'font-size': 13, 'letter-spacing': 2 });
    cnt.textContent = plots.length + ' PARCELS SHOWN';
    gLabels.appendChild(cnt);

    svg.appendChild(gLand); svg.appendChild(gLines); svg.appendChild(gPlots); svg.appendChild(gLabels);

    // animate plots in when the section enters
    function drawIn() {
      $$('path', gLines).forEach(function (p) { p.style.strokeDashoffset = 0; });
      plots.forEach(function (p, i) {
        if (REDUCED) { p.setAttribute('opacity', p.dataset.rest); return; }
        setTimeout(function () {
          p.style.transition = 'opacity .75s ease, transform .75s cubic-bezier(.16,.84,.30,1)';
          p.setAttribute('opacity', p.dataset.rest);
        }, 380 + i * 16);
      });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { drawIn(); io.disconnect(); } });
      }, { threshold: 0.2 });
      io.observe(stage);
    } else { drawIn(); }

    // hover tooltip
    gPlots.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains('plot')) return;
      stage.classList.add('dim');
      tip.textContent = t.getAttribute('data-label');
      var box = stage.getBoundingClientRect();
      var sx = box.width / W, sy2 = box.height / H;
      tip.style.left = (parseFloat(t.getAttribute('data-cx')) * sx) + 'px';
      tip.style.top = (parseFloat(t.getAttribute('data-cy')) * sy2) + 'px';
      tip.classList.add('on');
    });
    gPlots.addEventListener('mouseout', function () {
      stage.classList.remove('dim');
      tip.classList.remove('on');
    });
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
