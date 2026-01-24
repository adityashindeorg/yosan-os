import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, PieChart, Layers, Settings, LogOut, Wallet, User } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// 1. Navigation Configuration
const NAV_ITEMS = [
  { icon: LayoutGrid, label: 'Overview', path: '/overview' },
  { icon: PieChart, label: 'Analytics', path: '/analytics' },
  { icon: Layers, label: 'Projects', path: '/projects' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  // 2. Real-time Auth Check (Prevents "Proxy" state)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
      else navigate('/'); // Kick out if not logged in
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = () => auth.signOut();

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-24 lg:pb-0 flex">
      
      {/* --- DESKTOP SIDEBAR (Hidden on Mobile) --- */}
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 border-r border-slate-200 bg-white p-6 z-40">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold">Y</div>
          <span className="text-xl font-black text-slate-900 tracking-tight">Yosan.</span>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm ${
                  isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-[#A9FF53]' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Profile Snippet */}
        <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                 {user?.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full rounded-full"/> : <User className="w-5 h-5 text-slate-400"/>}
              </div>
              <div className="flex flex-col">
                 <span className="text-sm font-bold text-slate-900 truncate max-w-[100px]">{user?.displayName || 'User'}</span>
                 <span className="text-[10px] text-slate-400 font-bold uppercase cursor-pointer hover:text-red-500" onClick={handleLogout}>Sign Out</span>
              </div>
           </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 w-full min-w-0">
        {/* Mobile Header (Only visible on small screens) */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex justify-between items-center">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xs">Y</div>
              <span className="font-bold text-lg text-slate-900">Yosan</span>
           </div>
           {user?.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />}
        </div>

        {/* The Page Content Injection */}
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAV (Sticky at bottom) --- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
        <div className="flex justify-around items-center p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-black' : 'text-slate-400'}`}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
