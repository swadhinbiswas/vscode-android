import '@testing-library/jest-dom';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
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
  default: vi.fn(({ value, onChange }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )),
  Editor: vi.fn(({ value, onChange }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Github: vi.fn(() => <svg data-testid="icon-github" />),
  Files: vi.fn(() => <svg data-testid="icon-files" />),
  Search: vi.fn(() => <svg data-testid="icon-search" />),
  GitGraph: vi.fn(() => <svg data-testid="icon-git" />),
  Bug: vi.fn(() => <svg data-testid="icon-bug" />),
  Blocks: vi.fn(() => <svg data-testid="icon-blocks" />),
  Settings: vi.fn(() => <svg data-testid="icon-settings" />),
  User: vi.fn(() => <svg data-testid="icon-user" />),
  LogOut: vi.fn(() => <svg data-testid="icon-logout" />),
  X: vi.fn(() => <svg data-testid="icon-x" />),
  Plus: vi.fn(() => <svg data-testid="icon-plus" />),
  Trash2: vi.fn(() => <svg data-testid="icon-trash" />),
  RefreshCw: vi.fn(() => <svg data-testid="icon-refresh" />),
  ChevronRight: vi.fn(() => <svg data-testid="icon-chevron-right" />),
  ChevronDown: vi.fn(() => <svg data-testid="icon-chevron-down" />),
  Folder: vi.fn(() => <svg data-testid="icon-folder" />),
  FolderOpen: vi.fn(() => <svg data-testid="icon-folder-open" />),
  File: vi.fn(() => <svg data-testid="icon-file" />),
  Command: vi.fn(() => <svg data-testid="icon-command" />),
  Cloud: vi.fn(() => <svg data-testid="icon-cloud" />),
  CloudOff: vi.fn(() => <svg data-testid="icon-cloud-off" />),
  Wifi: vi.fn(() => <svg data-testid="icon-wifi" />),
  WifiOff: vi.fn(() => <svg data-testid="icon-wifi-off" />),
  Check: vi.fn(() => <svg data-testid="icon-check" />),
  Loader2: vi.fn(() => <svg data-testid="icon-loader" />),
  Terminal: vi.fn(() => <svg data-testid="icon-terminal" />),
  Bell: vi.fn(() => <svg data-testid="icon-bell" />),
  GitBranch: vi.fn(() => <svg data-testid="icon-git-branch" />),
  Maximize2: vi.fn(() => <svg data-testid="icon-maximize" />),
  Minimize2: vi.fn(() => <svg data-testid="icon-minimize" />),
  PanelLeftClose: vi.fn(() => <svg data-testid="icon-panel-close" />),
  PanelLeftOpen: vi.fn(() => <svg data-testid="icon-panel-open" />),
  MoreHorizontal: vi.fn(() => <svg data-testid="icon-more" />),
  Square: vi.fn(() => <svg data-testid="icon-square" />),
  Play: vi.fn(() => <svg data-testid="icon-play" />),
  Server: vi.fn(() => <svg data-testid="icon-server" />),
}));

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
};
