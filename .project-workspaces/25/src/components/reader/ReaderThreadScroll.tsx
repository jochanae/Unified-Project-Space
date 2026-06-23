import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

const MIN_THUMB_OFFSET = 18;

export function ReaderThreadScroll({
  book,
  chapter,
  verseCount,
  scrollContainerRef,
  onJumpToVerse,
}: {
  book: string;
  chapter: number;
  verseCount: number;
  scrollContainerRef: RefObject<HTMLElement | null>;
  onJumpToVerse: (verse: number) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const activeVerseRef = useRef(1);
  const [isTouch, setIsTouch] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [indicatorVerse, setIndicatorVerse] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(coarsePointer.matches || navigator.maxTouchPoints > 0);
    update();
    coarsePointer.addEventListener("change", update);
    return () => coarsePointer.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!isTouch || !scrollContainer) return;
    const sync = () => {
      const scrollable = Math.max(1, scrollContainer.scrollHeight - scrollContainer.clientHeight);
      setProgress(Math.min(1, Math.max(0, scrollContainer.scrollTop / scrollable)));
    };
    sync();
    scrollContainer.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      scrollContainer.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [isTouch, scrollContainerRef, verseCount, chapter, book]);

  const indicatorLabel = useMemo(
    () => `${book} ${chapter}:${indicatorVerse}`,
    [book, chapter, indicatorVerse],
  );

  const updateFromClientY = (clientY: number) => {
    const scrollContainer = scrollContainerRef.current;
    if (!railRef.current || !scrollContainer) return;
    const rect = railRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const scrollable = Math.max(1, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    const verse = Math.min(verseCount, Math.max(1, Math.round(ratio * (verseCount - 1)) + 1));
    activeVerseRef.current = verse;
    setIndicatorVerse(verse);
    setProgress(ratio);
    scrollContainer.scrollTo({ top: ratio * scrollable, behavior: "auto" });
  };

  if (!isTouch) return null;

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-40 flex items-center pr-1.5">
      <div className="relative flex h-[46vh] min-h-52 items-center">
        <div
          ref={railRef}
          className="pointer-events-auto relative h-full w-6 touch-none"
          onPointerDown={(event) => {
            if (event.pointerType === "mouse") return;
            setDragging(true);
            setIndicatorVerse(
              Math.min(verseCount, Math.max(1, Math.round(progress * (verseCount - 1)) + 1)),
            );
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromClientY(event.clientY);
          }}
          onPointerMove={(event) => {
            if (!dragging) return;
            updateFromClientY(event.clientY);
          }}
          onPointerUp={(event) => {
            if (!dragging) return;
            event.currentTarget.releasePointerCapture(event.pointerId);
            setDragging(false);
            onJumpToVerse(activeVerseRef.current);
          }}
          onPointerCancel={() => setDragging(false)}
        >
          <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 rounded-full bg-gold/18" />
          <div
            className="absolute left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-gold/80 shadow-[0_0_14px_rgba(201,168,76,0.35)] transition-[top,height] duration-150"
            style={{
              top: `${MIN_THUMB_OFFSET + progress * (100 - MIN_THUMB_OFFSET * 2)}%`,
              height: dragging ? 52 : 32,
              marginTop: dragging ? -26 : -16,
            }}
          />
          <div
            className={cn(
              "absolute right-7 top-1/2 min-w-28 -translate-y-1/2 rounded-full border border-gold/20 bg-background/45 px-3 py-2 text-right opacity-0 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-200",
              dragging && "translate-x-0 opacity-100",
            )}
            style={{
              top: `${MIN_THUMB_OFFSET + progress * (100 - MIN_THUMB_OFFSET * 2)}%`,
            }}
          >
            <p className="text-[9px] uppercase tracking-[0.28em] text-gold/70">Verse Indicator</p>
            <p className="mt-1 font-display text-sm text-gold-soft">{indicatorLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
