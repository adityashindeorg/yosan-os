import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Ensure this path matches your project structure
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Play, Check, Leaf, Wind, 
  Activity, Layers, Sparkles, Plus, Minus, Shield, Lock, Smartphone
} from 'lucide-react';

// --- UTILS ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// --- ANIMATION WRAPPER ---
const FadeUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.65, 0.3, 0.9] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// --- COMPONENTS ---

const Navbar = ({ onLogin }: { onLogin: () => void }) => (
  <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-6">
    <motion.div 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-full px-6 py-3 flex items-center justify-between w-full max-w-5xl shadow-sm shadow-slate-200/20"
    >
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
        <div className="w-3 h-3 bg-[#A9FF53] rounded-full shadow-[0_0_10px_#A9FF53]" />
        <span className="font-semibold text-slate-900 tracking-tight">Yosan</span>
      </div>
      
      <div className="hidden md:flex gap-8 text-sm font-medium text-slate-500">
        <a href="#features" className="hover:text-black transition-colors">Philosophy</a>
        <a href="#pricing" className="hover:text-black transition-colors">Membership</a>
      </div>

      <div className="flex gap-3">
         <button onClick={onLogin} className="hidden md:block px-4 py-2 text-sm font-medium text-slate-600 hover:text-black transition-colors">
           Log in
         </button>
         <button onClick={onLogin} className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[#A9FF53] hover:text-black transition-all shadow-lg hover:shadow-[#A9FF53]/20">
           Get Started
         </button>
      </div>
    </motion.div>
  </nav>
);

const DashboardSimulator = () => {
  const [step, setStep] = useState(0);
  useEffect(() => { 
    const t = setInterval(() => setStep((p) => (p + 1) % 3), 4000); 
    return () => clearInterval(t); 
  }, []);

  return (
    <div className="relative w-full aspect-[16/10] bg-white rounded-[32px] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden ring-1 ring-slate-900/5 group">
       {/* Window Controls */}
       <div className="h-14 bg-white/60 backdrop-blur-md border-b border-slate-50 flex items-center px-6 gap-2 z-20 relative">
          <div className="w-3 h-3 rounded-full bg-slate-200 group-hover:bg-red-400 transition-colors"/>
          <div className="w-3 h-3 rounded-full bg-slate-200 group-hover:bg-yellow-400 transition-colors"/>
       </div>
       
       <div className="absolute inset-0 top-14 p-8 bg-[#FAFAFA] flex flex-col justify-center">
          <AnimatePresence mode="wait">
             {step === 0 && (
                <motion.div key="input" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0, filter:"blur(8px)"}} className="flex flex-col items-center text-center">
                   <span className="text-xs font-bold text-[#A9FF53] bg-slate-900 px-3 py-1 rounded-full uppercase tracking-wider mb-6">Step 1</span>
                   <h3 className="text-3xl font-light text-slate-800 mb-2">Monthly Flow</h3>
                   <span className="text-7xl font-semibold text-slate-900 tracking-tighter">$8,400</span>
                </motion.div>
             )}
             {step === 1 && (
                <motion.div key="process" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="w-full max-w-sm mx-auto space-y-4">
                   <div className="text-center text-slate-400 text-xs uppercase tracking-widest mb-4">Auto-Sorting</div>
                   {[{l:"Living",v:"50%",c:"bg-slate-200"},{l:"Guilt-Free",v:"30%",c:"bg-slate-100"}, {l:"Investments",v:"20%",c:"bg-[#A9FF53]"}].map((x,i)=>(
                      <div key={i} className="flex justify-between items-center px-6 py-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                         <div className="flex items-center gap-4"><div className={`w-3 h-3 rounded-full ${x.c}`}/> <span className="font-medium text-slate-600">{x.l}</span></div>
                         <span className="font-bold text-slate-900">{x.v}</span>
                      </div>
                   ))}
                </motion.div>
             )}
             {step === 2 && (
                <motion.div key="dashboard" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="h-full flex flex-col gap-8 pt-4">
                   <div className="flex justify-between items-end px-4">
                      <div><div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Safe-to-Spend</div><div className="text-6xl font-light text-slate-900 tracking-tighter">$2,140</div></div>
                      <div className="w-14 h-14 bg-[#A9FF53] rounded-2xl flex items-center justify-center text-slate-900 shadow-xl shadow-[#A9FF53]/20"><Sparkles className="w-6 h-6"/></div>
                   </div>
                   <div className="flex-1 flex items-end justify-between px-2 gap-3">
                      {[35, 55, 45, 80, 65, 95, 70].map((h, i) => (
                        <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ type: "spring", stiffness: 100, delay: i * 0.05 }} className={`flex-1 rounded-t-xl ${i === 5 ? 'bg-[#A9FF53]' : 'bg-slate-100'}`} />
                      ))}
                   </div>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
};

