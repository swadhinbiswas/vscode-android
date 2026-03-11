import { useState } from 'react';
import { useAtom } from 'jotai';
import {
  Files,
  Search,
  GitGraph,
  Bug,
  Blocks,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { isSidebarOpenAtom } from '../App';

type Activity = 'explorer' | 'search' | 'source-control' | 'debug' | 'extensions';

interface ActivityItem {
  id: Activity;
  icon: LucideIcon;
  label: string;
}

const activities: ActivityItem[] = [
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'source-control', icon: GitGraph, label: 'Source Control' },
  { id: 'debug', icon: Bug, label: 'Run and Debug' },
  { id: 'extensions', icon: Blocks, label: 'Extensions' },
];

export function ActivityBar() {
  const [activeActivity, setActiveActivity] = useState<Activity>('explorer');
  const [isSidebarOpen, setIsSidebarOpen] = useAtom(isSidebarOpenAtom);

  const handleClick = (activity: Activity) => {
    if (activeActivity === activity && isSidebarOpen) {
      setIsSidebarOpen(false);
    } else {
      setActiveActivity(activity);
      setIsSidebarOpen(true);
    }
  };

  return (
    <div className="w-activity-bar bg-vscode-activity-bar flex flex-col items-center py-2 border-r border-vscode-border">
      {activities.map((item) => {
        const Icon = item.icon;
        const isActive = activeActivity === item.id && isSidebarOpen;
        
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`w-12 h-12 flex items-center justify-center mb-1 transition-colors relative
              ${isActive ? 'text-white' : 'text-vscode-gutter-foreground hover:text-vscode-foreground'}`}
            title={item.label}
          >
            <Icon className="w-6 h-6" />
            {isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-vscode-blue" />
            )}
          </button>
        );
      })}

      <div className="flex-1" />

      {/* Settings at bottom */}
      <button
        className="w-12 h-12 flex items-center justify-center text-vscode-gutter-foreground hover:text-vscode-foreground transition-colors"
        title="Settings"
      >
        <Settings className="w-6 h-6" />
      </button>
    </div>
  );
}
