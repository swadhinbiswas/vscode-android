import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react';
import { openFilesAtom, activeFileAtom, connectedCodespaceAtom } from '../App';
import type { FileNode } from '../types';

// Mock file tree - in production, this would come from the codespace
const mockFileTree: FileNode[] = [
  {
    name: 'src',
    path: 'src',
    type: 'directory',
    isExpanded: true,
    children: [
      {
        name: 'components',
        path: 'src/components',
        type: 'directory',
        isExpanded: false,
        children: [
          { name: 'App.tsx', path: 'src/components/App.tsx', type: 'file' },
          { name: 'Header.tsx', path: 'src/components/Header.tsx', type: 'file' },
          { name: 'Sidebar.tsx', path: 'src/components/Sidebar.tsx', type: 'file' },
        ],
      },
      {
        name: 'hooks',
        path: 'src/hooks',
        type: 'directory',
        isExpanded: false,
        children: [
          { name: 'useAuth.ts', path: 'src/hooks/useAuth.ts', type: 'file' },
          { name: 'useSync.ts', path: 'src/hooks/useSync.ts', type: 'file' },
        ],
      },
      { name: 'App.tsx', path: 'src/App.tsx', type: 'file' },
      { name: 'main.tsx', path: 'src/main.tsx', type: 'file' },
      { name: 'index.css', path: 'src/index.css', type: 'file' },
    ],
  },
  {
    name: 'public',
    path: 'public',
    type: 'directory',
    isExpanded: false,
    children: [
      { name: 'index.html', path: 'public/index.html', type: 'file' },
      { name: 'favicon.ico', path: 'public/favicon.ico', type: 'file' },
    ],
  },
  { name: 'package.json', path: 'package.json', type: 'file' },
  { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file' },
  { name: 'vite.config.ts', path: 'vite.config.ts', type: 'file' },
  { name: 'README.md', path: 'README.md', type: 'file' },
];

export function SideBar() {
  const [fileTree, setFileTree] = useState<FileNode[]>(mockFileTree);
  const [searchQuery, setSearchQuery] = useState('');
  const [openFiles, setOpenFiles] = useAtom(openFilesAtom);
  const [activeFile, setActiveFile] = useAtom(activeFileAtom);
  const [connectedCodespace] = useAtom(connectedCodespaceAtom);

  const toggleFolder = (path: string) => {
    const toggleNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === path && node.type === 'directory') {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setFileTree(toggleNode(fileTree));
  };

  const openFile = (node: FileNode) => {
    if (node.type === 'file') {
      if (!openFiles.includes(node.path)) {
        setOpenFiles([...openFiles, node.path]);
      }
      setActiveFile(node.path);
    } else {
      toggleFolder(node.path);
    }
  };

  const closeFile = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newOpenFiles = openFiles.filter((p) => p !== path);
    setOpenFiles(newOpenFiles);
    if (activeFile === path && newOpenFiles.length > 0) {
      setActiveFile(newOpenFiles[newOpenFiles.length - 1]);
    } else if (newOpenFiles.length === 0) {
      setActiveFile(null);
    }
  };

  const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    
    return nodes
      .map((node) => {
        if (node.type === 'file' && node.name.toLowerCase().includes(query.toLowerCase())) {
          return node;
        }
        if (node.children) {
          const filteredChildren = filterTree(node.children, query);
          if (filteredChildren.length > 0) {
            return { ...node, children: filteredChildren, isExpanded: true };
          }
        }
        return null;
      })
      .filter((node): node is FileNode => node !== null);
  };

  const filteredTree = filterTree(fileTree, searchQuery);

  return (
    <div className="w-sidebar bg-vscode-sidebar flex flex-col border-r border-vscode-border">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-vscode-border">
        <span className="text-xs font-semibold text-vscode-foreground uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-vscode-line-highlight rounded transition-colors"
            title="New File"
          >
            <Plus className="w-4 h-4 text-vscode-foreground" />
          </button>
          <button
            className="p-1 hover:bg-vscode-line-highlight rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-vscode-foreground" />
          </button>
          <button
            className="p-1 hover:bg-vscode-line-highlight rounded transition-colors"
            title="More"
          >
            <MoreHorizontal className="w-4 h-4 text-vscode-foreground" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-vscode-border">
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full vscode-input text-sm py-1"
        />
      </div>

      {/* Codespace Info */}
      {connectedCodespace && (
        <div className="p-2 border-b border-vscode-border bg-vscode-line-highlight/50">
          <p className="text-xs text-vscode-gutter-foreground truncate">
            {connectedCodespace.repository.full_name}
          </p>
          <p className="text-xs text-vscode-gutter-foreground">
            {connectedCodespace.state}
          </p>
        </div>
      )}

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredTree.length === 0 ? (
          <div className="p-4 text-center text-sm text-vscode-gutter-foreground">
            {searchQuery ? 'No files found' : 'No files'}
          </div>
        ) : (
          <FileTree
            nodes={filteredTree}
            openFiles={openFiles}
            activeFile={activeFile}
            onNodeClick={openFile}
            onCloseFile={closeFile}
          />
        )}
      </div>
    </div>
  );
}

interface FileTreeProps {
  nodes: FileNode[];
  openFiles: string[];
  activeFile: string | null;
  onNodeClick: (node: FileNode) => void;
  onCloseFile: (path: string, e: React.MouseEvent) => void;
}

function FileTree({
  nodes,
  openFiles,
  activeFile,
  onNodeClick,
  onCloseFile,
}: FileTreeProps) {
  return (
    <div>
      {nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          openFiles={openFiles}
          activeFile={activeFile}
          onNodeClick={onNodeClick}
          onCloseFile={onCloseFile}
        />
      ))}
    </div>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  openFiles: string[];
  activeFile: string | null;
  onNodeClick: (node: FileNode) => void;
  onCloseFile: (path: string, e: React.MouseEvent) => void;
}

function FileTreeNode({
  node,
  openFiles,
  activeFile,
  onNodeClick,
  onCloseFile,
}: FileTreeNodeProps) {
  const isDirectory = node.type === 'directory';
  const isOpen = openFiles.includes(node.path);
  const isActive = activeFile === node.path;

  return (
    <div>
      <div
        onClick={() => onNodeClick(node)}
        className={`flex items-center gap-1 px-4 py-1 cursor-pointer text-sidebar
          ${isActive ? 'vscode-sidebar-item-active' : 'vscode-sidebar-item'}`}
      >
        {isDirectory && (
          <span className="w-4 h-4 flex items-center justify-center">
            {node.isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        )}
        {!isDirectory && <span className="w-4" />}
        
        {isDirectory ? (
          node.isExpanded ? (
            <FolderOpen className="w-4 h-4 text-vscode-blue" />
          ) : (
            <Folder className="w-4 h-4 text-vscode-blue" />
          )
        ) : (
          <File className="w-4 h-4 text-vscode-foreground" />
        )}
        
        <span className="flex-1 truncate">{node.name}</span>
        
        {isOpen && (
          <button
            onClick={(e) => onCloseFile(node.path, e)}
            className="p-0.5 hover:bg-white/20 rounded opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {isDirectory && node.isExpanded && node.children && (
        <div className="pl-2">
          <FileTree
            nodes={node.children}
            openFiles={openFiles}
            activeFile={activeFile}
            onNodeClick={onNodeClick}
            onCloseFile={onCloseFile}
          />
        </div>
      )}
    </div>
  );
}
