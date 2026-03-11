import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Codespace, CommandResponse } from '../types';

export function useCodespaces() {
  const [codespaces, setCodespaces] = useState<Codespace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all codespaces
  const fetchCodespaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<CommandResponse<Codespace[]>>('list_codespaces');
      
      if (result.success && result.data) {
        setCodespaces(result.data);
      } else {
        setError(result.error || 'Failed to fetch codespaces');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get a specific codespace
  const getCodespace = useCallback(async (name: string) => {
    try {
      const result = await invoke<CommandResponse<Codespace>>('get_codespace', {
        codespaceName: name,
      });
      
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to get codespace:', err);
      throw err;
    }
  }, []);

  // Start a codespace
  const startCodespace = useCallback(async (name: string) => {
    try {
      const result = await invoke<CommandResponse<Codespace>>('start_codespace', {
        codespaceName: name,
      });
      
      if (result.success && result.data) {
        setCodespaces((prev) =>
          prev.map((cs) => (cs.id === result.data!.id ? result.data! : cs))
        );
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to start codespace:', err);
      throw err;
    }
  }, []);

  // Stop a codespace
  const stopCodespace = useCallback(async (name: string) => {
    try {
      const result = await invoke<CommandResponse<Codespace>>('stop_codespace', {
        codespaceName: name,
      });
      
      if (result.success && result.data) {
        setCodespaces((prev) =>
          prev.map((cs) => (cs.id === result.data!.id ? result.data! : cs))
        );
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Failed to stop codespace:', err);
      throw err;
    }
  }, []);

  // Create a new codespace
  const createCodespace = useCallback(
    async (
      repo: string,
      options?: {
        branch?: string;
        machine?: string;
        devcontainerPath?: string;
      }
    ) => {
      try {
        const result = await invoke<CommandResponse<Codespace>>('create_codespace', {
          repo,
          branch: options?.branch,
          machine: options?.machine,
          devcontainerPath: options?.devcontainerPath,
        });

        if (result.success && result.data) {
          setCodespaces((prev) => [...prev, result.data!]);
          return result.data;
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        console.error('Failed to create codespace:', err);
        throw err;
      }
    },
    []
  );

  // Poll codespace status until it's available
  const waitForCodespace = useCallback(
    async (name: string, timeoutMs = 60000): Promise<Codespace> => {
      const startTime = Date.now();

      while (Date.now() - startTime < timeoutMs) {
        const codespace = await getCodespace(name);

        if (codespace.state === 'available' || codespace.state === 'running') {
          return codespace;
        }

        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      throw new Error('Codespace startup timed out');
    },
    [getCodespace]
  );

  // Initial fetch
  useEffect(() => {
    fetchCodespaces();
  }, [fetchCodespaces]);

  return {
    codespaces,
    isLoading,
    error,
    fetchCodespaces,
    getCodespace,
    startCodespace,
    stopCodespace,
    createCodespace,
    waitForCodespace,
  };
}
