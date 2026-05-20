import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, ShieldAlert, Sparkles, Activity, Target, Cpu,
  CheckCircle2, Scan, ArrowLeftRight, Zap, Info, Maximize2,
  TrendingUp, Gauge, Camera, RefreshCw, Leaf, FlaskConical,
  TriangleAlert, Bot, Stethoscope, AlertTriangle
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const Detection = ({ t }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Results State — starts null, only set from REAL API response
  const [result, setResult] = useState(null);
  const [heatmapUrl, setHeatmapUrl] = useState(null);
  const [error, setError] = useState(null);

  // UI State
  const [sliderPos, setSliderPos] = useState(50);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  // Camera States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── File Handling ─────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    // Store the actual File object — reset all previous state
    setSelectedFile(file);
    setResult(null);
    setHeatmapUrl(null);
    setError(null);
    setSliderPos(50);
    setIsZoomed(false);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const clearImage = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setHeatmapUrl(null);
    setError(null);
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Upload & Analyze ──────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setHeatmapUrl(null);

    // Build FormData with the actual current file object
    const formData = new FormData();
    formData.append('file', selectedFile, selectedFile.name);

    try {
      console.log(`[Detection] Sending image: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`);

      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        body: formData,
        // Explicitly disable cache so every upload hits the backend fresh
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!res.ok) {
        let errMsg = `Server error ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      console.log('[Detection] AI result:', data);

      if (data.status === 'invalid_input') {
        setError(data.message || 'Invalid input — please upload a clear plant image.');
        return;
      }

      setResult(data);

      if (data.heatmap_url) {
        // Cache-bust the heatmap URL too
        setHeatmapUrl(`${API_BASE}${data.heatmap_url}?t=${Date.now()}`);
      }
    } catch (err) {
      console.error('[Detection] Fetch error:', err);
      const errMsg =
        err.name === 'AbortError' || err.message.includes('fetch')
          ? 'Cannot connect to AI backend. Make sure the server is running on port 5000.'
          : err.message;
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── Camera ────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      intervalRef.current = setInterval(captureAndAnalyzeFrame, 3000);
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('file', blob, `frame_${Date.now()}.jpg`);
      try {
        const res = await fetch(`${API_BASE}/analyze`, {
          method: 'POST',
          body: formData,
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'invalid_input') {
          setResult(data);
          if (data.heatmap_url) setHeatmapUrl(`${API_BASE}${data.heatmap_url}?t=${Date.now()}`);
          setError(null);
        }
      } catch (_) { /* silent — camera keeps scanning */ }
    }, 'image/jpeg', 0.85);
  };

  // ── Helpers ───────────────────────────────────────────────────
  const getSeverityColor = (sev) => {
    if (!sev) return 'bg-slate-400';
    const s = sev.toLowerCase();
    if (s === 'severe') return 'bg-red-500';
    if (s === 'moderate') return 'bg-amber-500';
    if (s === 'mild') return 'bg-yellow-400';
    return 'bg-emerald-500';
  };

  const getSeverityTextColor = (sev) => {
    if (!sev) return 'text-slate-400';
    const s = sev.toLowerCase();
    if (s === 'severe') return 'text-red-500';
    if (s === 'moderate') return 'text-amber-500';
    if (s === 'mild') return 'text-yellow-400';
    return 'text-emerald-500';
  };

  const confidenceNum = result ? parseInt(result.confidence) || 0 : 0;
  const isHealthy = result && (
    result.disease?.toLowerCase().includes('healthy') ||
    result.disease?.toLowerCase() === 'none'
  );
  const isUnknown = result && result.disease?.toLowerCase().includes('unknown');

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 relative pb-20"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Background Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 opacity-30">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 right-10 w-32 h-32 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-32 h-32 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold ai-gradient-text flex items-center gap-2">
            {t?.aiDiagnosis || 'AI Diagnosis'} <Sparkles className="text-teal-400 w-6 h-6" />
          </h1>
          <p className="text-slate-500 mt-1">Upload a plant image for real-time AI disease detection</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <button
            id="tab-upload"
            onClick={() => { setActiveTab('upload'); stopCamera(); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-slate-700 shadow-md text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Upload size={14} /> File Upload
          </button>
          <button
            id="tab-camera"
            onClick={() => setActiveTab('camera')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'camera' ? 'bg-white dark:bg-slate-700 shadow-md text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Camera size={14} /> Live Camera
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">

        {/* Left — Upload Panel */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div
            layout
            className="glass-card-premium p-4 relative min-h-[350px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden"
          >
            {activeTab === 'upload' ? (
              preview ? (
                <div className="relative w-full h-full group rounded-xl overflow-hidden shadow-2xl bg-black">
                  <img
                    src={preview}
                    alt="Selected plant image"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
                  />

                  {/* Scanning line while loading */}
                  {loading && (
                    <motion.div
                      animate={{ top: ['-10%', '110%'] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      className="absolute left-0 right-0 h-1 bg-teal-400 shadow-[0_0_15px_4px_rgba(45,212,191,0.6)] z-20"
                    />
                  )}

                  {/* File name badge */}
                  <div className="absolute bottom-3 left-3 right-12 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full truncate z-10 pointer-events-none">
                    {selectedFile?.name}
                  </div>

                  <button
                    id="btn-clear-image"
                    onClick={clearImage}
                    disabled={loading}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all z-30 disabled:opacity-50"
                    title="Remove image"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div
                  id="drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center text-center p-8 cursor-pointer w-full h-full justify-center"
                >
                  <motion.div
                    whileHover={{ rotate: 180, scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                    className="w-20 h-20 bg-gradient-to-br from-primary-100 to-teal-50 dark:from-slate-800 dark:to-slate-700 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mb-6 shadow-lg border border-white/50 dark:border-slate-600"
                  >
                    <Upload size={32} />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Upload Plant Image</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Drag & drop or click to select image
                  </p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP supported</p>
                </div>
              )
            ) : (
              /* Live Camera */
              <div className="relative w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center rounded-xl overflow-hidden bg-black">
                {cameraActive ? (
                  <div className="absolute inset-0 w-full h-full">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-90" />
                    <div className="absolute inset-0 border border-teal-500/30 pointer-events-none" />
                    <motion.div
                      animate={{ top: ['-10%', '110%'] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                      className="absolute left-0 right-0 h-1 bg-teal-400 shadow-[0_0_15px_4px_rgba(45,212,191,0.5)] z-20"
                    />
                    <button
                      id="btn-stop-camera"
                      onClick={stopCamera}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xs shadow-xl transition z-30 flex items-center gap-1.5"
                    >
                      <X size={14} /> Stop Scanner
                    </button>
                  </div>
                ) : (
                  <div className="p-8">
                    <Camera size={44} className="text-teal-500 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-lg font-bold text-white">Live AI Scanner</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-6">Scans plant every 3 seconds via camera</p>
                    <button
                      id="btn-start-camera"
                      onClick={startCamera}
                      disabled={cameraLoading}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center gap-1.5 mx-auto"
                    >
                      {cameraLoading ? <><RefreshCw size={14} className="animate-spin" /> Starting...</> : <><Zap size={14} /> Start Camera</>}
                    </button>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}

            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => {
                // Reset the value first so the same file triggers onChange again
                const file = e.target.files[0];
                e.target.value = '';
                handleFile(file);
              }}
              accept="image/*"
              disabled={loading}
            />
          </motion.div>

          {/* Analyze Button */}
          {preview && activeTab === 'upload' && !loading && (
            <motion.button
              id="btn-analyze"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:from-teal-600 hover:to-emerald-600 transition"
            >
              <Zap size={18} />
              {result ? 'Re-Analyze Image' : (t?.startAnalysis || 'Analyze Plant')}
            </motion.button>
          )}

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-4 bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm font-medium shadow-lg"
              >
                <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right — Results Panel */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">

            {/* Loading State */}
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, filter: 'blur(10px)' }}
                className="glass-card-premium p-12 flex flex-col items-center justify-center text-center gap-8 min-h-[400px]"
              >
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-t-2 border-r-2 border-teal-400 opacity-70"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className="absolute inset-4 rounded-full border-b-2 border-l-2 border-primary-500 opacity-50"
                  />
                  <Cpu className="w-10 h-10 text-teal-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold ai-gradient-text mb-2">AI Analysis Running</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-1">
                    YOLOv8 & EfficientNet are examining your plant image...
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    ⚡ Running local deep learning diagnostic pipeline...
                  </p>
                </div>
              </motion.div>
            )}

            {/* Results */}
            {!loading && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                {/* Model Badge */}
                {result.model_used && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">
                      {result.timing_s && `⏱ ${result.timing_s}s`}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 rounded-full">
                      <Bot size={12} /> {result.model_used}
                    </span>
                  </div>
                )}

                {/* Primary Diagnosis Card */}
                <div className={`glass-card-premium p-8 border-l-4 relative overflow-hidden ${
                  isHealthy ? 'border-l-emerald-500' : isUnknown ? 'border-l-slate-400' : 'border-l-teal-500'
                }`}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-100/30 dark:bg-teal-900/20 rounded-full filter blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2" />

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                      {/* Plant Name */}
                      {result.plant && (
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                          <Leaf size={12} /> {result.plant}
                        </span>
                      )}
                      <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-1 flex items-center gap-2">
                        <Target size={14} /> AI Diagnosis
                      </span>
                      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                        {result.disease || 'Unknown Disease'}
                      </h2>
                    </div>

                    {/* Confidence Meter */}
                    <div className="text-left md:text-right w-full md:w-auto">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-bold uppercase tracking-widest">Confidence</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 md:w-40 bg-slate-200/50 dark:bg-slate-700/50 h-3 rounded-full overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${confidenceNum}%` }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                            className={`h-full ${
                              confidenceNum > 75
                                ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                                : confidenceNum > 50
                                ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                                : 'bg-gradient-to-r from-red-400 to-rose-500'
                            }`}
                          />
                        </div>
                        <span className="text-3xl font-black ai-gradient-text">{confidenceNum}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Severity Block */}
                  <div className="mt-4">
                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-white/40 dark:border-slate-700/50 hover:shadow-lg transition-all relative overflow-hidden">
                      <div className={`absolute top-0 right-0 bottom-0 w-2 rounded-r-2xl ${getSeverityColor(result.severity)}`} />
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Severity</p>
                          <p className={`font-bold flex items-center gap-2 text-lg ${getSeverityTextColor(result.severity)}`}>
                            <Gauge size={18} /> {result.severity || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Infection Area</p>
                          <p className={`font-black text-xl ${getSeverityTextColor(result.severity)}`}>
                            {result.infection_percentage ?? result.damage_percentage ?? 0}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full ${getSeverityColor(result.severity)}`}
                          style={{ width: `${result.infection_percentage ?? result.damage_percentage ?? 0}%` }}
                        />
                      </div>
                      {result.urgency_warning && (
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                          {result.urgency_warning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* XAI Heatmap + Details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="glass-card-premium p-6 overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Scan size={20} className="text-teal-500" /> Vision Analysis & Treatment
                    </h3>
                    {heatmapUrl && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsZoomed(!isZoomed)}
                          className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full font-medium flex items-center gap-2 transition-all shadow-sm"
                        >
                          <Maximize2 size={14} /> {isZoomed ? 'Reset Zoom' : 'Zoom In'}
                        </button>
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full font-medium flex items-center gap-2">
                          <ArrowLeftRight size={14} /> Drag to compare
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={`grid grid-cols-1 ${heatmapUrl ? 'md:grid-cols-2' : ''} gap-6`}>
                    {/* Heatmap Slider */}
                    {heatmapUrl && (
                      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl group select-none bg-black">
                        <div className={`w-full h-full relative transition-transform duration-500 origin-center ${isZoomed ? 'scale-150' : 'scale-100'}`}>
                          <img src={preview} alt="Original" className="absolute inset-0 w-full h-full object-cover" />
                          <img
                            src={heatmapUrl}
                            alt="AI Heatmap"
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
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
                      </div>
                    )}

                    {/* Detail Panels */}
                    <div className="flex flex-col gap-4">

                      {/* Symptoms */}
                      {result.symptoms && (
                        <div className="bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent dark:from-slate-800/80 p-4 rounded-2xl border border-teal-500/20">
                          <h4 className="text-xs uppercase tracking-widest font-bold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-2">
                            <Stethoscope size={14} /> Visual Symptoms
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {result.symptoms}
                          </p>
                        </div>
                      )}

                      {/* Remedies */}
                      {result.remedies && (
                        <div className="bg-emerald-500/5 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-500/20">
                          <h4 className="text-xs uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                            <CheckCircle2 size={14} /> Treatment & Remedies
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {result.remedies}
                          </p>
                        </div>
                      )}

                      {/* Fertilizer */}
                      {result.fertilizer && (
                        <div className="bg-amber-500/5 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-500/20">
                          <h4 className="text-xs uppercase tracking-widest font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                            <FlaskConical size={14} /> Fertilizer & Nutrients
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {result.fertilizer}
                          </p>
                        </div>
                      )}

                      {/* Precautions */}
                      {result.precautions && (
                        <div className="bg-indigo-500/5 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-500/20">
                          <h4 className="text-xs uppercase tracking-widest font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                            <ShieldAlert size={14} /> Precautions
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {result.precautions}
                          </p>
                        </div>
                      )}

                      {/* Preventions */}
                      {result.preventions && (
                        <div className="bg-fuchsia-500/5 dark:bg-fuchsia-900/10 p-4 rounded-2xl border border-fuchsia-500/20">
                          <h4 className="text-xs uppercase tracking-widest font-bold text-fuchsia-700 dark:text-fuchsia-400 mb-2 flex items-center gap-2">
                            <Target size={14} /> Future Prevention
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {result.preventions}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Empty State */}
            {!loading && !result && (
              <div className="glass-card-premium p-12 border-2 border-dashed border-slate-200/50 dark:border-slate-800 flex flex-col items-center justify-center text-center min-h-[350px]">
                <div className="w-20 h-20 bg-slate-50/50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 rounded-2xl rotate-3 flex items-center justify-center mb-6 shadow-inner">
                  <Cpu size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500">Awaiting Image</h3>
                <p className="text-sm text-slate-400/80 mt-2 max-w-xs">
                  Upload a plant leaf photo or start the live camera to begin AI disease detection.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Detection;
