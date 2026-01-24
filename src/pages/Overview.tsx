import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpRight, ArrowDownRight, Zap, TrendingUp, 
  CreditCard, MoreHorizontal, Wallet, Shield, Activity 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';

// --- MOCK DATA (Replace with Firebase later) ---
const CHART_DATA = [
  { day: 'Mon', value: 1200 },
  { day: 'Tue', value: 2100 },
  { day: 'Wed', value: 800 },
  { day: 'Thu', value: 1600 },
  { day: 'Fri', value: 900 },
  { day: 'Sat', value: 1700 },
  { day: 'Sun', value: 1240 },
];

const TRANSACTIONS = [
  { id: 1, title: 'Apple Store', cat: 'Tech', amount: -1299.00, date: 'Today, 2:45 PM', icon: '' },
  { id: 2, title: 'Freelance Payout', cat: 'Income', amount: +4500.00, date: 'Today, 9:00 AM', icon: '⚡️' },
  { id: 3, title: 'Uber Premier', cat: 'Transport', amount: -45.50, date: 'Yesterday', icon: '🚗' },
  { id: 4, title: 'Starbucks Reserve', cat: 'Lifestyle', amount: -12.40, date: 'Yesterday', icon: '☕️' },
];

const STACKS = [
  { name: 'Main Vault', balance: 12450, color: 'bg-slate-900 text-white', icon: Wallet },
  { name: 'Tax Reserve', balance: 3200, color: 'bg-[#F2F2F2] text-slate-900', icon: Shield },
  { name: 'Japan Trip', balance: 850, color: 'bg-[#A9FF53] text-black', icon: PlaneIcon },
];

// --- COMPONENTS ---

// 1. The "Safe-to-Spend" Hero Card
const SafeSpendCard = () => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="col-span-1 md:col-span-8 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group min-h-[320px] flex flex-col justify-between"
  >
    {/* Background Effects */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-[#A9FF53] blur-[150px] opacity-10 group-hover:opacity-20 transition-opacity" />
    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/50 to-transparent" />

    {/* Header */}
    <div className="relative z-10 flex justify-between items-start">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#A9FF53] animate-pulse" />
          <span className="text-[#A9FF53] text-xs font-bold uppercase tracking-widest">Safe to Spend</span>
        </div>
        <h2 className="text-5xl md:text-7xl font-black tracking-tighter">$1,240<span className="text-slate-500 text-2xl md:text-4xl">.00</span></h2>
      </div>
      <button className="p-3 bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors">
        <MoreHorizontal className="w-6 h-6 text-white" />
      </button>
    </div>

    {/* Footer Info */}
    <div className="relative z-10 grid grid-cols-2 gap-8 mt-8">
      <div>
        <div className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-1">Daily Cap</div>
        <div className="text-xl font-bold flex items-center gap-2">
          $150.00 <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-slate-300">82% Left</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: '18%' }} transition={{ delay: 0.5, duration: 1 }} className="h-full bg-[#A9FF53]" />
        </div>
      </div>
      <div>
         <div className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-1">Days Remaining</div>
         <div className="text-xl font-bold">12 Days</div>
      </div>
    </div>
  </motion.div>
);

// 2. Velocity Chart Card
const VelocityCard = () => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 }}
    className="col-span-1 md:col-span-4 bg-white border border-slate-200 rounded-[2.5rem] p-6 relative overflow-hidden flex flex-col justify-between min-h-[300px]"
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
          <Activity className="w-3 h-3" /> Velocity
        </div>
        <div className="text-3xl font-black text-slate-900">-$420<span className="text-lg text-slate-400">/day</span></div>
      </div>
      <div className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> 12%
      </div>
    </div>

    <div className="h-40 -mx-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={CHART_DATA}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1E293B" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#1E293B" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }} />
          <Area type="monotone" dataKey="value" stroke="#1E293B" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    
    <p className="text-xs text-slate-400 mt-2 font-medium">You are burning cash 12% faster than last month.</p>
  </motion.div>
);

// 3. Stack Cards (Horizontal Scroll on Mobile)
const StacksRow = () => (
  <div className="w-full overflow-x-auto pb-4 hide-scrollbar">
    <div className="flex gap-4 min-w-full md:min-w-0">
      {STACKS.map((stack, i) => (
        <motion.div 
          key={stack.name}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + (i * 0.1) }}
          className={`
            min-w-[160px] md:flex-1 rounded-[2rem] p-5 flex flex-col justify-between h-40 relative group cursor-pointer transition-transform hover:-translate-y-1
            ${stack.color}
          `}
        >
          <div className="flex justify-between items-start">
             <div className="p-2 bg-white/20 backdrop-blur-sm rounded-full w-fit">
                <stack.icon className="w-4 h-4" />
             </div>
             <ArrowUpRight className="w-4 h-4 opacity-50" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">{stack.name}</div>
            <div className="text-2xl font-black tracking-tight">${stack.balance.toLocaleString()}</div>
          </div>
        </motion.div>
      ))}
      
      {/* Add New Stack Button */}
      <motion.button 
         initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
         className="min-w-[80px] rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <span className="text-xl font-bold">+</span>
        </div>
      </motion.button>
    </div>
  </div>
);

// 4. Transaction List
const RecentActivity = () => (
  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 md:p-8">
    <div className="flex justify-between items-center mb-8">
      <h3 className="text-xl font-black text-slate-900">Recent Activity</h3>
      <button className="text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wide">View All</button>
    </div>
    
    <div className="space-y-6">
      {TRANSACTIONS.map((tx, i) => (
        <motion.div 
          key={tx.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + (i * 0.05) }}
          className="flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
              {tx.icon}
            </div>
            <div>
              <div className="font-bold text-slate-900">{tx.title}</div>
              <div className="text-xs text-slate-500 font-medium">{tx.date} • {tx.cat}</div>
            </div>
          </div>
          <div className={`text-right ${tx.amount > 0 ? 'text-green-600' : 'text-slate-900'}`}>
            <div className="font-black">
              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
            {tx.amount < 0 && <div className="text-[10px] text-slate-400 font-bold bg-slate-100 inline-block px-1.5 rounded">Needs</div>}
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// --- MAIN PAGE COMPONENT ---

function PlaneIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M13 2a9 9 0 0 0 0 20"/><path d="M11 22a9 9 0 0 1 0-20"/></svg>
  )
}

export default function Overview() {
  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-[1600px] mx-auto">
        
        {/* Header - Date & Greeting */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
              <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">
                 {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                 Good Morning, Aditya.
              </h1>
           </div>
           <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 shadow-sm">
                 Pune, IN • 28°C
              </span>
              <button className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center hover:bg-[#A9FF53] hover:text-black transition-colors">
                 <ArrowUpRight className="w-4 h-4" />
              </button>
           </div>
        </header>

        {/* Top Grid: Hero & Velocity */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           <SafeSpendCard />
           <VelocityCard />
        </div>

        {/* Middle: Stacks */}
        <section>
           <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="text-lg font-bold text-slate-900">Your Stacks</h3>
              <MoreHorizontal className="w-5 h-5 text-slate-400" />
           </div>
           <StacksRow />
        </section>

        {/* Bottom: Activity */}
        <RecentActivity />

      </div>
    </DashboardLayout>
  );
}
