import React from 'react';
import { StudioTab } from '../../types';
import { Sparkles, Smartphone, Monitor, Film } from 'lucide-react';

interface TopBarProps {
  currentTab: StudioTab;
  onSelectTab: (tab: StudioTab) => void;
  onOpenExport: () => void;
  isMobileDeviceView: boolean;
  onToggleMobileDeviceView: () => void;
  projectTitle: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenExport,
  isMobileDeviceView,
  onToggleMobileDeviceView,
  projectTitle
}) => {
  return (
    <header className="h-14 bg-[#0d0f17]/95 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between gap-8 shrink-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2 text-left focus:outline-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-400 p-[1px] flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
            <div className="w-full h-full bg-[#090a0f] rounded-[7px] flex items-center justify-center">
              <Film className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            VibeStudio
          </span>
        </button>
        <span className="hidden xl:inline text-xs text-slate-400 truncate max-w-[160px] font-mono">
          · {projectTitle}
        </span>
      </div>

      {/* Zone 2: 4–5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
        <button
          onClick={() => onSelectTab('camera')}
          className={`whitespace-nowrap transition-colors py-1 cursor-pointer border-b-2 ${
            currentTab === 'camera'
              ? 'text-purple-400 border-purple-500 font-semibold'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          Camera Studio
        </button>

        <button
          onClick={() => onSelectTab('karaoke')}
          className={`whitespace-nowrap transition-colors py-1 cursor-pointer border-b-2 ${
            currentTab === 'karaoke'
              ? 'text-purple-400 border-purple-500 font-semibold'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          Karaoke Mode
        </button>

        <button
          onClick={() => onSelectTab('editor')}
          className={`whitespace-nowrap transition-colors py-1 cursor-pointer border-b-2 ${
            currentTab === 'editor'
              ? 'text-purple-400 border-purple-500 font-semibold'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          Multitrack Editor
        </button>

        <button
          onClick={() => onSelectTab('projects')}
          className={`whitespace-nowrap transition-colors py-1 cursor-pointer border-b-2 ${
            currentTab === 'projects'
              ? 'text-purple-400 border-purple-500 font-semibold'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          Projects
        </button>

        <button
          onClick={() => onSelectTab('effects')}
          className={`whitespace-nowrap transition-colors py-1 cursor-pointer border-b-2 ${
            currentTab === 'effects'
              ? 'text-purple-400 border-purple-500 font-semibold'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          Effects Library
        </button>
      </nav>

      {/* Zone 3: 1 primary action (with mobile viewport frame preview toggle) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileDeviceView}
          title={isMobileDeviceView ? 'Switch to Fullscreen Workstation' : 'Switch to Android Mobile Device View'}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700/60 transition-colors whitespace-nowrap cursor-pointer"
        >
          {isMobileDeviceView ? (
            <>
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full Workstation</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span>Android Preview</span>
            </>
          )}
        </button>

        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg shadow-md shadow-purple-600/30 hover:shadow-purple-600/50 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Export Video</span>
        </button>
      </div>
    </header>
  );
};
