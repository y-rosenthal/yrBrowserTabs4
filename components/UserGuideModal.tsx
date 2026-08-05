
import React, { useMemo } from 'react';
import { X, Download, BookOpen } from 'lucide-react';
// Import the README content as a raw string
// Use relative path to ensure it resolves correctly without aliases
import readmeContent from '../README.md?raw';
import { useEscapeClose } from './useEscapeClose';

interface UserGuideModalProps {
  onClose: () => void;
}

// --- Minimal markdown renderer (no external deps) ---
// Supports what README.md actually uses: #–#### headings, ---, bullet and
// numbered lists, > quotes, ``` code fences, and inline **bold**, `code`,
// [links](url) and *italic*.

const renderInline = (text: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  // Split on inline tokens, keeping them (capture group).
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g);
  parts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={i} className="font-semibold text-slate-800 dark:text-slate-100">{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('`') && part.endsWith('`')) {
      nodes.push(<code key={i} className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[0.85em] font-mono text-indigo-700 dark:text-indigo-300">{part.slice(1, -1)}</code>);
    } else if (part.startsWith('[')) {
      const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (m) {
        nodes.push(<a key={i} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">{m[1]}</a>);
      } else {
        nodes.push(part);
      }
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      nodes.push(<em key={i}>{part.slice(1, -1)}</em>);
    } else {
      nodes.push(part);
    }
  });
  return nodes;
};

interface ListItem { text: string; subs: string[] }

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'hr' }
  | { type: 'ul'; items: ListItem[] }
  | { type: 'ol'; start: number; items: ListItem[] }
  | { type: 'quote'; lines: string[] }
  | { type: 'code'; lines: string[] }
  | { type: 'p'; lines: string[] };

const parseMarkdown = (md: string): Block[] => {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    if (trimmed.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
      i++; // skip closing fence
      blocks.push({ type: 'code', lines: code });
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) { blocks.push({ type: 'hr' }); i++; continue; }

    // List parsing, shared between bullet and numbered lists. Indented "- "
    // lines become nested sub-bullets; other indented lines fold into the
    // item's text; blank lines don't end the list when another item of the
    // same kind follows (markdown authors often blank-line between numbered
    // steps, and naive splitting restarts every list at "1.").
    const parseList = (itemRe: RegExp): ListItem[] => {
      const items: ListItem[] = [];
      while (i < lines.length) {
        const raw = lines[i];
        const t = raw.trim();
        const indented = /^\s{2,}/.test(raw);
        if (!t) {
          let j = i + 1;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && itemRe.test(lines[j].trim())) { i = j; continue; }
          break;
        }
        if (!indented && itemRe.test(t)) { items.push({ text: t.replace(itemRe, ''), subs: [] }); i++; }
        else if (indented && /^[-*]\s+/.test(t) && items.length > 0) { items[items.length - 1].subs.push(t.replace(/^[-*]\s+/, '')); i++; }
        else if (indented && items.length > 0) { items[items.length - 1].text += ' ' + t; i++; }
        else break;
      }
      return items;
    };

    if (/^[-*]\s+/.test(trimmed)) {
      blocks.push({ type: 'ul', items: parseList(/^[-*]\s+/) });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const start = parseInt(trimmed, 10) || 1;
      blocks.push({ type: 'ol', start, items: parseList(/^\d+\.\s+/) });
      continue;
    }

    if (trimmed.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) { quote.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
      blocks.push({ type: 'quote', lines: quote });
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|[-*]\s|\d+\.\s|>|```|-{3,}$)/.test(lines[i].trim())) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'p', lines: para });
  }
  return blocks;
};

const MarkdownView: React.FC<{ markdown: string }> = ({ markdown }) => {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading': {
            if (b.level === 1) return <h1 key={i} className="text-2xl font-bold text-slate-900 dark:text-white pt-2">{renderInline(b.text)}</h1>;
            if (b.level === 2) return <h2 key={i} className="text-lg font-bold text-slate-900 dark:text-white pt-4 pb-1 border-b border-slate-200 dark:border-slate-800">{renderInline(b.text)}</h2>;
            if (b.level === 3) return <h3 key={i} className="text-base font-semibold text-indigo-700 dark:text-indigo-300 pt-2">{renderInline(b.text)}</h3>;
            return <h4 key={i} className="text-sm font-semibold text-slate-800 dark:text-slate-200 pt-1">{renderInline(b.text)}</h4>;
          }
          case 'hr':
            return <hr key={i} className="border-slate-200 dark:border-slate-800 my-4" />;
          case 'ul':
            return (
              <ul key={i} className="list-disc pl-5 space-y-1.5">
                {b.items.map((item, j) => (
                  <li key={j}>
                    {renderInline(item.text)}
                    {item.subs.length > 0 && (
                      <ul className="list-[circle] pl-5 mt-1 space-y-1">
                        {item.subs.map((s, k) => <li key={k}>{renderInline(s)}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} start={b.start} className="list-decimal pl-5 space-y-1.5">
                {b.items.map((item, j) => (
                  <li key={j}>
                    {renderInline(item.text)}
                    {item.subs.length > 0 && (
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        {item.subs.map((s, k) => <li key={k}>{renderInline(s)}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            );
          case 'quote':
            return (
              <blockquote key={i} className="border-l-4 border-indigo-300 dark:border-indigo-700 pl-3 py-1 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-r text-slate-600 dark:text-slate-400">
                {b.lines.map((l, j) => <p key={j}>{renderInline(l)}</p>)}
              </blockquote>
            );
          case 'code':
            return (
              <pre key={i} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 overflow-x-auto text-xs font-mono text-slate-800 dark:text-slate-200">
                {b.lines.join('\n')}
              </pre>
            );
          case 'p':
            return <p key={i}>{renderInline(b.lines.join(' '))}</p>;
        }
      })}
    </div>
  );
};

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ onClose }) => {
  useEscapeClose(onClose);
  const handleDownload = () => {
    const blob = new Blob([readmeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TabMaster-UserGuide.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">

        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-semibold">
            <BookOpen className="text-indigo-600 dark:text-indigo-400" size={20} />
            User Guide
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Download Guide"
            >
              <Download size={18} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-8 py-6 overflow-y-auto">
          <MarkdownView markdown={readmeContent} />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
