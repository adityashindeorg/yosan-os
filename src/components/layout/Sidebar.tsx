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
    <>
      {/* ----------------------------------------------------------------------
          DESKTOP SIDEBAR (Visible only on Large Screens)
          Exact same design as before, hidden on mobile.
      ----------------------------------------------------------------------- */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex-col justify-between py-8 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      >
        {/* Brand Header */}
        <div className="px-8">
           <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20 group-hover:scale-105 transition-transform duration-300">
                 <span className="text-[#A9FF53] font-black text-xl font-sans">Y</span>
              </div>
              <div>
                 <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Yosan.</h1>
                 <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mt-0.5 group-hover:text-[#A9FF53] transition-colors">Finance OS</p>
              </div>
           </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="flex-1 flex flex-col gap-2 mt-12 px-6">
          {MENU.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <div className={`relative flex items-center gap-4 px-3 py-3.5 rounded-xl transition-all duration-300 group ${isActive ? 'bg-black text-[#A9FF53] shadow-lg shadow-black/10' : 'text-gray-500 hover:bg-gray-50 hover:text-black'}`}>
                  <item.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.5px]' : 'group-hover:scale-110'}`} />
                  <span className={`text-xs font-bold tracking-wide ${isActive ? 'text-white' : ''}`}>
                     {item.name}
                  </span>
                  {isActive && (
                     <motion.div layoutId="activeDot" className="absolute right-3 w-1.5 h-1.5 bg-[#A9FF53] rounded-full" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6">
           <button 
              onClick={() => auth.signOut()}
              className="w-full flex items-center gap-4 px-3 py-3.5 rounded-xl text-red-500 hover:bg-red-50 transition-all group"
           >
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                 <LogOut className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold">Sign Out</span>
           </button>
        </div>
      </motion.aside>

      {/* ----------------------------------------------------------------------
          MOBILE BOTTOM NAV (Visible only on Small Screens)
          Instagram-style fixed navigation.
      ----------------------------------------------------------------------- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-safe">
        <div className="flex justify-around items-center px-2 py-3">
          {MENU.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className="flex-1 flex flex-col items-center gap-1 group relative"
              >
                {/* Active Indicator Line (Top) */}
                {isActive && (
                   <motion.div layoutId="mobileIndicator" className="absolute -top-3 w-8 h-1 bg-black rounded-b-full" />
                )}
                
                <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-gray-50' : ''}`}>
                   <item.icon className={`w-6 h-6 transition-all ${isActive ? 'text-black stroke-[2.5px] scale-110' : 'text-gray-400 group-hover:text-gray-600'}`} />
                </div>
                
                {/* Optional: Tiny Label (Like standard iOS apps) */}
                <span className={`text-[9px] font-bold tracking-wide transition-colors ${isActive ? 'text-black' : 'text-gray-300'}`}>
                   {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
