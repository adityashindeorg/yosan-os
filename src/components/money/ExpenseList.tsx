import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenses, useCategories, useSettings } from '@/hooks/useDatabase';
import { formatCurrency } from '@/lib/db';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '@/components/ui/EmptyState';
import { Receipt } from 'lucide-react';

interface ExpenseFormData {
  categoryId: number;
  amount: number;
  note: string;
  date: Date;
}

export function ExpenseList() {
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>({
    categoryId: categories[0]?.id ?? 0,
    amount: 0,
    note: '',
    date: new Date(),
  });

  const currencySymbol = settings?.currencySymbol ?? '₹';

  const handleSubmit = async () => {
    if (formData.amount <= 0) return;

    if (editingId) {
      await updateExpense(editingId, formData);
      setEditingId(null);
    } else {
      await addExpense(formData);
      setIsAdding(false);
    }
    setFormData({
      categoryId: categories[0]?.id ?? 0,
      amount: 0,
      note: '',
      date: new Date(),
    });
  };

  const handleEdit = (expense: typeof expenses[0]) => {
    setEditingId(expense.id!);
    setFormData({
      categoryId: expense.categoryId,
      amount: expense.amount,
      note: expense.note,
      date: new Date(expense.date),
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      categoryId: categories[0]?.id ?? 0,
      amount: 0,
      note: '',
      date: new Date(),
    });
  };

  const getCategoryById = (id: number) => categories.find(c => c.id === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent Expenses</h3>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          <Plus className="h-4 w-4" />
          Add Expense
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                  className="input-premium"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Amount</label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  placeholder="0"
                  className="input-premium"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Note</label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="What was this for?"
                className="input-premium"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
              <input
                type="date"
                value={format(formData.date, 'yyyy-MM-dd')}
                onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                className="input-premium"
              />
            </div>
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

      {/* Expense List */}
      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Start tracking your spending by adding your first expense."
          action={{ label: 'Add Expense', onClick: () => setIsAdding(true) }}
        />
      ) : (
        <div className="space-y-2">
          {expenses.map((expense, index) => {
            const category = getCategoryById(expense.categoryId);
            
            return (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="card-premium p-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{category?.icon ?? '📦'}</span>
                  <div>
                    <p className="font-medium text-foreground">
                      {expense.note || category?.name || 'Expense'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(expense.date), 'MMM d, yyyy')} • {category?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-foreground">
                    -{formatCurrency(expense.amount, currencySymbol)}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteExpense(expense.id!)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
