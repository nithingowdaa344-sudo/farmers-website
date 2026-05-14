import React from 'react';
import { Search, Bell, User } from 'lucide-react';

const Navbar = () => {
  return (
    <div className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search for diseases, crops, or treatments..."
          className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border-transparent focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 rounded-xl transition-all outline-none text-sm"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">Bharath</p>
            <p className="text-xs text-slate-500">Premium Farmer</p>
          </div>
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold border-2 border-white shadow-sm">
            B
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
