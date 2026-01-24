import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Calendar, FileText, 
  ShoppingBag, Coffee, Car, Zap, 
  Smartphone, Home, Briefcase, Tag, ArrowRight 
} from 'lucide-react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

interface ExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

// SAFE COLORS (Explicitly defined to prevent crashes)
const CATEGORIES = [
  { id: 'food', name: 'Food', icon: Coffee, bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  { id: 'travel', name: 'Travel', icon: Car, bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  { id: 'bills', name: 'Bills', icon: Zap, bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-200' },
  { id: 'tech', name: 'Tech', icon: Smartphone, bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  { id: 'home', name: 'Home', icon: Home, bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
  { id: 'work', name: 'Work', icon: Briefcase, bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
  { id: 'other', name: 'Other', icon: Tag, bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
];

export function ExpenseSheet({ isOpen, onClose }: ExpenseSheetProps) {
  const [amount, setAmount] = useState('');
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setSelectedCat(CATEGORIES[0]);
      setNote('');
      setIsSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'transactions'), {
        amount: parseFloat(amount),
        categoryName: selectedCat.name,
        note: note || selectedCat.name,
        date: Timestamp.fromDate(new Date(date)),
        type: 'expense',
        createdAt: Timestamp.now()
      });
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden relative"
          >
            {/* --- 1. TICKET STUB (Top Section) --- */}
            <div className={`p-8 pb-12 transition-colors duration-300 ${selectedCat.bg} relative`}>
               {/* Close Button */}
               <button 
                 type="button"
                 onClick={onClose} 
                 className="absolute top-6 right-6 p-2 bg-white/40 rounded-full hover:bg-white/70 transition-colors"
               >
                  <X className="w-5 h-5 text-black/60" />
               </button>
               
               <div className="flex flex-col items-center mt-2">
                  {/* Icon */}
                  <motion.div 
                     key={selectedCat.id}
                     initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                     className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4"
                  >
                     <selectedCat.icon className={`w-8 h-8 ${selectedCat.text}`} />
                  </motion.div>
                  
                  {/* Amount Input */}
                  <div className="relative flex items-center justify-center">
                     <span className="text-3xl font-bold text-black/30 mr-1">₹</span>
                     <input
                        type="number"
                        autoFocus
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="bg-transparent text-6xl font-black text-slate-900 text-center w-32 focus:outline-none placeholder:text-black/10"
                     />
                  </div>
                  <p className="text-xs font-bold text-black/40 uppercase tracking-widest mt-1">
                     {selectedCat.name}
                  </p>
               </div>
            </div>

            {/* --- 2. DETAILS FORM (Bottom Section) --- */}
            <div className="bg-white relative -mt-6 rounded-t-[32px] p-8 pt-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
               
               {isSuccess ? (
                  /* SUCCESS STATE */
                  <div className="h-[280px] flex flex-col items-center justify-center">
                     <motion.div 
                       initial={{ scale: 0 }} animate={{ scale: 1 }}
                       className="w-20 h-20 bg-[#A9FF53] rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-200"
                     >
                        <Check className="w-10 h-10 text-black stroke-[3]" />
                     </motion.div>
                     <h3 className="text-2xl font-black text-slate-900">Saved!</h3>
                     <p className="text-gray-400 font-bold mt-1">Added to vault</p>
                  </div>
               ) : (
                  /* INPUT FORM */
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                     
                     {/* GRID CATEGORIES (No Scrolling) */}
                     <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block px-1">Select Category</label>
                       <div className="grid grid-cols-4 gap-3">
                          {CATEGORIES.map((cat) => (
                             <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCat(cat)}
                                className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 border-2 ${
                                   selectedCat.id === cat.id 
                                   ? `bg-white ${cat.border} scale-110 shadow-lg z-10` 
                                   : 'bg-gray-50 border-transparent text-gray-300 hover:bg-gray-100'
                                }`}
                             >
                                <cat.icon className={`w-5 h-5 ${selectedCat.id === cat.id ? cat.text : 'text-gray-400'}`} />
                             </button>
                          ))}
                       </div>
                     </div>

                     {/* Inputs */}
                     <div className="flex gap-3">
                        <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-3 border-2 border-transparent focus-within:border-black/5 transition-colors">
                           <FileText className="w-4 h-4 text-gray-400" />
                           <input 
                              type="text" value={note} onChange={(e) => setNote(e.target.value)} 
                              placeholder="Add a note..." 
                              className="bg-transparent w-full text-sm font-bold text-slate-900 focus:outline-none placeholder:text-gray-400"
                           />
                        </div>
                        <div className="w-[35%] bg-gray-50 rounded-2xl px-3 py-3 flex items-center justify-center border-2 border-transparent focus-within:border-black/5 transition-colors">
                           <input 
                              type="date" value={date} onChange={(e) => setDate(e.target.value)}
                              className="bg-transparent w-full text-sm font-bold text-slate-900 focus:outline-none text-center"
                           />
                        </div>
                     </div>

                     {/* Action Button */}
                     <button
                        disabled={!amount || isSubmitting}
                        className={`w-full py-4 rounded-[20px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all ${
                           amount 
                             ? 'bg-black text-[#A9FF53] shadow-black/20 translate-y-0 opacity-100' 
                             : 'bg-gray-100 text-gray-300 shadow-none translate-y-2 opacity-50 cursor-not-allowed'
                        }`}
                     >
                        {isSubmitting ? 'Saving...' : <>Confirm <ArrowRight className="w-4 h-4" /></>}
                     </button>

                  </form>
               )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}