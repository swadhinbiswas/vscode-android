import { useEffect, useState, useCallback } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Toaster } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { CodespaceSelector } from './components/CodespaceSelector';
import { MainLayout } from './components/MainLayout';
import { CommandPalette } from './components/CommandPalette';
import { useFileSystem } from './hooks/useFileSystem';
import type { GitHubUser, Codespace, SyncStatus, EditorSettings } from './types';

// Global state atoms
export const isAuthenticatedAtom = atom<boolean>(false);
export const githubUserAtom = atom<GitHubUser | null>(null);
export const connectedCodespaceAtom = atom<Codespace | null>(null);
export const syncStatusAtom = atom<SyncStatus | null>(null);
export const editorSettingsAtom = atom<EditorSettings>({
  theme: 'vs-dark',
  font_size: 14,
  font_family: "Consolas, 'Courier New', monospace",
  tab_size: 2,
  word_wrap: true,
  minimap_enabled: false,
  line_numbers: true,
  auto_save: true,
  auto_save_delay: 1000,
});
export const openFilesAtom = atom<string[]>([]);
export const activeFileAtom = atom<string | null>(null);
export const isSidebarOpenAtom = atom<boolean>(true);
export const isCommandPaletteOpenAtom = atom<boolean>(false);
export const isFullscreenAtom = atom<boolean>(false);
export const themeAtom = atom<'dark' | 'light' | 'system'>('dark');

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState<'splash' | 'auth' | 'codespace' | 'editor'>('splash');
  const [initError, setInitError] = useState<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useAtom(isAuthenticatedAtom);
  // @ts-ignore - Jotai type inference issue
  const setGithubUser = useSetAtom(githubUserAtom);
  // @ts-ignore - Jotai type inference issue
  const setConnectedCodespace = useSetAtom(connectedCodespaceAtom);
  // @ts-ignore - Jotai type inference issue
  const setSyncStatus = useSetAtom(syncStatusAtom);
  const theme = useAtomValue(themeAtom);
  const { initializeWorkspace } = useFileSystem();

  // Initialize app
  const initApp = useCallback(async () => {
    try {
      // Check for stored auth
      const stored = localStorage.getItem('vscode_android_auth');
      if (stored) {
        const auth = JSON.parse(stored);
        if (auth.isAuthenticated) {
          setIsAuthenticated(true);
          setGithubUser(auth.user);

          // Check for stored codespace
          if (auth.codespace) {
            setConnectedCodespace(auth.codespace);
            setAppState('editor');
            
            // Initialize workspace
            await initializeWorkspace();
          } else {
            setAppState('codespace');
          }
        } else {
          setAppState('auth');
        }
      } else {
        setAppState('auth');
      }

      // Fetch initial sync status
      try {
        const status = await invoke<SyncStatus>('get_sync_status');
        setSyncStatus(status);
      } catch (e) {
        console.warn('Failed to fetch sync status:', e);
      }
    } catch (error) {
      console.error('App initialization error:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown error');
      setAppState('auth');
    } finally {
      setIsLoading(false);
    }
  }, [setIsAuthenticated, setGithubUser, setConnectedCodespace, setSyncStatus, initializeWorkspace]);

  useEffect(() => {
    initApp();
  }, [initApp]);

  // Update HTML class for theme
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  // Handle auth complete
  const handleAuthComplete = () => {
    setAppState('codespace');
  };

  // Handle codespace select
  const handleCodespaceSelect = () => {
    setAppState('editor');
    initializeWorkspace();
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vscode-bg p-4">
        <div className="max-w-md w-full bg-vscode-sidebar border border-vscode-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-sync-error mb-2">Initialization Error</h2>
          <p className="text-sm text-vscode-gutter-foreground mb-4">{initError}</p>
          <button
            onClick={initApp}
            className="px-4 py-2 bg-vscode-blue text-white rounded hover:bg-vscode-blue/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: theme === 'dark' ? '#333' : '#fff',
            color: theme === 'dark' ? '#fff' : '#333',
          },
        }}
      />

      {appState === 'splash' && <SplashScreen />}
      {appState === 'auth' && <AuthScreen onAuthComplete={handleAuthComplete} />}
      {appState === 'codespace' && (
        <CodespaceSelector onSelect={handleCodespaceSelect} />
      )}
      {appState === 'editor' && <MainLayout />}

      <CommandPalette />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
