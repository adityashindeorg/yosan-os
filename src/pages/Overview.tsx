/**
 * Overview.tsx — Yosan Finance Overview
 * Theme: Light editorial — crisp whites, #F5F5F0 bg, #A9FF53 accent, black ink
 * Audience: Students / new interns
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ExpenseSheet } from '@/components/money/ExpenseSheet';
import { formatCurrency } from '@/lib/db';
import {
  Plus, Download, X, Target, Trophy, Zap,
  TrendingDown, TrendingUp, Flame, Star,
  Gamepad2, Smartphone, Plane, BookOpen, ShoppingBag,
  Trash2, PiggyBank, AlertCircle, ArrowUpRight, Coffee,
} from 'lucide-react';
import {
  collection, query, onSnapshot, orderBy,
  doc, setDoc, getDoc, deleteDoc, addDoc, Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MonthData { startingBalance: number; limits: Record<string, number> }
interface Transaction { id: string; amount: number; note: string; categoryName: string; type: string; date: Date }
interface SavingsGoal {
  id: string; name: string; icon: string; targetAmount: number;
  savedAmount: number; monthlyPledge: number; color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const GOAL_ICONS  = ['🎮','📱','✈️','📚','👟','⭐','🔥','☕','🎵','💻','🏋️','🎨'];
const GOAL_COLORS = ['#A9FF53','#60a5fa','#f97316','#ec4899','#a78bfa','#34d399','#fbbf24','#f87171'];
const CAT_COLORS: Record<string,string> = {
  Food:'#f97316', Shopping:'#8b5cf6', Travel:'#06b6d4',
  Bills:'#ef4444', Entertainment:'#ec4899', Savings:'#22c55e', Other:'#94a3b8',
};

function toMonthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function normalizeCat(cat: string) {
  if (!cat) return 'Other';
  const c = cat.trim();
  if (['Groceries','Dining','Restaurant','Food'].includes(c)) return 'Food';
  if (['Transport','Fuel','Taxi','Flight'].includes(c))       return 'Travel';
  if (['Cloth','Electronics','Online','Shopping'].includes(c)) return 'Shopping';
  if (['Electricity','Water','Internet','Rent','Bills'].includes(c)) return 'Bills';
  if (['Movie','Games','Subscription','Entertainment'].includes(c)) return 'Entertainment';
  return 'Other';
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '', className = '' }: { value: number; prefix?: string; suffix?: string; className?: string }) {
  const spring = useSpring(0, { stiffness: 60, damping: 18 });
  const display = useTransform(spring, v => `${prefix}${Math.round(v).toLocaleString('en-IN')}${suffix}`);
  useEffect(() => { spring.set(value); }, [value]);
  return <motion.span className={className}>{display}</motion.span>;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color='#A9FF53', height=36 }: { data: number[]; color?: string; height?: number }) {
  if (data.every(v => v === 0)) return <div style={{ height }} className="w-full rounded bg-gray-100" />;
  const max = Math.max(...data, 1);
  const w = 100; const h = height;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h - (v/max)*(h-4)}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────
function DonutChart({ segments, size=88, thickness=10 }: { segments:{value:number;color:string}[]; size?: number; thickness?: number }) {
  const total = segments.reduce((s,seg)=>s+seg.value,0)||1;
  const R = (size/2)-thickness/2; const cx=size/2; const cy=size/2;
  const circ = 2*Math.PI*R;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" style={{transform:'rotate(-90deg)'}}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f1f1" strokeWidth={thickness}/>
      {segments.map((seg,i) => {
        const pct=seg.value/total; const dash=pct*circ; const gap=circ-dash;
        const rot=(offset/total)*360;
        offset+=seg.value;
        return (
          <motion.circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={seg.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${gap}`}
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${dash} ${gap}` }}
            transition={{ duration: 0.8, delay: i*0.1, ease:'easeOut' }}
            style={{ transform:`rotate(${rot}deg)`, transformOrigin:`${cx}px ${cy}px` }}
          />
        );
      })}
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon, delay=0 }: any) {
  return (
    <motion.div
      initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      transition={{ delay, duration:0.4, ease:[0.23,1,0.32,1] }}
      className="bg-white rounded-3xl p-5 border border-black/5 relative overflow-hidden group hover:shadow-lg hover:shadow-black/5 transition-all duration-300"
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-8 blur-2xl pointer-events-none transition-all duration-500 group-hover:opacity-20 group-hover:scale-125"
        style={{ background: accent }} />
      <div className="flex items-start justify-between mb-4">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: accent+'18' }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-black tracking-tight leading-none mb-2" style={{ color: accent === '#A9FF53' ? '#1a1a1a' : accent }}>
        {value}
      </p>
      <p className="text-[11px] text-gray-400 font-semibold">{sub}</p>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Overview() {
  const now = new Date();
  const activeKey = toMonthKey(now);

  const [allTxns,   setAllTxns]   = useState<Transaction[]>([]);
  const [monthData, setMonthData] = useState<MonthData>({ startingBalance:0, limits:{} });
  const [goals,     setGoals]     = useState<SavingsGoal[]>([]);
  const [currency,  setCurrency]  = useState('₹');

  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [reportOpen,   setReportOpen]   = useState(false);
  const [goalModal,    setGoalModal]    = useState<'add'|'topup'|null>(null);
  const [editGoal,     setEditGoal]     = useState<SavingsGoal|null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const [gName,   setGName]   = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gPledge, setGPledge] = useState('');
  const [gIcon,   setGIcon]   = useState('🎮');
  const [gColor,  setGColor]  = useState(GOAL_COLORS[0]);
  const [topup,   setTopup]   = useState('');

  // ── Firestore ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let unsubT: any, unsubS: any, unsubG: any;
    const unsubA = auth.onAuthStateChanged(user => {
      if (!user) return;
      unsubT = onSnapshot(query(collection(db,'users',user.uid,'transactions'),orderBy('date','desc')), snap =>
        setAllTxns(snap.docs.map(d => {
          const data = d.data(); let dt = new Date();
          if (data.date instanceof Timestamp) dt = data.date.toDate();
          else if (data.date) dt = new Date(data.date);
          return { id:d.id, amount:Number(data.amount)||0, note:data.note||'', categoryName:data.categoryName||'', type:data.type||'debit', date:dt };
        }))
      );
      unsubS = onSnapshot(collection(db,'users',user.uid,'settings'), snap =>
        snap.docs.forEach(d => { if(d.data().currencySymbol) setCurrency(d.data().currencySymbol); })
      );
      getDoc(doc(db,'users',user.uid,'monthData',activeKey)).then(snap => {
        if (snap.exists()) setMonthData(snap.data() as MonthData);
      });
      unsubG = onSnapshot(collection(db,'users',user.uid,'savingsGoals'), snap =>
        setGoals(snap.docs.map(d => ({ id:d.id, ...d.data() } as SavingsGoal)))
      );
    });
    return () => { unsubA(); unsubT?.(); unsubS?.(); unsubG?.(); };
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const monthTxns = useMemo(() => allTxns.filter(t => toMonthKey(t.date)===activeKey), [allTxns,activeKey]);

  const totalSpent = useMemo(() =>
    monthTxns.filter(t=>t.type!=='credit').reduce((s,t)=>s+t.amount,0), [monthTxns]);

  const balance = monthData.startingBalance - totalSpent;

  const catSpent = useMemo(() => {
    const m: Record<string,number> = {};
    monthTxns.filter(t=>t.type!=='credit').forEach(t => { const c=normalizeCat(t.categoryName); m[c]=(m[c]||0)+t.amount; });
    return m;
  }, [monthTxns]);

  const savingsRate = monthData.startingBalance > 0
    ? Math.max(0, Math.round(((monthData.startingBalance - totalSpent) / monthData.startingBalance) * 100)) : 0;

  const dayOfMonth = now.getDate();
  const dailyAvg = dayOfMonth > 0 ? Math.round(totalSpent / dayOfMonth) : 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const projected = dailyAvg * daysInMonth;

  const last6 = useMemo(() => {
    return Array.from({length:6}, (_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
      const key = toMonthKey(d);
      const spent = allTxns.filter(t=>t.type!=='credit'&&toMonthKey(t.date)===key).reduce((s,t)=>s+t.amount,0);
      return { label: MONTH_SHORT[d.getMonth()], spent, key };
    });
  }, [allTxns]);

  const maxSpend = Math.max(...last6.map(m=>m.spent), 1);

  const daily14 = useMemo(() => {
    const days = Array(14).fill(0);
    allTxns.filter(t=>t.type!=='credit').forEach(t => {
      const diff = Math.floor((now.getTime()-t.date.getTime())/86400000);
      if (diff>=0&&diff<14) days[13-diff]+=t.amount;
    });
    return days;
  }, [allTxns]);

  const donutSegs = useMemo(() =>
    Object.entries(catSpent).map(([cat,val]) => ({ value:val, color:CAT_COLORS[cat]||'#94a3b8', label:cat })),
    [catSpent]
  );

  const topCat = Object.entries(catSpent).sort(([,a],[,b])=>b-a)[0];

  // ── Actions ──────────────────────────────────────────────────────────────────
  const addGoal = async () => {
    const user = auth.currentUser; if(!user||!gName||!gTarget) return;
    await addDoc(collection(db,'users',user.uid,'savingsGoals'), {
      name:gName, icon:gIcon, color:gColor,
      targetAmount:Number(gTarget), savedAmount:0, monthlyPledge:Number(gPledge)||0,
    });
    setGName(''); setGTarget(''); setGPledge(''); setGoalModal(null);
  };

  const topupGoal = async () => {
    const user = auth.currentUser; if(!user||!editGoal||!topup) return;
    await setDoc(doc(db,'users',user.uid,'savingsGoals',editGoal.id),
      { savedAmount: editGoal.savedAmount+Number(topup) }, { merge:true });
    setTopup(''); setGoalModal(null); setEditGoal(null);
  };

  const deleteGoal = async (id: string) => {
    const user = auth.currentUser; if(!user) return;
    await deleteDoc(doc(db,'users',user.uid,'savingsGoals',id));
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale:2, useCORS:true });
      const pdf = new jsPDF('p','mm','a4');
      const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,w,(canvas.height*w)/canvas.width);
      pdf.save(`Yosan_${activeKey}.pdf`);
      setTimeout(() => { setIsGenerating(false); setReportOpen(false); }, 800);
    } catch { setIsGenerating(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#F5F5F0] font-sans text-slate-900 pb-28 lg:pb-12">

          {/* TOP BAR */}
          <div className="sticky top-0 z-30 bg-[#F5F5F0]/90 backdrop-blur-xl border-b border-black/5 px-4 md:px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">Overview</h1>
              <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setReportOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-black/10 rounded-full text-xs font-bold hover:bg-gray-50 transition-colors">
                <Download className="w-3.5 h-3.5" /> Export
              </button>
              <button onClick={()=>setSheetOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-black text-[#A9FF53] rounded-full text-xs font-black hover:bg-gray-900 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Expense
              </button>
            </div>
          </div>

          <div className="px-4 md:px-8 pt-6 space-y-5">

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Balance" value={formatCurrency(balance,currency)} sub="This month" accent="#A9FF53" icon={<PiggyBank className="w-4 h-4"/>} delay={0}/>
              <StatCard label="Spent" value={formatCurrency(totalSpent,currency)} sub={`of ${formatCurrency(monthData.startingBalance,currency)}`} accent="#f97316" icon={<TrendingDown className="w-4 h-4"/>} delay={0.06}/>
              <StatCard label="Saved" value={`${savingsRate}%`} sub="Savings rate" accent="#60a5fa" icon={<TrendingUp className="w-4 h-4"/>} delay={0.12}/>
              <StatCard label="Daily avg" value={formatCurrency(dailyAvg,currency)} sub="per day" accent="#8b5cf6" icon={<Flame className="w-4 h-4"/>} delay={0.18}/>
            </div>

            {/* ── CHART ROW ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

              {/* 6-month bars + sparkline */}
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2,duration:0.5,ease:[0.23,1,0.32,1]}}
                className="md:col-span-7 bg-white rounded-3xl p-6 border border-black/5 hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-black">Monthly Spend</h3>
                    <p className="text-[11px] text-gray-400 font-semibold mt-0.5">6-month trend</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-[10px] font-black ${projected > monthData.startingBalance ? 'bg-red-50 text-red-500' : 'bg-[#A9FF53]/20 text-black'}`}>
                    {projected > monthData.startingBalance ? '⚠ Over budget' : '✓ On track'}
                  </div>
                </div>

                {/* Bars */}
                <div className="flex items-end gap-2 md:gap-3 h-28 mb-5">
                  {last6.map((m,i) => {
                    const h = Math.max(6,(m.spent/maxSpend)*100);
                    const isCurrent = m.key===activeKey;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <motion.div
                          initial={{scaleY:0}} animate={{scaleY:1}}
                          transition={{delay:0.3+i*0.07,duration:0.5,ease:[0.23,1,0.32,1]}}
                          style={{
                            height:`${h}%`, transformOrigin:'bottom',
                            background: isCurrent ? '#A9FF53' : '#f0f0ec',
                            boxShadow: isCurrent ? '0 4px 20px #A9FF5350' : 'none',
                          }}
                          className="w-full rounded-xl relative overflow-hidden"
                        >
                          {isCurrent && (
                            <motion.div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/30"
                              animate={{opacity:[0.3,0.7,0.3]}} transition={{repeat:Infinity,duration:2}}/>
                          )}
                        </motion.div>
                        <span className={`text-[9px] font-bold ${isCurrent ? 'text-black' : 'text-gray-400'}`}>{m.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Sparkline */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">14-day daily pattern</p>
                  <Sparkline data={daily14} color="#A9FF53" height={36}/>
                </div>
              </motion.div>

              {/* Donut + breakdown */}
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.26,duration:0.5,ease:[0.23,1,0.32,1]}}
                className="md:col-span-5 bg-white rounded-3xl p-6 border border-black/5 hover:shadow-lg hover:shadow-black/5 transition-all duration-300 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-black">Categories</h3>
                  <span className="text-[10px] text-gray-400 font-bold">{MONTH_SHORT[now.getMonth()]}</span>
                </div>

                <div className="flex items-center gap-5 flex-1">
                  <div className="relative w-28 h-28 shrink-0">
                    {donutSegs.length > 0
                      ? <DonutChart segments={donutSegs} size={112} thickness={12}/>
                      : <svg viewBox="0 0 112 112" className="w-full h-full"><circle cx={56} cy={56} r={50} fill="none" stroke="#f0f0ec" strokeWidth={12}/></svg>
                    }
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-lg font-black leading-none">{savingsRate}%</span>
                      <span className="text-[9px] text-gray-400 font-bold">saved</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2.5 min-w-0">
                    {donutSegs.length > 0 ? donutSegs.slice(0,5).map((seg,i) => (
                      <motion.div key={i} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} transition={{delay:0.4+i*0.07}}
                        className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:seg.color}}/>
                          <span className="text-[11px] font-bold text-gray-500 truncate">{seg.label}</span>
                        </div>
                        <span className="text-[11px] font-black shrink-0">{formatCurrency(seg.value,currency)}</span>
                      </motion.div>
                    )) : <p className="text-xs text-gray-400 font-semibold">No expenses yet</p>}
                  </div>
                </div>

                {topCat && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.6}}
                    className="mt-4 p-3.5 bg-[#F5F5F0] rounded-2xl border border-black/5">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Top Spend</p>
                    <p className="text-xs font-bold text-slate-700">
                      <span style={{color:CAT_COLORS[topCat[0]]||'#94a3b8'}}>{topCat[0]}</span> is{' '}
                      {monthData.startingBalance>0 ? Math.round((topCat[1]/monthData.startingBalance)*100) : 0}% of your budget
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* ── BUDGET HEALTH ── */}
            {monthData.startingBalance > 0 && Object.keys(monthData.limits||{}).length > 0 && (
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.32,duration:0.5,ease:[0.23,1,0.32,1]}}
                className="bg-white rounded-3xl p-6 border border-black/5">
                <h3 className="text-sm font-black mb-5">Budget Health</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(monthData.limits).map(([cat,pct],i) => {
                    const allocated = (pct/100)*monthData.startingBalance;
                    const spent = catSpent[cat]||0;
                    const usage = allocated>0 ? Math.min((spent/allocated)*100,100) : 0;
                    const over  = spent>allocated;
                    const color = CAT_COLORS[cat]||'#94a3b8';
                    return (
                      <motion.div key={cat} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                        transition={{delay:0.38+i*0.05}}
                        className={`p-4 rounded-2xl border transition-all ${over ? 'border-red-200 bg-red-50' : 'border-black/5 bg-[#F5F5F0]'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{cat}</span>
                          {over && <AlertCircle className="w-3 h-3 text-red-400"/>}
                        </div>
                        <div className="h-1.5 bg-white rounded-full mb-3 overflow-hidden">
                          <motion.div className="h-full rounded-full"
                            style={{background: over ? '#ef4444' : color}}
                            initial={{width:0}} animate={{width:`${usage}%`}}
                            transition={{duration:0.7,delay:0.5+i*0.05,ease:'easeOut'}}
                          />
                        </div>
                        <p className="text-[11px] font-black" style={{color: over ? '#ef4444' : '#1a1a1a'}}>
                          {formatCurrency(spent,currency)}
                        </p>
                        <p className="text-[10px] text-gray-400 font-semibold">of {formatCurrency(allocated,currency)}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── SAVINGS GOALS ── */}
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.38,duration:0.5,ease:[0.23,1,0.32,1]}}
              className="bg-white rounded-3xl p-6 border border-black/5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black">Savings Goals</h3>
                  <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Things you're grinding for 💪</p>
                </div>
                <button onClick={()=>{ setGName('');setGTarget('');setGPledge('');setGIcon('🎮');setGColor(GOAL_COLORS[0]);setGoalModal('add'); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-black text-[#A9FF53] rounded-full text-[11px] font-black hover:bg-gray-900 transition-colors">
                  <Plus className="w-3 h-3"/> New Goal
                </button>
              </div>

              {goals.length === 0 ? (
                <div className="py-12 flex flex-col items-center bg-[#F5F5F0] rounded-2xl">
                  <span className="text-4xl mb-3">🎯</span>
                  <p className="text-sm font-bold text-gray-500">No goals yet</p>
                  <p className="text-xs text-gray-400 mt-1">Set a goal — PS5, trip, new phone, whatever</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {goals.map((goal,i) => {
                    const pct       = Math.min((goal.savedAmount/goal.targetAmount)*100, 100);
                    const remaining = goal.targetAmount - goal.savedAmount;
                    const monthsLeft= goal.monthlyPledge>0 ? Math.ceil(remaining/goal.monthlyPledge) : null;
                    const done      = goal.savedAmount >= goal.targetAmount;
                    return (
                      <motion.div key={goal.id}
                        initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                        transition={{delay:0.44+i*0.06,ease:[0.23,1,0.32,1]}}
                        className="relative p-5 rounded-2xl border border-black/5 bg-[#F5F5F0] group hover:shadow-md hover:shadow-black/5 transition-all duration-300 overflow-hidden"
                      >
                        {/* Glow blob */}
                        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none transition-opacity duration-500 group-hover:opacity-35"
                          style={{background:goal.color}}/>

                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                              style={{background:`${goal.color}20`, border:`1.5px solid ${goal.color}40`}}>
                              {goal.icon}
                            </div>
                            <div>
                              <p className="text-sm font-black leading-tight">{goal.name}</p>
                              <p className="text-[11px] font-semibold mt-0.5" style={{color:goal.color}}>
                                {formatCurrency(goal.savedAmount,currency)} saved
                              </p>
                            </div>
                          </div>
                          <button onClick={()=>deleteGoal(goal.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl hover:bg-red-50 hover:text-red-400 text-gray-300">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>

                        {/* Progress */}
                        <div className="relative z-10 mb-3">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-black" style={{color:goal.color}}>{Math.round(pct)}%</span>
                            <span className="text-[10px] text-gray-400 font-semibold">{formatCurrency(goal.targetAmount,currency)}</span>
                          </div>
                          <div className="h-2.5 bg-white rounded-full overflow-hidden shadow-inner">
                            <motion.div className="h-full rounded-full relative overflow-hidden"
                              style={{background: done ? '#A9FF53' : `linear-gradient(90deg, ${goal.color}99, ${goal.color})`}}
                              initial={{width:0}} animate={{width:`${pct}%`}}
                              transition={{duration:1,delay:0.5+i*0.1,ease:[0.23,1,0.32,1]}}>
                              <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                animate={{x:['-100%','100%']}} transition={{repeat:Infinity,duration:2,ease:'linear',delay:i*0.3}}/>
                            </motion.div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between relative z-10">
                          {done ? (
                            <div className="flex items-center gap-1.5">
                              <Trophy className="w-4 h-4 text-[#A9FF53]"/>
                              <span className="text-xs font-black text-black">Goal reached! 🎉</span>
                            </div>
                          ) : (
                            <div>
                              <p className="text-[11px] font-bold text-gray-500">
                                {formatCurrency(remaining,currency)} left
                                {monthsLeft && <span className="text-gray-400"> · ~{monthsLeft}mo</span>}
                              </p>
                            </div>
                          )}
                          {!done && (
                            <button onClick={()=>{ setEditGoal(goal);setTopup('');setGoalModal('topup'); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black transition-all hover:shadow-md active:scale-95"
                              style={{background:`${goal.color}18`, color:goal.color, border:`1px solid ${goal.color}30`}}>
                              <Plus className="w-3 h-3"/> Top up
                            </button>
                          )}
                        </div>

                        {goal.monthlyPledge>0 && (
                          <p className="text-[9px] font-bold text-gray-400 mt-3 relative z-10 border-t border-black/5 pt-2.5">
                            Pledged {formatCurrency(goal.monthlyPledge,currency)}/month
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* ── BOTTOM ROW: Recent + Intern Tips ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

              {/* Recent */}
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.44,duration:0.5,ease:[0.23,1,0.32,1]}}
                className="md:col-span-7 bg-white rounded-3xl p-6 border border-black/5">
                <h3 className="text-sm font-black mb-4">Recent Activity</h3>
                {monthTxns.length===0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-bold text-gray-400">No transactions this month</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {monthTxns.slice(0,7).map((t,i) => {
                      const isCredit = t.type==='credit';
                      return (
                        <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
                          transition={{delay:0.5+i*0.05}}
                          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[#F5F5F0] transition-colors group">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 font-bold ${isCredit ? 'bg-green-50 text-green-500' : 'bg-[#F5F5F0] text-gray-500'}`}>
                            {isCredit ? '↑' : '↓'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate leading-tight">{t.note||t.categoryName||'Expense'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400 font-semibold">
                                {t.date.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                              </span>
                              {t.categoryName && (
                                <span className="text-[9px] bg-[#F5F5F0] group-hover:bg-white text-gray-500 font-bold px-2 py-0.5 rounded-full transition-colors">
                                  {t.categoryName}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm font-black shrink-0 ${isCredit ? 'text-green-500' : 'text-slate-900'}`}>
                            {isCredit?'+':'-'}{formatCurrency(t.amount,currency)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Intern Tips */}
              <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.5,duration:0.5,ease:[0.23,1,0.32,1]}}
                className="md:col-span-5 bg-black rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#A9FF5315_0%,_transparent_60%)] pointer-events-none"/>
                <div className="flex items-center gap-2 mb-5 relative z-10">
                  <div className="w-7 h-7 rounded-xl bg-[#A9FF53]/20 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-[#A9FF53]"/>
                  </div>
                  <h3 className="text-sm font-black text-white">Intern Playbook</h3>
                </div>
                <div className="space-y-4 relative z-10">
                  {[
                    { icon:'🎯', tip:'50/30/20 rule: needs / wants / savings', badge: null },
                    { icon:'☕', tip:`Packing lunch = ~${formatCurrency(dailyAvg*20,currency)} saved/month`, badge: null },
                    {
                      icon:'📈',
                      tip: savingsRate>=20 ? `Saving ${savingsRate}% — solid work 💪` : `${20-savingsRate}% more to hit 20% savings`,
                      badge: savingsRate>=20 ? '✓' : null,
                    },
                    {
                      icon:'🚨',
                      tip: projected>(monthData.startingBalance||1)
                        ? `Projected overspend: ${formatCurrency(projected-(monthData.startingBalance||0),currency)}`
                        : 'You\'re on track this month 🟢',
                      badge: null,
                    },
                  ].map((t,i) => (
                    <motion.div key={i} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}}
                      transition={{delay:0.6+i*0.07}}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                      <span className="text-base shrink-0">{t.icon}</span>
                      <p className="text-[11px] text-gray-300 font-semibold leading-relaxed">{t.tip}</p>
                      {t.badge && <span className="text-[#A9FF53] text-xs font-black ml-auto shrink-0">{t.badge}</span>}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

          </div>

          <ExpenseSheet isOpen={sheetOpen} onClose={()=>setSheetOpen(false)}/>

          {/* ── MODAL: Add Goal ── */}
          <AnimatePresence>
            {goalModal==='add' && (
              <LightModal onClose={()=>setGoalModal(null)} wide>
                <h3 className="text-lg font-black mb-1">New Savings Goal</h3>
                <p className="text-xs text-gray-400 font-semibold mb-5">What are you grinding for?</p>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {GOAL_ICONS.map(icon => (
                    <button key={icon} onClick={()=>setGIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${gIcon===icon ? 'ring-2 ring-black scale-110' : 'bg-[#F5F5F0] hover:bg-gray-100'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mb-5">
                  {GOAL_COLORS.map(c => (
                    <button key={c} onClick={()=>setGColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${gColor===c ? 'ring-2 ring-offset-2 ring-black scale-110' : ''}`}
                      style={{background:c}}/>
                  ))}
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="Goal name (PS5, MacBook, Goa trip…)"
                    value={gName} onChange={e=>setGName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl text-sm font-bold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"/>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1.5">Target</label>
                      <input type="number" placeholder="50000" value={gTarget} onChange={e=>setGTarget(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl text-sm font-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A9FF53]"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase block mb-1.5">Monthly</label>
                      <input type="number" placeholder="2000" value={gPledge} onChange={e=>setGPledge(e.target.value)}
                        className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl text-sm font-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A9FF53]"/>
                    </div>
                  </div>
                  <AnimatePresence>
                    {gTarget && gPledge && Number(gPledge)>0 && (
                      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                        className="p-3.5 rounded-xl border-2 border-[#A9FF53] bg-[#A9FF53]/10">
                        <p className="text-xs font-black text-black">
                          🎯 At {formatCurrency(Number(gPledge),currency)}/month →&nbsp;
                          goal in ~{Math.ceil(Number(gTarget)/Number(gPledge))} months
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button onClick={addGoal} disabled={!gName||!gTarget}
                    className="w-full py-3.5 bg-black text-[#A9FF53] rounded-xl font-black text-sm hover:bg-gray-900 transition-all disabled:opacity-30">
                    Create Goal
                  </button>
                </div>
              </LightModal>
            )}
          </AnimatePresence>

          {/* ── MODAL: Top up ── */}
          <AnimatePresence>
            {goalModal==='topup' && editGoal && (
              <LightModal onClose={()=>{ setGoalModal(null);setEditGoal(null); }}>
                <div className="text-center mb-5">
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-3 shadow-sm"
                    style={{background:`${editGoal.color}18`, border:`2px solid ${editGoal.color}30`}}>
                    {editGoal.icon}
                  </div>
                  <h3 className="text-lg font-black">{editGoal.name}</h3>
                  <p className="text-xs text-gray-400 font-semibold mt-1">
                    {formatCurrency(editGoal.savedAmount,currency)} of {formatCurrency(editGoal.targetAmount,currency)}
                  </p>
                </div>
                <div className="h-2.5 bg-[#F5F5F0] rounded-full overflow-hidden mb-5">
                  <div className="h-full rounded-full transition-all" style={{
                    width:`${Math.min((editGoal.savedAmount/editGoal.targetAmount)*100,100)}%`,
                    background:editGoal.color
                  }}/>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[500,1000,2000,5000].map(amt => (
                    <button key={amt} onClick={()=>setTopup(String(amt))}
                      className="py-2.5 rounded-xl text-xs font-black transition-all border"
                      style={{
                        background: topup===String(amt) ? editGoal.color : '#F5F5F0',
                        color: topup===String(amt) ? 'black' : '#6b7280',
                        borderColor: topup===String(amt) ? editGoal.color : 'transparent',
                        transform: topup===String(amt) ? 'scale(1.05)' : 'scale(1)',
                      }}>
                      +{amt>=1000?`${amt/1000}k`:amt}
                    </button>
                  ))}
                </div>
                <input type="number" placeholder="Custom amount" value={topup} onChange={e=>setTopup(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl text-sm font-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 mb-4"/>
                <AnimatePresence>
                  {topup && Number(topup)>0 && (
                    <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                      className="p-3 rounded-xl mb-4 text-center"
                      style={{background:`${editGoal.color}18`, border:`1.5px solid ${editGoal.color}30`}}>
                      <p className="text-xs font-black" style={{color:editGoal.color}}>
                        After: {Math.min(Math.round(((editGoal.savedAmount+Number(topup))/editGoal.targetAmount)*100),100)}% complete
                        {editGoal.savedAmount+Number(topup)>=editGoal.targetAmount && ' 🎉'}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button onClick={topupGoal} disabled={!topup||Number(topup)<=0}
                  className="w-full py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-30 active:scale-98 text-black"
                  style={{background:editGoal.color}}>
                  Add {topup ? formatCurrency(Number(topup),currency) : 'Money'}
                </button>
              </LightModal>
            )}
          </AnimatePresence>

          {/* ── PDF MODAL ── */}
          <AnimatePresence>
            {reportOpen && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                <motion.div initial={{y:30,opacity:0}} animate={{y:0,opacity:1}} exit={{y:30,opacity:0}}
                  transition={{type:'spring',damping:25,stiffness:300}}
                  className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-black/5 shadow-2xl shadow-black/10">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-black">Export Statement</h2>
                    <div className="flex gap-2">
                      <button onClick={()=>setReportOpen(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-black transition-colors">Cancel</button>
                      <button onClick={exportPDF} disabled={isGenerating}
                        className="px-4 py-2 bg-black text-[#A9FF53] rounded-full text-xs font-black hover:bg-gray-900 disabled:opacity-50 flex items-center gap-1.5">
                        <Download className="w-3 h-3"/>{isGenerating?'Saving…':'Save PDF'}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-[#F5F5F0]">
                    <div ref={reportRef} className="bg-white p-8 rounded-2xl">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h1 className="text-2xl font-black">Yosan Statement</h1>
                          <p className="text-sm text-gray-400 font-semibold mt-1">{MONTH_NAMES[now.getMonth()]} {now.getFullYear()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400 font-bold">Opening Balance</p>
                          <p className="text-xl font-black">{formatCurrency(monthData.startingBalance,currency)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-[#F5F5F0] rounded-2xl">
                        <div><p className="text-xs text-gray-400 font-bold mb-1">Total Spent</p><p className="text-lg font-black">{formatCurrency(totalSpent,currency)}</p></div>
                        <div><p className="text-xs text-gray-400 font-bold mb-1">Balance</p><p className="text-lg font-black">{formatCurrency(balance,currency)}</p></div>
                        <div><p className="text-xs text-gray-400 font-bold mb-1">Savings Rate</p><p className="text-lg font-black">{savingsRate}%</p></div>
                      </div>
                      <table className="w-full text-left text-sm">
                        <thead><tr className="text-xs text-gray-400 uppercase font-bold border-b-2 border-gray-100">
                          <th className="py-2">Date</th><th className="py-2">Description</th><th className="py-2">Category</th><th className="py-2 text-right">Amount</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {monthTxns.map((t,i)=>(
                            <tr key={i}>
                              <td className="py-2.5 text-gray-400 text-xs">{t.date.toLocaleDateString('en-IN')}</td>
                              <td className="py-2.5 font-bold text-sm">{t.note||t.categoryName}</td>
                              <td className="py-2.5 text-gray-400 text-xs">{t.categoryName}</td>
                              <td className={`py-2.5 font-black text-right text-sm ${t.type==='credit'?'text-green-600':'text-slate-900'}`}>
                                {t.type==='credit'?'+':'-'}{formatCurrency(t.amount,currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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

// ─── Light Modal ──────────────────────────────────────────────────────────────
function LightModal({ children, onClose, wide=false }: { children: React.ReactNode; onClose: ()=>void; wide?: boolean }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}}
        transition={{type:'spring',damping:26,stiffness:320}}
        className={`bg-white rounded-3xl shadow-2xl shadow-black/10 w-full p-6 md:p-7 border border-black/5 relative overflow-hidden ${wide?'max-w-md':'max-w-sm'}`}
        onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F5F5F0] transition-colors">
          <X className="w-4 h-4 text-gray-400"/>
        </button>
        {children}
      </motion.div>
    </motion.div>
  );
}
