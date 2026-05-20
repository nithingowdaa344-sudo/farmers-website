import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Detection from './pages/Detection';
import LiveDetection from './pages/LiveDetection';
import VoiceAssistant from './pages/VoiceAssistant';
import ChatBot from './components/ChatBot';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from './translations';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState('en');

  const t = translations[language];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard t={t} />;
      case 'detection':
        return <Detection t={t} />;
      case 'livescan':
        return <LiveDetection t={t} />;
      case 'voice':
        return <VoiceAssistant t={t} />;
      case 'history':
        return (
          <div className="glass-card p-12 text-center">
            <h2 className="text-2xl font-bold text-slate-800">Prediction History</h2>
            <p className="text-slate-500 mt-2">This feature is coming soon in the next update!</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar language={language} setLanguage={setLanguage} t={t} />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ChatBot t={t} />
    </div>
  );
}

export default App;
