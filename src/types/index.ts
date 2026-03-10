// TypeScript types for the application

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name?: string;
  email?: string;
}

export interface RepositoryOwner {
  login: string;
  id: number;
  avatar_url: string;
}

export interface CodespaceRepository {
  id: number;
  name: string;
  full_name: string;
  owner: RepositoryOwner;
  html_url: string;
  default_branch: string;
}

export type CodespaceState =
  | 'waitingForAuth'
  | 'unknown'
  | 'creating'
  | 'available'
  | 'destroying'
  | 'deleted'
  | 'exporting'
  | 'failed'
  | 'rebuilding'
  | 'running'
  | 'shutdown'
  | 'starting'
  | 'stopped'
  | 'stopping'
  | 'updating';

export interface CodespaceMachine {
  name: string;
  display_name: string;
  operating_system: string;
  storage_in_bytes: number;
  memory_in_bytes: number;
  cpus: number;
}

export interface GitStatus {
  has_uncommitted_changes: boolean;
  has_unpushed_changes: boolean;
  has_unpulled_changes: boolean;
}

export interface Codespace {
  name: string;
  id: string;
  owner: GitHubUser;
  repository: CodespaceRepository;
  state: CodespaceState;
  created_at: string;
  updated_at: string;
  dev_container_path?: string;
  pending_operation: boolean;
  pending_operation_disabled_reason?: string;
  idle_timeout_minutes?: number;
  max_idle_timeout_minutes?: number;
  machine: CodespaceMachine;
  vscode_cli_available: boolean;
  codespace_region?: string;
  git_status?: GitStatus;
}

export interface SyncStatus {
  is_syncing: boolean;
  pending_operations: number;
  last_sync_time?: number;
  last_error?: string;
  connected_codespace?: string;
  is_online: boolean;
}

export interface EditorSettings {
  theme: string;
  font_size: number;
  font_family: string;
  tab_size: number;
  word_wrap: boolean;
  minimap_enabled: boolean;
  line_numbers: boolean;
  auto_save: boolean;
  auto_save_delay: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isExpanded?: boolean;
}

export interface Tab {
  path: string;
  name: string;
  isDirty: boolean;
  language?: string;
}

export interface TerminalState {
  id: string;
  name: string;
  type: 'local' | 'remote';
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  category?: string;
  action: () => void;
}

export interface CommandResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Monaco Editor types
export interface MonacoEditorProps {
  value: string;
  language?: string;
  theme?: string;
  onChange?: (value: string) => void;
  onMount?: (editor: any, monaco: any) => void;
  options?: MonacoEditorOptions;
}

export interface MonacoEditorOptions {
  fontSize?: number;
  minimap?: { enabled?: boolean };
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  tabSize?: number;
  automaticLayout?: boolean;
  scrollBeyondLastLine?: boolean;
  renderWhitespace?: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  cursorBlinking?: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  cursorSmoothCaretAnimation?: boolean;
  smoothScrolling?: boolean;
  padding?: { top?: number; bottom?: number };
  folding?: boolean;
  bracketPairColorization?: { enabled?: boolean };
  guides?: { indentation?: boolean };
}

// OAuth types
export interface OAuthCallback {
  code: string;
  state: string;
}

export interface TokenData {
  access_token: string;
  token_type: string;
  scope: string;
  expires_at?: number;
  refresh_token?: string;
}

// File operations
export interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  content?: string;
  timestamp: number;
}

export interface SyncOperation {
  type: 'push' | 'pull' | 'delete';
  path: string;
  content?: string;
  timestamp: number;
  checksum?: string;
}

// Additional editor types
export interface EditorTheme {
  name: string;
  colors: Record<string, string>;
}

export interface WorkspaceConfig {
  folders: string[];
  settings: EditorSettings;
}
