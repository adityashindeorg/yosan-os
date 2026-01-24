import { useLiveQuery } from 'dexie-react-hooks';
import { db, type BudgetCategory, type Expense, type Project, type Task, type AppSettings, getMonthDateRange } from '@/lib/db';

// Settings hooks
export function useSettings() {
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  
  const updateSettings = async (updates: Partial<AppSettings>) => {
    const current = await db.settings.toCollection().first();
    if (current?.id) {
      await db.settings.update(current.id, { ...updates, updatedAt: new Date() });
    }
  };
  
  return { settings, updateSettings };
}

// Category hooks
export function useCategories() {
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];
  
  const addCategory = async (category: Omit<BudgetCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await db.categories.add({
      ...category,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };
  
  const updateCategory = async (id: number, updates: Partial<BudgetCategory>) => {
    await db.categories.update(id, { ...updates, updatedAt: new Date() });
  };
  
  const deleteCategory = async (id: number) => {
    await db.categories.delete(id);
  };
  
  const rebalanceCategories = async (totalBudget: number) => {
    const cats = await db.categories.toArray();
    const totalPercentage = cats.reduce((sum, c) => sum + c.percentage, 0);
    
    for (const cat of cats) {
      const normalizedPercentage = (cat.percentage / totalPercentage) * 100;
      const allocated = Math.round((normalizedPercentage / 100) * totalBudget);
      await db.categories.update(cat.id!, { 
        percentage: normalizedPercentage, 
        allocated,
        updatedAt: new Date() 
      });
    }
  };
  
  return { categories, addCategory, updateCategory, deleteCategory, rebalanceCategories };
}

// Expense hooks
export function useExpenses() {
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const { start, end } = getMonthDateRange(settings?.monthStartDay ?? 1);
  
  const expenses = useLiveQuery(
    () => db.expenses.where('date').between(start, end, true, true).toArray(),
    [start, end]
  ) ?? [];
  
  const allExpenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray()) ?? [];
  
  const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await db.expenses.add({
      ...expense,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };
  
  const updateExpense = async (id: number, updates: Partial<Expense>) => {
    await db.expenses.update(id, { ...updates, updatedAt: new Date() });
  };
  
  const deleteExpense = async (id: number) => {
    await db.expenses.delete(id);
  };
  
  const getExpensesByCategory = (categoryId: number) => {
    return expenses.filter(e => e.categoryId === categoryId);
  };
  
  const getTotalSpent = () => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  };
  
  const getSpentByCategory = (categoryId: number) => {
    return expenses
      .filter(e => e.categoryId === categoryId)
      .reduce((sum, e) => sum + e.amount, 0);
  };
  
  return { 
    expenses, 
    allExpenses,
    addExpense, 
    updateExpense, 
    deleteExpense, 
    getExpensesByCategory,
    getTotalSpent,
    getSpentByCategory
  };
}

// Project hooks
export function useProjects() {
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray()) ?? [];
  
  const addProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    return await db.projects.add({
      ...project,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };
  
  const updateProject = async (id: number, updates: Partial<Project>) => {
    await db.projects.update(id, { ...updates, updatedAt: new Date() });
  };
  
  const deleteProject = async (id: number) => {
    // Delete all tasks associated with this project
    await db.tasks.where('projectId').equals(id).delete();
    await db.projects.delete(id);
  };
  
  return { projects, addProject, updateProject, deleteProject };
}

// Task hooks
export function useTasks(projectId?: number) {
  const tasks = useLiveQuery(
    () => {
      if (projectId !== undefined) {
        return db.tasks.where('projectId').equals(projectId).sortBy('order');
      }
      return db.tasks.orderBy('order').toArray();
    },
    [projectId]
  ) ?? [];
  
  const allTasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  
  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
    const maxOrder = await db.tasks.orderBy('order').last();
    return await db.tasks.add({
      ...task,
      order: (maxOrder?.order ?? -1) + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };
  
  const updateTask = async (id: number, updates: Partial<Task>) => {
    await db.tasks.update(id, { ...updates, updatedAt: new Date() });
  };
  
  const toggleTask = async (id: number) => {
    const task = await db.tasks.get(id);
    if (task) {
      await db.tasks.update(id, {
        completed: !task.completed,
        completedAt: !task.completed ? new Date() : null,
        updatedAt: new Date(),
      });
    }
  };
  
  const deleteTask = async (id: number) => {
    await db.tasks.delete(id);
  };
  
  const reorderTasks = async (taskIds: number[]) => {
    for (let i = 0; i < taskIds.length; i++) {
      await db.tasks.update(taskIds[i], { order: i, updatedAt: new Date() });
    }
  };
  
  const getCompletedCount = () => allTasks.filter(t => t.completed).length;
  const getPendingCount = () => allTasks.filter(t => !t.completed).length;
  const getTodayTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return allTasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) >= today && 
      new Date(t.dueDate) < tomorrow
    );
  };
  
  const getOverdueTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allTasks.filter(t => 
      !t.completed && 
      t.dueDate && 
      new Date(t.dueDate) < today
    );
  };
  
  return { 
    tasks, 
    allTasks,
    addTask, 
    updateTask, 
    toggleTask, 
    deleteTask, 
    reorderTasks,
    getCompletedCount,
    getPendingCount,
    getTodayTasks,
    getOverdueTasks
  };
}

// Analytics hooks
export function useAnalytics() {
  const { expenses, getTotalSpent, getSpentByCategory } = useExpenses();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { allTasks, getCompletedCount, getPendingCount } = useTasks();
  
  const totalBudget = settings?.totalBudget ?? 0;
  const totalSpent = getTotalSpent();
  const totalSaved = totalBudget - totalSpent;
  const savingsRate = totalBudget > 0 ? (totalSaved / totalBudget) * 100 : 0;
  
  const categoryBreakdown = categories.map(cat => ({
    ...cat,
    spent: getSpentByCategory(cat.id!),
    remaining: cat.allocated - getSpentByCategory(cat.id!),
    percentSpent: cat.allocated > 0 ? (getSpentByCategory(cat.id!) / cat.allocated) * 100 : 0,
  }));
  
  const weeklyData = () => {
    const weeks: { week: string; spent: number }[] = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekExpenses = expenses.filter(e => {
        const date = new Date(e.date);
        return date >= weekStart && date <= weekEnd;
      });
      
      weeks.push({
        week: `Week ${4 - i}`,
        spent: weekExpenses.reduce((sum, e) => sum + e.amount, 0),
      });
    }
    
    return weeks;
  };
  
  const productivityScore = () => {
    const total = allTasks.length;
    if (total === 0) return 100;
    return Math.round((getCompletedCount() / total) * 100);
  };
  
  return {
    totalBudget,
    totalSpent,
    totalSaved,
    savingsRate,
    categoryBreakdown,
    weeklyData: weeklyData(),
    productivityScore: productivityScore(),
    completedTasks: getCompletedCount(),
    pendingTasks: getPendingCount(),
  };
}
