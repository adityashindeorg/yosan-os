import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ExpenseSheet } from '@/components/money/ExpenseSheet'; 
import { formatCurrency } from '@/lib/db';
import { 
  Plus, Wallet, Search, Settings2, CreditCard, PieChart, 
  Trash2, X, ChevronLeft, ChevronRight, AlertCircle, Download
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export default function Money() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);
  const [currency, setCurrency] = useState('₹');
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newBudget, setNewBudget] = useState('');

  const carouselRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // DATA CALCULATIONS
  const totalSpent = transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const remaining = Math.max(0, budget - totalSpent);
  const progress = budget > 0 ? (totalSpent / budget) * 100 : 0;

  const categories = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.forEach(t => {
       const name = t.categoryName || 'Uncategorized';
       cats[name] = (cats[name] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(cats).sort(([,a], [,b]) => b - a).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const filteredTransactions = transactions.filter(t => 
    (t.categoryName && t.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase()))
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

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) carouselRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
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

  const handleExportCSV = () => {
    const csv = "data:text/csv;charset=utf-8," + [["Date","Category","Note","Amount"], ...filteredTransactions.map(t => [t.date.toLocaleDateString(), t.categoryName, t.note||'', t.amount])].map(e => e.join(",")).join("\n");
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
                <span>Finances</span> <span className="text-gray-300">/</span> <span>Budgeting</span>
              </div>
            </div>
            
            <div className="flex flex-col w-full md:w-auto gap-3">
               <div className="relative group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                  {/* FIX: text-base prevents iOS zoom */}
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search logs..." className="w-full pl-10 pr-4 py-3 bg-white rounded-full border border-gray-200 text-base md:text-sm font-bold text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"/>
               </div>
               <button onClick={() => setIsBudgetOpen(true)} className="flex items-center justify-center gap-2 px-5 py-3 bg-black text-[#A9FF53] rounded-full text-xs font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/20 w-full">
                  <Settings2 className="w-3 h-3" /> Config Budget
               </button>
            </div>
          </div>

          {/* VAULT HERO GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-8">
             
             {/* MAIN CARD */}
             <div className="col-span-1 lg:col-span-8 bg-black text-white rounded-[2rem] p-6 md:p-10 relative overflow-hidden shadow-xl shadow-black/10 flex flex-col justify-between min-h-[300px]">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-b from-[#A9FF53] to-transparent opacity-10 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                   <div>
                      <div className="flex items-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${remaining < 0 ? 'bg-red-500' : 'bg-[#A9FF53]'} animate-pulse`}></div>
                          <span className="text-[#A9FF53] text-[10px] font-bold uppercase tracking-widest">Live Liquidity</span>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter">{formatCurrency(remaining, currency)}</h2>
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5"><Wallet className="w-6 h-6 text-[#A9FF53]" /></div>
                </div>
                
                <div className="relative z-10 mt-8">
                   <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-3"><span>Utilization</span><span>{progress.toFixed(1)}%</span></div>
                   <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden border border-white/5"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} className={`h-full rounded-full ${progress > 90 ? 'bg-red-500' : 'bg-[#A9FF53]'}`} /></div>
                   
                   <div className="flex justify-between md:justify-start md:gap-12 mt-6">
                       <div><p className="text-[10px] text-gray-500 font-bold uppercase">Total Budget</p><p className="text-lg font-bold">{formatCurrency(budget, currency)}</p></div>
                       <div className="text-right md:text-left"><p className="text-[10px] text-gray-500 font-bold uppercase">Total Spent</p><p className="text-lg font-bold text-white">{formatCurrency(totalSpent, currency)}</p></div>
                   </div>
                </div>
             </div>

             {/* SIDE STATS */}
             <div className="col-span-1 lg:col-span-4 flex flex-col gap-4">
                
                {/* Active Categories Card */}
                <div className="bg-white rounded-[2rem] p-6 shadow-sm flex-1 flex flex-col justify-between relative overflow-hidden min-h-[180px]">
                   <div className="flex justify-between items-start relative z-10">
                       <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center"><CreditCard className="w-5 h-5 text-gray-400" /></div>
                       <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase">Safe</div>
                   </div>
                   <div className="relative z-10 mt-4">
                       <h3 className="text-3xl font-extrabold text-slate-900 mb-1">{categories.length}</h3>
                       <p className="text-xs font-bold text-gray-400 uppercase">Active Categories</p>
                   </div>
                   {/* Decorative Bars */}
                   <div className="absolute bottom-0 left-0 right-0 h-12 flex items-end gap-1 px-6 opacity-50">
                       {[40, 70, 30, 85, 50, 60, 90].map((h, i) => (<div key={i} className="flex-1 bg-gray-100 rounded-t-sm" style={{height: `${h}%`}}></div>))}
                   </div>
                </div>

                {/* Quick Budget Button */}
                <div onClick={() => setIsBudgetOpen(true)} className="bg-[#A9FF53] rounded-[2rem] p-6 shadow-sm h-[100px] flex items-center justify-between cursor-pointer active:scale-95 transition-transform relative overflow-hidden">
                   <div className="relative z-10"><h3 className="text-base font-black text-black uppercase italic">Set Budget</h3><p className="text-[10px] font-bold text-black/60 uppercase">Adjust Limit</p></div>
                   <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center relative z-10"><Settings2 className="w-5 h-5 text-[#A9FF53]" /></div>
                </div>
             </div>
          </div>

          {/* CAROUSEL (Touch Enabled) */}
          <div className="mb-12 relative" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
             <div className="flex justify-between items-end mb-4 px-1">
                 <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><PieChart className="w-5 h-5 text-gray-400" /> Vault Partitions</h3>
             </div>
             
             {/* Scroll Container */}
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
                {categories.length === 0 && <div className="text-sm font-bold text-gray-400 p-4">No categories yet. Add a transaction!</div>}
             </div>
          </div>

          {/* LEDGER TABLE (Horizontal Scroll) */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm min-h-[400px]">
             <div className="flex justify-between items-center mb-6">
                 <div><h3 className="text-lg font-bold text-slate-900">History</h3><p className="text-xs font-bold text-gray-400 uppercase">{transactions.length} Records</p></div>
                 <button onClick={handleExportCSV} className="p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-black hover:text-[#A9FF53] transition-colors"><Download className="w-4 h-4" /></button>
             </div>
             
             <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                <table className="w-full text-left border-collapse min-w-[600px]">
                   <thead><tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100"><th className="py-4 pl-2">Note</th><th className="py-4">Category</th><th className="py-4">Date</th><th className="py-4 text-right">Amount</th><th className="py-4 text-right pr-2">Action</th></tr></thead>
                   <tbody className="text-sm">
                      {filteredTransactions.map((t, i) => (
                         <tr key={i} className="border-b border-gray-50 last:border-0">
                            <td className="py-4 pl-2 font-bold text-slate-900 max-w-[150px] truncate">{t.note || 'Expense'}</td>
                            <td className="py-4 font-medium text-gray-500">{t.categoryName}</td>
                            <td className="py-4 font-medium text-gray-400 text-xs">{t.date instanceof Date && !isNaN(t.date.getTime()) ? t.date.toLocaleDateString() : '-'}</td>
                            <td className="py-4 text-right font-bold text-slate-900">-{formatCurrency(t.amount, currency)}</td>
                            <td className="py-4 text-right pr-2"><button onClick={() => handleDelete(t.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* FAB for Mobile */}
          <button onClick={() => setIsSheetOpen(true)} className="fixed bottom-24 right-6 w-14 h-14 bg-black text-[#A9FF53] rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white active:scale-95 transition-transform">
             <Plus className="w-6 h-6 stroke-[3]" />
          </button>

          <ExpenseSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
          
          {/* BUDGET MODAL */}
          <AnimatePresence>
             {isBudgetOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setIsBudgetOpen(false)}>
                   <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Config Budget</h3><button onClick={() => setIsBudgetOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                      <div className="space-y-4">
                         <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Monthly Limit</label>
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
