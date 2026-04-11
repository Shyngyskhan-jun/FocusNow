import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { apiFetch } from '../services/api';
import '../styles/tasks.css';

//типы

export type Priority = 'high' | 'medium' | 'low';
export type Mood = 'tired' | 'normal' | 'energized';
export type FilterTab = 'all' | 'active' | 'completed' | 'overdue';

export interface SubStep {
  id: string | number;
  text: string;
  done: boolean;
}

export interface Task {
  id: string | number;
  text: string;
  priority: Priority;
  completed: boolean;
  deadline?: string | null;      // ISO date string
  mood_before?: Mood | null;
  steps?: SubStep[];
}

//константы

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const MOOD_OPTIONS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'tired',     emoji: '😴', label: 'Устал' },
  { value: 'normal',    emoji: '😐', label: 'Нормально' },
  { value: 'energized', emoji: '⚡', label: 'Энергия' },
];

const FILTER_LABELS: Record<FilterTab, string> = {
  all: 'Все',
  active: 'Активные',
  completed: 'Выполнено',
  overdue: 'Просрочено',
};

//хелпер

const isOverdue = (task: Task) => {
  if (!task.deadline || task.completed) return false;
  return new Date(task.deadline) < new Date(new Date().toDateString());
};

const formatDeadline = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

//лог

const logBehavior = async (
  actionType: 'skip' | 'quit' | 'delay',
  taskId?: string | number
) => {
  try {
    await apiFetch('/behavior', {
      method: 'POST',
      body: JSON.stringify({ action_type: actionType, task_id: taskId ?? null }),
    });
  } catch {
    /* silent — analytics shouldn't break UX */
  }
};

//апи

function useTasksApi() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tasksRef = useRef<Task[]>([]);
  const errorTimerRef = useRef<number | null>(null);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const showError = useCallback((msg: string) => {
    setErrorMessage(msg);
    if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
    errorTimerRef.current = window.setTimeout(() => {
      setErrorMessage(null);
      errorTimerRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        
        const data = await apiFetch('/tasks') as Task[];
        if (alive) setTasks(data);
      } catch {
        if (alive) showError('Не удалось загрузить задачи');
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current);
    };
  }, [showError]);

  const addTask = useCallback(async (
    text: string,
    priority: Priority,
    deadline: string | null,
    mood: Mood | null
  ) => {
    try {
      
      const newTask = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({ text, priority, deadline, mood_before: mood }),
      }) as Task;
      setTasks(prev => [newTask, ...prev]);
      return true;
    } catch {
      showError('Не удалось добавить задачу');
      return false;
    }
  }, [showError]);

  const toggleTask = useCallback(async (id: string | number) => {
    const cur = tasksRef.current.find(t => t.id === id);
    if (!cur) return;
    const next = !cur.completed;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: next } : t));
    try {
      await apiFetch(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ completed: next }),
      });
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: cur.completed } : t));
      showError('Не удалось обновить задачу');
    }
  }, [showError]);

  const deleteTask = useCallback(async (id: string | number) => {
    const prev = tasksRef.current;
    const target = prev.find(t => t.id === id);
    const idx = prev.findIndex(t => t.id === id);
    if (!target) return;

    setTasks(p => p.filter(t => t.id !== id));
    try {
      await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
    } catch {
      setTasks(p => {
        if (p.some(t => t.id === id)) return p;
        const next = [...p];
        next.splice(idx >= 0 ? idx : next.length, 0, target);
        return next;
      });
      showError('Не удалось удалить задачу');
    }
  }, [showError]);

  const toggleStep = useCallback(async (
    taskId: string | number,
    stepId: string | number
  ) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        steps: (t.steps ?? []).map(s =>
          s.id === stepId ? { ...s, done: !s.done } : s
        ),
      };
    }));
    try {
      await apiFetch(`/tasks/${taskId}/steps/${stepId}/toggle`, { method: 'PUT' });
    } catch {
      /* optimistic only */
    }
  }, []);

  const addStep = useCallback(async (taskId: string | number, text: string) => {
    try {
      // Добавили as SubStep
      const step = await apiFetch(`/tasks/${taskId}/steps`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }) as SubStep;
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, steps: [...(t.steps ?? []), step] } : t
      ));
    } catch {
      showError('Не удалось добавить шаг');
    }
  }, [showError]);

  return {
    tasks, isLoading, errorMessage,
    addTask, toggleTask, deleteTask,
    toggleStep, addStep,
  };
}

//настроение

