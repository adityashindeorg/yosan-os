import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionTemplate, useMotionValue, AnimatePresence, useInView } from 'framer-motion';
import { 
  ArrowRight, Play, Zap, Shield, Globe, LayoutGrid, 
  Activity, Command, Terminal, Cpu, Lock, ChevronRight, Check
} from 'lucide-react';

// --- UTILS & HOOKS ---

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// --- MICRO-INTERACTION COMPONENTS ---

const MouseSpotlight = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className={cn("group relative border border-white/10 bg-white/5 overflow-hidden", className)}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(169, 255, 83, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
};

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// --- UI COMPONENTS ---

const Navbar = () => (
  <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4">
    <motion.div 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-8 shadow-2xl shadow-black/50"
    >
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-[#A9FF53] rounded-sm animate-pulse" />
        <span className="font-mono font-bold text-white tracking-widest text-sm">YOSAN_OS</span>
      </div>
      
      <div className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400 uppercase tracking-widest">
        {['System', 'Modules', 'Security', 'Pricing'].map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white transition-colors">
            {item}
          </a>
        ))}
      </div>

      <button className="bg-white text-black px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide hover:bg-[#A9FF53] transition-colors">
        Login
      </button>
    </motion.div>
  </nav>
);

const Hero = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  
  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 px-6 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-black">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[#A9FF53]/20 blur-[120px] rounded-full opacity-30" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full opacity-20" />
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-16 items-center relative z-10">
        <motion.div style={{ y: y1 }} className="lg:col-span-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-[#A9FF53] mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A9FF53] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A9FF53]"></span>
            </span>
            SYSTEM V2.0 ONLINE
          </div>
          
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-medium text-white tracking-tighter leading-[0.9] mb-8">
            Financial <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A9FF53] to-emerald-400">Intelligence.</span>
          </h1>
          
          <p className="text-lg text-zinc-400 max-w-lg leading-relaxed mb-10 border-l-2 border-white/10 pl-6">
            Yosan isn't just a dashboard. It's a high-performance operating system for your capital. Automated, secure, and infinitely scalable.
          </p>

          <div className="flex flex-wrap gap-4">
            <button className="group relative px-8 py-4 bg-[#A9FF53] text-black rounded-lg font-bold overflow-hidden transition-transform hover:scale-105">
              <span className="relative z-10 flex items-center gap-2">INITIALIZE <ArrowRight className="w-4 h-4" /></span>
              <div className="absolute inset-0 bg-white/50 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
            
            <button className="px-8 py-4 bg-white/5 text-white border border-white/10 rounded-lg font-bold flex items-center gap-2 hover:bg-white/10 transition-colors">
              <Terminal className="w-4 h-4 text-zinc-400" /> DOCUMENTATION
            </button>
          </div>
        </motion.div>

        {/* 3D Dashboard Mockup */}
        <div className="lg:col-span-5 relative perspective-1000">
          <motion.div 
            initial={{ rotateX: 10, rotateY: -10, opacity: 0 }}
            animate={{ rotateX: 0, rotateY: 0, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="relative rounded-2xl bg-zinc-900/90 border border-white/10 p-2 shadow-2xl shadow-[#A9FF53]/10"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent rounded-2xl pointer-events-none" />
            {/* Simulated UI */}
            <div className="bg-black rounded-xl overflow-hidden aspect-[4/3] relative">
              <div className="h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="col-span-2 h-32 bg-white/5 rounded-lg border border-white/5 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-[#A9FF53]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#A9FF53]" />
                </div>
                <div className="h-24 bg-white/5 rounded-lg border border-white/5" />
                <div className="h-24 bg-white/5 rounded-lg border border-white/5" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const LogoTicker = () => (
  <section className="py-10 border-y border-white/5 bg-black/50 backdrop-blur-sm overflow-hidden flex">
    <div className="flex gap-16 animate-infinite-scroll whitespace-nowrap min-w-full px-4">
      {[...Array(2)].map((_, i) => (
        <React.Fragment key={i}>
          {['ACME CORP', 'KAIZAN', 'ORBITAL', 'VERTEX', 'NEXUS', 'SYNERGY', 'PULSE'].map((logo) => (
            <span key={logo} className="text-xl font-black text-zinc-700 uppercase tracking-tighter hover:text-white transition-colors cursor-default">
              {logo}
            </span>
          ))}
        </React.Fragment>
      ))}
    </div>
  </section>
);

const BentoGrid = () => (
  <section className="py-32 px-6 bg-black relative" id="modules">
    <div className="max-w-7xl mx-auto">
      <div className="mb-20">
        <h2 className="text-4xl md:text-6xl font-medium text-white mb-6">Core Modules</h2>
        <p className="text-zinc-400 max-w-xl text-lg">
          Everything you need to manage your empire. Pre-installed and ready to deploy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-auto md:h-[600px]">
        {/* Large Card */}
        <MouseSpotlight className="md:col-span-2 md:row-span-2 rounded-[2rem] p-10 flex flex-col justify-between bg-zinc-900/50">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 text-[#A9FF53]">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">Neural Engine</h3>
            <p className="text-zinc-400">Our AI analyzes 10,000+ data points to predict cash flow anomalies before they happen.</p>
          </div>
          <div className="w-full h-32 bg-gradient-to-t from-[#A9FF53]/20 to-transparent rounded-lg mt-8 border-b border-[#A9FF53]/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          </div>
        </MouseSpotlight>

        {/* Small Card 1 */}
        <MouseSpotlight className="rounded-[2rem] p-8 bg-zinc-900/50">
          <Globe className="w-8 h-8 text-blue-400 mb-4" />
          <h3 className="text-xl font-bold text-white">Global Sync</h3>
          <p className="text-sm text-zinc-500 mt-2">Real-time forex updates across 40 regions.</p>
        </MouseSpotlight>

        {/* Small Card 2 */}
        <MouseSpotlight className="rounded-[2rem] p-8 bg-zinc-900/50 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-[#A9FF53]" />
            <span className="text-[#A9FF53] font-mono text-xs uppercase border border-[#A9FF53] px-2 py-0.5 rounded-full">Secure</span>
          </div>
          <h3 className="text-xl font-bold text-white">Vault Lock</h3>
          <p className="text-sm text-zinc-500 mt-2">Biometric authentication for all high-value transfers.</p>
        </MouseSpotlight>
      </div>
    </div>
  </section>
);

const TerminalSection = () => {
  return (
    <section className="py-24 px-6 bg-[#050505] border-y border-white/5">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-center">
        <div className="flex-1">
          <h2 className="text-4xl font-medium text-white mb-6">Built for Developers.<br/>Loved by CFOs.</h2>
          <p className="text-zinc-400 mb-8">
            Access your data via our GraphQL API. Build custom workflows, trigger webhooks, and integrate with your existing stack.
          </p>
          <ul className="space-y-4">
            {['99.99% Uptime SLA', 'Webhooks & Events', 'Detailed Logs'].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-white">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                  <Check className="w-3 h-3 text-[#A9FF53]" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex-1 w-full">
          <div className="bg-[#0A0A0A] rounded-xl border border-white/10 overflow-hidden font-mono text-sm shadow-2xl">
            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="p-6 text-zinc-400 space-y-2">
              <p><span className="text-[#A9FF53]">➜</span> <span className="text-blue-400">~</span> yosan init --config=finance</p>
              <p className="text-white">Installing modules...</p>
              <p className="text-white">Verify encryption keys... <span className="text-[#A9FF53]">OK</span></p>
              <p className="text-white">Connecting to bank APIs... <span className="text-[#A9FF53]">OK</span></p>
              <p className="text-white">System ready.</p>
              <p><span className="text-[#A9FF53]">➜</span> <span className="text-blue-400">~</span> <span className="animate-pulse">_</span></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CTA = () => (
  <section className="py-32 px-6 bg-black relative overflow-hidden text-center">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(169,255,83,0.1),transparent_70%)]" />
    <div className="relative z-10 max-w-2xl mx-auto">
      <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tighter mb-8">Ready to upgrade?</h2>
      <p className="text-zinc-400 text-lg mb-10">Join 10,000+ users managing over $1B in assets on Yosan.</p>
      <button className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-[#A9FF53] transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
        Get Access Now
      </button>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-black border-t border-white/10 py-12 px-6">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-[#A9FF53] rounded-sm" />
        <span className="text-white font-bold tracking-widest">YOSAN</span>
      </div>
      <div className="text-zinc-600 text-sm">
        © 2026 Yosan Systems Inc. All systems nominal.
      </div>
      <div className="flex gap-6">
        {['Twitter', 'GitHub', 'Discord'].map((social) => (
          <a key={social} href="#" className="text-zinc-500 hover:text-white transition-colors">{social}</a>
        ))}
      </div>
    </div>
  </footer>
);

// --- MAIN APP ---

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  // Fake Boot Sequence
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-black min-h-screen text-white selection:bg-[#A9FF53] selection:text-black font-sans">
      {/* GLOBAL NOISE OVERLAY */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-[100]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} />

      <AnimatePresence>
        {isLoading ? (
          <motion.div 
            key="loader"
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black flex items-center justify-center font-mono text-[#A9FF53]"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-[#A9FF53] border-t-transparent rounded-full animate-spin" />
              <p className="animate-pulse">INITIALIZING CORE...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
            <Navbar />
            <Hero />
            <LogoTicker />
            <BentoGrid />
            <TerminalSection />
            <CTA />
            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Add this to your index.css or global css file for the infinite scroll
/* @keyframes infinite-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.animate-infinite-scroll {
  animation: infinite-scroll 25s linear infinite;
}
*/
