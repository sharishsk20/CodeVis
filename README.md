# CodeVis — Code Visualizer

A step-through code visualizer for **Python 3** and **C/C++** with smooth animations.

- **Python** — runs real user code in the browser via Pyodide (WebAssembly Python)
- **C/C++** — ships with a hardcoded linked-list demo; live execution via GDB backend planned

## Quick start

```bash
cd codevis
npm install
npm run dev
# open http://localhost:5173
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `→` or `l` | Step forward |
| `←` or `h` | Step back |
| `Space` | Play / Pause |
| `r` | Reset to start |

Click the progress bar to scrub to any step.

## Project structure

```
src/
├── types/
│   └── trace.ts           ← shared data schema (TraceStep, HeapNode, …)
├── tracer/
│   ├── pythonTracer.ts    ← Pyodide integration + sys.settrace hook
│   └── sampleTraces.ts    ← hardcoded demo traces (Python bubble sort, C++ linked list)
├── hooks/
│   └── useTracePlayer.ts  ← play/pause/step/speed state hook
├── components/
│   ├── CodePane.tsx       ← editable textarea + highlighted trace view
│   ├── ArrayViz.tsx       ← animated bar chart (auto-detects numeric arrays)
│   ├── StackPanel.tsx     ← call stack with per-variable change highlighting
│   ├── HeapDiagram.tsx    ← SVG linked-list with pointer arrows
│   ├── PlaybackBar.tsx    ← transport controls + scrubber
│   └── VizPane.tsx        ← right panel — composes all viz components
├── App.tsx                ← root layout + state orchestration
└── index.css              ← CSS variables (dark theme)
```

## How the Python tracer works

1. **Pyodide** loads in the background when the app starts (~10s first load, then cached)
2. User writes code in the editor and clicks **Run**
3. `pythonTracer.ts` sends the code to Pyodide and runs this Python inside it:
   - `sys.settrace()` installs a hook that fires on every `call`, `line`, and `return` event
   - Each event captures a snapshot of local variables for every frame in the call stack
   - All data is serialized to JSON and returned
4. The JSON is parsed into `TraceStep[]` and handed to `useTracePlayer`
5. The UI replays the trace — no server required

## C/C++ live execution (roadmap)

Two approaches are planned:

### Option A — GDB backend (easier, needs a server)
- Run a FastAPI server that accepts code, compiles it with GCC, drives GDB via the MI protocol
- Stream `TraceStep` events over WebSocket back to the frontend
- Use Docker to sandbox user code execution

### Option B — Emscripten / WASM (pure browser, harder)
- Compile user C code to WebAssembly via the WASI SDK
- Inject `__trace(line, &var)` calls at each statement during compilation (LLVM pass)
- Run the instrumented WASM in the browser, collect trace events via a host function

### Trace format (language-agnostic)

Both tracers produce the same schema so the frontend stays unchanged:

```ts
interface TraceStep {
  step:    number;       // sequential index
  line:    number;       // source line (1-indexed)
  event:   'step' | 'call' | 'return' | 'exception';
  stack:   StackFrame[]; // bottom → top
  heap?:   HeapNode[];   // C/C++ only
  stdout:  string;       // cumulative output
  note?:   string;       // human-readable description
}
```

## Deploying

The Python-only version is a pure static site — build and host anywhere:

```bash
npm run build          # outputs to dist/
# deploy dist/ to Vercel, Netlify, GitHub Pages, etc.
```

The C++ GDB backend requires a server with Docker.
