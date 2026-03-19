import { useAtomValue } from 'jotai';
import {
  WifiOff,
  Cloud,
  CloudOff,
  Check,
  Loader2,
  GitBranch,
  Terminal,
  Bug,
  Bell,
  Settings,
} from 'lucide-react';
import { syncStatusAtom, connectedCodespaceAtom, activeFileAtom } from '../App';

export function StatusBar() {
  const syncStatus = useAtomValue(syncStatusAtom);
  const connectedCodespace = useAtomValue(connectedCodespaceAtom);
  const activeFile = useAtomValue(activeFileAtom);

  return (
    <div className="h-status-bar bg-vscode-status-bar flex items-center justify-between px-2 text-white text-status">
      {/* Left section */}
      <div className="flex items-center gap-1">
        {/* Source Control */}
        <div className="vscode-status-bar-item">
          <GitBranch className="w-3 h-3" />
          <span>{connectedCodespace?.repository.default_branch || 'main'}</span>
        </div>

        {/* Errors/Warnings */}
        <div className="vscode-status-bar-item">
          <Bug className="w-3 h-3" />
          <span>0</span>
        </div>

        <div className="vscode-status-bar-item">
          <Bell className="w-3 h-3" />
          <span>0</span>
        </div>
      </div>

      {/* Center section - Sync Status */}
      <div className="flex items-center gap-2">
        {syncStatus?.is_online ? (
          <>
            {syncStatus.is_syncing ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Syncing...</span>
              </div>
            ) : syncStatus.last_error ? (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer">
                <CloudOff className="w-3 h-3" />
                <span>Sync Error</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer">
                <Cloud className="w-3 h-3" />
                <Check className="w-3 h-3" />
                <span>Synced</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer bg-vscode-status-bar-offline">
            <WifiOff className="w-3 h-3" />
            <span>Offline Mode</span>
          </div>
        )}

        {/* Pending operations */}
        {syncStatus?.pending_operations > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer">
            <span>{syncStatus.pending_operations} pending</span>
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1">
        {/* Active file info */}
        {activeFile && (
          <>
            <div className="vscode-status-bar-item">
              <span>Ln 1, Col 1</span>
            </div>
            <div className="vscode-status-bar-item">
              <span>Spaces: 2</span>
            </div>
            <div className="vscode-status-bar-item">
              <span>UTF-8</span>
            </div>
            <div className="vscode-status-bar-item">
              <span>{getLanguage(activeFile)}</span>
            </div>
          </>
        )}

        {/* Terminal */}
        <div className="vscode-status-bar-item">
          <Terminal className="w-3 h-3" />
        </div>

        {/* Settings */}
        <div className="vscode-status-bar-item">
          <Settings className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'TypeScript',
    tsx: 'TypeScript React',
    js: 'JavaScript',
    jsx: 'JavaScript React',
    json: 'JSON',
    md: 'Markdown',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    py: 'Python',
    rs: 'Rust',
    go: 'Go',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    h: 'C Header',
    sh: 'Shell',
    yml: 'YAML',
    yaml: 'YAML',
    xml: 'XML',
    sql: 'SQL',
  };
  return languageMap[ext || ''] || 'Plain Text';
}
