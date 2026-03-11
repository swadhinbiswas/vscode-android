import { useState, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import {
  Menu,
  Search,
  Files,
  GitGraph,
  Bug,
  Blocks,
  Settings,
  User,
  LogOut,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Wifi,
  WifiOff,
  Check,
  Loader2,
  Cloud,
  CloudOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  isSidebarOpenAtom,
  isCommandPaletteOpenAtom,
  isFullscreenAtom,
  syncStatusAtom,
  connectedCodespaceAtom,
  githubUserAtom,
  openFilesAtom,
  activeFileAtom,
  themeAtom,
} from '../App';
import { ActivityBar } from './ActivityBar';
import { SideBar } from './SideBar';
import { EditorArea } from './EditorArea';
import { StatusBar } from './StatusBar';
import { CommandPalette } from './CommandPalette';
import type { SyncStatus } from '../types';

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(isSidebarOpenAtom);
  const [isFullscreen, setIsFullscreen] = useSetAtom(isFullscreenAtom);
  const setIsCommandPaletteOpen = useSetAtom(isCommandPaletteOpenAtom);
  const syncStatus = useAtomValue(syncStatusAtom);
  const [connectedCodespace] = useAtom(connectedCodespaceAtom);
  const [githubUser] = useAtom(githubUserAtom);
  const [openFiles, setOpenFiles] = useAtom(openFilesAtom);
  const [activeFile, setActiveFile] = useAtom(activeFileAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      
      // Ctrl/Cmd + B: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
      
      // Ctrl/Cmd + Shift + F: Search
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        // Open search in sidebar
      }
      
      // Escape: Close panels
      if (e.key === 'Escape') {
        setShowUserMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync status polling
  useEffect(() => {
    const pollSyncStatus = async () => {
      try {
        const status = await invoke<SyncStatus>('get_sync_status');
        // Update would happen through atom in real implementation
      } catch (error) {
        console.warn('Failed to poll sync status:', error);
      }
    };

    const interval = setInterval(pollSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await invoke('logout');
      localStorage.removeItem('vscode_android_auth');
      window.location.reload();
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`flex flex-col h-screen w-screen bg-vscode-bg ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Title Bar */}
      <div className="flex items-center justify-between h-title-bar bg-vscode-title-bar px-2 border-b border-vscode-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 text-vscode-foreground" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 text-vscode-foreground" />
            )}
          </button>
          <span className="text-sm text-vscode-foreground">
            {connectedCodespace?.repository.full_name || 'VSCode Android'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Sync Status */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10">
            {syncStatus?.is_online ? (
              <>
                {syncStatus?.is_syncing ? (
                  <Loader2 className="w-3 h-3 animate-spin text-sync-pending" />
                ) : syncStatus?.last_error ? (
                  <CloudOff className="w-3 h-3 text-sync-error" />
                ) : (
                  <Cloud className="w-3 h-3 text-sync-success" />
                )}
                <span className="text-xs text-vscode-foreground">
                  {syncStatus?.is_syncing
                    ? 'Syncing...'
                    : syncStatus?.last_error
                    ? 'Sync Error'
                    : 'Synced'}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-sync-warning" />
                <span className="text-xs text-vscode-foreground">Offline</span>
              </>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-vscode-foreground" />
            ) : (
              <Maximize2 className="w-4 h-4 text-vscode-foreground" />
            )}
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded transition-colors"
            >
              {githubUser?.avatar_url ? (
                <img
                  src={githubUser.avatar_url}
                  alt={githubUser.login}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <User className="w-4 h-4 text-vscode-foreground" />
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="p-3 border-b border-vscode-border">
                  <p className="text-sm font-medium text-vscode-foreground">
                    {githubUser?.name || githubUser?.login}
                  </p>
                  <p className="text-xs text-vscode-gutter-foreground">
                    {githubUser?.login}
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-vscode-foreground hover:bg-vscode-line-highlight"
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                  <span>{theme === 'dark' ? 'Light' : 'Dark'} Theme</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sync-error hover:bg-vscode-line-highlight"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar />

        {/* Sidebar */}
        {isSidebarOpen && <SideBar />}

        {/* Editor Area */}
        <EditorArea />
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Command Palette */}
      <CommandPalette />

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}
