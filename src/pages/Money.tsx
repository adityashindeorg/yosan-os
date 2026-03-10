import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ExpenseSheet } from '@/components/money/ExpenseSheet';
import { formatCurrency } from '@/lib/db';
import {
  Plus, Search, X, ArrowUpCircle, ArrowDownCircle,
  Wallet, SlidersHorizontal, Trash2, ChevronDown, ChevronUp,
  PiggyBank, ShoppingCart, Utensils, Car, Zap, Smile, MoreHorizontal
} from 'lucide-react';
import {
  collection, query, onSnapshot, orderBy,
  doc, setDoc, deleteDoc, addDoc, Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

// ─── Default budget allocation percentages ────────────────────────────────────
const DEFAULT_LIMITS: Record<string, { pct: number; label: string; icon: any; color: string }> = {
  Food:          { pct: 20, label: 'Food & Dining',   icon: Utensils,     color: '#f97316' },
  Shopping:      { pct: 10, label: 'Shopping',         icon: ShoppingCart, color: '#8b5cf6' },
  Travel:        { pct: 10, label: 'Travel',           icon: Car,          color: '#06b6d4' },
  Bills:         { pct: 30, label: 'Bills & Rent',     icon: Zap,          color: '#ef4444' },
  Entertainment: { pct: 5,  label: 'Entertainment',    icon: Smile,        color: '#ec4899' },
  Savings:       { pct: 20, label: 'Savings Goal',     icon: PiggyBank,    color: '#22c55e' },
  Other:         { pct: 5,  label: 'Other',            icon: MoreHorizontal, color: '#94a3b8' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function getMonthLabel(key: string) {
  const [y, m] = key.split('-');
  return `${MONTH_LABELS[parseInt(m) - 1]} ${y}`;
}
function normalizeCat(cat: string): string {
  if (!cat) return 'Other';
  const c = cat.trim();
  if (['Groceries','Dining','Restaurant','Food'].includes(c)) return 'Food';
  if (['Transport','Fuel','Taxi','Flight'].includes(c)) return 'Travel';
  if (['Cloth','Electronics','Online','Shopping'].includes(c)) return 'Shopping';
  if (['Electricity','Water','Internet','Rent','Bills'].includes(c)) return 'Bills';
  if (['Movie','Games','Subscription','Entertainment'].includes(c)) return 'Entertainment';
  if (c === 'Income') return 'Income';
  return 'Other';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Money() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currency, setCurrency]         = useState('₹');
  const [limits, setLimits]             = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(DEFAULT_LIMITS).map(([k, v]) => [k, v.pct]))
  );

  // Modal state
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [addFundOpen, setAddFundOpen]   = useState(false);
  const [limitsOpen, setLimitsOpen]     = useState(false);
  const [balanceOpen, setBalanceOpen]   = useState(false);

  // Form state
  const [fundAmount, setFundAmount]     = useState('');
  const [fundSource, setFundSource]     = useState('');
  const [balanceInput, setBalanceInput] = useState('');
  const [editLimits, setEditLimits]     = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery]   = useState('');

  // Month accordion
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

  // ── Firestore sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (!user) return;

      onSnapshot(
        query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc')),
        snap => {
          setTransactions(snap.docs.map(d => {
            const data = d.data();
            let dateObj = new Date();
            if (data.date instanceof Timestamp) dateObj = data.date.toDate();
            else if (data.date) dateObj = new Date(data.date);
            return { id: d.id, ...data, amount: Number(data.amount) || 0, date: dateObj };
          }));
        }
      );

      onSnapshot(collection(db, 'users', user.uid, 'settings'), snap => {
        snap.docs.forEach(d => {
          if (d.data().currencySymbol) setCurrency(d.data().currencySymbol);
          if (d.data().budgetLimits)   setLimits(d.data().budgetLimits);
        });
      });
    });
    return () => unsub();
  }, []);

  // Auto-open current month
  useEffect(() => {
    if (transactions.length > 0) {
      const now = new Date();
      setOpenMonths(new Set([getMonthKey(now)]));
    }
  }, [transactions.length > 0]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const totalIncome = useMemo(() =>
    transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const totalSpent = useMemo(() =>
    transactions.filter(t => t.type !== 'credit').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const balance = totalIncome - totalSpent;

  // Category spent totals (all time — for limit bars)
  const catSpent = useMemo(() => {
    const m: Record<string, number> = {};
    transactions.filter(t => t.type !== 'credit').forEach(t => {
      const c = normalizeCat(t.categoryName);
      m[c] = (m[c] || 0) + t.amount;
    });
    return m;
  }, [transactions]);

  // Group transactions by month
  const byMonth = useMemo(() => {
    const map: Record<string, any[]> = {};
    const filtered = transactions.filter(t =>
      !searchQuery ||
      t.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered.forEach(t => {
      const key = getMonthKey(t.date);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [transactions, searchQuery]);

  const monthKeys = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  // Budget allocation amounts
  const allocations = useMemo(() => {
    if (totalIncome === 0) return {};
    return Object.fromEntries(
      Object.keys(DEFAULT_LIMITS).map(k => [k, (limits[k] / 100) * totalIncome])
    );
  }, [totalIncome, limits]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleAddFund = async () => {
    if (!auth.currentUser || !fundAmount) return;
    await addDoc(collection(db, 'users', auth.currentUser.uid, 'transactions'), {
      amount: Number(fundAmount),
      note: fundSource || 'Deposit',
      categoryName: 'Income',
      type: 'credit',
      date: new Date(),
    });
    setFundAmount(''); setFundSource(''); setAddFundOpen(false);
  };

  const handleSetBalance = async () => {
    if (!auth.currentUser || !balanceInput) return;
    // Add as a special opening-balance credit
    await addDoc(collection(db, 'users', auth.currentUser.uid, 'transactions'), {
      amount: Number(balanceInput),
      note: 'Opening Balance',
      categoryName: 'Income',
      type: 'credit',
      date: new Date(),
    });
    setBalanceInput(''); setBalanceOpen(false);
  };

  const handleSaveLimits = async () => {
    if (!auth.currentUser) return;
    const merged = { ...limits, ...editLimits };
    setLimits(merged);
    await setDoc(
      doc(db, 'users', auth.currentUser.uid, 'settings', 'general'),
      { budgetLimits: merged },
      { merge: true }
    );
    setLimitsOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!auth.currentUser) return;
    if (window.confirm('Delete this transaction?'))
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', id));
  };

  const toggleMonth = (key: string) =>
    setOpenMonths(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const totalLimitPct = Object.values(limits).reduce((a, b) => a + b, 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#F5F5F0] font-sans text-slate-900 pb-28 lg:pb-10">

          {/* ── TOP BAR ── */}
          <div className="sticky top-0 z-30 bg-[#F5F5F0]/90 backdrop-blur-md border-b border-black/5 px-4 md:px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">Yosan</h1>
              <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Money Manager</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setEditLimits({ ...limits }); setLimitsOpen(true); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-black/10 rounded-full text-xs font-bold hover:bg-gray-50 transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> Limits
              </button>
              <button
                onClick={() => setAddFundOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-black text-[#A9FF53] rounded-full text-xs font-bold hover:bg-gray-900 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Funds
              </button>
            </div>
          </div>

          <div className="px-4 md:px-8 pt-6 space-y-6">

            {/* ── BALANCE CARD ── */}
            <div className="bg-black text-white rounded-3xl p-6 md:p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#A9FF5320_0%,_transparent_60%)] pointer-events-none" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Current Balance</p>
              <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
                    {formatCurrency(balance, currency)}
                  </h2>
                  <button
                    onClick={() => setBalanceOpen(true)}
                    className="mt-3 text-[11px] font-bold text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-full transition-colors"
                  >
                    + Set opening balance
                  </button>
                </div>
                <div className="flex gap-3">
                  <div className="bg-white/10 rounded-2xl p-4 min-w-[110px]">
                    <div className="flex items-center gap-1.5 text-[#A9FF53] mb-1">
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">Income</span>
                    </div>
                    <p className="text-lg font-black">{formatCurrency(totalIncome, currency)}</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4 min-w-[110px]">
                    <div className="flex items-center gap-1.5 text-red-400 mb-1">
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase">Spent</span>
                    </div>
                    <p className="text-lg font-black">{formatCurrency(totalSpent, currency)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BUDGET ALLOCATION BARS ── */}
            {totalIncome > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-black/5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-black uppercase tracking-wide">Budget Allocation</h3>
                  <span className="text-xs text-gray-400 font-semibold">Based on {formatCurrency(totalIncome, currency)} income</span>
                </div>
                <div className="space-y-4">
                  {Object.entries(DEFAULT_LIMITS).map(([key, meta]) => {
                    const allocated = allocations[key] || 0;
                    const spent = catSpent[key] || 0;
                    const pct = allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;
                    const over = spent > allocated;
                    const Icon = meta.icon;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: meta.color + '20' }}>
                              <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                            </div>
                            <span className="text-sm font-bold">{meta.label}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-xs font-black ${over ? 'text-red-500' : 'text-gray-700'}`}>
                              {formatCurrency(spent, currency)}
                            </span>
                            <span className="text-xs text-gray-400 font-semibold"> / {formatCurrency(allocated, currency)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: over ? '#ef4444' : meta.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TRANSACTION HISTORY ── */}
            <div className="bg-white rounded-3xl border border-black/5 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black uppercase tracking-wide">Transaction History</h3>
                <div className="relative flex-1 max-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>
              </div>

              {monthKeys.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-gray-300">
                  <Wallet className="w-10 h-10 mb-3" />
                  <p className="text-sm font-bold">No transactions yet</p>
                  <p className="text-xs mt-1">Add funds or log an expense to start</p>
                </div>
              ) : (
                monthKeys.map(key => {
                  const txns = byMonth[key];
                  const monthIncome = txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
                  const monthSpent  = txns.filter(t => t.type !== 'credit').reduce((s, t) => s + t.amount, 0);
                  const isOpen = openMonths.has(key);

                  return (
                    <div key={key} className="border-b border-gray-100 last:border-0">
                      {/* Month header */}
                      <button
                        onClick={() => toggleMonth(key)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isOpen
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                          }
                          <span className="text-sm font-black">{getMonthLabel(key)}</span>
                          <span className="text-xs text-gray-400 font-semibold">{txns.length} txns</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold">
                          <span className="text-green-500">+{formatCurrency(monthIncome, currency)}</span>
                          <span className="text-red-400">-{formatCurrency(monthSpent, currency)}</span>
                          <span className={`font-black ${monthIncome - monthSpent >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
                            = {formatCurrency(monthIncome - monthSpent, currency)}
                          </span>
                        </div>
                      </button>

                      {/* Transaction rows */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="divide-y divide-gray-50">
                              {txns.map((t, i) => (
                                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                                  {/* Icon */}
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.type === 'credit' ? 'bg-green-50' : 'bg-gray-100'}`}>
                                    {t.type === 'credit'
                                      ? <ArrowUpCircle className="w-4 h-4 text-green-500" />
                                      : <ArrowDownCircle className="w-4 h-4 text-gray-400" />
                                    }
                                  </div>
                                  {/* Details */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate">{t.note || (t.type === 'credit' ? 'Deposit' : 'Expense')}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[11px] text-gray-400 font-semibold">
                                        {t.date instanceof Date ? t.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                                      </span>
                                      {t.categoryName && (
                                        <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">
                                          {t.categoryName}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Amount */}
                                  <span className={`text-sm font-black shrink-0 ${t.type === 'credit' ? 'text-green-600' : 'text-slate-900'}`}>
                                    {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                                  </span>
                                  {/* Delete */}
                                  <button
                                    onClick={() => handleDelete(t.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-300 hover:text-red-500"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>{/* end content */}

          {/* ── FAB: Add Expense ── */}
          <button
            onClick={() => setSheetOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white hover:bg-gray-900 active:scale-95 transition-all"
          >
            <ArrowDownCircle className="w-6 h-6" />
          </button>

          <ExpenseSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />

          {/* ── MODAL: Set Opening Balance ── */}
          <AnimatePresence>
            {balanceOpen && (
              <ModalWrapper onClose={() => setBalanceOpen(false)}>
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#A9FF53] rounded-t-3xl" />
                <ModalHeader title="Set Your Balance" onClose={() => setBalanceOpen(false)} />
                <p className="text-xs text-gray-400 font-semibold mb-5">
                  Enter the money you currently have. This will be recorded as an opening balance.
                </p>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">Amount</label>
                <CurrencyInput symbol={currency} value={balanceInput} onChange={setBalanceInput} className="text-green-600" />
                <button onClick={handleSetBalance} className="w-full mt-5 py-3.5 bg-[#A9FF53] text-black rounded-xl font-black text-sm hover:brightness-95 transition-all">
                  Set Balance
                </button>
              </ModalWrapper>
            )}
          </AnimatePresence>

          {/* ── MODAL: Add Funds ── */}
          <AnimatePresence>
            {addFundOpen && (
              <ModalWrapper onClose={() => setAddFundOpen(false)}>
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#A9FF53] rounded-t-3xl" />
                <ModalHeader title="Add Funds" onClose={() => setAddFundOpen(false)} />
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">Amount</label>
                    <CurrencyInput symbol={currency} value={fundAmount} onChange={setFundAmount} className="text-green-600" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-2">Source</label>
                    <input
                      type="text"
                      placeholder="e.g. Salary, Freelance…"
                      value={fundSource}
                      onChange={e => setFundSource(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#A9FF53]"
                    />
                  </div>
                  <button onClick={handleAddFund} className="w-full py-3.5 bg-[#A9FF53] text-black rounded-xl font-black text-sm hover:brightness-95 transition-all">
                    Deposit
                  </button>
                </div>
              </ModalWrapper>
            )}
          </AnimatePresence>

          {/* ── MODAL: Budget Limits ── */}
          <AnimatePresence>
            {limitsOpen && (
              <ModalWrapper onClose={() => setLimitsOpen(false)} wide>
                <ModalHeader title="Customise Budget Limits" onClose={() => setLimitsOpen(false)} />
                <p className="text-xs text-gray-400 font-semibold mb-5">
                  Set what % of your total income goes to each category. Total: <span className={totalLimitPct !== 100 ? 'text-red-500 font-black' : 'text-green-500 font-black'}>{totalLimitPct}%</span> (should be 100%)
                </p>
                <div className="space-y-4 mb-6 max-h-[55vh] overflow-y-auto pr-1">
                  {Object.entries(DEFAULT_LIMITS).map(([key, meta]) => {
                    const Icon = meta.icon;
                    const val = editLimits[key] ?? limits[key] ?? meta.pct;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.color + '20' }}>
                          <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        </div>
                        <span className="text-sm font-bold flex-1">{meta.label}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range" min={0} max={60} step={1}
                            value={val}
                            onChange={e => setEditLimits(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                            className="w-24 accent-black"
                          />
                          <span className="text-sm font-black w-10 text-right">{val}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={handleSaveLimits}
                  disabled={totalLimitPct !== 100}
                  className="w-full py-3.5 bg-black text-[#A9FF53] rounded-xl font-black text-sm hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save Limits
                </button>
              </ModalWrapper>
            )}
          </AnimatePresence>

        </div>
      </PageTransition>
    </MainLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModalWrapper({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
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
    <div className="flex justify-between items-center mb-5">
      <h3 className="text-lg font-black">{title}</h3>
      <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}

function CurrencyInput({ symbol, value, onChange, className = '' }: {
  symbol: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">{symbol}</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full pl-9 pr-4 py-3 bg-gray-50 rounded-xl font-black text-lg focus:outline-none focus:ring-2 focus:ring-[#A9FF53] ${className}`}
      />
    </div>
  );
}
