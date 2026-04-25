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
  let scrollRaf      = null;
  let scrollTimer    = null;
  let scrollPaused   = false;
  let scrollActive   = false;
  let scrollFromPx   = 0;
  let scrollToPx     = 0;
  let scrollSegDur   = 0;
  let scrollSegStart = null; // performance.now() when current segment started

  function scrollStep(now) {
    if (!scrollActive || scrollPaused) return;
    const elapsed = now - scrollSegStart;
    const frac    = Math.min(elapsed / scrollSegDur, 1);
    const ease    = frac < 0.5 ? 2 * frac * frac : -1 + (4 - 2 * frac) * frac;
    modalBody.scrollTop = scrollFromPx + ease * (scrollToPx - scrollFromPx);
    if (frac < 1) {
      scrollRaf = requestAnimationFrame(scrollStep);
    } else {
      scrollActive   = false;
      scrollSegStart = null;
    }
  }

  function stopAutoScroll() {
    clearTimeout(scrollTimer);
    cancelAnimationFrame(scrollRaf);
    scrollTimer    = null;
    scrollRaf      = null;
    scrollActive   = false;
    scrollPaused   = false;
    scrollSegStart = null;
  }

  function pauseScroll() {
    if (!scrollActive || scrollPaused || scrollSegStart === null) return;
    scrollPaused = true;
    cancelAnimationFrame(scrollRaf);
    scrollRaf = null;
    // save current px as new start, shrink remaining duration
    const elapsed  = performance.now() - scrollSegStart;
    const done     = Math.min(elapsed / scrollSegDur, 1);
    scrollFromPx   = modalBody.scrollTop;          // exact current position
    scrollSegDur   = scrollSegDur * (1 - done);    // only remaining time
    scrollSegStart = null;
  }

  function resumeScroll() {
    if (!scrollPaused || !scrollActive) return;
    scrollPaused   = false;
    if (scrollSegDur <= 0 || scrollFromPx >= scrollToPx) return;
    scrollSegStart = performance.now();             // fresh start from current px
    scrollRaf      = requestAnimationFrame(scrollStep);
  }

  function autoScrollBody(duration, delay = 0) {
    stopAutoScroll();

    requestAnimationFrame(() => {
      const maxScroll = modalBody.scrollHeight - modalBody.clientHeight;
      if (maxScroll <= 0) return;

      modalBody.scrollTop = 0;
      scrollFromPx = 0;
      scrollToPx   = maxScroll;
      scrollSegDur = duration;
      scrollActive = true;

      scrollTimer = setTimeout(() => {
        scrollSegStart = performance.now();
        scrollRaf = requestAnimationFrame(scrollStep);
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
