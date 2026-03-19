import { useState, useEffect, useCallback, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useFileSystem } from '../hooks/useFileSystem';
import { isCommandPaletteOpenAtom, openFilesAtom, activeFileAtom } from '../App';
import { FileNode } from '../types';
import { File, Search, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export function QuickOpen() {
  const isCommandPaletteOpen = useAtomValue(isCommandPaletteOpenAtom);
  const setIsCommandPaletteOpen = useSetAtom(isCommandPaletteOpenAtom);
  const openFiles = useAtomValue(openFilesAtom);
  // @ts-ignore - Jotai type inference issue
  const setOpenFiles = useSetAtom(openFilesAtom);
  const activeFile = useAtomValue(activeFileAtom);
  // @ts-ignore - Jotai type inference issue
  const setActiveFile = useSetAtom(activeFileAtom);
  
  const { fileTree, readFile } = useFileSystem();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<FileNode[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Collect all files from tree
  const collectFiles = useCallback((node: FileNode, files: FileNode[] = []): FileNode[] => {
    if (node.type === 'file') {
      files.push(node);
    } else if (node.children) {
      node.children.forEach((child) => collectFiles(child, files));
    }
    return files;
  }, []);

  // Filter files based on query
  const filterFiles = useCallback((files: FileNode[], query: string): FileNode[] => {
    if (!query.trim()) {
      return files.slice(0, 50); // Limit results
    }

    const queryLower = query.toLowerCase();
    const parts = queryLower.split(/[\s/]+/);

    return files
      .filter((file) => {
        const pathLower = file.path.toLowerCase();
        const nameLower = file.name.toLowerCase();

        // Match against full path or just filename
        return parts.every((part) => 
          pathLower.includes(part) || nameLower.includes(part)
        );
      })
      .sort((a, b) => {
        // Prioritize exact matches and filename matches
        const aNameMatch = a.name.toLowerCase().startsWith(queryLower);
        const bNameMatch = b.name.toLowerCase().startsWith(queryLower);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        // Then by path length (shorter paths first)
        return a.path.length - b.path.length;
      })
      .slice(0, 50);
  }, []);

  // Update results when query or fileTree changes
  useEffect(() => {
    if (!fileTree) {
      setResults([]);
      return;
    }

    const allFiles = collectFiles(fileTree);
    const filtered = filterFiles(allFiles, query);
    setResults(filtered);
    setSelectedIndex(0);
  }, [query, fileTree, collectFiles, filterFiles]);

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isCommandPaletteOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCommandPaletteOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleFileSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsCommandPaletteOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, results, selectedIndex, setIsCommandPaletteOpen]);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: FileNode) => {
    try {
      const content = await readFile(file.path);
      
      if (!openFiles.includes(file.path)) {
        setOpenFiles([...openFiles, file.path]);
      }
      
      setActiveFile(file.path);
      setIsCommandPaletteOpen(false);
      setQuery('');
      
      toast.success(`Opened ${file.name}`);
    } catch (err) {
      toast.error(`Failed to open file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [openFiles, readFile, setOpenFiles, setActiveFile, setIsCommandPaletteOpen]);

  // Highlight matching parts
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = query.split(/[\s/]+/).filter(Boolean);
    const regex = new RegExp(`(${parts.join('|')})`, 'gi');
    const parts_arr = text.split(regex);

    return parts_arr.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-vscode-blue font-semibold">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div 
        className="w-full max-w-2xl bg-vscode-sidebar border border-vscode-border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-vscode-border">
          <Search className="w-5 h-5 text-vscode-gutter-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files by name... (e.g., 'App.tsx', 'src/utils')"
            className="flex-1 bg-transparent text-vscode-foreground text-sm outline-none placeholder:text-vscode-gutter-foreground"
          />
          <button
            onClick={() => {
              setIsCommandPaletteOpen(false);
              setQuery('');
            }}
            className="p-1 hover:bg-white/10 rounded"
          >
            <X className="w-4 h-4 text-vscode-gutter-foreground" />
          </button>
        </div>

        {/* Results */}
        <div 
          ref={listRef}
          className="max-h-80 overflow-y-auto"
        >
          {results.length === 0 ? (
            query ? (
              <div className="px-4 py-8 text-center text-sm text-vscode-gutter-foreground">
                <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No files found matching "{query}"</p>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-vscode-gutter-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Start typing to search files</p>
                <p className="mt-2 text-xs">
                  Use <kbd className="px-1.5 py-0.5 bg-vscode-border rounded">↑</kbd>{' '}
                  <kbd className="px-1.5 py-0.5 bg-vscode-border rounded">↓</kbd> to navigate,{' '}
                  <kbd className="px-1.5 py-0.5 bg-vscode-border rounded">Enter</kbd> to open
                </p>
              </div>
            )
          ) : (
            <div className="py-2">
              {results.map((file, index) => {
                const fileName = file.path.split('/').pop() || '';
                const dirPath = file.path.slice(0, -fileName.length - 1);
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={file.path}
                    onClick={() => handleFileSelect(file)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${
                      isSelected ? 'bg-vscode-selection' : 'hover:bg-white/5'
                    }`}
                  >
                    <ChevronRight 
                      className={`w-4 h-4 ${
                        isSelected ? 'text-vscode-foreground' : 'text-vscode-gutter-foreground'
                      }`} 
                    />
                    <File className={`w-4 h-4 ${
                      isSelected ? 'text-vscode-foreground' : 'text-vscode-gutter-foreground'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-vscode-foreground truncate">
                        {highlightMatch(fileName, query)}
                      </div>
                      {dirPath && (
                        <div className="text-xs text-vscode-gutter-foreground truncate">
                          {highlightMatch(dirPath, query)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-vscode-border text-xs text-vscode-gutter-foreground flex items-center justify-between">
            <span>{results.length} files found</span>
            <div className="flex items-center gap-2">
              <span>
                <kbd className="px-1.5 py-0.5 bg-vscode-border rounded">↑</kbd>{' '}
                <kbd className="px-1.5 py-0.5 bg-vscode-border rounded">↓</kbd> to navigate
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-vscode-border rounded">Enter</kbd> to open
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-vscode-border rounded">Esc</kbd> to close
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick open file finder (Ctrl+P)
