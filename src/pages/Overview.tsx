import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ExpenseSheet } from '@/components/money/ExpenseSheet'; 
import { formatCurrency } from '@/lib/db';
import { 
  Plus, ArrowUpRight, MoreHorizontal, Download, Filter, 
  Settings2, ChevronDown, FileText, X, CheckCircle2, 
  Layers, Clock, Briefcase, Calendar, TrendingUp
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Overview() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);
  const [currency, setCurrency] = useState('₹');
  
  // POPUP STATES
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        // 1. Transactions (Single Source of Truth)
        onSnapshot(query(collection(db, "users", user.uid, "transactions"), orderBy("date", "desc")), s => 
          setTransactions(s.docs.map(d => ({id: d.id, ...d.data(), date: d.data().date.toDate()})))
        );
        
        // 2. Settings (Specific Document Fix)
        onSnapshot(doc(db, "users", user.uid, "settings", "general"), (doc) => {
          if (doc.exists()) {
            setBudget(Number(doc.data().totalBudget) || 0);
            setCurrency(doc.data().currencySymbol || '₹');
          }
        });

        // 3. Projects
        onSnapshot(collection(db, "users", user.uid, "projects"), s => 
           setProjects(s.docs.map(d => ({id: d.id, ...d.data()})))
        );
      }
    });
    return () => unsub();
  }, []);

  // --- DATA ENGINE ---
  const spent = transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const saved = Math.max(0, budget - spent);
  const percentageSaved = budget > 0 ? Math.min(100, Math.max(0, (saved / budget) * 100)) : 0;
  
  // Daily Activity Grid
  const dailyActivity = useMemo(() => {
    const days = Array(28).fill(0);
    const today = new Date();
    transactions.forEach(t => {
       const diffTime = Math.abs(today.getTime() - t.date.getTime());
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
       if (diffDays <= 28) days[28 - diffDays] += t.amount;
    });
    return days;
  }, [transactions]);

  // Category Ranking
  const topCategories = useMemo(() => {
     const cats: Record<string, number> = {};
     transactions.forEach(t => {
        const name = t.categoryName || 'General';
        cats[name] = (cats[name] || 0) + Number(t.amount);
     });
     return Object.entries(cats).sort(([,a], [,b]) => b - a).slice(0, 4).map(([name, val]) => ({ name, val }));
  }, [transactions]);
  
  const maxCatVal = Math.max(...topCategories.map(c => c.val), 1);

  // Project Stats
  const activeProjectCount = projects.filter(p => p.status !== 'Completed').length;
  const projectEfficiency = 84; 

  // PDF Generator
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      setTimeout(() => { setIsGenerating(false); setIsReportOpen(false); }, 1000);
    } catch (err) { setIsGenerating(false); }
  };

  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#F1F3F5] p-4 md:p-6 lg:p-8 font-sans text-slate-900 relative pb-32 lg:pb-8">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4 md:gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Financial Overview</h1>
              <div className="flex items-center gap-2 mt-1 text-gray-500 text-xs font-bold uppercase tracking-wide">
                <span>Dashboard</span> <span className="text-gray-300">/</span> <span>Live Data</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
               <button onClick={() => setIsReportOpen(true)} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm active:scale-95">
                  <span>Export</span> <Download className="w-3 h-3" />
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

             {/* EXPENSE BREAKDOWN (Dot Grid) */}
             <div className="col-span-1 lg:col-span-7 bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col justify-between min-h-[350px] md:min-h-[380px] relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10 mb-4 md:mb-0">
                   <h3 className="text-lg md:text-xl font-bold text-slate-900">Expense Breakdown</h3>
                   <div className="flex gap-2">
                      <button className="px-3 md:px-4 py-2 bg-gray-50 rounded-full text-[10px] md:text-xs font-bold text-gray-600 flex items-center gap-2 border border-transparent hover:border-gray-200 transition-all">
                         Last 28 Days <ChevronDown className="w-3 h-3" />
                      </button>
                   </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 md:gap-8 mt-2 md:mt-6 h-full relative z-10">
                   <div className="flex flex-col justify-center min-w-[150px]">
                      <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 md:mb-6 tracking-tighter truncate">
                         {formatCurrency(spent, currency).replace(currency, '')}<span className="text-2xl md:text-3xl text-gray-400 font-bold">{currency}</span>
                      </h2>
                      <div className="flex flex-row md:flex-col gap-2 md:gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
                         {topCategories.length > 0 ? topCategories.slice(0, 3).map((cat, i) => (
                           <div key={i} className="flex items-center gap-2 md:justify-between group cursor-default bg-gray-50 md:bg-transparent px-3 py-1.5 md:p-0 rounded-full md:rounded-none shrink-0">
                              <span className="text-[10px] md:text-xs font-bold text-gray-500 md:text-gray-400 uppercase max-w-[80px] md:w-24 truncate">{cat.name}</span>
                              <div className={`w-2 h-2 rounded-full transition-all ${i===0 ? 'bg-[#A9FF53]' : i===1 ? 'bg-black' : 'bg-gray-300'}`}></div>
                           </div>
                         )) : <span className="text-xs text-gray-400 font-bold">No Data</span>}
                      </div>
                   </div>

                   {/* DOT GRID */}
                   <div className="flex-1 bg-gray-50/50 rounded-2xl md:rounded-3xl p-4 md:p-6 flex items-center justify-center relative border border-gray-100/50 min-h-[150px]">
                      <div className="grid grid-cols-7 gap-x-3 md:gap-x-4 gap-y-3 md:gap-y-4">
                         {dailyActivity.map((val, i) => {
                            let color = 'bg-gray-200';
                            if (val > 0) color = 'bg-gray-400';
                            if (val > (budget/30)*0.5) color = 'bg-[#A9FF53]';
                            if (val > (budget/30)) color = 'bg-black';
                            return <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i*0.01 }} className={`w-4 h-4 md:w-6 md:h-6 rounded-full ${color}`} />
                         })}
                      </div>
                   </div>
                </div>
             </div>

             {/* PROJECT INTELLIGENCE */}
             <div className="col-span-1 lg:col-span-5 flex flex-col gap-4 md:gap-6">
                <div className="bg-black text-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden h-[160px] md:h-[190px] flex flex-col justify-center shadow-lg shadow-black/5 group">
                   <div className="absolute -right-20 top-1/2 -translate-y-1/2 h-48 md:h-64 w-48 md:w-64 bg-gradient-to-r from-[#A9FF53] to-transparent blur-[60px] md:blur-[80px] opacity-30 rounded-full group-hover:opacity-40 transition-opacity duration-500"></div>
                   <div className="relative z-10 w-3/4">
                      <h3 className="text-lg md:text-xl font-bold leading-tight mb-2">Active Projects<br/><span className="text-gray-500">Execution Status</span></h3>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#A9FF53] rounded-full text-black text-[10px] font-bold uppercase tracking-widest mt-2">
                         <Layers className="w-3 h-3" /> {activeProjectCount} Ongoing
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-6 h-[160px] md:h-[190px]">
                   <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-6 shadow-sm flex flex-col justify-between relative group hover:shadow-md transition-shadow">
                      <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center bg-gray-50"><CheckCircle2 className="w-4 h-4 text-gray-400" /></div>
                      <div>
                         <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wide">Completion Rate</p>
                         <h4 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1 truncate">{projectEfficiency.toFixed(0)}%</h4>
                      </div>
                   </div>

                   <div onClick={() => setIsReportOpen(true)} className="bg-black text-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform group">
                      <div className="flex justify-end gap-2">
                         <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-[#A9FF53] transition-colors"><FileText className="w-3 h-3 group-hover:text-black" /></div>
                      </div>
                      <div className="mt-4">
                         <div className="px-3 py-1 bg-gray-800 rounded-full text-[9px] font-bold text-gray-300 inline-block mb-2 group-hover:bg-[#A9FF53] group-hover:text-black transition-colors">Export</div>
                         <h4 className="text-base md:text-lg font-bold leading-none">Financial<br/>Report</h4>
                      </div>
                   </div>
                </div>
             </div>

             {/* CATEGORY RANKING */}
             <div className="col-span-1 lg:col-span-8 bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6 md:mb-8">
                   <h3 className="text-lg md:text-xl font-bold text-slate-900">Category Ranking</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-6 md:gap-10">
                   <div className="flex flex-col justify-center md:min-w-[160px]">
                      <div className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-bold w-fit mb-4 shadow-lg shadow-black/20">Total Budget</div>
                      <h4 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">{formatCurrency(budget, currency)}</h4>
                      <p className="text-xs text-gray-400 font-bold leading-relaxed mb-8 hidden md:block">Spending distribution<br/>by category</p>
                   </div>
                   
                   <div className="flex-1 flex items-end justify-between h-48 md:h-64 pb-2 px-2 md:px-4 relative mt-4 md:mt-10">
                      {Array.from({ length: 4 }).map((_, i) => {
                         const rankMap = [2, 1, 0, 3]; 
                         const cat = topCategories[rankMap[i]];
                         const val = cat ? cat.val : 0;
                         const h = cat ? Math.max(15, (val / maxCatVal) * 100) : 10;
                         const isHero = i === 2;

                         let bg = 'bg-gray-200';
                         if (i === 0) bg = 'bg-[#111]';
                         if (i === 1) bg = 'bg-[#0B1221]';
                         if (i === 2) bg = 'bg-gradient-to-t from-[#A9FF53] to-[#80CC00]';
                         if (i === 3) bg = 'bg-gray-300';

                         return (
                            <div key={i} className="relative flex-1 md:w-20 group flex flex-col justify-end h-full px-1">
                               {isHero && cat && (
                                 <div className="hidden md:block absolute -top-24 left-1/2 -translate-x-1/2 text-center w-40 z-10">
                                     <div className="text-3xl font-bold text-[#A9FF53] mb-1">+{(val / (budget || 1) * 100).toFixed(0)}%</div>
                                     <div className="text-[10px] font-bold text-gray-400">of budget</div>
                                     <div className="absolute top-[60%] -left-12 w-16 border-t-2 border-dashed border-gray-200"></div>
                                     <div className="absolute top-[60%] -right-12 w-16 border-t-2 border-dashed border-gray-200"></div>
                                 </div>
                               )}
                               <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} className={`w-full rounded-xl md:rounded-2xl relative overflow-hidden group-hover:scale-105 transition-transform shadow-sm ${bg} ${isHero ? 'shadow-xl shadow-[#A9FF53]/20' : ''}`}>
                                  {cat && <div className={`absolute bottom-2 md:bottom-3 left-1/2 -translate-x-1/2 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-[8px] md:text-[9px] font-bold whitespace-nowrap ${isHero ? 'bg-black text-[#A9FF53]' : 'bg-white text-black'}`}>{cat.name.slice(0, 5)}..</div>}
                               </motion.div>
                            </div>
                         );
                      })}
                   </div>
                </div>
             </div>

             {/* FINANCIAL BALANCE (Gauge) */}
             <div className="col-span-1 lg:col-span-4 bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col justify-between min-h-[250px] md:h-full">
                <div className="flex justify-between items-start">
                   <h3 className="text-lg md:text-xl font-bold text-slate-900">Financial Balance</h3>
                   <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-gray-400" /></div>
                </div>

                <div className="relative w-56 md:w-64 h-28 md:h-32 mx-auto mt-6 md:mt-10 overflow-hidden">
                   <div className="absolute inset-0 w-full h-full flex justify-center items-end pb-2">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className={`absolute w-1 bottom-0 origin-bottom rounded-full transition-colors duration-500 ${i < (percentageSaved / 100) * 30 ? 'bg-gradient-to-t from-[#A9FF53] to-[#80CC00]' : 'bg-gray-100'}`} style={{ height: '100%', transform: `rotate(${(i * 6) - 90}deg)` }}></div>
                      ))}
                      <div className="absolute bg-white w-40 md:w-48 h-40 md:h-48 rounded-full -bottom-20 md:-bottom-24 z-10"></div>
                   </div>
                   <div className="absolute inset-0 flex items-end justify-center pb-2 z-20">
                       <div className="text-center">
                          <span className="block text-3xl md:text-4xl font-extrabold text-slate-900">{percentageSaved.toFixed(0)}%</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Saved</span>
                       </div>
                   </div>
                </div>
                
                <p className="text-[10px] text-gray-400 font-bold text-center mt-4 md:mt-6">
                   You are <span className="bg-[#A9FF53]/20 text-black px-1.5 py-0.5 rounded ml-1 font-extrabold">+{(percentageSaved * 0.1).toFixed(1)}%</span> ahead.
                </p>
             </div>

          </div>

          <button onClick={() => setIsSheetOpen(true)} className="fixed bottom-24 md:bottom-8 right-6 md:right-8 w-12 h-12 md:w-14 md:h-14 bg-black text-[#A9FF53] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-40 border-4 border-white active:scale-95">
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
          
          <ExpenseSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
          
          {/* PDF PREVIEW MODAL */}
          <AnimatePresence>
            {isReportOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
                 <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} className="bg-[#F1F3F5] rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
                       <div><h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Preview Report</h2><p className="text-xs font-bold text-gray-400">PDF Generator</p></div>
                       <div className="flex items-center gap-3"><button onClick={() => setIsReportOpen(false)} className="px-4 md:px-6 py-2 rounded-full font-bold text-xs md:text-sm text-gray-500 hover:bg-gray-100">Cancel</button><button onClick={handleDownloadPDF} disabled={isGenerating} className="px-4 md:px-6 py-2 bg-black text-[#A9FF53] rounded-full font-bold text-xs md:text-sm flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50">{isGenerating ? 'Saving...' : <><Download className="w-4 h-4" /> Save PDF</>}</button></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-100">
                       <div ref={reportRef} className="bg-white p-6 md:p-12 shadow-sm mx-auto max-w-3xl min-h-[1000px] text-slate-900">
                          <div className="flex justify-between items-start mb-12 border-b border-gray-100 pb-8">
                             <div><h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">Statement</h1><p className="text-gray-400 font-medium">Sphere.OS Financial Report</p></div>
                             <div className="text-right"><p className="text-lg md:text-xl font-bold">{new Date().toLocaleDateString()}</p></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                             <div className="p-6 bg-gray-50 rounded-2xl"><p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Budget</p><p className="text-2xl font-extrabold">{formatCurrency(budget, currency)}</p></div>
                             <div className="p-6 bg-gray-50 rounded-2xl"><p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Spent</p><p className="text-2xl font-extrabold">{formatCurrency(spent, currency)}</p></div>
                             <div className="p-6 bg-black text-[#A9FF53] rounded-2xl"><p className="text-xs font-bold opacity-70 uppercase mb-2">Savings</p><p className="text-2xl font-extrabold">{formatCurrency(saved, currency)}</p></div>
                          </div>
                          <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><FileText className="w-5 h-5" /> Transactions</h3>
                          <table className="w-full text-left text-sm"><thead className="border-b-2 border-gray-100 text-gray-400 uppercase text-xs"><tr><th className="py-3 font-bold">Date</th><th className="py-3 font-bold">Category</th><th className="py-3 font-bold text-right">Amount</th></tr></thead><tbody className="divide-y divide-gray-50">{transactions.slice(0, 15).map((t, i) => (<tr key={i}><td className="py-4 font-medium text-gray-500">{t.date.toLocaleDateString()}</td><td className="py-4 font-bold">{t.categoryName}</td><td className="py-4 font-bold text-right">-{formatCurrency(t.amount, currency)}</td></tr>))}</tbody></table>
                       </div>
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
