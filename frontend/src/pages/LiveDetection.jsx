import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, StopCircle, Play, ShieldAlert, Cpu, Activity, ScanLine, Target } from 'lucide-react';
import axios from 'axios';

const LiveDetection = ({ t }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const captureIntervalRef = useRef(null);

  // Stop camera stream safely
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsAnalyzing(false);
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
  };

  // Start camera stream
  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setIsStreaming(true);
      
      // Initialize the capture loop (every 2 seconds)
      captureIntervalRef.current = setInterval(captureAndAnalyze, 2000);
      
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      setError("Camera access denied. Please grant permissions to use the Live Scanner.");
    }
  };

  // Capture frame and send to backend
  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to Blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setIsAnalyzing(true);
      
      const formData = new FormData();
      formData.append('file', blob, 'live_frame.jpg');

      try {
        const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
        const res = await axios.post(`${API_BASE}/predict`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResult(res.data);
      } catch (err) {
        // Silently fail continuous scans to avoid spamming the UI, just log it
        console.error("Live detection API error:", err);
      } finally {
        // We leave isAnalyzing true so the scanner UI stays active if camera is on
      }
    }, 'image/jpeg', 0.8);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 relative pb-20">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 opacity-20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse animation-delay-2000"></div>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold ai-gradient-text flex items-center gap-2">
            {t.liveScanner || "Live Scanner"} <ScanLine className="text-teal-400 w-6 h-6" />
          </h1>
          <p className="text-slate-500 mt-1">Real-time ensemble AI plant diagnostics</p>
        </div>
        
        <div className="flex gap-4">
          {!isStreaming ? (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startCamera}
              className="glass-button bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              <Play size={18} /> Initialize Optics
            </motion.button>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={stopCamera}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/40 flex items-center gap-2 font-medium"
            >
              <StopCircle size={18} /> Terminate Uplink
            </motion.button>
          )}
        </div>
      </header>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium shadow-lg"
        >
          <ShieldAlert size={20} className="shrink-0" />
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Live Camera Viewport */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card-premium relative overflow-hidden aspect-video bg-black flex items-center justify-center rounded-3xl border border-white/20 shadow-2xl">
            
            {/* Hidden canvas for frame extraction */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Native Video Element */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-opacity duration-1000 ${isStreaming ? 'opacity-100' : 'opacity-0'}`} 
            />

            {/* Offline State */}
            {!isStreaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10">
                <Camera size={48} className="mb-4 opacity-50" />
                <p className="font-mono text-sm tracking-widest uppercase">Optics Offline</p>
              </div>
            )}

            {/* Live AI HUD Overlays */}
            {isStreaming && (
              <>
                {/* Center Target Reticle */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-teal-400/50 rounded-3xl relative">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-teal-400"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-teal-400"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-teal-400"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-teal-400"></div>
                  </div>
                </div>

                {/* Animated Scanning Line */}
                <motion.div 
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-teal-400/80 shadow-[0_0_20px_5px_rgba(45,212,191,0.5)] z-20 pointer-events-none"
                />

                {/* Live Status Indicator */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full z-30">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-[10px] text-white font-mono uppercase tracking-widest font-bold">REC</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Real-Time Telemetry Dashboard */}
        <div className="lg:col-span-4 space-y-6">
          <AnimatePresence mode="wait">
            {!isStreaming ? (
              <motion.div 
                key="offline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card-premium p-8 h-full min-h-[300px] flex flex-col items-center justify-center text-center"
              >
                <Cpu size={32} className="text-slate-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-500">Telemetry Offline</h3>
                <p className="text-xs text-slate-400 mt-2">Activate optics to begin continuous environmental scan.</p>
              </motion.div>
            ) : !result ? (
              <motion.div 
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card-premium p-8 h-full min-h-[300px] flex flex-col items-center justify-center text-center"
              >
                <Activity size={32} className="text-teal-500 animate-bounce mb-4" />
                <h3 className="text-lg font-bold ai-gradient-text">Acquiring Lock</h3>
                <p className="text-xs text-slate-500 mt-2">Calibrating ensemble neural network...</p>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card-premium p-6 h-full border-l-4 border-l-teal-500 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Subtle background glow */}
                <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 -z-10 ${parseInt(result.confidence) > 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>

                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-2">
                    <Target size={12} /> Live Consensus
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                    {result.disease}
                  </h2>
                  <p className="text-sm font-semibold text-slate-500 mt-1 capitalize">Plant: {result.plant}</p>
                </div>

                <div className="mt-8 space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Live Confidence</span>
                      <span className="text-2xl font-black ai-gradient-text">{result.confidence}%</span>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${result.confidence}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full ${parseInt(result.confidence) > 85 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                      />
                    </div>
                  </div>

                  <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-4 rounded-2xl border border-white/40 dark:border-slate-700/50 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Severity Level</span>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${result.severity === "Severe" ? "bg-red-100 text-red-700" : result.severity === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {result.severity}
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Crop Damage</span>
                      <span className={`text-lg font-black ${result.severity === "Severe" ? "text-red-500" : result.severity === "Moderate" ? "text-amber-500" : "text-emerald-500"}`}>
                        {result.damage_percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Micro-update indicator */}
                <div className="mt-6 flex justify-end">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping"></div>
                    STREAM ACTIVE
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LiveDetection;
