import { useState, useEffect, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { connectedCodespaceAtom } from '../App';
import { X, Plus, Trash2 } from 'lucide-react';
import type { TerminalState } from '../types';
import 'xterm/css/xterm.css';

export function TerminalPanel() {
  const [terminals, setTerminals] = useState<TerminalState[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const connectedCodespace = useAtomValue(connectedCodespaceAtom);
  
  const terminalRefs = useRef<Map<string, { terminal: Terminal; fitAddon: FitAddon }>>(new Map());
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const websocketRefs = useRef<Map<string, WebSocket>>(new Map());

  // Initialize terminal
  const createTerminal = useCallback(() => {
    const id = `terminal-${Date.now()}`;
    const newTerminal: TerminalState = {
      id,
      name: `Terminal ${terminals.length + 1}`,
      type: connectedCodespace ? 'remote' : 'local',
    };

    setTerminals((prev) => [...prev, newTerminal]);
    setActiveTerminalId(id);

    return id;
  }, [terminals.length, connectedCodespace]);

  // Close terminal
  const closeTerminal = useCallback((id: string) => {
    // Dispose terminal
    const terminalData = terminalRefs.current.get(id);
    if (terminalData) {
      terminalData.terminal.dispose();
      terminalRefs.current.delete(id);
    }

    // Close WebSocket
    const ws = websocketRefs.current.get(id);
    if (ws) {
      ws.close();
      websocketRefs.current.delete(id);
    }

    // Remove from list
    setTerminals((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (activeTerminalId === id) {
        setActiveTerminalId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
  }, [activeTerminalId]);

  // Connect to codespace terminal via WebSocket
  const connectToCodespace = useCallback(async (terminalId: string) => {
    if (!connectedCodespace) return;

    setIsConnecting(true);

    try {
      // Construct WebSocket URL for codespace
      const wsUrl = `wss://${connectedCodespace.name.replace('_', '-')}.app.github.dev/terminal`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Terminal WebSocket connected');
      };

      ws.onmessage = (event) => {
        const terminalData = terminalRefs.current.get(terminalId);
        if (terminalData && event.data) {
          terminalData.terminal.write(event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('Terminal WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Terminal WebSocket closed');
      };

      websocketRefs.current.set(terminalId, ws);
    } catch (error) {
      console.error('Failed to connect to codespace terminal:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [connectedCodespace]);

  // Setup terminal instance
  useEffect(() => {
    if (!activeTerminalId) return;

    const existingTerminal = terminalRefs.current.get(activeTerminalId);
    if (existingTerminal) {
      // Terminal already exists, just fit it
      setTimeout(() => {
        existingTerminal.fitAddon.fit();
      }, 10);
      return;
    }

    // Create new terminal
    const container = containerRefs.current.get(activeTerminalId);
    if (!container) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#cccccc',
        cursorAccent: '#1e1e1e',
        black: '#000000',
        red: '#f44747',
        green: '#6a9955',
        yellow: '#d7ba7d',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4dc9b0',
        white: '#cccccc',
        brightBlack: '#666666',
        brightRed: '#f44747',
        brightGreen: '#6a9955',
        brightYellow: '#d7ba7d',
        brightBlue: '#569cd6',
        brightMagenta: '#c586c0',
        brightCyan: '#4dc9b0',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(container);
    fitAddon.fit();

    // Handle terminal input
    terminal.onData((data) => {
      const ws = websocketRefs.current.get(activeTerminalId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      } else {
        // Local terminal - echo back for demo
        terminal.write(data);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const dimensions = {
        cols: terminal.cols,
        rows: terminal.rows,
      };
      const ws = websocketRefs.current.get(activeTerminalId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', ...dimensions }));
      }
    });
    resizeObserver.observe(container);

    terminalRefs.current.set(activeTerminalId, { terminal, fitAddon });

    // Connect to codespace if available
    const activeTerminal = terminals.find((t) => t.id === activeTerminalId);
    if (activeTerminal?.type === 'remote') {
      connectToCodespace(activeTerminalId);
    }

    // Write welcome message
    terminal.writeln('\x1b[33mWelcome to VSCode Android Terminal!\x1b[0m');
    terminal.writeln('\x1b[36mType commands and press Enter\x1b[0m\n');

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeTerminalId, terminals, connectToCodespace]);

  // Fit terminals on window resize
  useEffect(() => {
    const handleResize = () => {
      terminalRefs.current.forEach(({ fitAddon }) => {
        fitAddon.fit();
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-create first terminal
  useEffect(() => {
    if (terminals.length === 0) {
      createTerminal();
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-vscode-bg">
      {/* Terminal Tabs */}
      <div className="flex items-center gap-1 px-2 py-1 bg-vscode-sidebar border-b border-vscode-border">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {terminals.map((terminal) => (
            <div
              key={terminal.id}
              onClick={() => setActiveTerminalId(terminal.id)}
              className={`flex items-center gap-2 px-3 py-1 rounded cursor-pointer text-sm ${
                activeTerminalId === terminal.id
                  ? 'bg-vscode-line-highlight text-vscode-foreground'
                  : 'text-vscode-gutter-foreground hover:bg-white/5'
              }`}
            >
              <span>{terminal.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTerminal(terminal.id);
                }}
                className="p-0.5 hover:bg-white/10 rounded opacity-0 hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={createTerminal}
            className="p-1 hover:bg-white/10 rounded"
            title="New Terminal"
          >
            <Plus className="w-4 h-4 text-vscode-foreground" />
          </button>
          {terminals.length > 0 && (
            <button
              onClick={() => activeTerminalId && closeTerminal(activeTerminalId)}
              className="p-1 hover:bg-white/10 rounded"
              title="Close Terminal"
            >
              <Trash2 className="w-4 h-4 text-vscode-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        {terminals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-vscode-gutter-foreground">
            <p className="text-sm">No terminal open</p>
            <button
              onClick={createTerminal}
              className="mt-2 px-4 py-2 bg-vscode-blue text-white rounded text-sm hover:bg-vscode-blue/80"
            >
              Create Terminal
            </button>
          </div>
        ) : (
          terminals.map((terminal) => (
            <div
              key={terminal.id}
              ref={(el) => {
                if (el) {
                  containerRefs.current.set(terminal.id, el);
                } else {
                  containerRefs.current.delete(terminal.id);
                }
              }}
              className={`h-full ${activeTerminalId !== terminal.id ? 'hidden' : ''}`}
            />
          ))
        )}
      </div>

      {/* Connection Status */}
      {isConnecting && (
        <div className="absolute bottom-8 right-8 bg-vscode-blue text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Connecting to terminal...</span>
        </div>
      )}
    </div>
  );
}

// Terminal panel with xterm.js integration
