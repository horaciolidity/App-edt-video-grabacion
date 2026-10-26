import React, { useState } from 'react';
import {
  FolderHeart,
  Plus,
  Play,
  Film,
  Trash2,
  Copy,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Music
} from 'lucide-react';
import { Project, StudioTab } from '../../types';
import { createInitialProject, saveProject } from '../../services/projectStore';
import { STUDIO_BACKGROUNDS } from '../../constants/presets';

interface ProjectVaultProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (project: Project) => void;
  onCreateProject: (newProject: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onNavigateTab: (tab: StudioTab) => void;
}

export const ProjectVault: React.FC<ProjectVaultProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onNavigateTab
}) => {
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newGenre, setNewGenre] = useState<string>('Trap');

  const genres = ['Trap', 'Drill', 'Hip-Hop 90s', 'Reggaeton', 'Pop / Synthwave', 'Rock / Punk'];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const project = createInitialProject(newTitle.trim(), newGenre);
    onCreateProject(project);
    setShowCreateModal(false);
    setNewTitle('');
    onNavigateTab('camera');
  };

  const handleDuplicate = (p: Project) => {
    const duplicated: Project = {
      ...p,
      id: 'proj_' + Date.now(),
      title: `${p.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    saveProject(duplicated);
    onCreateProject(duplicated);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 min-h-[calc(100vh-3.5rem)] pb-safe">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FolderHeart className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-black text-white">Music Video Projects Vault</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Local browser persistence · Seamless offline project recovery
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Music Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
        {projects.map((proj) => {
          const isActive = proj.id === activeProjectId;
          const bgThumb = proj.thumbnailUrl || STUDIO_BACKGROUNDS[0].src;

          return (
            <div
              key={proj.id}
              className={`rounded-3xl border bg-slate-900/80 overflow-hidden flex flex-col transition-all group ${
                isActive
                  ? 'border-purple-500 shadow-xl shadow-purple-900/20 ring-1 ring-purple-500/50'
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full bg-black overflow-hidden">
                <img
                  src={bgThumb}
                  alt={proj.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-4 flex flex-col justify-end">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-purple-300">{proj.genre}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-300 font-mono">{proj.duration.toFixed(1)}s</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-300 font-mono">{proj.aspectRatio}</span>
                  </div>
                </div>

                {isActive && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-purple-600/90 text-white text-[10px] font-bold tracking-wider backdrop-blur-md">
                    ACTIVE PROJECT
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-base text-white truncate">{proj.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-purple-400" />
                      <span>{proj.takes.length} Takes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{proj.clips.length} Clips</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-5 flex items-center justify-between border-t border-slate-800/80 mt-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(proj)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      title="Duplicate Project"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={() => onDeleteProject(proj.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/30 cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      onSelectProject(proj);
                      onNavigateTab('editor');
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
                  >
                    <span>Open Editor</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-[#0e111a] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-bold text-white">Create New Music Video</h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Song / Project Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Midnight Drill Freestyle"
                autoFocus
                required
                className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">Musical Genre</label>
              <div className="grid grid-cols-2 gap-2">
                {genres.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setNewGenre(g)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                      newGenre === g
                        ? 'border-purple-400 bg-purple-950/50 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 font-medium text-xs hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
