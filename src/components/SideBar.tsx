import { useState } from 'react';
import { FileExplorer } from './FileExplorer';
import { SearchPanel } from './SearchPanel';
import { GitPanel } from './GitPanel';
import { SettingsPanel } from './SettingsPanel';

type SideBarView = 'explorer' | 'search' | 'git' | 'settings';

interface SideBarProps {
  activeView: SideBarView;
}

export function SideBar({ activeView }: SideBarProps) {
  const renderView = () => {
    switch (activeView) {
      case 'explorer':
        return <FileExplorer />;
      case 'search':
        return <SearchPanel />;
      case 'git':
        return <GitPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <FileExplorer />;
    }
  };

  return (
    <div className="w-sidebar bg-vscode-sidebar flex flex-col border-r border-vscode-border overflow-hidden">
      {renderView()}
    </div>
  );
}
