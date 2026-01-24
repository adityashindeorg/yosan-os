import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ExpenseSheet } from '@/components/money/ExpenseSheet'; 
import { formatCurrency } from '@/lib/db';
import { 
  Plus, Wallet, Search, Filter, Download, Settings2, 
  CreditCard, PieChart, Trash2, X, ArrowUpRight,
  ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { 
  collection, query, onSnapshot, orderBy, doc, setDoc, deleteDoc, Timestamp 
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export default function Money() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);
  const [currency, setCurrency] = useState('₹');
  
  // UI States
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newBudget, setNewBudget] = useState('');

  // Carousel Refs & State
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // --- 1. DATA ENGINE ---
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

  // --- 2. EFFECTS ---
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        // Fetch Transactions with SAFE MAPPING
        onSnapshot(query(collection(db, "users", user.uid, "transactions"), orderBy("date", "desc")), (s) => {
          const safeData = s.docs.map(d => {
            const data = d.data();
            // SAFETY CHECK: Ensure date exists and convert Timestamp to JS Date
            let dateObj = new Date();
            if (data.date && data.date instanceof Timestamp) {
              dateObj = data.date.toDate();
            } else if (data.date) {
              dateObj = new Date(data.date); // Fallback for string dates
            }
            
            return {
              id: d.id,
              ...data,
              amount: Number(data.amount) || 0, // Ensure amount is number
              date: dateObj
            };
          });
          setTransactions(safeData);
        });

        // Fetch Settings
        onSnapshot(collection(db, "users", user.uid, "settings"), s => {
          s.docs.forEach(d => {
            if(d.data().totalBudget) {
                setBudget(Number(d.data().totalBudget));
                setNewBudget(String(d.data().totalBudget));
            }
            if(d.data().currencySymbol) setCurrency(d.data().currencySymbol);
          });
        });
      }
    });
    return () => unsub();
  }, []);

  // Carousel Auto-Play
  useEffect(() => {
    if (isPaused || !carouselRef.current) return;
    const interval = setInterval(() => {
        if (carouselRef.current) {
            const { current } = carouselRef;
            const maxScroll = current.scrollWidth - current.clientWidth;
            if (current.scrollLeft >= maxScroll - 10) {
                 current.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                 current.scrollBy({ left: 300, behavior: 'smooth' });
            }
        }
    }, 3000); 
    return () => clearInterval(interval);
  }, [isPaused, categories]);

  // --- 3. ACTIONS ---
  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
        const scrollAmount = 300;
        carouselRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    }
  };

  const handleUpdateBudget = async () => {
    if (!auth.currentUser || !newBudget) return;
    try {
      const settingsRef = doc(db, "users", auth.currentUser.uid, "settings", "general");
      await setDoc(settingsRef, { totalBudget: Number(newBudget) }, { merge: true });
      setIsBudgetOpen(false);
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (id: string) => {
    if(!auth.currentUser) return;
    if(window.confirm("Delete transaction?")) {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "transactions", id));
    }
  };

  const handleExportCSV = () => {
    const csv = "data:text/csv;charset=utf-8," + [["Date","Category","Note","Amount"], ...filteredTransactions.map(t => [t.date.toLocaleDateString(), t.categoryName, t.note||'', t.amount])].map(e => e.join(",")).join("\n");
    const link = document.createElement("a"); link.href = encodeURI(csv); link.download = `Transactions.csv`; link.click();
  };

  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#F1F3F5] p-6 lg:p-8 font-sans text-slate-900 relative">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Money Vault</h1>
              <div className="flex items-center gap-2 mt-1 text-gray-500 text-xs font-bold uppercase tracking-wide">
                <span>Finances</span> <span className="text-gray-300">/</span> <span>Budgeting</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                  <input 
                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search logs..." 
                    className="pl-10 pr-4 py-2.5 bg-white rounded-full border border-gray-200 text-xs font-bold text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 w-48 transition-all"
                  />
               </div>
               <button onClick={() => setIsBudgetOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-black text-[#A9FF53] rounded-full text-xs font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/20">
                  <Settings2 className="w-3 h-3" /> Config Budget
               </button>
            </div>
          </div>

          {/* VAULT HERO */}
          <div className="grid grid-cols-12 gap-6 mb-8">
             <div className="col-span-12 lg:col-span-8 bg-black text-white rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl shadow-black/20 group h-[320px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-b from-[#A9FF53] to-transparent opacity-10 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 group-hover:opacity-20 transition-opacity duration-700"></div>
                <div className="relative z-10 flex justify-between items-start">
                   <div>
                      <div className="flex items-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${remaining < 0 ? 'bg-red-500' : 'bg-[#A9FF53]'} animate-pulse`}></div>
                          <span className="text-[#A9FF53] text-[10px] font-bold uppercase tracking-widest">Live Liquidity</span>
                      </div>
                      <h2 className="text-6xl font-extrabold tracking-tighter">{formatCurrency(remaining, currency)}</h2>
                   </div>
                   <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5">
                       <Wallet className="w-6 h-6 text-[#A9FF53]" />
                   </div>
                </div>
                <div className="relative z-10">
                   <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-3"><span>Utilization</span><span>{progress.toFixed(1)}%</span></div>
                   <div className="h-4 w-full bg-gray-800 rounded-full overflow-hidden border border-white/5"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className={`h-full rounded-full ${progress > 90 ? 'bg-red-500' : 'bg-[#A9FF53]'}`} /></div>
                   <div className="flex gap-8 mt-6">
                       <div><p className="text-[10px] text-gray-500 font-bold uppercase">Total Budget</p><p className="text-xl font-bold">{formatCurrency(budget, currency)}</p></div>
                       <div><p className="text-[10px] text-gray-500 font-bold uppercase">Total Spent</p><p className="text-xl font-bold text-white">{formatCurrency(totalSpent, currency)}</p></div>
                   </div>
                </div>
             </div>
             <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-[320px]">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm flex-1 flex flex-col justify-between relative group hover:shadow-md transition-all">
                   <div className="flex justify-between items-start">
                       <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center"><CreditCard className="w-5 h-5 text-gray-400" /></div>
                       <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase">Safe</div>
                   </div>
                   <div><h3 className="text-3xl font-extrabold text-slate-900 mb-1">{categories.length}</h3><p className="text-xs font-bold text-gray-400 uppercase">Active Categories</p></div>
                   <div className="h-16 w-full flex items-end gap-1">
                       {[40, 70, 30, 85, 50, 60, 90].map((h, i) => (<div key={i} className="flex-1 bg-gray-100 rounded-t-sm relative overflow-hidden group-hover:bg-gray-200 transition-colors"><motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i*0.1 }} className="absolute bottom-0 w-full bg-black" /></div>))}
                   </div>
                </div>
                <div onClick={() => setIsBudgetOpen(true)} className="bg-[#A9FF53] rounded-[2.5rem] p-6 shadow-sm h-[100px] flex items-center justify-between cursor-pointer hover:bg-[#96e600] transition-colors relative overflow-hidden group">
                   <div className="relative z-10"><h3 className="text-lg font-black text-black uppercase italic">Set Budget</h3><p className="text-[10px] font-bold text-black/60 uppercase">Adjust Monthly Limit</p></div>
                   <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform"><Settings2 className="w-6 h-6 text-[#A9FF53]" /></div>
                   <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/20 blur-2xl rounded-full"></div>
                </div>
             </div>
          </div>

          {/* CAROUSEL */}
          <div className="mb-12 relative group" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
             <div className="flex justify-between items-end mb-6 px-2">
                 <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><PieChart className="w-5 h-5 text-gray-400" /> Vault Partitions</h3>
             </div>
             
             {/* Navigation Buttons */}
             <button onClick={() => scroll('left')} className="absolute left-0 top-[60%] -translate-y-1/2 z-20 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 disabled:opacity-0"><ChevronLeft className="w-5 h-5 text-slate-900" /></button>
             <button onClick={() => scroll('right')} className="absolute right-0 top-[60%] -translate-y-1/2 z-20 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 disabled:opacity-0"><ChevronRight className="w-5 h-5 text-slate-900" /></button>
             
             <div ref={carouselRef} className="flex gap-6 overflow-x-auto scroll-smooth py-4 px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {categories.map((cat, i) => {
                   const catProgress = (cat.value / totalSpent) * 100 || 0;
                   const isTop = i === 0;
                   return (
                      <div key={i} className="min-w-[280px] bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 transition-all duration-300 hover:border-[#A9FF53] hover:shadow-[0_8px_30px_rgba(169,255,83,0.2)] group/card cursor-pointer relative top-0 hover:-top-1">
                         <div className="flex justify-between items-start mb-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-colors ${isTop ? 'bg-black text-[#A9FF53]' : 'bg-gray-50 text-slate-900 group-hover/card:bg-black group-hover/card:text-[#A9FF53]'}`}>{cat.name[0]}</div>
                             <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full group-hover/card:bg-[#A9FF53]/10 group-hover/card:text-black transition-colors">{catProgress.toFixed(0)}% Share</span>
                         </div>
                         <h4 className="text-xl font-extrabold text-slate-900 mb-1 truncate">{cat.name}</h4><p className="text-sm font-bold text-gray-500 mb-6">{formatCurrency(cat.value, currency)}</p>
                         <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${catProgress}%` }} className={`h-full rounded-full transition-colors ${isTop ? 'bg-[#A9FF53]' : 'bg-black group-hover/card:bg-[#A9FF53]'}`} /></div>
                      </div>
                   )
                })}
                <div onClick={() => setIsSheetOpen(true)} className="min-w-[280px] bg-gray-50/50 border-2 border-dashed border-gray-300 p-6 rounded-[2rem] flex flex-col items-center justify-center text-gray-400 hover:border-[#A9FF53] hover:text-black hover:bg-[#A9FF53]/5 transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-3 group-hover:bg-[#A9FF53] transition-colors"><Plus className="w-6 h-6 group-hover:text-black" /></div>
                    <span className="text-sm font-bold uppercase tracking-wider">New Partition</span>
                </div>
             </div>
          </div>

          {/* LEDGER (Fixed) */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm min-h-[500px]">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                 <div><h3 className="text-xl font-bold text-slate-900">Transaction Ledger</h3><p className="text-xs font-bold text-gray-400 mt-1 uppercase">Full History • {transactions.length} Records</p></div>
                 <div className="flex gap-2"><button onClick={handleExportCSV} className="px-4 py-2 border border-gray-200 rounded-full text-xs font-bold text-gray-600 flex items-center gap-2 hover:bg-gray-50 transition-colors"><Download className="w-3 h-3" /> Export CSV</button></div>
             </div>
             
             {/* SAFE TABLE RENDERING */}
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead><tr className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100"><th className="py-4 pl-4">Transaction</th><th className="py-4">Category</th><th className="py-4">Date</th><th className="py-4">Status</th><th className="py-4 text-right">Amount</th><th className="py-4 text-right pr-4">Action</th></tr></thead>
                   <tbody className="text-sm">
                      {filteredTransactions.map((t, i) => (
                         <tr key={i} className="group hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                            <td className="py-4 pl-4"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i%2===0 ? 'bg-black text-[#A9FF53]' : 'bg-[#A9FF53] text-black'}`}>{t.categoryName ? t.categoryName[0] : 'T'}</div><span className="font-bold text-slate-900">{t.note || 'Expense'}</span></div></td>
                            <td className="py-4 font-medium text-gray-500">{t.categoryName}</td>
                            <td className="py-4 font-medium text-gray-400">
                                {t.date instanceof Date && !isNaN(t.date.getTime()) ? t.date.toLocaleDateString() : 'Unknown Date'}
                            </td>
                            <td className="py-4"><span className="px-2 py-1 rounded-md bg-green-50 text-green-600 text-[10px] font-bold uppercase">Posted</span></td>
                            <td className="py-4 text-right font-bold text-slate-900">-{formatCurrency(t.amount, currency)}</td>
                            <td className="py-4 text-right pr-4"><button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full text-gray-300 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                     <AlertCircle className="w-10 h-10 mb-2 opacity-20" />
                     <p className="text-sm font-bold">No transactions found</p>
                     <p className="text-xs mt-1">Add one to start tracking</p>
                  </div>
                )}
             </div>
          </div>

          <button onClick={() => setIsSheetOpen(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-black text-[#A9FF53] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 border-4 border-white"><Plus className="w-8 h-8 stroke-[3]" /></button>

          <ExpenseSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
          
          <AnimatePresence>
             {isBudgetOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setIsBudgetOpen(false)}>
                   <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Config Budget</h3><button onClick={() => setIsBudgetOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
                      <div className="space-y-4"><div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Monthly Limit</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">{currency}</span><input type="number" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} placeholder={String(budget)} className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-black"/></div></div><button onClick={handleUpdateBudget} className="w-full py-3 bg-black text-[#A9FF53] rounded-xl font-bold text-sm hover:bg-gray-900 transition-colors">Update Limit</button></div>
                   </motion.div>
                </motion.div>
             )}
          </AnimatePresence>
        </div>
      </PageTransition>
    </MainLayout>
  );
}