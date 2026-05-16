import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ShieldAlert, Sparkles, Volume2, VolumeX, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import axios from 'axios';

const Detection = ({ t }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
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

  const toggleSpeak = (text) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            {t.aiDiagnosis} <Sparkles className="text-primary-600 w-6 h-6" />
          </h1>
          <p className="text-slate-500 mt-1">{t.uploadInstruction}</p>
        </div>
        {preview && !loading && !result && (
          <button 
            onClick={handleUpload}
            className="glass-button bg-primary-600 hover:bg-primary-700"
          >
            {t.startAnalysis}
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
                className="space-y-6 pb-12"
              >
                {/* Status & Confidence Card */}
                <div className="glass-card p-6 border-l-4 border-l-primary-600">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary-600 mb-1 block">Primary Diagnosis</span>
                      <h2 className="text-2xl font-bold text-slate-900">{result.disease}</h2>
                    </div>
                    <div className="text-left md:text-right w-full md:w-auto">
                      <p className="text-xs text-slate-500 mb-2 font-medium">{t.confidence}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 md:w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: result.confidence }}
                            className={`h-full ${parseInt(result.confidence) > 85 ? 'bg-green-500' : 'bg-amber-500'}`}
                          />
                        </div>
                        <span className="text-xl font-black text-slate-800">{result.confidence}</span>
                      </div>
                    </div>
                  </div>

                  {parseInt(result.confidence) < 85 && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4">
                      <ShieldAlert size={14} />
                      Warning: Confidence is moderate. Prediction may be slightly inaccurate.
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Detected Plant</p>
                      <p className="font-bold text-slate-700 flex items-center gap-2 capitalize">
                        <CheckCircle2 size={14} className="text-primary-500" /> {result.plant}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Category</p>
                      <p className="font-bold text-slate-700 flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-500" /> {result.disease.includes('Healthy') ? 'Crop Health' : 'Pathogen Alert'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Top 3 Predictions */}
                {result.top_3 && result.top_3.length > 0 && (
                  <div className="glass-card p-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <ChevronRight size={16} className="text-primary-500" /> Alternative Possibilities
                    </h3>
                    <div className="space-y-3">
                      {result.top_3.map((alt, idx) => (
                        <div key={idx} className="flex items-center justify-between group cursor-default">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-[10px] font-bold flex items-center justify-center text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                              {idx + 1}
                            </div>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{alt.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-slate-300 h-full" style={{ width: `${alt.prob}%` }} />
                            </div>
                            <span className="text-xs font-mono text-slate-400">{alt.prob}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Content Sections */}
                <div className="space-y-4">
                  <div className="glass-card overflow-hidden">
                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <ShieldAlert size={18} className="text-red-500" /> Symptoms Observed
                      </h3>
                    </div>
                    <div className="p-6 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {result.symptoms}
                    </div>
                  </div>

                  <div className="glass-card overflow-hidden">
                    <div className="bg-primary-50/50 px-6 py-3 border-b border-primary-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles size={18} className="text-amber-500" /> AI Remedies & Steps
                      </h3>
                      <button 
                        onClick={() => toggleSpeak(`${result.advice}. Fertilizer Advice: ${result.fertilizer}`)}
                        className={`p-1.5 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${isSpeaking ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-white text-primary-600 border border-primary-200 hover:border-primary-400'}`}
                      >
                        {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        {isSpeaking ? t.stop : t.listen}
                      </button>
                    </div>
                    <div className="p-6 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {result.advice}
                    </div>
                  </div>

                  <div className="glass-card overflow-hidden">
                    <div className="bg-green-50 px-6 py-3 border-b border-green-100">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-green-500" /> Fertilizer & Nutrient Advice
                      </h3>
                    </div>
                    <div className="p-6 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                      {result.fertilizer}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-card p-12 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-400">{t.resultPlaceholder}</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-xs">{t.resultDescription}</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Detection;
