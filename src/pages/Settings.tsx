import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { 
  User, CreditCard, Bell, Shield, LogOut, 
  Save, Smartphone, Globe, Mail, ChevronRight,
  RefreshCw, Trash2, CheckCircle2, AlertTriangle, Loader2
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

export default function Settings() {
  // User State
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true); // Loading Guard
  
  // Form State
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('0');
  const [currency, setCurrency] = useState('₹');
  const [notifications, setNotifications] = useState(true);
  
  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(currentUser => {
      if (currentUser) {
        setUser(currentUser);
        setName(currentUser.displayName || '');
        
        // Fetch Settings from Firestore
        const settingsRef = doc(db, "users", currentUser.uid, "settings", "general");
        const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
           setLoading(false); // Data loaded, show page
           if (docSnap.exists()) {
              const data = docSnap.data();
              setBudget(String(data.totalBudget || 0));
              setCurrency(data.currencySymbol || '₹');
              setNotifications(data.notifications ?? true);
           }
        });
        return () => unsubSettings();
      } else {
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // --- ACTIONS ---
  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
       // 1. Update Profile (Name)
       if (auth.currentUser && name !== auth.currentUser.displayName) {
          await updateProfile(auth.currentUser, { displayName: name });
       }
       
       // 2. Update Firestore Settings
       const settingsRef = doc(db, "users", user.uid, "settings", "general");
       await setDoc(settingsRef, {
          totalBudget: Number(budget),
          currencySymbol: currency,
          notifications,
          updatedAt: new Date()
       }, { merge: true });

       setSaveStatus('saved');
       setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
       console.error("Save failed", error);
       setSaveStatus('error');
    } finally {
       setIsSaving(false);
    }
  };

  const handleLogout = () => auth.signOut();

  // --- LOADING SCREEN ---
  if (loading) {
    return (
      <div className="w-full h-screen bg-[#F1F3F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#F1F3F5] p-6 lg:p-8 font-sans text-slate-900 pb-24">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Config</h1>
              <div className="flex items-center gap-2 mt-1 text-gray-500 text-xs font-bold uppercase tracking-wide">
                <span>Account</span> <span className="text-gray-300">/</span> <span>Preferences</span>
              </div>
            </div>
            
            {/* Save Status Indicator */}
            <div className="flex items-center gap-4">
               {saveStatus === 'saved' && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-green-600 font-bold text-xs bg-green-50 px-3 py-1 rounded-full">
                     <CheckCircle2 className="w-3 h-3" /> Systems Synced
                  </motion.div>
               )}
               {saveStatus === 'error' && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-red-600 font-bold text-xs bg-red-50 px-3 py-1 rounded-full">
                     <AlertTriangle className="w-3 h-3" /> Save Failed
                  </motion.div>
               )}
               <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-black text-[#A9FF53] rounded-full text-xs font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/20 disabled:opacity-50"
               >
                  {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {isSaving ? 'Syncing...' : 'Save Changes'}
               </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">

             {/* === ROW 1: IDENTITY CORE (Obsidian Card) === */}
             <div className="col-span-12 lg:col-span-8 bg-[#0A0A0A] text-white rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl shadow-black/20 border border-white/5 flex flex-col md:flex-row items-center gap-8">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#A9FF53] opacity-10 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

                {/* Avatar Section */}
                <div className="relative group">
                   <div className="w-32 h-32 rounded-[2rem] bg-gray-800 flex items-center justify-center overflow-hidden border-4 border-black shadow-xl relative z-10">
                      {user?.photoURL ? (
                         <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                      ) : (
                         <span className="text-4xl font-black text-gray-600">{name ? name[0] : 'U'}</span>
                      )}
                   </div>
                   <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#A9FF53] rounded-xl flex items-center justify-center text-black z-20 shadow-lg">
                      <Smartphone className="w-5 h-5" />
                   </div>
                </div>

                {/* Inputs */}
                <div className="flex-1 w-full relative z-10">
                   <div className="mb-6">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Identity Name</label>
                      <input 
                         type="text" value={name} onChange={(e) => setName(e.target.value)}
                         className="bg-transparent text-4xl font-black text-white placeholder:text-gray-700 w-full focus:outline-none border-b border-white/10 focus:border-[#A9FF53] pb-2 transition-colors"
                         placeholder="Enter Name"
                      />
                   </div>
                   <div className="flex items-center gap-2 text-gray-400 bg-white/5 px-4 py-2 rounded-xl w-fit border border-white/5">
                      <Mail className="w-4 h-4" />
                      <span className="text-xs font-mono">{user?.email || 'No Email'}</span>
                   </div>
                </div>
             </div>

             {/* === ROW 1: QUICK ACTIONS === */}
             <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                
                {/* Notifications Toggle */}
                <div 
                   onClick={() => setNotifications(!notifications)}
                   className={`rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between h-[180px] cursor-pointer transition-all border-2 ${notifications ? 'bg-white border-transparent' : 'bg-gray-100 border-dashed border-gray-300'}`}
                >
                   <div className="flex justify-between items-start">
                      <div className={`p-3 rounded-2xl ${notifications ? 'bg-black text-[#A9FF53]' : 'bg-gray-200 text-gray-400'}`}>
                         <Bell className="w-6 h-6" />
                      </div>
                      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${notifications ? 'bg-black' : 'bg-gray-300'}`}>
                         <motion.div 
                            animate={{ x: notifications ? 24 : 0 }}
                            className="w-4 h-4 bg-white rounded-full"
                         />
                      </div>
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-slate-900 mb-1">Notifications</h3>
                      <p className="text-xs font-bold text-gray-400">{notifications ? 'System Active' : 'System Muted'}</p>
                   </div>
                </div>

                {/* Currency Selector */}
                <div className="bg-[#A9FF53] rounded-[2.5rem] p-8 shadow-lg shadow-[#A9FF53]/20 h-[180px] relative overflow-hidden group">
                   <div className="relative z-10">
                      <label className="text-[10px] font-black text-black/50 uppercase tracking-widest block mb-2">Monetary Unit</label>
                      <div className="flex gap-2">
                         {['₹', '$', '€'].map(c => (
                            <button 
                               key={c} onClick={() => setCurrency(c)}
                               className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black transition-all ${currency === c ? 'bg-black text-white scale-110 shadow-lg' : 'bg-black/10 text-black/60 hover:bg-black/20'}`}
                            >
                               {c}
                            </button>
                         ))}
                      </div>
                   </div>
                   <Globe className="absolute -bottom-6 -right-6 w-32 h-32 text-black/5 rotate-12" />
                </div>
             </div>

             {/* === ROW 2: FINANCIAL CORE === */}
             <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] p-10 shadow-sm border border-transparent hover:border-[#A9FF53] transition-colors relative group">
                <div className="flex justify-between items-start mb-8">
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                         <CreditCard className="w-6 h-6 text-gray-400" /> Financial Core
                      </h3>
                      <p className="text-sm font-bold text-gray-400 mt-1">Set your monthly operational limits.</p>
                   </div>
                   <div className="p-2 bg-gray-50 rounded-full">
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                   </div>
                </div>

                <div className="flex items-center gap-6">
                   <div className="flex-1 relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-gray-300">{currency}</span>
                      <input 
                         type="number" 
                         value={budget}
                         onChange={(e) => setBudget(e.target.value)}
                         className="w-full pl-12 bg-transparent text-7xl font-black text-slate-900 focus:outline-none placeholder:text-gray-100"
                      />
                      <p className="text-xs font-bold text-[#A9FF53] bg-black px-3 py-1 rounded-full w-fit mt-2 uppercase tracking-wide">
                         Monthly Cap
                      </p>
                   </div>
                   
                   {/* Visual Bar */}
                   <div className="hidden md:flex flex-col gap-1 w-1/3">
                      {[...Array(5)].map((_, i) => (
                         <div key={i} className={`h-2 w-full rounded-full ${i < 3 ? 'bg-black' : 'bg-gray-100'}`}></div>
                      ))}
                      <span className="text-[10px] font-bold text-gray-400 text-right mt-1">Capacity Level</span>
                   </div>
                </div>
             </div>

             {/* === ROW 2: DANGER ZONE === */}
             <div className="col-span-12 lg:col-span-4 bg-white rounded-[2.5rem] p-8 shadow-sm border-2 border-dashed border-red-100 flex flex-col justify-center gap-4">
                <div className="flex items-center gap-3 text-red-500 mb-2">
                   <Shield className="w-5 h-5" />
                   <span className="font-bold uppercase tracking-widest text-xs">Danger Zone</span>
                </div>
                
                <button 
                   onClick={handleLogout}
                   className="w-full py-4 rounded-2xl bg-gray-50 text-slate-900 font-bold text-sm flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-colors"
                >
                   <LogOut className="w-4 h-4" /> Sign Out
                </button>
                
                <button className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-colors">
                   <Trash2 className="w-4 h-4" /> Reset Account
                </button>
             </div>

          </div>

          <div className="mt-12 text-center">
             <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                LifeOS v2.4 • Build 8892 • Secure Connection
             </p>
          </div>

        </div>
      </PageTransition>
    </MainLayout>
  );
}