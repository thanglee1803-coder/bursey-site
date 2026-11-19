/* Bursey — bursey.app. Plain JavaScript, no build step. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private window */ } }
  };

  /* ---------------------------------------------------------------- Sound */
  var soundOn = store.get('bursey-sound') !== 'off';
  var sounds = {};
  ['win', 'loss', 'notReached', 'streak'].forEach(function (name) {
    var a = new Audio('sounds/' + name + '.m4a');
    a.preload = 'none';
    sounds[name] = a;
  });
  function play(name) {
    if (!soundOn || !sounds[name]) return;
    try { sounds[name].currentTime = 0; var p = sounds[name].play(); if (p && p.catch) p.catch(function () {}); } catch (e) { /* no audio */ }
  }
  var soundBtn = $('#soundBtn');
  function paintSound() {
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.setAttribute('aria-label', soundOn ? 'Sound on' : 'Sound off');
  }
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn; store.set('bursey-sound', soundOn ? 'on' : 'off'); paintSound();
  });
  paintSound();

  /* ---------------------------------------------------------------- Confetti (same physics as Celebration.swift) */
  var canvas = $('#confetti');
  var ctx = canvas.getContext('2d');
  var palette = ['#6B21E8', '#F2993D', '#F5A524', '#D45DB0', '#FFD60A', '#FFFFFF'];
  var burst = null;
  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function confetti(originEl) {
    if (reduced) return;
    sizeCanvas();
    var r = originEl.getBoundingClientRect();
    var pieces = [];
    for (var i = 0; i < 110; i++) {
      pieces.push({
        x0: r.left + r.width * (0.1 + 0.8 * Math.random()),
        vx: (Math.random() - 0.5) * 520,
        vy: -(380 + Math.random() * 520),
        rot: Math.random() * 360, spin: (Math.random() - 0.5) * 900,
        w: 6 + Math.random() * 6, c: palette[i % palette.length]
      });
    }
    var wasRunning = !!burst;
    burst = { t0: performance.now(), y0: r.top + r.height * 0.6, pieces: pieces };
    if (!wasRunning) requestAnimationFrame(drawConfetti);
  }
  function drawConfetti(now) {
    if (!burst) return;
    var dur = 2.4, t = (now - burst.t0) / 1000;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (t >= dur) { burst = null; return; }
    ctx.globalAlpha = Math.max(0, 1 - Math.pow(t / dur, 3));
    burst.pieces.forEach(function (p) {
      ctx.save();
      ctx.translate(p.x0 + p.vx * t, burst.y0 + p.vy * t + 0.5 * 1100 * t * t);
      ctx.rotate((p.rot + p.spin * t) * Math.PI / 180);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -3, p.w, 6);
      ctx.restore();
    });
    requestAnimationFrame(drawConfetti);
  }

  /* ---------------------------------------------------------------- The live phone and its card */
  var tries = [];
  var GOAL = 10, RING = 263.9;
  var el = {
    count: $('#pCount'), arc: $('#ringArc'), streak: $('#pStreak'),
    attempts: $('#tAttempts'), talks: $('#tTalks'), wins: $('#tWins'), losses: $('#tLosses'),
    cWins: $('#cWins'), cWinsLbl: $('#cWinsLbl'), cap: $('#cardCap'), undo: $('#undoBtn'),
    live: $('#live'), hint: $('#stageHint'), phone: $('#phone'), card: $('#heroCard')
  };
  var names = { notReached: 'Not reached', loss: 'No', win: 'Win' };

  function pop(node) {
    if (reduced || !hasGsap) return;
    gsap.fromTo(node, { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', overwrite: true });
  }
  function setNum(node, value) {
    if (node.textContent !== String(value)) { node.textContent = value; pop(node); }
  }
  function paintPhone() {
    var total = tries.length;
    var wins = tries.filter(function (t) { return t === 'win'; }).length;
    var losses = tries.filter(function (t) { return t === 'loss'; }).length;
    setNum(el.count, total);
    setNum(el.attempts, total);
    setNum(el.talks, wins + losses);
    setNum(el.wins, wins);
    setNum(el.losses, losses);
    el.arc.style.strokeDashoffset = String(RING * (1 - Math.min(total / GOAL, 1)));
    el.streak.textContent = total > 0 ? '1-day streak' : 'No streak yet';
    setNum(el.cWins, wins);
    el.cWinsLbl.textContent = wins === 1 ? 'win' : 'wins';
    el.cap.textContent = wins > 0 ? 'A card you could post. No tries, no money, no names.' : 'Your card. Tap Win and watch it change.';
    el.undo.disabled = total === 0;
  }
  function addTry(kind, button) {
    var first = tries.length === 0;
    tries.push(kind);
    paintPhone();
    play(kind);
    if (first) { setTimeout(function () { play('streak'); }, 380); el.hint.hidden = true; }
    if (kind === 'win') {
      confetti(el.phone);
      if (!reduced && hasGsap) gsap.fromTo(el.card, { scale: 1.06 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)', overwrite: true });
    }
    el.live.textContent = names[kind] + ' counted. ' + tries.length + (tries.length === 1 ? ' try' : ' tries') + ' today.';
    if (button) { button.classList.add('is-press'); setTimeout(function () { button.classList.remove('is-press'); }, 120); }
  }
  $$('[data-try]').forEach(function (b) {
    b.addEventListener('click', function () { addTry(b.getAttribute('data-try'), null); });
  });
  el.undo.addEventListener('click', function () {
    if (!tries.length) return;
    tries.pop(); paintPhone();
    el.live.textContent = 'Last try removed. ' + tries.length + ' today.';
  });
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var map = { '1': 'notReached', '2': 'loss', '3': 'win' };
    if (!map[e.key]) return;
    var r = el.phone.getBoundingClientRect();
    if (r.bottom < 80 || r.top > window.innerHeight - 80) return; // only while the phone is on screen
    addTry(map[e.key], $('[data-try="' + map[e.key] + '"]'));
  });
  $('#pDate').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  /* ---------------------------------------------------------------- Founder: Day N, counted live */
  function paintFounder(cfg) {
    var p = String(cfg.dayOne || '2026-11-09').split('-').map(Number);
    var start = new Date(p[0], p[1] - 1, p[2]);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var n = Math.max(1, Math.round((today - start) / 864e5) + 1);
    $$('[data-dayn]').forEach(function (node) { node.textContent = n; });
    if (typeof cfg.wins === 'number' && cfg.wins >= 0) {
      var w = $('#founderWins');
      w.hidden = false;
      $('b', w).textContent = cfg.wins;
      $('span', w).textContent = cfg.wins === 1 ? 'win' : 'wins';
    }
    if (cfg.seriesUrl && /^https:\/\//.test(cfg.seriesUrl)) {
      var link = $('#seriesLink'); link.href = cfg.seriesUrl; link.hidden = false;
    }
  }
  paintFounder({});
  fetch('founder.json').then(function (r) { return r.ok ? r.json() : {}; }).then(paintFounder).catch(function () {});

  /* ---------------------------------------------------------------- Streak map */
  var grid = $('#mapGrid');
  var WEEKS = 12, cells = [];
  (function buildMap() {
    var seed = 20261109;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    for (var w = 0; w < WEEKS; w++) {
      for (var d = 0; d < 7; d++) {
        var c = document.createElement('div');
        c.className = 'cell';
        var info = { el: c, counts: false };
        if (d < 5) {
          if (w === 7 && d === 3) { c.innerHTML = '<em>–</em>'; }            // one Day off: the streak survives
          else {
            var r = rnd();
            c.classList.add(r > 0.82 ? 'lv3' : r > 0.4 ? 'lv2' : 'lv1');
            if (rnd() > 0.72) c.innerHTML = '<i></i>';
            info.counts = true;
          }
        } else if (w === 4 && d === 5) { c.classList.add('lv1'); info.counts = true; } // a weekend try adds a day
        grid.appendChild(c); cells.push(info);
      }
    }
  })();
  var streakNum = $('#streakNum');
  function paintMap(progress) {
    var upto = Math.round(progress * cells.length), n = 0;
    for (var i = 0; i < cells.length; i++) {
      var on = i < upto;
      cells[i].el.classList.toggle('is-on', on);
      if (on && cells[i].counts) n++;
    }
    streakNum.textContent = n;
  }
  paintMap(1);

  /* ---------------------------------------------------------------- Footprints behind the waitlist */
  var steps = $('#steps'), feet = [];
  (function buildSteps() {
    var count = 14;
    for (var i = 0; i < count; i++) {
      var t = i / (count - 1);
      var left = i % 2 === 0;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 20 40');
      svg.innerHTML = '<use href="#i-foot"/>';
      var x = 6 + t * 86, y = 88 - t * 74 + Math.sin(t * 6) * 5;
      svg.style.left = x + '%'; svg.style.top = y + '%';
      svg.style.transform = 'translate(' + (left ? -12 : 12) + 'px,' + (left ? -8 : 8) + 'px) rotate(' + (50 + (left ? -8 : 8)) + 'deg)';
      steps.appendChild(svg); feet.push(svg);
    }
  })();

  /* ---------------------------------------------------------------- Notebook typing and money counting */
  function typeNote() {
    var fields = $$('[data-type]');
    if (reduced) { fields.forEach(function (f) { f.textContent = f.getAttribute('data-type'); }); return; }
    var i = 0;
    (function next() {
      if (i >= fields.length) return;
      var f = fields[i++], text = f.getAttribute('data-type'), n = 0;
      f.classList.add('is-typing');
      var timer = setInterval(function () {
        f.textContent = text.slice(0, ++n);
        if (n >= text.length) { clearInterval(timer); f.classList.remove('is-typing'); setTimeout(next, 220); }
      }, 26);
    })();
  }
  function euro(v) { return v.toFixed(2).replace('.', ',') + ' €'; }
  function countMoney() {
    $$('[data-euro]').forEach(function (node) {
      var target = Number(node.getAttribute('data-euro'));
      if (reduced || !hasGsap) { node.textContent = euro(target); return; }
      var o = { v: 0 };
      gsap.to(o, { v: target, duration: 1.6, ease: 'power3.out', onUpdate: function () { node.textContent = euro(o.v); } });
    });
  }
  function once(target, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
    }, { threshold: 0.35 });
    io.observe(target);
  }
  once($('#note'), typeNote);
  once($('.money'), countMoney);

  /* ---------------------------------------------------------------- Nav */
  var nav = $('#nav');
  function paintNav() { nav.classList.toggle('is-stuck', window.scrollY > 24); }
  window.addEventListener('scroll', paintNav, { passive: true });
  paintNav();

  /* ---------------------------------------------------------------- Scroll motion */
  if (hasGsap && !reduced) {
    gsap.registerPlugin(ScrollTrigger);

    if (typeof window.Lenis !== 'undefined') {
      var lenis = new Lenis({ lerp: 0.11, anchors: { offset: -40 } });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // Glide in, like the app: fade, 16px rise, spring, 60ms apart.
    var glides = $$('[data-glide]');
    gsap.set(glides, { opacity: 0, y: 16, scale: 0.985, transformOrigin: '50% 0%' });
    ScrollTrigger.batch(glides, {
      start: 'top 90%', once: true,
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'back.out(1.25)', stagger: 0.06, clearProps: 'transform' });
      }
    });

    // Safety net: if the animation clock stalls (a background tab), never leave on-screen text hidden.
    setTimeout(function () {
      glides.forEach(function (g) {
        var r = g.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0 && Number(getComputedStyle(g).opacity) < 0.99) {
          gsap.killTweensOf(g); gsap.set(g, { clearProps: 'opacity,transform' });
        }
      });
    }, 2500);

    // Footprints walk in.
    gsap.set(feet, { opacity: 0 });
    gsap.to(feet, { opacity: 1, duration: 0.3, stagger: 0.12, scrollTrigger: { trigger: '#waitlist', start: 'top 70%' } });

    var mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (min-height: 600px)', function () {
      var nos = $('#nos'), cardsec = $('#card'), streak = $('#streak');
      [nos, cardsec, streak].forEach(function (s) { s.classList.add('is-pinned'); });

      // 2. The no's
      var list = $('#nosList'), items = $$('li', list), num = $('#nosNum'), end = $('#nosEnd');
      var last = items.length - 1;
      function paintNos(p) {
        var f = Math.min(p / 0.86, 1) * last;
        var lh = items[0].offsetHeight;
        gsap.set(list, { y: -f * lh });
        items.forEach(function (li, i) {
          var d = Math.abs(i - f);
          gsap.set(li, { opacity: Math.max(0.05, 1 - d * 0.62), scale: Math.max(0.72, 1 - d * 0.12) });
        });
        num.textContent = Math.round(f) + 1;
        gsap.set(end, { opacity: gsap.utils.clamp(0, 1, (p - 0.86) / 0.1), y: (1 - gsap.utils.clamp(0, 1, (p - 0.86) / 0.1)) * 16 });
      }
      paintNos(0);
      ScrollTrigger.create({ trigger: nos, pin: $('.nos__pin'), start: 'top top', end: '+=260%', scrub: 0.4, onUpdate: function (s) { paintNos(s.progress); } });

      // 4. The card flips from feed size to story size
      var flip = $('#flip'), facts = $$('#facts li'), lbl = $('#flipLbl');
      gsap.set(flip, { rotateY: -24, rotateX: 6 });
      ScrollTrigger.create({
        trigger: cardsec, pin: $('.cardsec__pin'), start: 'top top', end: '+=220%', scrub: 0.5,
        animation: gsap.timeline()
          .to(flip, { rotateY: 24, rotateX: -4, ease: 'none', duration: 0.38 })
          .to(flip, { rotateY: 156, rotateX: 4, ease: 'power1.inOut', duration: 0.3 })
          .to(flip, { rotateY: 204, rotateX: -4, ease: 'none', duration: 0.32 }),
        onUpdate: function (s) {
          var idx = Math.min(2, Math.floor(s.progress * 3));
          facts.forEach(function (li, i) { li.classList.toggle('is-on', i === idx); });
          lbl.textContent = s.progress < 0.53 ? 'Feed · 4:5' : 'Story · 9:16';
        }
      });

      // 5. The streak map fills in
      paintMap(0);
      ScrollTrigger.create({ trigger: streak, pin: $('.streak__pin'), start: 'top top', end: '+=180%', scrub: 0.3, onUpdate: function (s) { paintMap(Math.min(1, s.progress / 0.9)); } });

      // Hero: the phone and card drift apart slightly as you leave
      gsap.to('.phone', { y: -40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.stage__card', { y: -110, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

      return function () {
        [nos, cardsec, streak].forEach(function (s) { s.classList.remove('is-pinned'); });
        gsap.set([list, end, flip].concat(items), { clearProps: 'all' });
        paintMap(1);
      };
    });

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  /* ---------------------------------------------------------------- Waitlist */
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  $$('[data-waitlist]').forEach(function (form) {
    var input = $('input[type="email"]', form);
    var msg = $('.join__msg', form);
    var err = $('.field__err', form);
    var btn = $('button[type="submit"]', form);
    function fail(text) {
      input.setAttribute('aria-invalid', 'true');
      if (err) { err.textContent = text; } else { msg.className = 'join__msg is-err'; msg.textContent = text; }
      input.focus();
    }
    input.addEventListener('input', function () {
      input.removeAttribute('aria-invalid'); if (err) err.textContent = '';
      if (msg.classList.contains('is-err')) { msg.textContent = ''; msg.className = 'join__msg'; }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!email) return fail('Please type your email address.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail('That email looks incomplete. Check it and try again.');
      var data = { email: email, company: (form.elements.company || {}).value || '' };
      ['beta', 'mac', 'windows'].forEach(function (k) { data[k] = !!(form.elements[k] && form.elements[k].checked); });
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Joining…';
      function done(ok, text) {
        btn.disabled = false; btn.textContent = label;
        msg.className = 'join__msg ' + (ok ? 'is-ok' : 'is-err'); msg.textContent = text;
        if (ok) { form.reset(); play('win'); confetti(form); }
      }
      // Temporary hosting without a database: hand the sign-up to the visitor's mail app.
      var mailto = document.querySelector('meta[name="waitlist-mailto"]');
      if (mailto && mailto.content) {
        var wants = [];
        if (data.beta) wants.push('I post my progress online and want to test the beta');
        if (data.mac) wants.push('I want Bursey on Mac');
        if (data.windows) wants.push('I want Bursey on Windows');
        var body = 'Please add me to the Bursey waitlist.\n\nMy email: ' + email + (wants.length ? '\n\n' + wants.join('\n') : '');
        location.href = 'mailto:' + mailto.content + '?subject=' + encodeURIComponent('Bursey waitlist') + '&body=' + encodeURIComponent(body);
        btn.disabled = false; btn.textContent = label;
        msg.className = 'join__msg is-ok';
        msg.textContent = 'Your mail app should open now. Press send and you are on the list.';
        return;
      }
      if (isLocal) {
        setTimeout(function () { done(true, "You're on the list. (Test mode on this computer: nothing was saved.)"); }, 500);
        return;
      }
      fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); done(true, "You're on the list. See you on Day 1."); })
        .catch(function () { done(false, "That didn't work, and your email was not saved. Please try again in a minute."); });
    });
  });
})();
