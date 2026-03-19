import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { 
  Settings, 
  Monitor, 
  Type, 
  Palette, 
  Save, 
  Check,
  X,
  Moon,
  Sun,
  Laptop,
  Code
} from 'lucide-react';
import { editorSettingsAtom, themeAtom } from '../App';
import type { EditorSettings } from '../types';
import toast from 'react-hot-toast';

export function SettingsPanel() {
  const [editorSettings, setEditorSettings] = useAtom(editorSettingsAtom);
  const [theme, setTheme] = useAtom(themeAtom);
  const [localSettings, setLocalSettings] = useState<EditorSettings>(editorSettings);
  const [activeSection, setActiveSection] = useState<'appearance' | 'editor' | 'sync'>('editor');

  // Sync local settings with atom
  useEffect(() => {
    setLocalSettings(editorSettings);
  }, [editorSettings]);

  // Update setting
  const updateSetting = <K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Save settings
  const handleSave = async () => {
    try {
      setEditorSettings(localSettings);
      
      // Persist to backend
      await invoke('set_editor_settings', { settings: localSettings });
      
      toast.success('Settings saved');
    } catch (error) {
      toast.error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    const defaults: EditorSettings = {
      theme: 'vs-dark',
      font_size: 14,
      font_family: "Consolas, 'Courier New', monospace",
      tab_size: 2,
      word_wrap: true,
      minimap_enabled: false,
      line_numbers: true,
      auto_save: true,
      auto_save_delay: 1000,
    };
    setLocalSettings(defaults);
    toast.success('Settings reset to defaults');
  };

  const sections = [
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'editor' as const, label: 'Editor', icon: Code },
    { id: 'sync' as const, label: 'Sync', icon: Save },
  ];

  return (
    <div className="flex flex-col h-full bg-vscode-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-vscode-border">
        <span className="text-xs font-semibold text-vscode-foreground uppercase tracking-wider">
          Settings
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReset}
            className="p-1 hover:bg-white/10 rounded"
            title="Reset to defaults"
          >
            <X className="w-4 h-4 text-vscode-foreground" />
          </button>
          <button
            onClick={handleSave}
            className="p-1 hover:bg-white/10 rounded"
            title="Save settings"
          >
            <Check className="w-4 h-4 text-sync-success" />
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-vscode-border">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm ${
              activeSection === section.id
                ? 'bg-vscode-line-highlight text-vscode-foreground'
                : 'text-vscode-gutter-foreground hover:bg-white/5'
            }`}
          >
            <section.icon className="w-4 h-4" />
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Appearance Settings */}
        {activeSection === 'appearance' && (
          <div className="space-y-6">
            {/* Theme Selection */}
            <div>
              <label className="text-sm font-medium text-vscode-foreground mb-3 block">
                Color Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 ${
                    theme === 'dark'
                      ? 'border-vscode-blue bg-vscode-line-highlight'
                      : 'border-vscode-border bg-vscode-bg'
                  }`}
                >
                  <Moon className="w-6 h-6 text-vscode-foreground" />
                  <span className="text-xs text-vscode-foreground">Dark</span>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 ${
                    theme === 'light'
                      ? 'border-vscode-blue bg-vscode-line-highlight'
                      : 'border-vscode-border bg-vscode-bg'
                  }`}
                >
                  <Sun className="w-6 h-6 text-vscode-foreground" />
                  <span className="text-xs text-vscode-foreground">Light</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 ${
                    theme === 'system'
                      ? 'border-vscode-blue bg-vscode-line-highlight'
                      : 'border-vscode-border bg-vscode-bg'
                  }`}
                >
                  <Laptop className="w-6 h-6 text-vscode-foreground" />
                  <span className="text-xs text-vscode-foreground">System</span>
                </button>
              </div>
            </div>

            {/* Editor Theme */}
            <div>
              <label className="text-sm font-medium text-vscode-foreground mb-3 block">
                Editor Theme
              </label>
              <select
                value={localSettings.theme}
                onChange={(e) => updateSetting('theme', e.target.value)}
                className="w-full bg-vscode-bg border border-vscode-border text-sm text-vscode-foreground px-3 py-2 rounded outline-none focus:border-vscode-blue"
              >
                <option value="vs-dark">VS Dark</option>
                <option value="vs-light">VS Light</option>
                <option value="hc-black">High Contrast Dark</option>
                <option value="hc-light">High Contrast Light</option>
              </select>
            </div>
          </div>
        )}

        {/* Editor Settings */}
        {activeSection === 'editor' && (
          <div className="space-y-6">
            {/* Font Size */}
            <div>
              <label className="text-sm font-medium text-vscode-foreground mb-2 block">
                Font Size: {localSettings.font_size}px
              </label>
              <input
                type="range"
                min="10"
                max="24"
                value={localSettings.font_size}
                onChange={(e) => updateSetting('font_size', parseInt(e.target.value))}
                className="w-full accent-vscode-blue"
              />
              <div className="flex items-center justify-between text-xs text-vscode-gutter-foreground mt-1">
                <span>10px</span>
                <span>24px</span>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="text-sm font-medium text-vscode-foreground mb-2 block">
                Font Family
              </label>
              <input
                type="text"
                value={localSettings.font_family}
                onChange={(e) => updateSetting('font_family', e.target.value)}
                className="w-full bg-vscode-bg border border-vscode-border text-sm text-vscode-foreground px-3 py-2 rounded outline-none focus:border-vscode-blue"
              />
            </div>

            {/* Tab Size */}
            <div>
              <label className="text-sm font-medium text-vscode-foreground mb-2 block">
                Tab Size: {localSettings.tab_size}
              </label>
              <div className="flex items-center gap-2">
                {[2, 4, 8].map((size) => (
                  <button
                    key={size}
                    onClick={() => updateSetting('tab_size', size)}
                    className={`flex-1 px-3 py-2 rounded text-sm border ${
                      localSettings.tab_size === size
                        ? 'bg-vscode-blue border-vscode-blue text-white'
                        : 'bg-vscode-bg border-vscode-border text-vscode-foreground'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Options */}
            <div className="space-y-3">
              <ToggleSetting
                label="Line Numbers"
                description="Show line numbers in editor"
                checked={localSettings.line_numbers}
                onChange={(checked) => updateSetting('line_numbers', checked)}
              />
              <ToggleSetting
                label="Word Wrap"
                description="Wrap long lines"
                checked={localSettings.word_wrap}
                onChange={(checked) => updateSetting('word_wrap', checked)}
              />
              <ToggleSetting
                label="Minimap"
                description="Show code minimap"
                checked={localSettings.minimap_enabled}
                onChange={(checked) => updateSetting('minimap_enabled', checked)}
              />
              <ToggleSetting
                label="Auto Save"
                description="Automatically save files"
                checked={localSettings.auto_save}
                onChange={(checked) => updateSetting('auto_save', checked)}
              />
            </div>

            {/* Auto Save Delay */}
            {localSettings.auto_save && (
              <div>
                <label className="text-sm font-medium text-vscode-foreground mb-2 block">
                  Auto Save Delay: {localSettings.auto_save_delay}ms
                </label>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="500"
                  value={localSettings.auto_save_delay}
                  onChange={(e) => updateSetting('auto_save_delay', parseInt(e.target.value))}
                  className="w-full accent-vscode-blue"
                />
              </div>
            )}
          </div>
        )}

        {/* Sync Settings */}
        {activeSection === 'sync' && (
          <div className="space-y-6">
            <div className="p-4 bg-vscode-bg rounded-lg border border-vscode-border">
              <div className="flex items-center gap-3 mb-3">
                <Save className="w-8 h-8 text-vscode-blue" />
                <div>
                  <h3 className="text-sm font-semibold text-vscode-foreground">
                    Sync Status
                  </h3>
                  <p className="text-xs text-vscode-gutter-foreground">
                    Real-time synchronization with Codespace
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-vscode-border">
                  <span className="text-vscode-gutter-foreground">Auto Sync</span>
                  <span className="text-sync-success flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-vscode-border">
                  <span className="text-vscode-gutter-foreground">Sync Delay</span>
                  <span className="text-vscode-foreground">300ms</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-vscode-border">
                  <span className="text-vscode-gutter-foreground">Conflict Resolution</span>
                  <span className="text-vscode-foreground">Smart Merge</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-vscode-gutter-foreground">Offline Mode</span>
                  <span className="text-vscode-foreground">Enabled</span>
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                try {
                  await invoke('push_all_changes');
                  toast.success('All changes synced');
                } catch (error) {
                  toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-vscode-blue text-white rounded text-sm hover:bg-vscode-blue/80"
            >
              <Save className="w-4 h-4" />
              <span>Sync Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Toggle setting component
interface ToggleSettingProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-vscode-foreground">{label}</p>
        <p className="text-xs text-vscode-gutter-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-vscode-blue' : 'bg-vscode-border'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// Settings panel for editor configuration
