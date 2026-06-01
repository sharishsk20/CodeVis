/**
 * CodeEditor — CodeMirror 6 wrapper for the edit mode.
 *
 * Provides real syntax highlighting, auto-indent, bracket matching,
 * line numbers, and a dark theme matching the app's palette.
 */

import { useRef, useEffect } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import type { Language } from '../types/trace';

interface Props {
  code: string;
  lang: Language;
  onChange: (code: string) => void;
}

// Custom dark theme to match our app palette
const codevisTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    height: '100%',
    backgroundColor: '#161b22',
  },
  '.cm-content': {
    caretColor: '#22d3ee',
    padding: '10px 0',
  },
  '.cm-cursor': {
    borderLeftColor: '#22d3ee',
    borderLeftWidth: '2px',
  },
  '.cm-gutters': {
    backgroundColor: '#161b22',
    color: '#484f58',
    border: 'none',
    borderRight: '1px solid rgba(255,255,255,0.06)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(168,85,247,0.08)',
    color: '#a855f7',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(168,85,247,0.06)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(56,189,248,0.15) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(56,189,248,0.2) !important',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(29,158,117,0.25)',
    outline: '1px solid rgba(29,158,117,0.4)',
  },
  '.cm-line': {
    padding: '0 10px',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
}, { dark: true });

export default function CodeEditor({ code, lang, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const langExt = lang === 'python' ? python() : cpp();

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        langExt,
        oneDark,
        codevisTheme,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [lang]); // Recreate on language change

  // Sync external code changes (e.g. sample switch)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== code) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code },
      });
    }
  }, [code]);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden' }}
    />
  );
}
