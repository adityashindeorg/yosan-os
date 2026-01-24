import Dexie, { type Table } from 'dexie';

// Types
export interface BudgetCategory {
  id?: number;
  name: string;
  icon: string;
  color: string;
  allocated: number;
  percentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id?: number;
  categoryId: number;
  amount: number;
  note: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id?: number;
  name: string;
  description: string;
  color: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id?: number;
  projectId: number | null;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettings {
  id?: number;
  totalBudget: number;
  currency: string;
  currencySymbol: string;
  monthStartDay: number;
  createdAt: Date;
  updatedAt: Date;
}

// Database
class FinanceDB extends Dexie {
  categories!: Table<BudgetCategory>;
  expenses!: Table<Expense>;
  projects!: Table<Project>;
  tasks!: Table<Task>;
  settings!: Table<AppSettings>;

  constructor() {
    super('financeDB');
    this.version(1).stores({
      categories: '++id, name, createdAt',
      expenses: '++id, categoryId, date, createdAt',
      projects: '++id, name, status, priority, createdAt',
      tasks: '++id, projectId, completed, dueDate, order, createdAt',
      settings: '++id',
    });
  }
}

export const db = new FinanceDB();

// Default data initialization
export async function initializeDefaultData() {
  const settingsCount = await db.settings.count();
  
  if (settingsCount === 0) {
    // Initialize settings
    await db.settings.add({
      totalBudget: 50000,
      currency: 'INR',
      currencySymbol: '₹',
      monthStartDay: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Initialize default categories
    const defaultCategories: Omit<BudgetCategory, 'id'>[] = [
      { name: 'Food', icon: '🍔', color: '#84cc16', allocated: 15000, percentage: 30, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Dates', icon: '💝', color: '#f472b6', allocated: 5000, percentage: 10, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Accessories', icon: '🎧', color: '#60a5fa', allocated: 5000, percentage: 10, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Savings', icon: '💰', color: '#a3e635', allocated: 20000, percentage: 40, createdAt: new Date(), updatedAt: new Date() },
      { name: 'Misc', icon: '📦', color: '#a78bfa', allocated: 5000, percentage: 10, createdAt: new Date(), updatedAt: new Date() },
    ];

    await db.categories.bulkAdd(defaultCategories);

    // Add sample project
    const projectId = await db.projects.add({
      name: 'Personal Goals',
      description: 'Track personal development goals',
      color: '#84cc16',
      priority: 'high',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add sample tasks
    await db.tasks.bulkAdd([
      {
        projectId,
        title: 'Review monthly budget',
        description: 'Check spending patterns',
        priority: 'high',
        dueDate: new Date(),
        completed: false,
        completedAt: null,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId,
        title: 'Set savings goal',
        description: 'Define target for next month',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        completed: false,
        completedAt: null,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  }
}

// Helper functions
export function formatCurrency(amount: number, symbol: string = '₹'): string {
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

export function getMonthDateRange(monthStartDay: number = 1): { start: Date; end: Date } {
  const now = new Date();
  const currentDay = now.getDate();
  
  let start: Date;
  let end: Date;
  
  if (currentDay >= monthStartDay) {
    start = new Date(now.getFullYear(), now.getMonth(), monthStartDay);
    end = new Date(now.getFullYear(), now.getMonth() + 1, monthStartDay - 1);
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - 1, monthStartDay);
    end = new Date(now.getFullYear(), now.getMonth(), monthStartDay - 1);
  }
  
  return { start, end };
}
