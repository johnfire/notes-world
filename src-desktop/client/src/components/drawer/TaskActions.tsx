import { TaskStatus } from '../../types';

interface TaskActionsProps {
  taskStatus: TaskStatus | undefined;
  actioning: boolean;
  onAction: (action: 'complete' | 'start' | 'block') => void;
}

export function TaskActions({ taskStatus, actioning, onAction }: TaskActionsProps) {
  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Actions</label>
      {taskStatus === TaskStatus.Open && (
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-ghost text-xs"
            disabled={actioning}
            onClick={() => void onAction('start')}
          >Start</button>
          <button
            className="btn-ghost text-xs"
            disabled={actioning}
            onClick={() => void onAction('complete')}
          >Complete</button>
        </div>
      )}
      {taskStatus === TaskStatus.InProgress && (
        <div className="flex gap-2 flex-wrap">
          <button
            className="btn-ghost text-xs"
            disabled={actioning}
            onClick={() => void onAction('complete')}
          >Complete</button>
          <button
            className="btn-ghost text-xs"
            disabled={actioning}
            onClick={() => void onAction('block')}
          >Block</button>
        </div>
      )}
      {taskStatus === TaskStatus.Blocked && (
        <p className="text-xs text-gray-600 italic">Remove a dependency to unblock</p>
      )}
    </div>
  );
}
