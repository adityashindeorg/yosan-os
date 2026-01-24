import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutGrid, PieChart, Layers, Settings, 
  LogOut, Menu, X, Wallet, Bell, Search
} from 'lucide-react';
import { auth } from '@/lib/firebase';

const NavItem = ({ icon: Icon, label, path, active, onClick, mobile = false }: any) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-3 transition-all duration-200 group
      ${mobile 
        ? 'flex-col gap-1 p-2 w-full justify-center' 
        : 'w-full px-4 py-3 rounded-xl hover:bg-slate-100'
      }
      ${active ? (mobile ? 'text-black' : 'bg-slate-900 text-white hover:bg-slate-900') : 'text-slate-500'}
    `}
  >
    <Icon className={`
      ${mobile ? 'w-6 h-6' : 'w-5 h-5'}
      ${active && !mobile ? 'text-[#A9FF53]' : ''}
    `} />
    <span className={`
      font-bold
      ${mobile ? 'text-[10px]' : 'text-sm'}
    `}>
      {label}
    </span>
  </button>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { icon: LayoutGrid, label: 'Overview', path: '/overview' },
    { icon: PieChart, label: 'Analytics', path: '/analytics' },
    { icon: Layers, label: 'Projects', path: '/projects' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex">
      {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 border-r border-slate-200 bg-white p-6 z-40">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">Y</div>
          <span className="text-xl font-black text-slate-900 tracking-tight">Yosan.</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavItem 
              key={item.path} 
              {...item} 
              active={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
           <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-500 transition-colors w-full font-bold text-sm">
             <LogOut className="w-5 h-5" /> Sign Out
           </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 w-full min-w-0 pb-24 lg:pb-0">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xs">Y</div>
              <span className="font-bold text-lg text-slate-900">Yosan</span>
           </div>
           <div className="flex gap-3">
              <button className="p-2 bg-slate-100 rounded-full"><Search className="w-5 h-5 text-slate-600"/></button>
              <button className="p-2 bg-slate-100 rounded-full"><Bell className="w-5 h-5 text-slate-600"/></button>
           </div>
        </div>

        {/* Page Content */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAV (Hidden on Desktop) --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
        <div className="flex justify-around items-center p-2">
          {navItems.map((item) => (
            <NavItem 
              key={item.path} 
              {...item} 
              mobile
              active={location.pathname === item.path}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
