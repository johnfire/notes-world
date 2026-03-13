import { Block, ViewType } from '../../types';
import { QuickCapture } from '../blocks/QuickCapture';
import { RecentItems } from '../blocks/RecentItems';
import { TagCloud } from '../blocks/TagCloud';
import { ItemsByTag } from '../blocks/ItemsByTag';
import { Notes } from '../blocks/Notes';
import { ActionableTasks } from '../blocks/ActionableTasks';
import { BlockedTasks } from '../blocks/BlockedTasks';
import { OverdueTasks } from '../blocks/OverdueTasks';

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

export function DashboardGrid({ blocks, columns }: DashboardGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns] ?? 'grid-cols-3';

  // Group blocks by row
  const maxRow = blocks.reduce((m, b) => Math.max(m, b.row), 0);
  const rows: Block[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    rows.push(blocks.filter((b) => b.row === r).sort((a, b) => a.column - b.column));
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {rows.map((rowBlocks, rowIdx) => (
        <div key={rowIdx} className={`grid ${gridCols} gap-4`}>
          {rowBlocks.map((block) => (
            <div key={block.id} className="min-h-48">
              <BlockWrapper block={block} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
