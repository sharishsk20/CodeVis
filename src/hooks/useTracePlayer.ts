import { useState, useEffect, useRef, useCallback } from 'react';
import type { TraceStep } from '../types/trace';

interface TracePlayer {
  steps:        TraceStep[];
  stepIdx:      number;
  playing:      boolean;
  speed:        number;
  setSteps:     (s: TraceStep[]) => void;
  step:         (dir: 1 | -1) => void;
  reset:        () => void;
  togglePlay:   () => void;
  setSpeed:     (s: number) => void;
  goTo:         (idx: number) => void;
}

const SPEED_MS: Record<number, number> = {
  0.5: 1400,
  1:    680,
  2:    340,
  4:    120,
};

export function useTracePlayer(): TracePlayer {
  const [steps,   setStepsState] = useState<TraceStep[]>([]);
  const [stepIdx, setStepIdx]    = useState(0);
  const [playing, setPlaying]    = useState(false);
  const [speed,   setSpeedState] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Auto-stop when we reach the end
  useEffect(() => {
    if (playing) {
      clearTimer();
      timerRef.current = setInterval(() => {
        setStepIdx((i) => {
          if (i >= steps.length - 1) {
            setPlaying(false);
            clearTimer();
            return i;
          }
          return i + 1;
        });
      }, SPEED_MS[speed] ?? 680);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [playing, speed, steps.length]);

  const setSteps = useCallback((s: TraceStep[]) => {
    clearTimer();
    setPlaying(false);
    setStepIdx(0);
    setStepsState(s);
  }, []);

  const step = useCallback((dir: 1 | -1) => {
    setPlaying(false);
    clearTimer();
    setStepIdx((i) => Math.max(0, Math.min(steps.length - 1, i + dir)));
  }, [steps.length]);

  const reset = useCallback(() => {
    clearTimer();
    setPlaying(false);
    setStepIdx(0);
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      // If at end and we press play, restart
      if (!p && stepIdx >= steps.length - 1) {
        setStepIdx(0);
      }
      return !p;
    });
  }, [stepIdx, steps.length]);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
  }, []);

  const goTo = useCallback((idx: number) => {
    setPlaying(false);
    clearTimer();
    setStepIdx(Math.max(0, Math.min(steps.length - 1, idx)));
  }, [steps.length]);

  return { steps, stepIdx, playing, speed, setSteps, step, reset, togglePlay, setSpeed, goTo };
}
