/**
 * pythonTracer.ts
 *
 * Runs Python code inside Pyodide (WebAssembly Python in the browser),
 * hooks sys.settrace to record every execution step, and returns a
 * structured TraceResult matching our schema.
 *
 * Pyodide is loaded lazily from CDN on first use and cached globally.
 * Call preloadPyodide() early (e.g. on app mount) to warm up in the background.
 */

import type { TraceResult, TraceStep, StackFrame } from '../types/trace';

// ─── Pyodide loader ───────────────────────────────────────────────────────────

declare global {
  interface Window {
    loadPyodide: (opts: { indexURL: string }) => Promise<any>;
  }
}

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/';
let _pyodide: any = null;
let _pyodidePromise: Promise<any> | null = null;

async function _loadPyodide(): Promise<any> {
  if (_pyodide) return _pyodide;

  // Inject the Pyodide loader script if not already present
  if (!document.querySelector('script[data-pyodide]')) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${PYODIDE_CDN}pyodide.js`;
      s.dataset.pyodide = '1';
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Pyodide script'));
      document.head.appendChild(s);
    });
  }

  _pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN });
  return _pyodide;
}

/** Start loading Pyodide in the background. Safe to call multiple times. */
export function preloadPyodide(): Promise<any> {
  if (!_pyodidePromise) _pyodidePromise = _loadPyodide();
  return _pyodidePromise;
}

// ─── Embedded tracer script ───────────────────────────────────────────────────
//
// This Python runs inside Pyodide.  It installs a sys.settrace hook that
// captures every line/call/return event, serialises locals to JSON-safe
// primitives, and returns the full trace as a JSON string.
//
// Filename sentinel: we compile user code with filename='<user>' so the tracer
// can skip internal Pyodide / stdlib frames by checking f_code.co_filename.

const TRACER_PY = `
import sys, json, io, builtins as _bi

_steps   = []
_sout    = io.StringIO()
_counter = [0]
_MAX     = 300          # safety limit — increase for longer programs

def _snap(val, depth=0):
    """Recursively serialise a Python value to JSON-safe primitives."""
    if depth > 4:
        return repr(val)
    if val is None or isinstance(val, (bool, int, float, str)):
        return val
    if isinstance(val, (list, tuple)):
        return [_snap(v, depth + 1) for v in val[:40]]
    if isinstance(val, dict):
        return {str(k): _snap(v, depth + 1) for k, v in list(val.items())[:20]}
    return repr(val)

def _build_stack(frame):
    """Walk the call stack bottom-up, only including <user> frames."""
    frames = []
    f = frame
    while f and f.f_code.co_filename == '<user>':
        locs = {
            k: _snap(v)
            for k, v in f.f_locals.items()
            if not k.startswith('_') and k != '__builtins__'
        }
        frames.insert(0, {'func': f.f_code.co_name, 'locals': locs})
        f = f.f_back
    return frames

def _tracer(frame, event, arg):
    if frame.f_code.co_filename != '<user>':
        return _tracer
    if _counter[0] >= _MAX:
        return None          # stop tracing — too many steps

    step_n = _counter[0]
    _counter[0] += 1

    ev_map = {'call': 'call', 'return': 'return', 'line': 'step', 'exception': 'exception'}
    entry = {
        'step':   step_n,
        'line':   frame.f_lineno,
        'event':  ev_map.get(event, 'step'),
        'stack':  _build_stack(frame),
        'stdout': _sout.getvalue(),
    }
    if event == 'return':
        entry['returnVal'] = _snap(arg)

    _steps.append(entry)
    return _tracer

def run_trace(code: str) -> str:
    """Trace user code and return steps as a JSON string."""
    global _steps, _sout
    _steps = []
    _sout  = io.StringIO()
    _counter[0] = 0

    _saved_stdout = sys.stdout
    sys.stdout    = _sout
    sys.settrace(_tracer)
    try:
        exec(compile(code, '<user>', 'exec'), {'__builtins__': _bi})
    except Exception as exc:
        _steps.append({
            'step':   _counter[0],
            'line':   0,
            'event':  'exception',
            'stack':  [],
            'stdout': _sout.getvalue(),
            'error':  f'{type(exc).__name__}: {exc}',
        })
    finally:
        sys.settrace(None)
        sys.stdout = _saved_stdout

    return json.dumps(_steps)
`;

let _tracerInstalled = false;

async function getPyodide(): Promise<any> {
  const py = await preloadPyodide();
  if (!_tracerInstalled) {
    await py.runPythonAsync(TRACER_PY);
    _tracerInstalled = true;
  }
  return py;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function tracePython(code: string): Promise<TraceResult> {
  try {
    const py       = await getPyodide();
    const jsonStr  = await py.runPythonAsync(`run_trace(${JSON.stringify(code)})`);
    const rawSteps = JSON.parse(jsonStr) as any[];

    const steps: TraceStep[] = rawSteps.map((r) => {
      const stack: StackFrame[] = (r.stack ?? []).map((f: any) => ({
        func:   f.func,
        locals: f.locals ?? {},
      }));
      return {
        step:   r.step,
        line:   r.line,
        event:  r.event,
        stack,
        stdout: r.stdout ?? '',
        error:  r.error,
      };
    });

    const execError = rawSteps.find((r) => r.error)?.error;
    return { steps, error: execError };
  } catch (err) {
    return {
      steps: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
