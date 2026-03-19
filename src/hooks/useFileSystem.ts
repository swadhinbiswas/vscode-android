import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, readDir, mkdir, remove } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import type { FileNode } from '../types';

export function useFileSystem() {
  const [rootPath, setRootPath] = useState<string>('');
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize workspace root
  const initializeWorkspace = useCallback(async (path?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const workspacePath = path || await getWorkspaceRoot();
      setRootPath(workspacePath);
      await loadFileTree(workspacePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize workspace';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load file tree from directory
  const loadFileTree = useCallback(async (path: string): Promise<FileNode> => {
    const node: FileNode = {
      name: path.split('/').pop() || path,
      path,
      type: 'directory',
      children: [],
      isExpanded: true,
    };

    try {
      const entries = await readDir(path);
      
      // Sort: directories first, then files, alphabetically
      entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      // Filter out common ignored directories
      const ignoredDirs = ['node_modules', '.git', 'target', 'dist', 'build', '.vscode', '.idea'];
      
      for (const entry of entries) {
        if (entry.isDirectory && ignoredDirs.includes(entry.name)) {
          continue;
        }
        
        if (entry.name.startsWith('.')) {
          continue;
        }

        const childPath = await join(path, entry.name);
        
        if (entry.isDirectory) {
          const childNode = await loadFileTree(childPath);
          node.children?.push(childNode);
        } else {
          node.children?.push({
            name: entry.name,
            path: childPath,
            type: 'file',
          });
        }
      }
    } catch (err) {
      console.error(`Failed to read directory ${path}:`, err);
    }

    return node;
  }, []);

  // Read file content
  const readFile = useCallback(async (path: string): Promise<string> => {
    try {
      return await readTextFile(path);
    } catch (err) {
      throw new Error(`Failed to read file: ${err}`);
    }
  }, []);

  // Write file content
  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    try {
      await writeTextFile(path, content);
    } catch (err) {
      throw new Error(`Failed to write file: ${err}`);
    }
  }, []);

  // Create directory
  const createDirectory = useCallback(async (path: string): Promise<void> => {
    try {
      await mkdir(path, { recursive: true });
      await refreshFileTree();
    } catch (err) {
      throw new Error(`Failed to create directory: ${err}`);
    }
  }, []);

  // Delete file or directory
  const deletePath = useCallback(async (path: string): Promise<void> => {
    try {
      await remove(path, { recursive: true });
      await refreshFileTree();
    } catch (err) {
      throw new Error(`Failed to delete: ${err}`);
    }
  }, []);

  // Refresh file tree
  const refreshFileTree = useCallback(async () => {
    if (rootPath) {
      await loadFileTree(rootPath);
    }
  }, [rootPath, loadFileTree]);

  // Toggle directory expansion
  const toggleDirectory = useCallback((path: string) => {
    const toggleNode = (node: FileNode): FileNode => {
      if (node.path === path) {
        return { ...node, isExpanded: !node.isExpanded };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(toggleNode),
        };
      }
      return node;
    };

    if (fileTree) {
      setFileTree(toggleNode(fileTree));
    }
  }, [fileTree]);

  return {
    rootPath,
    fileTree,
    isLoading,
    error,
    initializeWorkspace,
    readFile,
    writeFile,
    createDirectory,
    deletePath,
    refreshFileTree,
    toggleDirectory,
    loadFileTree,
  };
}

// Get workspace root (from codespace or local)
async function getWorkspaceRoot(): Promise<string> {
  try {
    // In production, this would get the codespace mount path
    // For now, use a default workspace path
    return '/workspace';
  } catch {
    return '/workspace';
  }
}

// File system operations

/**
 * @returns File system state and operations
 */
