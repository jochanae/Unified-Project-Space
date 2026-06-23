import { useState, useCallback, useRef } from 'react';
import { CanvasElement } from '../components/LogoCanvas';

interface CanvasSnapshot {
  elements: CanvasElement[];
  backgroundColor: string;
  canvasSize: { width: number; height: number };
}

const MAX_HISTORY = 50;

export function useCanvasHistory(initial: CanvasSnapshot) {
  const [past, setPast] = useState<CanvasSnapshot[]>([]);
  const [present, setPresent] = useState<CanvasSnapshot>(initial);
  const [future, setFuture] = useState<CanvasSnapshot[]>([]);
  const skipRef = useRef(false);

  const push = useCallback((snapshot: CanvasSnapshot) => {
    if (skipRef.current) {
      skipRef.current = false;
      setPresent(snapshot);
      return;
    }
    setPast(prev => [...prev.slice(-MAX_HISTORY), present]);
    setPresent(snapshot);
    setFuture([]);
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return null;
    const prev = past[past.length - 1];
    setPast(p => p.slice(0, -1));
    setFuture(f => [present, ...f]);
    setPresent(prev);
    skipRef.current = true;
    return prev;
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return null;
    const next = future[0];
    setFuture(f => f.slice(1));
    setPast(p => [...p, present]);
    setPresent(next);
    skipRef.current = true;
    return next;
  }, [future, present]);

  return {
    present,
    push,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
