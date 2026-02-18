import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Play, Check, Leaf, Wind, 
  Activity, Layers, Sparkles, Coffee, 
  ShoppingBag, Music, Plane, Heart
} from 'lucide-react';

// --- UTILS ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// --- ANIMATION WRAPPERS ---

const FadeUp = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.65, 0.3, 0.9] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const ParallaxText = ({ children, baseVelocity = 100 }: { children: string, baseVelocity: number }) => {
  return (
    <div className="overflow-hidden flex whitespace-nowrap">
      <motion.div 
        className="text-[12rem] font-bold text-slate-50 uppercase leading-[0.85] tracking-tighter"
        animate={{ x: [0, -1000] }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      >
        {children} {children} {children} {children}
      </motion.div>
    </div>
  );
};

// --- COMPONENTS ---

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-6 pointer-events-none">
    <motion.div 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white/80 backdrop-blur-md border border-slate-100/50 rounded-full px-6 py-3 md:px-8 md:py-4 flex items-center justify-between w-full max-w-5xl shadow-sm pointer-events-auto"
    >
      <div className="flex items-center gap-2 cursor-pointer group">
        <div className="w-8 h-8 bg-[#A9FF53] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
           <span className="font-bold text-slate-900 text-xs">Y</span>
        </div>
        <span className="font-semibold text-slate-900 tracking-tight text-lg">Yosan</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
        {['Philosophy', 'Features', 'Pricing', 'Manifesto'].map((item) => (
           <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-slate-900 transition-colors relative group">
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#A9FF53] transition-all group-hover:w-full"/>
           </a>
        ))}
      </div>

      <div className="flex gap-4">
        <button className="hidden md:block text-slate-900 font-medium text-sm hover:opacity-70 transition-opacity">Log in</button>
        <button className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#A9FF53] hover:text-black transition-all hover:shadow-lg hover:shadow-[#A9FF53]/20">
          Get Started
        </button>
      </div>
    </motion.div>
  </nav>
);

// Reuse your Dashboard Component (It was perfect)
const DashboardSimulator = () => {
  const [step, setStep] = useState(0);
  useEffect(() => { 
    const t = setInterval(() => setStep((p) => (p + 1) % 3), 3500); 
    return () => clearInterval(t); 
  }, []);

  return (
    <div className="relative w-full aspect-[16/10] bg-white rounded-[32px] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden ring-1 ring-slate-900/5">
       <div className="h-14 bg-white/50 backdrop-blur-sm border-b border-slate-50 flex items-center px-6 gap-2 z-20 relative">
          <div className="w-3 h-3 rounded-full bg-slate-200"/>
          <div className="w-3 h-3 rounded-full bg-slate-200"/>
       </div>
       <div className="absolute inset-0 top-14 p-8 md:p-12 bg-[#FDFDFD]">
          <AnimatePresence mode="wait">
             {step === 0 && (
                <motion.div key="input" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, filter:"blur(8px)"}} className="h-full flex flex-col items-center justify-center text-center">
                   <span className="text-xs font-bold text-[#A9FF53] bg-slate-900 px-3 py-1 rounded-full uppercase tracking-wider mb-8">Step 1: Input</span>
                   <h3 className="text-3xl md:text-4xl font-semibold text-slate-800 mb-4">Monthly Income?</h3>
                   <span className="text-6xl md:text-7xl font-light text-slate-900 tracking-tighter">$8,400</span>
                </motion.div>
             )}
             {step === 1 && (
                <motion.div key="process" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="h-full flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-4">
                   {[{l:"Essentials",v:"50%",c:"bg-slate-100"},{l:"Lifestyle",v:"30%",c:"bg-[#F1F8E9]"}, {l:"Savings",v:"20%",c:"bg-[#A9FF53]"}].map((x,i)=>(
                      <div key={i} className="flex justify-between w-full items-center px-6 py-5 bg-white border border-slate-50 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform duration-300">
                         <div className="flex items-center gap-4"><div className={`w-3 h-3 rounded-full ${x.c === 'bg-[#A9FF53]' ? 'bg-[#A9FF53]' : 'bg-slate-200'}`}/> <span className="font-medium text-lg text-slate-600">{x.l}</span></div><span className="font-bold text-xl text-slate-900">{x.v}</span>
                      </div>
                   ))}
                </motion.div>
             )}
             {step === 2 && (
                <motion.div key="dashboard" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="h-full flex flex-col gap-6">
                   <div className="flex justify-between items-end">
                      <div><div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Free to Spend</div><div className="text-6xl font-light text-slate-900 tracking-tighter">$2,140</div></div>
                      <div className="w-14 h-14 bg-[#A9FF53] rounded-full flex items-center justify-center text-slate-900 shadow-xl shadow-[#A9FF53]/20 animate-bounce"><Sparkles className="w-7 h-7"/></div>
                   </div>
                   <div className="flex-1 flex items-end justify-between px-2 gap-3 pb-2">
                      {[35, 55, 45, 80, 65, 95, 70, 85, 60, 90].map((h, i) => (
                        <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.05 }} className={`flex-1 rounded-t-xl ${i === 5 ? 'bg-[#A9FF53]' : 'bg-slate-100'}`} />
                      ))}
                   </div>
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
};

