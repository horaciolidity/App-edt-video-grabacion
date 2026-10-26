/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StudioTab, Project, ProjectTake } from './types';
import {
  loadAllProjects,
  saveProject,
  addTakeToProject,
  getCurrentProjectId
} from './services/projectStore';
import { TopBar } from './components/navigation/TopBar';
import { BottomTabBar } from './components/navigation/BottomTabBar';
import { StudioHome } from './components/home/StudioHome';
import { CameraStudio } from './components/camera/CameraStudio';
import { KaraokeStudio } from './components/karaoke/KaraokeStudio';
import { MultitrackEditor } from './components/editor/MultitrackEditor';
import { ProjectVault } from './components/projects/ProjectVault';
import { EffectsLibrary } from './components/effects/EffectsLibrary';
import { ExportModal } from './components/export/ExportModal';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<StudioTab>('home');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isMobileDeviceView, setIsMobileDeviceView] = useState<boolean>(false);
  const [appliedFilterId, setAppliedFilterId] = useState<string>('normal');

  // Initialize projects on mount
  useEffect(() => {
    const loaded = loadAllProjects();
    setProjects(loaded);
    const lastId = getCurrentProjectId();
    if (lastId && loaded.find(p => p.id === lastId)) {
      setActiveProjectId(lastId);
    } else {
      setActiveProjectId(loaded[0]?.id || '');
    }
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const handleUpdateProject = (updated: Project) => {
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    saveProject(updated);
  };

  const handleTakeRecorded = (take: ProjectTake) => {
    if (!activeProject) return;
    const updated = addTakeToProject(activeProject, take);
    setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  const handleCreateProject = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    saveProject(newProject);
  };

  const handleDeleteProject = (projectId: string) => {
    const filtered = projects.filter(p => p.id !== projectId);
    setProjects(filtered);
    if (activeProjectId === projectId && filtered.length > 0) {
      setActiveProjectId(filtered[0].id);
    }
  };

  if (!activeProject) {
    return (
      <div className="w-full h-screen bg-[#090a0f] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Loading VibeStudio Engine...</span>
        </div>
      </div>
    );
  }

  // Content for the active tab
  const renderTabContent = () => {
    switch (currentTab) {
      case 'home':
        return (
          <StudioHome
            project={activeProject}
            onNavigateTab={setCurrentTab}
            onOpenExport={() => setIsExportOpen(true)}
          />
        );

      case 'camera':
        return (
          <CameraStudio
            onTakeRecorded={handleTakeRecorded}
            onNavigateTab={setCurrentTab}
            initialBeat={activeProject.backingBeat}
            initialFilterId={appliedFilterId}
          />
        );

      case 'karaoke':
        return (
          <KaraokeStudio
            onTakeRecorded={handleTakeRecorded}
            onNavigateTab={setCurrentTab}
          />
        );

      case 'editor':
        return (
          <MultitrackEditor
            project={activeProject}
            onUpdateProject={handleUpdateProject}
            onOpenExport={() => setIsExportOpen(true)}
            onNavigateTab={setCurrentTab}
          />
        );

      case 'projects':
        return (
          <ProjectVault
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={(p) => setActiveProjectId(p.id)}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onNavigateTab={setCurrentTab}
          />
        );

      case 'effects':
        return (
          <EffectsLibrary
            onApplyFilter={(fid) => {
              setAppliedFilterId(fid);
              setCurrentTab('camera');
            }}
            onNavigateTab={setCurrentTab}
            activeFilterId={appliedFilterId}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans antialiased overflow-x-hidden selection:bg-purple-600/30 selection:text-purple-200">
      {/* Top Bar strictly following Top Bar Contract */}
      <TopBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenExport={() => setIsExportOpen(true)}
        isMobileDeviceView={isMobileDeviceView}
        onToggleMobileDeviceView={() => setIsMobileDeviceView(!isMobileDeviceView)}
        projectTitle={activeProject.title}
      />

      {/* Main View Area */}
      {isMobileDeviceView ? (
        /* Android Flagship Phone Frame Simulation */
        <main className="flex-1 flex items-center justify-center p-4 bg-[#05060a] relative">
          <div className="relative w-full max-w-[412px] h-[860px] bg-black rounded-[48px] border-[10px] border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col ring-1 ring-slate-700/80">
            {/* Android Camera Punch Hole */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-900 border border-slate-800 z-50 pointer-events-none" />

            {/* Android Status Bar */}
            <div className="h-8 bg-black/90 px-6 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0 z-40 select-none">
              <span>09:41</span>
              <div className="flex items-center gap-2">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Screen Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
              {renderTabContent()}
            </div>

            {/* Mobile Bottom Tab Bar */}
            <BottomTabBar
              currentTab={currentTab}
              onSelectTab={setCurrentTab}
            />

            {/* Android Home Indicator Gesture Bar */}
            <div className="h-4 bg-black flex items-center justify-center shrink-0">
              <div className="w-32 h-1 bg-slate-600 rounded-full" />
            </div>
          </div>
        </main>
      ) : (
        /* Responsive Desktop & Tablet Workstation Layout */
        <main className="flex-1 flex flex-col">
          {renderTabContent()}

          {/* Bottom Bar visible on small mobile screens */}
          <div className="md:hidden">
            <BottomTabBar
              currentTab={currentTab}
              onSelectTab={setCurrentTab}
            />
          </div>
        </main>
      )}

      {/* Multitrack Export Modal */}
      <ExportModal
        project={activeProject}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
