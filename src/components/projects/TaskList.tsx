import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Check, CheckCircle2, Circle, Calendar, GripVertical, ListTodo } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { format } from 'date-fns';

// --- FIREBASE IMPORTS ---
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  query, onSnapshot, orderBy, Timestamp 
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: Date | null;
  projectId: string | null; // Changed to string
}

const priorityColors = {
  low: 'text-muted-foreground',
  medium: 'text-warning',
  high: 'text-destructive',
};

interface TaskListProps {
  projectId?: string | null; // Changed to string
  showProjectSelector?: boolean;
}

export function TaskList({ projectId, showProjectSelector = false }: TaskListProps) {
  // Real State
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: null,
    projectId: projectId ?? null,
  });

  // 1. FETCH DATA (Tasks & Projects)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // A. Fetch Tasks
        const qTasks = query(collection(db, "users", currentUser.uid, "tasks"), orderBy("createdAt", "desc"));
        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
          const taskData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate() : null
            };
          });
          setTasks(taskData);
        });

        // B. Fetch Projects (for dropdown)
        const qProjects = query(collection(db, "users", currentUser.uid, "projects"));
        const unsubProjects = onSnapshot(qProjects, (snapshot) => {
          setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
          unsubTasks();
          unsubProjects();
        };
      } else {
        setTasks([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Filter tasks locally based on selected Project ID
  const filteredTasks = projectId 
    ? tasks.filter(t => t.projectId === projectId)
    : tasks;

  const pendingTasks = filteredTasks.filter(t => !t.completed);
  const completedTasks = filteredTasks.filter(t => t.completed);

  // 2. SAVE TASK
  const handleSubmit = async () => {
    if (!formData.title.trim() || !user) return;

    const payload = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      projectId: projectId ?? formData.projectId, // Use prop if available, else form
      dueDate: formData.dueDate ? Timestamp.fromDate(formData.dueDate) : null,
      updatedAt: Timestamp.now()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "users", user.uid, "tasks", editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(collection(db, "users", user.uid, "tasks"), {
          ...payload,
          completed: false,
          createdAt: Timestamp.now()
        });
        setIsAdding(false);
      }
      // Reset
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: null,
        projectId: projectId ?? null,
      });
    } catch (err) {
      console.error("Error saving task:", err);
    }
  };

  // 3. TOGGLE COMPLETION (The Magic Part)
  const toggleTask = async (id: string, currentStatus: boolean) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "tasks", id);
    // Optimistic UI update could go here, but Firestore is fast enough
    await updateDoc(ref, { 
      completed: !currentStatus 
    });
  };

  const deleteTask = async (id: string) => {
    if (!user || !confirm("Delete task?")) return;
    await deleteDoc(doc(db, "users", user.uid, "tasks", id));
  };

  const handleEdit = (task: any) => {
    setEditingId(task.id);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      projectId: task.projectId,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: null,
      projectId: projectId ?? null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {projectId ? 'Project Tasks' : 'All Tasks'}
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card-premium p-4 space-y-4"
          >
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What needs to be done?"
                className="input-premium"
              />
            </div>
            {/* Description, Priority, Date inputs same as before... */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add details..."
                className="input-premium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="input-premium"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    dueDate: e.target.value ? new Date(e.target.value) : null 
                  })}
                  className="input-premium"
                />
              </div>
            </div>

            {/* Project Selector (Only show if not already inside a project) */}
            {showProjectSelector && !projectId && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Project</label>
                <select
                  value={formData.projectId ?? ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    projectId: e.target.value || null 
                  })}
                  className="input-premium"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={handleCancel} className="btn-ghost flex items-center gap-1.5">
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn-primary flex items-center gap-1.5 py-2">
                <Check className="h-4 w-4" />
                {editingId ? 'Update' : 'Add'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks found"
          description="Add a task to get started."
          action={{ label: 'Add Task', onClick: () => setIsAdding(true) }}
        />
      ) : (
        <div className="space-y-6">
          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-premium p-4 flex items-center gap-4 group"
                >
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="flex-shrink-0"
                  >
                    <Circle className={`h-5 w-5 ${priorityColors[task.priority as keyof typeof priorityColors]}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                    )}
                  </div>
                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.dueDate), 'MMM d')}
                    </div>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(task)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Completed ({completedTasks.length})</p>
              {completedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  className="card-premium p-4 flex items-center gap-4 group opacity-60"
                >
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="flex-shrink-0"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-through truncate">{task.title}</p>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}