const Hero = () => (
  <section className="relative min-h-[110vh] pt-40 pb-20 px-6 overflow-hidden bg-[#FAFAFA] flex flex-col items-center">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-[#A9FF53]/15 blur-[150px] rounded-full mix-blend-multiply" />
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-blue-100/60 blur-[150px] rounded-full mix-blend-multiply" />
      </div>

      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-16 items-center relative z-10">
        <div className="lg:col-span-5 flex flex-col justify-center text-center lg:text-left">
          <FadeUp>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-100 text-xs font-semibold text-slate-500 mb-8 shadow-sm hover:shadow-md transition-shadow cursor-default">
              <Leaf className="w-3 h-3 text-[#A9FF53]" />
              <span>Financial Clarity Reimagined</span>
            </div>
            
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-semibold text-slate-900 tracking-tight leading-[0.95] mb-8">
              Money,<br />
              <span className="relative z-10 inline-block text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900">
                simplified.
                <svg className="absolute w-full h-4 -bottom-1 left-0 -z-10 text-[#A9FF53]" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="6" fill="none" opacity="0.6" />
                </svg>
              </span>
            </h1>
            
            <p className="text-xl text-slate-500 leading-relaxed mb-10 max-w-md mx-auto lg:mx-0 font-light">
              Yosan brings the Japanese art of <span className="italic text-slate-900 font-medium">Kakeibo</span> to your pocket. Mindful spending, automated saving, zero stress.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="group px-8 py-5 bg-slate-900 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-[#A9FF53] hover:text-black transition-all shadow-xl shadow-slate-200 hover:-translate-y-1">
                Start your Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-5 bg-white text-slate-900 border border-slate-200 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors">
                <Play className="w-4 h-4 fill-slate-900" /> Watch Demo
              </button>
            </div>
          </FadeUp>
        </div>

        <div className="lg:col-span-7 relative perspective-1000">
           <FadeUp delay={0.2}>
              <div className="absolute top-20 right-20 w-32 h-32 bg-[#A9FF53] rounded-full blur-[60px] opacity-40 animate-pulse" />
              <motion.div 
                whileHover={{ rotateY: 5, rotateX: -5 }}
                transition={{ type: "spring", stiffness: 50 }}
                className="relative"
              >
                 <DashboardSimulator />
                 {/* Floating Badges */}
                 <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-8 -right-8 bg-white p-4 rounded-2xl shadow-xl border border-slate-50 flex items-center gap-3 z-30">
                    <div className="w-10 h-10 bg-[#E3F2FD] rounded-full flex items-center justify-center text-blue-500"><Wind className="w-5 h-5" /></div>
                    <div><div className="text-[10px] text-slate-400 font-bold uppercase">Status</div><div className="text-sm font-bold text-slate-900">Balanced</div></div>
                 </motion.div>
                 <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute -bottom-8 -left-8 bg-white p-4 rounded-2xl shadow-xl border border-slate-50 flex items-center gap-3 z-30">
                    <div className="w-10 h-10 bg-[#F1F8E9] rounded-full flex items-center justify-center text-green-600"><Check className="w-5 h-5" /></div>
                    <div><div className="text-[10px] text-slate-400 font-bold uppercase">Goal</div><div className="text-sm font-bold text-slate-900">On Track</div></div>
                 </motion.div>
              </motion.div>
           </FadeUp>
        </div>
      </div>
  </section>
);

const LogoTicker = () => (
  <section className="py-12 border-y border-slate-100 bg-white overflow-hidden">
    <div className="flex gap-20 animate-infinite-scroll whitespace-nowrap min-w-full px-4 items-center opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
      {[...Array(4)].map((_, i) => (
        <React.Fragment key={i}>
           {['Acme Inc', 'Monzo', 'Linear', 'Notion', 'Wealthfront', 'Robinhood'].map((logo, idx) => (
             <span key={`${i}-${idx}`} className="text-2xl font-black text-slate-300 uppercase tracking-tighter mx-8">{logo}</span>
           ))}
        </React.Fragment>
      ))}
    </div>
  </section>
);

const Features = () => (
  <section className="py-32 px-6 bg-white relative z-10" id="features">
    <div className="max-w-7xl mx-auto">
       <div className="text-center mb-24 max-w-2xl mx-auto">
          <FadeUp>
            <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 mb-6 tracking-tight">Design that breathes.</h2>
            <p className="text-slate-500 text-lg md:text-xl font-light">We stripped away the clutter. No complex charts, no confusing jargon. Just you and your goals.</p>
          </FadeUp>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FadeUp className="bg-[#FAFAFA] rounded-[40px] p-10 hover:bg-slate-50 transition-all duration-500 group border border-slate-100 hover:shadow-2xl hover:shadow-slate-100">
             <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 border border-slate-50">
                <Layers className="w-8 h-8 text-slate-900" />
             </div>
             <h3 className="text-2xl font-bold text-slate-900 mb-4">Holistic View</h3>
             <p className="text-slate-500 leading-relaxed text-lg">See your entire financial life in one soft, organized feed. Like a garden for your money, everything in its place.</p>
          </FadeUp>

          <FadeUp delay={0.1} className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden group shadow-2xl shadow-slate-900/10">
             <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#A9FF53] rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
             <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md border border-white/10">
                   <Activity className="w-8 h-8 text-[#A9FF53]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Organic Growth</h3>
                <p className="text-slate-400 leading-relaxed text-lg">Set goals and watch them bloom. Our algorithms adjust your daily budget based on your habits automatically.</p>
                <div className="mt-8 flex gap-2">
                   {[1,2,3].map((_,i)=>(<div key={i} className="h-1 bg-[#A9FF53] rounded-full flex-1 opacity-20 group-hover:opacity-100 transition-opacity delay-[100ms]"/>))}
                </div>
             </div>
          </FadeUp>

          <FadeUp delay={0.2} className="bg-[#FAFAFA] rounded-[40px] p-10 hover:bg-slate-50 transition-all duration-500 group border border-slate-100 hover:shadow-2xl hover:shadow-slate-100">
             <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 border border-slate-50">
                <Check className="w-8 h-8 text-slate-900" />
             </div>
             <h3 className="text-2xl font-bold text-slate-900 mb-4">Auto-Sort</h3>
             <p className="text-slate-500 leading-relaxed text-lg">Transactions are automatically categorized. You don't have to lift a finger to keep your ledger clean.</p>
          </FadeUp>
       </div>
    </div>
  </section>
);

const FlowState = () => {
   const items = [
      { i: <Coffee/>, t: "Matcha Latte", p: "$5.50", c: "bg-green-100 text-green-700" },
      { i: <ShoppingBag/>, t: "Uniqlo", p: "$45.00", c: "bg-blue-100 text-blue-700" },
      { i: <Music/>, t: "Spotify", p: "$9.99", c: "bg-purple-100 text-purple-700" },
      { i: <Plane/>, t: "Flight to Tokyo", p: "$650.00", c: "bg-orange-100 text-orange-700" },
      { i: <Heart/>, t: "Donation", p: "$25.00", c: "bg-pink-100 text-pink-700" },
   ];

   return (
      <section className="py-24 bg-[#FAFAFA] overflow-hidden border-t border-slate-100">
         <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center px-6">
            <div className="order-2 lg:order-1 relative h-[500px] w-full bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
               <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white z-10"/>
               <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white z-10"/>
               
               <div className="absolute inset-0 flex flex-col gap-4 p-8 animate-infinite-scroll-y">
                  {[...items, ...items, ...items].map((item, i) => (
                     <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-lg transition-all duration-300 cursor-default">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.c}`}>{item.i}</div>
                           <span className="font-bold text-slate-700">{item.t}</span>
                        </div>
                        <span className="font-medium text-slate-900">{item.p}</span>
                     </div>
                  ))}
               </div>
            </div>
            
            <div className="order-1 lg:order-2">
               <FadeUp>
                  <div className="w-16 h-16 bg-[#A9FF53] rounded-full flex items-center justify-center mb-6">
                     <Wind className="w-8 h-8 text-slate-900" />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 mb-6">Flow State.</h2>
                  <p className="text-xl text-slate-500 font-light leading-relaxed">
                     Your transactions flow in like water. Yosan catches them, sorts them, and presents them beautifully. No spreadsheets, no manual entry.
                  </p>
                  <div className="mt-8 flex gap-8">
                     <div><h4 className="text-3xl font-bold text-slate-900">0s</h4><span className="text-slate-400">Lag Time</span></div>
                     <div><h4 className="text-3xl font-bold text-slate-900">100%</h4><span className="text-slate-400">Automated</span></div>
                  </div>
               </FadeUp>
            </div>
         </div>
      </section>
   );
};

const Testimonials = () => (
   <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-20">
         <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#A9FF53] blur-[150px] rounded-full" />
      </div>
      <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
         <div className="mb-12"><span className="text-[#A9FF53] text-6xl font-serif">"</span></div>
         <h2 className="text-3xl md:text-5xl font-light leading-snug mb-12">
            I used to dread checking my bank account. Yosan turned that anxiety into a daily ritual of calm. It's not just a finance app, it's peace of mind.
         </h2>
         <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-700 rounded-full overflow-hidden border-2 border-[#A9FF53]">
               <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100" alt="User" className="w-full h-full object-cover"/>
            </div>
            <div>
               <div className="font-bold text-lg">Elena K.</div>
               <div className="text-[#A9FF53] text-sm">Product Designer, Kyoto</div>
            </div>
         </div>
      </div>
   </section>
);

const CTA = () => (
  <section className="py-32 px-6 bg-white flex flex-col items-center justify-center text-center overflow-hidden relative" id="manifesto">
     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#FAFAFA_0%,white_100%)]" />
     <div className="relative z-10 max-w-3xl">
        <h2 className="text-6xl md:text-9xl font-bold text-slate-900 tracking-tighter mb-8">
           Start <span className="text-[#A9FF53]">Now.</span>
        </h2>
        <p className="text-xl md:text-2xl text-slate-500 font-light mb-12 max-w-xl mx-auto">
           Join 10,000+ others who have found financial clarity. No credit card required for the 14-day trial.
        </p>
        <button className="px-12 py-6 bg-slate-900 text-white rounded-full font-bold text-xl hover:bg-[#A9FF53] hover:text-black hover:scale-105 transition-all shadow-2xl">
           Download Yosan
        </button>
        <div className="mt-8 text-sm text-slate-400">Available on iOS & Android</div>
     </div>
  </section>
);

const Footer = () => (
   <footer className="bg-white border-t border-slate-100 py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
         <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#A9FF53] rounded-full"/>
            <span className="text-xl font-bold tracking-tight text-slate-900">Yosan.</span>
         </div>
         <div className="flex gap-8 text-slate-500 text-sm font-medium">
            <a href="#" className="hover:text-[#A9FF53] transition-colors">Manifesto</a>
            <a href="#" className="hover:text-[#A9FF53] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#A9FF53] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#A9FF53] transition-colors">Twitter</a>
         </div>
         <div className="text-slate-400 text-xs">
            © 2026 Yosan Inc. Crafted with care.
         </div>
      </div>
   </footer>
);

// --- MAIN APP ---

export default function App() {
  return (
    <div className="bg-[#FAFAFA] min-h-screen text-slate-900 font-sans selection:bg-[#A9FF53] selection:text-black">
      <Navbar />
      <Hero />
      <LogoTicker />
      <Features />
      <FlowState />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
