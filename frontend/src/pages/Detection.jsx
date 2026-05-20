import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, X, ShieldAlert, Sparkles, Activity, Target, Cpu, 
  CheckCircle2, Scan, ArrowLeftRight, Zap, Info, Maximize2, 
  TrendingUp, Gauge, Camera, RefreshCw, Leaf, FlaskConical,
  TriangleAlert, Bot, Stethoscope
} from 'lucide-react';
import axios from 'axios';

const Detection = ({ t }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Results State
  const [result, setResult] = useState(null);
  const [heatmapUrl, setHeatmapUrl] = useState(null);
  const [aiReasoning, setAiReasoning] = useState(null);
  const [error, setError] = useState(null);
  
  // UI State
  const [sliderPos, setSliderPos] = useState(50);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'camera'
  
  // Camera States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup camera on component unmount
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
      
      // Reset states
      setResult(null);
      setHeatmapUrl(null);
      setAiReasoning(null);
      setError(null);
      setSliderPos(50);
      setIsZoomed(false);
    } else {
      setError("Please upload a valid leaf image.");
    }
  };

  const startCamera = async () => {
    setCameraLoading(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      // Analyze a frame every 2.0 seconds to keep CPU/GPU usage smooth and fast
      intervalRef.current = setInterval(captureAndAnalyzeFrame, 2000);
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera stream. Please check camera permissions.");
      setCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Draw current stream frame
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append('file', blob, 'live_frame.jpg');
      
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        // Analyze call with 90s timeout to accommodate moondream + llama3.2 AI chain
        const res = await axios.post(`${API_BASE}/analyze`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 90000
        });
        
        if (res.data.status === 'invalid_input') {
          setError(res.data.message);
          setResult(null);
          setHeatmapUrl(null);
          setAiReasoning(null);
          return;
        }

        setError(null);
        setResult(res.data);
        if (res.data.reasoning) {
          setAiReasoning(res.data.reasoning);
        }
        if (res.data.heatmap_url) {
          setHeatmapUrl(`${API_BASE}${res.data.heatmap_url}`);
        } else {
          setHeatmapUrl(null);
        }
      } catch (err) {
        console.error("Live analysis frame error:", err);
      }
    }, 'image/jpeg', 0.85);
  };

  const handleUpload = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', image);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // Fire analyze request with 120s timeout - runs moondream + llama3.2 sequentially
      const res = await axios.post(`${API_BASE}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
      
      if (res.data.status === 'invalid_input') {
        setError(res.data.message);
        setResult(null);
        setHeatmapUrl(null);
        setAiReasoning(null);
        setLoading(false);
        return;
      }

      setResult(res.data);
      
      // Set heatmap URL from backend response
      if (res.data.heatmap_url) {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        setHeatmapUrl(`${API_BASE_URL}${res.data.heatmap_url}`);
      } else {
        setHeatmapUrl(null);
      }
      
      if (res.data.reasoning) {
        setAiReasoning(res.data.reasoning);
      } else {
        setAiReasoning("No specific anomalies detected.");
      }

    } catch (err) {
      console.error(err);
      const errMsg = err.code === 'ECONNABORTED' 
        ? "AI backend request timed out. Please try again (Ollama models may take longer to warm up)." 
        : (err.response?.data?.detail || "Error connecting to AI backend. Ensure your local server is running.");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 relative pb-20">
      {/* Floating Particles Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 opacity-30">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-10 w-32 h-32 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-32 h-32 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold ai-gradient-text flex items-center gap-2">
            {t.aiDiagnosis || "AI Diagnosis"} <Sparkles className="text-teal-400 w-6 h-6" />
          </h1>
          <p className="text-slate-500 mt-1">Select speciman input source and trigger telemetry scanner</p>
        </div>
        
        {/* Input Toggle Tabs */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
          <button 
            onClick={() => { setActiveTab('upload'); stopCamera(); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-slate-700 shadow-md text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Upload size={14} /> File Upload
          </button>
          <button 
            onClick={() => { setActiveTab('camera'); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'camera' ? 'bg-white dark:bg-slate-700 shadow-md text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Camera size={14} /> Live Camera
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Upload Section */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div 
            layout
            className="glass-card-premium p-4 relative min-h-[350px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden"
          >
            {activeTab === 'upload' ? (
              preview ? (
                <div className="relative w-full h-full group rounded-xl overflow-hidden shadow-2xl bg-black">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" />
                  
                  {loading && (
                    <motion.div 
                      animate={{ top: ["-10%", "110%"] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-teal-400 shadow-[0_0_15px_4px_rgba(45,212,191,0.6)] z-20"
                    />
                  )}
                  
                  <button 
                    onClick={() => {setPreview(null); setImage(null); setResult(null); setHeatmapUrl(null); setAiReasoning(null); setIsZoomed(false);}}
                    disabled={loading}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all z-30"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="flex flex-col items-center text-center p-8 cursor-pointer w-full h-full justify-center"
                >
                  <motion.div 
                    whileHover={{ rotate: 180, scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                    className="w-20 h-20 bg-gradient-to-br from-primary-100 to-teal-50 dark:from-slate-800 dark:to-slate-700 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mb-6 shadow-lg border border-white/50 dark:border-slate-600"
                  >
                    <Upload size={32} />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Initialize Uplink</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Drag & drop or tap to select image</p>
                </div>
              )
            ) : (
              /* Live Camera Interface */
              <div className="relative w-full h-full min-h-[320px] flex flex-col items-center justify-center text-center rounded-xl overflow-hidden bg-black">
                {cameraActive ? (
                  <div className="absolute inset-0 w-full h-full">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover opacity-90"
                    />
                    
                    {/* Pulsing scanning overlay */}
                    <div className="absolute inset-0 border border-teal-500/30 pointer-events-none" />
                    <motion.div 
                      animate={{ top: ["-10%", "110%"] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-teal-400 shadow-[0_0_15px_4px_rgba(45,212,191,0.5)] z-20"
                    />
                    
                    {/* Live Stream Controller */}
                    <button 
                      onClick={stopCamera}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-xs shadow-xl transition z-30 flex items-center gap-1.5"
                    >
                      <X size={14} /> Stop Scanner
                    </button>
                  </div>
                ) : (
                  <div className="p-8">
                    <Camera size={44} className="text-teal-500 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-lg font-bold text-white">Live AI Specimen Scanner</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-6">Runs real-time dynamic classifications on leaf samples</p>
                    
                    <button 
                      onClick={startCamera}
                      disabled={cameraLoading}
                      className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center gap-1.5 mx-auto"
                    >
                      {cameraLoading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Starting stream...
                        </>
                      ) : (
                        <>
                          <Zap size={14} /> Start Camera Feed
                        </>
                      )}
                    </button>
                  </div>
                )}
                {/* Hidden canvas used to draw capture frame */}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}
            
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={(e) => handleFile(e.target.files[0])}
              accept="image/*"
              disabled={loading}
            />
          </motion.div>

          {preview && activeTab === 'upload' && !loading && !result && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:from-teal-600 hover:to-emerald-600 transition"
            >
              <Zap size={18} />
              {t.startAnalysis || "Initialize Scan"}
            </motion.button>
          )}

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-4 bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium shadow-lg"
              >
                <ShieldAlert size={20} className="shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, filter: "blur(10px)" }}
                className="glass-card-premium p-12 flex flex-col items-center justify-center text-center gap-8 min-h-[400px]"
              >
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-t-2 border-r-2 border-teal-400 opacity-70"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute inset-4 rounded-full border-b-2 border-l-2 border-primary-500 opacity-50"
                  />
                  <Cpu className="w-10 h-10 text-teal-600 animate-pulse" />
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold ai-gradient-text mb-2">Neural Analysis Active</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-1">Running Vision AI (moondream) + Generating Expert Advice...</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">⏳ This may take 20–60 seconds on first run while AI models warm up.</p>
                </div>
              </motion.div>
            ) : result ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >


                {/* Model Badge */}
                {result.model_used && (
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 rounded-full">
                      <Bot size={12} /> Vision: {result.model_used}
                    </span>
                  </div>
                )}

                {/* Primary Diagnosis Card */}
                <div className="glass-card-premium p-8 border-l-4 border-l-teal-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-100/30 dark:bg-teal-900/20 rounded-full filter blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-1 flex items-center gap-2">
                        <Target size={14} /> AI Diagnosis
                      </span>
                      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{result.disease}</h2>
                    </div>
                    <div className="text-left md:text-right w-full md:w-auto">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-bold uppercase tracking-widest">Confidence</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 md:w-40 bg-slate-200/50 dark:bg-slate-700/50 h-3 rounded-full overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${result.confidence}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={`h-full ${
                              result.uncertain ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                              parseInt(result.confidence) > 75 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 
                              'bg-gradient-to-r from-amber-400 to-orange-500'
                            }`}
                          />
                        </div>
                        <span className="text-3xl font-black ai-gradient-text">{result.confidence}%</span>
                      </div>
                    </div>
                  </div>
                  
                    <div className="mt-4">
                      {/* Severity + Infection */}
                      <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-white/40 dark:border-slate-700/50 hover:shadow-lg transition-all relative overflow-hidden">
                        <div className={`absolute top-0 right-0 bottom-0 w-2 rounded-r-2xl ${
                          result.severity === "Severe" ? "bg-red-500" : 
                          result.severity === "Moderate" ? "bg-amber-500" : "bg-emerald-500"
                        }`}></div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Severity</p>
                            <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-lg">
                              <Gauge size={18} className={result.severity === "Severe" ? "text-red-500" : result.severity === "Moderate" ? "text-amber-500" : "text-emerald-500"} /> 
                              {result.severity || "None"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Infection Area</p>
                            <p className={`font-black text-xl ${
                              result.severity === "Severe" ? "text-red-500" : 
                              result.severity === "Moderate" ? "text-amber-500" : "text-emerald-500"
                            }`}>
                              {result.infection_percentage || result.damage_percentage}%
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
                          <div 
                            className={`h-full ${
                              result.severity === "Severe" ? "bg-red-500" : 
                              result.severity === "Moderate" ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${result.infection_percentage || result.damage_percentage}%` }}
                          />
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                          {result.urgency_warning}
                        </p>
                      </div>
                    </div>
                  </div>

                {/* XAI Heatmap + Reasoning + Treatment */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="glass-card-premium p-6 overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Scan size={20} className="text-teal-500" /> XAI Vision & Diagnosis
                    </h3>
                    {heatmapUrl && (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsZoomed(!isZoomed)} 
                          className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-full font-medium flex items-center gap-2 transition-all shadow-sm"
                        >
                          <Maximize2 size={14} />
                          {isZoomed ? "Reset Zoom" : "Inspect Close-Up"}
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
                          <img src={preview || heatmapUrl} alt="Original Specimen" className="absolute inset-0 w-full h-full object-cover" />
                          <img 
                            src={heatmapUrl} 
                            alt="AI Heatmap" 
                            className="absolute inset-0 w-full h-full object-cover" 
                            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                          />
                          {result.severity !== "None" && result.severity !== "Unknown" && (
                            <>
                              <div className="absolute top-1/3 left-1/2 w-6 h-6 -mt-3 -ml-3 rounded-full bg-red-500/60 pointer-events-none animate-ping z-20" />
                              <div className="absolute top-1/3 left-1/2 w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full bg-red-500 pointer-events-none z-20 shadow-[0_0_12px_#ef4444] border border-white/60" />
                            </>
                          )}
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
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10 pointer-events-none">Heatmap</div>
                        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10 pointer-events-none">Specimen</div>
                      </div>
                    )}

                    {/* Right column: Reasoning + Treatment + Top-3 */}
                    <div className="flex flex-col gap-4">
                      {/* AI Diagnosis Explanation */}
                      <div className="bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent dark:from-slate-800/80 p-4 rounded-2xl border border-teal-500/20">
                        <h4 className="text-xs uppercase tracking-widest font-bold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-2">
                          <Stethoscope size={14} /> Visual Symptoms
                        </h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {result.symptoms || aiReasoning || result.reasoning || "Analyzing visual symptoms..."}
                        </p>
                      </div>

                      {/* Remedies Panel */}
                      {result.remedies && (
                        <div className="bg-emerald-500/5 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-500/20">
                          <h4 className="text-xs uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                            <Stethoscope size={14} /> Remedies & Treatment
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {result.remedies}
                          </p>
                        </div>
                      )}

                      {/* Fertilizer Panel */}
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

                      {/* Precautions Panel */}
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

                      {/* Preventions Panel */}
                      {result.preventions && (
                        <div className="bg-fuchsia-500/5 dark:bg-fuchsia-900/10 p-4 rounded-2xl border border-fuchsia-500/20">
                          <h4 className="text-xs uppercase tracking-widest font-bold text-fuchsia-700 dark:text-fuchsia-400 mb-2 flex items-center gap-2">
                            <Target size={14} /> Preventions
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {result.preventions}
                          </p>
                        </div>
                      )}

                      {/* Treatment Panel (legacy fallback) */}
                      {result.treatment && !result.remedies && (
                        <div className="bg-emerald-500/5 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-500/20">
                          <h4 className="text-xs uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                            <FlaskConical size={14} /> Treatment Recommendation
                          </h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {result.treatment}
                          </p>
                        </div>
                      )}

                      {/* Top-3 Disease Predictions */}
                      {result.top_predictions && result.top_predictions.length > 0 && (
                        <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-white/40 dark:border-slate-700/50">
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-widest">
                            <TrendingUp size={14} className="text-teal-500" /> Disease Signals
                          </h4>
                          <div className="space-y-3">
                            {result.top_predictions.slice(0, 3).map((pred, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{pred.disease}</span>
                                  <span className="text-xs font-mono font-bold text-slate-500">{pred.confidence}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pred.confidence}%` }}
                                    transition={{ duration: 1.1, delay: idx * 0.15 }}
                                    className={`h-full ${
                                      idx === 0 ? 'bg-gradient-to-r from-teal-400 to-teal-500' :
                                      idx === 1 ? 'bg-gradient-to-r from-sky-400 to-sky-500' : 'bg-slate-400'
                                    }`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <div className="glass-card-premium p-12 border-2 border-dashed border-slate-200/50 dark:border-slate-800 flex flex-col items-center justify-center text-center min-h-[350px]">
                <div className="w-20 h-20 bg-slate-50/50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 rounded-2xl rotate-3 flex items-center justify-center mb-6 shadow-inner">
                  <Cpu size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500">Awaiting Telemetry</h3>
                <p className="text-sm text-slate-400/80 mt-2 max-w-xs">Upload a leaf specimen or start camera scanner to initialize AI diagnostics.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Detection;

