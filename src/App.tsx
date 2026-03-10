import { useEffect, useState } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Toaster } from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { CodespaceSelector } from './components/CodespaceSelector';
import { MainLayout } from './components/MainLayout';
import { CommandPalette } from './components/CommandPalette';
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
export const themeAtom = atom<'dark' | 'light'>('dark');

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState<'splash' | 'auth' | 'codespace' | 'editor'>('splash');
  
  const setIsAuthenticated = useSetAtom(isAuthenticatedAtom);
  const setGithubUser = useSetAtom(githubUserAtom);
  const setConnectedCodespace = useSetAtom(connectedCodespaceAtom);
  const setSyncStatus = useSetAtom(syncStatusAtom);
  const theme = useAtomValue(themeAtom);

  useEffect(() => {
    // Initial app load
    const initApp = async () => {
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
        setAppState('auth');
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  // Update HTML class for theme
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  if (isLoading) {
    return <SplashScreen />;
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
      {appState === 'auth' && <AuthScreen onAuthComplete={() => setAppState('codespace')} />}
      {appState === 'codespace' && <CodespaceSelector onSelect={() => setAppState('editor')} />}
      {appState === 'editor' && <MainLayout />}
      
      <CommandPalette />
    </>
  );
}

export default App;
