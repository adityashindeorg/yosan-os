import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, Calendar, FileText, 
  Briefcase, Flag, Target, Layers, ArrowRight 
} from 'lucide-react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

interface ProjectSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITIES = [
  { id: 'high', label: 'High Priority', bg: 'bg-red-100', color: 'text-red-600', border: 'border-red-200' },
  { id: 'medium', label: 'Medium', bg: 'bg-yellow-100', color: 'text-yellow-600', border: 'border-yellow-200' },
  { id: 'low', label: 'Low', bg: 'bg-green-100', color: 'text-green-600', border: 'border-green-200' },
];

export function ProjectSheet({ isOpen, onClose }: ProjectSheetProps) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState(PRIORITIES[1]);
  const [deadline, setDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDesc('');
      setPriority(PRIORITIES[1]);
      setIsSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'projects'), {
        title,
        description: desc,
        status: 'Active', // Default status
        priority: priority.id,
        progress: 0, // Starts at 0%
        deadline: Timestamp.fromDate(new Date(deadline)),
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
            {/* HEADER: PROJECT CHARTER */}
            <div className="p-8 pb-10 bg-slate-50 relative border-b border-slate-100">
               <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white rounded-full hover:bg-slate-200 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
               </button>
               
               <div className="flex flex-col items-center mt-2">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 text-[#A9FF53]">
                     <Briefcase className="w-8 h-8 fill-current stroke-black" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">New Initiative</h2>
                  <p className="text-xs font-bold text-slate-400 mt-1">Define your goals</p>
               </div>
            </div>

            {/* FORM BODY */}
            <div className="p-8 pt-8">
               {isSuccess ? (
                  <div className="h-[280px] flex flex-col items-center justify-center">
                     <div className="w-20 h-20 bg-[#A9FF53] rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-100">
                        <Check className="w-10 h-10 text-black stroke-[3]" />
                     </div>
                     <h3 className="text-2xl font-black text-slate-900">Project Live!</h3>
                     <p className="text-slate-400 font-bold mt-1">Get to work.</p>
                  </div>
               ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                     
                     {/* Title Input */}
                     <div className="bg-slate-50 rounded-2xl px-4 py-3 border-2 border-transparent focus-within:border-black/5 transition-colors">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Project Title</label>
                        <input 
                           type="text" value={title} onChange={(e) => setTitle(e.target.value)} 
                           placeholder="e.g. Website Redesign" 
                           autoFocus
                           className="bg-transparent w-full text-lg font-black text-slate-900 focus:outline-none placeholder:text-slate-300"
                        />
                     </div>

                     {/* Priority Selection */}
                     <div className="flex gap-2">
                        {PRIORITIES.map((p) => (
                           <button
                              key={p.id}
                              type="button"
                              onClick={() => setPriority(p)}
                              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                                 priority.id === p.id ? `${p.bg} ${p.color} ${p.border}` : 'bg-white border-slate-100 text-slate-400'
                              }`}
                           >
                              {p.label}
                           </button>
                        ))}
                     </div>

                     {/* Details Row */}
                     <div className="flex gap-3">
                        <div className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 border-2 border-transparent focus-within:border-black/5 transition-colors">
                           <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Details</span>
                           </div>
                           <input 
                              type="text" value={desc} onChange={(e) => setDesc(e.target.value)} 
                              placeholder="Brief desc..." 
                              className="bg-transparent w-full text-sm font-bold text-slate-900 focus:outline-none"
                           />
                        </div>
                        <div className="w-[40%] bg-slate-50 rounded-2xl px-3 py-3 border-2 border-transparent focus-within:border-black/5 transition-colors">
                           <div className="flex items-center gap-2 mb-1 justify-center">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Deadline</span>
                           </div>
                           <input 
                              type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                              className="bg-transparent w-full text-sm font-bold text-slate-900 focus:outline-none text-center"
                           />
                        </div>
                     </div>

                     {/* Submit Button */}
                     <button
                        disabled={!title || isSubmitting}
                        className={`w-full py-4 rounded-[20px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all ${
                           title 
                             ? 'bg-black text-[#A9FF53] shadow-black/20 translate-y-0 opacity-100' 
                             : 'bg-slate-100 text-slate-300 shadow-none translate-y-2 opacity-50 cursor-not-allowed'
                        }`}
                     >
                        {isSubmitting ? 'Initializing...' : <>Launch Project <ArrowRight className="w-4 h-4" /></>}
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