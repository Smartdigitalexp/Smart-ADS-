import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, MessageSquare, Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getChatResponse, ChatMessage } from '../services/chatService';
import { AdResult, CampaignData } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Logo } from './Logo';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SmartBotProps {
  currentCampaign?: CampaignData;
  allResults?: AdResult[];
  isLoggedIn?: boolean;
  userName?: string | null;
  errorNotification?: string | null;
}

export const SmartBot: React.FC<SmartBotProps> = ({ currentCampaign, allResults = [], isLoggedIn, userName, errorNotification }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bubbleMessage, setBubbleMessage] = useState<string | null>(null);
  const lastResultsCount = useRef(0);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const welcomeShown = useRef(false);
  
  // Sound functionality
  const playPing = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.volume = 0.4;
      audio.play().catch(e => console.log('Audio playback prevented:', e));
    } catch (e) { /* Audio fallback */ }
  };

  // Initialize welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg = isLoggedIn && userName 
        ? `¡Hola, ${userName.split(' ')[0]}! Soy Smart Bot. Estoy aquí para ayudarte a maximizar el impacto de tus anuncios. ¿En qué puedo asesorarte hoy?`
        : '¡Hola! Soy Smart Bot. Estoy aquí para ayudarte a maximizar el impacto de tus anuncios. ¿En qué puedo asesorarte hoy?';
      setMessages([{ role: 'model', text: welcomeMsg }]);
    }
  }, [isLoggedIn, userName, messages.length]);

  // Welcome bubble notification when logging in
  useEffect(() => {
    if (isLoggedIn && userName && !welcomeShown.current) {
      welcomeShown.current = true;
      const firstName = userName.split(' ')[0];
      const msg = `¡Hola, ${firstName}! Bienvenido al sistema neural. Estoy listo para crear anuncios sorprendentes.`;
      setBubbleMessage(msg);
      playPing();
    }
  }, [isLoggedIn, userName]);

  // Unified bubble message timeout
  useEffect(() => {
    if (bubbleMessage) {
      const timer = setTimeout(() => setBubbleMessage(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [bubbleMessage]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Error notifications
  useEffect(() => {
    if (errorNotification) {
      setBubbleMessage(errorNotification);
      playPing();
      setMessages(prev => [...prev, { role: 'model', text: `⚠️ NOTIFICACIÓN: ${errorNotification}` }]);
    }
  }, [errorNotification]);

  // Interaction: Campaign updates
  useEffect(() => {
    if (currentCampaign?.productName && !isOpen) {
      setBubbleMessage(`Analizando: ${currentCampaign.productName}...`);
      playPing();
    }
  }, [currentCampaign?.productName]);

  // Special trigger when a batch of results is generated
  useEffect(() => {
    if (allResults.length > 0 && allResults.length !== lastResultsCount.current) {
      lastResultsCount.current = allResults.length;
      
      const conceptSummary = currentCampaign?.creativeConcept || 'tu campaña';
      const resultsSummary = allResults.map((r, i) => `Propuesta ${i + 1}: ${r.analysis} (Score: ${r.performanceScore}/10)`).join('\n\n');
      
      const summaryText = `¡Generación completada para el concepto: "${conceptSummary}"!\n\n${resultsSummary}\n\n¿Cuál de estas propuestas te gustaría publicar?`;
      
      setBubbleMessage('¡Listo! He generado tu propuesta publicitaria de alto impacto');
      playPing();
      setMessages(prev => [...prev, { role: 'model', text: summaryText }]);
    } else if (allResults.length === 0) {
      lastResultsCount.current = 0;
    }
  }, [allResults, currentCampaign?.creativeConcept]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = [...messages, userMsg];
      const response = await getChatResponse(history, currentCampaign, allResults[0] || null);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Hubo un error en mi núcleo neural. Por favor, intenta de nuevo.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[9999] flex flex-col items-end pointer-events-none">
      <div className="flex flex-col items-end pointer-events-auto">
        <AnimatePresence>
        {!isOpen && bubbleMessage && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            className="mb-4 mr-2 bg-black/90 backdrop-blur-xl border border-neon-blue/60 p-4 rounded-2xl rounded-br-none shadow-[0_0_30px_rgba(0,209,255,0.3)] max-w-[320px] sm:max-w-[450px] overflow-hidden"
          >
            <div className="text-[11px] text-neon-blue font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <Logo size={24} /> Smart Bot
            </div>
            <div className="max-h-[150px] overflow-y-auto pr-1">
              <p className="text-xs text-white/95 leading-relaxed break-words font-medium">{bubbleMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="w-[calc(100vw-2rem)] sm:w-[400px] h-[500px] max-h-[calc(100vh-120px)] mb-4 glass-panel flex flex-col overflow-hidden border-neon-blue/30 shadow-[0_0_30px_rgba(0,209,255,0.2)]"
          >
            {/* Header */}
            <div className="p-4 border-b border-neon-blue/20 bg-neon-blue/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-neon-blue bg-black flex items-center justify-center shadow-[0_0_10px_rgba(0,209,255,0.3)] overflow-hidden">
                  <Logo size={32} />
                </div>
                <div>
                  <h3 className="font-orbitron text-sm font-bold tracking-widest text-neon-blue">SMART BOT</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Neural Assistant</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-white/40 hover:text-white transition-colors"
              >
                <ChevronDown size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-neon-blue/20">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-2 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-neon-blue/20 border border-neon-blue/30 text-white rounded-tr-none" 
                      : "bg-white/5 border border-white/10 text-white/80 rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] uppercase tracking-widest text-white/20 mt-1 font-bold">
                    {msg.role === 'user' ? 'Tú' : 'Smart Bot'}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex flex-col items-start mr-auto max-w-[85%]">
                  <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-neon-blue rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-neon-blue rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-neon-blue rounded-full" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-neon-blue/20 bg-black/40">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu consulta neural..."
                  className="w-full bg-black/60 border border-neon-blue/30 rounded-xl pl-4 pr-12 py-3 focus:border-neon-blue outline-none transition-all text-sm"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neon-blue hover:text-neon-green disabled:opacity-30 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 relative group overflow-hidden",
          isOpen ? "bg-black border-2 border-neon-blue" : "bg-neon-blue shadow-[0_0_20px_rgba(0,209,255,0.4)]"
        )}
      >
        {isOpen ? (
          <X size={28} className="text-neon-blue" />
        ) : (
          <>
            <Logo size={48} className="group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-neon-green rounded-full border-2 border-deep-blue" />
          </>
        )}
      </motion.button>
      </div>
    </div>
  );
};
