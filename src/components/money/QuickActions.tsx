import { motion } from 'framer-motion';
import { Plus, Receipt, Settings2 } from 'lucide-react';

interface QuickActionsProps {
  onAddExpense: () => void;
  onViewAll: () => void;
  onManageBudget: () => void;
}

export function QuickActions({ onAddExpense, onViewAll, onManageBudget }: QuickActionsProps) {
  const actions = [
    { label: 'Add Expense', icon: Plus, onClick: onAddExpense, primary: true },
    { label: 'View All', icon: Receipt, onClick: onViewAll, primary: false },
    { label: 'Adjust Budget', icon: Settings2, onClick: onManageBudget, primary: false },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex flex-wrap gap-3"
    >
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          onClick={action.onClick}
          className={action.primary ? 'btn-primary' : 'pill'}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.1 }}
        >
          <action.icon className="h-4 w-4" />
          <span>{action.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}
