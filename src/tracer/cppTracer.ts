/**
 * cppTracer.ts
 *
 * Compiles and runs C/C++ code via the Wandbox public API (CORS-enabled, no
 * auth required).  Produces TraceStep entries that show output building up
 * step-by-step so the playback bar works.
 *
 * Line-level variable tracing requires a GDB backend; this implementation
 * gives you compilation errors, stdout, and a start/output/exit trace.
 */

import type { TraceResult, TraceStep } from '../types/trace';

const WANDBOX_URL = 'https://wandbox.org/api/compile.json';

interface WandboxResponse {
  status:           string;
  compiler_output:  string;
  compiler_error:   string;
  compiler_message: string;
  program_output:   string;
  program_error:    string;
  program_message:  string;
}

async function callWandbox(code: string): Promise<WandboxResponse> {
  const res = await fetch(WANDBOX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compiler:              'gcc-head',
      code,
      options:               'c++17,warning',
      'compiler-option-raw': '-O0',
      stdin:                 '',
    }),
  });
  if (!res.ok) throw new Error(`Wandbox API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<WandboxResponse>;
}

function findMainLine(code: string): number {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/\bmain\s*\(/.test(lines[i])) return i + 1;
  }
  return 1;
}

export async function traceCpp(code: string): Promise<TraceResult> {
  let wandbox: WandboxResponse;
  try {
    wandbox = await callWandbox(code);
  } catch (err) {
    return {
      steps: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Compilation failed
  if (wandbox.status !== '0' && !wandbox.program_output) {
    const msg = wandbox.compiler_error || wandbox.compiler_output || wandbox.compiler_message;
    return { steps: [], error: `Compilation error:\n${msg}` };
  }

  const compilerWarnings = wandbox.compiler_error?.trim() || '';
  const rawOutput        = wandbox.program_output ?? '';
  const runtimeError     = wandbox.program_error?.trim() || '';
  const exitCode         = parseInt(wandbox.status ?? '0', 10);
  const mainLine         = findMainLine(code);

  // Split output into lines, keeping empty lines (a blank println still counts)
  const outputLines = rawOutput === '' ? [] : rawOutput.split('\n');
  // Remove trailing empty string from final newline
  if (outputLines.length > 0 && outputLines[outputLines.length - 1] === '') {
    outputLines.pop();
  }

  const steps: TraceStep[] = [];

  // Step 0: program entry
  steps.push({
    step:   0,
    line:   mainLine,
    event:  'call',
    stack:  [{ func: 'main', locals: {} }],
    stdout: '',
    note:   compilerWarnings
      ? `Compiled with warnings — ${compilerWarnings.split('\n')[0]}`
      : 'Program started',
  });

  // One step per output line (stdout accumulates)
  outputLines.forEach((line, i) => {
    steps.push({
      step:   i + 1,
      line:   mainLine,
      event:  'step',
      stack:  [{ func: 'main', locals: {} }],
      stdout: outputLines.slice(0, i + 1).join('\n'),
      note:   `stdout: ${line}`,
    });
  });

  // Final step: return / exception
  const finalStdout = outputLines.join('\n');
  if (runtimeError) {
    steps.push({
      step:   steps.length,
      line:   mainLine,
      event:  'exception',
      stack:  [{ func: 'main', locals: {} }],
      stdout: finalStdout,
      note:   runtimeError.split('\n')[0],
      error:  runtimeError,
    });
  } else {
    steps.push({
      step:   steps.length,
      line:   mainLine,
      event:  'return',
      stack:  [{ func: 'main', locals: {} }],
      stdout: finalStdout,
      note:   `Program exited (code ${exitCode})`,
    });
  }

  const topError = runtimeError
    ? runtimeError.split('\n')[0]
    : exitCode !== 0
      ? `Exited with code ${exitCode}`
      : undefined;

  return { steps, error: topError };
}