const Hero = ({ onLogin }: { onLogin: () => void }) => (
  <section className="relative min-h-[90vh] pt-40 pb-20 px-6 overflow-hidden bg-[#FAFAFA]">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#A9FF53]/20 blur-[120px] rounded-full mix-blend-multiply opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100 blur-[100px] rounded-full mix-blend-multiply opacity-60" />
      </div>
      
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-16 items-center relative z-10">
        <div className="lg:col-span-5 flex flex-col justify-center text-center lg:text-left">
          <FadeUp>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-100 text-xs font-medium text-slate-500 mb-8 shadow-sm">
              <Leaf className="w-3 h-3 text-[#A9FF53]" /><span>Financial Clarity Reimagined</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-semibold text-slate-900 tracking-tight leading-[1.05] mb-8">
              Money,<br /><span className="relative z-10 inline-block">simplified.<svg className="absolute w-full h-3 -bottom-1 left-0 -z-10 text-[#A9FF53]" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.6" /></svg></span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed mb-10 font-light max-w-md mx-auto lg:mx-0">
              Yosan brings the Japanese concept of <span className="italic text-slate-800">Kakeibo</span> to the digital age. No clutter, just clarity.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button onClick={onLogin} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-medium flex items-center justify-center gap-3 hover:bg-[#A9FF53] hover:text-black transition-all shadow-xl shadow-slate-200 hover:-translate-y-1">
                Start Journey <ArrowRight className="w-5 h-5" />
              </button>
              <button className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-medium flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors">
                <Play className="w-4 h-4" /> Watch Demo
              </button>
            </div>
          </FadeUp>
        </div>
        <div className="lg:col-span-7">
          <FadeUp delay={0.2}><DashboardSimulator /></FadeUp>
        </div>
      </div>
  </section>
);

const SecurityBanner = () => (
  <div className="w-full py-10 border-y border-slate-100 bg-white">
    <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center md:justify-between items-center gap-8 text-slate-400">
       <span className="text-xs font-bold uppercase tracking-widest hidden md:block">System Status: Secure</span>
       <div className="flex gap-8 md:gap-12">
          <div className="flex items-center gap-2"><Lock className="w-4 h-4"/> <span className="text-sm font-medium">AES-256 Encryption</span></div>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4"/> <span className="text-sm font-medium">Private Vault</span></div>
          <div className="flex items-center gap-2"><Smartphone className="w-4 h-4"/> <span className="text-sm font-medium">Biometric Access</span></div>
       </div>
    </div>
  </div>
);

const InteractiveCalculator = () => {
  const [value, setValue] = useState(500);
  const years = 10;
  // Simple compound interest logic: Monthly * 12 * Years * 1.07 (7% growth)
  const total = Math.floor(value * 12 * years * 1.38); 

  return (
    <section className="py-20 px-6 my-10 relative">
      <div className="max-w-[95%] mx-auto bg-slate-900 rounded-[3rem] text-white relative overflow-hidden px-6 py-20 md:p-24">
         {/* Glow Effect */}
         <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#A9FF53] blur-[180px] opacity-10 rounded-full pointer-events-none" />
         
         <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
           <div>
             <div className="inline-block px-3 py-1 rounded-full border border-white/20 text-[#A9FF53] text-xs font-bold uppercase tracking-widest mb-6">Projection</div>
             <h2 className="text-4xl md:text-6xl font-medium mb-6 leading-tight">Small habits.<br/><span className="text-[#A9FF53]">Massive impact.</span></h2>
             <p className="text-slate-400 text-lg mb-8">See what happens when you automate just a fraction of your income into your Yosan vault.</p>
           </div>

           <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl">
              <div className="mb-10">
                 <div className="flex justify-between text-sm text-slate-400 mb-4 font-medium uppercase tracking-wide">
                    <span>Monthly Savings</span>
                    <span className="text-white">${value}</span>
                 </div>
                 <input 
                   type="range" min="100" max="5000" step="100" 
                   value={value} onChange={(e) => setValue(parseInt(e.target.value))}
                   className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#A9FF53]"
                 />
              </div>
              <div className="pt-8 border-t border-white/10">
                 <div className="text-sm text-slate-400 mb-2 font-medium uppercase tracking-wide">In {years} Years (Estimated)</div>
                 <motion.div 
                   key={total}
                   initial={{ opacity: 0.5, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="text-6xl md:text-7xl font-bold text-[#A9FF53] tracking-tighter"
                 >
                   ${total.toLocaleString()}
                 </motion.div>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};

const BentoGrid = () => (
  <section className="py-32 px-6 bg-white relative z-10" id="features">
    <div className="max-w-7xl mx-auto">
       <div className="text-center mb-20 max-w-2xl mx-auto">
          <h2 className="text-4xl font-semibold text-slate-900 mb-4 tracking-tight">Design that breathes.</h2>
          <p className="text-slate-500 text-lg">We stripped away the clutter. Just you and your financial goals.</p>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FadeUp className="bg-[#FAFAFA] rounded-[32px] p-10 border border-slate-100 group hover:border-slate-200 transition-colors">
             <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6"><Layers className="w-7 h-7 text-slate-900" /></div>
             <h3 className="text-2xl font-bold text-slate-900 mb-3">Holistic View</h3>
             <p className="text-slate-500 text-lg">See your entire financial life in one organized feed.</p>
          </FadeUp>
          <FadeUp delay={0.1} className="bg-slate-900 rounded-[32px] p-10 text-white relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#A9FF53] rounded-full blur-[80px] opacity-10" />
             <div className="relative z-10">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6"><Activity className="w-7 h-7 text-[#A9FF53]" /></div>
                <h3 className="text-2xl font-bold text-white mb-3">Organic Growth</h3>
                <p className="text-slate-400 text-lg">Algorithms that adjust your daily budget based on habits.</p>
             </div>
          </FadeUp>
          <FadeUp delay={0.2} className="bg-[#FAFAFA] rounded-[32px] p-10 border border-slate-100 group hover:border-slate-200 transition-colors">
             <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6"><Check className="w-7 h-7 text-slate-900" /></div>
             <h3 className="text-2xl font-bold text-slate-900 mb-3">Auto-Sort</h3>
             <p className="text-slate-500 text-lg">Transactions are automatically categorized for you.</p>
          </FadeUp>
       </div>
    </div>
  </section>
);

const Pricing = ({ onLogin }: { onLogin: () => void }) => (
  <section className="py-32 px-6 bg-[#FAFAFA]" id="pricing">
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-semibold text-slate-900 mb-4">Transparent Harmony.</h2>
        <p className="text-slate-500 text-lg">No hidden fees. No data selling.</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <FadeUp className="bg-white p-10 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300">
           <div>
              <div className="text-xl font-bold text-slate-900 mb-2">Seed</div>
              <div className="text-5xl font-bold text-slate-900 mb-6">$0<span className="text-lg font-medium text-slate-400">/mo</span></div>
              <ul className="space-y-4 mb-8">
                 {['Manual Transactions', 'Basic Analytics', '1 Savings Goal'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-slate-600"><Check className="w-5 h-5 text-slate-300"/> {f}</li>
                 ))}
              </ul>
           </div>
           <button onClick={onLogin} className="w-full py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-900 hover:border-slate-900 transition-colors">Start Free</button>
        </FadeUp>

        {/* Pro Plan */}
        <FadeUp delay={0.1} className="bg-slate-900 p-10 rounded-[2.5rem] text-white relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-slate-900/10">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#A9FF53] blur-[80px] opacity-20" />
           <div>
              <div className="flex justify-between items-start mb-2">
                 <div className="text-xl font-bold text-white">Bloom</div>
                 <span className="bg-[#A9FF53] text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase">Popular</span>
              </div>
              <div className="text-5xl font-bold text-white mb-6">$9<span className="text-lg font-medium text-slate-500">/mo</span></div>
              <ul className="space-y-4 mb-8">
                 {['Bank Sync (Plaid)', 'AI Insights', 'Unlimited Goals', 'Export to CSV'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-slate-300"><Check className="w-5 h-5 text-[#A9FF53]"/> {f}</li>
                 ))}
              </ul>
           </div>
           <button onClick={onLogin} className="w-full py-4 rounded-2xl bg-[#A9FF53] font-bold text-black hover:bg-white transition-colors">Go Pro</button>
        </FadeUp>
      </div>
    </div>
  </section>
);

const FAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  const qs = [
    {q: "Is my bank data secure?", a: "Absolutely. We use bank-grade encryption and read-only access. We cannot move your money."},
    {q: "Can I use this manually?", a: "Yes. The Zen philosophy encourages manual entry to feel the 'weight' of spending, but auto-sync is there if you need it."},
    {q: "Is there a student discount?", a: "Yes. Students get 50% off the Bloom plan with a valid .edu email."}
  ];

  return (
    <section className="py-24 px-6 bg-white max-w-3xl mx-auto">
       <h2 className="text-3xl font-semibold text-slate-900 mb-12 text-center">Common Questions</h2>
       <div className="space-y-4">
         {qs.map((item, i) => (
           <div key={i} className="border border-slate-100 rounded-2xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex justify-between items-center p-6 text-left hover:bg-[#FAFAFA] transition-colors">
                 <span className="font-medium text-slate-900 text-lg">{item.q}</span>
                 {open === i ? <Minus className="w-5 h-5 text-slate-400"/> : <Plus className="w-5 h-5 text-slate-400"/>}
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}} className="overflow-hidden">
                     <div className="p-6 pt-0 text-slate-500 leading-relaxed">{item.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
         ))}
       </div>
    </section>
  );
};

const Footer = () => (
   <footer className="bg-white border-t border-slate-100 py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#A9FF53] rounded-full"/>
            <div className="text-xl font-bold tracking-tighter text-slate-900">Yosan.</div>
         </div>
         <div className="text-slate-400 text-sm">© 2026 Yosan Inc.</div>
      </div>
   </footer>
);

// --- MAIN APP ---

export default function App() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // This will open the Google popup
      await signInWithPopup(auth, provider);
      // On success, go to dashboard
      navigate('/overview'); 
    } catch (error) {
      console.error("Login Error:", error);
      // Optional: Add a toast notification here for errors
    }
  };

  return (
    <div className="bg-[#FAFAFA] min-h-screen text-slate-900 font-sans selection:bg-[#A9FF53] selection:text-black">
      <Navbar onLogin={handleLogin} />
      <Hero onLogin={handleLogin} />
      <SecurityBanner />
      <BentoGrid />
      <InteractiveCalculator />
      <Pricing onLogin={handleLogin} />
      <FAQ />
      <Footer />
    </div>
  );
}
