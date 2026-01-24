import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { ProjectSheet } from '@/components/projects/ProjectSheet';
import { 
  Plus, Search, Filter, MoreHorizontal, Layers, 
  CheckCircle2, Clock, AlertCircle, ArrowUpRight, 
  Calendar, Flag
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        onSnapshot(query(collection(db, "users", user.uid, "projects"), orderBy("createdAt", "desc")), s => {
          setProjects(s.docs.map(d => {
             const data = d.data();
             return {
                id: d.id,
                ...data,
                // Safely convert Timestamps
                deadline: data.deadline instanceof Timestamp ? data.deadline.toDate() : new Date(),
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
             }
          }));
        });
      }
    });
    return () => unsub();
  }, []);

  // --- DATA ENGINE ---
  const activeProjects = projects.filter(p => p.status === 'Active');
  const completedProjects = projects.filter(p => p.status === 'Completed');
  
  // Calculate "Velocity" (Avg completion rate of active projects)
  const velocity = activeProjects.length > 0 
    ? activeProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / activeProjects.length 
    : 0;

  const filteredProjects = projects.filter(p => {
     const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesFilter = filter === 'All' ? true : p.status === filter;
     return matchesSearch && matchesFilter;
  });

  // --- ACTIONS ---
  const handleDelete = async (id: string) => {
     if(confirm('Archive this project?')) {
        await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'projects', id));
     }
  };

  const toggleStatus = async (project: any) => {
     const newStatus = project.status === 'Active' ? 'Completed' : 'Active';
     const newProgress = newStatus === 'Completed' ? 100 : project.progress;
     await updateDoc(doc(db, 'users', auth.currentUser!.uid, 'projects', project.id), {
        status: newStatus,
        progress: newProgress
     });
  };

  return (
    <MainLayout>
      <PageTransition>
        <div className="w-full min-h-screen bg-[#F1F3F5] p-6 lg:p-8 font-sans text-slate-900 relative">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mission Control</h1>
              <div className="flex items-center gap-2 mt-1 text-gray-500 text-xs font-bold uppercase tracking-wide">
                <span>Projects</span> <span className="text-gray-300">/</span> <span>Tasks</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                  <input 
                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search projects..." 
                    className="pl-10 pr-4 py-2.5 bg-white rounded-full border border-gray-200 text-xs font-bold text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 w-48 transition-all"
                  />
               </div>
               <button onClick={() => setFilter(filter === 'All' ? 'Active' : 'All')} className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-gray-200 text-xs font-bold text-slate-600 hover:bg-gray-50 transition-colors shadow-sm">
                  <Filter className="w-3 h-3" /> {filter === 'All' ? 'All View' : 'Active Only'}
               </button>
            </div>
          </div>

          {/* === SECTION 1: STATS HERO === */}
          <div className="grid grid-cols-12 gap-6 mb-10">
             
             {/* 1. VELOCITY CARD (Black) */}
             <div className="col-span-12 lg:col-span-6 bg-black text-white rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-black/20 group h-[220px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#A9FF53] blur-[120px] opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                   <div>
                      <h2 className="text-lg font-bold text-gray-400 mb-1">Execution Velocity</h2>
                      <div className="flex items-baseline gap-2">
                         <span className="text-5xl font-black tracking-tighter">{velocity.toFixed(0)}%</span>
                         <span className="text-xs font-bold text-[#A9FF53] uppercase">Avg. Progress</span>
                      </div>
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center"><Layers className="w-6 h-6 text-[#A9FF53]" /></div>
                </div>

                <div className="relative z-10 w-full bg-gray-800 h-3 rounded-full overflow-hidden">
                   <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${velocity}%` }} 
                      className="h-full bg-[#A9FF53] shadow-[0_0_15px_#A9FF53]"
                   />
                </div>
             </div>

             {/* 2. ACTIVE COUNT */}
             <div className="col-span-6 lg:col-span-3 bg-white rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between h-[220px] group hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Clock className="w-6 h-6" /></div>
                   <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                </div>
                <div>
                   <h3 className="text-4xl font-black text-slate-900 mb-1">{activeProjects.length}</h3>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Active Projects</p>
                </div>
             </div>

             {/* 3. COMPLETED COUNT */}
             <div className="col-span-6 lg:col-span-3 bg-white rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-between h-[220px] group hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-green-50 rounded-2xl text-green-600"><CheckCircle2 className="w-6 h-6" /></div>
                   <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                </div>
                <div>
                   <h3 className="text-4xl font-black text-slate-900 mb-1">{completedProjects.length}</h3>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Completed</p>
                </div>
             </div>
          </div>

          {/* === SECTION 2: PROJECT GRID === */}
          <div className="mb-8 flex justify-between items-end">
             <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-gray-400" /> Active Blueprints
             </h3>
          </div>

          {filteredProjects.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Layers className="w-8 h-8 text-gray-300" /></div>
                <h3 className="text-lg font-bold text-slate-900">No Projects Found</h3>
                <p className="text-sm text-gray-400 mb-6">Launch a new initiative to get started.</p>
                <button onClick={() => setIsSheetOpen(true)} className="px-6 py-3 bg-black text-[#A9FF53] rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-900">Launch Project</button>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project, i) => (
                   <motion.div 
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-transparent hover:border-[#A9FF53] hover:shadow-lg transition-all group relative overflow-hidden"
                   >
                      {/* Priority Tag */}
                      <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-[10px] font-black uppercase tracking-wider ${
                         project.priority === 'high' ? 'bg-red-50 text-red-600' : 
                         project.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'
                      }`}>
                         {project.priority}
                      </div>

                      <div className="flex justify-between items-start mb-6">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black ${project.status === 'Active' ? 'bg-black text-[#A9FF53]' : 'bg-gray-100 text-gray-400'}`}>
                            {project.title[0]}
                         </div>
                      </div>

                      <h3 className="text-xl font-extrabold text-slate-900 mb-2 leading-tight">{project.title}</h3>
                      <p className="text-xs font-medium text-gray-400 mb-6 line-clamp-2 min-h-[2.5em]">
                         {project.description || 'No details provided.'}
                      </p>

                      {/* Progress Bar */}
                      <div className="mb-6">
                         <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-2 uppercase">
                            <span>Progress</span>
                            <span>{project.progress || 0}%</span>
                         </div>
                         <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                               initial={{ width: 0 }} animate={{ width: `${project.progress || 0}%` }}
                               className={`h-full rounded-full ${project.status === 'Completed' ? 'bg-green-500' : 'bg-black'}`} 
                            />
                         </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                         <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No Date'}
                         </div>
                         
                         <div className="flex gap-2">
                            <button 
                               onClick={() => toggleStatus(project)}
                               className={`p-2 rounded-full transition-colors ${project.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-gray-50 text-gray-400 hover:bg-black hover:text-[#A9FF53]'}`}
                            >
                               <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button 
                               onClick={() => handleDelete(project.id)}
                               className="p-2 rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                               <MoreHorizontal className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                   </motion.div>
                ))}
             </div>
          )}

          {/* Floating Action Button */}
          <button 
            onClick={() => setIsSheetOpen(true)}
            className="fixed bottom-8 right-8 w-16 h-16 bg-black text-[#A9FF53] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50 border-4 border-white"
          >
            <Plus className="w-8 h-8 stroke-[3]" />
          </button>

          {/* MODALS */}
          <ProjectSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />

        </div>
      </PageTransition>
    </MainLayout>
  );
}