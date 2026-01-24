import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, AnimatePresence, useInView } from 'framer-motion';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  ArrowRight, Play, Zap, Shield, Globe, LayoutGrid, 
  PieChart, Wallet, Command, ChevronRight, Check, 
  Lock, Star, CreditCard, ChevronDown, Plus, Activity, Linkedin, Mail 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- UTILS ---

const FadeUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const NumberTicker = ({ value }: { value: number }) => {
   const [display, setDisplay] = useState(0);
   useEffect(() => {
      let start = 0;
      const animate = () => {
         const now = performance.now();
         const progress = Math.min((now - start) / 800, 1);
         setDisplay(Math.floor(value * progress));
         if(progress < 1) requestAnimationFrame(animate);
      };
      start = performance.now();
      requestAnimationFrame(animate);
   }, [value]);
   return <span>{display.toLocaleString()}</span>;
};

// --- HERO COMPONENTS ---

const TiltContainer = ({ children }: { children: React.ReactNode }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const handleMouseMove = ({ clientX, clientY, currentTarget }: React.MouseEvent) => {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    mouseX.set((clientX - left) / width - 0.5);
    mouseY.set((clientY - top) / height - 0.5);
  };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 150, damping: 20 });
  return (
    <motion.div onMouseMove={handleMouseMove} onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }} style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className="relative z-20 perspective-1000 w-full">
      {children}
    </motion.div>
  );
};

