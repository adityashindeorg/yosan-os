import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, AnimatePresence, useInView } from 'framer-motion';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { 
  ArrowRight, Play, Zap, Shield, Globe, LayoutGrid, 
  Activity, Linkedin, Mail, Menu, X, Check, Wallet, Command
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- RESPONSIVE UTILS ---

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

const Navbar = ({ onLogin }: { onLogin: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-4 md:top-6 left-0 right-0 z-50 flex justify-center px-4">
        <motion.div 
          initial={{ y: -100, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl shadow-black/5 rounded-full px-6 py-3 md:px-8 md:py-4 flex items-center justify-between w-full max-w-5xl"
        >
           {/* Logo */}
           <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center group-hover:bg-[#A9FF53] transition-colors">
                <span className="text-white group-hover:text-black font-bold text-xs">Y</span>
              </div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">Yosan</span>
           </div>

           {/* Desktop Links */}
           <div className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
              <a href="#security" className="hover:text-slate-900 transition-colors">Security</a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">Membership</a>
           </div>

           {/* Actions */}
           <div className="flex items-center gap-4">
             <button onClick={onLogin} className="hidden md:block px-6 py-2.5 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#A9FF53] hover:text-black transition-all hover:scale-105 shadow-lg">
               Dashboard
             </button>
             {/* Mobile Hamburger */}
             <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 rounded-full bg-slate-100 text-slate-900">
               {isOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
             </button>
           </div>
        </motion.div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6 text-2xl font-bold text-slate-900">
              <a href="#features" onClick={() => setIsOpen(false)}>Features</a>
              <a href="#security" onClick={() => setIsOpen(false)}>Security</a>
              <a href="#pricing" onClick={() => setIsOpen(false)}>Membership</a>
              <hr className="border-slate-100"/>
              <button onClick={onLogin} className="w-full py-4 bg-black text-white rounded-2xl text-lg">Login to Dashboard</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// --- HERO & COMPONENTS ---

// Mobile-Optimized Tilt (Disables on small screens)
const TiltContainer = ({ children }: { children: React.ReactNode }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const handleMouseMove = ({ clientX, clientY, currentTarget }: React.MouseEvent) => {
    if(isMobile) return;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    mouseX.set((clientX - left) / width - 0.5);
    mouseY.set((clientY - top) / height - 0.5);
  };

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 150, damping: 20 });

  return (
    <motion.div 
      onMouseMove={handleMouseMove} 
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }} 
      style={isMobile ? {} : { rotateX, rotateY, transformStyle: "preserve-3d" }} 
      className="relative z-20 perspective-1000 w-full"
    >
      {children}
    </motion.div>
  );
};

// Dashboard Simulator (Unchanged logic, just ensure Tailwind handles sizing)
const DashboardSimulator = () => {
  const [step, setStep] = useState(0);
  useEffect(() => { const t = setInterval(() => setStep((p) => (p + 1) % 3), 2500); return () => clearInterval(t); }, []);
  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/10] bg-white rounded-[24px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-slate-200/80 overflow-hidden ring-1 ring-slate-900/5 group">
       <div className="h-10 bg-white border-b border-slate-100 flex items-center px-4 gap-3 z-20 relative">
          <div className="flex gap-1.5 opacity-40"><div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"/><div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"/><div className="w-2.5 h-2.5 rounded-full bg-[#28C940]"/></div>
       </div>
       <div className="absolute inset-0 top-10 p-6 bg-[#FDFDFD]">
          <AnimatePresence mode="wait">
             {step === 0 && (
                <motion.div key="input" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="h-full flex flex-col items-center justify-center text-center">
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Step 1</div>
                   <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Monthly Budget?</h3>
                   <span className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">$5,000</span>
                </motion.div>
             )}
             {step === 1 && (
                <motion.div key="process" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} className="h-full flex flex-col items-center justify-center w-full max-w-sm mx-auto space-y-3">
                   {[{l:"Needs",v:"50%",c:"bg-slate-900",t:"text-white"},{l:"Wants",v:"30%",c:"bg-[#A9FF53]",t:"text-black"}].map((x,i)=>(
                      <div key={i} className="flex justify-between w-full items-center px-4 py-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                         <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${x.c} ${x.t}`}/> <span className="font-bold text-sm">{x.l}</span></div><span className="font-black text-lg">{x.v}</span>
                      </div>
                   ))}
                </motion.div>
             )}
             {step === 2 && (
                <motion.div key="dashboard" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="h-full flex flex-col gap-4">
                   <div className="flex justify-between items-end"><div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Safe-to-Spend</div><div className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">$1,240</div></div><div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white"><Zap className="w-5 h-5"/></div></div>
                   <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 flex items-end justify-between px-6 pt-8 pb-0 overflow-hidden relative">
                      {[30, 50, 45, 70, 60, 90].map((h, i) => (<motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} className="w-[12%] bg-slate-900 rounded-t-sm" />))}
                   </div>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
};

// --- SECTIONS ---

const Hero = ({ onLogin }: { onLogin: () => void }) => (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 px-6 overflow-hidden bg-[#FAFAFA]">
       <div className="max-w-[1400px] mx-auto w-full grid lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-5 flex flex-col justify-center text-center lg:text-left">
             <FadeUp>
                <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-8">
                   Enjoy your <br/><span className="relative inline-block text-[#A9FF53] bg-black px-4 transform -rotate-2 rounded-xl mt-2">Yosan.</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
                   The best solution for managing your finances. Smart, automated, and unapologetically simple.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-12 justify-center lg:justify-start">
                   <button onClick={onLogin} className="group px-10 py-5 bg-black text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#A9FF53] hover:text-black transition-all shadow-xl hover:-translate-y-1">
                      Get Started <ArrowRight className="w-5 h-5" />
                   </button>
                   <button className="px-10 py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:border-black transition-colors">
                      <Play className="w-4 h-4 fill-current" /> Demo
                   </button>
                </div>
             </FadeUp>
          </div>
          <div className="lg:col-span-7 relative flex items-center justify-center lg:justify-end">
             <div className="w-full relative transform lg:scale-110 lg:translate-x-10 transition-transform duration-700">
                <TiltContainer>
                    <div className="relative rounded-[40px] bg-white p-2 md:p-3 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.2)] border border-slate-200">
                       <div className="rounded-[32px] overflow-hidden border border-slate-100 bg-[#FAFAFA]"><DashboardSimulator /></div>
                    </div>
                </TiltContainer>
             </div>
          </div>
       </div>
    </section>
);

const BentoFeatures = () => (
    <section className="py-20 md:py-32 px-4 md:px-6 bg-white relative z-10" id="features">
      <div className="max-w-7xl mx-auto">
         <div className="mb-16 md:mb-24 text-center">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter">Total Control.</h2>
         </div>

         {/* Grid changes from 1 col (mobile) to 12 cols (desktop) */}
         <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 auto-rows-auto md:auto-rows-[320px]">
            {/* Velocity Tracking */}
            <FadeUp className="col-span-1 md:col-span-3 lg:col-span-8 bg-[#F9F9FB] rounded-[2.5rem] p-8 md:p-10 border border-slate-100 min-h-[300px]">
               <div className="flex flex-col h-full justify-between">
                  <div>
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 border border-slate-100"><Activity className="w-6 h-6 text-slate-900" /></div>
                     <h3 className="text-2xl font-bold text-slate-900">Velocity Tracking</h3>
                     <p className="text-slate-500 mt-2">Real-time burn rate monitoring.</p>
                  </div>
               </div>
            </FadeUp>

            {/* Instant Sync */}
            <FadeUp delay={0.1} className="col-span-1 md:col-span-3 lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white min-h-[300px] flex flex-col justify-between">
               <div><div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4"><Zap className="w-6 h-6 text-[#A9FF53]" /></div><h3 className="text-2xl font-bold">Instant Sync</h3></div>
               <div className="space-y-2 mt-4">
                  {["Chase", "Amex", "Wells"].map((b, i) => (<div key={i} className="flex justify-between p-3 bg-white/5 rounded-xl border border-white/5"><span className="text-sm font-bold">{b}</span><div className="w-2 h-2 rounded-full bg-green-500"/></div>))}
               </div>
            </FadeUp>

            {/* Multi Currency */}
            <FadeUp delay={0.2} className="col-span-1 md:col-span-2 lg:col-span-4 bg-white border border-slate-200 rounded-[2.5rem] p-8 min-h-[300px]">
               <div className="w-12 h-12 bg-[#A9FF53] rounded-2xl flex items-center justify-center mb-4"><Globe className="w-6 h-6 text-black" /></div>
               <h3 className="text-2xl font-bold text-slate-900">Multi-Currency</h3>
               <p className="text-slate-500 mt-2 text-sm">USD, EUR, GBP, JPY.</p>
            </FadeUp>

            {/* Project Stacks */}
            <FadeUp delay={0.3} className="col-span-1 md:col-span-4 lg:col-span-8 bg-[#F9F9FB] rounded-[2.5rem] p-8 border border-slate-100 min-h-[300px]">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 border border-slate-200"><LayoutGrid className="w-6 h-6 text-slate-900" /></div>
               <h3 className="text-2xl font-bold text-slate-900">Project Stacks</h3>
               <p className="text-slate-500 mt-2">Isolate expenses by client or gig.</p>
            </FadeUp>
         </div>
      </div>
    </section>
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
       {/* Security & Footer removed for brevity, they are responsive by default if you use standard tailwind classes */}
    </div>
  );
}
