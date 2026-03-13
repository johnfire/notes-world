import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ActionBar } from './components/layout/ActionBar';
import { ViewBar, AppView } from './components/layout/ViewBar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardGrid } from './components/layout/DashboardGrid';
import { ItemDrawer } from './components/ItemDrawer';
import { TagView } from './components/TagView';
import { IdeasView } from './components/IdeasView';
import { TasksView } from './components/TasksView';
import { CaptureBar } from './components/CaptureBar';
import { Tag } from './types';

function DashboardView() {
  const { state, loadDashboard, loadTags } = useApp();
  const [selectedTag, setSelectedTag]   = useState<Tag | null>(null);
  const [currentView, setCurrentView]   = useState<AppView>('dashboard');

  useEffect(() => {
    Promise.all([loadDashboard(), loadTags()]);
  }, [loadDashboard, loadTags]);

  function handleViewChange(view: AppView) {
    setCurrentView(view);
    if (view !== 'dashboard') setSelectedTag(null);
  }

  function renderMain() {
    if (currentView === 'ideas') return <IdeasView />;
    if (currentView === 'tasks') return <TasksView />;
    if (state.searchResults !== null) return <SearchResults />;
    if (selectedTag) return <TagView tag={selectedTag} />;
    if (state.dashboard) return <DashboardGrid blocks={state.blocks} columns={state.dashboard.columns} />;
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="shrink-0">
        <ActionBar />
        <ViewBar currentView={currentView} onViewChange={handleViewChange} />
        <CaptureBar
          autoTagId={selectedTag?.id}
          autoTagName={selectedTag?.name}
        />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onTagSelect={setSelectedTag} selectedTagId={selectedTag?.id ?? null} />
        <main className="flex-1 overflow-hidden">
          {renderMain()}
        </main>
      </div>
      <ItemDrawer />
    </div>
  );
}

function SearchResults() {
  const { state, clearSearch, openItem } = useApp();
  const results = state.searchResults ?? [];

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-300">
          {results.length} result{results.length !== 1 ? 's' : ''} for "{state.searchQuery}"
        </h2>
        <button onClick={clearSearch} className="btn-ghost text-xs">Clear search</button>
      </div>
      {results.length === 0 ? (
        <p className="text-gray-600 text-sm py-8 text-center">No items matched your search</p>
      ) : (
        <div className="space-y-1">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => openItem(item.id)}
              className="w-full text-left card hover:border-surface-400 hover:bg-surface-600 transition-colors"
            >
              <p className="text-sm text-gray-200">{item.title}</p>
              {item.body && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.body}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-600">{item.item_type}</span>
                <span className="text-xs text-gray-700">·</span>
                <span className="text-xs text-gray-600">{new Date(item.updated_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <DashboardView />
    </AppProvider>
  );
}
