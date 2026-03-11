import { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2, ChevronDown, Terminal as TerminalIcon } from 'lucide-react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { useAtom } from 'jotai';
import type { TerminalState } from '../types';

interface TerminalPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalPanel({ isOpen, onClose }: TerminalPanelProps) {
  const [terminals, setTerminals] = useState<TerminalState[]>([
    { id: '1', name: 'Terminal 1', type: 'local' },
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState('1');
  const terminalRefs = useRef<Map<string, XTerm>>(new Map());
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!isOpen) return;

    // Initialize terminals
    terminals.forEach((terminal) => {
      if (!terminalRefs.current.has(terminal.id)) {
        initTerminal(terminal);
      }
    });

    return () => {
      terminalRefs.current.forEach((term) => term.dispose());
    };
  }, [isOpen]);

  const initTerminal = (terminal: TerminalState) => {
    const container = containerRefs.current.get(terminal.id);
    if (!container) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "Consolas, 'Courier New', monospace",
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      scrollback: 1000,
      tabStopWidth: 2,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(container);
    fitAddon.fit();

    // Write welcome message
    term.writeln('\x1b[1;36mWelcome to VSCode Android Terminal\x1b[0m');
    term.writeln('');
    if (terminal.type === 'local') {
      term.writeln('\x1b[33mLocal Terminal\x1b[0m - Commands run on your device');
    } else {
      term.writeln('\x1b[32mRemote Terminal\x1b[0m - Connected to Codespace');
    }
    term.writeln('');
    term.write('$ ');

    terminalRefs.current.set(terminal.id, term);

    // Handle input
    term.onData((data) => {
      // In production, this would send to shell/codespace
      term.write(data);
      
      // Echo back for demo
      if (data === '\r') {
        term.write('\r\n$ ');
      }
    });

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(container);
  };

  const addTerminal = () => {
    const newId = String(terminals.length + 1);
    const newTerminal: TerminalState = {
      id: newId,
      name: `Terminal ${newId}`,
      type: 'local',
    };
    setTerminals([...terminals, newTerminal]);
    setActiveTerminalId(newId);
  };

  const closeTerminal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (terminals.length === 1) return;

    const term = terminalRefs.current.get(id);
    if (term) {
      term.dispose();
      terminalRefs.current.delete(id);
    }

    const newTerminals = terminals.filter((t) => t.id !== id);
    setTerminals(newTerminals);

    if (activeTerminalId === id) {
      setActiveTerminalId(newTerminals[newTerminals.length - 1].id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-64 bg-vscode-bg border-t border-vscode-border flex flex-col">
      {/* Terminal Tabs */}
      <div className="flex items-center bg-vscode-sidebar border-b border-vscode-border">
        <div className="flex items-center flex-1 overflow-x-auto">
          {terminals.map((terminal) => (
            <div
              key={terminal.id}
              onClick={() => setActiveTerminalId(terminal.id)}
              className={`flex items-center gap-2 px-3 py-1.5 border-r border-vscode-border cursor-pointer min-w-[120px]
                ${activeTerminalId === terminal.id ? 'bg-vscode-bg border-t-2 border-t-vscode-blue' : 'hover:bg-vscode-line-highlight'}`}
            >
              <TerminalIcon className="w-3 h-3 text-vscode-gutter-foreground" />
              <span className="text-sm text-vscode-foreground flex-1 truncate">
                {terminal.name}
              </span>
              <button
                onClick={(e) => closeTerminal(terminal.id, e)}
                className={`p-0.5 hover:bg-white/20 rounded ${terminals.length === 1 ? 'invisible' : ''}`}
              >
                <X className="w-3 h-3 text-vscode-gutter-foreground" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 px-2">
          <button
            onClick={addTerminal}
            className="p-1 hover:bg-vscode-line-highlight rounded transition-colors"
            title="New Terminal"
          >
            <Plus className="w-4 h-4 text-vscode-foreground" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-vscode-line-highlight rounded transition-colors"
            title="Close Terminal"
          >
            <ChevronDown className="w-4 h-4 text-vscode-foreground" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        {terminals.map((terminal) => (
          <div
            key={terminal.id}
            ref={(el) => {
              if (el) containerRefs.current.set(terminal.id, el);
            }}
            className={`w-full h-full ${activeTerminalId === terminal.id ? 'block' : 'hidden'}`}
          />
        ))}
      </div>
    </div>
  );
}
