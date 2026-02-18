import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate, AnimatePresence, useInView } from 'framer-motion';
import { 
  ArrowRight, Play, Check, Leaf, Wind, 
  Activity, Layers, Sparkles, Menu, X
} from 'lucide-react';

// --- UTILS ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// --- ANIMATION COMPONENTS ---

const FadeUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.65, 0.3, 0.9] }} // Soft "organic" ease
      className={className}
    >
      {children}
    </motion.div>
  );
};

// --- THE RESTORED DASHBOARD SIMULATOR ---
// Updated with a cleaner, "Paper" aesthetic to match the new vibe
const DashboardSimulator = () => {
  const [step, setStep] = useState(0);

  // Cycle through steps every 3 seconds
  useEffect(() => { 
    const t = setInterval(() => setStep((p) => (p + 1) % 3), 3000); 
    return () => clearInterval(t); 
  }, []);

  return (
    <div className="relative w-full aspect-[16/10] bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden ring-1 ring-slate-900/5">
       {/* Minimal Window Header */}
       <div className="h-12 bg-white/50 backdrop-blur-sm border-b border-slate-50 flex items-center px-5 gap-2 z-20 relative">
          <div className="w-3 h-3 rounded-full bg-slate-200"/>
          <div className="w-3 h-3 rounded-full bg-slate-200"/>
       </div>
       
       <div className="absolute inset-0 top-12 p-8 bg-[#FDFDFD]">
          <AnimatePresence mode="wait">
             {step === 0 && (
                <motion.div 
                  key="input" 
                  initial={{opacity:0, scale: 0.95}} 
                  animate={{opacity:1, scale: 1}} 
                  exit={{opacity:0, filter: "blur(4px)"}} 
                  className="h-full flex flex-col items-center justify-center text-center"
                >
                   <span className="text-xs font-medium text-[#A9FF53] bg-black px-3 py-1 rounded-full uppercase tracking-wider mb-6">Step 1</span>
                   <h3 className="text-2xl font-semibold text-slate-800 mb-2">Monthly Income?</h3>
                   <span className="text-6xl font-light text-slate-900 tracking-tight">$5,000</span>
                </motion.div>
             )}
             
             {step === 1 && (
                <motion.div 
                  key="process" 
                  initial={{opacity:0, y:20}} 
                  animate={{opacity:1, y:0}} 
                  exit={{opacity:0, y:-20}} 
                  className="h-full flex flex-col items-center justify-center w-full max-w-sm mx-auto space-y-4"
                >
                   {[{l:"Essentials",v:"50%",c:"bg-slate-100"},{l:"Lifestyle",v:"30%",c:"bg-[#E8F5E9]"}, {l:"Savings",v:"20%",c:"bg-[#A9FF53]"}].map((x,i)=>(
                      <div key={i} className="flex justify-between w-full items-center px-6 py-4 bg-white border border-slate-50 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${x.c === 'bg-[#A9FF53]' ? 'bg-[#A9FF53]' : 'bg-slate-300'}`}/> 
                            <span className="font-medium text-slate-600">{x.l}</span>
                         </div>
                         <span className="font-bold text-slate-900">{x.v}</span>
                      </div>
                   ))}
                </motion.div>
             )}
             
             {step === 2 && (
                <motion.div 
                  key="dashboard" 
                  initial={{opacity:0}} 
                  animate={{opacity:1}} 
                  exit={{opacity:0}} 
                  className="h-full flex flex-col gap-6"
                >
                   <div className="flex justify-between items-end">
                      <div>
                         <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Free to Spend</div>
                         <div className="text-5xl font-light text-slate-900">$1,240</div>
                      </div>
                      <div className="w-12 h-12 bg-[#A9FF53] rounded-2xl flex items-center justify-center text-slate-900 shadow-lg shadow-[#A9FF53]/30">
                         <Sparkles className="w-6 h-6"/>
                      </div>
                   </div>
                   <div className="flex-1 flex items-end justify-between px-2 gap-2">
                      {[35, 55, 45, 80, 65, 95, 70].map((h, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ height: 0 }} 
                          animate={{ height: `${h}%` }} 
                          transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.1 }}
                          className={`flex-1 rounded-t-lg ${i === 5 ? 'bg-[#A9FF53]' : 'bg-slate-100'}`} 
                        />
                      ))}
                   </div>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
};

// --- SECTIONS ---

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-6">
    <motion.div 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white/80 backdrop-blur-md border border-slate-100/50 rounded-full px-8 py-4 flex items-center justify-between w-full max-w-6xl shadow-sm"
    >
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-[#A9FF53] rounded-full" />
        <span className="font-semibold text-slate-900 tracking-tight text-lg">Yosan</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
        <a href="#" className="hover:text-slate-900 transition-colors">Manifesto</a>
        <a href="#" className="hover:text-slate-900 transition-colors">Features</a>
        <a href="#" className="hover:text-slate-900 transition-colors">Pricing</a>
      </div>

      <div className="flex gap-4">
        <button className="hidden md:block text-slate-900 font-medium text-sm">Log in</button>
        <button className="bg-slate-900 text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-[#A9FF53] hover:text-black transition-all">
          Get Started
        </button>
      </div>
    </motion.div>
  </nav>
);

