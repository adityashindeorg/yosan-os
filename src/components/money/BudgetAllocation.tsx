import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/db';
import { Slider } from '@/components/ui/slider';
import { AlertCircle, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { collection, query, onSnapshot, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// 1. DEFINE THE TYPE TO FIX THE ERROR
interface Category {
  id: string;
  name: string;
  icon: string;
  percentage: number;
  allocated?: number;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Food & Dining', icon: '🍔', percentage: 20 },
  { id: 'cat_transport', name: 'Transportation', icon: '🚗', percentage: 15 },
  { id: 'cat_shopping', name: 'Shopping', icon: '🛍️', percentage: 15 },
  { id: 'cat_fun', name: 'Entertainment', icon: '🎬', percentage: 10 },
  { id: 'cat_bills', name: 'Bills & Utilities', icon: '💡', percentage: 25 },
  { id: 'cat_health', name: 'Health & Wellness', icon: '🏥', percentage: 10 },
  { id: 'cat_others', name: 'Others', icon: '📦', percentage: 5 },
];

export function BudgetAllocation() {
  const [user, setUser] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // A. Get Budget
        const settingsRef = doc(db, "users", currentUser.uid, "settings", "general");
        const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.totalBudget) setTotalBudget(Number(data.totalBudget));
            else if (data.budget) setTotalBudget(Number(data.budget));
            
            if (data.currencySymbol) setCurrencySymbol(data.currencySymbol);
          }
        });

        // B. Get Transactions
        const qTx = query(collection(db, "users", currentUser.uid, "transactions"));
        const unsubTx = onSnapshot(qTx, (snap) => {
          setTransactions(snap.docs.map(doc => doc.data()));
        });

        // C. Get Categories (FIXED SORT ERROR HERE)
        const qCats = query(collection(db, "users", currentUser.uid, "categories"));
        const unsubCats = onSnapshot(qCats, (snap) => {
          if (!snap.empty) {
            const loadedCats = snap.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                name: data.name || 'Category',
                icon: data.icon || '📦',
                percentage: Number(data.percentage) || 0,
                allocated: Number(data.allocated) || 0
              } as Category; // <--- Force Type Check
            });
            // Safe Sort
            setCategories(loadedCats.sort((a, b) => b.percentage - a.percentage));
          }
        });

        return () => { unsubSettings(); unsubTx(); unsubCats(); };
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const getSpentByCategory = (catId: string) => {
    return transactions
      .filter(t => String(t.categoryId) === String(catId))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  };

  const handlePercentageChange = async (id: string, newPercentage: number) => {
    if (!user) return;
    const catRef = doc(db, "users", user.uid, "categories", id);
    const newAllocated = Math.round((newPercentage / 100) * totalBudget);
    
    await setDoc(catRef, {
      percentage: newPercentage,
      allocated: newAllocated
    }, { merge: true });
  };

  const handleRebalance = async () => {
    if (!user || !confirm("Reset categories to default? This fixes missing IDs.")) return;
    const batch = writeBatch(db);
    
    DEFAULT_CATEGORIES.forEach(cat => {
      const ref = doc(db, "users", user.uid, "categories", cat.id);
      batch.set(ref, { ...cat, allocated: Math.round((cat.percentage / 100) * totalBudget) });
    });
    await batch.commit();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Budget Allocation</h3>
        <button onClick={handleRebalance} className="btn-ghost text-xs flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Rebalance / Fix
        </button>
      </div>

      <div className="space-y-3">
        {categories.map((category, index) => {
          const spent = getSpentByCategory(category.id);
          const allocated = Math.round((category.percentage / 100) * totalBudget);
          
          const remaining = allocated - spent;
          const percentSpent = allocated > 0 ? (spent / allocated) * 100 : 0;
          const isOverspent = remaining < 0;
          const isEditing = editingId === category.id;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`card-premium p-4 cursor-pointer transition-all ${isEditing ? 'ring-2 ring-primary/30' : ''}`}
              onClick={() => setEditingId(isEditing ? null : category.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon || '📦'}</span>
                  <div>
                    <p className="font-medium text-foreground">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(spent, currencySymbol)} of {formatCurrency(allocated, currencySymbol)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`text-sm font-semibold ${isOverspent ? 'text-destructive' : 'text-foreground'}`}>
                      {category.percentage}%
                    </span>
                    {isOverspent && <AlertCircle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex items-center gap-1 text-xs justify-end">
                    {isOverspent ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-destructive" />
                        <span className="text-destructive">Over {formatCurrency(Math.abs(remaining), currencySymbol)}</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground">{formatCurrency(remaining, currencySymbol)} left</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="progress-bar mb-3 bg-secondary/50 h-2 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${isOverspent ? 'bg-destructive' : 'bg-primary'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percentSpent, 100)}%` }}
                />
              </div>
              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-3 border-t border-border/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs text-muted-foreground mb-3">Adjust allocation percentage</p>
                  <Slider
                    value={[category.percentage]}
                    onValueChange={([value]) => handlePercentageChange(category.id, value)}
                    max={100} min={0} step={5} className="w-full"
                  />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}