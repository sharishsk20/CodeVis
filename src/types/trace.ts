export type TraceValue =
  | number | string | boolean | null
  | TraceValue[]
  | { [key: string]: TraceValue };

export type TraceEvent = 'step' | 'call' | 'return' | 'exception';
export type Language   = 'python' | 'cpp';

export interface StackFrame {
  func:     string;
  locals:   Record<string, TraceValue>;
  globals?: Record<string, TraceValue>;
  types?:   Record<string, string>;
}

export interface HeapField {
  key:     string;
  val:     TraceValue | '?';
  isPtr:   boolean;
  target?: string | null;   // string=node id, null=NULL, undefined=uninitialized
}

export interface HeapNode {
  id:     string;
  fields: HeapField[];
}

export interface TraceStep {
  step:    number;
  line:    number;
  event:   TraceEvent;
  stack:   StackFrame[];
  heap?:   HeapNode[];
  stdout:  string;
  note?:   string;
  error?:  string;
}

export interface TraceResult {
  steps: TraceStep[];
  error?: string;
}

export interface SampleTrace {
  code:  string;
  steps: TraceStep[];
}
