import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { ReactElement } from 'react';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  mkdir: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-store', () => ({
  Store: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    save: vi.fn(),
    clear: vi.fn(),
  })),
}));

vi.mock('@tauri-apps/plugin-websocket', () => ({
  connect: vi.fn(),
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(() => null as unknown as ReactElement),
  Editor: vi.fn(() => null as unknown as ReactElement),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Github: vi.fn(() => null as unknown as ReactElement),
  Files: vi.fn(() => null as unknown as ReactElement),
  Search: vi.fn(() => null as unknown as ReactElement),
  GitGraph: vi.fn(() => null as unknown as ReactElement),
  Bug: vi.fn(() => null as unknown as ReactElement),
  Blocks: vi.fn(() => null as unknown as ReactElement),
  Settings: vi.fn(() => null as unknown as ReactElement),
  User: vi.fn(() => null as unknown as ReactElement),
  LogOut: vi.fn(() => null as unknown as ReactElement),
  X: vi.fn(() => null as unknown as ReactElement),
  Plus: vi.fn(() => null as unknown as ReactElement),
  Trash2: vi.fn(() => null as unknown as ReactElement),
  RefreshCw: vi.fn(() => null as unknown as ReactElement),
  ChevronRight: vi.fn(() => null as unknown as ReactElement),
  ChevronDown: vi.fn(() => null as unknown as ReactElement),
  Folder: vi.fn(() => null as unknown as ReactElement),
  FolderOpen: vi.fn(() => null as unknown as ReactElement),
  File: vi.fn(() => null as unknown as ReactElement),
  Command: vi.fn(() => null as unknown as ReactElement),
  Cloud: vi.fn(() => null as unknown as ReactElement),
  CloudOff: vi.fn(() => null as unknown as ReactElement),
  Wifi: vi.fn(() => null as unknown as ReactElement),
  WifiOff: vi.fn(() => null as unknown as ReactElement),
  Check: vi.fn(() => null as unknown as ReactElement),
  Loader2: vi.fn(() => null as unknown as ReactElement),
  Terminal: vi.fn(() => null as unknown as ReactElement),
  Bell: vi.fn(() => null as unknown as ReactElement),
  GitBranch: vi.fn(() => null as unknown as ReactElement),
  Maximize2: vi.fn(() => null as unknown as ReactElement),
  Minimize2: vi.fn(() => null as unknown as ReactElement),
  PanelLeftClose: vi.fn(() => null as unknown as ReactElement),
  PanelLeftOpen: vi.fn(() => null as unknown as ReactElement),
  MoreHorizontal: vi.fn(() => null as unknown as ReactElement),
  Square: vi.fn(() => null as unknown as ReactElement),
  Play: vi.fn(() => null as unknown as ReactElement),
  Server: vi.fn(() => null as unknown as ReactElement),
  Save: vi.fn(() => null as unknown as ReactElement),
  Replace: vi.fn(() => null as unknown as ReactElement),
  ReplaceAll: vi.fn(() => null as unknown as ReactElement),
  FileDiff: vi.fn(() => null as unknown as ReactElement),
  Commit: vi.fn(() => null as unknown as ReactElement),
  ArrowUp: vi.fn(() => null as unknown as ReactElement),
  ArrowDown: vi.fn(() => null as unknown as ReactElement),
  Branch: vi.fn(() => null as unknown as ReactElement),
  Clock: vi.fn(() => null as unknown as ReactElement),
  Monitor: vi.fn(() => null as unknown as ReactElement),
  Type: vi.fn(() => null as unknown as ReactElement),
  Palette: vi.fn(() => null as unknown as ReactElement),
  Moon: vi.fn(() => null as unknown as ReactElement),
  Sun: vi.fn(() => null as unknown as ReactElement),
  Laptop: vi.fn(() => null as unknown as ReactElement),
  Code: vi.fn(() => null as unknown as ReactElement),
  FilePlus: vi.fn(() => null as unknown as ReactElement),
  MoreVertical: vi.fn(() => null as unknown as ReactElement),
  FileSymlink: vi.fn(() => null as unknown as ReactElement),
  AlertTriangle: vi.fn(() => null as unknown as ReactElement),
  RefreshCcw: vi.fn(() => null as unknown as ReactElement),
}));

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
} as any;
