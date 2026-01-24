import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

// --- FIREBASE IMPORTS ---
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function BudgetHero() {
  // Real State
  const [user, setUser] = useState<any>(null);
  const [totalBudget, setTotalBudget] = useState(0);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [transactions, setTransactions] = useState<any[]>([]);

  // 1. LISTEN TO REAL DATA
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // A. Listen to Budget/Settings
        const qSettings = query(collection(db, "users", currentUser.uid, "settings"));
        const unsubSettings = onSnapshot(qSettings, (snap) => {
          let foundBudget = 0;
          let foundCurrency = '₹';
          snap.docs.forEach(doc => {
            const data = doc.data();
            // Check all possible field names
            if (data.totalBudget) foundBudget = Number(data.totalBudget);
            else if (data.budget) foundBudget = Number(data.budget);
            
            if (data.currencySymbol) foundCurrency = data.currencySymbol;
          });
          setTotalBudget(foundBudget);
          setCurrencySymbol(foundCurrency);
        });

        // B. Listen to Transactions
        const qTx = query(collection(db, "users", currentUser.uid, "transactions"));
        const unsubTx = onSnapshot(qTx, (snap) => {
          setTransactions(snap.docs.map(doc => doc.data()));
        });

        return () => { unsubSettings(); unsubTx(); };
      } else {
        setTotalBudget(0);
        setTransactions([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. CALCULATE METRICS
  const totalSpent = transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalSaved = totalBudget - totalSpent;
  const savingsRate = totalBudget > 0 ? (totalSaved / totalBudget) * 100 : 0;
  const isPositiveSavings = totalSaved >= 0;

  // 3. GENERATE RADAR DATA (Spending by Category)
  const categoryMap = transactions.reduce((acc: any, t) => {
    const name = t.categoryName || (t.categoryId ? `Category ${t.categoryId}` : 'General');
    if (!acc[name]) acc[name] = 0;
    acc[name] += Number(t.amount);
    return acc;
  }, {});

  // If no data, show at least one empty node so graph doesn't crash
  const radarData = Object.keys(categoryMap).length > 0 
    ? Object.keys(categoryMap).map(key => ({
        category: key,
        value: totalBudget / Object.keys(categoryMap).length, // Ideal budget per cat (simplified)
        spent: categoryMap[key],
      }))
    : [{ category: 'Start', value: 100, spent: 0 }];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="card-hero p-10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: Numbers */}
        <div className="space-y-10 relative z-10">
          <div>
            <p className="section-title mb-4">Monthly Budget</p>
            <div className="display-number-lg text-gradient">
              {currencySymbol}{totalBudget.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className="text-3xl font-semibold text-foreground tracking-tight">
                {currencySymbol}{totalSpent.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-sm text-muted-foreground">
                  {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% used
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`text-3xl font-semibold tracking-tight ${isPositiveSavings ? 'text-primary' : 'text-destructive'}`}>
                {currencySymbol}{Math.abs(totalSaved).toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                {isPositiveSavings ? (
                  <TrendingUp className="h-4 w-4 text-primary" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm text-muted-foreground">
                  {savingsRate.toFixed(0)}% {isPositiveSavings ? 'saved' : 'over'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Radar Chart */}
        <div className="radar-container h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                tickLine={false}
              />
              <Tooltip 
                formatter={(val) => `${currencySymbol}${Number(val).toLocaleString()}`}
                contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px' }}
              />
              <Radar
                name="Spent"
                dataKey="spent"
                stroke="hsl(200, 90%, 55%)"
                fill="hsl(200, 90%, 55%)"
                fillOpacity={0.4}
                strokeWidth={2}
                animationDuration={1200}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
