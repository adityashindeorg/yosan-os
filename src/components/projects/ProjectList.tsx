import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Check, FolderKanban, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

// --- FIREBASE IMPORTS ---
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  query, onSnapshot, orderBy, Timestamp 
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface ProjectFormData {
  name: string;
  description: string;
  color: string;
  priority: 'low' | 'medium' | 'high';
}

const priorityColors = {
  low: 'bg-secondary text-secondary-foreground',
  medium: 'bg-warning/15 text-warning',
  high: 'bg-destructive/10 text-destructive',
};

const colorOptions = ['#84cc16', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#14b8a6'];

interface ProjectListProps {
  // NOTE: Changed ID to string for Firebase
  onSelectProject: (id: string | null) => void;
  selectedProjectId: string | null;
}

export function ProjectList({ onSelectProject, selectedProjectId }: ProjectListProps) {
  // Real State
  const [projects, setProjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    color: colorOptions[0],
    priority: 'medium',
  });

  // 1. LISTEN TO FIREBASE
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const q = query(collection(db, "users", currentUser.uid, "projects"), orderBy("createdAt", "desc"));
        const unsubscribeProjects = onSnapshot(q, (snapshot) => {
          const projectData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProjects(projectData);
        });
        return () => unsubscribeProjects();
      } else {
        setProjects([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. SAVE TO CLOUD
  const handleSubmit = async () => {
    if (!formData.name.trim() || !user) return;

    try {
      if (editingId) {
        // Update
        const ref = doc(db, "users", user.uid, "projects", editingId);
        await updateDoc(ref, { ...formData });
        setEditingId(null);
      } else {
        // Create
        await addDoc(collection(db, "users", user.uid, "projects"), {
          ...formData,
          status: 'active',
          createdAt: Timestamp.now()
        });
        setIsAdding(false);
      }
      // Reset
      setFormData({ name: '', description: '', color: colorOptions[0], priority: 'medium' });
    } catch (err) {
      console.error("Error saving project:", err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !confirm("Delete this project?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "projects", id));
      if (selectedProjectId === id) onSelectProject(null);
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleEdit = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(project.id);
    setFormData({
      name: project.name,
      description: project.description,
      color: project.color,
      priority: project.priority,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '', color: colorOptions[0], priority: 'medium' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Projects</h3>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          <Plus className="h-4 w-4" />
          New Project
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
              <label className="text-xs text-muted-foreground mb-1.5 block">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Project name"
                className="input-premium"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
                className="input-premium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Color</label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        formData.color === color ? 'scale-110 ring-2 ring-offset-2 ring-primary' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
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
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={handleCancel} className="btn-ghost flex items-center gap-1.5">
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn-primary flex items-center gap-1.5 py-2">
                <Check className="h-4 w-4" />
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project List */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start organizing tasks."
          action={{ label: 'Create Project', onClick: () => setIsAdding(true) }}
        />
      ) : (
        <div className="space-y-2">
          <motion.div
             // "All Projects" Option
             onClick={() => onSelectProject(null)}
             className={`card-premium p-3 mb-2 cursor-pointer ${selectedProjectId === null ? 'ring-2 ring-primary' : ''}`}
          >
             <p className="text-sm font-medium text-center">View All Tasks</p>
          </motion.div>

          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              onClick={() => onSelectProject(project.id)}
              className={`card-premium p-4 flex items-center justify-between group cursor-pointer transition-all ${
                selectedProjectId === project.id ? 'ring-2 ring-primary/30' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${project.color}20` }}
                >
                  <FolderKanban className="h-5 w-5" style={{ color: project.color }} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`tag text-xs ${priorityColors[project.priority as keyof typeof priorityColors]}`}>
                  {project.priority}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleEdit(project, e)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}