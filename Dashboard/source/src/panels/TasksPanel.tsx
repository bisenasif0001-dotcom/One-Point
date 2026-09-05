import React, { useState } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PanelHeader, Icon, Badge } from '../Shared';
import { useApp } from '../AppContext';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'var(--blue)' },
  { id: 'in_progress', title: 'In Progress', color: 'var(--amber)' },
  { id: 'done', title: 'Done', color: 'var(--emerald)' }
];

const getDueDateInfo = (dueDate: string) => {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));

  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} days`, color: 'var(--rose)' };
  if (diffDays === 0) return { text: 'Due Today', color: 'var(--amber)' };
  if (diffDays === 1) return { text: 'Due Tomorrow', color: 'var(--amber)' };
  if (diffDays <= 3) return { text: `Due in ${diffDays} days`, color: 'var(--blue)' };
  return { text: dueDate, color: 'var(--text-3)' };
};

const SortableTaskCard = ({ task, onClick }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick} className="kanban-card task-drag-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Badge type={task.type}>{task.priority}</Badge>
        <div className="cust-avatar" style={{ background: 'var(--blue)', width: 24, height: 24, fontSize: 'var(--fs-xs)' }}>{task.owner}</div>
      </div>
      <div className="kanban-card-name" style={{ lineHeight: 1.3 }}>{task.title}</div>
      <div className="kanban-card-service" style={{ marginTop: 4 }}>{task.sub}</div>
      {task.dueDate && (
        <div style={{ marginTop: 10, fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: getDueDateInfo(task.dueDate)?.color, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Icon name="calendar" size={12} /> {getDueDateInfo(task.dueDate)?.text}
        </div>
      )}
    </div>
  );
};

const AVATAR_COLORS = ['var(--blue)', 'var(--emerald)', 'var(--amber)', 'var(--violet)', 'var(--rose)'];
const getAvatarColor = (name: string) => AVATAR_COLORS[Math.abs((name || 'A').charCodeAt(0)) % AVATAR_COLORS.length];

export const TasksPanel = ({ onNewTask }: { onNewTask?: () => void }) => {
  const { tasks: ctxTasks, updateTask } = useApp();
  const [tasks, setTasks] = useState(ctxTasks);

  // Sync local state when context changes
  React.useEffect(() => { setTasks(ctxTasks); }, [ctxTasks]);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [commentInput, setCommentInput] = useState('');
  const [descDraft, setDescDraft] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  const applyTaskUpdate = (id: string, updates: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setSelectedTask((prev: any) => prev?.id === id ? { ...prev, ...updates } : prev);
    updateTask(id, updates);
  };

  const toggleSubtask = (taskId: string, subtaskIdx: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const subtasks = (task.subtasks || []).map((s: any, i: number) =>
      i === subtaskIdx ? { ...s, done: !s.done } : s
    );
    applyTaskUpdate(taskId, { subtasks });
  };

  const handleDescChange = (value: string) => {
    setDescDraft(value);
    setIsDirty(value !== (selectedTask?.description ?? selectedTask?.sub ?? ''));
  };

  const handleSaveDescription = () => {
    if (!selectedTask) return;
    applyTaskUpdate(selectedTask.id, { description: descDraft, sub: descDraft });
    setIsDirty(false);
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !selectedTask) return;

    const newComment = {
      id: Date.now().toString(),
      author: 'Asif Bisen',
      initials: 'AS',
      text: commentInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const taskComments = selectedTask.comments || [];

    const updatedTask = {
      ...selectedTask,
      comments: [...taskComments, newComment]
    };

    applyTaskUpdate(selectedTask.id, { comments: updatedTask.comments });
    setCommentInput('');
  };

  // Sync descDraft when a different task is opened
  React.useEffect(() => {
    if (selectedTask) {
      const desc = selectedTask.description ?? selectedTask.sub ?? '';
      setDescDraft(desc);
      setIsDirty(false);
    }
  }, [selectedTask?.id]);

  const getCommentsToRender = () => {
    if (!selectedTask) return [];
    return selectedTask.comments || [];
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    setActiveTask(tasks.find(t => t.id === event.active.id));
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.sortable.containerId;
    const isOverTask = over.data.current?.sortable.containerId;

    if (!isActiveTask) return;

    setTasks(prev => {
      const activeIndex = prev.findIndex(t => t.id === activeId);
      const overIndex = prev.findIndex(t => t.id === overId);

      const activeColumn = prev[activeIndex]?.status;
      const overColumn = prev[overIndex]?.status || overId; // If over an empty column

      if (activeColumn !== overColumn) {
        let newItems = [...prev];
        const taskToMove = newItems[activeIndex];
        newItems.splice(activeIndex, 1);

        if (overIndex >= 0) {
          newItems.splice(overIndex, 0, { ...taskToMove, status: overColumn });
        } else {
          newItems.push({ ...taskToMove, status: overColumn });
        }
        return newItems;
      }
      return prev;
    });
  };

  const handleDragEnd = (event: any) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeColumn = tasks.find(t => t.id === activeId)?.status;
    const overColumn = tasks.find(t => t.id === overId)?.status || overId;

    if (overColumn && activeTask?.status !== overColumn) {
      updateTask(activeId, { status: overColumn });
    }

    if (activeColumn && overColumn && activeColumn === overColumn) {
      setTasks((items) => {
        const oldIndex = items.findIndex((i) => i.id === activeId);
        const newIndex = items.findIndex((i) => i.id === overId);
        if (oldIndex !== newIndex && newIndex !== -1) {
          return arrayMove(items, oldIndex, newIndex);
        }
        return items;
      });
    }
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
  };

  return (
    <div className="panel active" style={{ display: 'flex', flexDirection: 'column' }}>
      <PanelHeader
        title="Task Board"
        sub="Kanban-style workflow management"
        actions={
          <button className="btn btn-primary btn-sm" onClick={onNewTask}>
            <Icon name="plus" /> New Task
          </button>
        }
      />
      <div className="panels" style={{ flex: 1, minHeight: 0, paddingBottom: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0, overflowX: 'auto' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {COLUMNS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.id);

              return (
                <div key={col.id} className="kanban-col" style={{ width: 320, backgroundColor: 'var(--bg-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: col.color }} />
                      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)' }}>{col.title}</span>
                    </div>
                    <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 8px', borderRadius: 12 }}>
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="kanban-col-body" style={{ padding: 12, flex: 1, overflowY: 'auto' }}>
                    <SortableContext id={col.id} items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 100 }}>
                        {colTasks.map(task => (
                          <SortableTaskCard
                            key={task.id}
                            task={task}
                            onClick={() => setSelectedTask(task)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                </div>
              );
            })}

            <DragOverlay dropAnimation={dropAnimation}>
              {activeTask ? (
                <div className="kanban-card" style={{ opacity: 0.8, cursor: 'grabbing', width: 300, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', transform: 'rotate(2deg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Badge type={activeTask.type}>{activeTask.priority}</Badge>
                    <div className="cust-avatar" style={{ background: 'var(--blue)', width: 24, height: 24, fontSize: 'var(--fs-xs)' }}>{activeTask.owner}</div>
                  </div>
                  <div className="kanban-card-name" style={{ lineHeight: 1.3 }}>{activeTask.title}</div>
                  <div className="kanban-card-service" style={{ marginTop: 4 }}>{activeTask.sub}</div>
                  {activeTask.dueDate && (
                    <div style={{ marginTop: 10, fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: getDueDateInfo(activeTask.dueDate)?.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="calendar" size={12} /> {getDueDateInfo(activeTask.dueDate)?.text}
                    </div>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Task Details Side Panel */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="task-side-panel" onClick={e => e.stopPropagation()}>
            <div className="side-panel-header">
              <div>
                <div style={{ fontSize: 'var(--fs-base)', fontWeight: 'var(--fw-semibold)', lineHeight: 1.3, marginBottom: 4 }}>{selectedTask.title}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>{selectedTask.id} · {COLUMNS.find(c => c.id === selectedTask.status)?.title}</div>
              </div>
              <button
                className="btn-icon-sm"
                onClick={() => setSelectedTask(null)}
                style={{ padding: 6, background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)' }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="side-panel-body">
              <div className="form-group" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Description</label>
                  {isDirty && (
                    <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--amber)', background: 'var(--amber-dim)', padding: '2px 8px', borderRadius: 12 }}>
                      Unsaved changes
                    </span>
                  )}
                </div>
                <textarea
                  className="form-input"
                  rows={3}
                  value={descDraft}
                  onChange={(e) => handleDescChange(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                 <div className="form-group">
                   <label className="form-label">Status</label>
                   <select
                     className="form-input"
                     value={selectedTask.status}
                     onChange={(e) => {
                       const newStatus = e.target.value;
                       applyTaskUpdate(selectedTask.id, { status: newStatus });
                     }}
                   >
                     {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                   </select>
                 </div>
                 <div className="form-group">
                   <label className="form-label">Priority</label>
                   <select
                     className="form-input"
                     value={selectedTask.priority}
                     onChange={(e) => applyTaskUpdate(selectedTask.id, { priority: e.target.value })}
                   >
                     <option>High</option>
                     <option>Medium</option>
                     <option>Standard</option>
                   </select>
                 </div>
              </div>
              <div className="form-grid" style={{ marginBottom: 16 }}>
                <div className="form-group">
                   <label className="form-label">Due Date</label>
                   <input
                     type="date"
                     className="form-input"
                     value={selectedTask.dueDate || ''}
                     onChange={(e) => {
                     const newStatus = e.target.value;
                       applyTaskUpdate(selectedTask.id, { dueDate: newStatus });
                     }}
                   />
                   {selectedTask.dueDate && (
                     <div style={{ fontSize: 'var(--fs-xs)', marginTop: 4, color: getDueDateInfo(selectedTask.dueDate)?.color, fontWeight: 'var(--fw-medium)' }}>
                       {getDueDateInfo(selectedTask.dueDate)?.text}
                     </div>
                   )}
                </div>
                <div className="form-group">
                   <label className="form-label">Assignee</label>
                   <select className="form-input" value={selectedTask.owner} onChange={(e) => applyTaskUpdate(selectedTask.id, { owner: e.target.value })}>
                     <option value="AS">Asif Bisen (AS)</option>
                     <option value="OP">Operator-2 (OP)</option>
                   </select>
                </div>
              </div>

              <div className="divider" style={{ margin: '20px 0' }}></div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Subtasks</label>
                  <button className="btn btn-ghost btn-xs" onClick={() => {
                    const current = selectedTask.subtasks || [
                      { text: 'Review document scans', done: true },
                      { text: 'Approve via portal', done: false },
                    ];
                    applyTaskUpdate(selectedTask.id, { subtasks: [...current, { text: 'New subtask', done: false }] });
                  }}><Icon name="plus" size={12} /> Add</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(selectedTask.subtasks || [
                    { text: 'Review document scans', done: true },
                    { text: 'Approve via portal', done: false },
                  ]).map((st: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-1)' }}>
                      <input
                        type="checkbox"
                        style={{ width: 14, height: 14, cursor: 'pointer' }}
                        checked={!!st.done}
                        onChange={() => {
                          const base = selectedTask.subtasks || [
                            { text: 'Review document scans', done: true },
                            { text: 'Approve via portal', done: false },
                          ];
                          const updated = base.map((s: any, i: number) => i === idx ? { ...s, done: !s.done } : s);
                          applyTaskUpdate(selectedTask.id, { subtasks: updated });
                        }}
                      />
                      <span style={{ fontSize: 'var(--fs-xs)', textDecoration: st.done ? 'line-through' : 'none', color: st.done ? 'var(--text-3)' : 'var(--text-1)' }}>{st.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider" style={{ margin: '20px 0' }}></div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: 10 }}>Comments</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  {getCommentsToRender().length > 0 ? getCommentsToRender().map((comment: any) => (
                    <div key={comment.id} style={{ display: 'flex', gap: 10 }}>
                      <div className="cust-avatar" style={{ background: getAvatarColor(comment.author || comment.initials || 'A'), width: 28, height: 28, fontSize: 'var(--fs-xs)', flexShrink: 0 }}>
                        {comment.initials}
                      </div>
                      <div style={{ flex: 1, background: 'var(--bg-3)', padding: '10px 12px', borderTopRightRadius: 8, borderBottomRightRadius: 8, borderBottomLeftRadius: 8, border: '1px solid var(--border-1)' }}>
                         <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--fw-semibold)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                           {comment.author} <span style={{ color: 'var(--text-3)', fontWeight: 'var(--fw-regular)' }}>{comment.time}</span>
                         </div>
                         <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-1)' }}>{comment.text}</div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-3)', textAlign: 'center', padding: '16px 0' }}>
                      No comments yet. Start the conversation!
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    placeholder="Type your comment..."
                    style={{ flex: 1 }}
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0 16px' }}
                    onClick={handleAddComment}
                  >
                    <Icon name="send" size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-2)' }}>
               <button className="btn btn-ghost" onClick={() => setSelectedTask(null)}>Close</button>
               <button className="btn btn-primary" onClick={() => { handleSaveDescription(); setSelectedTask(null); }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
