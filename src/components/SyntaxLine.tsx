/**
 * SyntaxLine — lightweight syntax highlighter for the trace view.
 *
 * Tokenizes a single line of Python or C++ code and wraps tokens
 * in colored spans. Much lighter than loading a full editor for
 * read-only display.
 */

import type { Language } from '../types/trace';

const PY_KEYWORDS = new Set([
  'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'in',
  'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with',
  'pass', 'break', 'continue', 'yield', 'lambda', 'and', 'or', 'not',
  'is', 'global', 'nonlocal', 'assert', 'del', 'async', 'await',
]);

const PY_BUILTINS = new Set([
  'print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set',
  'tuple', 'type', 'True', 'False', 'None', 'enumerate', 'zip', 'map',
  'filter', 'sorted', 'reversed', 'abs', 'max', 'min', 'sum', 'input',
  'isinstance', 'issubclass', 'super', 'object', 'bool', 'hex', 'oct',
  'bin', 'chr', 'ord', 'open', 'iter', 'next', 'hasattr', 'getattr',
  'setattr', 'delattr', 'callable', 'property', 'staticmethod',
  'classmethod', 'ValueError', 'TypeError', 'KeyError', 'IndexError',
  'Exception', 'RuntimeError', 'StopIteration',
]);

const CPP_KEYWORDS = new Set([
  'int', 'float', 'double', 'char', 'void', 'bool', 'long', 'short',
  'unsigned', 'signed', 'const', 'static', 'struct', 'typedef', 'enum',
  'union', 'class', 'public', 'private', 'protected', 'virtual',
  'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
  'break', 'continue', 'default', 'goto', 'sizeof', 'new', 'delete',
  'this', 'template', 'typename', 'namespace', 'using', 'include',
  'define', 'ifdef', 'ifndef', 'endif', 'pragma', 'auto', 'extern',
  'register', 'volatile', 'inline', 'throw', 'try', 'catch',
]);

const CPP_TYPES = new Set([
  'NULL', 'nullptr', 'true', 'false', 'string', 'vector', 'map',
  'set', 'pair', 'Node', 'size_t', 'FILE', 'stdout', 'stderr', 'stdin',
]);

interface Token {
  text: string;
  type: 'keyword' | 'builtin' | 'string' | 'number' | 'comment' | 'operator' | 'type' | 'func' | 'plain';
}

const COLORS: Record<Token['type'], string> = {
  keyword:  '#c678dd',
  builtin:  '#61afef',
  string:   '#98c379',
  number:   '#d19a66',
  comment:  '#5c6370',
  operator: '#56b6c2',
  type:     '#e5c07b',
  func:     '#61afef',
  plain:    '#abb2bf',
};

function tokenize(line: string, lang: Language): Token[] {
  const tokens: Token[] = [];
  const keywords = lang === 'python' ? PY_KEYWORDS : CPP_KEYWORDS;
  let i = 0;

  while (i < line.length) {
    // Whitespace
    if (line[i] === ' ' || line[i] === '\t') {
      let start = i;
      while (i < line.length && (line[i] === ' ' || line[i] === '\t')) i++;
      tokens.push({ text: line.slice(start, i), type: 'plain' });
      continue;
    }

    // Comments
    if (line[i] === '#' || (line[i] === '/' && line[i + 1] === '/')) {
      tokens.push({ text: line.slice(i), type: 'comment' });
      break;
    }

    // Strings
    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++;
        j++;
      }
      tokens.push({ text: line.slice(i, j + 1), type: 'string' });
      i = j + 1;
      continue;
    }

    // Numbers
    if (/\d/.test(line[i]) && (i === 0 || !/\w/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[\d.xXa-fA-F]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), type: 'number' });
      i = j;
      continue;
    }

    // Words (keywords, builtins, identifiers)
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i;
      while (j < line.length && /\w/.test(line[j])) j++;
      const word = line.slice(i, j);

      let type: Token['type'] = 'plain';
      if (keywords.has(word)) type = 'keyword';
      else if (lang === 'python' && PY_BUILTINS.has(word)) type = 'builtin';
      else if (lang === 'cpp' && CPP_TYPES.has(word)) type = 'type';
      else if (j < line.length && line[j] === '(') type = 'func';

      tokens.push({ text: word, type });
      i = j;
      continue;
    }

    // Operators
    if ('=<>!+-*/%&|^~'.includes(line[i])) {
      let j = i;
      while (j < line.length && '=<>!+-*/%&|^~'.includes(line[j])) j++;
      tokens.push({ text: line.slice(i, j), type: 'operator' });
      i = j;
      continue;
    }

    // Preprocessor (#include)
    if (line[i] === '<' && lang === 'cpp' && tokens.some(t => t.text === 'include')) {
      let j = i;
      while (j < line.length && line[j] !== '>') j++;
      tokens.push({ text: line.slice(i, j + 1), type: 'string' });
      i = j + 1;
      continue;
    }

    // Other single chars
    tokens.push({ text: line[i], type: 'plain' });
    i++;
  }

  return tokens;
}

export default function SyntaxLine({ text, lang }: { text: string; lang: Language }) {
  if (!text.trim()) return <span> </span>;
  const tokens = tokenize(text, lang);

  return (
    <span>
      {tokens.map((t, i) => (
        <span key={i} style={{ color: COLORS[t.type] }}>{t.text}</span>
      ))}
    </span>
  );
}
