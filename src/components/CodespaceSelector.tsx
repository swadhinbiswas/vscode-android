import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { Loader2, Server, Plus, RefreshCw, Play, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { connectedCodespaceAtom, githubUserAtom } from '../App';
import type { Codespace, CommandResponse } from '../types';

interface CodespaceSelectorProps {
  onSelect: () => void;
}

export function CodespaceSelector({ onSelect }: CodespaceSelectorProps) {
  const [codespaces, setCodespaces] = useState<Codespace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCodespace, setSelectedCodespace] = useState<Codespace | null>(null);
  // @ts-ignore - Jotai type inference issue
  const setConnectedCodespace = useSetAtom(connectedCodespaceAtom);
  const [githubUser] = useAtom(githubUserAtom);

  useEffect(() => {
    fetchCodespaces();
  }, []);

  const fetchCodespaces = async () => {
    try {
      const result = await invoke<CommandResponse<Codespace[]>>('list_codespaces');
      
      if (result.success && result.data) {
        setCodespaces(result.data);
        
        // Auto-select available codespace
        const available = result.data.find(
          (cs) => cs.state === 'available' || cs.state === 'running'
        );
        if (available) {
          setSelectedCodespace(available);
        }
      } else {
        toast.error(result.error || 'Failed to load codespaces');
      }
    } catch (error) {
      console.error('Fetch codespaces error:', error);
      toast.error('Failed to load codespaces');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleStartCodespace = async (codespace: Codespace) => {
    try {
      const result = await invoke<CommandResponse<Codespace>>('start_codespace', {
        codespaceName: codespace.name,
      });
      
      if (result.success && result.data) {
        toast.success('Codespace starting...');
        setCodespaces((prev) =>
          prev.map((cs) => (cs.id === codespace.id ? result.data! : cs))
        );
        
        // Poll for availability
        pollCodespaceStatus(codespace.name);
      } else {
        toast.error(result.error || 'Failed to start codespace');
      }
    } catch (error) {
      console.error('Start codespace error:', error);
      toast.error('Failed to start codespace');
    }
  };

  const handleStopCodespace = async (codespace: Codespace) => {
    try {
      const result = await invoke<CommandResponse<Codespace>>('stop_codespace', {
        codespaceName: codespace.name,
      });
      
      if (result.success && result.data) {
        toast.success('Codespace stopped');
        setCodespaces((prev) =>
          prev.map((cs) => (cs.id === codespace.id ? result.data! : cs))
        );
      } else {
        toast.error(result.error || 'Failed to stop codespace');
      }
    } catch (error) {
      console.error('Stop codespace error:', error);
      toast.error('Failed to stop codespace');
    }
  };

  const pollCodespaceStatus = async (name: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        toast.error('Codespace took too long to start');
        return;
      }
      
      try {
        const result = await invoke<CommandResponse<Codespace>>('get_codespace', {
          codespaceName: name,
        });
        
        if (result.success && result.data) {
          const updated = result.data;
          setCodespaces((prev) =>
            prev.map((cs) => (cs.id === updated.id ? updated : cs))
          );
          
          if (updated.state === 'available' || updated.state === 'running') {
            setSelectedCodespace(updated);
            toast.success('Codespace is ready!');
            return;
          }
        }
        
        // Continue polling
        setTimeout(poll, 2000);
      } catch (error) {
        console.error('Poll error:', error);
      }
    };
    
    setTimeout(poll, 2000);
  };

  const handleConnect = () => {
    if (selectedCodespace) {
      setConnectedCodespace(selectedCodespace);
      
      // Store in localStorage
      const auth = JSON.parse(localStorage.getItem('vscode_android_auth') || '{}');
      localStorage.setItem(
        'vscode_android_auth',
        JSON.stringify({
          ...auth,
          codespace: selectedCodespace,
        })
      );
      
      toast.success(`Connected to ${selectedCodespace.repository.name}`);
      onSelect();
    } else {
      toast.error('Please select a codespace');
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'available':
      case 'running':
        return 'text-sync-success';
      case 'creating':
      case 'starting':
      case 'rebuilding':
        return 'text-sync-pending';
      case 'stopped':
      case 'shutdown':
        return 'text-vscode-gutter-foreground';
      case 'failed':
      case 'destroying':
      case 'deleted':
        return 'text-sync-error';
      default:
        return 'text-vscode-gutter-foreground';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'available':
      case 'running':
        return <div className="w-2 h-2 rounded-full bg-sync-success" />;
      case 'creating':
      case 'starting':
      case 'rebuilding':
        return <Loader2 className="w-3 h-3 animate-spin text-sync-pending" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-vscode-gutter-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-vscode-bg">
        <Loader2 className="w-12 h-12 animate-spin text-vscode-blue mb-4" />
        <p className="text-vscode-foreground">Loading your Codespaces...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-vscode-bg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-vscode-border">
        <div>
          <h1 className="text-xl font-semibold text-vscode-foreground">
            Select Codespace
          </h1>
          <p className="text-sm text-vscode-gutter-foreground">
            {githubUser?.login}'s Codespaces
          </p>
        </div>
        <button
          onClick={fetchCodespaces}
          disabled={isRefreshing}
          className="p-2 hover:bg-vscode-line-highlight rounded transition-colors"
        >
          <RefreshCw
            className={`w-5 h-5 text-vscode-foreground ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Codespace List */}
      <div className="flex-1 overflow-y-auto p-4">
        {codespaces.length === 0 ? (
          <div className="text-center py-12">
            <Server className="w-16 h-16 text-vscode-border mx-auto mb-4" />
            <p className="text-vscode-foreground mb-2">No Codespaces found</p>
            <p className="text-sm text-vscode-gutter-foreground mb-4">
              Create a new Codespace to get started
            </p>
            <button className="vscode-button flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              <span>Create Codespace</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {codespaces.map((codespace) => (
              <div
                key={codespace.id}
                onClick={() => setSelectedCodespace(codespace)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedCodespace?.id === codespace.id
                    ? 'border-vscode-blue bg-vscode-selection/20'
                    : 'border-vscode-border hover:border-vscode-blue/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStateIcon(codespace.state)}
                      <span className={`text-sm ${getStateColor(codespace.state)}`}>
                        {codespace.state}
                      </span>
                    </div>
                    <h3 className="text-vscode-foreground font-medium">
                      {codespace.repository.full_name}
                    </h3>
                    <p className="text-sm text-vscode-gutter-foreground">
                      {codespace.repository.default_branch} •{' '}
                      {codespace.machine.display_name}
                    </p>
                    <p className="text-xs text-vscode-gutter-foreground mt-1">
                      Updated {formatDate(codespace.updated_at)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {(codespace.state === 'stopped' ||
                      codespace.state === 'shutdown') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartCodespace(codespace);
                        }}
                        className="p-2 hover:bg-vscode-line-highlight rounded transition-colors"
                        title="Start"
                      >
                        <Play className="w-4 h-4 text-sync-success" />
                      </button>
                    )}
                    {(codespace.state === 'available' ||
                      codespace.state === 'running') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopCodespace(codespace);
                        }}
                        className="p-2 hover:bg-vscode-line-highlight rounded transition-colors"
                        title="Stop"
                      >
                        <Square className="w-4 h-4 text-sync-warning" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Button */}
      {selectedCodespace && (
        <div className="p-4 border-t border-vscode-border bg-vscode-sidebar">
          <button
            onClick={handleConnect}
            disabled={
              selectedCodespace.state !== 'available' &&
              selectedCodespace.state !== 'running'
            }
            className="w-full vscode-button py-3 flex items-center justify-center gap-2"
          >
            <Server className="w-4 h-4" />
            <span>
              {selectedCodespace.state === 'available' ||
              selectedCodespace.state === 'running'
                ? 'Connect to Codespace'
                : 'Waiting for Codespace...'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString();
}
