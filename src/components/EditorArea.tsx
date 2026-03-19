import { useState, useEffect, useRef, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import Editor from '@monaco-editor/react';
import { X, Save, FileSymlink } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import {
  openFilesAtom,
  activeFileAtom,
  editorSettingsAtom,
  syncStatusAtom,
  connectedCodespaceAtom,
} from '../App';
import { useFileSystem } from '../hooks/useFileSystem';
import { FindReplaceWidget } from './FindReplaceWidget';
import type { MonacoEditorOptions } from '../types';

export function EditorArea() {
  const [openFiles, setOpenFiles] = useAtom(openFilesAtom);
  const [activeFile, setActiveFile] = useAtom(activeFileAtom);
  const editorSettings = useAtomValue(editorSettingsAtom);
  const syncStatus = useAtomValue(syncStatusAtom);
  const connectedCodespace = useAtomValue(connectedCodespaceAtom);

  const { readFile, writeFile } = useFileSystem();
  
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showFindWidget, setShowFindWidget] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Load file content when active file changes
  useEffect(() => {
    if (!activeFile) return;

    const loadFile = async () => {
      if (fileContents[activeFile]) {
        return; // Already loaded
      }

      setIsLoadingFile(true);
      try {
        let content = '';
        
        if (connectedCodespace) {
          // Try to get from codespace
          try {
            content = await invoke<string>('get_remote_file', {
              path: activeFile,
            });
          } catch {
            // Fallback to local read
            content = await readFile(activeFile).catch(() => '');
          }
        } else {
          content = await readFile(activeFile).catch(() => '');
        }

        if (content) {
          setFileContents((prev) => ({ ...prev, [activeFile]: content }));
        }
      } catch (error) {
        console.error(`Failed to load file ${activeFile}:`, error);
        toast.error(`Failed to load file: ${activeFile}`);
      } finally {
        setIsLoadingFile(false);
      }
    };

    loadFile();
  }, [activeFile, connectedCodespace, readFile, fileContents]);

  // Listen for save events
  useEffect(() => {
    const handleSave = () => {
      if (activeFile && dirtyFiles.has(activeFile)) {
        handleSaveFile();
      }
    };

    const handleFindOpen = () => {
      setShowFindWidget(true);
    };

    const handleFileContent = (event: CustomEvent) => {
      const { path, content } = event.detail;
      if (path === activeFile) {
        setFileContents((prev) => ({ ...prev, [path]: content }));
        setDirtyFiles((prev) => new Set(prev).add(path));
      }
    };

    window.addEventListener('save-active-file', handleSave);
    window.addEventListener('open-find-widget', handleFindOpen);
    window.addEventListener('save-file-content', handleFileContent as EventListener);

    return () => {
      window.removeEventListener('save-active-file', handleSave);
      window.removeEventListener('open-find-widget', handleFindOpen);
      window.removeEventListener('save-file-content', handleFileContent as EventListener);
    };
  }, [activeFile, dirtyFiles, fileContents]);

  // Listen for file position events from search
  useEffect(() => {
    const handleOpenAtPosition = (event: CustomEvent) => {
      const { path, line, column } = event.detail;
      
      if (!openFiles.includes(path)) {
        setOpenFiles([...openFiles, path]);
      }
      setActiveFile(path);
      
      // Navigate to position after file loads
      setTimeout(() => {
        if (editorRef.current && monacoRef.current) {
          const model = editorRef.current.getModel();
          if (model) {
            const position = new monacoRef.current.Position(line, column);
            editorRef.current.setPosition(position);
            editorRef.current.revealPositionInCenter(position);
            editorRef.current.focus();
          }
        }
      }, 100);
    };

    window.addEventListener('open-file-at-position', handleOpenAtPosition as EventListener);
    return () => {
      window.removeEventListener('open-file-at-position', handleOpenAtPosition as EventListener);
    };
  }, [openFiles, setOpenFiles, setActiveFile]);

  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure editor
    editor.updateOptions({
      fontSize: editorSettings.font_size,
      minimap: { enabled: editorSettings.minimap_enabled },
      lineNumbers: editorSettings.line_numbers ? 'on' : 'off',
      wordWrap: editorSettings.word_wrap ? 'on' : 'off',
      tabSize: editorSettings.tab_size,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: true,
      padding: { top: 8, bottom: 8 },
      folding: true,
      bracketPairColorization: { enabled: true },
      guides: { indentation: true },
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      formatOnPaste: true,
      formatOnType: true,
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
    });

    // Add save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveFile();
    });

    // Add find shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      setShowFindWidget(true);
    });
  }, [editorSettings]);

  const handleValueChange = useCallback((value: string | undefined) => {
    if (activeFile && value !== undefined) {
      setFileContents((prev) => ({
        ...prev,
        [activeFile]: value,
      }));
      setDirtyFiles((prev) => new Set(prev).add(activeFile));
    }
  }, [activeFile]);

  const handleSaveFile = useCallback(async () => {
    if (!activeFile || !dirtyFiles.has(activeFile)) return;

    setIsSaving(true);
    try {
      const content = fileContents[activeFile];

      // Save to local file system
      await writeFile(activeFile, content);

      // Sync to codespace if connected
      if (connectedCodespace) {
        await invoke('sync_file_to_codespace', {
          path: activeFile,
          content,
        });
      }

      setDirtyFiles((prev) => {
        const next = new Set(prev);
        next.delete(activeFile);
        return next;
      });

      toast.success('File saved');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, dirtyFiles, fileContents, writeFile, connectedCodespace]);

  const closeFile = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if file is dirty
    if (dirtyFiles.has(path)) {
      const confirm = window.confirm('You have unsaved changes. Close anyway?');
      if (!confirm) return;
    }
    
    const newOpenFiles = openFiles.filter((p) => p !== path);
    setOpenFiles(newOpenFiles);

    if (activeFile === path) {
      if (newOpenFiles.length > 0) {
        setActiveFile(newOpenFiles[newOpenFiles.length - 1]);
      } else {
        setActiveFile(null);
      }
    }
  };

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      md: 'markdown',
      html: 'html',
      css: 'css',
      scss: 'scss',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      sh: 'shell',
      yml: 'yaml',
      yaml: 'yaml',
      xml: 'xml',
      sql: 'sql',
      kt: 'kotlin',
      swift: 'swift',
      rb: 'ruby',
      php: 'php',
      cs: 'csharp',
      fs: 'fsharp',
      ex: 'elixir',
      exs: 'elixir',
      erl: 'erlang',
      hs: 'haskell',
      clj: 'clojure',
      scala: 'scala',
      r: 'r',
      R: 'r',
      graphql: 'graphql',
      gql: 'graphql',
      dockerfile: 'dockerfile',
      makefile: 'makefile',
      cmake: 'cmake',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  if (openFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-vscode-bg">
        <div className="text-center">
          <svg
            className="w-32 h-32 text-vscode-border mx-auto mb-4 opacity-50"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <path d="M20 20 L80 50 L20 80 Z" />
            <path d="M30 35 L65 50 L30 65 Z" fill="#1e1e1e" />
          </svg>
          <h2 className="text-xl font-semibold text-vscode-foreground mb-2">
            No file open
          </h2>
          <p className="text-vscode-gutter-foreground mb-4">
            Select a file from the explorer to start editing
          </p>
          <div className="text-sm text-vscode-gutter-foreground space-y-2">
            <div className="flex items-center justify-center gap-2">
              <kbd className="px-2 py-1 bg-vscode-border rounded text-xs">Ctrl+P</kbd>
              <span>Quick Open</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <kbd className="px-2 py-1 bg-vscode-border rounded text-xs">Ctrl+Shift+P</kbd>
              <span>Command Palette</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <kbd className="px-2 py-1 bg-vscode-border rounded text-xs">Ctrl+`</kbd>
              <span>Toggle Terminal</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-vscode-bg overflow-hidden relative">
      {/* Tabs */}
      <div className="flex items-center bg-vscode-sidebar border-b border-vscode-border overflow-x-auto">
        {openFiles.map((path) => {
          const fileName = path.split('/').pop() || path;
          const isActive = activeFile === path;
          const isDirty = dirtyFiles.has(path);

          return (
            <div
              key={path}
              onClick={() => setActiveFile(path)}
              className={`flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] cursor-pointer border-r border-vscode-border group ${
                isActive 
                  ? 'bg-vscode-bg text-vscode-foreground' 
                  : 'hover:bg-white/5 text-vscode-gutter-foreground'
              }`}
            >
              <span className="flex-1 truncate text-sm">{fileName}</span>
              {isDirty ? (
                <div className="w-2 h-2 rounded-full bg-vscode-blue flex-shrink-0" />
              ) : (
                <button
                  onClick={(e) => closeFile(path, e)}
                  className="p-0.5 hover:bg-white/20 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Editor */}
      {activeFile && (
        <div className="flex-1 overflow-hidden relative">
          {isLoadingFile ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-vscode-blue/30 border-t-vscode-blue rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <Editor
                height="100%"
                language={getLanguage(activeFile)}
                theme={editorSettings.theme}
                value={fileContents[activeFile] || ''}
                onChange={handleValueChange}
                onMount={handleEditorMount}
                loading={
                  <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-vscode-blue/30 border-t-vscode-blue rounded-full animate-spin" />
                  </div>
                }
                options={{
                  fontSize: editorSettings.font_size,
                  minimap: { enabled: editorSettings.minimap_enabled },
                  lineNumbers: editorSettings.line_numbers ? 'on' : 'off',
                  wordWrap: editorSettings.word_wrap ? 'on' : 'off',
                  tabSize: editorSettings.tab_size,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on' as const,
                  padding: { top: 8, bottom: 8 },
                  folding: true,
                  bracketPairColorization: { enabled: true },
                  guides: { indentation: true },
                  renderWhitespace: 'selection',
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                  formatOnPaste: true,
                  formatOnType: true,
                  autoClosingBrackets: 'always',
                  autoClosingQuotes: 'always',
                }}
              />
              
              {/* Find/Replace Widget */}
              {showFindWidget && editorRef.current && monacoRef.current && (
                <FindReplaceWidget
                  editorInstance={editorRef.current}
                  monacoInstance={monacoRef.current}
                  onClose={() => setShowFindWidget(false)}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Save indicator */}
      {isSaving && (
        <div className="absolute bottom-4 right-4 bg-vscode-blue text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-20">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Saving...</span>
        </div>
      )}

      {/* Dirty file indicator */}
      {activeFile && dirtyFiles.has(activeFile) && !isSaving && (
        <div className="absolute bottom-4 right-4 bg-vscode-warning text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-20">
          <FileSymlink className="w-4 h-4" />
          <span>Unsaved changes</span>
          <button
            onClick={handleSaveFile}
            className="ml-2 px-2 py-0.5 bg-white/20 rounded hover:bg-white/30"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

// Editor area with Monaco integration
