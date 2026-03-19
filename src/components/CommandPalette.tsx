import { useState, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { X, Command, File, Folder, Settings, GitBranch, Terminal } from 'lucide-react';
import { isCommandPaletteOpenAtom, isSidebarOpenAtom } from '../App';
import type { CommandPaletteItem } from '../types';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useAtom(isCommandPaletteOpenAtom);
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(isSidebarOpenAtom);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandPaletteItem[] = [
    {
      id: 'toggle-sidebar',
      label: 'View: Toggle Sidebar',
      description: 'Show/hide the sidebar',
      shortcut: 'Ctrl+B',
      category: 'View',
      action: () => setIsSidebarOpen(!isSidebarOpen),
    },
    {
      id: 'save-file',
      label: 'File: Save',
      description: 'Save the current file',
      shortcut: 'Ctrl+S',
      category: 'File',
      action: () => console.log('Save'),
    },
    {
      id: 'save-all',
      label: 'File: Save All',
      description: 'Save all open files',
      shortcut: 'Ctrl+Shift+S',
      category: 'File',
      action: () => console.log('Save All'),
    },
    {
      id: 'new-file',
      label: 'File: New File',
      description: 'Create a new file',
      shortcut: 'Ctrl+N',
      category: 'File',
      action: () => console.log('New File'),
    },
    {
      id: 'open-file',
      label: 'File: Open File...',
      description: 'Open a file from the workspace',
      shortcut: 'Ctrl+O',
      category: 'File',
      action: () => console.log('Open File'),
    },
    {
      id: 'quick-open',
      label: 'File: Quick Open',
      description: 'Quickly open a file by name',
      shortcut: 'Ctrl+P',
      category: 'File',
      action: () => console.log('Quick Open'),
    },
    {
      id: 'find',
      label: 'Edit: Find',
      description: 'Find in file',
      shortcut: 'Ctrl+F',
      category: 'Edit',
      action: () => console.log('Find'),
    },
    {
      id: 'replace',
      label: 'Edit: Replace',
      description: 'Find and replace',
      shortcut: 'Ctrl+H',
      category: 'Edit',
      action: () => console.log('Replace'),
    },
    {
      id: 'toggle-terminal',
      label: 'View: Toggle Terminal',
      description: 'Show/hide the terminal',
      shortcut: 'Ctrl+`',
      category: 'View',
      action: () => console.log('Toggle Terminal'),
    },
    {
      id: 'git-commit',
      label: 'Git: Commit',
      description: 'Commit staged changes',
      category: 'Git',
      action: () => console.log('Git Commit'),
    },
    {
      id: 'git-push',
      label: 'Git: Push',
      description: 'Push changes to remote',
      category: 'Git',
      action: () => console.log('Git Push'),
    },
    {
      id: 'git-pull',
      label: 'Git: Pull',
      description: 'Pull changes from remote',
      category: 'Git',
      action: () => console.log('Git Pull'),
    },
    {
      id: 'sync-now',
      label: 'Codespace: Sync Now',
      description: 'Force sync with codespace',
      category: 'Codespace',
      action: () => console.log('Sync Now'),
    },
    {
      id: 'reconnect',
      label: 'Codespace: Reconnect',
      description: 'Reconnect to codespace',
      category: 'Codespace',
      action: () => console.log('Reconnect'),
    },
    {
      id: 'settings',
      label: 'Preferences: Settings',
      description: 'Open settings',
      shortcut: 'Ctrl+,',
      category: 'Preferences',
      action: () => console.log('Settings'),
    },
    {
      id: 'theme',
      label: 'Preferences: Color Theme',
      description: 'Change color theme',
      category: 'Preferences',
      action: () => console.log('Theme'),
    },
  ];

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description?.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          setIsOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-xl bg-vscode-sidebar border border-vscode-border rounded-lg shadow-2xl z-50 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-2 p-3 border-b border-vscode-border">
          <Command className="w-5 h-5 text-vscode-gutter-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-vscode-foreground outline-none text-base"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-vscode-line-highlight rounded transition-colors"
          >
            <X className="w-4 h-4 text-vscode-gutter-foreground" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-vscode-gutter-foreground">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                  index === selectedIndex ? 'bg-vscode-selection' : 'hover:bg-vscode-line-highlight'
                }`}
              >
                {(() => {
                  const IconComponent = getCommandIcon(cmd.category);
                  return <IconComponent className="w-4 h-4 text-vscode-gutter-foreground" />;
                })()}
                <div className="flex-1 min-w-0">
                  <p className="text-vscode-foreground text-sm truncate">{cmd.label}</p>
                  {cmd.description && (
                    <p className="text-vscode-gutter-foreground text-xs truncate">
                      {cmd.description}
                    </p>
                  )}
                </div>
                {cmd.shortcut && (
                  <kbd className="px-2 py-0.5 bg-vscode-bg border border-vscode-border rounded text-xs text-vscode-gutter-foreground">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-vscode-border text-xs text-vscode-gutter-foreground">
          <span>{filteredCommands.length} commands</span>
          <div className="flex items-center gap-2">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
        </div>
      </div>
    </>
  );
}

function getCommandIcon(category?: string) {
  switch (category) {
    case 'File':
      return File;
    case 'View':
      return Settings;
    case 'Edit':
      return File;
    case 'Git':
      return GitBranch;
    case 'Codespace':
      return Terminal;
    case 'Preferences':
      return Settings;
    default:
      return Command;
  }
}
