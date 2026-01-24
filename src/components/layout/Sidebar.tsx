import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, Wallet, BarChart3, Settings, 
  Layers, LogOut 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { auth } from '@/lib/firebase';

const MENU = [
  { name: 'Overview', path: '/overview', icon: LayoutGrid },
  { name: 'Vault', path: '/money', icon: Wallet },
  { name: 'Projects', path: '/projects', icon: Layers },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <motion.aside 
      initial={{ x: -20, opacity: 0 }} 
      animate={{ x: 0, opacity: 1 }} 
      className="fixed left-0 top-0 h-screen w-20 lg:w-64 bg-white border-r border-gray-100 flex flex-col justify-between py-8 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
    >
      {/* --- BRAND HEADER (YOSAN) --- */}
      <div className="px-4 lg:px-8">
         <div className="flex items-center gap-3 cursor-pointer group">
            {/* Logo Mark */}
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20 group-hover:scale-105 transition-transform duration-300">
               <span className="text-[#A9FF53] font-black text-xl font-sans">Y</span>
            </div>
            {/* Text Logo */}
            <div className="hidden lg:block">
               <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Yosan.</h1>
               <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mt-0.5 group-hover:text-[#A9FF53] transition-colors">Finance OS</p>
            </div>
         </div>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="flex-1 flex flex-col gap-2 mt-12 px-3 lg:px-6">
        {MENU.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <div className={`relative flex items-center gap-4 px-3 py-3.5 rounded-xl transition-all duration-300 group ${isActive ? 'bg-black text-[#A9FF53] shadow-lg shadow-black/10' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}>
                <item.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5px]' : 'group-hover:scale-110'}`} />
                <span className={`hidden lg:block text-xs font-bold tracking-wide ${isActive ? 'text-white' : ''}`}>
                   {item.name}
                </span>
                {isActive && (
                   <motion.div layoutId="activeDot" className="absolute right-3 w-1.5 h-1.5 bg-[#A9FF53] rounded-full hidden lg:block" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* --- FOOTER --- */}
      <div className="px-3 lg:px-6">
         <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-4 px-3 py-3.5 rounded-xl text-red-500 hover:bg-red-50 transition-all group"
         >
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
               <LogOut className="w-4 h-4" />
            </div>
            <span className="hidden lg:block text-xs font-bold">Sign Out</span>
         </button>
      </div>
    </motion.aside>
  );
}