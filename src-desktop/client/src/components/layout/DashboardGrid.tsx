import { useState, useCallback } from 'react';
import { Block, ViewType } from '../../types';
import { RecentItems } from '../blocks/RecentItems';
import { TagCloud } from '../blocks/TagCloud';
import { ItemsByTag } from '../blocks/ItemsByTag';
import { Notes } from '../blocks/Notes';
import { ActionableTasks } from '../blocks/ActionableTasks';
import { BlockedTasks } from '../blocks/BlockedTasks';
import { OverdueTasks } from '../blocks/OverdueTasks';
import * as api from '../../api';
import { useApp } from '../../context/AppContext';

interface DashboardGridProps {
  blocks:  Block[];
  columns: number;
}

function BlockWrapper({ block }: { block: Block }) {
  switch (block.view_type) {
    case ViewType.QuickCapture:    return null;
    case ViewType.RecentItems:     return <RecentItems  block={block} />;
    case ViewType.TagCloud:        return <TagCloud     block={block} />;
    case ViewType.ItemsByTag:      return <ItemsByTag   block={block} />;
    case ViewType.Notes:           return <Notes        block={block} />;
    case ViewType.ActionableTasks: return <ActionableTasks block={block} />;
    case ViewType.BlockedTasks:    return <BlockedTasks    block={block} />;
    case ViewType.OverdueTasks:    return <OverdueTasks    block={block} />;
    default:
      return (
        <div className="card h-full flex items-center justify-center">
          <span className="text-gray-600 text-sm">{block.view_type}</span>
        </div>
      );
  }
}

export function DashboardGrid({ blocks: allBlocks, columns }: DashboardGridProps) {
  const { loadDashboard } = useApp();
  const [dragId, setDragId]       = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const blocks = allBlocks.filter((b) => b.view_type !== ViewType.QuickCapture);
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns] ?? 'grid-cols-3';

  // Group blocks by row, skipping empty rows
  const maxRow = blocks.reduce((m, b) => Math.max(m, b.row), 0);
  const rows: Block[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    const row = blocks.filter((b) => b.row === r).sort((a, b) => a.column - b.column);
    if (row.length > 0) rows.push(row);
  }

  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    setDragId(blockId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(blockId);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    setDropTarget(null);
    if (!dragId || dragId === targetBlockId) { setDragId(null); return; }

    const dragged = blocks.find(b => b.id === dragId);
    const target  = blocks.find(b => b.id === targetBlockId);
    if (!dragged || !target) { setDragId(null); return; }

    // Swap positions
    const positions = blocks.map(b => {
      if (b.id === dragId)        return { block_id: b.id, row: target.row,  column: target.column };
      if (b.id === targetBlockId) return { block_id: b.id, row: dragged.row, column: dragged.column };
      return { block_id: b.id, row: b.row, column: b.column };
    });

    setDragId(null);
    await api.dashboard.reorderBlocks(positions);
    await loadDashboard();
  }, [dragId, blocks, loadDashboard]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropTarget(null);
  }, []);

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {rows.map((rowBlocks, rowIdx) => (
        <div key={rowIdx} className={`flex-1 grid ${gridCols} gap-4 min-h-0`}>
          {rowBlocks.map((block) => (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragOver={(e)  => handleDragOver(e, block.id)}
              onDrop={(e)      => void handleDrop(e, block.id)}
              onDragEnd={handleDragEnd}
              onDragLeave={() => setDropTarget(null)}
              className={`h-full min-h-0 rounded-lg transition-opacity ${
                dragId === block.id ? 'opacity-40' : ''
              } ${
                dropTarget === block.id && dragId !== block.id
                  ? 'ring-2 ring-accent ring-offset-1 ring-offset-surface-900'
                  : ''
              }`}
            >
              <BlockWrapper block={block} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
