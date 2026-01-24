import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { formatCurrency } from '@/lib/db';
import { 
  Activity, TrendingUp, TrendingDown, Zap, 
  Target, Filter, ArrowUpRight, PieChart, 
  Calendar, Download, ChevronDown, Layers,
  AlertTriangle
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

// --- COMPONENT: ACTIVITY HEATMAP (GitHub Style) ---
const ActivityHeatmap = ({ data }: { data: { date: string, count: number }[] }) => {
  // Generate last 28 days
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const dateStr = d.toDateString();
    const match = data.find(item => item.date === dateStr);
    return { date: d, value: match ? match.count : 0 };
  });

  const maxVal = Math.max(...days.map(d => d.value), 1);

  return (
    <div className="flex justify-between gap-1 h-full items-end">
      {days.map((day, i) => {
        const intensity = day.value / maxVal;
        let color = 'bg-gray-100';
        if (intensity > 0) color = 'bg-[#A9FF53]/40';
        if (intensity > 0.4) color = 'bg-[#A9FF53]';
        if (intensity > 0.8) color = 'bg-black';

        return (
          <div key={i} className="flex flex-col gap-1 items-center group relative h-full justify-end w-full">
             {/* Tooltip */}
             <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                {day.date.getDate()}/{day.date.getMonth()+1} • {day.value > 0 ? 'Active' : 'No Spend'}
             </div>
             {/* The Bar */}
             <motion.div 
               initial={{ height: '10%' }} animate={{ height: `${Math.max(15, intensity * 100)}%` }}
               transition={{ delay: i * 0.02 }}
               className={`w-full rounded-md ${color} transition-colors duration-300`}
             />
          </div>
        )
      })}
    </div>
  );
};

