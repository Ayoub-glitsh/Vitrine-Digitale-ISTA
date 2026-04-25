(() => {
  const slides = document.querySelectorAll('.slide');
  const currentNumEl = document.getElementById('currentNum');
  const progressFill = document.getElementById('progressFill');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const dotsContainer = document.getElementById('timelineDots');

  const TOTAL = slides.length;
  const AUTO_DELAY = 6000;
  const PROGRESS_INTERVAL = 50;

  const YEARS = ['2009', '2010', '2012', '2014', '2016', '2023', '2024'];

  let current = 0;
  let progressValue = 0;
  let progressTimer = null;
  let autoTimer = null;
  let autoModalTimer = null;
  let isAnimating = false;
  let sliderPaused  = false;
  let pausedAt      = 0;
  let remainingTime = AUTO_DELAY;

  // ── Build timeline dots ──
  YEARS.forEach((year, i) => {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('data-year', year);
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  function getDots() {
    return dotsContainer.querySelectorAll('.dot');
  }

  // ── Go to slide ──
  function goTo(index) {
    if (isAnimating || index === current) return;
    isAnimating = true;

    slides[current].classList.remove('active');
    getDots()[current].classList.remove('active');

    current = (index + TOTAL) % TOTAL;

    slides[current].classList.add('active');
    getDots()[current].classList.add('active');

    updateCounter();
    resetProgress();

    setTimeout(() => { isAnimating = false; }, 900);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  // ── Counter ──
  function updateCounter() {
    const num = String(current + 1).padStart(2, '0');
    currentNumEl.style.opacity = '0';
    setTimeout(() => {
      currentNumEl.textContent = num;
      currentNumEl.style.opacity = '1';
    }, 200);
  }

  // ── Progress ──
  function resetProgress() {
    clearInterval(progressTimer);
    clearTimeout(autoTimer);
    clearTimeout(autoModalTimer);
    clearAutoTabTimers();
    sliderPaused  = false;
    remainingTime = AUTO_DELAY;
    progressValue = 0;
    progressFill.style.width = '0%';
    startProgress();
  }

  const TAB_DURATION  = 4000; // ms default per tab
  const TAB_NAMES     = ['objectifs', 'presentation', 'fonctionnalites', 'technologies', 'benefices'];
  const TAB_DURATIONS = { objectifs: 7000, presentation: 4000, fonctionnalites: 4000, technologies: 4000, benefices: 4000 };
  let   autoTabTimers = [];

  function clearAutoTabTimers() {
    autoTabTimers.forEach(t => clearTimeout(t));
    autoTabTimers = [];
  }

  function startProgress() {
    remainingTime = AUTO_DELAY;
    const step = (PROGRESS_INTERVAL / AUTO_DELAY) * 100;

    progressTimer = setInterval(() => {
      progressValue += step;
      if (progressValue >= 100) {
        progressValue = 100;
        progressFill.style.width = '100%';
        clearInterval(progressTimer);
      } else {
        progressFill.style.width = progressValue + '%';
      }
    }, PROGRESS_INTERVAL);

    autoTimer = setTimeout(() => {
      if (current === 0) {
        triggerAutoModal();
      } else {
        next();
      }
    }, AUTO_DELAY);
  }

  const modalBody = document.querySelector('.modal-body');
  let   scrollTimer    = null;
  let   scrollRaf      = null;
  let   scrollPaused   = false;
  let   scrollProgress = 0;   // 0..1, where we are in the scroll
  let   scrollDuration = 0;   // total duration for current scroll
  let   scrollMaxPx    = 0;   // max scrollable px for current tab
  let   scrollStart    = null; // performance.now() when scroll last resumed

  function stopAutoScroll() {
    clearTimeout(scrollTimer);
    cancelAnimationFrame(scrollRaf);
    scrollTimer = null;
    scrollRaf   = null;
  }

  function pauseScroll() {
    if (scrollPaused) return;
    scrollPaused = true;
    cancelAnimationFrame(scrollRaf);
    scrollRaf = null;
    // save how far we got
    if (scrollStart !== null && scrollDuration > 0) {
      const elapsed = performance.now() - scrollStart;
      scrollProgress = Math.min(scrollProgress + elapsed / scrollDuration, 1);
      scrollDuration = scrollDuration * (1 - (scrollProgress - (scrollProgress - elapsed / scrollDuration)));
    }
  }

  function resumeScroll() {
    if (!scrollPaused) return;
    scrollPaused = false;
    if (scrollDuration <= 0 || scrollProgress >= 1) return;
    const remaining = scrollDuration * (1 - scrollProgress);
    const startPx   = modalBody.scrollTop;
    scrollStart      = performance.now();

    function step(now) {
      const elapsed  = now - scrollStart;
      const frac     = Math.min(elapsed / remaining, 1);
      const ease     = frac < 0.5 ? 2 * frac * frac : -1 + (4 - 2 * frac) * frac;
      modalBody.scrollTop = startPx + ease * (scrollMaxPx - startPx);
      if (frac < 1) scrollRaf = requestAnimationFrame(step);
      else scrollProgress = 1;
    }
    scrollRaf = requestAnimationFrame(step);
  }

  function autoScrollBody(duration, delay = 0) {
    stopAutoScroll();
    scrollProgress = 0;
    scrollDuration = duration;
    scrollPaused   = false;

    requestAnimationFrame(() => {
      const el = modalBody;
      scrollMaxPx = el.scrollHeight - el.clientHeight;
      if (scrollMaxPx <= 0) return;

      el.scrollTop = 0;

      scrollTimer = setTimeout(() => {
        scrollStart = performance.now();

        function step(now) {
          if (scrollPaused) return;
          const elapsed  = now - scrollStart;
          const progress = Math.min(elapsed / duration, 1);
          const ease     = progress < 0.5
            ? 2 * progress * progress
            : -1 + (4 - 2 * progress) * progress;
          el.scrollTop   = ease * scrollMaxPx;
          scrollProgress = progress;
          if (progress < 1) scrollRaf = requestAnimationFrame(step);
        }

        scrollRaf = requestAnimationFrame(step);
      }, delay);
    });
  }

  function switchTab(tabName) {
    stopAutoScroll();
    scrollPaused = false;
    tabs.forEach(t => { t.classList.remove('active'); t.classList.remove('auto-active'); });
    contents.forEach(c => c.classList.remove('active'));
    const t = document.querySelector(`.modal-tab[data-tab="${tabName}"]`);
    const c = document.getElementById('tab-' + tabName);
    if (t) {
      t.classList.add('active');
      void t.offsetWidth; // reflow to restart animation
      t.style.setProperty('--tab-dur', (TAB_DURATIONS[tabName] || TAB_DURATION) + 'ms');
      t.classList.add('auto-active');
    }
    if (c) {
      c.classList.add('active');
      const delay = tabName === 'objectifs' ? 2000 : 0;
      autoScrollBody((TAB_DURATIONS[tabName] || TAB_DURATION) * 0.8, delay);
    }
  }

  function triggerAutoModal() {
    openBtn.classList.add('auto-click');
    setTimeout(() => openBtn.classList.remove('auto-click'), 600);

    setTimeout(() => {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      switchTab(TAB_NAMES[0]);
      startModalTour();
    }, 300);
  }

  // ── Pause slider auto-advance on mouse hover ──
  function pauseSlider() {
    if (sliderPaused) return;
    sliderPaused = true;
    pausedAt = performance.now();
    clearInterval(progressTimer);
    clearTimeout(autoTimer);
  }

  function resumeSlider() {
    if (!sliderPaused) return;
    sliderPaused = false;
    const elapsed = performance.now() - pausedAt;
    remainingTime = Math.max(remainingTime - elapsed, 0);

    progressTimer = setInterval(() => {
      progressValue += (PROGRESS_INTERVAL / AUTO_DELAY) * 100;
      if (progressValue >= 100) {
        progressValue = 100;
        progressFill.style.width = '100%';
        clearInterval(progressTimer);
      } else {
        progressFill.style.width = progressValue + '%';
      }
    }, PROGRESS_INTERVAL);

    autoTimer = setTimeout(() => {
      if (current === 0) triggerAutoModal();
      else next();
    }, remainingTime);
  }

  const sliderWrapper = document.querySelector('.slider-wrapper');
  sliderWrapper.addEventListener('mouseenter', pauseSlider);
  sliderWrapper.addEventListener('mouseleave', resumeSlider);
  prevBtn.addEventListener('click', prev);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
  });

  // Touch swipe
  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
  }, { passive: true });

  // ── Init ──
  slides[current].classList.add('active');
  updateCounter();
  startProgress();

  // ── Modal Musée Cinématographique ──
  const openBtn   = document.getElementById('openMuseeModal');
  const modal     = document.getElementById('museeModal');
  const closeBtn  = document.getElementById('closeMuseeModal');
  const tabs      = document.querySelectorAll('.modal-tab');
  const contents  = document.querySelectorAll('.tab-content');

  function openModal(e) {
    e.preventDefault();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    stopModalTour();
    clearTimeout(autoModalTimer);
    clearAutoTabTimers();
    stopAutoScroll();
    scrollPaused = false;
    modalPaused  = false;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      stopModalTour();
      clearAutoTabTimers();
      clearTimeout(autoModalTimer);
      stopAutoScroll();
      tabs.forEach(t => { t.classList.remove('active'); t.classList.remove('auto-active'); });
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // ── Modal auto-tour engine ──
  // A single ticker drives tab switching + close, respecting pause state.
  let modalPaused        = false;
  let modalTourActive    = false;
  let modalTourElapsed   = 0;      // ms accumulated (excluding paused time)
  let modalTourLastTick  = null;   // performance.now() of last tick
  let modalTourRaf       = null;
  let modalTourSchedule  = [];     // [{at: ms, fn: callback}]

  function buildTourSchedule() {
    modalTourSchedule = [];
    let offset = 0;
    TAB_NAMES.forEach((name, i) => {
      if (i === 0) { offset += TAB_DURATIONS[name] || TAB_DURATION; return; }
      const at = offset;
      modalTourSchedule.push({ at, fn: () => switchTab(name) });
      offset += TAB_DURATIONS[name] || TAB_DURATION;
    });
    // close at end
    modalTourSchedule.push({ at: offset, fn: () => { closeModal(); setTimeout(() => next(), 400); } });
  }

  function tickTour(now) {
    if (!modalTourActive || modalPaused) return;
    const delta = modalTourLastTick !== null ? now - modalTourLastTick : 0;
    modalTourLastTick = now;
    modalTourElapsed += delta;

    // fire any scheduled events that are due
    while (modalTourSchedule.length && modalTourSchedule[0].at <= modalTourElapsed) {
      const event = modalTourSchedule.shift();
      event.fn();
      if (!modalTourActive) return; // closeModal may have stopped tour
    }

    if (modalTourSchedule.length > 0) {
      modalTourRaf = requestAnimationFrame(tickTour);
    }
  }

  function startModalTour() {
    modalTourActive   = true;
    modalTourElapsed  = 0;
    modalTourLastTick = null;
    buildTourSchedule();
    modalTourRaf = requestAnimationFrame(tickTour);
  }

  function stopModalTour() {
    modalTourActive = false;
    cancelAnimationFrame(modalTourRaf);
    modalTourRaf = null;
  }

  function pauseModal() {
    if (modalPaused) return;
    modalPaused = true;
    // accumulate elapsed before pausing
    if (modalTourLastTick !== null) {
      modalTourElapsed += performance.now() - modalTourLastTick;
      modalTourLastTick = null;
    }
    cancelAnimationFrame(modalTourRaf);
    pauseScroll();
  }

  function resumeModal() {
    if (!modalPaused) return;
    modalPaused = false;
    modalTourLastTick = performance.now();
    if (modalTourActive && modalTourSchedule.length > 0) {
      modalTourRaf = requestAnimationFrame(tickTour);
    }
    resumeScroll();
  }

  const museeModal = document.getElementById('museeModal');
  museeModal.addEventListener('mouseenter', pauseModal);
  museeModal.addEventListener('mouseleave', resumeModal);

  // Stop auto-scroll if user manually scrolls (they took control)
  modalBody.addEventListener('wheel',      stopAutoScroll, { passive: true });
  modalBody.addEventListener('touchstart', stopAutoScroll, { passive: true });

})();