const MoodModal: React.FC<{
  onSelect: (mood: Mood) => void;
  onSkip: () => void;
}> = ({ onSelect, onSkip }) => (
  <div className="modal-backdrop" onClick={onSkip}>
    <div className="modal-card" onClick={e => e.stopPropagation()}>
      <h3 className="modal-title">Как ты себя чувствуешь?</h3>
      <p className="modal-sub">Это поможет понять, в каком состоянии лучше работается</p>
      <div className="mood-options">
        {MOOD_OPTIONS.map(({ value, emoji, label }) => (
          <button
            key={value}
            className="mood-btn"
            onClick={() => onSelect(value)}
          >
            <span className="mood-emoji">{emoji}</span>
            <span className="mood-label">{label}</span>
          </button>
        ))}
      </div>
      <button className="mood-skip" onClick={onSkip}>Пропустить</button>
    </div>
  </div>
);



const SubStepList: React.FC<{
  steps: SubStep[];
  taskId: string | number;
  onToggle: (taskId: string | number, stepId: string | number) => void;
  onAdd: (taskId: string | number, text: string) => void;
}> = ({ steps, taskId, onToggle, onAdd }) => {
  const [newStep, setNewStep] = useState('');
  const [open, setOpen] = useState(false);

  const submit = () => {
    const t = newStep.trim();
    if (!t) return;
    onAdd(taskId, t);
    setNewStep('');
  };

  const done = steps.filter(s => s.done).length;

  return (
    <div className="substeps">
      <button
        className="substeps-toggle"
        onClick={() => setOpen(p => !p)}
      >
        <span className="substeps-progress">
          {steps.length > 0 && `${done}/${steps.length}`}
        </span>
        <span>{open ? '▲' : '▼'} Шаги</span>
      </button>

      {open && (
        <div className="substeps-body">
          {steps.length === 0 && (
            <p className="substeps-empty">Нет шагов. Добавь первый!</p>
          )}
          {steps.map(s => (
            <label key={s.id} className={`substep-item ${s.done ? 'is-done' : ''}`}>
              <input
                type="checkbox"
                checked={s.done}
                onChange={() => onToggle(taskId, s.id)}
                className="sr-only"
              />
              <span className="substep-dot" />
              <span className="substep-text">{s.text}</span>
            </label>
          ))}
          <div className="substep-add-row">
            <input
              className="substep-input"
              placeholder="Новый шаг..."
              value={newStep}
              onChange={e => setNewStep(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            />
            <button className="substep-add-btn" onClick={submit} disabled={!newStep.trim()}>
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

//тут остановился

const TaskItem = React.memo<{
  task: Task;
  onToggle: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onToggleStep: (taskId: string | number, stepId: string | number) => void;
  onAddStep: (taskId: string | number, text: string) => void;
  onDelay: (id: string | number) => void;
}>(({ task, onToggle, onDelete, onToggleStep, onAddStep, onDelay }) => {
  const overdue = isOverdue(task);
  const steps = task.steps ?? [];
  const stepsDone = steps.filter(s => s.done).length;
  const stepsProgress = steps.length > 0
    ? Math.round((stepsDone / steps.length) * 100)
    : null;

  return (
    <li className={`task-item ${task.completed ? 'is-completed' : ''} ${overdue ? 'is-overdue' : ''}`}>
      <div className="task-main">
        <label className="task-checkbox-label">
          <input
            type="checkbox"
            className="sr-only"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
          />
          <div className="checkbox-custom" />
        </label>

        <div className="task-body">
          <span className="task-title">{task.text}</span>

          <div className="task-meta">
            <span className={`badge badge-${task.priority}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>

            {task.deadline && (
              <span className={`deadline-tag ${overdue ? 'deadline-tag--overdue' : ''}`}>
                📅 {formatDeadline(task.deadline)}
                {overdue && ' · просрочено'}
              </span>
            )}

            {task.mood_before && (
              <span className="mood-tag">
                {MOOD_OPTIONS.find(m => m.value === task.mood_before)?.emoji}
              </span>
            )}

            {stepsProgress !== null && (
              <span className="steps-badge">
                {stepsDone}/{steps.length} шагов
              </span>
            )}
          </div>

          {stepsProgress !== null && (
            <div className="steps-progress-bar">
              <div
                className="steps-progress-fill"
                style={{ width: `${stepsProgress}%` }}
              />
            </div>
          )}
        </div>

        <div className="task-actions">
          {!task.completed && (
            <button
              className="btn-icon delay-btn"
              title="Отложить"
              onClick={() => onDelay(task.id)}
            >
              ⏸
            </button>
          )}
          <button
            className="btn-icon delete-btn"
            title="Удалить"
            onClick={() => onDelete(task.id)}
          >
            ✕
          </button>
        </div>
      </div>

      <SubStepList
        steps={steps}
        taskId={task.id}
        onToggle={onToggleStep}
        onAdd={onAddStep}
      />
    </li>
  );
});

TaskItem.displayName = 'TaskItem';

//добавить задачу

const AddTaskForm: React.FC<{
  onAdd: (text: string, priority: Priority, deadline: string | null, mood: Mood | null) => Promise<boolean>;
  disabled: boolean;
}> = ({ onAdd, disabled }) => {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadline, setDeadline] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showMood, setShowMood] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const doAdd = useCallback(async (mood: Mood | null) => {
    const trimmed = text.trim();
    if (!trimmed || isSaving) return;

    setIsSaving(true);
    const ok = await onAdd(trimmed, priority, deadline || null, mood);
    if (ok) {
      setText('');
      setPriority('medium');
      setDeadline('');
    }
    setIsSaving(false);
  }, [text, priority, deadline, isSaving, onAdd]);

  const handleSubmit = () => {
    if (!text.trim() || isSaving || disabled) return;
    setShowMood(true);
  };

  return (
    <>
      {showMood && (
        <MoodModal
          onSelect={mood => { setShowMood(false); doAdd(mood); }}
          onSkip={() => { setShowMood(false); doAdd(null); }}
        />
      )}

      <div className="add-task-form">
        <div className="add-task-row">
          <input
            autoFocus
            type="text"
            className="form-input"
            placeholder="Что нужно сделать?"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
            disabled={disabled || isSaving}
          />

          <select
            className="form-select"
            value={priority}
            onChange={e => setPriority(e.target.value as Priority)}
            disabled={disabled || isSaving}
          >
            <option value="high">🔥 Высокий</option>
            <option value="medium">⚡ Средний</option>
            <option value="low">🌱 Низкий</option>
          </select>

          <input
            type="date"
            className="form-input form-input--date"
            value={deadline}
            min={today}
            onChange={e => setDeadline(e.target.value)}
            disabled={disabled || isSaving}
            title="Дедлайн"
          />

          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={disabled || isSaving || !text.trim()}
          >
            {isSaving ? '...' : '+ Добавить'}
          </button>
        </div>
      </div>
    </>
  );
};

//сама страница

const TasksPage: React.FC = () => {
  const {
    tasks, isLoading, errorMessage,
    addTask, toggleTask, deleteTask,
    toggleStep, addStep,
  } = useTasksApi();

  const [filter, setFilter] = useState<FilterTab>('all');

  const counts = useMemo(() => ({
    all: tasks.length,
    active: tasks.filter(t => !t.completed && !isOverdue(t)).length,
    completed: tasks.filter(t => t.completed).length,
    overdue: tasks.filter(t => isOverdue(t)).length,
  }), [tasks]);

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (filter === 'active') list = list.filter(t => !t.completed && !isOverdue(t));
    else if (filter === 'completed') list = list.filter(t => t.completed);
    else if (filter === 'overdue') list = list.filter(t => isOverdue(t));

    return list.sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      const od = Number(isOverdue(b)) - Number(isOverdue(a));
      if (od !== 0) return od;
      return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    });
  }, [tasks, filter]);

  const handleDelay = useCallback((id: string | number) => {
    logBehavior('delay', id);
  }, []);

  const subtitle = isLoading
    ? 'Загрузка...'
    : counts.active > 0
    ? `Активных: ${counts.active} · Просрочено: ${counts.overdue}`
    : 'Все задачи выполнены — отличная работа 🎉';

  return (
    <section className="tasks-page">
      <header className="tasks-header">
        <div>
          <h1 className="tasks-title">Задачи</h1>
          <p className="tasks-sub">{subtitle}</p>
        </div>
      </header>

      {errorMessage && (
        <div className="error-banner" role="alert">{errorMessage}</div>
      )}

      <AddTaskForm onAdd={addTask} disabled={isLoading} />

      {!isLoading && tasks.length > 0 && (
        <div className="tasks-stats-row">
          {(['all', 'active', 'completed', 'overdue'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              className={`filter-tab ${filter === tab ? 'filter-tab--active' : ''} ${tab === 'overdue' && counts.overdue > 0 ? 'filter-tab--alert' : ''}`}
              onClick={() => setFilter(tab)}
            >
              <span className="filter-tab__label">{FILTER_LABELS[tab]}</span>
              <span className="filter-tab__count">{counts[tab]}</span>
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="tasks-empty">
          <div className="tasks-empty__icon">⏳</div>
          <p>Синхронизация с сервером...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tasks-empty">
          <div className="tasks-empty__icon">
            {filter === 'completed' ? '🎉' : filter === 'overdue' ? '✅' : '📋'}
          </div>
          <h3>
            {filter === 'completed' && 'Ещё ничего не выполнено'}
            {filter === 'overdue' && 'Просрочек нет!'}
            {(filter === 'all' || filter === 'active') && 'Список пуст'}
          </h3>
          <p>
            {filter === 'overdue'
              ? 'Всё под контролем 👍'
              : 'Добавь первую задачу выше'}
          </p>
        </div>
      ) : (
        <ul className="tasks-list">
          {filtered.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onToggleStep={toggleStep}
              onAddStep={addStep}
              onDelay={handleDelay}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export default TasksPage;