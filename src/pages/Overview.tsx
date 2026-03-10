/**
 * Overview.tsx — Yosan Finance Overview
 * Audience: Students / new interns managing money on a tight budget
 * Aesthetic: Dark editorial — Bloomberg terminal × Gen-Z finance app
 * Data: Reads from same Firestore structure as Money.tsx (monthData + transactions)
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ExpenseSheet } from '@/components/money/ExpenseSheet';
import { formatCurrency } from '@/lib/db';
import {
  Plus, Download, X, Target, Trophy, Zap, Coffee,
  TrendingDown, TrendingUp, Flame, Star, ChevronRight,
  Gamepad2, Smartphone, Plane, BookOpen, ShoppingBag,
  Pencil, Check, Trash2, PiggyBank, AlertCircle,
} from 'lucide-react';
import {
  collection, query, onSnapshot, orderBy,
  doc, setDoc, getDoc, deleteDoc, addDoc, Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MonthData {
  startingBalance: number;
  limits: Record<string, number>;
}

interface Transaction {
  id: string; amount: number; note: string;
  categoryName: string; type: string; date: Date;
}

interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  savedAmount: number;   // total saved so far (across all months)
  monthlyPledge: number; // how much I plan to add per month
  color: string;
}

// ─── Goal icon map ────────────────────────────────────────────────────────────
const GOAL_ICONS: Record<string, any> = {
  '🎮': Gamepad2, '📱': Smartphone, '✈️': Plane, '📚': BookOpen,
  '👟': ShoppingBag, '⭐': Star, '🔥': Flame, '☕': Coffee,
};
const GOAL_ICON_LIST = ['🎮','📱','✈️','📚','👟','⭐','🔥','☕'];
const GOAL_COLORS = ['#A9FF53','#60a5fa','#f97316','#ec4899','#a78bfa','#34d399','#fbbf24','#f87171'];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeCat(cat: string): string {
  if (!cat) return 'Other';
  const c = cat.trim();
  if (['Groceries','Dining','Restaurant','Food'].includes(c)) return 'Food';
  if (['Transport','Fuel','Taxi','Flight'].includes(c))       return 'Travel';
  if (['Cloth','Electronics','Online','Shopping'].includes(c)) return 'Shopping';
  if (['Electricity','Water','Internet','Rent','Bills'].includes(c)) return 'Bills';
  if (['Movie','Games','Subscription','Entertainment'].includes(c)) return 'Entertainment';
  return 'Other';
}

// ─── Category colours for chart ───────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  Food: '#f97316', Shopping: '#8b5cf6', Travel: '#06b6d4',
  Bills: '#ef4444', Entertainment: '#ec4899', Savings: '#22c55e', Other: '#94a3b8',
};

// ─── Sparkline helper ─────────────────────────────────────────────────────────
function Sparkline({ data, color = '#A9FF53', height = 40 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - (v / max) * (height - 4);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  const R = 36; const cx = 44; const cy = 44; const stroke = 10;
  const circumference = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 88 88" className="w-full h-full">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#1f2937" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const gap  = circumference - dash;
        const rotate = (offset / total) * 360 - 90;
        offset += seg.value;
        return (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={0}
            style={{ transform: `rotate(${rotate}deg)`, transformOrigin: `${cx}px ${cy}px` }}
          />
        );
      })}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Overview() {
  const now = new Date();
  const activeKey = toMonthKey(now);

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [monthData, setMonthData]             = useState<MonthData>({ startingBalance: 0, limits: {} });
  const [goals, setGoals]                     = useState<SavingsGoal[]>([]);
  const [currency, setCurrency]               = useState('₹');

  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [reportOpen,   setReportOpen]   = useState(false);
  const [goalModal,    setGoalModal]    = useState<'add' | 'topup' | null>(null);
  const [editGoal,     setEditGoal]     = useState<SavingsGoal | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Goal form state
  const [gName,       setGName]       = useState('');
  const [gTarget,     setGTarget]     = useState('');
  const [gPledge,     setGPledge]     = useState('');
  const [gIcon,       setGIcon]       = useState('🎮');
  const [gColor,      setGColor]      = useState(GOAL_COLORS[0]);
  const [topupAmount, setTopupAmount] = useState('');

  // ── Firestore ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let unsubTxn: any, unsubSettings: any, unsubGoals: any;
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (!user) return;

      unsubTxn = onSnapshot(
        query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc')),
        snap => setAllTransactions(snap.docs.map(d => {
          const data = d.data();
          let dateObj = new Date();
          if (data.date instanceof Timestamp) dateObj = data.date.toDate();
          else if (data.date) dateObj = new Date(data.date);
          return { id: d.id, amount: Number(data.amount)||0, note: data.note||'', categoryName: data.categoryName||'', type: data.type||'debit', date: dateObj };
        }))
      );

      unsubSettings = onSnapshot(collection(db, 'users', user.uid, 'settings'), snap => {
        snap.docs.forEach(d => { if (d.data().currencySymbol) setCurrency(d.data().currencySymbol); });
      });

      // Load current month data
      getDoc(doc(db, 'users', user.uid, 'monthData', activeKey)).then(snap => {
        if (snap.exists()) setMonthData(snap.data() as MonthData);
      });

      unsubGoals = onSnapshot(collection(db, 'users', user.uid, 'savingsGoals'), snap => {
        setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavingsGoal)));
      });
    });
    return () => { unsubAuth(); unsubTxn?.(); unsubSettings?.(); unsubGoals?.(); };
  }, []);

  // ── Month-scoped transactions ─────────────────────────────────────────────
  const monthTxns = useMemo(() =>
    allTransactions.filter(t => toMonthKey(t.date) === activeKey),
    [allTransactions, activeKey]
  );

  const totalSpent = useMemo(() =>
    monthTxns.filter(t => t.type !== 'credit').reduce((s, t) => s + t.amount, 0),
    [monthTxns]
  );

  const balance = monthData.startingBalance - totalSpent;

  const catSpent = useMemo(() => {
    const m: Record<string, number> = {};
    monthTxns.filter(t => t.type !== 'credit').forEach(t => {
      const c = normalizeCat(t.categoryName);
      m[c] = (m[c] || 0) + t.amount;
    });
    return m;
  }, [monthTxns]);

  // Spending by day (last 14 days) for sparkline
  const dailySpend = useMemo(() => {
    const days = Array(14).fill(0);
    const today = new Date();
    allTransactions.filter(t => t.type !== 'credit').forEach(t => {
      const diff = Math.floor((today.getTime() - t.date.getTime()) / 86400000);
      if (diff >= 0 && diff < 14) days[13 - diff] += t.amount;
    });
    return days;
  }, [allTransactions]);

  // Last 6 months spending (for bar chart)
  const last6Months = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = toMonthKey(d);
      const spent = allTransactions
        .filter(t => t.type !== 'credit' && toMonthKey(t.date) === key)
        .reduce((s, t) => s + t.amount, 0);
      result.push({ label: MONTH_NAMES[d.getMonth()], spent, key });
    }
    return result;
  }, [allTransactions]);

  const maxMonthlySpend = Math.max(...last6Months.map(m => m.spent), 1);

  // Donut segments
  const donutSegments = useMemo(() =>
    Object.entries(catSpent).map(([cat, val]) => ({
      value: val, color: CAT_COLORS[cat] || '#94a3b8', label: cat,
    })),
    [catSpent]
  );

  // Top category
  const topCat = Object.entries(catSpent).sort(([,a],[,b]) => b - a)[0];

  // Savings rate
  const savingsRate = monthData.startingBalance > 0
    ? Math.max(0, Math.round(((monthData.startingBalance - totalSpent) / monthData.startingBalance) * 100))
    : 0;

  // Daily avg spend this month
  const dayOfMonth = now.getDate();
  const dailyAvg = dayOfMonth > 0 ? Math.round(totalSpent / dayOfMonth) : 0;

  // Projected end-of-month spend
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = dailyAvg * daysInMonth;

  // ── Goal actions ─────────────────────────────────────────────────────────
  const handleAddGoal = async () => {
    const user = auth.currentUser;
    if (!user || !gName || !gTarget) return;
    await addDoc(collection(db, 'users', user.uid, 'savingsGoals'), {
      name: gName, icon: gIcon, color: gColor,
      targetAmount: Number(gTarget),
      savedAmount: 0,
      monthlyPledge: Number(gPledge) || 0,
    });
    setGName(''); setGTarget(''); setGPledge(''); setGoalModal(null);
  };

  const handleTopup = async () => {
    const user = auth.currentUser;
    if (!user || !editGoal || !topupAmount) return;
    const newSaved = editGoal.savedAmount + Number(topupAmount);
    await setDoc(doc(db, 'users', user.uid, 'savingsGoals', editGoal.id),
      { savedAmount: newSaved }, { merge: true }
    );
    setTopupAmount(''); setGoalModal(null); setEditGoal(null);
  };

  const handleDeleteGoal = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'savingsGoals', id));
  };

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
      pdf.save(`Yosan_Report_${activeKey}.pdf`);
      setTimeout(() => { setIsGenerating(false); setReportOpen(false); }, 800);
    } catch { setIsGenerating(false); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#0a0a0a] text-white font-sans pb-28 lg:pb-10 relative">

          {/* Subtle grid texture */}
          <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

          {/* ── TOP BAR ── */}
          <div className="sticky top-0 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#A9FF53] flex items-center justify-center">
                <Zap className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight leading-none">Overview</h1>
                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                  {MONTH_NAMES[now.getMonth()]} {now.getFullYear()} · Live
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 transition-colors">
                <Download className="w-3 h-3" /> Export
              </button>
              <button onClick={() => setSheetOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#A9FF53] text-black rounded-full text-xs font-black hover:brightness-95 transition-all">
                <Plus className="w-3 h-3" /> Add Expense
              </button>
            </div>
          </div>

          <div className="px-4 md:px-8 pt-6 space-y-4">

            {/* ── ROW 1: Hero stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Balance', value: formatCurrency(balance, currency), sub: 'This month', trend: balance >= 0, icon: <PiggyBank className="w-4 h-4" />, accent: '#A9FF53' },
                { label: 'Spent', value: formatCurrency(totalSpent, currency), sub: `of ${formatCurrency(monthData.startingBalance, currency)}`, trend: false, icon: <TrendingDown className="w-4 h-4" />, accent: '#f87171' },
                { label: 'Saved', value: `${savingsRate}%`, sub: 'Savings rate', trend: savingsRate > 20, icon: <TrendingUp className="w-4 h-4" />, accent: '#60a5fa' },
                { label: 'Daily Avg', value: formatCurrency(dailyAvg, currency), sub: 'per day spent', trend: dailyAvg < (monthData.startingBalance / 30), icon: <Flame className="w-4 h-4" />, accent: '#fbbf24' },
              ].map((stat, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  className="bg-white/5 border border-white/8 rounded-2xl p-4 relative overflow-hidden group hover:bg-white/8 transition-colors"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-10 pointer-events-none"
                    style={{ background: stat.accent }} />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</span>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: stat.accent + '20', color: stat.accent }}>
                      {stat.icon}
                    </div>
                  </div>
                  <p className="text-xl md:text-2xl font-black tracking-tight leading-none mb-1" style={{ color: stat.accent }}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-gray-600 font-semibold">{stat.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* ── ROW 2: Spending chart + Donut ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

              {/* Monthly bar chart */}
              <div className="md:col-span-7 bg-white/5 border border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black">6-Month Spend</h3>
                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Monthly expense trend</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-[#A9FF53]">
                      {projected > monthData.startingBalance
                        ? '⚠ Over budget projected'
                        : '✓ On track'}
                    </p>
                    <p className="text-[10px] text-gray-600 font-semibold">
                      Projected: {formatCurrency(projected, currency)}
                    </p>
                  </div>
                </div>

                {/* Bars */}
                <div className="flex items-end gap-2 h-32">
                  {last6Months.map((m, i) => {
                    const h = Math.max(4, (m.spent / maxMonthlySpend) * 100);
                    const isNow = m.key === activeKey;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <p className="text-[9px] font-black text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatCurrency(m.spent, currency)}
                        </p>
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: `${h}%` }}
                          transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
                          className="w-full rounded-lg relative overflow-hidden"
                          style={{
                            background: isNow ? '#A9FF53' : 'rgba(255,255,255,0.08)',
                            boxShadow: isNow ? '0 0 20px #A9FF5340' : 'none',
                          }}
                        >
                          {isNow && <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />}
                        </motion.div>
                        <p className={`text-[9px] font-bold ${isNow ? 'text-[#A9FF53]' : 'text-gray-600'}`}>
                          {m.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Sparkline */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] text-gray-600 font-bold mb-2">14-day daily spend</p>
                  <Sparkline data={dailySpend} color="#A9FF53" height={32} />
                </div>
              </div>

              {/* Donut + breakdown */}
              <div className="md:col-span-5 bg-white/5 border border-white/8 rounded-2xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black">This Month</h3>
                  <span className="text-[10px] text-gray-500 font-bold">By category</span>
                </div>

                <div className="flex gap-4 items-center flex-1">
                  {/* Donut */}
                  <div className="relative w-24 h-24 shrink-0">
                    {donutSegments.length > 0
                      ? <DonutChart segments={donutSegments} />
                      : (
                        <svg viewBox="0 0 88 88" className="w-full h-full">
                          <circle cx={44} cy={44} r={36} fill="none" stroke="#1f2937" strokeWidth={10} />
                        </svg>
                      )
                    }
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-xs font-black">{savingsRate}%</span>
                      <span className="text-[8px] text-gray-500 font-bold">saved</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 space-y-2 min-w-0">
                    {donutSegments.length > 0 ? donutSegments.slice(0, 5).map((seg, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                          <span className="text-[10px] font-bold text-gray-400 truncate">{seg.label}</span>
                        </div>
                        <span className="text-[10px] font-black text-white shrink-0">
                          {formatCurrency(seg.value, currency)}
                        </span>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-600 font-semibold">No expenses yet</p>
                    )}
                  </div>
                </div>

                {/* Quick insight */}
                {topCat && (
                  <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/8">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Top Spend</p>
                    <p className="text-sm font-black">
                      <span className="text-[#f97316]">{topCat[0]}</span> is eating{' '}
                      <span className="text-[#A9FF53]">
                        {monthData.startingBalance > 0 ? Math.round((topCat[1] / monthData.startingBalance) * 100) : 0}%
                      </span> of your budget
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── ROW 3: Budget limits health ── */}
            {monthData.startingBalance > 0 && (
              <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
                <h3 className="text-sm font-black mb-4">Budget Health</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(monthData.limits || {}).map(([cat, pct]) => {
                    const allocated = (pct / 100) * monthData.startingBalance;
                    const spent     = catSpent[cat] || 0;
                    const usage     = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
                    const over      = spent > allocated;
                    const color     = CAT_COLORS[cat] || '#94a3b8';
                    return (
                      <div key={cat} className={`p-3 rounded-xl border ${over ? 'border-red-500/30 bg-red-500/5' : 'border-white/5 bg-white/3'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-gray-400">{cat}</span>
                          {over && <AlertCircle className="w-3 h-3 text-red-400" />}
                        </div>
                        <div className="h-1 bg-white/10 rounded-full mb-2 overflow-hidden">
                          <motion.div className="h-full rounded-full"
                            style={{ background: over ? '#ef4444' : color }}
                            initial={{ width: 0 }} animate={{ width: `${usage}%` }}
                            transition={{ duration: 0.6 }}
                          />
                        </div>
                        <p className="text-[10px] font-black" style={{ color: over ? '#f87171' : color }}>
                          {formatCurrency(spent, currency)} / {formatCurrency(allocated, currency)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── ROW 4: SAVINGS GOALS ── */}
            <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black">Savings Goals</h3>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                    Things you're grinding for 💪
                  </p>
                </div>
                <button
                  onClick={() => { setGName(''); setGTarget(''); setGPledge(''); setGIcon('🎮'); setGColor(GOAL_COLORS[0]); setGoalModal('add'); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#A9FF53] text-black rounded-full text-[10px] font-black hover:brightness-95 transition-all"
                >
                  <Plus className="w-3 h-3" /> New Goal
                </button>
              </div>

              {goals.length === 0 ? (
                <div className="py-10 flex flex-col items-center text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-sm font-bold text-gray-400">No goals yet</p>
                  <p className="text-xs text-gray-600 mt-1">Set a goal — PS5, trip, new phone, whatever</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {goals.map((goal, i) => {
                    const pct        = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
                    const remaining  = goal.targetAmount - goal.savedAmount;
                    const monthsLeft = goal.monthlyPledge > 0 ? Math.ceil(remaining / goal.monthlyPledge) : null;
                    const done       = goal.savedAmount >= goal.targetAmount;

                    return (
                      <motion.div key={goal.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 transition-colors group overflow-hidden"
                      >
                        {/* Glow */}
                        <div className="absolute inset-0 opacity-5 pointer-events-none rounded-2xl"
                          style={{ background: `radial-gradient(circle at top right, ${goal.color}, transparent)` }} />

                        <div className="flex items-start justify-between mb-3 relative z-10">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{goal.icon}</span>
                            <div>
                              <p className="text-sm font-black leading-tight">{goal.name}</p>
                              <p className="text-[10px] font-semibold" style={{ color: goal.color }}>
                                {formatCurrency(goal.savedAmount, currency)} saved
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDeleteGoal(goal.id)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3 relative z-10">
                          <motion.div className="h-full rounded-full relative overflow-hidden"
                            style={{ background: done ? '#A9FF53' : goal.color }}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                          </motion.div>
                        </div>

                        <div className="flex items-center justify-between relative z-10">
                          <div>
                            {done ? (
                              <div className="flex items-center gap-1 text-[#A9FF53]">
                                <Trophy className="w-3.5 h-3.5" />
                                <span className="text-xs font-black">Goal reached! 🎉</span>
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs font-black" style={{ color: goal.color }}>
                                  {Math.round(pct)}% there
                                </p>
                                <p className="text-[10px] text-gray-600 font-semibold">
                                  {formatCurrency(remaining, currency)} to go
                                  {monthsLeft && ` · ~${monthsLeft}mo`}
                                </p>
                              </div>
                            )}
                          </div>
                          {!done && (
                            <button
                              onClick={() => { setEditGoal(goal); setTopupAmount(''); setGoalModal('topup'); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black transition-all hover:brightness-110"
                              style={{ background: goal.color + '20', color: goal.color }}
                            >
                              <Plus className="w-3 h-3" /> Top up
                            </button>
                          )}
                        </div>

                        {/* Monthly pledge badge */}
                        {goal.monthlyPledge > 0 && (
                          <div className="mt-2 relative z-10">
                            <span className="text-[9px] font-bold text-gray-600 bg-white/5 px-2 py-1 rounded-full">
                              Pledged {formatCurrency(goal.monthlyPledge, currency)}/month
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── ROW 5: Recent activity + quick tips ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

              {/* Recent transactions */}
              <div className="md:col-span-7 bg-white/5 border border-white/8 rounded-2xl p-5">
                <h3 className="text-sm font-black mb-4">Recent Activity</h3>
                {monthTxns.length === 0 ? (
                  <p className="text-xs text-gray-600 font-semibold py-6 text-center">No transactions this month yet</p>
                ) : (
                  <div className="space-y-2">
                    {monthTxns.slice(0, 6).map((t, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${t.type === 'credit' ? 'bg-green-500/10' : 'bg-white/5'}`}>
                          {t.type === 'credit' ? '↑' : '↓'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{t.note || t.categoryName || 'Expense'}</p>
                          <p className="text-[10px] text-gray-600 font-semibold">
                            {t.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {t.categoryName}
                          </p>
                        </div>
                        <span className={`text-xs font-black shrink-0 ${t.type === 'credit' ? 'text-green-400' : 'text-white'}`}>
                          {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Money tips for students */}
              <div className="md:col-span-5 bg-gradient-to-br from-[#A9FF53]/10 to-transparent border border-[#A9FF53]/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-[#A9FF53]" />
                  <h3 className="text-sm font-black">Intern Tips</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: '🎯', tip: `50/30/20 rule: 50% needs, 30% wants, 20% savings` },
                    { icon: '☕', tip: `${formatCurrency(dailyAvg * 5, currency)}/week on daily expenses. Pack lunch = save big.` },
                    {
                      icon: '📈',
                      tip: savingsRate > 20
                        ? `You're saving ${savingsRate}% — that's solid 💪`
                        : `Try saving ${Math.max(0, 20 - savingsRate)}% more to hit the 20% goal`,
                    },
                    { icon: '🚨', tip: projected > monthData.startingBalance ? `Projected to overspend by ${formatCurrency(projected - monthData.startingBalance, currency)}. Cut back!` : `You're on track this month 🟢` },
                  ].map((t, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5">{t.icon}</span>
                      <p className="text-[11px] text-gray-300 font-semibold leading-relaxed">{t.tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>{/* end content */}

          <ExpenseSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />

          {/* ── MODAL: Add Savings Goal ── */}
          <AnimatePresence>
            {goalModal === 'add' && (
              <ModalOverlay onClose={() => setGoalModal(null)} wide>
                <h3 className="text-lg font-black mb-1">New Savings Goal</h3>
                <p className="text-xs text-gray-400 font-semibold mb-5">What are you saving up for?</p>

                {/* Icon picker */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {GOAL_ICON_LIST.map(icon => (
                    <button key={icon} onClick={() => setGIcon(icon)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${gIcon === icon ? 'bg-[#A9FF53]/20 ring-2 ring-[#A9FF53]' : 'bg-white/5 hover:bg-white/10'}`}>
                      {icon}
                    </button>
                  ))}
                </div>

                {/* Color picker */}
                <div className="flex gap-2 mb-4">
                  {GOAL_COLORS.map(c => (
                    <button key={c} onClick={() => setGColor(c)}
                      className={`w-6 h-6 rounded-full transition-all ${gColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111]' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>

                <div className="space-y-3">
                  <input type="text" placeholder="Goal name (e.g. PS5, MacBook, Trip to Goa)"
                    value={gName} onChange={e => setGName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold placeholder-gray-600 focus:outline-none focus:border-[#A9FF53]/50 text-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Target Amount</label>
                      <input type="number" placeholder="50000"
                        value={gTarget} onChange={e => setGTarget(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black placeholder-gray-600 focus:outline-none focus:border-[#A9FF53]/50 text-[#A9FF53]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Monthly Pledge</label>
                      <input type="number" placeholder="2000"
                        value={gPledge} onChange={e => setGPledge(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black placeholder-gray-600 focus:outline-none focus:border-[#A9FF53]/50 text-white"
                      />
                    </div>
                  </div>
                  {gTarget && gPledge && Number(gPledge) > 0 && (
                    <div className="p-3 bg-[#A9FF53]/10 border border-[#A9FF53]/20 rounded-xl">
                      <p className="text-xs font-bold text-[#A9FF53]">
                        🎯 At {formatCurrency(Number(gPledge), currency)}/month → goal in ~{Math.ceil(Number(gTarget) / Number(gPledge))} months
                      </p>
                    </div>
                  )}
                  <button onClick={handleAddGoal}
                    disabled={!gName || !gTarget}
                    className="w-full py-3.5 bg-[#A9FF53] text-black rounded-xl font-black text-sm hover:brightness-95 transition-all disabled:opacity-30">
                    Create Goal
                  </button>
                </div>
              </ModalOverlay>
            )}
          </AnimatePresence>

          {/* ── MODAL: Top up goal ── */}
          <AnimatePresence>
            {goalModal === 'topup' && editGoal && (
              <ModalOverlay onClose={() => { setGoalModal(null); setEditGoal(null); }}>
                <div className="text-center mb-5">
                  <span className="text-5xl">{editGoal.icon}</span>
                  <h3 className="text-lg font-black mt-2">{editGoal.name}</h3>
                  <p className="text-xs text-gray-400 font-semibold mt-1">
                    {formatCurrency(editGoal.savedAmount, currency)} saved of {formatCurrency(editGoal.targetAmount, currency)}
                  </p>
                </div>

                {/* Progress */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-5">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min((editGoal.savedAmount / editGoal.targetAmount) * 100, 100)}%`, background: editGoal.color }} />
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[500, 1000, 2000, 5000].map(amt => (
                    <button key={amt} onClick={() => setTopupAmount(String(amt))}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${topupAmount === String(amt) ? 'text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                      style={{ background: topupAmount === String(amt) ? editGoal.color : undefined }}>
                      +{amt >= 1000 ? `${amt/1000}k` : amt}
                    </button>
                  ))}
                </div>

                <input type="number" placeholder="Custom amount"
                  value={topupAmount} onChange={e => setTopupAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black placeholder-gray-600 focus:outline-none focus:border-white/30 text-white mb-4"
                />

                {topupAmount && Number(topupAmount) > 0 && (
                  <div className="p-3 bg-white/5 rounded-xl mb-4">
                    <p className="text-xs font-bold" style={{ color: editGoal.color }}>
                      After top-up: {Math.min(Math.round(((editGoal.savedAmount + Number(topupAmount)) / editGoal.targetAmount) * 100), 100)}% complete
                      {editGoal.savedAmount + Number(topupAmount) >= editGoal.targetAmount && ' 🎉 Goal reached!'}
                    </p>
                  </div>
                )}

                <button onClick={handleTopup}
                  disabled={!topupAmount || Number(topupAmount) <= 0}
                  className="w-full py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-30 text-black"
                  style={{ background: editGoal.color }}>
                  Add {topupAmount ? formatCurrency(Number(topupAmount), currency) : 'Money'}
                </button>
              </ModalOverlay>
            )}
          </AnimatePresence>

          {/* ── MODAL: PDF Export ── */}
          <AnimatePresence>
            {reportOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[70] flex items-center justify-center p-4">
                <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
                  className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                  <div className="p-5 border-b border-white/8 flex items-center justify-between">
                    <h2 className="text-base font-black">Export Statement</h2>
                    <div className="flex gap-2">
                      <button onClick={() => setReportOpen(false)}
                        className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-white transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleExport} disabled={isGenerating}
                        className="px-4 py-2 bg-[#A9FF53] text-black rounded-full text-xs font-black hover:brightness-95 disabled:opacity-50 flex items-center gap-1.5">
                        <Download className="w-3 h-3" />
                        {isGenerating ? 'Saving…' : 'Save PDF'}
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5">
                    <div ref={reportRef} className="bg-white text-slate-900 p-8 rounded-2xl">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h1 className="text-2xl font-black">Yosan Statement</h1>
                          <p className="text-sm text-gray-400 font-semibold mt-1">
                            {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400 font-bold">Opening Balance</p>
                          <p className="text-xl font-black">{formatCurrency(monthData.startingBalance, currency)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-xl">
                        <div><p className="text-xs text-gray-400 font-bold">Total Spent</p><p className="text-lg font-black">{formatCurrency(totalSpent, currency)}</p></div>
                        <div><p className="text-xs text-gray-400 font-bold">Balance Left</p><p className="text-lg font-black">{formatCurrency(balance, currency)}</p></div>
                        <div><p className="text-xs text-gray-400 font-bold">Savings Rate</p><p className="text-lg font-black">{savingsRate}%</p></div>
                      </div>
                      <table className="w-full text-left text-sm">
                        <thead className="border-b-2 border-gray-100">
                          <tr className="text-xs text-gray-400 uppercase font-bold">
                            <th className="py-2">Date</th><th className="py-2">Description</th><th className="py-2">Category</th><th className="py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {monthTxns.map((t, i) => (
                            <tr key={i}>
                              <td className="py-2.5 text-gray-500 text-xs">{t.date.toLocaleDateString('en-IN')}</td>
                              <td className="py-2.5 font-bold">{t.note || t.categoryName}</td>
                              <td className="py-2.5 text-gray-500 text-xs">{t.categoryName}</td>
                              <td className={`py-2.5 font-black text-right ${t.type === 'credit' ? 'text-green-600' : 'text-slate-900'}`}>
                                {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount, currency)}
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

// ─── Shared Modal ─────────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose, wide = false }: {
  children: React.ReactNode; onClose: () => void; wide?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[70] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`bg-[#111] border border-white/10 rounded-3xl shadow-2xl w-full p-6 md:p-7 ${wide ? 'max-w-md' : 'max-w-sm'}`}
        onClick={e => e.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  );
}
