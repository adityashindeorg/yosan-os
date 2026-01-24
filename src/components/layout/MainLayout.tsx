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
      <main className="flex-1 lg:pl-64 transition-all duration-300">
        
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