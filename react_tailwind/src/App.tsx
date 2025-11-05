"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categoryOrderCycle, messages } from '../messages';

const STORAGE_KEYS = {
  progress: 'apology_progress',
  pointer: 'apology_pointer'
};

type Category = keyof typeof messages;

type DisplayedPointer = {
  category: Category;
  index: number;
};

type Heart = {
  id: number;
  left: number;
  size: number;
  duration: number;
};

const useReducedMotion = () => {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefers(query.matches);
    const handler = (event: MediaQueryListEvent) => setPrefers(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);
  return prefers;
};

const totalMessages = categoryOrderCycle.reduce((total, category) => {
  const list = messages[category];
  return total + (Array.isArray(list) ? list.length : 0);
}, 0);
const STEP_VALUE = totalMessages ? Math.ceil(100 / totalMessages) : 100;

const HEART_URL = 'https://www.svgrepo.com/show/535436/heart.svg';

const CAT_ASSETS = {
  idle: {
    primary: '/assets/cat/cat-8.png',
    fallback: '/assets/cat/cat_idle.svg',
    alt: 'Kucing pastel dengan ekspresi sedih namun berharap'
  },
  hug: {
    primary: '/assets/cat/cat-9.png',
    fallback: '/assets/cat/cat_hug.svg',
    alt: 'Kucing pastel membuka tangan untuk peluk'
  }
} as const;

