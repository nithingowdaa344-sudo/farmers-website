import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Bot, User, Loader2, Languages } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceAssistant = () => {
  const [lang, setLang] = useState('kn-IN');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕೃಷಿನೋವಾ ಧ್ವನಿ ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?" }
  ]);
  const [status, setStatus] = useState('ಪ್ರಾರಂಭಿಸಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿರಿ');
  const recognitionRef = useRef(null);

  // Switch initial greeting and status when language is changed
  useEffect(() => {
    if (lang === 'kn-IN') {
      setMessages([
        { role: 'ai', content: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕೃಷಿನೋವಾ ಧ್ವನಿ ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?" }
      ]);
      setStatus('ಪ್ರಾರಂಭಿಸಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿರಿ');
    } else {
      setMessages([
        { role: 'ai', content: "Hello! I am your KrishiNova Voice Assistant. How can I help you today?" }
      ]);
      setStatus('Press microphone to start');
    }
  }, [lang]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = lang;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setStatus(lang === 'kn-IN' ? 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ...' : 'Listening...');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setStatus(lang === 'kn-IN' ? 'ಪ್ರಾರಂಭಿಸಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿರಿ' : 'Press microphone to start');
      };

      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setStatus(lang === 'kn-IN' ? 'ದೋಷ ಸಂಭವಿಸಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.' : 'An error occurred. Please try again.');
        setIsListening(false);
      };
    }
  }, [lang]);

  const handleSendMessage = async (content) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
    setStatus(lang === 'kn-IN' ? 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...' : 'Thinking...');

    try {
      // Calling the Voice Assistant Backend (Node.js)
      const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const res = await axios.post(`${API_BASE}/chat`, { message: content });
      const aiResponse = res.data.response;
      
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
      speak(aiResponse);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: lang === 'kn-IN' ? 'ಕ್ಷಮಿಸಿ, ಸಂಪರ್ಕದಲ್ಲಿ ತೊಂದರೆಯಾಗಿದೆ.' : 'Sorry, there was a connection error.' 
      }]);
    } finally {
      setStatus(lang === 'kn-IN' ? 'ಪ್ರಾರಂಭಿಸಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿರಿ' : 'Press microphone to start');
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      // Stop any active speech first
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      // Auto-detect response language for realistic accents
      const hasKannada = /[\u0C80-\u0CFF]/.test(text);
      utterance.lang = hasKannada ? 'kn-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(lang === 'kn-IN' ? 'ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ಬ್ರೌಸರ್ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆಯನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ.' : 'Sorry, your browser does not support Speech Recognition.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary-100 p-3 rounded-2xl">
            <Bot className="text-primary-600 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">
              {lang === 'kn-IN' ? 'ಧ್ವನಿ ಸಹಾಯಕ' : 'Voice Assistant'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {lang === 'kn-IN' ? 'ಕೃಷಿ ಮಾಹಿತಿ ಮತ್ತು ಸಹಾಯಕ್ಕಾಗಿ ಮಾತಾಡಿ' : 'Speak to get instant agricultural solutions'}
            </p>
          </div>
        </div>

        {/* Dynamic Premium Language Selector */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setLang('kn-IN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              lang === 'kn-IN'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
            }`}
          >
            ಕನ್ನಡ (KN)
          </button>
          <button
            onClick={() => setLang('en-US')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              lang === 'en-US'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
            }`}
          >
            English (EN)
          </button>
        </div>
      </div>

      <div className="glass-card h-[450px] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-slate-900/10">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  msg.role === 'user' 
                  ? 'bg-primary-600 text-white rounded-tr-none shadow-md' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-none'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 flex flex-col items-center gap-4">
          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">{status}</p>
          
          <div className="relative">
            {isListening && (
              <motion.div 
                animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-primary-400 rounded-full"
              />
            )}
            <button
              onClick={toggleListening}
              className={`relative z-10 p-6 rounded-full shadow-2xl transition-all ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-600 hover:bg-primary-700'} text-white`}
            >
              {isListening ? <MicOff size={32} /> : <Mic size={32} />}
            </button>
          </div>

          <div className={`flex gap-1 h-6 items-center ${isListening ? 'opacity-100' : 'opacity-0'}`}>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [10, 24, 10] }}
                transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                className="w-1 bg-primary-500 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
