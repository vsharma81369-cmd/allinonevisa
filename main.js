/* ==========================================================================
   All In One Visa, main.js
   Shared behaviour across every page. No dependencies.

   Sections
   --------------------------------------------------------------------------
   01. Tiny helpers
   02. Sticky nav (frosted glass after 60px)
   03. Mobile menu
   04. Active nav link
   05. Scroll reveal (IntersectionObserver, staggered)
   06. Number counters (count-up on view)
   07. "How it works" dotted line draw + step pulse
   08. Button ripple
   09. Hero parallax (rAF)
   10. Testimonial 3D tilt
   11. FAQ accordion
   12. Newsletter / footer year / generic small bits
   13. Toast helper (exposed as window.AIOV.toast)
   ========================================================================== */
(function () {
  'use strict';

  /* 01. Helpers ---------------------------------------------------------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn)
      : fn();

  /* 02. Sticky nav ------------------------------------------------------- */
  function initStickyNav() {
    const nav = $('.nav');
    if (!nav) return;
    if (nav.classList.contains('nav--solid')) return; // interior pages start solid
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* 03. Mobile menu ------------------------------------------------------ */
  function initMobileMenu() {
    const toggle = $('.nav__toggle');
    const menu = $('.mobile-menu');
    if (!toggle || !menu) return;

    const close = () => {
      document.body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('.mobile-menu a').forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) close();
    });
  }

  /* 04. Active nav link -------------------------------------------------- */
  function initActiveLink() {
    const here = location.pathname.split('/').pop() || 'index.html';
    $$('.nav__link, .mobile-menu a.m-link, .nav__menu a, .m-group a').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('#')[0];
      if (!href) return;
      if (href === here) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
        const owner = a.closest('.nav__item--has-menu');
        if (owner) { const t = $('.nav__trigger', owner); if (t) t.classList.add('is-active'); }
      }
    });
  }

  /* 04b. Nav dropdown menus --------------------------------------------- */
  function initNavMenus() {
    const items = $$('.nav__item--has-menu');
    if (!items.length) return;
    const closeAll = (except) => items.forEach((it) => {
      if (it === except) return;
      it.classList.remove('is-open');
      const t = $('.nav__trigger', it);
      if (t) t.setAttribute('aria-expanded', 'false');
    });
    items.forEach((item) => {
      const trigger = $('.nav__trigger', item);
      if (!trigger) return;
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const open = item.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', String(open));
        closeAll(item);
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav__item--has-menu')) closeAll(null);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(null); });
  }

  /* 05. Scroll reveal ---------------------------------------------------- */
  function initReveal() {
    const items = $$('.reveal, .reveal-left, .reveal-right');
    if (!items.length) return;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    // Stagger siblings sharing a [data-stagger] parent with 80ms steps.
    let observerFired = false;
    const io = new IntersectionObserver(
      (entries, obs) => {
        observerFired = true;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const parent = el.closest('[data-stagger]');
          if (parent && !el.hasAttribute('data-delay')) {
            const sibs = $$('.reveal, .reveal-left, .reveal-right', parent);
            el.style.transitionDelay = `${sibs.indexOf(el) * 80}ms`;
          }
          el.classList.add('is-visible');
          obs.unobserve(el);
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );
    items.forEach((el) => io.observe(el));
    // Failsafe: some in-app webviews / headless renderers never run IO
    // callbacks. A working browser fires the initial callback within a frame,
    // so this only triggers where IO is broken, never trapping content hidden.
    setTimeout(() => { if (!observerFired) items.forEach((el) => el.classList.add('is-visible')); }, 1400);
  }

  /* 06. Number counters -------------------------------------------------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.decimals && parseInt(el.dataset.decimals, 10)) || 0;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const dur = 1500;
    const start = performance.now();
    const fmt = (n) =>
      prefix +
      n.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) +
      suffix;

    if (prefersReduced) { el.textContent = fmt(target); return; }

    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target);
    };
    requestAnimationFrame(tick);
  }

  function initCounters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;
    if (!('IntersectionObserver' in window)) { nums.forEach(animateCount); return; }
    let firedC = false;
    const io = new IntersectionObserver(
      (entries, obs) => {
        firedC = true;
        entries.forEach((e) => {
          if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); }
        });
      },
      { threshold: 0.5 }
    );
    nums.forEach((n) => io.observe(n));
    // Failsafe for environments where IO never fires (see initReveal).
    setTimeout(() => { if (!firedC) nums.forEach(animateCount); }, 1600);
  }

  /* 07. Dotted line draw + step pulse ----------------------------------- */
  function initSteps() {
    const steps = $('.steps');
    if (!steps) return;

    // Build an SVG path the width of the steps row so the dash can draw.
    const lineHost = $('.steps__line', steps);
    if (lineHost && !$('svg', lineHost)) {
      const w = 1000;
      lineHost.innerHTML =
        `<svg viewBox="0 0 ${w} 4" preserveAspectRatio="none" aria-hidden="true">` +
        `<path d="M0 2 L ${w} 2" pathLength="${w}"/></svg>`;
      const path = $('path', lineHost);
      path.style.setProperty('--dash-len', w);
      path.style.strokeDashoffset = w;
    }

    if (!('IntersectionObserver' in window) || prefersReduced) {
      steps.classList.add('is-drawn');
      $$('.step', steps).forEach((s) => s.classList.add('is-pulsing'));
      return;
    }

    let firedS = false;
    const io = new IntersectionObserver(
      (entries) => {
        firedS = true;
        entries.forEach((e) => {
          if (e.isIntersecting) {
            steps.classList.add('is-drawn');
            $$('.step', steps).forEach((s) => s.classList.add('is-pulsing'));
          } else {
            $$('.step', steps).forEach((s) => s.classList.remove('is-pulsing'));
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(steps);
    // Failsafe for environments where IO never fires (see initReveal).
    setTimeout(() => {
      if (!firedS) {
        steps.classList.add('is-drawn');
        $$('.step', steps).forEach((s) => s.classList.add('is-pulsing'));
      }
    }, 1600);
  }

  /* 08. Button ripple ---------------------------------------------------- */
  function initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn || prefersReduced) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  }

  /* 09. Hero parallax (rAF) --------------------------------------------- */
  function initParallax() {
    const bg = $('.hero__bg');
    if (!bg || prefersReduced) return;
    let latest = 0, ticking = false;
    const update = () => {
      bg.style.transform = `translate3d(0, ${latest * 0.4}px, 0)`;
      ticking = false;
    };
    window.addEventListener(
      'scroll',
      () => {
        latest = window.scrollY;
        if (!ticking) { requestAnimationFrame(update); ticking = true; }
      },
      { passive: true }
    );
  }

  /* 10. Testimonial 3D tilt --------------------------------------------- */
  function initTilt() {
    if (prefersReduced || window.matchMedia('(pointer: coarse)').matches) return;
    $$('[data-tilt]').forEach((card) => {
      const MAX = 3; // degrees
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          `perspective(700px) rotateY(${px * MAX * 2}deg) rotateX(${-py * MAX * 2}deg) translateY(-2px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* 11. FAQ accordion ---------------------------------------------------- */
  function initFaq() {
    $$('.faq-item').forEach((item) => {
      const q = $('.faq-q', item);
      const a = $('.faq-a', item);
      if (!q || !a) return;
      q.setAttribute('aria-expanded', 'false');
      q.addEventListener('click', () => {
        const open = item.classList.toggle('is-open');
        q.setAttribute('aria-expanded', String(open));
        a.style.maxHeight = open ? `${a.scrollHeight}px` : '0px';
      });
    });
  }

  /* 12. Small bits ------------------------------------------------------- */
  function initSmallBits() {
    // footer year
    $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

    // newsletter + footer signup (no backend, just acknowledge)
    $$('form[data-newsletter]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('input', form);
        if (input && input.value.trim()) {
          toast('You’re on the list, watch your inbox.');
          input.value = '';
        }
      });
    });
  }

  /* 13. Toast ------------------------------------------------------------ */
  let toastEl, toastTimer;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span></span>';
      document.body.appendChild(toastEl);
    }
    $('span', toastEl).textContent = message;
    requestAnimationFrame(() => toastEl.classList.add('is-shown'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-shown'), 3600);
  }

  /* 14. Requirements checker (homepage hero + dedicated page) ------------ */
  function initRequirementsForm() {
    const form = document.getElementById('reqForm');
    if (!form) return;

    const passportCountries = ['United States of America','United Kingdom','Canada','Australia','India','China','Brazil','Mexico','Germany','France','Spain','Italy','Netherlands','Portugal','Ireland','Japan','South Korea','Singapore','Philippines','Indonesia','Malaysia','Thailand','Vietnam','United Arab Emirates','Saudi Arabia','Qatar','South Africa','Nigeria','Kenya','Egypt','Türkiye','Poland','Sweden','Norway','Switzerland','New Zealand','Argentina','Colombia','Chile'];
    const destinations = ['United States','United Kingdom','Schengen Area (Europe)','Canada','Australia','Japan','United Arab Emirates','China','India','Singapore','Thailand','Brazil','South Africa','Mexico','New Zealand','Saudi Arabia'];
    const purposes = ['Tourism / holiday','Business','Study / education','Work / employment','Visiting family & friends','Transit','Medical treatment','Journalism / media','Other'];
    const purposeToType = {
      'Tourism / holiday':'Tourist / visitor','Business':'Business','Study / education':'Student',
      'Work / employment':'Work','Visiting family & friends':'Family reunion','Transit':'Transit',
      'Medical treatment':'Tourist / visitor','Journalism / media':'Business','Other':''
    };
    const usStates = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];

    const fill = (sel, items, placeholder, selected) => {
      let html = placeholder ? '<option value="">' + placeholder + '</option>' : '';
      items.forEach((it) => { html += '<option' + (it === selected ? ' selected' : '') + '>' + it + '</option>'; });
      sel.innerHTML = html;
    };

    const passportSel = $('#hPassport', form);
    const residenceField = $('#fResidence', form);
    const residenceSel = $('#hResidence', form);
    const purposeSel = $('#hPurpose', form);
    const dest1 = $('#hDest1', form);

    fill(passportSel, passportCountries, null, 'United States of America');
    fill(residenceSel, usStates, 'Select One');
    fill(purposeSel, purposes, 'Select One');
    fill(dest1, destinations, 'Select Destination');

    const syncResidence = () => residenceField.classList.toggle('is-hidden', passportSel.value !== 'United States of America');
    syncResidence();
    passportSel.addEventListener('change', syncResidence);

    const destWrap = $('#destWrap', form);
    const addBtn = $('#addDest', form);
    let destCount = 1;
    addBtn.addEventListener('click', () => {
      if (destCount >= 3) return;
      destCount++;
      const id = 'hDest' + destCount;
      const field = document.createElement('div');
      field.className = 'field hero-dest';
      field.innerHTML =
        '<label for="' + id + '">And then to</label>' +
        '<button type="button" class="hero-dest__remove" aria-label="Remove this destination">&times; remove</button>' +
        '<select class="select dest-select" id="' + id + '"></select>';
      destWrap.appendChild(field);
      fill($('select', field), destinations, 'Select Destination');
      $('.hero-dest__remove', field).addEventListener('click', () => { field.remove(); destCount--; addBtn.style.display = ''; });
      if (destCount >= 3) addBtn.style.display = 'none';
    });

    form.addEventListener('change', (e) => {
      const f = e.target.closest('.field');
      if (f && f.classList.contains('has-error') && e.target.value) f.classList.remove('has-error');
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true, firstBad = null;
      const flag = (sel) => {
        const f = sel.closest('.field');
        f.classList.add('has-error', 'shake');
        setTimeout(() => f.classList.remove('shake'), 400);
        ok = false; firstBad = firstBad || sel;
      };
      if (!dest1.value) flag(dest1);
      if (!purposeSel.value) flag(purposeSel);
      if (!ok) { if (firstBad) firstBad.focus(); return; }

      const chosen = [];
      $$('.dest-select', form).forEach((s) => { if (s.value) chosen.push(s.value); });
      const type = purposeToType[purposeSel.value] || '';
      try {
        localStorage.setItem('aiov_trip', JSON.stringify({
          passport: passportSel.value,
          residence: residenceField.classList.contains('is-hidden') ? '' : residenceSel.value,
          destinations: chosen, purpose: purposeSel.value
        }));
        let app = {};
        try { app = JSON.parse(localStorage.getItem('aiov_application') || '{}'); } catch (e2) { app = {}; }
        app.aDest = chosen[0] || '';
        if (type) app.aType = type;
        app.aNat = passportSel.value;
        localStorage.setItem('aiov_application', JSON.stringify(app));
      } catch (err) {}
      window.location.href = 'apply.html';
    });
  }

  /* Boot ----------------------------------------------------------------- */
  onReady(() => {
    initStickyNav();
    initMobileMenu();
    initNavMenus();
    initActiveLink();
    initReveal();
    initCounters();
    initSteps();
    initRipple();
    initParallax();
    initTilt();
    initFaq();
    initRequirementsForm();
    initSmallBits();
  });

  // Expose a tiny public API for page-specific scripts.
  window.AIOV = { toast, $, $$, prefersReduced };
})();
