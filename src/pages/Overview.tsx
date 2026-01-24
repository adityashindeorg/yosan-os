import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { ArrowUpRight, TrendingUp, Wallet, Shield, Activity, Plus } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';

// --- REAL DATA LOGIC ---
export default function Overview() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    balance: 0,
    monthlyLimit: 5000,
    spent: 0,
    stacks: [],
    transactions: []
  });

  // 1. LISTEN TO REAL DATABASE
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // This connects to: collections('users') -> doc(USER_ID)
    const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        setUserData(doc.data() as any);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. CALCULATE REAL NUMBERS
  const safeToSpend = userData.monthlyLimit - userData.spent;
  const percentageLeft = Math.round((safeToSpend / userData.monthlyLimit) * 100) || 0;
  
  // (Optional) Dummy data for chart if real history is missing
  const chartData = [ {v: 1200}, {v: 2100}, {v: 800}, {v: 1600}, {v: 900}, {v: 1700}, {v: userData.spent || 1240} ];

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8">
        
        {/* HEADER: Responsive Text Size */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
              <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">
                 {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
                 Hello, {auth.currentUser?.displayName?.split(' ')[0] || 'Executive'}.
              </h1>
           </div>
        </header>

        {/* TOP GRID: Stacked on Mobile (grid-cols-1), Side-by-Side on Desktop (md:grid-cols-12) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
           
           {/* MAIN CARD */}
           <div className="col-span-1 md:col-span-8 bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[300px]">
              <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#A9FF53] animate-pulse" />
                    <span className="text-[#A9FF53] text-xs font-bold uppercase tracking-widest">Safe to Spend</span>
                 </div>
                 <h2 className="text-5xl md:text-7xl font-black tracking-tighter">
                    ${safeToSpend.toLocaleString()}
                 </h2>
              </div>
              
              <div className="relative z-10 mt-8">
                 <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="text-slate-400">Monthly Cap: ${userData.monthlyLimit}</span>
                    <span>{percentageLeft}% Left</span>
                 </div>
                 <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div style={{ width: `${percentageLeft}%` }} className="h-full bg-[#A9FF53] transition-all duration-1000" />
                 </div>
              </div>
              
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#A9FF53] blur-[120px] opacity-10" />
           </div>

           {/* VELOCITY CARD */}
           <div className="col-span-1 md:col-span-4 bg-white border border-slate-200 rounded-[2rem] p-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]">
              <div className="flex justify-between items-start">
                 <div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                       <Activity className="w-3 h-3" /> Velocity
                    </div>
                    <div className="text-3xl font-black text-slate-900">
                       -${userData.spent.toLocaleString()}
                    </div>
                 </div>
              </div>
              <div className="h-32 -mx-4 mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                       <defs>
                          <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#000" stopOpacity={0.1}/><stop offset="95%" stopColor="#000" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <Tooltip cursor={false} contentStyle={{borderRadius:'12px', border:'none'}}/>
                       <Area type="monotone" dataKey="v" stroke="#000" strokeWidth={3} fill="url(#colorV)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* STACKS: Horizontal Scroll on Mobile */}
        <section>
           <h3 className="text-lg font-bold text-slate-900 mb-4 px-2">Your Stacks</h3>
           <div className="flex gap-4 overflow-x-auto pb-4 px-2 -mx-2 hide-scrollbar">
              {/* Add Stack Button */}
              <button className="min-w-[80px] h-40 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center hover:bg-slate-50 flex-shrink-0">
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><Plus className="w-6 h-6"/></div>
              </button>

              {/* Real Stacks Mapping */}
              {(userData.stacks || []).map((stack: any, i: number) => (
                 <div key={i} className="min-w-[160px] md:min-w-[200px] h-40 bg-[#F2F2F2] rounded-[2rem] p-5 flex flex-col justify-between flex-shrink-0">
                    <div className="p-2 bg-white rounded-full w-fit"><Wallet className="w-4 h-4"/></div>
                    <div>
                       <div className="text-xs font-bold uppercase opacity-60">{stack.name}</div>
                       <div className="text-xl font-black">${stack.balance}</div>
                    </div>
                 </div>
              ))}
              
              {/* Fallback if no stacks */}
              {(!userData.stacks || userData.stacks.length === 0) && (
                 <div className="min-w-[200px] h-40 bg-[#A9FF53] rounded-[2rem] p-5 flex flex-col justify-between flex-shrink-0">
                    <div className="p-2 bg-black/10 rounded-full w-fit"><Shield className="w-4 h-4"/></div>
                    <div><div className="text-xs font-bold uppercase opacity-60">Emergency</div><div className="text-xl font-black">$0</div></div>
                 </div>
              )}
           </div>
        </section>

      </div>
    </DashboardLayout>
  );
}
