import { useState, useCallback, useEffect } from 'react';
import type { EditorSettings, Tab } from '../types';

interface UseEditorOptions {
  defaultSettings?: Partial<EditorSettings>;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export function useEditor(options: UseEditorOptions = {}) {
  const {
    defaultSettings = {},
    autoSave = true,
    autoSaveDelay = 1000,
  } = options;

  const [settings, setSettings] = useState<EditorSettings>({
    theme: 'vs-dark',
    font_size: 14,
    font_family: "Consolas, 'Courier New', monospace",
    tab_size: 2,
    word_wrap: true,
    minimap_enabled: false,
    line_numbers: true,
    auto_save: autoSave,
    auto_save_delay: autoSaveDelay,
    ...defaultSettings,
  });

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('vscode_android_editor_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.warn('Failed to load editor settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(
      'vscode_android_editor_settings',
      JSON.stringify(settings)
    );
  }, [settings]);

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Open a file in a new tab
  const openFile = useCallback((path: string, content: string, language?: string) => {
    const existingTab = tabs.find((tab) => tab.path === path);
    
    if (existingTab) {
      setActiveTabId(existingTab.path);
      return;
    }

    const fileName = path.split('/').pop() || path;
    const newTab: Tab = {
      path,
      name: fileName,
      isDirty: false,
      language,
    };

    setTabs((prev) => [...prev, newTab]);
    setFileContents((prev) => ({ ...prev, [path]: content }));
    setActiveTabId(path);
  }, [tabs]);

  // Close a tab
  const closeTab = useCallback((path: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.path !== path);
      
      // Update active tab if needed
      if (activeTabId === path) {
        if (newTabs.length > 0) {
          setActiveTabId(newTabs[newTabs.length - 1].path);
        } else {
          setActiveTabId(null);
        }
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  // Close all tabs
  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  // Close other tabs
  const closeOtherTabs = useCallback((keepPath: string) => {
    setTabs((prev) => prev.filter((tab) => tab.path === keepPath));
    setActiveTabId(keepPath);
  }, []);

  // Update file content
  const updateContent = useCallback((path: string, content: string) => {
    setFileContents((prev) => ({ ...prev, [path]: content }));
    setTabs((prev) =>
      prev.map((tab) =>
        tab.path === path ? { ...tab, isDirty: true } : tab
      )
    );
  }, []);

  // Mark file as saved
  const markSaved = useCallback((path: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.path === path ? { ...tab, isDirty: false } : tab
      )
    );
  }, []);

  // Get current file content
  const getContent = useCallback((path: string) => {
    return fileContents[path] || '';
  }, [fileContents]);

  // Get active tab
  const activeTab = tabs.find((tab) => tab.path === activeTabId);
  const activeContent = activeTab ? fileContents[activeTab.path] || '' : '';

  // Detect language from file extension
  const detectLanguage = useCallback((path: string): string => {
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
  }, []);

  return {
    // Settings
    settings,
    updateSetting,
    
    // Tabs
    tabs,
    activeTab,
    activeTabId,
    activeContent,
    
    // Tab operations
    openFile,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    
    // Content operations
    updateContent,
    markSaved,
    getContent,
    detectLanguage,
    
    // File contents
    fileContents,
  };
}
