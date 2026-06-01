import { useState, useEffect, useCallback, useRef } from 'react';
import CodePane from './components/CodePane';
import VizPane from './components/VizPane';
import PlaybackBar from './components/PlaybackBar';
import ResizableSplit from './components/ResizableSplit';
import { useTracePlayer } from './hooks/useTracePlayer';
import { tracePython, preloadPyodide } from './tracer/pythonTracer';
import { SAMPLE_TRACES } from './tracer/sampleTraces';
import type { Language } from './types/trace';

// ─── Initial state: Python sample trace ─────────────────────────────────────

const INITIAL_LANG: Language = 'python';
const initialSample = SAMPLE_TRACES[INITIAL_LANG];

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [lang,      setLang]      = useState<Language>(INITIAL_LANG);
  const [code,      setCode]      = useState(initialSample.code);
  const [isEditing, setIsEditing] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [pyReady,   setPyReady]   = useState(false);

  const player = useTracePlayer();
  const { steps, stepIdx, playing, speed, setSteps, step, reset, togglePlay, setSpeed, goTo } = player;

  // Load sample on mount
  useEffect(() => {
    setSteps(initialSample.steps);
    // Warm up Pyodide in the background so first Run is faster
    preloadPyodide()
      .then(() => setPyReady(true))
      .catch(() => {/* silent — user can still try running */});
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return; // don't steal from editor
      if (e.key === 'ArrowRight' || e.key === 'l') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft'  || e.key === 'h') { e.preventDefault(); step(-1); }
      else if (e.key === ' ')                           { e.preventDefault(); togglePlay(); }
      else if (e.key === 'r' || e.key === 'R')          { e.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, togglePlay, reset]);

  // ── Language switch ──────────────────────────────────────────────────────

  const switchLang = (l: Language) => {
    setLang(l);
    setError(null);
    setIsEditing(false);
    const sample = SAMPLE_TRACES[l];
    setCode(sample.code);
    setSteps(sample.steps);
  };

  // ── Run code ─────────────────────────────────────────────────────────────

  const handleRun = async () => {
    if (lang === 'cpp') {
      setError('Live C/C++ execution is not supported yet — use the sample trace, or see README for the GDB backend plan.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await tracePython(code);
      if (result.steps.length === 0) {
        setError(result.error ?? 'No trace steps generated.');
        return;
      }
      setSteps(result.steps);
      setIsEditing(false);
      if (result.error) {
        // Partial trace with an exception — show it but surface the error
        setError(`Runtime error: ${result.error}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const cur     = steps[stepIdx];
  const prev    = stepIdx > 0 ? steps[stepIdx - 1] : undefined;
  const codeLines = code.split('\n');

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-canvas)' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 18px', height: 54,
        borderBottom: '1px solid var(--glass-border)',
        background: 'linear-gradient(135deg, rgba(22,27,34,0.95), rgba(14,17,23,0.98))',
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1d9e75, #22d3ee)',
            boxShadow: '0 0 10px rgba(29,158,117,0.5)',
          }} />
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #e6edf3, #8b949e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CodeVis</span>
          <span style={{
            fontSize: 9, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)',
            background: 'rgba(34,211,238,0.1)', padding: '1px 6px', borderRadius: 4,
            border: '1px solid rgba(34,211,238,0.2)',
          }}>v0.1</span>
        </div>

        {/* Lang tabs */}
        <div style={{
          display: 'flex', gap: 3, padding: 3,
          background: 'rgba(255,255,255,0.03)', borderRadius: 10,
          border: '1px solid var(--glass-border)', marginLeft: 8,
        }}>
          {(['python', 'cpp'] as Language[]).map((l) => (
            <button key={l} onClick={() => switchLang(l)} style={{
              padding: '5px 16px', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12,
              fontWeight: lang === l ? 600 : 400,
              background: lang === l
                ? (l === 'python' ? 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(168,85,247,0.2))' : 'linear-gradient(135deg, rgba(239,159,39,0.2), rgba(244,63,94,0.2))')
                : 'transparent',
              color: lang === l ? '#e6edf3' : 'var(--text-tertiary)',
              boxShadow: lang === l ? '0 0 12px rgba(56,189,248,0.15)' : 'none',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
              {l === 'python' ? 'Python 3' : 'C / C++'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Pyodide status badge */}
        {lang === 'python' && !pyReady && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)',
            background: 'rgba(34,211,238,0.08)', padding: '4px 10px', borderRadius: 8,
            border: '1px solid rgba(34,211,238,0.15)',
          }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', border: '1.5px solid var(--accent-cyan)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
            loading runtime…
          </div>
        )}

      </header>

      {/* ── Error bar ── */}
      {error && (
        <div style={{
          padding: '8px 18px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(239,159,39,0.08))',
          borderBottom: '1px solid rgba(244,63,94,0.2)',
          color: '#f87171', fontSize: 12, fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} style={{
            background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.25)',
            color: '#f43f5e', cursor: 'pointer', fontSize: 13, borderRadius: 6,
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}>×</button>
        </div>
      )}

      {/* ── Main panels ── */}
      <ResizableSplit
        left={
          <CodePane
            lines={codeLines}
            currentLine={isEditing ? undefined : cur?.line}
            event={cur?.event}
            code={code}
            editable={isEditing}
            lang={lang}
            onCodeChange={setCode}
            onToggleEdit={() => { setIsEditing((e) => !e); setError(null); }}
            onRun={handleRun}
            loading={loading}
            pyReady={pyReady}
          />
        }
        right={<VizPane step={cur} prevStep={prev} />}
        initialLeft={42}
      />

      {/* ── Playback bar ── */}
      {steps.length > 0 && !isEditing && (
        <PlaybackBar
          stepIdx={stepIdx}
          total={steps.length}
          playing={playing}
          speed={speed}
          event={cur?.event}
          note={cur?.note}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onReset={reset}
          onTogglePlay={togglePlay}
          onSpeedChange={setSpeed}
          onScrub={goTo}
        />
      )}

      {/* ── Keyboard hint ── */}
      {!isEditing && steps.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 52, right: 14,
          fontSize: 10, color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)', pointerEvents: 'none',
        }}>
          ← → step  &nbsp;·&nbsp;  space play  &nbsp;·&nbsp;  r reset
        </div>
      )}
    </div>
  );
}
