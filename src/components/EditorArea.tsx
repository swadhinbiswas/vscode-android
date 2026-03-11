import { useState, useEffect, useRef, useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import Editor from '@monaco-editor/react';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import {
  openFilesAtom,
  activeFileAtom,
  editorSettingsAtom,
  syncStatusAtom,
} from '../App';
import type { MonacoEditorOptions } from '../types';

// Mock file contents - in production, these would come from the codespace
const mockFileContents: Record<string, string> = {
  'src/App.tsx': `import React from 'react';
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <h1>Hello, VSCode Android!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

export default App;`,
  'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  'package.json': `{
  "name": "vscode-android",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`,
  'README.md': `# VSCode Android

A VS Code-like editor for Android with GitHub Codespaces integration.

## Features

- Monaco Editor with full IntelliSense
- Real-time sync with Codespaces
- Offline mode support
- Touch-optimized UI

## Getting Started

1. Sign in with GitHub
2. Select a Codespace
3. Start coding!
`,
};

export function EditorArea() {
  const [openFiles, setOpenFiles] = useAtom(openFilesAtom);
  const [activeFile, setActiveFile] = useAtom(activeFileAtom);
  const editorSettings = useAtomValue(editorSettingsAtom);
  const syncStatus = useAtomValue(syncStatusAtom);
  
  const [fileContents, setFileContents] = useState<Record<string, string>>(mockFileContents);
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

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
    });

    // Add save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  }, [editorSettings, activeFile]);

  const handleValueChange = useCallback((value: string | undefined) => {
    if (activeFile && value !== undefined) {
      setFileContents((prev) => ({
        ...prev,
        [activeFile]: value,
      }));
      setDirtyFiles((prev) => new Set(prev).add(activeFile));
    }
  }, [activeFile]);

  const handleSave = useCallback(async () => {
    if (!activeFile || !dirtyFiles.has(activeFile)) return;
    
    setIsSaving(true);
    try {
      const content = fileContents[activeFile];
      
      // Sync to codespace
      await invoke('sync_file_to_codespace', {
        path: activeFile,
        content,
      });
      
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
  }, [activeFile, dirtyFiles, fileContents]);

  const closeFile = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  if (openFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-vscode-bg">
        <div className="text-center">
          <svg
            className="w-24 h-24 text-vscode-border mx-auto mb-4"
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
          <div className="text-sm text-vscode-gutter-foreground space-y-1">
            <p>
              <kbd className="px-2 py-1 bg-vscode-border rounded">Ctrl+P</kbd>{' '}
              Quick Open
            </p>
            <p>
              <kbd className="px-2 py-1 bg-vscode-border rounded">Ctrl+Shift+P</kbd>{' '}
              Command Palette
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-vscode-bg overflow-hidden">
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
              className={`vscode-tab group ${isActive ? 'vscode-tab-active' : ''}`}
            >
              <span className="flex-1 truncate text-sm">{fileName}</span>
              {isDirty ? (
                <div className="w-2 h-2 rounded-full bg-vscode-foreground" />
              ) : (
                <button
                  onClick={(e) => closeFile(path, e)}
                  className="p-0.5 hover:bg-white/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={getLanguage(activeFile)}
            theme={editorSettings.theme}
            value={fileContents[activeFile] || ''}
            onChange={handleValueChange}
            onMount={handleEditorMount}
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
              cursorSmoothCaretAnimation: true,
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
            } as MonacoEditorOptions}
          />
        </div>
      )}

      {/* Save indicator */}
      {isSaving && (
        <div className="absolute bottom-8 right-8 bg-vscode-blue text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Saving...</span>
        </div>
      )}
    </div>
  );
}
