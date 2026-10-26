import React, { useState } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Check,
  Sparkles,
  Edit2,
  CheckCheck
} from 'lucide-react';
import { Project, AspectRatio } from '../../types';

interface EditorTopBarProps {
  project: Project;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenExport: () => void;
  onNavigateBack: () => void;
  onRenameProject: (newTitle: string) => void;
  onChangeAspectRatio: (ratio: AspectRatio) => void;
  isSaved?: boolean;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  project,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenExport,
  onNavigateBack,
  onRenameProject,
  onChangeAspectRatio,
  isSaved = true
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.title);

  const handleSaveTitle = () => {
    const trimmed = titleInput.trim();
    if (trimmed && trimmed !== project.title) {
      onRenameProject(trimmed);
    } else {
      setTitleInput(project.title);
    }
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setTitleInput(project.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <header className="h-13 bg-[#0a0d14] border-b border-slate-800/90 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-30 select-none">
      {/* Left Zone: Back Button + Project Name */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onNavigateBack}
          className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
          title="Back to Studio Home"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {isEditingTitle ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={handleKeyDown}
              autoFocus
              className="bg-slate-900 border border-purple-500 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-purple-400 w-36 sm:w-48"
            />
            <button
              onClick={handleSaveTitle}
              className="p-1 text-emerald-400 hover:bg-slate-800 rounded cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setTitleInput(project.title);
              setIsEditingTitle(true);
            }}
            className="flex items-center gap-1.5 text-left text-xs sm:text-sm font-bold text-slate-100 hover:text-purple-300 transition-colors group truncate max-w-[140px] sm:max-w-[220px] md:max-w-[320px] cursor-pointer"
            title="Click to rename project"
          >
            <span className="truncate">{project.title}</span>
            <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-purple-400 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Aspect Ratio Quick Toggle */}
        <div className="hidden sm:flex items-center ml-1">
          <div className="flex items-center bg-slate-900/90 rounded-md p-0.5 border border-slate-800 text-[10px] font-mono">
            {(['9:16', '16:9', '1:1'] as AspectRatio[]).map((r) => (
              <button
                key={r}
                onClick={() => onChangeAspectRatio(r)}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  project.aspectRatio === r
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Aspect ratio ${r}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Zone: Undo/Redo + Autosave Indicator + Export */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Autosave Status */}
        <div
          className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-mono px-2 py-1 rounded bg-slate-900/60 border border-slate-800/80"
          title="Autosave enabled: all edits are saved automatically"
        >
          {isSaved ? (
            <>
              <CheckCheck className="w-3 h-3 text-emerald-400" />
              <span className="text-slate-300">Saved</span>
            </>
          ) : (
            <span className="text-amber-400">Saving...</span>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-slate-800" />
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-purple-600/25 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          title="Export Video"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
