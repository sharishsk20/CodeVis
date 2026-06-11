import { useState, useEffect, useRef } from 'react';
import CodePane from './components/CodePane';
import VizPane from './components/VizPane';
import PlaybackBar from './components/PlaybackBar';
import ResizableSplit from './components/ResizableSplit';
import { useTracePlayer } from './hooks/useTracePlayer';
import { tracePython, preloadPyodide } from './tracer/pythonTracer';
import { traceCpp } from './tracer/cppTracer';
import { SAMPLE_TRACES, PYTHON_PRESETS, CPP_PRESETS } from './tracer/sampleTraces';
import type { Preset } from './tracer/sampleTraces';
import type { Language } from './types/trace';

const INITIAL_LANG: Language = 'python';
const initialSample = SAMPLE_TRACES[INITIAL_LANG];

export default function App() {
  const [lang,      setLang]      = useState<Language>(INITIAL_LANG);
  const [code,      setCode]      = useState(initialSample.code);
  const [isEditing, setIsEditing] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [pyReady,   setPyReady]   = useState(false);
  const [exOpen,    setExOpen]    = useState(false);
  const exRef = useRef<HTMLDivElement>(null);

  const player = useTracePlayer();
  const { steps, stepIdx, playing, speed, setSteps, step, reset, togglePlay, setSpeed, goTo } = player;

  useEffect(() => {
    setSteps(initialSample.steps);
    preloadPyodide().then(() => setPyReady(true)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!exOpen) return;
    const h = (e: MouseEvent) => {
      if (exRef.current && !exRef.current.contains(e.target as Node)) setExOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [exOpen]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'l') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'h') { e.preventDefault(); step(-1); }
      else if (e.key === ' ')                  { e.preventDefault(); togglePlay(); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); reset(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [step, togglePlay, reset]);

  const switchLang = (l: Language) => {
    setLang(l); setError(null); setIsEditing(false); setExOpen(false);
    const s = SAMPLE_TRACES[l];
    setCode(s.code); setSteps(s.steps);
  };

  const handlePreset = (preset: Preset) => {
    setCode(preset.code);
    if (preset.sampleTrace) { setSteps(preset.sampleTrace); setIsEditing(false); }
    else { setSteps([]); setIsEditing(true); }
    setError(null); setExOpen(false);
  };

  const handleRun = async () => {
    setLoading(true); setError(null);
    try {
      const result = lang === 'cpp' ? await traceCpp(code) : await tracePython(code);
      if (result.steps.length === 0) { setError(result.error ?? 'No trace steps.'); return; }
      setSteps(result.steps); setIsEditing(false);
      if (result.error) setError(result.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  const cur       = steps[stepIdx];
  const prev      = stepIdx > 0 ? steps[stepIdx - 1] : undefined;
  const codeLines = code.split('\n');
  const presets   = lang === 'python' ? PYTHON_PRESETS : CPP_PRESETS;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px', height: 46, flexShrink: 0,
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel)',
        position: 'relative', zIndex: 100,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1.5" fill="#7c6af7" opacity="0.95"/>
            <rect x="9" y="1" width="6" height="6" rx="1.5" fill="#7c6af7" opacity="0.55"/>
            <rect x="1" y="9" width="6" height="6" rx="1.5" fill="#7c6af7" opacity="0.35"/>
            <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#7c6af7" opacity="0.15"/>
          </svg>
          <span style={{ fontWeight: 600, fontSize: 13.5, letterSpacing: '-0.02em', color: 'var(--t1)' }}>CodeVis</span>
          <span style={{
            fontSize: 9.5, color: 'var(--violet)', fontFamily: 'var(--mono)',
            background: 'rgba(124,106,247,0.1)', padding: '1px 5px',
            borderRadius: 'var(--r-sm)', border: '1px solid rgba(124,106,247,0.18)',
          }}>v0.1</span>
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 2px' }} />

        {/* Lang tabs */}
        <div style={{ display: 'flex', gap: 1 }}>
          {(['python', 'cpp'] as Language[]).map((l) => (
            <button key={l} onClick={() => switchLang(l)} style={{
              padding: '4px 12px', borderRadius: 'var(--r)',
              border: `1px solid ${lang === l ? 'var(--line-hover)' : 'transparent'}`,
              background: lang === l ? 'var(--surf)' : 'transparent',
              color: lang === l ? 'var(--t1)' : 'var(--t3)',
              fontSize: 11.5, fontWeight: 500, fontFamily: 'var(--mono)',
              transition: 'all 0.12s ease',
            }}>
              {l === 'python' ? 'Python 3' : 'C / C++'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Runtime loading */}
        {lang === 'python' && !pyReady && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
            <span style={{
              display: 'inline-block', width: 9, height: 9,
              border: '1.5px solid var(--t3)', borderTopColor: 'var(--cyan)',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            }} />
            loading runtime
          </span>
        )}

        {/* Examples dropdown */}
        <div ref={exRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setExOpen((o) => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 11px', borderRadius: 'var(--r)',
              background: exOpen ? 'var(--surf)' : 'transparent',
              border: `1px solid ${exOpen ? 'var(--line-hover)' : 'var(--line)'}`,
              color: exOpen ? 'var(--t1)' : 'var(--t2)',
              fontSize: 12, fontWeight: 500,
              transition: 'all 0.12s ease',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
              <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
            </svg>
            Examples
            <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: exOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.12s ease' }}>
              <polyline points="4,6 8,10 12,6"/>
            </svg>
          </button>

          {exOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
              background: 'var(--panel)', border: '1px solid var(--line-hover)',
              borderRadius: 'var(--r-lg)', padding: 4,
              minWidth: 188, maxHeight: 'calc(100vh - 70px)', overflowY: 'auto',
              boxShadow: '0 20px 48px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4)',
            }}>
              <div style={{
                padding: '4px 10px 5px', fontSize: 10, fontWeight: 600,
                color: 'var(--t3)', fontFamily: 'var(--mono)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{lang === 'python' ? 'Python 3' : 'C / C++'}</div>
              {presets.map((p) => (
                <button key={p.label} onClick={() => handlePreset(p)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 10px', borderRadius: 'var(--r-sm)',
                  border: 'none', background: 'transparent',
                  color: 'var(--t2)', fontSize: 12,
                  transition: 'background 0.1s, color 0.1s',
                }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'var(--surf)'; el.style.color = 'var(--t1)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'transparent'; el.style.color = 'var(--t2)';
                  }}
                >{p.label}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Error bar ─────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '7px 16px', flexShrink: 0,
          background: 'rgba(244,63,94,0.07)', borderBottom: '1px solid rgba(244,63,94,0.15)',
          color: '#f87171', fontSize: 11.5, fontFamily: 'var(--mono)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{error}</span>
          <button onClick={() => setError(null)} style={{
            background: 'transparent', border: '1px solid rgba(244,63,94,0.2)',
            color: '#f43f5e', fontSize: 14, borderRadius: 'var(--r-sm)',
            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, lineHeight: 1,
          }}>×</button>
        </div>
      )}

      {/* ── Main panels ───────────────────────────────────────────────────────── */}
      <ResizableSplit
        left={
          <CodePane
            lines={codeLines} currentLine={isEditing ? undefined : cur?.line}
            event={cur?.event} code={code} editable={isEditing} lang={lang}
            onCodeChange={setCode}
            onToggleEdit={() => { setIsEditing((e) => !e); setError(null); }}
            onRun={handleRun} loading={loading} pyReady={pyReady}
          />
        }
        right={<VizPane step={cur} prevStep={prev} />}
        initialLeft={42}
      />

      {/* ── Playback ──────────────────────────────────────────────────────────── */}
      {steps.length > 0 && !isEditing && (
        <PlaybackBar
          stepIdx={stepIdx} total={steps.length} playing={playing} speed={speed}
          event={cur?.event} note={cur?.note} steps={steps}
          onPrev={() => step(-1)} onNext={() => step(1)}
          onReset={reset} onTogglePlay={togglePlay}
          onSpeedChange={setSpeed} onScrub={goTo}
        />
      )}
    </div>
  );
}