// --- COMPONENT: SMOOTH AREA CHART ---
const AreaChart = ({ data }: { data: number[] }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / (max - min || 1)) * 80; // keep some padding
    return `${x},${y}`;
  });

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A9FF53" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#A9FF53" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,100 L${points.join(' L')} L100,100 Z`} fill="url(#glow)" />
      <path d={`M${points.join(' L')}`} fill="none" stroke="#A9FF53" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

export default function Analytics() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currency, setCurrency] = useState('₹');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        onSnapshot(query(collection(db, "users", user.uid, "transactions"), orderBy("date", "asc")), s => {
          setTransactions(s.docs.map(d => ({
             id: d.id, ...d.data(), 
             date: d.data().date.toDate(),
             amount: Number(d.data().amount)
          })));
        });
        onSnapshot(collection(db, "users", user.uid, "settings"), s => {
          s.docs.forEach(d => { if(d.data().currencySymbol) setCurrency(d.data().currencySymbol); });
        });
      }
    });
    return () => unsub();
  }, []);

  // --- ENGINE ---
  const filteredData = useMemo(() => {
     const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
     const cutoff = new Date();
     cutoff.setDate(cutoff.getDate() - days);
     return transactions.filter(t => t.date >= cutoff);
  }, [transactions, timeRange]);

  const dailyTotals = useMemo(() => {
     const groups: Record<string, number> = {};
     // Fill empty days
     const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
     for(let i=0; i<days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        groups[d.toDateString()] = 0;
     }
     filteredData.forEach(t => groups[t.date.toDateString()] += t.amount);
     return Object.entries(groups).map(([date, amount]) => ({ date, amount }));
  }, [filteredData, timeRange]);

  const totalSpend = filteredData.reduce((acc, t) => acc + t.amount, 0);
  const avgDaily = totalSpend / (dailyTotals.length || 1);
  const highestDay = Math.max(...dailyTotals.map(d => d.amount), 0);

  const categories = useMemo(() => {
     const cats: Record<string, number> = {};
     filteredData.forEach(t => cats[t.categoryName || 'Other'] = (cats[t.categoryName || 'Other'] || 0) + t.amount);
     return Object.entries(cats).sort(([,a], [,b]) => b - a).map(([name, value]) => ({ name, value, percent: (value/totalSpend)*100 }));
  }, [filteredData, totalSpend]);

  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#F1F3F5] p-6 lg:p-8 font-sans text-slate-900">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                 Analytics <span className="text-gray-300">/</span> <span className="text-gray-400 font-medium text-lg">Insight Engine</span>
              </h1>
            </div>
            <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
               {['7d', '30d', '90d'].map((r) => (
                  <button key={r} onClick={() => setTimeRange(r as any)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${timeRange === r ? 'bg-black text-[#A9FF53] shadow-md' : 'text-gray-400 hover:text-black'}`}>
                     {r}
                  </button>
               ))}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">

             {/* === ROW 1: THE COMMAND CENTER === */}
             
             {/* 1. TOTAL SPEND (Hero Black Card) */}
             <div className="col-span-12 lg:col-span-8 bg-black text-white rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl shadow-black/20 group h-[400px] flex flex-col justify-between border border-white/5">
                {/* Background Noise & Glow */}
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
                <div className="absolute -right-20 -bottom-40 w-[600px] h-[600px] bg-gradient-to-t from-[#A9FF53] to-transparent opacity-10 blur-[100px] rounded-full pointer-events-none group-hover:opacity-20 transition-opacity duration-1000"></div>
                
                {/* Metric Header */}
                <div className="relative z-10 flex justify-between items-start">
                   <div>
                      <div className="flex items-center gap-2 mb-3">
                         <div className="w-2 h-2 bg-[#A9FF53] rounded-full animate-ping"></div>
                         <span className="text-[#A9FF53] text-[10px] font-black uppercase tracking-[0.2em]">Live Outflow</span>
                      </div>
                      <h2 className="text-7xl font-black tracking-tighter text-white mb-2">
                         {formatCurrency(totalSpend, currency).replace(currency, '')}<span className="text-4xl text-white/30">{currency}</span>
                      </h2>
                      <p className="text-gray-500 font-bold text-sm flex items-center gap-2">
                         <TrendingUp className="w-4 h-4 text-[#A9FF53]" /> 
                         <span className="text-white">+12%</span> vs last period
                      </p>
                   </div>
                   
                   {/* Mini Stat */}
                   <div className="text-right">
                      <p className="text-gray-500 text-[10px] font-black uppercase mb-1">Peak Day</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(highestDay, currency)}</p>
                   </div>
                </div>

                {/* Area Chart */}
                <div className="relative z-10 h-40 w-full mt-auto translate-y-4">
                   <AreaChart data={dailyTotals.map(d => d.amount)} />
                </div>
             </div>

             {/* 2. SIDE STATS (Vertical Stack) */}
             <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                
                {/* Heatmap Card */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm flex-1 flex flex-col justify-between border border-gray-100 relative overflow-hidden">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <h3 className="text-lg font-black text-slate-900 uppercase">Velocity</h3>
                         <p className="text-xs font-bold text-gray-400">Activity Intensity</p>
                      </div>
                      <Activity className="w-5 h-5 text-gray-300" />
                   </div>
                   
                   <div className="h-32 w-full mt-auto">
                      <ActivityHeatmap data={dailyTotals.map(d => ({ date: d.date, count: d.amount }))} />
                   </div>
                </div>

                {/* Insight Card */}
                <div className="bg-[#A9FF53] rounded-[2.5rem] p-8 shadow-xl shadow-[#A9FF53]/20 h-[180px] relative overflow-hidden group">
                   <div className="absolute -right-5 -bottom-5 w-32 h-32 bg-white blur-[50px] opacity-40 rounded-full"></div>
                   <div className="relative z-10 h-full flex flex-col justify-between">
                      <div className="flex items-center gap-2 text-black/60 font-black text-[10px] uppercase tracking-wider">
                         <Target className="w-3 h-3" /> System Advice
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-black leading-tight mb-2">
                            Spending is <br/>Normalized
                         </h3>
                         <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-black rounded-full"></span>
                            <span className="text-xs font-bold text-black">Within budget limits</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* === ROW 2: DEEP DIVE === */}
             
             {/* 3. CATEGORY RADAR (Custom List Visualization) */}
             <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-sm min-h-[350px]">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-gray-300" /> Category Breakdown
                   </h3>
                   <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-black hover:text-[#A9FF53] transition-colors"><Filter className="w-3 h-3" /></button>
                </div>

                <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                   {categories.slice(0, 6).map((cat, i) => (
                      <div key={i} className="group">
                         <div className="flex justify-between items-end mb-3">
                            <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${i===0 ? 'bg-black text-[#A9FF53]' : 'bg-gray-50 text-slate-900'}`}>
                                  {cat.name[0]}
                               </div>
                               <div>
                                  <h4 className="font-bold text-slate-900 text-sm">{cat.name}</h4>
                                  <p className="text-[10px] font-bold text-gray-400">{cat.percent.toFixed(1)}% Share</p>
                               </div>
                            </div>
                            <span className="text-sm font-black text-slate-900">{formatCurrency(cat.value, currency)}</span>
                         </div>
                         
                         {/* Custom Progress Bar */}
                         <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                            <motion.div 
                               initial={{ width: 0 }} whileInView={{ width: `${cat.percent}%` }} transition={{ duration: 1, delay: i*0.1 }}
                               className={`h-full rounded-full ${i===0 ? 'bg-[#A9FF53]' : 'bg-black'}`}
                            />
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* 4. ALERTS / NOTIFICATIONS */}
             <div className="col-span-12 lg:col-span-4 bg-[#111] text-gray-400 rounded-[2.5rem] p-8 shadow-lg flex flex-col font-mono text-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#A9FF53] to-transparent"></div>
                
                <h3 className="text-[#A9FF53] font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                   <AlertTriangle className="w-4 h-4" /> Risks Detected
                </h3>

                <div className="space-y-4 relative z-10 h-full overflow-y-auto pr-2">
                   {categories[0]?.percent > 40 && (
                      <div className="p-4 bg-white/5 rounded-xl border-l-2 border-red-500">
                         <p className="text-white font-bold mb-1">Over-concentration</p>
                         <p className="opacity-70"><span className="text-white">{categories[0].name}</span> is consuming {categories[0].percent.toFixed(0)}% of your resources.</p>
                      </div>
                   )}
                   
                   {avgDaily > (totalSpend/30)*1.5 && (
                      <div className="p-4 bg-white/5 rounded-xl border-l-2 border-yellow-500">
                         <p className="text-white font-bold mb-1">High Burn Velocity</p>
                         <p className="opacity-70">Daily spend is trending higher than monthly average.</p>
                      </div>
                   )}

                   <div className="p-4 bg-white/5 rounded-xl border-l-2 border-[#A9FF53]">
                      <p className="text-white font-bold mb-1">System Normal</p>
                      <p className="opacity-70">All other metrics within nominal ranges.</p>
                   </div>
                </div>
             </div>

          </div>
        </div>
      </PageTransition>
    </MainLayout>
  );
}