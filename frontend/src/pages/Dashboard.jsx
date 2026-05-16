import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Leaf, AlertTriangle, CheckCircle2, Loader2, Clock } from 'lucide-react';
import axios from 'axios';

const StatCard = ({ icon: Icon, label, value, trend, color }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card p-6 flex flex-col gap-4"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="text-white w-6 h-6" />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <div className="flex items-end gap-2">
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        {trend && (
          <span className="text-xs font-bold text-green-600 pb-1 flex items-center">
            <TrendingUp size={12} className="mr-0.5" /> {trend}
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

const Dashboard = ({ t }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('http://localhost:5000/history');
        setHistory(res.data.reverse()); // Show latest first
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const totalScans = history.length;
  const diseasesDetected = history.filter(item => !item.disease.toLowerCase().includes('healthy')).length;
  const healthyCount = totalScans - diseasesDetected;
  const healthRate = totalScans > 0 ? ((healthyCount / totalScans) * 100).toFixed(1) : "0";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">{t.cropHealthOverview}</h1>
        <p className="text-slate-500 mt-1">{t.statsSubtitle}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Leaf} 
          label={t.totalScans} 
          value={totalScans} 
          trend={totalScans > 0 ? "+1" : null}
          color="bg-primary-600" 
        />
        <StatCard 
          icon={CheckCircle2} 
          label={t.overallHealth} 
          value={`${healthRate}%`} 
          trend={totalScans > 0 ? t.low : null}
          color="bg-green-500" 
        />
        <StatCard 
          icon={AlertTriangle} 
          label={t.issuesFound} 
          value={diseasesDetected} 
          trend={diseasesDetected > 0 ? t.actionRequired : t.none} 
          color="bg-amber-500" 
        />
        <StatCard 
          icon={Clock} 
          label={t.latestActivity} 
          value={totalScans > 0 ? history[0].timestamp.split(' ')[1] : "N/A"} 
          color="bg-blue-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8">
          <h3 className="text-lg font-bold text-slate-800 mb-6">{t.recentActivity}</h3>
          <div className="space-y-6">
            {history.length > 0 ? (
              history.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${item.disease.toLowerCase().includes('healthy') ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Leaf className={`${item.disease.toLowerCase().includes('healthy') ? 'text-green-600' : 'text-red-600'} w-6 h-6`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{item.disease}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.confidence} {item.confidence} • {item.timestamp}</p>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${item.disease.toLowerCase().includes('healthy') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {item.disease.toLowerCase().includes('healthy') ? t.healthy : t.diseased}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Leaf className="text-slate-300" size={32} />
                </div>
                <p className="text-slate-400 font-medium">{t.noActivity}</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-8 bg-primary-900 text-white overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-2">{t.recommendation}</h3>
            <p className="text-primary-200 text-sm mb-8">
              {diseasesDetected > 0 
                ? t.issueTip
                : t.healthyTip
              }
            </p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                <span className="text-sm font-medium">{t.riskLevel}</span>
                <span className={`text-xl font-bold ${diseasesDetected > 2 ? 'text-red-400' : 'text-green-400'}`}>
                  {diseasesDetected > 2 ? t.high : t.low}
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                <span className="text-sm font-medium">Next Scan Suggested</span>
                <span className="text-xl font-bold">In 2 days</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary-500/20 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