const DashboardSimulator = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((p) => (p + 1) % 3), 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-white rounded-[24px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-slate-200/80 overflow-hidden ring-1 ring-slate-900/5 group">
       <div className="h-10 bg-white border-b border-slate-100 flex items-center px-4 gap-3 z-20 relative">
          <div className="flex gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
             <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57] shadow-inner" />
             <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] shadow-inner" />
             <div className="w-2.5 h-2.5 rounded-full bg-[#28C940] shadow-inner" />
          </div>
          <div className="flex-1 flex justify-center px-4">
             <div className="w-full max-w-[200px] h-6 bg-slate-50 rounded-md border border-slate-100 flex items-center justify-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                <Shield className="w-2.5 h-2.5" /> Secure Environment
             </div>
          </div>
       </div>
       <div className="absolute inset-0 top-10 p-6 md:p-8 bg-[#FDFDFD]">
          <AnimatePresence mode="wait">
             {step === 0 && (
                <motion.div key="input" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="h-full flex flex-col items-center justify-center text-center">
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6"><Command className="w-3 h-3" /> Step 1: Input Limit</div>
                   <h3 className="text-2xl font-bold text-slate-900 mb-2">Monthly Budget?</h3>
                   <div className="relative"><span className="text-6xl font-black text-slate-900 tracking-tighter">$5,000</span><motion.div initial={{ opacity: 0 }} animate={{ opacity: [0,1,0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="absolute -right-1 top-2 bottom-2 w-1 bg-[#A9FF53]" /></div>
                </motion.div>
             )}
             {step === 1 && (
                <motion.div key="process" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col items-center justify-center w-full max-w-sm mx-auto space-y-4">
                   {[{l:"Needs",v:"50%",i:Shield,c:"bg-slate-900",t:"text-white"},{l:"Wants",v:"30%",i:Zap,c:"bg-[#A9FF53]",t:"text-black"},{l:"Savings",v:"20%",i:Wallet,c:"bg-slate-100",t:"text-slate-500"}].map((x,i)=>(
                      <div key={i} className="flex justify-between w-full items-center px-4 py-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                         <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${x.c} ${x.t}`}><x.i className="w-4 h-4"/></div><span className="font-bold text-sm">{x.l}</span></div><span className="font-black text-lg">{x.v}</span>
                      </div>
                   ))}
                </motion.div>
             )}
             {step === 2 && (
                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col gap-4">
                   <div className="flex justify-between items-end"><div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Safe-to-Spend</div><div className="text-4xl font-black text-slate-900 tracking-tighter">$1,240</div></div><div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-lg"><Zap className="w-5 h-5" /></div></div>
                   <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 flex items-end justify-between px-6 pt-8 pb-0 overflow-hidden relative">
                      {[30, 50, 45, 70, 60, 90, 80].map((h, i) => (<motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.05, type: "spring" }} className="w-[10%] bg-slate-900 rounded-t-sm" />))}
                      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="absolute bottom-4 right-4 bg-white shadow-lg border border-slate-100 px-3 py-2 rounded-lg flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/><span className="text-[10px] font-bold">Optimized</span></motion.div>
                   </div>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
};

// --- SECTIONS ---

const Navbar = ({ onLogin }: { onLogin: () => void }) => (
  <nav className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
    <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/5 rounded-full px-8 py-4 flex items-center gap-16">
       <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center group-hover:bg-[#A9FF53] transition-colors"><span className="text-white group-hover:text-black font-bold text-xs">Y</span></div>
          <span className="font-bold text-slate-900 tracking-tight text-lg">Yosan</span>
       </div>
       <div className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500 uppercase tracking-wide">
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#security" className="hover:text-slate-900 transition-colors">Security</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Membership</a>
       </div>
       <button onClick={onLogin} className="px-6 py-2.5 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#A9FF53] hover:text-black transition-all hover:scale-105 shadow-lg">Dashboard</button>
    </motion.div>
  </nav>
);

const Hero = ({ onLogin }: { onLogin: () => void }) => (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 px-6 overflow-hidden bg-[#FAFAFA]">
       <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-gradient-to-b from-white to-slate-100 rounded-full blur-[100px]" />
          <div className="absolute top-[40%] left-[-10%] w-[600px] h-[600px] bg-[#A9FF53]/10 rounded-full blur-[120px]" />
       </div>
       <div className="max-w-[1400px] mx-auto w-full grid lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-5 flex flex-col justify-center">
             <FadeUp>
                <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-8">
                   Enjoy your <span className="relative inline-block text-[#A9FF53] bg-black px-4 transform -rotate-2 rounded-xl">Yosan,</span> <br/>
                   enjoy your life.
                </h1>
                <p className="text-xl text-slate-500 font-medium leading-relaxed mb-10 max-w-md">
                   The best solution for managing your finances. Smart, automated, and unapologetically simple.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                   <button onClick={onLogin} className="group px-10 py-5 bg-black text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#A9FF53] hover:text-black transition-all shadow-xl hover:-translate-y-1">
                      Get Started <ArrowRight className="w-5 h-5" />
                   </button>
                   <button className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:border-black transition-colors">
                      <Play className="w-4 h-4 fill-current" /> Demo
                   </button>
                </div>
                <div className="flex items-center gap-4 border-t border-slate-200 pt-8">
                   <div className="flex -space-x-4">
                      {[1,2,3,4].map(i => <div key={i} className="w-12 h-12 rounded-full border-4 border-[#FAFAFA] bg-slate-200" />)}
                   </div>
                   <div><div className="font-bold text-slate-900 text-lg leading-none">10k+ Users</div><div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Trusted Globally</div></div>
                </div>
             </FadeUp>
          </div>
          <div className="lg:col-span-7 relative flex items-center justify-center lg:justify-end">
             <div className="w-full relative transform lg:scale-110 lg:translate-x-10 transition-transform duration-700">
                <TiltContainer>
                    <div className="relative rounded-[40px] bg-white p-3 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.2)] border border-slate-200">
                       <div className="rounded-[32px] overflow-hidden border border-slate-100 bg-[#FAFAFA]"><DashboardSimulator /></div>
                       <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-16 -right-4 md:-right-12 w-56 bg-black text-white p-6 rounded-3xl shadow-2xl z-20 border border-white/10">
                          <div className="flex justify-between items-start mb-4"><div className="w-10 h-10 rounded-full bg-[#A9FF53] flex items-center justify-center text-black font-bold shadow-lg"><Zap className="w-5 h-5"/></div><span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cap</span></div>
                          <div className="text-3xl font-black mb-1">$5,000</div><div className="text-xs text-gray-400 font-medium">Monthly Limit Active</div>
                       </motion.div>
                       <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute -bottom-12 -left-4 md:-left-12 bg-white border border-slate-100 p-6 rounded-3xl shadow-2xl z-20 flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center"><Check className="w-6 h-6 text-slate-900"/></div>
                          <div><div className="font-bold text-slate-900 text-lg">Synced</div><div className="text-xs text-slate-400 font-bold uppercase tracking-wide">Chase • Wells • Citi</div></div>
                       </motion.div>
                    </div>
                </TiltContainer>
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-[#A9FF53] rounded-full blur-[120px] opacity-30 -z-10 transform scale-90 translate-y-20" />
             </div>
          </div>
       </div>
    </section>
);

const BentoFeatures = () => {
  return (
    <section className="py-32 px-6 bg-white relative z-10" id="features">
      <div className="max-w-7xl mx-auto">
         <div className="mb-24 text-center">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter">
               Total <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500">Control.</span>
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
               Upgrade your financial stack. Yosan replaces your spreadsheets, trackers, and banking apps with one OS.
            </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 auto-rows-[320px]">
            {/* CARD 1: ANALYTICS */}
            <FadeUp className="md:col-span-3 lg:col-span-8 bg-[#F9F9FB] rounded-[2.5rem] p-10 relative overflow-hidden group border border-slate-100 hover:border-slate-300 transition-all">
               <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-100"><Activity className="w-6 h-6 text-slate-900" /></div>
                     <h3 className="text-2xl font-bold text-slate-900">Velocity Tracking</h3>
                     <p className="text-slate-500 mt-2 max-w-sm">Real-time burn rate monitoring. Know exactly how fast you're spending.</p>
                  </div>
                  <div className="w-full h-24 flex items-end gap-2 mt-8 opacity-50 group-hover:opacity-100 transition-opacity">
                     {[30, 45, 25, 60, 80, 50, 90, 70, 40, 60, 85, 100].map((h, i) => (
                        <motion.div key={i} className="flex-1 bg-slate-900 rounded-t-sm" initial={{ height: "10%" }} whileInView={{ height: `${h}%` }} transition={{ duration: 1, delay: i * 0.05 }} />
                     ))}
                  </div>
               </div>
            </FadeUp>

            {/* CARD 2: SYNC */}
            <FadeUp delay={0.1} className="md:col-span-3 lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-10 relative overflow-hidden text-white flex flex-col justify-between group shadow-xl">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#A9FF53] blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity" />
               <div>
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md"><Zap className="w-6 h-6 text-[#A9FF53]" /></div>
                  <h3 className="text-2xl font-bold">Instant Sync</h3>
               </div>
               <div className="space-y-3">
                  {["Chase", "Amex", "Wells Fargo", "Coinbase"].map((bank, i) => (
                     <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors">
                        <span className="text-sm font-bold">{bank}</span>
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]" />
                     </div>
                  ))}
               </div>
            </FadeUp>

            {/* CARD 3: GLOBAL */}
            <FadeUp delay={0.2} className="md:col-span-2 lg:col-span-4 bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:shadow-2xl transition-all">
               <div className="w-12 h-12 bg-[#A9FF53] rounded-2xl flex items-center justify-center mb-4"><Globe className="w-6 h-6 text-black" /></div>
               <div><h3 className="text-2xl font-bold text-slate-900">Multi-Currency</h3><p className="text-slate-500 mt-2 text-sm">USD, EUR, GBP, JPY. Auto-converted.</p></div>
               <div className="flex gap-2 mt-4"><div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">$</div><div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">€</div><div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">£</div></div>
            </FadeUp>

            {/* CARD 4: STACKS */}
            <FadeUp delay={0.3} className="md:col-span-4 lg:col-span-8 bg-[#F9F9FB] rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-8 group overflow-hidden border border-slate-100">
               <div className="flex-1 relative z-10">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 border border-slate-200"><LayoutGrid className="w-6 h-6 text-slate-900" /></div>
                  <h3 className="text-2xl font-bold text-slate-900">Project Stacks</h3><p className="text-slate-500 mt-2">Isolate expenses by client, gig, or goal. Keep your main balance clean.</p>
               </div>
               <div className="relative w-48 h-40">
                  <div className="absolute top-0 left-0 w-40 h-24 bg-white border border-slate-200 rounded-2xl shadow-sm z-30 flex items-center justify-center transform group-hover:-translate-y-4 transition-transform"><span className="font-bold text-slate-900">Main</span></div>
                  <div className="absolute top-4 left-4 w-40 h-24 bg-slate-100 border border-slate-200 rounded-2xl shadow-sm z-20 flex items-center justify-center transform group-hover:translate-x-4 transition-transform"><span className="font-bold text-slate-400">Freelance</span></div>
                  <div className="absolute top-8 left-8 w-40 h-24 bg-slate-900 border border-slate-900 rounded-2xl shadow-sm z-10 flex items-center justify-center transform group-hover:translate-y-4 transition-transform"><span className="font-bold text-[#A9FF53]">Startup</span></div>
               </div>
            </FadeUp>
         </div>
      </div>
    </section>
  );
}

const SecurityHolo = () => (
   <section className="py-32 px-6 bg-white overflow-hidden relative border-t border-slate-100" id="security">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
         <FadeUp>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-8 tracking-tighter">Vault-Grade <br/> Security.</h2>
            <div className="space-y-8">
               <div className="flex gap-4"><div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0"><Lock className="w-6 h-6 text-slate-900" /></div><div><h3 className="text-xl font-bold text-slate-900">Local-First Encryption</h3><p className="text-slate-500 mt-2">Your data is encrypted on your device before it ever touches our servers.</p></div></div>
               <div className="flex gap-4"><div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0"><Shield className="w-6 h-6 text-slate-900" /></div><div><h3 className="text-xl font-bold text-slate-900">Read-Only Access</h3><p className="text-slate-500 mt-2">We use Plaid for read-only access. We can never move your money.</p></div></div>
            </div>
         </FadeUp>
         <FadeUp delay={0.2}>
            <div className="relative h-[500px] bg-slate-50 rounded-[3rem] border border-slate-100 flex items-center justify-center overflow-hidden">
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]" />
               <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="relative z-10 w-64 h-80 bg-white/60 backdrop-blur-xl border border-white/50 rounded-3xl shadow-2xl flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center shadow-2xl"><Lock className="w-8 h-8 text-[#A9FF53]" /></div>
                  <div className="text-center"><div className="font-bold text-slate-900 text-lg">AES-256</div><div className="text-xs text-slate-500 font-mono mt-1">ENCRYPTION ACTIVE</div></div>
               </motion.div>
               <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute w-[500px] h-[500px] border border-slate-200 rounded-full border-dashed opacity-50" />
            </div>
         </FadeUp>
      </div>
   </section>
);

const Membership = () => (
   <section className="py-32 px-6 bg-slate-50" id="pricing">
      <div className="max-w-7xl mx-auto">
         <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter">Membership.</h2>
            <p className="text-lg text-slate-500">Simple pricing for serious wealth builders.</p>
         </div>
         <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
            
            {/* FREE CARD */}
            <FadeUp>
               <div className="bg-white p-12 rounded-[3rem] border border-slate-200 hover:shadow-xl transition-all duration-300 relative group">
                  <div className="mb-8">
                     <span className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Starter</span>
                     <h3 className="text-5xl font-black text-slate-900 tracking-tighter">Free</h3>
                     <p className="text-slate-500 mt-4 text-lg">Perfect for manual tracking.</p>
                  </div>
                  <ul className="space-y-5 mb-12">
                     {["Unlimited Manual Transactions", "Basic Dashboard", "1 Project Stack", "7-Day History"].map((f,i)=>(
                        <li key={i} className="flex items-center gap-4 font-medium text-slate-600"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-slate-400" /></div> {f}</li>
                     ))}
                  </ul>
                  <button className="w-full py-5 rounded-2xl border-2 border-slate-900 font-bold text-slate-900 hover:bg-slate-900 hover:text-white transition-colors text-lg">Start Free</button>
               </div>
            </FadeUp>

            {/* EXECUTIVE CARD */}
            <FadeUp delay={0.1}>
               <div className="bg-slate-900 p-12 rounded-[3rem] text-white relative overflow-hidden shadow-2xl transform lg:scale-105 border border-white/10 group">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#A9FF53] blur-[150px] opacity-10 group-hover:opacity-20 transition-opacity" />
                  <div className="mb-10 relative z-10">
                     <span className="inline-block px-4 py-1.5 rounded-full bg-[#A9FF53] text-black text-xs font-bold uppercase tracking-widest mb-6">Executive</span>
                     <div className="flex items-baseline gap-2"><h3 className="text-6xl font-black tracking-tighter">$12</h3><span className="text-slate-400 text-lg">/month</span></div>
                     <p className="text-slate-400 mt-4 text-lg">Full automation. No limits. The complete OS.</p>
                  </div>
                  <ul className="space-y-5 mb-12 relative z-10">
                     {["Auto-Sync (15k+ Banks)", "Unlimited History", "AI Categorization", "Predictive Analytics", "Unlimited Stacks", "Priority Support"].map((f,i)=>(
                        <li key={i} className="flex items-center gap-4 font-medium text-slate-200"><div className="w-6 h-6 rounded-full bg-[#A9FF53] flex items-center justify-center shrink-0 text-black"><Check className="w-3 h-3 stroke-[3px]" /></div> {f}</li>
                     ))}
                  </ul>
                  <button className="relative z-10 w-full py-5 rounded-2xl bg-[#A9FF53] text-black font-bold hover:bg-white transition-colors text-lg shadow-[0_0_20px_rgba(169,255,83,0.3)]">Become a Member</button>
               </div>
            </FadeUp>
         </div>
      </div>
   </section>
);

const Footer = ({ onLogin }: { onLogin: () => void }) => (
   <footer className="py-32 px-6 bg-[#FAFAFA] text-center border-t border-slate-200">
      <div className="max-w-4xl mx-auto">
         <h2 className="text-6xl md:text-8xl font-black text-slate-900 mb-12 tracking-tighter">
            Manage your <br/> finance through <span className="text-[#A9FF53] bg-black px-6 italic transform -rotate-2 inline-block rounded-2xl shadow-xl">Yosan.</span>
         </h2>
         <button onClick={onLogin} className="px-16 py-6 bg-black text-white rounded-3xl font-bold text-2xl hover:scale-105 transition-transform shadow-2xl hover:shadow-black/20">
            Get Started Now
         </button>
         
         {/* CREATOR CREDITS */}
         <div className="mt-24 pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-sm font-bold text-slate-500">
             <div className="flex items-center gap-2 text-slate-900">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white text-xs shadow-lg">Y</div>
                <span className="text-lg">Yosan.</span>
             </div>
             
             <div className="flex gap-10 mt-6 md:mt-0 uppercase tracking-widest text-[10px]">
                <a href="#" className="hover:text-black transition-colors">Terms</a>
                <a href="#" className="hover:text-black transition-colors">Privacy</a>
             </div>

             <div className="mt-6 md:mt-0 text-right">
                <div className="flex items-center gap-2 justify-end group">
                   <span className="font-normal opacity-60">Architected by</span>
                   <a 
                     href="https://www.linkedin.com/in/aditya-shinde-59b998279" 
                     target="_blank" 
                     rel="noreferrer"
                     className="text-slate-900 hover:text-[#A9FF53] hover:bg-black px-2 py-1 rounded transition-all flex items-center gap-1"
                   >
                      Aditya Shinde <Linkedin className="w-3 h-3"/>
                   </a>
                </div>
                <div className="text-[10px] opacity-40 font-mono mt-1 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-end gap-1">
                   <Mail className="w-3 h-3"/> adityashindeorgx@gmail.com
                </div>
             </div>
         </div>
      </div>
   </footer>
);

export default function Landing() {
  const navigate = useNavigate();
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/overview'); 
    } catch (error) { console.error(error); }
  };

  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans selection:bg-[#A9FF53] selection:text-black overflow-x-hidden">
       <Navbar onLogin={handleLogin} />
       <Hero onLogin={handleLogin} />
       <BentoFeatures />
       <SecurityHolo />
       <Membership />
       <Footer onLogin={handleLogin} />
    </div>
  );
}