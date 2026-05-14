import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ShieldAlert, Sparkles, Volume2, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import axios from 'axios';

const Detection = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
      setResult(null);
      setError(null);
    } else {
      setError("Please upload a valid leaf image.");
    }
  };

  const handleUpload = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', image);

    try {
      const res = await axios.post('http://localhost:5000/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Error connecting to AI backend. Ensure Flask server is running.");
    } finally {
      setLoading(false);
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            AI Disease Diagnosis <Sparkles className="text-primary-600 w-6 h-6" />
          </h1>
          <p className="text-slate-500 mt-1">Upload a clear photo of the plant leaf for instant AI analysis.</p>
        </div>
        {preview && !loading && !result && (
          <button 
            onClick={handleUpload}
            className="glass-button bg-primary-600 hover:bg-primary-700"
          >
            Start Analysis
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div 
            layout
            className={`glass-card p-4 relative min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed transition-colors ${preview ? 'border-primary-500' : 'border-slate-300 hover:border-primary-400'}`}
          >
            {preview ? (
              <div className="relative w-full h-full group">
                <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-xl shadow-lg" />
                <button 
                  onClick={() => {setPreview(null); setImage(null); setResult(null);}}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current.click()}
                className="flex flex-col items-center text-center p-8 cursor-pointer w-full h-full"
              >
                <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4">
                  <Upload size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Drop leaf image here</h3>
                <p className="text-sm text-slate-500 mt-2">or click to browse from device</p>
                <p className="text-xs text-slate-400 mt-6 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider font-bold italic">PNG, JPG up to 10MB</p>
              </div>
            )}
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={(e) => handleFile(e.target.files[0])}
              accept="image/*"
            />
          </motion.div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm"
            >
              <ShieldAlert size={18} />
              {error}
            </motion.div>
          )}
        </div>

        {/* Results Section */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-12 flex flex-col items-center justify-center text-center gap-6 min-h-[400px]"
              >
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-600 w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">AI is Analyzing...</h3>
                  <p className="text-slate-500 mt-2">Scanning cellular patterns and identifying disease markers</p>
                </div>
                <div className="w-full max-w-xs bg-slate-100 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3 }}
                    className="bg-primary-600 h-full"
                  />
                </div>
              </motion.div>
            ) : result ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="glass-card p-6 border-l-4 border-l-primary-600">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary-600 mb-1 block">Diagnosis Result</span>
                      <h2 className="text-2xl font-bold text-slate-900">{result.disease}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1 font-medium">Confidence</p>
                      <span className="text-2xl font-black text-primary-600">{result.confidence}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    <CheckCircle2 size={16} className="text-green-500" />
                    AI analysis completed successfully.
                  </div>
                </div>

                <div className="glass-card p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Sparkles className="text-amber-500" size={20} /> AI Insights & Advice
                    </h3>
                    <button 
                      onClick={() => speak(result.advice)}
                      className="p-2 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
                    >
                      <Volume2 size={18} /> Listen
                    </button>
                  </div>

                  <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                    <div className="whitespace-pre-wrap">{result.advice}</div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-card p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-400">Result will appear here</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-xs">Once you upload and analyze an image, the AI detection details will populate this area.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Detection;
