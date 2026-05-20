import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History as HistoryIcon, Search, Filter, ArrowUpDown, ChevronDown, ChevronUp,
  Leaf, Calendar, ShieldAlert, Target, Stethoscope, CheckCircle2, FlaskConical,
  Activity, ArrowLeftRight, Trash2, Database, AlertCircle, Info, Maximize2
} from 'lucide-react';
import axios from 'axios';

const History = ({ t }) => {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search, Filter, Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [plantFilter, setPlantFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest' | 'confidence'

  // Expanded card ID
  const [expandedId, setExpandedId] = useState(null);

  // Image comparison slider state for expanded items
  const [sliderPos, setSliderPos] = useState(50);
  const [isZoomed, setIsZoomed] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/history`);
      setHistoryList(res.data);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(
        err.message.includes('Network') || err.message.includes('connect')
          ? 'Cannot connect to the agricultural database. Make sure the backend server and MongoDB are running.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper colors
  const getSeverityColors = (sev) => {
    if (!sev) return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' };
    const s = sev.toLowerCase();
    if (s === 'severe') return { bg: 'bg-red-500/10 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' };
    if (s === 'moderate') return { bg: 'bg-amber-500/10 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-500' };
    if (s === 'mild') return { bg: 'bg-yellow-500/10 dark:bg-yellow-950/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-500/20', dot: 'bg-yellow-400' };
    return { bg: 'bg-emerald-500/10 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500' };
  };

  const getConfidenceColor = (conf) => {
    const val = parseInt(conf) || 0;
    if (val > 85) return 'from-emerald-400 to-teal-500';
    if (val > 60) return 'from-amber-400 to-orange-400';
    return 'from-red-400 to-rose-500';
  };

  const handleToggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setSliderPos(50);
      setIsZoomed(false);
    }
  };

  // Extract unique plant list for filter dropdown
  const uniquePlants = ['all', ...new Set(historyList.map(item => item.plant || item.crop).filter(Boolean))];

  // Filtering & Sorting Logic
  const filteredAndSortedList = historyList
    .filter(item => {
      // 1. Search Query
      const plant = (item.plant || item.crop || '').toLowerCase();
      const disease = (item.disease || '').toLowerCase();
      const symptoms = (item.symptoms || item.reasoning || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = plant.includes(query) || disease.includes(query) || symptoms.includes(query);

      // 2. Severity Filter
      const severity = (item.severity || '').toLowerCase();
      let matchesSeverity = true;
      if (severityFilter === 'healthy') {
        matchesSeverity = disease.includes('healthy') || severity === 'none';
      } else if (severityFilter !== 'all') {
        matchesSeverity = severity === severityFilter;
      }

      // 3. Plant Filter
      const itemPlant = item.plant || item.crop;
      const matchesPlant = plantFilter === 'all' || itemPlant === plantFilter;

      return matchesSearch && matchesSeverity && matchesPlant;
    })
    .sort((a, b) => {
      // Sorting
      if (sortOrder === 'newest') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      }
      if (sortOrder === 'oldest') {
        return new Date(a.timestamp) - new Date(b.timestamp);
      }
      if (sortOrder === 'confidence') {
        const confA = parseInt(a.confidence) || 0;
        const confB = parseInt(b.confidence) || 0;
        return confB - confA;
      }
      return 0;
    });

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 relative pb-20">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 opacity-30">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 right-10 w-32 h-32 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-32 h-32 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold ai-gradient-text flex items-center gap-2">
            {t?.history || 'Scan History'} <HistoryIcon className="text-teal-400 w-6 h-6" />
          </h1>
          <p className="text-slate-500 mt-1">Review and manage past AI crop diagnostic sessions</p>
        </div>

        {historyList.length > 0 && (
          <div className="text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1.5 font-bold uppercase tracking-widest">
            <Database size={12} /> {historyList.length} Saved Scans
          </div>
        )}
      </header>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm font-medium shadow-lg">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p>{error}</p>
            <button
              onClick={fetchHistory}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      {!loading && historyList.length > 0 && (
        <div className="glass-card-premium p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search crop, disease, or symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Plant Crop Filter */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="text-slate-400 w-4 h-4 shrink-0" />
            <select
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Crops</option>
              {uniquePlants.filter(p => p !== 'all').map((plant) => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="text-slate-400 w-4 h-4 shrink-0" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Severities</option>
              <option value="healthy">Healthy Only</option>
              <option value="Mild">Mild</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="md:col-span-2 flex items-center gap-2">
            <ArrowUpDown className="text-slate-400 w-4 h-4 shrink-0" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full py-2 px-3 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="confidence">Highest Confidence</option>
            </select>
          </div>
        </div>
      )}

      {/* Main List Area */}
      {loading ? (
        <div className="glass-card-premium p-12 flex flex-col items-center justify-center text-center gap-4 min-h-[300px]">
          <Activity className="w-10 h-10 text-teal-600 animate-pulse" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-350">Loading crop diagnostics history...</h3>
        </div>
      ) : filteredAndSortedList.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedList.map((item, idx) => {
            const isExpanded = expandedId === idx;
            const itemPlant = item.plant || item.crop || 'Unknown Plant';
            const itemDisease = item.disease || 'Unknown Disease';
            const itemSeverity = item.severity || (itemDisease.toLowerCase().includes('healthy') ? 'None' : 'Moderate');
            const confVal = parseInt(item.confidence) || 75;
            const isItemHealthy = itemDisease.toLowerCase().includes('healthy') || itemSeverity.toLowerCase() === 'none';

            const severityColors = getSeverityColors(itemSeverity);
            const heatmapUrlResolved = item.heatmap_url ? `${API_BASE}${item.heatmap_url}` : null;

            return (
              <motion.div
                key={idx}
                layout="position"
                className={`glass-card overflow-hidden transition-all duration-300 border-l-4 ${
                  isExpanded ? 'shadow-2xl' : 'hover:shadow-md hover:translate-x-1'
                } ${
                  isItemHealthy ? 'border-l-emerald-500' : itemSeverity.toLowerCase() === 'severe' ? 'border-l-red-500' : itemSeverity.toLowerCase() === 'moderate' ? 'border-l-amber-500' : 'border-l-teal-500'
                }`}
              >
                {/* Summary View (Card Header) */}
                <div
                  onClick={() => handleToggleExpand(idx)}
                  className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-4">
                    {/* Plant Icon Badge */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isItemHealthy ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450' : 'bg-teal-500/10 text-teal-600 dark:text-teal-405'
                    }`}>
                      <Leaf className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      {/* Crop & Timestamp */}
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        <span>{itemPlant}</span>
                        <span className="text-[10px]">•</span>
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Calendar size={12} /> {item.timestamp}
                        </span>
                      </div>

                      {/* Disease name */}
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                        {itemDisease}
                      </h3>
                    </div>
                  </div>

                  {/* Metrics Badge & Accordion Arrow */}
                  <div className="flex items-center gap-4 self-stretch md:self-auto justify-between border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
                    <div className="flex items-center gap-3">
                      {/* Severity badge */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${severityColors.bg} ${severityColors.text} ${severityColors.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${severityColors.dot}`} />
                        {itemSeverity}
                      </span>

                      {/* Confidence badge */}
                      <span className="text-sm font-black text-slate-700 dark:text-slate-350">
                        {confVal}% {t?.confidence || 'Confidence'}
                      </span>
                    </div>

                    {isExpanded ? <ChevronUp className="text-slate-400 shrink-0" size={20} /> : <ChevronDown className="text-slate-400 shrink-0" size={20} />}
                  </div>
                </div>

                {/* Expanded Details View */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 overflow-hidden"
                    >
                      <div className="p-6 space-y-6">
                        {/* Summary Metrics Banner */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-white/40 dark:border-slate-700/50">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Severity Level</span>
                            <span className={`text-lg font-black ${severityColors.text}`}>{itemSeverity}</span>
                          </div>
                          <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-white/40 dark:border-slate-700/50">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Estimated Infection</span>
                            <span className={`text-lg font-black ${severityColors.text}`}>{item.infection_percentage ?? item.damage_percentage ?? 0}%</span>
                          </div>
                          <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-xl border border-white/40 dark:border-slate-700/50">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Diagnostic Consensus</span>
                            <span className="text-lg font-black text-teal-600 dark:text-teal-400">{confVal}% Confidence</span>
                          </div>
                        </div>

                        {/* Urgency Alert if any */}
                        {item.urgency_warning && (
                          <div className="p-4 bg-teal-500/5 dark:bg-slate-800/50 border border-teal-500/10 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-350">
                            {item.urgency_warning}
                          </div>
                        )}

                        <div className={`grid grid-cols-1 ${heatmapUrlResolved ? 'lg:grid-cols-2' : ''} gap-6`}>
                          {/* Image Heatmap Slider (if heatmap URL exists) */}
                          {heatmapUrlResolved && (
                            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-xl select-none bg-black">
                              <div className={`w-full h-full relative transition-transform duration-500 origin-center ${isZoomed ? 'scale-150' : 'scale-100'}`}>
                                <img
                                  src={item.image_url ? `${API_BASE}${item.image_url}` : `${API_BASE}/outputs/last_predict_image.jpg`}
                                  alt="Original speciman"
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback if the specific image was cleared or not saved individually
                                    e.target.src = 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=600&auto=format&fit=crop&q=80';
                                  }}
                                />
                                <img
                                  src={heatmapUrlResolved}
                                  alt="AI Heatmap overlay"
                                  className="absolute inset-0 w-full h-full object-cover"
                                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </div>
                              <div
                                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.8)] z-10 flex items-center justify-center pointer-events-none"
                                style={{ left: `calc(${sliderPos}% - 2px)` }}
                              >
                                <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                                  <ArrowLeftRight size={14} className="text-teal-600" />
                                </div>
                              </div>
                              <input
                                type="range" min="0" max="100"
                                value={sliderPos}
                                onChange={(e) => setSliderPos(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 m-0 p-0"
                              />

                              {/* Zoom & Tip overlay */}
                              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] text-white flex items-center gap-2 pointer-events-none font-bold">
                                <Info size={12} className="text-teal-400" /> Compare slider active
                              </div>
                              <button
                                onClick={() => setIsZoomed(!isZoomed)}
                                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition z-30"
                                title="Zoom image"
                              >
                                <Maximize2 size={14} />
                              </button>
                            </div>
                          )}

                          {/* Detail fields */}
                          <div className="flex flex-col gap-4">
                            {/* Visual Symptoms */}
                            {(item.symptoms || item.reasoning) && (
                              <div className="bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent dark:from-slate-800/80 p-4 rounded-xl border border-teal-500/15">
                                <h4 className="text-xs uppercase tracking-widest font-bold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-2">
                                  <Stethoscope size={14} /> Visual Symptoms
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                  {item.symptoms || item.reasoning}
                                </p>
                              </div>
                            )}

                            {/* Remedies */}
                            {item.remedies && (
                              <div className="bg-emerald-500/5 dark:bg-emerald-955/10 p-4 rounded-xl border border-emerald-500/15">
                                <h4 className="text-xs uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-450 mb-2 flex items-center gap-2">
                                  <CheckCircle2 size={14} /> Remedies & Treatment
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                  {item.remedies}
                                </p>
                              </div>
                            )}

                            {/* Fertilizers */}
                            {item.fertilizer && (
                              <div className="bg-amber-500/5 dark:bg-amber-955/10 p-4 rounded-xl border border-amber-500/15">
                                <h4 className="text-xs uppercase tracking-widest font-bold text-amber-700 dark:text-amber-450 mb-2 flex items-center gap-2">
                                  <FlaskConical size={14} /> Fertilizer & Nutrients
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                  {item.fertilizer}
                                </p>
                              </div>
                            )}

                            {/* Precautions */}
                            {item.precautions && (
                              <div className="bg-indigo-500/5 dark:bg-indigo-955/10 p-4 rounded-xl border border-indigo-500/15">
                                <h4 className="text-xs uppercase tracking-widest font-bold text-indigo-700 dark:text-indigo-455 mb-2 flex items-center gap-2">
                                  <ShieldAlert size={14} /> Precautions
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                  {item.precautions}
                                </p>
                              </div>
                            )}

                            {/* Preventions */}
                            {item.preventions && (
                              <div className="bg-fuchsia-500/5 dark:bg-fuchsia-955/10 p-4 rounded-xl border border-fuchsia-500/15">
                                <h4 className="text-xs uppercase tracking-widest font-bold text-fuchsia-700 dark:text-fuchsia-455 mb-2 flex items-center gap-2">
                                  <Target size={14} /> Future Prevention
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                  {item.preventions}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card-premium p-16 text-center max-w-xl mx-auto flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-100 dark:border-slate-700">
            <HistoryIcon className="text-slate-300 dark:text-slate-500 w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">No Diagnostic Scans Found</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
            {searchQuery || severityFilter !== 'all' || plantFilter !== 'all'
              ? 'No scans match your current filters. Try resetting the filters or changing your search query.'
              : t?.noActivity || 'You have not run any crop disease scans yet. Go to Disease Detection to analyze a crop leaf specimen.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default History;
