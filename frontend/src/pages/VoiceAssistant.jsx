import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Bot, User, Loader2 } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಕೃಷಿನೋವಾ ಧ್ವನಿ ಸಹಾಯಕ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?" }
  ]);
  const [status, setStatus] = useState('ಪ್ರಾರಂಭಿಸಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿರಿ');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'kn-IN';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setStatus('ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ... (Listening...)');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setStatus('ಪ್ರಾರಂಭಿಸಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿರಿ');
      };

      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setStatus('ದೋಷ ಸಂಭವಿಸಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.');
        setIsListening(false);
      };
    }
  }, []);

  const handleSendMessage = async (content) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
    setStatus('ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ... (Thinking...)');

    try {
      // Calling the Voice Assistant Backend (Node.js)
      const res = await axios.post('http://localhost:3001/chat', { message: content });
      const aiResponse = res.data.response;
      
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
      speak(aiResponse);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'ಕ್ಷಮಿಸಿ, ಸಂಪರ್ಕದಲ್ಲಿ ತೊಂದರೆಯಾಗಿದೆ.' }]);
    } finally {
      setStatus('ಪ್ರಾರಂಭಿಸಲು ಮೈಕ್ರೊಫೋನ್ ಒತ್ತಿರಿ');
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'kn-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="glass-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary-100 p-3 rounded-2xl">
            <Bot className="text-primary-600 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">ಕನ್ನಡ ಧ್ವನಿ ಸಹಾಯಕ (Kannada Voice Assistant)</h1>
            <p className="text-sm text-slate-500">ಕೃಷಿ ಮಾಹಿತಿ ಮತ್ತು ಸಹಾಯಕ್ಕಾಗಿ ಮಾತಾಡಿ</p>
          </div>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
          {isListening ? 'Listening' : 'Ready'}
        </div>
      </div>

      <div className="glass-card h-[450px] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
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
                  ? 'bg-primary-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="p-8 border-t border-slate-100 bg-white flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-primary-600">{status}</p>
          
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
