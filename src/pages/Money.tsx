/**
 * Money.tsx — Yosan Money Manager
 *
 * HOW IT WORKS:
 * - Everything is scoped to a "month module" (YYYY-MM)
 * - Each month has its own: starting balance, transactions, limit %s
 * - Balance = monthStartingBalance - totalSpentThisMonth
 * - Limit bars compare category spending vs (monthStartingBalance × limit%)
 * - Switching months shows that month's isolated data
 * - No cross-month balance leakage
 * - Month data stored in Firestore: users/{uid}/monthData/{YYYY-MM}
 */

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ExpenseSheet } from '@/components/money/ExpenseSheet';
import { formatCurrency } from '@/lib/db';
import {
  Plus, Search, X, ArrowUpCircle, ArrowDownCircle,
  SlidersHorizontal, Trash2, ChevronLeft, ChevronRight,
  PiggyBank, ShoppingCart, Utensils, Car, Zap, Smile,
  MoreHorizontal, Wallet,
} from 'lucide-react';
import {
  collection, query, onSnapshot, orderBy,
  doc, setDoc, getDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MonthData {
  startingBalance: number;
  limits: Record<string, number>; // category -> % of startingBalance
}

interface Transaction {
  id: string;
  amount: number;
  note: string;
  categoryName: string;
  type: 'credit' | 'debit';
  date: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; icon: any; color: string; defaultPct: number }> = {
  Food:          { label: 'Food & Dining', icon: Utensils,       color: '#f97316', defaultPct: 20 },
  Shopping:      { label: 'Shopping',       icon: ShoppingCart,   color: '#8b5cf6', defaultPct: 10 },
  Travel:        { label: 'Travel',         icon: Car,            color: '#06b6d4', defaultPct: 10 },
  Bills:         { label: 'Bills & Rent',   icon: Zap,            color: '#ef4444', defaultPct: 25 },
  Entertainment: { label: 'Entertainment',  icon: Smile,          color: '#ec4899', defaultPct: 5  },
  Savings:       { label: 'Savings',        icon: PiggyBank,      color: '#22c55e', defaultPct: 20 },
  Other:         { label: 'Other',          icon: MoreHorizontal, color: '#94a3b8', defaultPct: 10 },
};

const DEFAULT_LIMITS = Object.fromEntries(
  Object.entries(CATEGORY_META).map(([k, v]) => [k, v.defaultPct])
);

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeCat(cat: string): string {
  if (!cat) return 'Other';
  const c = cat.trim();
  if (['Groceries','Dining','Restaurant','Food'].includes(c))          return 'Food';
  if (['Transport','Fuel','Taxi','Flight'].includes(c))                return 'Travel';
  if (['Cloth','Electronics','Online','Shopping'].includes(c))         return 'Shopping';
  if (['Electricity','Water','Internet','Rent','Bills'].includes(c))   return 'Bills';
  if (['Movie','Games','Subscription','Entertainment'].includes(c))    return 'Entertainment';
  return 'Other';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Money() {
  const now = new Date();

  const [activeYear,  setActiveYear]  = useState(now.getFullYear());
  const [activeMonth, setActiveMonth] = useState(now.getMonth()); // 0-indexed

  const activeKey = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}`;

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [monthData, setMonthData] = useState<MonthData>({
    startingBalance: 0,
    limits: { ...DEFAULT_LIMITS },
  });
  const [currency, setCurrency] = useState('₹');

  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [limitsOpen,  setLimitsOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceInput, setBalanceInput] = useState('');
  const [editLimits,   setEditLimits]   = useState<Record<string, number>>({});

  // ── Firestore: transactions + settings ───────────────────────────────────
  useEffect(() => {
    let unsubTxn:      (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged(user => {
      if (!user) return;

      unsubTxn = onSnapshot(
        query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc')),
        snap => {
          setAllTransactions(snap.docs.map(d => {
            const data = d.data();
            let dateObj = new Date();
            if (data.date instanceof Timestamp) dateObj = data.date.toDate();
            else if (data.date) dateObj = new Date(data.date);
            return {
              id: d.id,
              amount: Number(data.amount) || 0,
              note: data.note || '',
              categoryName: data.categoryName || '',
              type: data.type || 'debit',
              date: dateObj,
            } as Transaction;
          }));
        }
      );

      unsubSettings = onSnapshot(collection(db, 'users', user.uid, 'settings'), snap => {
        snap.docs.forEach(d => {
          if (d.data().currencySymbol) setCurrency(d.data().currencySymbol);
        });
      });
    });

    return () => { unsubAuth(); unsubTxn?.(); unsubSettings?.(); };
  }, []);

  // ── Firestore: load month-specific data ──────────────────────────────────
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    getDoc(doc(db, 'users', user.uid, 'monthData', activeKey)).then(snap => {
      if (snap.exists()) {
        const data = snap.data() as MonthData;
        setMonthData({
          startingBalance: data.startingBalance ?? 0,
          limits: { ...DEFAULT_LIMITS, ...(data.limits ?? {}) },
        });
      } else {
        setMonthData({ startingBalance: 0, limits: { ...DEFAULT_LIMITS } });
      }
    });
  }, [activeKey]);

  // ── Derived: this month's transactions ───────────────────────────────────
  const monthTransactions = useMemo(() =>
    allTransactions.filter(t => toMonthKey(t.date) === activeKey),
    [allTransactions, activeKey]
  );

  const filtered = useMemo(() =>
    monthTransactions.filter(t =>
      !searchQuery ||
      t.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [monthTransactions, searchQuery]
  );

  // Only count debits against balance (credits are manual fund additions you'd do elsewhere)
  const totalSpent = useMemo(() =>
    monthTransactions.filter(t => t.type !== 'credit').reduce((s, t) => s + t.amount, 0),
    [monthTransactions]
  );

  const balance = monthData.startingBalance - totalSpent;

  const catSpent = useMemo(() => {
    const m: Record<string, number> = {};
    monthTransactions.filter(t => t.type !== 'credit').forEach(t => {
      const c = normalizeCat(t.categoryName);
      m[c] = (m[c] || 0) + t.amount;
    });
    return m;
  }, [monthTransactions]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const isCurrentMonth = activeYear === now.getFullYear() && activeMonth === now.getMonth();

  const prevMonth = () => {
    if (activeMonth === 0) { setActiveMonth(11); setActiveYear(y => y - 1); }
    else setActiveMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (isCurrentMonth) return;
    if (activeMonth === 11) { setActiveMonth(0); setActiveYear(y => y + 1); }
    else setActiveMonth(m => m + 1);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSetBalance = async () => {
    const user = auth.currentUser;
    if (!user || !balanceInput) return;
    const updated: MonthData = { ...monthData, startingBalance: Number(balanceInput) };
    setMonthData(updated);
    await setDoc(doc(db, 'users', user.uid, 'monthData', activeKey), updated, { merge: true });
    setBalanceInput('');
    setBalanceOpen(false);
  };

  const handleSaveLimits = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const merged = { ...monthData.limits, ...editLimits };
    const updated: MonthData = { ...monthData, limits: merged };
    setMonthData(updated);
    await setDoc(doc(db, 'users', user.uid, 'monthData', activeKey), updated, { merge: true });
    setLimitsOpen(false);
  };

  const handleDelete = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;
    if (window.confirm('Delete this transaction?'))
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
  };

  const totalLimitPct = Object.values(
    Object.keys(editLimits).length > 0 ? editLimits : monthData.limits
  ).reduce((a, b) => a + b, 0);

  const spentPct = monthData.startingBalance > 0
    ? Math.min((totalSpent / monthData.startingBalance) * 100, 100)
    : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#F5F5F0] font-sans text-slate-900 pb-28 lg:pb-10">

          {/* TOP BAR */}
          <div className="sticky top-0 z-30 bg-[#F5F5F0]/90 backdrop-blur-md border-b border-black/5 px-4 md:px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">Yosan</h1>
              <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Money Manager</p>
            </div>
            <button
              onClick={() => { setEditLimits({ ...monthData.limits }); setLimitsOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-black/10 rounded-full text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Limits
            </button>
          </div>

          <div className="px-4 md:px-8 pt-6 space-y-5">

            {/* MONTH NAVIGATOR */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="w-9 h-9 rounded-full bg-white border border-black/10 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-black tracking-tight">{MONTH_NAMES[activeMonth]} {activeYear}</h2>
                {isCurrentMonth && (
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Current Month</span>
                )}
              </div>
              <button
                onClick={nextMonth}
                disabled={isCurrentMonth}
                className="w-9 h-9 rounded-full bg-white border border-black/10 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* BALANCE CARD */}
            <div className="bg-black text-white rounded-3xl p-6 md:p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#A9FF5325_0%,_transparent_60%)] pointer-events-none" />
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {MONTH_NAMES[activeMonth]} Balance
                </p>

                {monthData.startingBalance === 0 ? (
                  <div className="py-4">
                    <p className="text-3xl font-black text-gray-500 mb-4">No balance set</p>
                    <button
                      onClick={() => setBalanceOpen(true)}
                      className="flex items-center gap-2 px-5 py-3 bg-[#A9FF53] text-black rounded-full text-xs font-black hover:brightness-95 transition-all"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      Set {MONTH_NAMES[activeMonth]}'s Balance
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className={`text-5xl md:text-6xl font-black tracking-tighter leading-none mb-1 ${balance < 0 ? 'text-red-400' : 'text-white'}`}>
                      {formatCurrency(balance, currency)}
                    </h2>
                    <p className="text-xs text-gray-400 font-semibold mb-6">
                      Remaining · started with {formatCurrency(monthData.startingBalance, currency)}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                          <Wallet className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">Opening</span>
                        </div>
                        <p className="text-lg font-black">{formatCurrency(monthData.startingBalance, currency)}</p>
                        <button
                          onClick={() => setBalanceOpen(true)}
                          className="text-[10px] text-gray-500 hover:text-[#A9FF53] font-bold mt-1 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-1.5 text-red-400 mb-1">
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">Spent</span>
                        </div>
                        <p className="text-lg font-black">{formatCurrency(totalSpent, currency)}</p>
                        <p className="text-[10px] text-gray-500 font-semibold mt-1">
                          {Math.round(spentPct)}% of budget
                        </p>
                      </div>
                    </div>

                    {/* Overall progress bar */}
                    <div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${balance < 0 ? 'bg-red-500' : 'bg-[#A9FF53]'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${spentPct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-gray-500 font-semibold">0</span>
                        <span className="text-[10px] text-gray-500 font-semibold">
                          {formatCurrency(monthData.startingBalance, currency)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* BUDGET ALLOCATION */}
            {monthData.startingBalance > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-black/5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-black uppercase tracking-wide">Budget Limits</h3>
                  <button
                    onClick={() => { setEditLimits({ ...monthData.limits }); setLimitsOpen(true); }}
                    className="text-[11px] text-gray-400 font-bold hover:text-black transition-colors flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3 h-3" /> Adjust
                  </button>
                </div>
                <div className="space-y-4">
                  {Object.entries(CATEGORY_META).map(([key, meta]) => {
                    const allocated = (monthData.limits[key] / 100) * monthData.startingBalance;
                    const spent     = catSpent[key] || 0;
                    const pct       = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
                    const over      = spent > allocated;
                    const remaining = allocated - spent;
                    const Icon      = meta.icon;

                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: meta.color + '18' }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                            </div>
                            <div>
                              <p className="text-sm font-bold leading-none">{meta.label}</p>
                              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                Budget: {formatCurrency(allocated, currency)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-black ${over ? 'text-red-500' : 'text-slate-800'}`}>
                              {formatCurrency(spent, currency)}
                            </p>
                            <p className={`text-[10px] font-semibold ${over ? 'text-red-400' : 'text-gray-400'}`}>
                              {over
                                ? `${formatCurrency(Math.abs(remaining), currency)} over!`
                                : `${formatCurrency(remaining, currency)} left`}
                            </p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: over ? '#ef4444' : meta.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TRANSACTION LIST */}
            <div className="bg-white rounded-3xl border border-black/5 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Transactions
                  {monthTransactions.length > 0 && (
                    <span className="ml-2 text-gray-400 font-semibold normal-case">
                      ({monthTransactions.length})
                    </span>
                  )}
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search…"
                    className="pl-8 pr-3 py-2 bg-gray-50 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black/10 w-36 md:w-48"
                  />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="py-16 flex flex-col items-center">
                  <ArrowDownCircle className="w-9 h-9 mb-3 text-gray-200" />
                  <p className="text-sm font-bold text-gray-400">No transactions yet</p>
                  <p className="text-xs text-gray-300 mt-1">Tap + below to log a spend</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filtered.map((t, i) => {
                    const isCredit = t.type === 'credit';
                    return (
                      <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-green-50' : 'bg-red-50'}`}>
                          {isCredit
                            ? <ArrowUpCircle  className="w-4 h-4 text-green-500" />
                            : <ArrowDownCircle className="w-4 h-4 text-red-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate leading-tight">
                            {t.note || (isCredit ? 'Income' : 'Expense')}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-gray-400 font-semibold">
                              {t.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                            {t.categoryName && (
                              <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">
                                {t.categoryName}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-black shrink-0 ${isCredit ? 'text-green-600' : 'text-slate-900'}`}>
                          {isCredit ? '+' : '-'}{formatCurrency(t.amount, currency)}
                        </span>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-200 hover:text-red-500 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* FAB */}
          <button
            onClick={() => setSheetOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-[#F5F5F0] hover:bg-gray-900 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>

          <ExpenseSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />

          {/* MODAL: Set Balance */}
          <AnimatePresence>
            {balanceOpen && (
              <ModalOverlay onClose={() => setBalanceOpen(false)}>
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#A9FF53] rounded-t-3xl" />
                <ModalHeader
                  title={`${MONTH_NAMES[activeMonth]}'s Balance`}
                  onClose={() => setBalanceOpen(false)}
                />
                <p className="text-xs text-gray-400 font-semibold mb-5">
                  How much money do you have this month? Budget limits will be calculated from this.
                </p>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">
                  Opening Balance
                </label>
                <CurrencyInput symbol={currency} value={balanceInput} onChange={setBalanceInput} />
                <button
                  onClick={handleSetBalance}
                  className="w-full mt-5 py-3.5 bg-[#A9FF53] text-black rounded-xl font-black text-sm hover:brightness-95 transition-all"
                >
                  Set Balance
                </button>
              </ModalOverlay>
            )}
          </AnimatePresence>

          {/* MODAL: Budget Limits */}
          <AnimatePresence>
            {limitsOpen && (
              <ModalOverlay onClose={() => setLimitsOpen(false)} wide>
                <ModalHeader
                  title={`${MONTH_NAMES[activeMonth]} Limits`}
                  onClose={() => setLimitsOpen(false)}
                />
                <p className="text-xs text-gray-400 font-semibold mb-1">
                  Set % of your {monthData.startingBalance > 0 ? formatCurrency(monthData.startingBalance, currency) : 'monthly balance'} per category.
                </p>
                <p className="text-xs font-black mb-5">
                  Total:{' '}
                  <span className={totalLimitPct === 100 ? 'text-green-500' : 'text-red-500'}>
                    {totalLimitPct}%
                  </span>
                  {totalLimitPct !== 100 && (
                    <span className="text-gray-400 font-semibold"> · must equal 100%</span>
                  )}
                </p>

                <div className="space-y-5 mb-6 max-h-[50vh] overflow-y-auto pr-1">
                  {Object.entries(CATEGORY_META).map(([key, meta]) => {
                    const Icon = meta.icon;
                    const val  = (Object.keys(editLimits).length > 0 ? editLimits[key] : monthData.limits[key]) ?? meta.defaultPct;
                    const amt  = monthData.startingBalance > 0
                      ? formatCurrency((val / 100) * monthData.startingBalance, currency)
                      : null;

                    return (
                      <div key={key}>
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: meta.color + '18' }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                          </div>
                          <span className="text-sm font-bold flex-1">{meta.label}</span>
                          <div className="text-right">
                            <span className="text-sm font-black">{val}%</span>
                            {amt && <p className="text-[10px] text-gray-400 font-semibold">{amt}</p>}
                          </div>
                        </div>
                        <input
                          type="range" min={0} max={70} step={1}
                          value={val}
                          onChange={e => setEditLimits(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          className="w-full accent-black"
                        />
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleSaveLimits}
                  disabled={totalLimitPct !== 100}
                  className="w-full py-3.5 bg-black text-[#A9FF53] rounded-xl font-black text-sm hover:bg-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {totalLimitPct === 100 ? 'Save Limits' : `Total is ${totalLimitPct}% — needs to be 100%`}
                </button>
              </ModalOverlay>
            )}
          </AnimatePresence>

        </div>
      </PageTransition>
    </MainLayout>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function ModalOverlay({ children, onClose, wide = false }: {
  children: React.ReactNode; onClose: () => void; wide?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={`bg-white rounded-3xl shadow-2xl w-full relative overflow-hidden p-6 md:p-8 ${wide ? 'max-w-md' : 'max-w-sm'}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-black">{title}</h3>
      <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}

function CurrencyInput({ symbol, value, onChange }: {
  symbol: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">{symbol}</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        className="w-full pl-9 pr-4 py-3.5 bg-gray-50 rounded-xl font-black text-xl text-green-600 focus:outline-none focus:ring-2 focus:ring-[#A9FF53]"
      />
    </div>
  );
}
