const APP_VERSION = document.documentElement.getAttribute('data-build-version') ?? 'dev';

bootstrap();

async function bootstrap() {
  try {
    const module = await import(`./messages.js?v=${APP_VERSION}`);
    initializeApp(module);
  } catch (error) {
    console.error('Gagal memuat data pesan', error);
    const appRoot = document.querySelector('.app');
    if (appRoot) {
      appRoot.innerHTML =
        '<div class="app__error" role="alert">Maaf, halaman nggak kebuka sempurna. Coba reload atau cek koneksi ya.</div>';
    }
  }
}

function initializeApp({ messages, categoryOrderCycle }) {
  const STORAGE_KEYS = {
    progress: 'apology_progress',
    pointer: 'apology_pointer'
  };

  const SHOULD_PERSIST_PROGRESS = false;

  const FILL_BUTTON_LABELS = [
    'maaff babyy',
    'maaff sayangg',
    'aku minta maaff',
    'maaff cantik akuu',
    'mamas minta maaff',
    'maaff yaa cantikk'
  ];
  const EMOJI_CONFETTI_SYMBOLS = ['😘', '❣️'];

  let lastFillButtonLabel = '';
  let activeEmojiConfetti;
  let emojiConfettiTimeout;

  const state = {
    progress: 0,
    currentCategoryIndex: 0,
    currentMessageIndices: new Map(),
    displayedHistory: [],
    lastInteraction: 0,
    isCompleting: false
  };

  const elements = {
    app: document.querySelector('.app'),
    intro: document.querySelector('.intro'),
    introStart: document.querySelector('.intro__start'),
    fillButton: document.getElementById('fill-button'),
    meterValue: document.getElementById('meter-value'),
    meterFill: document.getElementById('meter-fill'),
    meter: document.querySelector('.meter'),
    messageList: document.getElementById('message-list'),
    completion: document.getElementById('completion'),
    completionText: document.getElementById('completion-text'),
    ctaGroup: document.getElementById('cta-group'),
    resetButton: document.getElementById('reset-progress'),
    hugModal: document.getElementById('hug-modal'),
    talkDialog: document.getElementById('talk-dialog'),
    catImage: document.getElementById('cat-image'),
    heartTemplate: document.getElementById('heart-template'),
    messageTemplate: document.getElementById('message-template')
  };

  const CAT_ASSETS = {
    idle: {
      primary: 'assets/cat/cat-8.png',
      fallback: 'assets/cat/cat_idle.svg',
      alt: 'Ilustrasi kucing sedih tapi berharap'
    },
    hug: {
      primary: 'assets/cat/cat-9.png',
      fallback: 'assets/cat/cat_hug.svg',
      alt: 'Kucing membuka tangan untuk peluk'
    }
  };

  const totalMessages = categoryOrderCycle.reduce((total, category) => {
    return total + (messages[category]?.length ?? 0);
  }, 0);
  const stepValue = totalMessages ? Math.ceil(100 / totalMessages) : 100;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.body.classList.add('reduced-motion');
  }

  function attachImageFallback(image) {
    if (!image) return;
    image.addEventListener('error', () => {
      if (image.dataset.usingFallback === 'true') return;
      if (image.dataset.fallbackSrc) {
        image.dataset.usingFallback = 'true';
        image.src = image.dataset.fallbackSrc;
      }
    });
  }

  function preloadImage(src) {
    if (!src || typeof Image === 'undefined') return;
    const image = new Image();
    image.src = src;
  }

  function setCatMood(mood, options = {}) {
    if (!elements.catImage) return;
    const asset = mood === 'hug' ? CAT_ASSETS.hug : CAT_ASSETS.idle;
    const transform = options.transform ?? (mood === 'hug' ? 'translateY(-4px) scale(1.02)' : 'translateY(0)');
    const changedPrimary = elements.catImage.dataset.primarySrc !== asset.primary;

    elements.catImage.dataset.fallbackSrc = asset.fallback;
    elements.catImage.alt = asset.alt;
    elements.catImage.style.transform = transform;

    if (changedPrimary || options.forceReload) {
      elements.catImage.dataset.primarySrc = asset.primary;
      elements.catImage.dataset.usingFallback = 'false';
      elements.catImage.src = asset.primary;
    }
  }

  function setRandomFillButtonLabel() {
    if (!elements.fillButton || FILL_BUTTON_LABELS.length === 0) return;
    let nextLabel = lastFillButtonLabel;
    if (FILL_BUTTON_LABELS.length === 1) {
      nextLabel = FILL_BUTTON_LABELS[0];
    } else {
      while (nextLabel === lastFillButtonLabel) {
        nextLabel = FILL_BUTTON_LABELS[Math.floor(Math.random() * FILL_BUTTON_LABELS.length)];
      }
    }
    elements.fillButton.textContent = nextLabel;
    lastFillButtonLabel = nextLabel;
  }

  function shootEmojiConfetti(triggerElement) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (prefersReducedMotion) return;
    if (emojiConfettiTimeout) {
      clearTimeout(emojiConfettiTimeout);
      emojiConfettiTimeout = undefined;
    }
    if (activeEmojiConfetti) {
      activeEmojiConfetti.remove();
      activeEmojiConfetti = undefined;
    }

    const rect = triggerElement?.getBoundingClientRect?.();
    const container = document.createElement('div');
    container.className = 'emoji-confetti';
    const originX = rect ? rect.left + rect.width / 2 + window.scrollX : window.innerWidth / 2 + window.scrollX;
    const originY = rect ? rect.top + rect.height / 2 + window.scrollY : window.innerHeight / 2 + window.scrollY;
    container.style.left = `${originX}px`;
    container.style.top = `${originY}px`;
    container.style.transform = 'translate(-50%, -50%)';

    const pieceTotal = 26;
    for (let i = 0; i < pieceTotal; i += 1) {
      const piece = document.createElement('span');
      piece.className = 'emoji-confetti__piece';
      piece.textContent = EMOJI_CONFETTI_SYMBOLS[Math.floor(Math.random() * EMOJI_CONFETTI_SYMBOLS.length)];
      const angle = Math.random() * Math.PI * 2;
      const distance = 90 + Math.random() * 80;
      const duration = 900 + Math.random() * 500;
      piece.style.setProperty('--confetti-x', `${Math.cos(angle) * distance}px`);
      piece.style.setProperty('--confetti-y', `${Math.sin(angle) * distance}px`);
      piece.style.setProperty('--confetti-rotate', `${(Math.random() * 120 - 60).toFixed(2)}deg`);
      piece.style.animationDuration = `${duration}ms`;
      piece.style.animationDelay = `${Math.random() * 120}ms`;
      container.append(piece);
    }

    document.body.append(container);
    activeEmojiConfetti = container;
    requestAnimationFrame(() => container.classList.add('emoji-confetti--active'));
    emojiConfettiTimeout = window.setTimeout(() => {
      container.remove();
      if (activeEmojiConfetti === container) {
        activeEmojiConfetti = undefined;
        emojiConfettiTimeout = undefined;
      }
    }, 1600);
  }

  attachImageFallback(elements.catImage);
  const modalCatImage = elements.hugModal?.querySelector('.modal__image');
  if (modalCatImage) {
    modalCatImage.dataset.fallbackSrc = CAT_ASSETS.hug.fallback;
    attachImageFallback(modalCatImage);
  }

  setCatMood('idle', { forceReload: true });
  preloadImage(CAT_ASSETS.hug.primary);

  function clearStoredProgress() {
    localStorage.removeItem(STORAGE_KEYS.progress);
    localStorage.removeItem(STORAGE_KEYS.pointer);
  }

  function hydrateStateFromStorage() {
    if (!SHOULD_PERSIST_PROGRESS) {
      clearStoredProgress();
      updateMeter();
      return;
    }

    const storedProgress = Number(localStorage.getItem(STORAGE_KEYS.progress));
    const storedPointer = localStorage.getItem(STORAGE_KEYS.pointer);

    if (!Number.isNaN(storedProgress) && storedProgress > 0) {
      state.progress = Math.min(storedProgress, 100);
    }

    if (storedPointer) {
      try {
        const parsed = JSON.parse(storedPointer);
        state.currentCategoryIndex = parsed.currentCategoryIndex ?? 0;
        state.currentMessageIndices = new Map(parsed.currentMessageIndices ?? []);
        state.displayedHistory = parsed.displayed ?? [];
        state.displayedHistory.forEach(({ category, index }) => {
          const text = messages[category]?.[index];
          if (text) {
            renderMessage(category, text, false);
          }
        });
        if (state.progress >= 100) {
          triggerCompletion();
        }
      } catch (error) {
        console.warn('Gagal memuat progres', error);
        resetProgress();
      }
    }

    updateMeter();
  }

  function persistState() {
    if (!SHOULD_PERSIST_PROGRESS) {
      return;
    }
    const payload = {
      currentCategoryIndex: state.currentCategoryIndex,
      currentMessageIndices: Array.from(state.currentMessageIndices.entries()),
      displayed: state.displayedHistory
    };
    localStorage.setItem(STORAGE_KEYS.progress, String(state.progress));
    localStorage.setItem(STORAGE_KEYS.pointer, JSON.stringify(payload));
  }

  function nextMessage() {
    if (state.isCompleting) return null;
    const displayed = [];

    for (let attempt = 0; attempt < categoryOrderCycle.length; attempt += 1) {
      const categoryIndex = (state.currentCategoryIndex + attempt) % categoryOrderCycle.length;
      const category = categoryOrderCycle[categoryIndex];
      const currentIndex = state.currentMessageIndices.get(category) ?? 0;
      const messagesForCategory = messages[category] ?? [];
      const nextText = messagesForCategory[currentIndex];

      if (nextText) {
        state.currentCategoryIndex = (categoryIndex + 1) % categoryOrderCycle.length;
        state.currentMessageIndices.set(category, currentIndex + 1);
        displayed.push({ category, index: currentIndex });
        return { category, text: nextText, displayed };
      }
    }

    return null;
  }

  function updateMeter() {
    const capped = Math.min(state.progress, 100);
    elements.meterValue.textContent = `${capped}%`;
    elements.meterFill.style.width = `${capped}%`;
    elements.meter.setAttribute('aria-valuenow', String(capped));
    elements.meter.classList.toggle('meter--full', capped >= 100);
    elements.app.dataset.state = capped >= 100 ? 'complete' : 'active';
    const transform = capped >= 100
      ? (state.isCompleting ? 'translateY(-6px) scale(1.05)' : 'translateY(-4px) scale(1.02)')
      : 'translateY(0)';
    setCatMood(capped >= 100 ? 'hug' : 'idle', { transform });
    elements.meter.parentElement.querySelector('.meter__glow').style.opacity = capped > 0 ? 1 : 0;
  }

  function renderMessage(category, text, shouldScroll = true) {
    const template = elements.messageTemplate.content.cloneNode(true);
    const article = template.querySelector('.message');
    const messageText = template.querySelector('.message__text');

    article.dataset.category = category;
    messageText.textContent = text;

    if (!shouldScroll) {
      article.style.animation = 'none';
      requestAnimationFrame(() => {
        article.style.animation = '';
      });
    }

    elements.messageList.append(article);
    if (shouldScroll) {
      article.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'end' });
    }
  }

  function triggerHearts() {
    const count = prefersReducedMotion ? 0 : Math.floor(Math.random() * 5) + 2; // 2-6
    if (count <= 0) return;
    let container = document.querySelector('.heart-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'heart-container';
      elements.app.append(container);
    }

    for (let i = 0; i < count; i += 1) {
      const heart = elements.heartTemplate.content.firstElementChild.cloneNode(true);
      const size = 24 + Math.random() * 20;
      heart.style.width = `${size}px`;
      heart.style.left = `${Math.random() * 90 + 5}%`;
      heart.style.bottom = '10%';
      heart.style.animationDuration = `${800 + Math.random() * 600}ms`;
      heart.style.transform = `rotate(${(Math.random() - 0.5) * 12}deg)`;
      container.append(heart);
      setTimeout(() => heart.remove(), 1200);
    }
  }

  function handleInteraction(origin = 'ambient') {
    const now = Date.now();
    if (now - state.lastInteraction < 500) return;
    state.lastInteraction = now;

    if (origin === 'button') {
      setRandomFillButtonLabel();
    }

    if (state.progress >= 100) {
      triggerCompletion();
      return;
    }

    const result = nextMessage();
    if (!result) {
      state.progress = 100;
      updateMeter();
      triggerCompletion();
      persistState([]);
      return;
    }

    state.progress = Math.min(state.progress + stepValue, 100);
    renderMessage(result.category, result.text);
    updateMeter();
    triggerHearts();
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    state.displayedHistory.push({ category: result.category, index: state.currentMessageIndices.get(result.category) - 1 });
    persistState();

    if (state.progress >= 100) {
      triggerCompletion();
    }
  }

  function triggerCompletion() {
    if (state.isCompleting) return;
    state.isCompleting = true;

    elements.completion.hidden = false;
    const finalText = messages.final?.[0] ?? 'Aku ingin memperbaiki semuanya dengan kamu.';
    elements.completionText.textContent = finalText;
    elements.ctaGroup.innerHTML = '';
    const hugButton = createCTAButton('Peluk Aku', () => openDialog(elements.hugModal));
    const talkButton = createCTAButton('Kita Ngobrol Yuk?', () => openDialog(elements.talkDialog));
    const celebrateButton = createCTAButton('Mwaaa😘❣️', (event, button) => {
      shootEmojiConfetti(button);
    });
    elements.ctaGroup.append(hugButton, talkButton, celebrateButton);
    setCatMood('hug', { transform: 'translateY(-6px) scale(1.05)', forceReload: true });
    persistState();
  }

  function createCTAButton(label, onClick) {
    const button = document.createElement('button');
    button.className = 'button button--primary';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', (event) => {
      onClick?.(event, button);
    });
    return button;
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === 'function') {
      dialog.addEventListener('cancel', () => dialog.close(), { once: true });
      dialog.addEventListener('close', () => {
        const active = document.querySelector('[data-active-dialog]');
        if (active) {
          active.focus();
          active.removeAttribute('data-active-dialog');
        }
      }, { once: true });
      const trigger = document.activeElement;
      if (trigger) trigger.setAttribute('data-active-dialog', 'true');
      if (dialog === elements.hugModal && modalCatImage) {
        modalCatImage.dataset.usingFallback = 'false';
        modalCatImage.src = CAT_ASSETS.hug.primary;
      }
      dialog.showModal();
      trapFocus(dialog);
    }
  }

  function trapFocus(dialog) {
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(dialog.querySelectorAll(focusableSelectors));
    if (focusable.length) {
      focusable[0].focus();
    }

    function handleKey(event) {
      if (event.key === 'Tab') {
        const index = focusable.indexOf(document.activeElement);
        if (event.shiftKey && index === 0) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && index === focusable.length - 1) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    }

    dialog.addEventListener('keydown', handleKey);
    dialog.addEventListener('close', () => dialog.removeEventListener('keydown', handleKey), { once: true });
  }

  function resetProgress(confirmReset = true) {
    if (confirmReset && !window.confirm('Reset progres? Semua pesan akan mulai lagi dari awal.')) {
      return;
    }
    state.progress = 0;
    state.currentCategoryIndex = 0;
    state.currentMessageIndices.clear();
    state.displayedHistory = [];
    state.isCompleting = false;
    state.lastInteraction = 0;
    elements.messageList.innerHTML = '';
    elements.completion.hidden = true;
    setCatMood('idle');
    updateMeter();
    clearStoredProgress();
  }

  function setupIntro() {
    const startExperience = () => {
      elements.intro.setAttribute('hidden', '');
      elements.app.dataset.state = state.progress > 0 ? 'active' : 'active';
    };
    elements.introStart.addEventListener('click', startExperience);
    elements.intro.addEventListener('click', (event) => {
      if (event.target === elements.intro) {
        startExperience();
      }
    });
  }

  function setupCatIdleAnimations() {
    let blinkTimeout;
    function scheduleBlink() {
      const delay = 4000 + Math.random() * 2000;
      blinkTimeout = setTimeout(() => {
        elements.catImage.classList.add('cat--blink');
        setTimeout(() => elements.catImage.classList.remove('cat--blink'), prefersReducedMotion ? 1 : 160);
        scheduleBlink();
      }, delay);
    }
    scheduleBlink();
    window.addEventListener('beforeunload', () => clearTimeout(blinkTimeout));
  }

  function setupEventListeners() {
    document.addEventListener('click', (event) => {
      if (elements.intro.hasAttribute('hidden')) {
        const isButton = event.target instanceof HTMLElement && event.target.closest('button');
        if (!isButton) {
          handleInteraction();
        }
      }
    });

    elements.fillButton.addEventListener('click', () => handleInteraction('button'));
    elements.resetButton.addEventListener('click', () => resetProgress(false));
    elements.app.addEventListener('keydown', (event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        if (document.activeElement === elements.fillButton) {
          event.preventDefault();
          handleInteraction('button');
        }
      }
    });
  }

  setupIntro();
  hydrateStateFromStorage();
  setupCatIdleAnimations();
  setupEventListeners();
  setRandomFillButtonLabel();

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('message--visible');
        }
      });
    }, { threshold: 0.1 });

    elements.messageList.addEventListener('DOMNodeInserted', (event) => {
      if (event.target instanceof HTMLElement && event.target.matches('.message')) {
        observer.observe(event.target);
      }
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (elements.hugModal.open) elements.hugModal.close('cancel');
      if (elements.talkDialog.open) elements.talkDialog.close('cancel');
    }
  });
}
