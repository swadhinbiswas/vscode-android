import { useState, useCallback, useRef, useEffect } from 'react';
import { useFileSystem } from '../hooks/useFileSystem';
import { FileNode } from '../types';
import { Search, X, ChevronRight, ChevronDown, Replace, ReplaceAll } from 'lucide-react';
import toast from 'react-hot-toast';

interface SearchResult {
  path: string;
  fileName: string;
  line: number;
  column: number;
  text: string;
  match: string;
}

export function SearchPanel() {
  const { fileTree, readFile } = useFileSystem();
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim() || !fileTree) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const newResults: SearchResult[] = [];

    try {
      // Collect all file paths
      const files: string[] = [];
      const collectFiles = (node: FileNode) => {
        if (node.type === 'file') {
          files.push(node.path);
        } else if (node.children) {
          node.children.forEach(collectFiles);
        }
      };
      collectFiles(fileTree);

      // Search in each file
      const regex = buildRegex(searchQuery, { useRegex, caseSensitive, wholeWord });
      
      for (const filePath of files) {
        try {
          const content = await readFile(filePath);
          const lines = content.split('\n');

          for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            const matches = regex ? [...line.matchAll(regex)] : [];
            
            // If no regex, use simple includes
            const hasMatch = regex 
              ? matches.length > 0
              : caseSensitive
                ? line.includes(searchQuery)
                : line.toLowerCase().includes(searchQuery.toLowerCase());

            if (hasMatch) {
              // Find all matches in line
              const matchIndices: number[] = [];
              if (regex) {
                matches.forEach(m => matchIndices.push(m.index || 0));
              } else {
                let idx = 0;
                const searchLower = searchQuery.toLowerCase();
                const lineLower = line.toLowerCase();
                while ((idx = lineLower.indexOf(searchLower, idx)) !== -1) {
                  matchIndices.push(idx);
                  idx += searchQuery.length;
                }
              }

              for (const col of matchIndices) {
                const matchText = regex 
                  ? (matches.find(m => m.index === col)?.[0] || searchQuery)
                  : line.substring(col, col + searchQuery.length);

                newResults.push({
                  path: filePath,
                  fileName: filePath.split('/').pop() || '',
                  line: lineNum + 1,
                  column: col + 1,
                  text: line.trim(),
                  match: matchText,
                });
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to search file ${filePath}:`, err);
        }
      }

      setResults(newResults);
      
      // Auto-expand all files with results
      const filesWithResults = new Set(newResults.map(r => r.path));
      setExpandedFiles(filesWithResults);

      toast.success(`Found ${newResults.length} matches`);
    } catch (err) {
      toast.error(`Search failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, fileTree, readFile, useRegex, caseSensitive, wholeWord]);

  // Build regex based on options
  function buildRegex(pattern: string, options: { useRegex: boolean; caseSensitive: boolean; wholeWord: boolean }) {
    try {
      let escaped = options.useRegex ? pattern : pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      if (options.wholeWord) {
        escaped = `\\b${escaped}\\b`;
      }

      const flags = options.caseSensitive ? 'g' : 'gi';
      return new RegExp(escaped, flags);
    } catch {
      return null;
    }
  }

  // Toggle file expansion
  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Group results by file
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.path]) {
      acc[result.path] = [];
    }
    acc[result.path].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    // Emit custom event for editor to handle
    window.dispatchEvent(
      new CustomEvent('open-file-at-position', {
        detail: { path: result.path, line: result.line, column: result.column },
      })
    );
  };

  // Replace in single file
  const handleReplace = async (path: string, result: SearchResult) => {
    try {
      const content = await readFile(path);
      const regex = buildRegex(result.match, { useRegex, caseSensitive, wholeWord });
      
      let newContent: string;
      if (regex) {
        newContent = content.replace(regex, replaceQuery);
      } else {
        const flags = caseSensitive ? 'g' : 'gi';
        const simpleRegex = new RegExp(result.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        newContent = content.replace(simpleRegex, replaceQuery);
      }

      // Emit event to save file
      window.dispatchEvent(
        new CustomEvent('save-file-content', {
          detail: { path, content: newContent },
        })
      );

      toast.success('Replaced in file');
      performSearch(); // Refresh results
    } catch (err) {
      toast.error(`Replace failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Replace all in all files
  const handleReplaceAll = async () => {
    if (!searchQuery.trim()) return;

    try {
      let replaceCount = 0;

      for (const [path, fileResults] of Object.entries(groupedResults)) {
        const content = await readFile(path);
        const regex = buildRegex(searchQuery, { useRegex, caseSensitive, wholeWord });
        
        let newContent: string;
        if (regex) {
          const matches = [...content.matchAll(regex)];
          replaceCount += matches.length;
          newContent = content.replace(regex, replaceQuery);
        } else {
          const flags = caseSensitive ? 'g' : 'gi';
          const simpleRegex = new RegExp(
            searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            flags
          );
          const matches = [...content.matchAll(simpleRegex)];
          replaceCount += matches.length;
          newContent = content.replace(simpleRegex, replaceQuery);
        }

        window.dispatchEvent(
          new CustomEvent('save-file-content', {
            detail: { path, content: newContent },
          })
        );
      }

      toast.success(`Replaced ${replaceCount} occurrences`);
      performSearch();
    } catch (err) {
      toast.error(`Replace all failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-vscode-sidebar">
      {/* Header */}
      <div className="px-3 py-2 border-b border-vscode-border">
        <span className="text-xs font-semibold text-vscode-foreground uppercase tracking-wider">
          Search
        </span>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-vscode-border space-y-2">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Search"
            className="w-full bg-vscode-bg border border-vscode-border text-sm text-vscode-foreground px-3 py-1.5 pr-8 rounded outline-none focus:border-vscode-blue"
          />
          <button
            onClick={performSearch}
            disabled={!searchQuery.trim() || isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/10 rounded disabled:opacity-50"
          >
            <Search className="w-4 h-4 text-vscode-foreground" />
          </button>
        </div>

        {/* Search Options */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`px-2 py-0.5 text-xs rounded border ${
              caseSensitive
                ? 'bg-vscode-blue border-vscode-blue text-white'
                : 'bg-vscode-bg border-vscode-border text-vscode-foreground'
            }`}
            title="Match Case"
          >
            Aa
          </button>
          <button
            onClick={() => setWholeWord(!wholeWord)}
            className={`px-2 py-0.5 text-xs rounded border ${
              wholeWord
                ? 'bg-vscode-blue border-vscode-blue text-white'
                : 'bg-vscode-bg border-vscode-border text-vscode-foreground'
            }`}
            title="Match Whole Word"
          >
            ab
          </button>
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={`px-2 py-0.5 text-xs rounded border ${
              useRegex
                ? 'bg-vscode-blue border-vscode-blue text-white'
                : 'bg-vscode-bg border-vscode-border text-vscode-foreground'
            }`}
            title="Use Regular Expression"
          >
            .*
          </button>
        </div>

        {/* Replace Input */}
        {showReplace && (
          <div className="relative">
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace"
              className="w-full bg-vscode-bg border border-vscode-border text-sm text-vscode-foreground px-3 py-1.5 pr-8 rounded outline-none focus:border-vscode-blue"
            />
          </div>
        )}

        {/* Replace Toggle & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReplace(!showReplace)}
            className="text-xs text-vscode-foreground hover:text-vscode-blue"
          >
            {showReplace ? 'Hide Replace' : 'Replace'}
          </button>
          {showReplace && results.length > 0 && (
            <button
              onClick={handleReplaceAll}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-vscode-blue text-white rounded hover:bg-vscode-blue/80"
            >
              <ReplaceAll className="w-3 h-3" />
              <span>Replace All</span>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border-2 border-vscode-blue/30 border-t-vscode-blue rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          searchQuery && (
            <div className="p-3 text-sm text-vscode-gutter-foreground text-center">
              No results found
            </div>
          )
        ) : (
          <div className="divide-y divide-vscode-border">
            {Object.entries(groupedResults).map(([path, fileResults]) => {
              const isExpanded = expandedFiles.has(path);
              const fileName = path.split('/').pop() || '';

              return (
                <div key={path}>
                  {/* File Header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5"
                    onClick={() => toggleFile(path)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-vscode-gutter-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-vscode-gutter-foreground" />
                    )}
                    <span className="text-sm text-vscode-foreground font-medium">
                      {fileName}
                    </span>
                    <span className="text-xs text-vscode-gutter-foreground">
                      {fileResults.length} matches
                    </span>
                  </div>

                  {/* Results */}
                  {isExpanded && (
                    <div>
                      {fileResults.map((result, idx) => (
                        <div
                          key={`${path}-${idx}`}
                          onClick={() => handleResultClick(result)}
                          className="px-3 py-1.5 pl-9 cursor-pointer hover:bg-white/5"
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-vscode-blue">
                              {result.line}:{result.column}
                            </span>
                            <span className="text-vscode-gutter-foreground truncate">
                              {result.text}
                            </span>
                          </div>
                          {showReplace && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReplace(path, result);
                              }}
                              className="mt-1 flex items-center gap-1 px-2 py-0.5 text-xs bg-vscode-blue/20 text-vscode-blue rounded hover:bg-vscode-blue/30"
                            >
                              <Replace className="w-3 h-3" />
                              <span>Replace</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="px-3 py-2 border-t border-vscode-border text-xs text-vscode-gutter-foreground">
          {results.length} results in {Object.keys(groupedResults).length} files
        </div>
      )}
    </div>
  );
}

// Search panel with file content search
