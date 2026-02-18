import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ExpenseSheet } from '@/components/money/ExpenseSheet'; 
import { formatCurrency } from '@/lib/db';
import { 
  Plus, Wallet, Search, Settings2, CreditCard, PieChart, 
  Trash2, X, ArrowUpCircle, ArrowDownCircle, Sparkles, TrendingUp,
  AlertTriangle, CheckCircle2, BrainCircuit
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, setDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

// --- AI CONFIGURATION ---
// This defines what "Healthy" spending looks like as a % of your Total Income
const SAFE_LIMITS: Record<string, number> = {
  'Food': 0.20,      // 20% of Income
  'Shopping': 0.10,  // 10% of Income
  'Travel': 0.10,    // 10% of Income
  'Bills': 0.30,     // 30% of Income
  'Entertainment': 0.05 // 5% of Income
};

export default function Money() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budget, setBudget] = useState(0); 
  const [currency, setCurrency] = useState('₹');
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [newBudget, setNewBudget] = useState('');
  
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneySource, setMoneySource] = useState('');

  const carouselRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // --- 1. CORE MATH ---
  const totalIncome = transactions
    .filter(t => t.type === 'credit')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const totalSpent = transactions
    .filter(t => t.type !== 'credit')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const currentBalance = totalIncome - totalSpent;

  // --- 2. CATEGORY AGGREGATION ---
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    transactions.filter(t => t.type !== 'credit').forEach(t => {
       // Normalize category names to match SAFE_LIMITS keys (e.g. "Groceries" -> "Food")
       let name = t.categoryName || 'Uncategorized';
       if(name === 'Groceries' || name === 'Dining') name = 'Food';
       if(name === 'Transport' || name === 'Fuel') name = 'Travel';
       if(name === 'Cloth' || name === 'Electronics') name = 'Shopping';
       
       stats[name] = (stats[name] || 0) + (Number(t.amount) || 0);
    });
    return stats;
  }, [transactions]);

  // --- 3. THE "AI" ENGINE ---
  const aiInsights = useMemo(() => {
    const insights: { type: 'danger'|'warning'|'good'|'neutral', msg: string, category?: string }[] = [];

    // Rule 1: Check Specific Category Limits
    Object.keys(SAFE_LIMITS).forEach(cat => {
      const limit = totalIncome * SAFE_LIMITS[cat];
      const spent = categoryStats[cat] || 0;
      const remaining = limit - spent;

      if (spent > 0) { // Only analyze active categories
        if (remaining < 0) {
          insights.push({ 
            type: 'danger', 
            msg: `${cat} limit exceeded by ${formatCurrency(Math.abs(remaining), currency)}! Stop spending immediately.`,
            category: cat
          });
        } else if (remaining < (limit * 0.2)) {
          insights.push({ 
            type: 'warning', 
            msg: `${cat} critical: Only ${formatCurrency(remaining, currency)} left.`,
            category: cat
          });
        }
      }
    });

    // Rule 2: Overall Savings Health
    const savingsRatio = ((totalIncome - totalSpent) / totalIncome) * 100;
    if (totalIncome > 0 && savingsRatio < 10) {
      insights.push({ type: 'danger', msg: "Your savings are dangerously low (<10%). Cut non-essentials." });
    } else if (totalIncome > 0 && savingsRatio > 30) {
      insights.push({ type: 'good', msg: "Great job! You're saving more than 30% of your income." });
    }

    // Rule 3: Zero Income Check
    if (totalIncome === 0) {
      insights.push({ type: 'neutral', msg: "Add funds to initialize the AI Advisor." });
    }

    // Sort: Danger first, then Warning, then Good
    return insights.sort((a, b) => {
      const priority = { danger: 0, warning: 1, neutral: 2, good: 3 };
      return priority[a.type] - priority[b.type];
    });
  }, [totalIncome, categoryStats, currency, totalSpent]);

  // --- DATABASE SYNC ---
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        onSnapshot(query(collection(db, "users", user.uid, "transactions"), orderBy("date", "desc")), (s) => {
          setTransactions(s.docs.map(d => {
            const data = d.data();
            let dateObj = new Date();
            if (data.date && data.date instanceof Timestamp) dateObj = data.date.toDate();
            else if (data.date) dateObj = new Date(data.date);
            return { id: d.id, ...data, amount: Number(data.amount) || 0, date: dateObj };
          }));
        });
        onSnapshot(collection(db, "users", user.uid, "settings"), s => {
          s.docs.forEach(d => {
            if(d.data().totalBudget) { setBudget(Number(d.data().totalBudget)); setNewBudget(String(d.data().totalBudget)); }
            if(d.data().currencySymbol) setCurrency(d.data().currencySymbol);
          });
        });
      }
    });
    return () => unsub();
  }, []);

  // --- ACTIONS ---
  const handleAddMoney = async () => {
    if (!auth.currentUser || !moneyAmount) return;
    await addDoc(collection(db, "users", auth.currentUser.uid, "transactions"), {
        amount: Number(moneyAmount),
        note: moneySource || 'Deposit',
        categoryName: 'Income',
        type: 'credit',
        date: new Date()
    });
    setMoneyAmount('');
    setMoneySource('');
    setIsAddMoneyOpen(false);
  };

  const handleUpdateBudget = async () => {
    if (!auth.currentUser || !newBudget) return;
    await setDoc(doc(db, "users", auth.currentUser.uid, "settings", "general"), { totalBudget: Number(newBudget) }, { merge: true });
    setIsBudgetOpen(false);
  };

  const handleDelete = async (id: string) => {
    if(!auth.currentUser) return;
    if(window.confirm("Delete transaction?")) await deleteDoc(doc(db, "users", auth.currentUser.uid, "transactions", id));
  };

  const filteredTransactions = transactions.filter(t => 
    (t.categoryName && t.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#F1F3F5] p-4 md:p-6 lg:p-8 font-sans text-slate-900 relative pb-28 lg:pb-8">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Money Vault</h1>
              <div className="flex items-center gap-2 mt-1 text-gray-500 text-xs font-bold uppercase tracking-wide">
                <span>Real-time</span> <span className="text-gray-300">/</span> <span>Advisor</span>
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
               <button onClick={() => setIsBudgetOpen(true)} className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-black border border-gray-200 rounded-full text-xs font-bold hover:bg-gray-50 transition-colors w-full md:w-auto">
                  <Settings2 className="w-3 h-3" /> Limits
               </button>
               <button onClick={() => setIsAddMoneyOpen(true)} className="flex items-center justify-center gap-2 px-5 py-3 bg-black text-[#A9FF53] rounded-full text-xs font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/20 w-full md:w-auto">
                  <ArrowUpCircle className="w-3 h-3" /> Add Funds
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-8">
             
             {/* MAIN ASSET CARD */}
             <div className="col-span-1 lg:col-span-7 bg-black text-white rounded-[2rem] p-6 md:p-10 relative overflow-hidden shadow-xl shadow-black/10 flex flex-col justify-between min-h-[320px]">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-b from-[#A9FF53] to-transparent opacity-10 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
                
                <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${currentBalance < 0 ? 'bg-red-500' : 'bg-[#A9FF53]'} animate-pulse`}></div>
                      <span className="text-[#A9FF53] text-[10px] font-bold uppercase tracking-widest">Net Liquidity</span>
                   </div>
                   <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-1">{formatCurrency(currentBalance, currency)}</h2>
                   <p className="text-sm text-gray-400 font-bold">Total Available Assets</p>
                </div>
                
                <div className="relative z-10 grid grid-cols-2 gap-4 mt-8">
                   <div className="bg-white/10 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                      <div className="flex items-center gap-2 text-[#A9FF53] mb-1">
                        <ArrowUpCircle className="w-4 h-4"/> <span className="text-[10px] font-bold uppercase">Income</span>
                      </div>
                      <p className="text-xl font-bold">{formatCurrency(totalIncome, currency)}</p>
                   </div>
                   <div className="bg-white/10 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                      <div className="flex items-center gap-2 text-red-400 mb-1">
                        <ArrowDownCircle className="w-4 h-4"/> <span className="text-[10px] font-bold uppercase">Spent</span>
                      </div>
                      <p className="text-xl font-bold">{formatCurrency(totalSpent, currency)}</p>
                   </div>
                </div>
             </div>

             {/* AI ADVISOR CARD (Dynamic) */}
             <div className="col-span-1 lg:col-span-5 bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-6 z-10 relative">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center animate-pulse">
                         <BrainCircuit className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                         <h3 className="text-base font-black text-slate-900 leading-none">AI Advisor</h3>
                         <span className="text-[10px] font-bold text-gray-400 uppercase">Live Analysis</span>
                      </div>
                   </div>
                   {/* Status Indicator */}
                   <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${aiInsights[0]?.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {aiInsights[0]?.type === 'danger' ? 'Critical' : 'Stable'}
                   </div>
                </div>

                {/* DYNAMIC SUGGESTIONS LIST */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative z-10 max-h-[220px]">
                   {aiInsights.length > 0 ? (
                      aiInsights.map((insight, i) => (
                         <div key={i} className={`p-4 rounded-2xl border flex items-start gap-3 ${
                            insight.type === 'danger' ? 'bg-red-50 border-red-100' : 
                            insight.type === 'warning' ? 'bg-yellow-50 border-yellow-100' : 
                            'bg-gray-50 border-gray-100'
                         }`}>
                            {insight.type === 'danger' ? <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" /> : 
                             insight.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" /> :
                             <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />}
                            <div>
                               <p className={`text-xs font-bold leading-relaxed ${
                                  insight.type === 'danger' ? 'text-red-700' : 
                                  insight.type === 'warning' ? 'text-yellow-700' : 
                                  'text-slate-700'
                               }`}>
                                  {insight.msg}
                               </p>
                               {/* Show Progress Bar if it's a category alert */}
                               {insight.category && (
                                  <div className="mt-2 h-1.5 w-full bg-white/50 rounded-full overflow-hidden">
                                     <div className={`h-full rounded-full ${insight.type === 'danger' ? 'bg-red-500' : 'bg-yellow-500'}`} 
                                          style={{ width: '90%' }} /> 
                                  </div>
                               )}
                            </div>
                         </div>
                      ))
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center py-6">
                         <Sparkles className="w-8 h-8 mb-2 opacity-20" />
                         <p className="text-xs font-bold">Analysis active. No spending risks detected.</p>
                      </div>
                   )}
                </div>
                
                {/* Decorative background blob */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-2xl pointer-events-none" />
             </div>
          </div>

          {/* LEDGER TABLE */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm min-h-[400px]">
             <div className="flex justify-between items-center mb-6">
                 <div><h3 className="text-lg font-bold text-slate-900">Vault History</h3></div>
                 
                 <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9 pr-4 py-2 bg-gray-50 rounded-full text-sm font-bold focus:outline-none focus:ring-1 focus:ring-black"/>
                 </div>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                   <thead><tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100"><th className="py-4 pl-2">Description</th><th className="py-4">Category</th><th className="py-4">Date</th><th className="py-4 text-right">Amount</th><th className="py-4 text-right pr-2">Action</th></tr></thead>
                   <tbody className="text-sm">
                      {filteredTransactions.map((t, i) => (
                         <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                            <td className="py-4 pl-2 font-bold text-slate-900 max-w-[150px] truncate flex items-center gap-2">
                                {t.type === 'credit' ? <ArrowUpCircle className="w-4 h-4 text-[#A9FF53] fill-black" /> : <ArrowDownCircle className="w-4 h-4 text-red-400" />}
                                {t.note || (t.type === 'credit' ? 'Deposit' : 'Expense')}
                            </td>
                            <td className="py-4 font-medium text-gray-500">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${t.type === 'credit' ? 'bg-[#A9FF53]/20 text-black' : 'bg-gray-100'}`}>
                                    {t.categoryName}
                                </span>
                            </td>
                            <td className="py-4 font-medium text-gray-400 text-xs">{t.date instanceof Date && !isNaN(t.date.getTime()) ? t.date.toLocaleDateString() : '-'}</td>
                            <td className={`py-4 text-right font-black ${t.type === 'credit' ? 'text-green-600' : 'text-slate-900'}`}>
                                {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                            </td>
                            <td className="py-4 text-right pr-2"><button onClick={() => handleDelete(t.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* FAB for Adding Expenses */}
          <button onClick={() => setIsSheetOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white active:scale-95 transition-transform hover:bg-gray-900">
             <ArrowDownCircle className="w-6 h-6" />
          </button>

          <ExpenseSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
          
          {/* MODAL: ADD MONEY */}
          <AnimatePresence>
             {isAddMoneyOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setIsAddMoneyOpen(false)}>
                   <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl max-w-sm w-full relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <div className="absolute top-0 left-0 w-full h-2 bg-[#A9FF53]"></div>
                      <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black">Add Funds</h3><button onClick={() => setIsAddMoneyOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                      
                      <div className="space-y-4">
                          <div>
                             <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Amount to Deposit</label>
                             <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">{currency}</span>
                                <input type="number" value={moneyAmount} onChange={(e) => setMoneyAmount(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#A9FF53] text-green-600"/>
                             </div>
                          </div>
                          <div>
                             <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Source</label>
                             <input type="text" placeholder="e.g. Salary" value={moneySource} onChange={(e) => setMoneySource(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#A9FF53]"/>
                          </div>
                          <button onClick={handleAddMoney} className="w-full py-4 bg-[#A9FF53] text-black rounded-xl font-bold text-base hover:brightness-95 transition-all shadow-lg shadow-[#A9FF53]/20 flex items-center justify-center gap-2">
                             <TrendingUp className="w-4 h-4" /> Deposit Money
                          </button>
                      </div>
                   </motion.div>
                </motion.div>
             )}
          </AnimatePresence>

          {/* MODAL: BUDGET SETTINGS */}
          <AnimatePresence>
             {isBudgetOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setIsBudgetOpen(false)}>
                   <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Overall Monthly Limit</h3><button onClick={() => setIsBudgetOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                      <div className="space-y-4">
                          <div>
                             <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Set Limit</label>
                             <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">{currency}</span>
                                <input type="number" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} placeholder={String(budget)} className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-black"/>
                             </div>
                          </div>
                          <button onClick={handleUpdateBudget} className="w-full py-3 bg-black text-[#A9FF53] rounded-xl font-bold text-sm hover:bg-gray-900 transition-colors">Update Limit</button>
                      </div>
                   </motion.div>
                </motion.div>
             )}
          </AnimatePresence>
        </div>
      </PageTransition>
    </MainLayout>
  );
}