const Hero = () => {
  return (
    <section className="relative min-h-screen pt-40 pb-20 px-6 overflow-hidden bg-[#FAFAFA]">
      
      {/* Background Decor: Soft "Zen" Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#A9FF53]/20 blur-[120px] rounded-full mix-blend-multiply opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100 blur-[100px] rounded-full mix-blend-multiply opacity-60" />
      </div>

      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Text Side */}
        <div className="lg:col-span-5 flex flex-col justify-center text-center lg:text-left">
          <FadeUp>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-100 text-xs font-medium text-slate-500 mb-8 shadow-sm">
              <Leaf className="w-3 h-3 text-[#A9FF53]" />
              <span>Financial Clarity Reimagined</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold text-slate-900 tracking-tight leading-[1.1] mb-8">
              Money,<br />
              <span className="relative z-10 inline-block">
                simplified.
                {/* Underline decoration */}
                <svg className="absolute w-full h-3 -bottom-1 left-0 -z-10 text-[#A9FF53]" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.6" />
                </svg>
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-500 leading-relaxed mb-10 max-w-md mx-auto lg:mx-0 font-light">
              Yosan brings the Japanese concept of <span className="italic text-slate-800">Kakeibo</span> to the digital age. Mindful spending, automated saving.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="group px-8 py-4 bg-slate-900 text-white rounded-2xl font-medium text-lg flex items-center justify-center gap-3 hover:bg-[#A9FF53] hover:text-black transition-all shadow-xl shadow-slate-200">
                Start your Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-medium text-lg flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors">
                <Play className="w-4 h-4 fill-slate-900" /> Watch Demo
              </button>
            </div>
          </FadeUp>
        </div>

        {/* Animation Side */}
        <div className="lg:col-span-7">
           <FadeUp delay={0.2} className="relative">
              {/* Decorative elements behind the dashboard */}
              <div className="absolute top-10 right-10 w-24 h-24 bg-[#A9FF53] rounded-full blur-2xl opacity-20 animate-pulse" />
              
              <div className="relative transform lg:rotate-[-2deg] hover:rotate-0 transition-transform duration-700 ease-out">
                 <DashboardSimulator />
              </div>

              {/* Floating Badge */}
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-50 flex items-center gap-3"
              >
                 <div className="w-10 h-10 bg-[#E8F5E9] rounded-full flex items-center justify-center text-green-600">
                    <Wind className="w-5 h-5" />
                 </div>
                 <div>
                    <div className="text-xs text-slate-400 font-bold uppercase">Status</div>
                    <div className="text-sm font-bold text-slate-900">Balanced</div>
                 </div>
              </motion.div>
           </FadeUp>
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
          <p className="text-slate-500 text-lg">We stripped away the clutter. No complex charts, no confusing jargon. Just you and your goals.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Focus */}
          <FadeUp className="bg-[#FAFAFA] rounded-[32px] p-8 hover:bg-[#F5F5F7] transition-colors group border border-slate-100">
             <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Layers className="w-7 h-7 text-slate-900" />
             </div>
             <h3 className="text-2xl font-bold text-slate-900 mb-3">Holistic View</h3>
             <p className="text-slate-500 leading-relaxed">See your entire financial life in one soft, organized feed. Like a garden for your money.</p>
          </FadeUp>

          {/* Card 2: Growth (Featured) */}
          <FadeUp delay={0.1} className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#A9FF53] rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity" />
             <div className="relative z-10">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                   <Activity className="w-7 h-7 text-[#A9FF53]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Organic Growth</h3>
                <p className="text-slate-400 leading-relaxed">Set goals and watch them bloom. Our algorithms adjust your daily budget based on your habits.</p>
             </div>
          </FadeUp>

          {/* Card 3: Peace */}
          <FadeUp delay={0.2} className="bg-[#FAFAFA] rounded-[32px] p-8 hover:bg-[#F5F5F7] transition-colors group border border-slate-100">
             <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Check className="w-7 h-7 text-slate-900" />
             </div>
             <h3 className="text-2xl font-bold text-slate-900 mb-3">Auto-Sort</h3>
             <p className="text-slate-500 leading-relaxed">Transactions are automatically categorized. You don't have to lift a finger.</p>
          </FadeUp>

       </div>
    </div>
  </section>
);

const Footer = () => (
   <footer className="bg-white border-t border-slate-100 py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
         <div className="text-2xl font-bold tracking-tighter text-slate-900">
            Yosan.
         </div>
         <div className="flex gap-8 text-slate-500 text-sm font-medium">
            <a href="#" className="hover:text-[#A9FF53] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#A9FF53] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#A9FF53] transition-colors">Twitter</a>
         </div>
         <div className="text-slate-400 text-xs">
            © 2026 Yosan Inc. Crafted in Kyoto.
         </div>
      </div>
   </footer>
)

// --- MAIN APP ---

export default function App() {
  return (
    <div className="bg-[#FAFAFA] min-h-screen text-slate-900 font-sans selection:bg-[#A9FF53] selection:text-black">
      <Navbar />
      <Hero />
      <BentoGrid />
      <Footer />
    </div>
  );
}
