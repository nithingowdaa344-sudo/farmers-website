import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User, Bot, Loader2, Minus, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import axios from 'axios';

const ChatBot = ({ t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([
    { role: 'ai', content: "Hello! I'm your Smart Agri Assistant. How can I help you with your crops today?" }
  ]);
  const [loading, setLoading] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState('kn'); // 'kn' for Kannada, 'en' for English
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'kn-IN'; // Default to Kannada, but will pick up English too
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        // Optional: auto-send
        // handleSend(null, transcript); 
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Set recognition language based on selected speechLang
      if (recognitionRef.current) {
        recognitionRef.current.lang = speechLang === 'kn' ? 'kn-IN' : 'en-US';
      }
      recognitionRef.current.start();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const handleListen = (text, index) => {
    if ('speechSynthesis' in window) {
      if (playingIndex === index && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setPlayingIndex(null);
        return;
      }

      window.speechSynthesis.cancel(); // Stop any other speech
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Auto-detect language script for proper pronunciation
      if (/[\u0C80-\u0CFF]/.test(text)) {
        utterance.lang = 'kn-IN'; // Kannada
      } else if (/[\u0900-\u097F]/.test(text)) {
        utterance.lang = 'hi-IN'; // Hindi
      } else if (/[\u0C00-\u0C7F]/.test(text)) {
        utterance.lang = 'te-IN'; // Telugu
      }
      
      utterance.onend = () => setPlayingIndex(null);
      utterance.onerror = () => setPlayingIndex(null);
      
      setPlayingIndex(index);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech is not supported in your browser.");
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = { role: 'user', content: message };
    setChat(prev => [...prev, userMsg]);
    setMessage('');
    setLoading(true);

    try {
      const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const res = await axios.post(`${API_BASE}/chat`, { message });
      setChat(prev => [...prev, { role: 'ai', content: res.data.response }]);
    } catch (err) {
      setChat(prev => [...prev, { role: 'ai', content: t.errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass-card w-96 h-[500px] mb-4 flex flex-col overflow-hidden shadow-2xl border-primary-500/20"
          >
            {/* Chat Header */}
            <div className="p-4 bg-primary-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">KrishiNova Assistant</h3>
                  <p className="text-[10px] text-primary-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> {t.online}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
                  <Minus size={18} />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/50">
              {chat.map((msg, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary-600 text-white dark:bg-primary-700 dark:text-white rounded-tr-none' : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 shadow-sm border border-slate-100 rounded-tl-none group'}`}>
                    {msg.content}
                    {msg.role === 'ai' && (
                      <button 
                        onClick={() => handleListen(msg.content, i)}
                        className={`block mt-2 transition-colors ${playingIndex === i ? 'text-primary-600 animate-pulse' : 'text-slate-400 hover:text-primary-600'}`}
                        title={playingIndex === i ? "Stop listening" : "Listen to response"}
                      >
                        {playingIndex === i ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-primary-600" />
                    <span className="text-xs text-slate-500">{t.thinking}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                {/* Language toggle button */}
                <button
                  type="button"
                  onClick={() => setSpeechLang(prev => prev === 'kn' ? 'en' : 'kn')}
                  className="p-1 rounded bg-gray-200 dark:bg-gray-700 text-xs"
                  title="Toggle language (Kannada / English)"
                >
                  {speechLang === 'kn' ? 'KN' : 'EN'}
                </button>
              </div>
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isListening ? t.listening : t.searchPlaceholder}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary-500/20 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-slate-200 outline-none transition-all"
              />
              <button 
                type="submit"
                disabled={loading || !message.trim()}
                className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {setIsOpen(true); setIsMinimized(false);}}
        className="bg-primary-600 text-white p-4 rounded-full shadow-2xl shadow-primary-500/40 flex items-center gap-3 group"
      >
        <div className="relative">
          <MessageSquare size={24} />
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-primary-600 rounded-full"></span>
          )}
        </div>
        {(!isOpen || isMinimized) && (
          <span className="font-bold text-sm pr-2">{t.chatWithExpert}</span>
        )}
      </motion.button>
    </div>
  );
};

export default ChatBot;
