import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  GitGraph, 
  Check, 
  Plus, 
  Trash2, 
  RefreshCw,
  ArrowUp,
  ArrowDown,
  FileDiff,
  Clock
} from 'lucide-react';
import { useAtomValue } from 'jotai';
import { connectedCodespaceAtom } from '../App';
import toast from 'react-hot-toast';

interface GitStatus {
  has_uncommitted_changes: boolean;
  has_unpushed_changes: boolean;
  has_unpulled_changes: boolean;
}

interface ChangedFile {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  staged: boolean;
}

interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export function GitPanel() {
  const connectedCodespace = useAtomValue(connectedCodespaceAtom);
  
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [stagedFiles, setStagedFiles] = useState<Set<string>>(new Set());
  const [commitMessage, setCommitMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [showCommitHistory, setShowCommitHistory] = useState(false);

  // Refresh git status
  const refreshGitStatus = useCallback(async () => {
    if (!connectedCodespace) return;

    setIsRefreshing(true);
    try {
      // In production, this would call the Rust backend to get git status
      // For now, simulate based on codespace git_status
      const status = connectedCodespace.git_status || {
        has_uncommitted_changes: false,
        has_unpushed_changes: false,
        has_unpulled_changes: false,
      };
      
      setGitStatus(status);
      
      // Simulate changed files
      if (status.has_uncommitted_changes) {
        setChangedFiles([
          { path: 'src/App.tsx', status: 'modified', staged: false },
          { path: 'src/utils.ts', status: 'added', staged: false },
        ]);
      } else {
        setChangedFiles([]);
      }
    } catch (error) {
      console.error('Failed to refresh git status:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [connectedCodespace]);

  // Initial load
  useEffect(() => {
    refreshGitStatus();
  }, [refreshGitStatus]);

  // Stage file
  const stageFile = useCallback((path: string) => {
    setStagedFiles((prev) => new Set(prev).add(path));
    setChangedFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, staged: true } : f))
    );
  }, []);

  // Unstage file
  const unstageFile = useCallback((path: string) => {
    setStagedFiles((prev) => {
      const next = new Set(prev);
      next.delete(path);
      return next;
    });
    setChangedFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, staged: false } : f))
    );
  }, []);

  // Stage all
  const stageAll = useCallback(() => {
    setStagedFiles(new Set(changedFiles.map((f) => f.path)));
    setChangedFiles((prev) => prev.map((f) => ({ ...f, staged: true })));
  }, [changedFiles]);

  // Unstage all
  const unstageAll = useCallback(() => {
    setStagedFiles(new Set());
    setChangedFiles((prev) => prev.map((f) => ({ ...f, staged: false })));
  }, []);

  // Commit changes
  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim() || stagedFiles.size === 0) {
      toast.error('Please enter a commit message and stage files');
      return;
    }

    setIsCommitting(true);
    try {
      // In production, this would call the Rust backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast.success(`Committed ${stagedFiles.size} file(s)`);
      setCommitMessage('');
      setStagedFiles(new Set());
      setChangedFiles([]);
      await refreshGitStatus();
    } catch (error) {
      toast.error(`Commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCommitting(false);
    }
  }, [commitMessage, stagedFiles, refreshGitStatus]);

  // Push changes
  const handlePush = useCallback(async () => {
    try {
      // In production, this would call the Rust backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Pushed changes successfully');
      await refreshGitStatus();
    } catch (error) {
      toast.error(`Push failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [refreshGitStatus]);

  // Pull changes
  const handlePull = useCallback(async () => {
    try {
      // In production, this would call the Rust backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Pulled changes successfully');
      await refreshGitStatus();
    } catch (error) {
      toast.error(`Pull failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [refreshGitStatus]);

  // Fetch commit history
  const fetchCommitHistory = useCallback(async () => {
    try {
      // In production, this would call the Rust backend
      const mockCommits: Commit[] = [
        {
          hash: 'abc123',
          message: 'Fix bug in authentication flow',
          author: 'John Doe',
          date: '2 hours ago',
        },
        {
          hash: 'def456',
          message: 'Add new feature for file sync',
          author: 'Jane Smith',
          date: '1 day ago',
        },
        {
          hash: 'ghi789',
          message: 'Update dependencies',
          author: 'John Doe',
          date: '2 days ago',
        },
      ];
      setCommits(mockCommits);
      setShowCommitHistory(true);
    } catch (error) {
      toast.error(`Failed to fetch history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-vscode-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-vscode-border">
        <span className="text-xs font-semibold text-vscode-foreground uppercase tracking-wider">
          Source Control
        </span>
        <button
          onClick={refreshGitStatus}
          disabled={isRefreshing}
          className="p-1 hover:bg-white/10 rounded disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-vscode-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Git Status Summary */}
      {gitStatus && (
        <div className="px-3 py-2 border-b border-vscode-border">
          <div className="flex items-center gap-3 text-xs">
            {gitStatus.has_uncommitted_changes && (
              <span className="flex items-center gap-1 text-vscode-foreground">
                <FileDiff className="w-3 h-3" />
                <span>Uncommitted</span>
              </span>
            )}
            {gitStatus.has_unpushed_changes && (
              <span className="flex items-center gap-1 text-vscode-warning">
                <ArrowUp className="w-3 h-3" />
                <span>Unpushed</span>
              </span>
            )}
            {gitStatus.has_unpulled_changes && (
              <span className="flex items-center gap-1 text-vscode-success">
                <ArrowDown className="w-3 h-3" />
                <span>Unpulled</span>
              </span>
            )}
            {!gitStatus.has_uncommitted_changes &&
              !gitStatus.has_unpushed_changes &&
              !gitStatus.has_unpulled_changes && (
                <span className="flex items-center gap-1 text-sync-success">
                  <Check className="w-3 h-3" />
                  <span>All changes synced</span>
                </span>
              )}
          </div>
        </div>
      )}

      {/* Changes Section */}
      <div className="flex-1 overflow-y-auto">
        {/* Staged Changes */}
        {stagedFiles.size > 0 && (
          <div className="border-b border-vscode-border">
            <div className="flex items-center justify-between px-3 py-2 bg-vscode-line-highlight">
              <span className="text-xs font-semibold text-vscode-foreground uppercase">
                Staged Changes ({stagedFiles.size})
              </span>
              <button
                onClick={unstageAll}
                className="text-xs text-vscode-foreground hover:text-vscode-blue"
              >
                Unstage All
              </button>
            </div>
            {changedFiles
              .filter((f) => f.staged)
              .map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5"
                >
                  <button
                    onClick={() => unstageFile(file.path)}
                    className="p-0.5 hover:bg-white/10 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-vscode-gutter-foreground" />
                  </button>
                  <FileIcon status={file.status} />
                  <span className="flex-1 text-sm text-vscode-foreground truncate">
                    {file.path}
                  </span>
                  <span className="text-xs text-vscode-gutter-foreground">
                    {file.status}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Unstaged Changes */}
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold text-vscode-foreground uppercase">
              Changes ({changedFiles.filter((f) => !f.staged).length})
            </span>
            {changedFiles.some((f) => !f.staged) && (
              <button
                onClick={stageAll}
                className="text-xs text-vscode-foreground hover:text-vscode-blue"
              >
                Stage All
              </button>
            )}
          </div>
          {changedFiles.filter((f) => !f.staged).length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-vscode-gutter-foreground">
              <GitGraph className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No changes detected</p>
            </div>
          ) : (
            changedFiles
              .filter((f) => !f.staged)
              .map((file) => (
                <div
                  key={file.path}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5"
                >
                  <button
                    onClick={() => stageFile(file.path)}
                    className="p-0.5 hover:bg-white/10 rounded"
                  >
                    <Plus className="w-3 h-3 text-vscode-gutter-foreground" />
                  </button>
                  <FileIcon status={file.status} />
                  <span className="flex-1 text-sm text-vscode-foreground truncate">
                    {file.path}
                  </span>
                  <span className="text-xs text-vscode-gutter-foreground">
                    {file.status}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Commit Section */}
      <div className="border-t border-vscode-border p-3 space-y-2">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Message (press Ctrl+Enter to commit)"
          className="w-full h-20 bg-vscode-bg border border-vscode-border text-sm text-vscode-foreground px-2 py-1.5 rounded outline-none focus:border-vscode-blue resize-none"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              handleCommit();
            }
          }}
        />
        <button
          onClick={handleCommit}
          disabled={isCommitting || !commitMessage.trim() || stagedFiles.size === 0}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-vscode-blue text-white rounded text-sm hover:bg-vscode-blue/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Commit className="w-4 h-4" />
          <span>{isCommitting ? 'Committing...' : 'Commit'}</span>
        </button>
      </div>

      {/* Git Actions */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-vscode-border">
        <button
          onClick={handlePull}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-vscode-bg border border-vscode-border text-xs text-vscode-foreground rounded hover:bg-white/5"
          title="Pull changes"
        >
          <ArrowDown className="w-3 h-3" />
          <span>Pull</span>
        </button>
        <button
          onClick={handlePush}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-vscode-bg border border-vscode-border text-xs text-vscode-foreground rounded hover:bg-white/5"
          title="Push changes"
        >
          <ArrowUp className="w-3 h-3" />
          <span>Push</span>
        </button>
        <button
          onClick={fetchCommitHistory}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-vscode-bg border border-vscode-border text-xs text-vscode-foreground rounded hover:bg-white/5"
          title="View commit history"
        >
          <Clock className="w-3 h-3" />
          <span>History</span>
        </button>
      </div>

      {/* Commit History Modal */}
      {showCommitHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-vscode-sidebar border border-vscode-border rounded-lg w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-vscode-border">
              <div className="flex items-center gap-2">
                <GitGraph className="w-5 h-5 text-vscode-foreground" />
                <span className="font-semibold text-vscode-foreground">Commit History</span>
              </div>
              <button
                onClick={() => setShowCommitHistory(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <Trash2 className="w-4 h-4 text-vscode-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {commits.map((commit) => (
                <div
                  key={commit.hash}
                  className="flex items-start gap-3 p-3 bg-vscode-bg rounded border border-vscode-border"
                >
                  <div className="w-2 h-2 rounded-full bg-vscode-blue mt-1.5" />
                  <div className="flex-1">
                    <p className="text-sm text-vscode-foreground font-medium">
                      {commit.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-vscode-gutter-foreground">
                      <span>{commit.author}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {commit.date}
                      </span>
                    </div>
                    <code className="text-xs text-vscode-blue">{commit.hash}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// File icon based on status
function FileIcon({ status }: { status: ChangedFile['status'] }) {
  const colors = {
    modified: 'text-vscode-warning',
    added: 'text-sync-success',
    deleted: 'text-sync-error',
    renamed: 'text-vscode-blue',
  };

  return (
    <span className={`w-4 h-4 flex items-center justify-center ${colors[status]}`}>
      <FileDiff className="w-4 h-4" />
    </span>
  );
}

// Git source control panel