const labelByCategory: Record<Category, string> = {
  acknowledgements: 'Mengakui Perasaanmu',
  accountability: 'Aku Bertanggung Jawab',
  intentions: 'Niat dan Perbaikan',
  softeners: 'Pelan-pelan Lembut',
  aww: 'Sedikit Gemas',
  final: 'Penutup Hangat'
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function ApologyMeter({ value, onFill, onComplete }: { value: number; onFill: () => void; onComplete?: () => void }) {
  useEffect(() => {
    if (value >= 100) {
      onComplete?.();
    }
  }, [value, onComplete]);
  return (
    <section className="glass-card p-6 space-y-4" aria-labelledby="meter-label">
      <div className="flex items-center justify-between gap-4">
        <h2 id="meter-label" className="text-xl font-semibold text-[#432946]">Apology Meter</h2>
        <span className="text-lg font-semibold" aria-live="polite">{value}%</span>
      </div>
      <div
        className="relative h-3.5 w-full overflow-hidden rounded-full bg-white/60"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-describedby="meter-label"
      >
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-pink-400 to-pink-300 transition-[width] duration-500"
          style={{ width: `${value}%` }}
        />
        <div className="pointer-events-none absolute -inset-2 rounded-full bg-pink-200/60 blur-xl" aria-hidden />
      </div>
      <button
        type="button"
        className="button-primary"
        onClick={onFill}
        aria-describedby="fill-hint"
      >
        Isi dengan Usaha
      </button>
      <p id="fill-hint" className="text-sm text-[#6c4c70]">
        Tap atau klik ruang kosong juga bisa untuk maju satu langkah.
      </p>
    </section>
  );
}

export function CatCharacter({ mood, celebrate = false }: { mood: 'sad' | 'hopeful' | 'hug'; celebrate?: boolean }) {
  const assetKey = mood === 'hug' ? 'hug' : 'idle';
  const asset = CAT_ASSETS[assetKey];
  const [source, setSource] = useState(asset.primary);
  const fallbackUsed = useRef(false);

  useEffect(() => {
    fallbackUsed.current = false;
    setSource(asset.primary);
  }, [asset.primary]);

  useEffect(() => {
    const preloader = new Image();
    preloader.src = CAT_ASSETS.hug.primary;
    return () => {
      preloader.src = '';
    };
  }, []);

  const handleError = useCallback(() => {
    if (fallbackUsed.current) return;
    fallbackUsed.current = true;
    setSource(asset.fallback);
  }, [asset.fallback]);

  return (
    <div className="relative mx-auto aspect-square w-48 sm:w-60">
      <img
        src={source}
        onError={handleError}
        alt={asset.alt}
        width={512}
        height={512}
        className="h-full w-full object-contain drop-shadow-xl transition-transform duration-700"
        style={{ transform: mood === 'hug' ? (celebrate ? 'translateY(-6px) scale(1.05)' : 'translateY(-4px) scale(1.04)') : 'translateY(0)' }}
        decoding="async"
      />
      <div className="pointer-events-none absolute -inset-6 rounded-full bg-white/40 opacity-0 transition-opacity duration-700" />
    </div>
  );
}

export function MessageCard({ text, category }: { text: string; category: Category }) {
  return (
    <article className="glass-card border border-pink-200/40 p-5 shadow-lg shadow-pink-200/50 animate-[message-in_350ms_ease-out_forwards]">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-700">
        {labelByCategory[category] ?? 'Pesan'}
      </p>
      <p className="mt-2 text-base text-[#432946]">{text}</p>
    </article>
  );
}

export function FloatingHearts({ hearts }: { hearts: Heart[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {hearts.map((heart) => (
        <img
          key={heart.id}
          src={HEART_URL}
          aria-hidden
          className="absolute opacity-0 animate-[float-heart_1s_ease-out_forwards] drop-shadow-lg"
          style={{
            left: `${heart.left}%`,
            bottom: '12%',
            width: heart.size,
            animationDuration: `${heart.duration}ms`
          }}
        />
      ))}
    </div>
  );
}

export function CTAGroup({ onHug, onTalk }: { onHug: () => void; onTalk: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <button type="button" className="button-primary" onClick={onHug}>
        Peluk Aku
      </button>
      <button type="button" className="button-primary" onClick={onTalk}>
        Kita Ngobrol Yuk?
      </button>
    </div>
  );
}

export function ModalHug({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [hugSource, setHugSource] = useState(CAT_ASSETS.hug.primary);
  const fallbackUsed = useRef(false);

  useEffect(() => {
    if (!open) return;
    fallbackUsed.current = false;
    setHugSource(CAT_ASSETS.hug.primary);
  }, [open]);

  const handleImageError = useCallback(() => {
    if (fallbackUsed.current) return;
    fallbackUsed.current = true;
    setHugSource(CAT_ASSETS.hug.fallback);
  }, []);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab' && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const prev = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => dialog?.querySelector<HTMLElement>('button')?.focus(), 0);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKey);
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hug-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6"
    >
      <div className="glass-card w-full max-w-md space-y-4 p-6 text-center">
        <h2 id="hug-title" className="text-2xl font-semibold text-[#432946]">Pelukan dari Si Kucing</h2>
        <img
          src={hugSource}
          onError={handleImageError}
          alt={CAT_ASSETS.hug.alt}
          width={512}
          height={512}
          className="mx-auto aspect-square w-40 object-contain"
          decoding="async"
        />
        <p className="text-[#432946]">
          Bayangin aku peluk kamu erat sekarang, hangat dan penuh sabar sampai kamu siap bicara lagi.
        </p>
        <button type="button" className="button-secondary" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  );
}

export function DialogTalk({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab' && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const prev = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => dialog?.querySelector<HTMLElement>('button')?.focus(), 0);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKey);
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="talk-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6"
    >
      <div className="glass-card w-full max-w-md space-y-4 p-6 text-center">
        <h2 id="talk-title" className="text-2xl font-semibold text-[#432946]">Kapan kita ngobrol?</h2>
        <p className="text-[#432946]">Aku siap dengerin penuh hati, kapan pun kamu nyaman.</p>
        <div className="flex flex-col gap-3">
          {['Nanti malam', 'Besok sore', 'Pilih waktu lain'].map((option) => (
            <button key={option} type="button" className="button-primary" onClick={onClose}>
              {option}
            </button>
          ))}
        </div>
        <button type="button" className="button-secondary" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [progress, setProgress] = useState(0);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [messagePointers, setMessagePointers] = useState<Record<Category, number>>({
    acknowledgements: 0,
    accountability: 0,
    intentions: 0,
    softeners: 0,
    aww: 0,
    final: 0
  });
  const [displayed, setDisplayed] = useState<DisplayedPointer[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [hugOpen, setHugOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const throttleRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const storedProgress = Number(localStorage.getItem(STORAGE_KEYS.progress));
    const storedPointer = localStorage.getItem(STORAGE_KEYS.pointer);
    if (!Number.isNaN(storedProgress)) {
      setProgress(clamp(storedProgress, 0, 100));
      if (storedProgress > 0) {
        setIntroVisible(false);
      }
    }
    if (storedPointer) {
      try {
        const parsed = JSON.parse(storedPointer) as {
          currentCategoryIndex: number;
          currentMessageIndices: [Category, number][];
          displayed: DisplayedPointer[];
        };
        setCurrentCategoryIndex(parsed.currentCategoryIndex ?? 0);
        setMessagePointers((prev) => ({
          ...prev,
          ...Object.fromEntries(parsed.currentMessageIndices ?? [])
        }));
        setDisplayed(parsed.displayed ?? []);
        if (storedProgress >= 100) {
          setIsComplete(true);
        }
      } catch (error) {
        console.warn('Gagal memuat progres', error);
      }
    }
  }, []);

  useEffect(() => {
    const payload = {
      currentCategoryIndex,
      currentMessageIndices: Object.entries(messagePointers) as [Category, number][],
      displayed
    };
    localStorage.setItem(STORAGE_KEYS.progress, String(progress));
    localStorage.setItem(STORAGE_KEYS.pointer, JSON.stringify(payload));
  }, [currentCategoryIndex, messagePointers, displayed, progress]);

  const nextMessage = useCallback((): DisplayedPointer | null => {
    for (let attempt = 0; attempt < categoryOrderCycle.length; attempt += 1) {
      const categoryIndex = (currentCategoryIndex + attempt) % categoryOrderCycle.length;
      const category = categoryOrderCycle[categoryIndex] as Category;
      const pointer = messagePointers[category] ?? 0;
      const bucket = messages[category];
      const text = bucket?.[pointer];
      if (text) {
        setCurrentCategoryIndex((categoryIndex + 1) % categoryOrderCycle.length);
        setMessagePointers((prev) => ({ ...prev, [category]: pointer + 1 }));
        return { category, index: pointer };
      }
    }
    return null;
  }, [currentCategoryIndex, messagePointers]);

  const displayedMessages = useMemo(() => {
    return displayed.map((item) => ({
      ...item,
      text: messages[item.category]?.[item.index]
    })).filter((item): item is DisplayedPointer & { text: string } => Boolean(item.text));
  }, [displayed]);

  const handleFill = useCallback(() => {
    if (introVisible) return;
    const now = Date.now();
    if (now - throttleRef.current < 500) return;
    throttleRef.current = now;

    if (progress >= 100) {
      setIsComplete(true);
      return;
    }

    const pointer = nextMessage();
    if (!pointer) {
      setProgress(100);
      setIsComplete(true);
      return;
    }

    setProgress((prev) => clamp(prev + STEP_VALUE, 0, 100));
    setDisplayed((prev) => [...prev, pointer]);

    setHearts((prev) => {
      if (prefersReducedMotion) return prev;
      const count = Math.floor(Math.random() * 5) + 2;
      const newHearts: Heart[] = Array.from({ length: count }, (_, index) => ({
        id: Date.now() + index,
        left: Math.random() * 90 + 5,
        size: 24 + Math.random() * 18,
        duration: 900 + Math.random() * 500
      }));
      newHearts.forEach((heart) => {
        window.setTimeout(() => {
          setHearts((current) => current.filter((item) => item.id !== heart.id));
        }, heart.duration + 200);
      });
      return [...prev, ...newHearts];
    });

    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, [introVisible, nextMessage, prefersReducedMotion, progress]);

  useEffect(() => {
    if (progress >= 100) {
      setIsComplete(true);
    }
  }, [progress]);

  const reset = useCallback(() => {
    setProgress(0);
    setCurrentCategoryIndex(0);
    setMessagePointers({
      acknowledgements: 0,
      accountability: 0,
      intentions: 0,
      softeners: 0,
      aww: 0,
      final: 0
    });
    setDisplayed([]);
    setIsComplete(false);
    setHearts([]);
    localStorage.removeItem(STORAGE_KEYS.progress);
    localStorage.removeItem(STORAGE_KEYS.pointer);
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (introVisible) return;
      const target = event.target as HTMLElement;
      if (target.closest('button')) return;
      handleFill();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleFill, introVisible]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (hugOpen) setHugOpen(false);
        if (talkOpen) setTalkOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [hugOpen, talkOpen]);

  const catMood: 'sad' | 'hopeful' | 'hug' = progress >= 100 ? 'hug' : displayed.length > 0 ? 'hopeful' : 'sad';
  const catCelebrating = catMood === 'hug' && isComplete;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-5 py-10">
      <FloatingHearts hearts={hearts} />
      {introVisible && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-6 text-center text-white transition-opacity">
          <div className="w-full max-w-lg space-y-6 rounded-3xl bg-white/10 p-8 backdrop-blur-lg">
            <h1 className="text-2xl font-semibold">Aku tau kamu lagi kesal… dan aku paham kenapa.</h1>
            <p className="text-base text-white/80">Tap atau klik untuk mulai. Aku janji dengerin sepenuh hati.</p>
            <button
              type="button"
              className="button-primary mx-auto"
              onClick={() => setIntroVisible(false)}
            >
              Mulai Pelan-Pelan
            </button>
          </div>
        </div>
      )}
      <header className="glass-card flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <CatCharacter mood={catMood} celebrate={catCelebrating} />
        <div className="space-y-3 text-center sm:text-left">
          <h1 className="text-3xl font-semibold text-[#432946]">Meteran Maaf</h1>
          <p className="text-base text-[#6c4c70]">
            Aku tau kamu lagi kesal… aku pengen denger dan bener-bener bertanggung jawab.
          </p>
        </div>
      </header>

      <ApologyMeter value={progress} onFill={handleFill} onComplete={() => setIsComplete(true)} />

      <section aria-live="polite" aria-label="Pesan permintaan maaf" className="space-y-4">
        {displayedMessages.map((item) => (
          <MessageCard key={`${item.category}-${item.index}`} category={item.category} text={messages[item.category][item.index] ?? ''} />
        ))}
      </section>

      {isComplete && (
        <section className="glass-card space-y-4 p-6 text-center" aria-live="polite">
          <p className="text-lg text-[#432946]">
            {messages.final?.[0] ?? 'Aku ingin memperbaiki semuanya dengan kamu.'}
          </p>
          <CTAGroup onHug={() => setHugOpen(true)} onTalk={() => setTalkOpen(true)} />
        </section>
      )}

      <footer className="pb-10 text-center text-sm text-[#6c4c70]">
        <p>Kalau kamu butuh waktu, aku siap menunggu kapan pun.</p>
        <button type="button" className="mt-3 underline decoration-pink-400 decoration-2" onClick={reset}>
          Reset
        </button>
      </footer>

      <ModalHug open={hugOpen} onClose={() => setHugOpen(false)} />
      <DialogTalk open={talkOpen} onClose={() => setTalkOpen(false)} />
    </div>
  );
}

