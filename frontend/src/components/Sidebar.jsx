import React from 'react';
import { LayoutDashboard, Camera, History, Settings, HelpCircle, Leaf } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'detection', icon: Camera, label: 'Disease Detection' },
    { id: 'history', icon: History, label: 'History' },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary-600 p-2 rounded-xl">
          <Leaf className="text-white w-6 h-6" />
        </div>
        <span className="font-bold text-xl text-slate-800 leading-tight">KrishiNova<br/><span className="text-primary-600">AI</span></span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`nav-item w-full ${activeTab === item.id ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button className="nav-item w-full">
          <Settings size={20} />
          <span className="font-medium">Settings</span>
        </button>
        <button className="nav-item w-full mt-2">
          <HelpCircle size={20} />
          <span className="font-medium">Help Center</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
