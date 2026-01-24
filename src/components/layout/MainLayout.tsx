import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex w-full min-h-screen bg-[#F1F3F5]">
      {/* Sidebar Component */}
      <Sidebar />
      
      {/* Main Content Area */}
      {/* UPDATES EXPLAINED:
          1. lg:pl-64 -> Keeps desktop sidebar space (Your requirement)
          2. pb-24    -> Adds bottom padding on Mobile so content isn't hidden behind the new Bottom Nav
          3. lg:pb-0  -> Removes that padding on Desktop
      */}
      <main className="flex-1 w-full min-w-0 transition-all duration-300 lg:pl-64 pb-24 lg:pb-0">
        
        {/* MOBILE HEADER (Visible only on small screens) */}
        <div className="lg:hidden flex items-center justify-between p-6 pb-0">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg">
                 <span className="text-[#A9FF53] font-black text-lg">Y</span>
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tight">Yosan.</span>
           </div>
        </div>

        {/* Page Content */}
        {children}
      </main>
    </div>
  );
}
