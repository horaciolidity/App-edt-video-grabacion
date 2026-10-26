import React from 'react';
import { StudioTab } from '../../types';
import { Home, Camera, Mic2, Layers, FolderHeart } from 'lucide-react';

interface BottomTabBarProps {
  currentTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as StudioTab, label: 'Home', icon: Home },
    { id: 'camera' as StudioTab, label: 'Camera', icon: Camera },
    { id: 'karaoke' as StudioTab, label: 'Karaoke', icon: Mic2 },
    { id: 'editor' as StudioTab, label: 'Editor', icon: Layers },
    { id: 'projects' as StudioTab, label: 'Projects', icon: FolderHeart },
  ];

  return (
    <nav className="h-16 bg-[#0c0e17]/95 backdrop-blur-md border-t border-slate-800/80 px-2 flex items-center justify-around shrink-0 z-40 pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-xl cursor-pointer ${
              isActive ? 'text-purple-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg transition-transform ${isActive ? 'scale-110 bg-purple-500/15' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
