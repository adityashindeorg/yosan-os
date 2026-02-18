import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ExpenseSheet } from '@/components/money/ExpenseSheet'; 
import { formatCurrency } from '@/lib/db';
import { 
  Plus, Wallet, Search, Settings2, CreditCard, PieChart, 
  Trash2, X, ChevronLeft, ChevronRight, AlertCircle, Download,
  ArrowUpCircle, ArrowDownCircle, Sparkles, TrendingUp
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, setDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export default function Money() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budget, setBudget] = useState(0); // This is still the "Limit"
  const [currency, setCurrency] = useState('₹');
  
  const [isSheetOpen, setIsSheetOpen] = useState(false); // For Expenses (Debit)
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false); // For Income (Credit)
  
  const [searchQuery, setSearchQuery] = useState('');
  const [newBudget, setNewBudget] = useState('');
  
  // New State for Adding Money
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneySource, setMoneySource] = useState('');

  const carouselRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // --- NEW DATA CALCULATIONS ---
  // 1. Calculate Total Income (Credit)
  const totalIncome = transactions
    .filter(t => t.type === 'credit')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // 2. Calculate Total Spent (Debit)
  const totalSpent = transactions
    .filter(t => t.type !== 'credit') // Assume anything not credit is debit
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // 3. Your ACTUAL Money (The Feature You Requested)
  const currentBalance = totalIncome - totalSpent;

  // 4. Budget Logic (Limit vs Spent)
  const remainingBudget = Math.max(0, budget - totalSpent);
  const progress = budget > 0 ? (totalSpent / budget) * 100 : 0;

  // 5. Smart Allocations (Based on Current Balance)
  const smartAllocations = useMemo(() => {
    // If we have money, suggest how to use it
    const base = currentBalance > 0 ? currentBalance : 0;
    return [
      { name: "Essentials (Food/Rent)", percent: 50, amount: base * 0.50, color: "bg-blue-500" },
      { name: "Wants (Cloth/Fun)", percent: 30, amount: base * 0.30, color: "bg-purple-500" },
      { name: "Savings & Invest", percent: 20, amount: base * 0.20, color: "bg-[#A9FF53]" },
    ];
  }, [currentBalance]);

  const categories = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t.type !== 'credit').forEach(t => {
       const name = t.categoryName || 'Uncategorized';
       cats[name] = (cats[name] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(cats).sort(([,a], [,b]) => b - a).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const filteredTransactions = transactions.filter(t => 
    (t.categoryName && t.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.source && t.source.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  // AUTO SCROLL CAROUSEL
  useEffect(() => {
    if (isPaused || !carouselRef.current) return;
    const interval = setInterval(() => {
        if (carouselRef.current) {
            const { current } = carouselRef;
            if (current.scrollLeft >= current.scrollWidth - current.clientWidth - 10) current.scrollTo({ left: 0, behavior: 'smooth' });
            else current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    }, 3000); 
    return () => clearInterval(interval);
  }, [isPaused, categories]);

  const handleUpdateBudget = async () => {
    if (!auth.currentUser || !newBudget) return;
    await setDoc(doc(db, "users", auth.currentUser.uid, "settings", "general"), { totalBudget: Number(newBudget) }, { merge: true });
    setIsBudgetOpen(false);
  };

  // NEW: Handle Adding Money (Credit)
  const handleAddMoney = async () => {
    if (!auth.currentUser || !moneyAmount) return;
    await addDoc(collection(db, "users", auth.currentUser.uid, "transactions"), {
        amount: Number(moneyAmount),
        note: moneySource || 'Deposit',
        categoryName: 'Income',
        type: 'credit', // Mark as credit
        date: new Date()
    });
    setMoneyAmount('');
    setMoneySource('');
    setIsAddMoneyOpen(false);
  };

  const handleDelete = async (id: string) => {
    if(!auth.currentUser) return;
    if(window.confirm("Delete transaction?")) await deleteDoc(doc(db, "users", auth.currentUser.uid, "transactions", id));
  };

  const handleExportCSV = () => {
    const csv = "data:text/csv;charset=utf-8," + [["Date","Type","Category","Note","Amount"], ...filteredTransactions.map(t => [t.date.toLocaleDateString(), t.type || 'debit', t.categoryName, t.note||'', t.amount])].map(e => e.join(",")).join("\n");
    const link = document.createElement("a"); link.href = encodeURI(csv); link.download = `Transactions.csv`; link.click();
  };

  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#F1F3F5] p-4 md:p-6 lg:p-8 font-sans text-slate-900 relative pb-28 lg:pb-8">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Money Vault</h1>
              <div className="flex items-center gap-2 mt-1 text-gray-500 text-xs font-bold uppercase tracking-wide">
                <span>Net Worth</span> <span className="text-gray-300">/</span> <span>Smart Allocation</span>
              </div>
            </div>
            
            <div className="flex flex-col w-full md:w-auto gap-3">
               <div className="relative group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search records..." className="w-full pl-10 pr-4 py-3 bg-white rounded-full border border-gray-200 text-base md:text-sm font-bold text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"/>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => setIsBudgetOpen(true)} className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-black border border-gray-200 rounded-full text-xs font-bold hover:bg-gray-50 transition-colors w-full">
                    <Settings2 className="w-3 h-3" /> Limit
                 </button>
                 <button onClick={() => setIsAddMoneyOpen(true)} className="flex items-center justify-center gap-2 px-5 py-3 bg-black text-[#A9FF53] rounded-full text-xs font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/20 w-full">
                    <ArrowUpCircle className="w-3 h-3" /> Add Funds
                 </button>
               </div>
            </div>
          </div>

          {/* VAULT HERO GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-8">
             
             {/* MAIN CARD: YOUR REAL MONEY */}
             <div className="col-span-1 lg:col-span-8 bg-black text-white rounded-[2rem] p-6 md:p-10 relative overflow-hidden shadow-xl shadow-black/10 flex flex-col justify-between min-h-[300px]">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-b from-[#A9FF53] to-transparent opacity-10 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                   <div>
                      <div className="flex items-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${currentBalance < 0 ? 'bg-red-500' : 'bg-[#A9FF53]'} animate-pulse`}></div>
                          <span className="text-[#A9FF53] text-[10px] font-bold uppercase tracking-widest">Asset Liquidity</span>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter">{formatCurrency(currentBalance, currency)}</h2>
                      <p className="text-xs text-gray-500 font-bold mt-1">Available to spend</p>
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5"><Wallet className="w-6 h-6 text-[#A9FF53]" /></div>
                </div>
                
                <div className="relative z-10 mt-8 grid grid-cols-2 gap-4">
                   <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 text-[#A9FF53] mb-1">
                        <ArrowUpCircle className="w-4 h-4"/> <span className="text-[10px] font-bold uppercase">Credited</span>
                      </div>
                      <p className="text-xl font-bold">{formatCurrency(totalIncome, currency)}</p>
                   </div>
                   <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 text-red-400 mb-1">
                        <ArrowDownCircle className="w-4 h-4"/> <span className="text-[10px] font-bold uppercase">Debited</span>
                      </div>
                      <p className="text-xl font-bold">{formatCurrency(totalSpent, currency)}</p>
                   </div>
                </div>
             </div>

             {/* SIDE STATS: SMART ALLOCATION */}
             <div className="col-span-1 lg:col-span-4 flex flex-col gap-4">
                
                {/* Smart Advisor Card */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm flex-1 flex flex-col relative overflow-hidden min-h-[180px]">
                   <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><Sparkles className="w-4 h-4 text-blue-500" /></div>
                         <h3 className="text-sm font-bold text-slate-900">Smart Plan</h3>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">AI Suggested</span>
                   </div>
                   
                   <div className="space-y-3 relative z-10 flex-1">
                      {smartAllocations.map((item, i) => (
                        <div key={i}>
                           <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                              <span>{item.name}</span>
                              <span>{formatCurrency(item.amount, currency)}</span>
                           </div>
                           <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }}></div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* Limit Status */}
                <div className="bg-[#F8F9FA] border border-gray-100 rounded-[2rem] p-6 shadow-sm flex items-center justify-between">
                   <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Budget Remaining</p>
                      <h3 className="text-xl font-black text-slate-900">{formatCurrency(remainingBudget, currency)}</h3>
                   </div>
                   <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm">
                      <PieChart className="w-5 h-5 text-gray-900" />
                   </div>
                </div>
             </div>
          </div>

          {/* CAROUSEL (Categories) */}
          <div className="mb-12 relative" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
             <div className="flex justify-between items-end mb-4 px-1">
                 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-gray-400" /> Spending Breakup</h3>
             </div>
             <div ref={carouselRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory py-4 px-1 scrollbar-hide -mx-4 md:mx-0 px-4 md:px-0">
                {categories.map((cat, i) => {
                   const catProgress = (cat.value / totalSpent) * 100 || 0;
                   return (
                      <div key={i} className="snap-center min-w-[260px] bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative">
                         <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black ${i===0 ? 'bg-black text-[#A9FF53]' : 'bg-gray-50 text-slate-900'}`}>{cat.name[0]}</div>
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{catProgress.toFixed(0)}%</span>
                         </div>
                         <h4 className="text-lg font-extrabold text-slate-900 mb-1 truncate">{cat.name}</h4>
                         <p className="text-sm font-bold text-gray-500 mb-4">{formatCurrency(cat.value, currency)}</p>
                         <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${catProgress}%` }} className={`h-full rounded-full ${i===0 ? 'bg-[#A9FF53]' : 'bg-black'}`} /></div>
                      </div>
                   )
                })}
                {categories.length === 0 && <div className="text-sm font-bold text-gray-400 p-4">No spending data yet.</div>}
             </div>
          </div>

          {/* LEDGER TABLE */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm min-h-[400px]">
             <div className="flex justify-between items-center mb-6">
                 <div><h3 className="text-lg font-bold text-slate-900">Vault History</h3><p className="text-xs font-bold text-gray-400 uppercase">{transactions.length} Transactions</p></div>
                 <button onClick={handleExportCSV} className="p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-black hover:text-[#A9FF53] transition-colors"><Download className="w-4 h-4" /></button>
             </div>
             
             <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
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

          {/* FAB for Adding Expenses (Debit) */}
          <button onClick={() => setIsSheetOpen(true)} className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white active:scale-95 transition-transform hover:bg-gray-900">
             <ArrowDownCircle className="w-6 h-6" />
          </button>

          <ExpenseSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
          
          {/* MODAL: ADD MONEY (Credit) */}
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
                             <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Source (Optional)</label>
                             <input type="text" placeholder="e.g. Salary, Gift" value={moneySource} onChange={(e) => setMoneySource(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#A9FF53]"/>
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
                      <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Monthly Limit</h3><button onClick={() => setIsBudgetOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
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
