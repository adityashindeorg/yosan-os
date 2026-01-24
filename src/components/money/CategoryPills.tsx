import { motion, Variants } from 'framer-motion';
import { useCategories, useExpenses, useSettings } from '@/hooks/useDatabase';
import { formatCurrency } from '@/lib/db';
import { AlertCircle } from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24
    }
  },
};

interface CategoryPillsProps {
  onCategoryClick?: (categoryId: number) => void;
}

export function CategoryPills({ onCategoryClick }: CategoryPillsProps) {
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { getSpentByCategory } = useExpenses();
  
  const currencySymbol = settings?.currencySymbol ?? '₹';

  return (
    <div className="space-y-6">
      <p className="section-title">Budget Allocation</p>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap gap-4"
      >
        {categories.map((category) => {
          const spent = getSpentByCategory(category.id!);
          const remaining = category.allocated - spent;
          const isOverspent = remaining < 0;
          const percentUsed = category.allocated > 0 
            ? Math.min((spent / category.allocated) * 100, 100) 
            : 0;

          return (
            <motion.button
              key={category.id}
              variants={itemVariants}
              onClick={() => onCategoryClick?.(category.id!)}
              className="category-pill group relative"
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Progress Ring Background */}
              <div className="absolute inset-0 rounded-3xl overflow-hidden">
                <motion.div 
                  className={`absolute bottom-0 left-0 right-0 ${isOverspent ? 'bg-destructive/10' : 'bg-primary/10'}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${percentUsed}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center">
                <span className="category-pill-icon">{category.icon}</span>
                <span className="category-pill-amount mt-2">
                  {formatCurrency(category.allocated, currencySymbol)}
                </span>
                <span className="category-pill-label mt-1">{category.name}</span>
                
                {/* Remaining/Overspent indicator */}
                <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${
                  isOverspent ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {isOverspent && <AlertCircle className="h-3 w-3" />}
                  <span>
                    {isOverspent ? '-' : ''}{formatCurrency(Math.abs(remaining), currencySymbol)} {isOverspent ? 'over' : 'left'}
                  </span>
                </div>
              </div>

              {/* Percentage badge */}
              <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                {category.percentage.toFixed(0)}%
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
