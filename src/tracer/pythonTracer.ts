/**
 * pythonTracer.ts
 *
 * Runs Python code inside Pyodide (WebAssembly), hooks sys.settrace to capture
 * every execution step, and returns a structured TraceResult.
 *
 * Improvements over v1:
 *  - Auto-generates a note for every step (what changed, call args, return val)
 *  - Captures Python type names per variable (int, str, list[int], …)
 *  - Supports sets, frozensets, tuples
 *  - Step limit raised to 1000
 *  - Cleans up frame-local state on return to avoid memory leaks inside Pyodide
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

export function preloadPyodide(): Promise<any> {
  if (!_pyodidePromise) _pyodidePromise = _loadPyodide();
  return _pyodidePromise;
}

// ─── Embedded tracer script ───────────────────────────────────────────────────

const TRACER_PY = `
import sys, json, io, builtins as _bi

_steps      = []
_sout       = io.StringIO()
_counter    = [0]
_MAX        = 1000
_prev_locs  = {}   # id(frame) -> dict snapshot

# ── Type name helper ──────────────────────────────────────────────────────────

def _type_name(val):
    if val is None: return 'None'
    if isinstance(val, bool): return 'bool'
    if isinstance(val, int): return 'int'
    if isinstance(val, float): return 'float'
    if isinstance(val, str): return 'str'
    if isinstance(val, (list, tuple)):
        kind = 'list' if isinstance(val, list) else 'tuple'
        if val:
            sample = val[:8]
            if all(isinstance(x, int) and not isinstance(x, bool) for x in sample):
                return f'{kind}[int]'
            if all(isinstance(x, float) for x in sample):
                return f'{kind}[float]'
            if all(isinstance(x, str) for x in sample):
                return f'{kind}[str]'
        return kind
    if isinstance(val, dict): return 'dict'
    if isinstance(val, frozenset): return 'frozenset'
    if isinstance(val, set): return 'set'
    return type(val).__name__

# ── Value serialiser ──────────────────────────────────────────────────────────

def _snap(val, depth=0):
    if depth > 4: return repr(val)
    if val is None or isinstance(val, (bool, int, float, str)): return val
    if isinstance(val, (list, tuple)):
        return [_snap(v, depth+1) for v in val[:40]]
    if isinstance(val, dict):
        return {str(k): _snap(v, depth+1) for k, v in list(val.items())[:20]}
    if isinstance(val, (set, frozenset)):
        try:
            return sorted([_snap(v, depth+1) for v in list(val)[:20]], key=str)
        except Exception:
            return [_snap(v, depth+1) for v in list(val)[:20]]
    return repr(val)

# ── Stack builder ─────────────────────────────────────────────────────────────

def _build_stack(frame):
    frames = []
    f = frame
    while f and f.f_code.co_filename == '<user>':
        locs  = {}
        types = {}
        for k, v in f.f_locals.items():
            if k.startswith('_') or k == '__builtins__': continue
            # Skip function/class defs — they clutter the display
            if callable(v) and not isinstance(v, (bool, int, float, str, list, tuple, dict, set, frozenset)): continue
            locs[k]  = _snap(v)
            types[k] = _type_name(v)
        frames.insert(0, {
            'func':   f.f_code.co_name,
            'locals': locs,
            'types':  types,
        })
        f = f.f_back
    return frames

# ── Auto-note generator ───────────────────────────────────────────────────────

def _make_note(frame, event, arg):
    func = frame.f_code.co_name

    if event == 'call':
        _prev_locs[id(frame)] = dict(frame.f_locals)
        if func == '<module>':
            return 'Program starts'
        code = frame.f_code
        parts = []
        for a in code.co_varnames[:code.co_argcount]:
            v = frame.f_locals.get(a, '?')
            parts.append(f'{a}={repr(v)[:14]}')
        return f'{func}({", ".join(parts)})'

    if event == 'return':
        _prev_locs.pop(id(frame), None)
        r = repr(arg)
        return f'return {r[:60]}' if len(r) <= 60 else f'return {r[:57]}…'

    if event == 'exception':
        exc_type, exc_val, _ = arg
        return f'{exc_type.__name__}: {exc_val}'

    # 'line' event — diff current locals against previous snapshot
    fid  = id(frame)
    cur  = {
        k: v for k, v in frame.f_locals.items()
        if not k.startswith('_') and k != '__builtins__'
    }
    prev = _prev_locs.get(fid, {})
    changed = []
    for k, v in cur.items():
        pv = prev.get(k)
        try:
            different = repr(pv) != repr(v)
        except Exception:
            different = True
        if different:
            changed.append((k, v))
    _prev_locs[fid] = dict(cur)

    if len(changed) == 1:
        k, v = changed[0]
        r = repr(v)
        return f'{k} = {r[:60]}' if len(r) <= 60 else f'{k} = {r[:57]}…'
    if len(changed) > 1:
        return ', '.join(f'{k} = {repr(v)[:20]}' for k, v in changed[:3])
    return ''

# ── Trace callback ────────────────────────────────────────────────────────────

def _tracer(frame, event, arg):
    if frame.f_code.co_filename != '<user>': return _tracer
    if _counter[0] >= _MAX: return None

    step_n = _counter[0]
    _counter[0] += 1

    note = _make_note(frame, event, arg)
    ev_map = {'call': 'call', 'return': 'return', 'line': 'step', 'exception': 'exception'}

    entry = {
        'step':   step_n,
        'line':   frame.f_lineno,
        'event':  ev_map.get(event, 'step'),
        'stack':  _build_stack(frame),
        'stdout': _sout.getvalue(),
        'note':   note,
    }
    if event == 'return':
        entry['returnVal'] = _snap(arg)
    if event == 'exception':
        exc_type, exc_val, _ = arg
        entry['error'] = f'{exc_type.__name__}: {exc_val}'

    _steps.append(entry)
    return _tracer

# ── Public entry ──────────────────────────────────────────────────────────────

def run_trace(code: str) -> str:
    global _steps, _sout
    _steps = []
    _sout  = io.StringIO()
    _counter[0] = 0
    _prev_locs.clear()

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
            'note':   f'{type(exc).__name__}: {exc}',
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
    const py      = await getPyodide();
    const jsonStr = await py.runPythonAsync(`run_trace(${JSON.stringify(code)})`);
    const raw     = JSON.parse(jsonStr) as any[];

    const steps: TraceStep[] = raw.map((r) => {
      const stack: StackFrame[] = (r.stack ?? []).map((f: any) => ({
        func:   f.func,
        locals: f.locals ?? {},
        types:  f.types,
      }));
      return {
        step:   r.step,
        line:   r.line,
        event:  r.event,
        stack,
        stdout: r.stdout ?? '',
        note:   r.note  ?? '',
        error:  r.error,
      };
    });

    const execError = raw.find((r) => r.error)?.error;
    return { steps, error: execError };
  } catch (err) {
    return {
      steps: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
