import { useState, useCallback, useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  Folder, 
  FolderOpen, 
  Plus, 
  Trash2, 
  FilePlus,
  MoreVertical,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import { useFileSystem } from '../hooks/useFileSystem';
import { openFilesAtom, activeFileAtom } from '../App';
import type { FileNode } from '../types';
import toast from 'react-hot-toast';

interface FileExplorerProps {
  onFileSelect?: (path: string) => void;
}

export function FileExplorer({ onFileSelect }: FileExplorerProps) {
  const {
    fileTree,
    isLoading,
    error,
    refreshFileTree,
    toggleDirectory,
    readFile,
    createDirectory,
    deletePath,
  } = useFileSystem();

  const [openFiles, setOpenFiles] = useAtom(openFilesAtom);
  const [activeFile, setActiveFile] = useAtom(activeFileAtom);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    path: string;
    type: 'file' | 'directory';
  } | null>(null);
  const [newItemPrompt, setNewItemPrompt] = useState<{
    type: 'file' | 'directory';
    parentPath: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize file system on mount
  useEffect(() => {
    // File system will be initialized by parent component
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Focus input when creating new item
  useEffect(() => {
    if (newItemPrompt && inputRef.current) {
      inputRef.current.focus();
    }
  }, [newItemPrompt]);

  // Handle file click
  const handleFileClick = useCallback(async (node: FileNode) => {
    if (node.type === 'directory') {
      toggleDirectory(node.path);
    } else {
      try {
        const content = await readFile(node.path);
        
        // Add to open files if not already open
        if (!openFiles.includes(node.path)) {
          setOpenFiles([...openFiles, node.path]);
        }
        
        setActiveFile(node.path);
        onFileSelect?.(node.path);
        
        toast.success(`Opened ${node.name}`);
      } catch (err) {
        toast.error(`Failed to open file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }, [openFiles, toggleDirectory, readFile, setOpenFiles, setActiveFile, onFileSelect]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      path: node.path,
      type: node.type,
    });
  }, []);

  // Create new file/directory
  const handleCreateItem = useCallback(async (name: string, type: 'file' | 'directory', parentPath: string) => {
    try {
      const newPath = `${parentPath}/${name}`;
      
      if (type === 'directory') {
        await createDirectory(newPath);
        toast.success(`Created directory: ${name}`);
      } else {
        // Create empty file
        await readFile(newPath).catch(async () => {
          // File doesn't exist, create it via sync
          toast.success(`Created file: ${name}`);
        });
      }
      
      await refreshFileTree();
      setNewItemPrompt(null);
    } catch (err) {
      toast.error(`Failed to create ${type}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [createDirectory, readFile, refreshFileTree]);

  // Delete file/directory
  const handleDelete = useCallback(async (path: string, name: string, type: 'file' | 'directory') => {
    try {
      await deletePath(path);
      
      // Remove from open files
      if (type === 'file') {
        setOpenFiles(openFiles.filter(p => p !== path));
        if (activeFile === path) {
          setActiveFile(openFiles.length > 1 ? openFiles[openFiles.length - 2] : null);
        }
      }
      
      toast.success(`Deleted ${type}: ${name}`);
      setContextMenu(null);
    } catch (err) {
      toast.error(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [openFiles, activeFile, deletePath, setOpenFiles, setActiveFile]);

  // Render file tree node
  const renderNode = useCallback((node: FileNode, depth: number = 0) => {
    const isExpanded = node.isExpanded ?? false;
    const isActive = activeFile === node.path;
    
    // Filter based on search query
    if (searchQuery && node.type === 'file') {
      if (!node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return null;
      }
    }

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-white/5 group ${
            isActive ? 'bg-vscode-selection' : ''
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {/* Expand/Collapse for directories */}
          {node.type === 'directory' ? (
            <span className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-vscode-gutter-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-vscode-gutter-foreground" />
              )}
            </span>
          ) : (
            <span className="w-4" />
          )}

          {/* Icon */}
          <span className="flex items-center justify-center w-4 h-4">
            {node.type === 'directory' ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-vscode-blue" />
              ) : (
                <Folder className="w-4 h-4 text-vscode-blue" />
              )
            ) : (
              <File className="w-3.5 h-3.5 text-vscode-foreground" />
            )}
          </span>

          {/* Name */}
          <span className="flex-1 text-sm text-vscode-foreground truncate">
            {node.name}
          </span>

          {/* Actions on hover */}
          <div className="hidden group-hover:flex items-center gap-1">
            {node.type === 'directory' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNewItemPrompt({ type: 'file', parentPath: node.path });
                }}
                className="p-0.5 hover:bg-white/10 rounded"
              >
                <FilePlus className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e, node);
              }}
              className="p-0.5 hover:bg-white/10 rounded"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* New item prompt */}
        {newItemPrompt && newItemPrompt.parentPath === node.path && node.type === 'directory' && (
          <div
            className="flex items-center gap-1 px-2 py-1 bg-vscode-line-highlight"
            style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
          >
            <span className="w-4" />
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent border border-vscode-blue text-sm text-vscode-foreground px-1 py-0.5 rounded outline-none"
              placeholder={newItemPrompt.type === 'file' ? 'filename.ext' : 'folder name'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateItem(e.currentTarget.value, newItemPrompt.type, newItemPrompt.parentPath);
                } else if (e.key === 'Escape') {
                  setNewItemPrompt(null);
                }
              }}
              onBlur={() => {
                if (e.currentTarget.value) {
                  handleCreateItem(e.currentTarget.value, newItemPrompt.type, newItemPrompt.parentPath);
                } else {
                  setNewItemPrompt(null);
                }
              }}
            />
          </div>
        )}

        {/* Children */}
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [
    searchQuery,
    activeFile,
    handleFileClick,
    handleContextMenu,
    newItemPrompt,
    handleCreateItem,
  ]);

  return (
    <div className="flex flex-col h-full bg-vscode-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-vscode-border">
        <span className="text-xs font-semibold text-vscode-foreground uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          {isSearching ? (
            <>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="w-32 bg-vscode-bg border border-vscode-border text-xs text-vscode-foreground px-2 py-0.5 rounded outline-none"
                autoFocus
              />
              <button
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                }}
                className="p-0.5 hover:bg-white/10 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsSearching(true)}
                className="p-1 hover:bg-white/10 rounded"
                title="Search files"
              >
                <Search className="w-3.5 h-3.5 text-vscode-foreground" />
              </button>
              <button
                onClick={refreshFileTree}
                className="p-1 hover:bg-white/10 rounded"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-vscode-foreground ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && !fileTree ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border-2 border-vscode-blue/30 border-t-vscode-blue rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-3 text-sm text-sync-error">
            <p>Error loading files:</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        ) : fileTree ? (
          renderNode(fileTree)
        ) : (
          <div className="p-3 text-sm text-vscode-gutter-foreground">
            <p>No workspace loaded</p>
            <p className="mt-1 text-xs">Connect to a codespace to start editing</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && contextMenu.visible && (
        <div
          className="fixed bg-vscode-sidebar border border-vscode-border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'directory' && (
            <>
              <button
                onClick={() => {
                  setNewItemPrompt({ type: 'file', parentPath: contextMenu.path });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-vscode-foreground hover:bg-vscode-line-highlight"
              >
                <FilePlus className="w-4 h-4" />
                <span>New File</span>
              </button>
              <button
                onClick={() => {
                  setNewItemPrompt({ type: 'directory', parentPath: contextMenu.path });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-vscode-foreground hover:bg-vscode-line-highlight"
              >
                <Folder className="w-4 h-4" />
                <span>New Folder</span>
              </button>
              <div className="my-1 border-t border-vscode-border" />
            </>
          )}
          <button
            onClick={() => handleDelete(contextMenu.path, contextMenu.path.split('/').pop() || '', contextMenu.type)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-sync-error hover:bg-vscode-line-highlight"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}

// File explorer with tree view
