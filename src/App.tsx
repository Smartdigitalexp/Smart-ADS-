/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Cpu, 
  Upload, 
  FileText, 
  Image as ImageIcon,
  Package,
  Play,
  Edit3,
  Clapperboard,
  Video, 
  Copy, 
  Check, 
  Zap, 
  BarChart3, 
  Lightbulb,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronDown,
  History,
  Brain,
  Download,
  Bot,
  CreditCard,
  User,
  LogIn,
  LogOut,
  Settings,
  Coins,
  Menu,
  X,
  TrendingUp,
  CheckCircle2,
  BrainCircuit,
  AlertTriangle,
  Send,
  Calendar,
  Target,
  Users,
  Layout,
  Globe,
  DollarSign,
  Link2,
  MapPin,
  RefreshCcw,
  Search,
  Wand2,
  Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzeAndGenerate, generateCreativeConcept, generateVideoFromPrompt, optimizeProductReference, analyzePerformanceData, generateImageFromPrompt, enhancePrompt, generateStorytellingPrompt, generateStrategicPlan } from './services/geminiService';
import { AdResult, CampaignData, CSVRow, HistoryItem, UserProfile, AnalysisReport, StrategicPlan } from './types';
import { SmartBot } from './components/SmartBot';
import { Logo } from './components/Logo';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { 
  getMetaAuthUrl, 
  getAdAccounts, 
  getPages, 
  getCampaigns,
  getAdSets,
  getAds,
  getInsights,
  publishAd,
  type MetaAdAccount,
  type MetaPage
} from './services/metaService';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  deleteDoc,
  doc,
  getDoc,
  setDoc
} from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AssetToolCard = ({ icon, title, desc, onClick, active }: { icon: any, title: string, desc: string, onClick: () => void, active?: boolean }) => (
  <motion.div 
    whileHover={{ y: -5, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "glass-panel p-6 border-white/10 hover:border-neon-blue/40 cursor-pointer transition-all flex flex-col gap-4 group bg-white/5",
      active && "border-neon-blue bg-neon-blue/5 shadow-[0_0_20px_rgba(0,209,255,0.1)]"
    )}
  >
    <div className={cn(
      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
      active ? "bg-neon-blue text-black" : "bg-white/5 text-neon-blue group-hover:bg-neon-blue/20"
    )}>
      {icon}
    </div>
    <div>
      <h3 className="font-orbitron text-[10px] font-bold text-white uppercase tracking-wider mb-1">{title}</h3>
      <p className="text-[9px] text-white/30 uppercase tracking-widest leading-tight">{desc}</p>
    </div>
  </motion.div>
);

export default function App() {
  const [campaign, setCampaign] = useState<CampaignData>({
    productName: '',
    objective: 'Ventas',
    format: 'image',
    aspectRatio: '1:1',
    creativeConcept: '',
    instruction: '',
    audience: '',
    videoDuration: 5,
    budget: '5.00',
    currency: 'USD',
    facebookPage: '',
    destinationUrl: '',
    pixelId: '',
    whatsappNumber: '',
    facebookEnabled: true,
    instagramEnabled: true,
    feedEnabled: true,
    reelsEnabled: true,
    storiesEnabled: true,
    marketplaceEnabled: false,
    notificationsEnabled: false,
    instreamEnabled: false,
    audienceNetworkEnabled: false,
    messengerEnabled: false,
    advantagePlacementsEnabled: true,
    advantageAudienceEnabled: true,
    gender: 'Todos',
    ageRange: '18-65+',
    scheduleStart: new Date().toISOString().split('T')[0],
    scheduleEnd: ''
  });

  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [visualFile, setVisualFile] = useState<File | null>(null);
  const [visualPreview, setVisualPreview] = useState<string | null>(null);
  const [optimizedVisual, setOptimizedVisual] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStudioProcessing, setIsStudioProcessing] = useState(false);
  const [showStudioComparison, setShowStudioComparison] = useState(false);
  const [activeDurationSelector, setActiveDurationSelector] = useState<string | null>(null);
  const [studioStyle, setStudioStyle] = useState<'lifestyle' | 'minimalist' | 'seasonal' | 'professional'>('lifestyle');
  const [isVideoProcessing, setIsVideoProcessing] = useState<string | null>(null);
  const [results, setResults] = useState<AdResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [activeHomeTab, setActiveHomeTab] = useState<'analizar' | 'planificar' | 'crear' | 'publicar'>('analizar');
  const [activeAssetTool, setActiveAssetTool] = useState<'hub' | 'campaign' | 'generate_img' | 'product_img' | 'animate' | 'edit_img' | 'video_gen'>('hub');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Firebase & History State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  // Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: '',
    email: '',
    phone: '',
    website: '',
    multiVariantEnabled: true
  });
  const [showProfile, setShowProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Auth & Credits Simulation
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('smart_ads_logged_in') === 'true';
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [showRecharge, setShowRecharge] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toolPrompt, setToolPrompt] = useState('');
  const [toolResult, setToolResult] = useState<string | null>(null);
  const [isToolProcessing, setIsToolProcessing] = useState(false);

  const handleExecuteTool = async () => {
    if (!toolPrompt.trim()) return;
    setIsToolProcessing(true);
    setToolResult(null);

    try {
      let result = '';
      const base64 = visualPreview?.split(',')[1];
      const mime = visualPreview?.split(';')[0].split(':')[1];

      if (activeAssetTool === 'generate_img') {
        result = await generateImageFromPrompt(toolPrompt, campaign.aspectRatio);
      } else if (activeAssetTool === 'product_img') {
        // We use optimizeProductReference but with the prompt
        // Let's use generic image generation with the product ref
        result = await generateImageFromPrompt(toolPrompt, campaign.aspectRatio, base64, mime);
      } else if (activeAssetTool === 'animate') {
        result = await generateVideoFromPrompt(toolPrompt, campaign.aspectRatio, base64, mime);
      } else if (activeAssetTool === 'video_gen') {
        result = await generateVideoFromPrompt(toolPrompt, campaign.aspectRatio, base64, mime);
      }

      setToolResult(result);
    } catch (error) {
      console.error("Error executing tool:", error);
      alert("Error al procesar la solicitud IA.");
    } finally {
      setIsToolProcessing(false);
    }
  };

  const clearTool = () => {
    setToolPrompt('');
    setToolResult(null);
  };

  // Meta Ads State
  const [metaToken, setMetaToken] = useState<string | null>(null);
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedPage, setSelectedPage] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [chatNotification, setChatNotification] = useState<string | null>(null);

  const handleLogoClick = () => {
    const name = userProfile.displayName || currentUser?.displayName || '';
    const firstName = name ? name.split(' ')[0] : 'usuario';
    const msg = `¡Hola, ${firstName}! Soy tu asistente Smart Ads. Puedo ayudarte a generar conceptos estratégicos, analizar tu mercado y crear anuncios de alto impacto. ¿En qué puedo apoyarte hoy?`;
    setChatNotification(msg);
    // Briefly clear so it can be re-triggered if clicked multiple times
    setTimeout(() => setChatNotification(null), 500);
  };

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishStep, setPublishStep] = useState<'config' | 'preview'>('config');
  const [publishMode, setPublishMode] = useState<'single' | 'bulk'>('single');

  // Auto-login to Meta if token exists
  useEffect(() => {
    const initMeta = async () => {
      const savedToken = localStorage.getItem('meta_access_token');
      if (savedToken) {
        setMetaToken(savedToken);
        try {
          const accounts = await getAdAccounts(savedToken);
          const pgs = await getPages(savedToken);
          setAdAccounts(accounts);
          setPages(pgs);
          if (accounts.length > 0) setSelectedAdAccount(accounts[0].id);
          if (pgs.length > 0) setSelectedPage(pgs[0].id);
        } catch (err) {
          console.error("Auto-login fetch error:", err);
          // If token is invalid, clear it
          if (String(err).includes('Session has expired')) {
            localStorage.removeItem('meta_access_token');
            setMetaToken(null);
          }
        }
      }
    };
    initMeta();
  }, []);

  useEffect(() => {
    if (chatNotification) {
      const timer = setTimeout(() => setChatNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [chatNotification]);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        setLoginEmail(user.email || '');
        localStorage.setItem('smart_ads_logged_in', 'true');
        fetchHistory(user.email || '');
        fetchUserProfile(user.uid, user);
        
        // Initialize credits from server (gives 60 to new users)
        try {
          const res = await fetch('/api/user/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid, email: user.email })
          });
          const data = await res.json();
          if (data.credits !== undefined) {
            setCredits(data.credits);
            if (data.isNew) {
              setChatNotification('¡Bienvenido! Te hemos obsequiado 60 créditos iniciales.');
            }
          }
        } catch (err) {
          console.error("Error initializing user credits:", err);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (results.length > 0 && !isProcessing && activeHomeTab === 'publicar') {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results, isProcessing, activeHomeTab]);

  const fetchHistory = async (email: string) => {
    if (!email) return;
    setIsFetchingHistory(true);
    try {
      const q = query(
        collection(db, 'history'),
        where('userEmail', '==', email),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const items: HistoryItem[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          timestamp: data.timestamp?.toDate()?.toISOString() || new Date().toISOString(),
          campaign: data.campaign,
          results: data.results
        });
      });
      setHistoryItems(items);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleGenerateConcept = async () => {
    if (!campaign.productName.trim()) {
      setChatNotification('Por favor, ingresa el nombre del producto primero.');
      return;
    }
    
    setIsGeneratingConcept(true);
    try {
      const concept = await generateCreativeConcept(
        campaign.productName,
        campaign.objective,
        campaign.audience
      );
      setCampaign(prev => ({ ...prev, creativeConcept: concept }));
      setChatNotification('Concepto Neuronal generado (Idea central del anuncio).');
    } catch (error) {
      console.error('Error generating concept:', error);
      setChatNotification('Hubo un error al generar el concepto. Por favor, intenta de nuevo.');
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  const handleEnhancePrompt = async () => {
    const currentPrompt = activeAssetTool === 'campaign' ? campaign.instruction : toolPrompt;
    
    setIsEnhancingPrompt(true);
    try {
      let toolType: 'image' | 'video' | 'campaign' = 'image';
      if (activeAssetTool === 'campaign') toolType = 'campaign';
      else if (['animate', 'video_gen'].includes(activeAssetTool)) toolType = 'video';
      
      const enhanced = await enhancePrompt(currentPrompt, toolType, {
        productName: campaign.productName,
        objective: campaign.objective,
        concept: campaign.creativeConcept,
        audience: campaign.audience
      });
      
      if (activeAssetTool === 'campaign') {
        setCampaign(prev => ({ ...prev, instruction: enhanced }));
      } else {
        setToolPrompt(enhanced);
      }
      setChatNotification('IA: Prompt optimizado con detalles profesionales de alto impacto.');
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      setChatNotification('Error al optimizar el prompt. Por favor, verifica tu conexión.');
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      await signInWithGoogle();
      // Auth state listener will handle the rest
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("El usuario cerró la ventana de autenticación.");
        setChatNotification('Inicio de sesión cancelado.');
        return;
      }
      
      console.error("Login Error:", error);
      
      // Detailed error handling for custom domain issues
      if (error.code === 'auth/unauthorized-domain') {
        setChatNotification('⚠️ ERROR DE DOMINIO: Este dominio no está autorizado en Firebase. Por favor, agrega "smartads.com.co" en "Dominios autorizados" en la Consola de Firebase (Autenticación > Ajustes).');
        return;
      }

      // Fallback for simulation if needed (only if they typed an email)
      if (loginEmail && !loginEmail.includes('google.com')) {
        setIsLoggedIn(true);
        localStorage.setItem('smart_ads_logged_in', 'true');
        setChatNotification('Aviso: Has ingresado en modo simulación local porque la conexión con Google falló.');
      } else {
        setChatNotification('Error al iniciar sesión. Por favor, verifica tu conexión.');
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setCurrentUser(null);
    setMetaToken(null);
    localStorage.removeItem('smart_ads_logged_in');
  };

  const fetchUserProfile = async (userId: string, firebaseUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        
        // Force unlimited for user
        if (firebaseUser.email === 'smartdigitalexperience@gmail.com') {
          setCredits(-1);
        }

        setUserProfile({
          ...data,
          multiVariantEnabled: data.multiVariantEnabled !== undefined ? data.multiVariantEnabled : true
        });
      } else {
        // Default values from Google Auth if doc doesn't exist
        setUserProfile({
          displayName: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          phone: '',
          website: '',
          multiVariantEnabled: true
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setIsSavingProfile(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        ...userProfile,
        updatedAt: serverTimestamp()
      });
      setShowProfile(false);
      setChatNotification('Perfil actualizado correctamente.');
    } catch (error) {
      console.error("Error saving profile:", error);
      setChatNotification('Error al actualizar el perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleMetaLogin = async () => {
    try {
      const url = await getMetaAuthUrl();
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(url, 'MetaLogin', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (error) {
      console.error("Meta Login Error:", error);
    }
  };

  useEffect(() => {
    const handleAuthSuccess = async (token: string) => {
      setMetaToken(token);
      setIsLoggedIn(true);
      localStorage.setItem('smart_ads_logged_in', 'true');
      localStorage.setItem('meta_access_token', token); // Persist token for reloads
      
      try {
        setChatNotification('¡Conexión con Meta sincronizada!');
        const accounts = await getAdAccounts(token);
        const pgs = await getPages(token);
        setAdAccounts(accounts);
        setPages(pgs);
        if (accounts.length > 0) setSelectedAdAccount(accounts[0].id);
        if (pgs.length > 0) setSelectedPage(pgs[0].id);
      } catch (err) {
        console.error("Error fetching Meta data:", err);
      }
    };

    // 1. Check for callback token in storage (fallback for mobile/lost-opener)
    const storedToken = localStorage.getItem('meta_access_token_callback');
    if (storedToken) {
      handleAuthSuccess(storedToken);
      localStorage.removeItem('meta_access_token_callback');
      localStorage.removeItem('meta_auth_status');
    }

    // 2. Handle Message Event (Standard Popup)
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'META_AUTH_SUCCESS') {
        handleAuthSuccess(event.data.accessToken);
      }
    };

    // 3. Handle Storage Event (Cross-tab Sync)
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'meta_access_token_callback' && event.newValue) {
        handleAuthSuccess(event.newValue);
        localStorage.removeItem('meta_access_token_callback');
        localStorage.removeItem('meta_auth_status');
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const executePublish = async () => {
    const currentResult = results[selectedResultIndex];
    if (!currentResult || !metaToken || !selectedAdAccount || !selectedPage) {
      setChatNotification('Asegúrate de estar conectado a Meta y tener seleccionada una Cuenta y Página.');
      return;
    }

    // Credit check
    if (credits !== -1 && credits < 150) {
      setChatNotification('No tienes suficientes créditos para publicar esta campaña (Costo: 150 créditos).');
      setShowRecharge(true);
      return;
    }

    // Validation of mandatory fields based on objective
    const missingFields: string[] = [];
    if (!campaign.budget) missingFields.push('Presupuesto Diario');
    
    if ((campaign.objective === 'Tráfico' || campaign.objective === 'Ventas') && !campaign.destinationUrl) {
      missingFields.push('URL de Destino');
    }
    
    if (campaign.objective === 'Ventas' && !campaign.pixelId) {
      missingFields.push('ID del Píxel');
    }

    if (missingFields.length > 0) {
      setChatNotification(`¡Atención! Faltan campos obligatorios para el objetivo seleccionado: ${missingFields.join(', ')}.`);
      return;
    }
    
    setIsPublishing(true);
    setChatNotification('Iniciando proceso de publicación en Meta Ads...');
    
    let finalBudget = campaign.budget || '5.00';
    let finalObjective = campaign.objective;
    let finalScheduleEnd = campaign.scheduleEnd;

    if (currentResult.funnelPhase) {
      finalBudget = currentResult.funnelPhase.budget.toString();
      finalObjective = currentResult.funnelPhase.objective;
      
      if (campaign.scheduleStart && currentResult.funnelPhase.duration) {
        try {
          const start = new Date(campaign.scheduleStart);
          const end = new Date(start.getTime() + currentResult.funnelPhase.duration * 24 * 60 * 60 * 1000);
          finalScheduleEnd = end.toISOString();
        } catch (e) {
          console.error("Date calculation error:", e);
        }
      }
    }

    try {
      setChatNotification('Paso 1/4: Subiendo multimedia a Meta...');
      const res = await publishAd({
        accessToken: metaToken,
        adAccountId: selectedAdAccount,
        pageId: selectedPage,
        productName: campaign.productName,
        imageUrl: currentResult.generatedImageUrl || '',
        headline: currentResult.headline || campaign.productName, // Copy -> Title
        body: `${currentResult.captions.aida.attention}\n\n${currentResult.captions.aida.interest}\n\n${currentResult.captions.aida.desire}\n\n${currentResult.captions.aida.action}`, // Caption -> Text
        objective: finalObjective,
        budget: finalBudget,
        audience: campaign.audience,
        location: campaign.location,
        gender: campaign.gender,
        ageRange: campaign.ageRange,
        destinationUrl: campaign.destinationUrl || '',
        pixelId: campaign.pixelId || '',
        whatsappNumber: campaign.whatsappNumber || '',
        currency: campaign.currency || 'USD',
        facebookEnabled: campaign.facebookEnabled,
        instagramEnabled: campaign.instagramEnabled,
        feedEnabled: campaign.feedEnabled,
        reelsEnabled: campaign.reelsEnabled,
        storiesEnabled: campaign.storiesEnabled,
        marketplaceEnabled: campaign.marketplaceEnabled,
        instreamEnabled: campaign.instreamEnabled,
        audienceNetworkEnabled: campaign.audienceNetworkEnabled,
        messengerEnabled: campaign.messengerEnabled,
        advantagePlacementsEnabled: campaign.advantagePlacementsEnabled,
        scheduleStart: campaign.scheduleStart,
        scheduleEnd: finalScheduleEnd
      });
      
      if (res.success) {
        // Deduct credits after success
        if (credits !== -1 && currentUser) {
          try {
            const deductRes = await fetch('/api/user/credits/deduct', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: currentUser.uid, amount: 150 })
            });
            const deductData = await deductRes.json();
            if (deductRes.ok) {
              setCredits(deductData.remaining);
            }
          } catch (e) {
            console.error("Credit deduction error on publish:", e);
          }
        }

        setChatNotification(`¡Éxito! Campaña publicada correctamente. ID de Campaña: ${res.campaignId}`);
        alert(`${res.message}\n\nID de Campaña: ${res.campaignId}\n\nPuedes verla en tu Administrador de Anuncios: ${res.metaLink}`);
        setShowPublishModal(false);
      } else {
        // Special check for WhatsApp notice from backend
        if (res.error && res.error.includes('WhatsApp')) {
          setChatNotification('¡Error! No hemos detectado un número de WhatsApp vinculado a tu perfil de Meta. Por favor vincúlalo en tu Administrador de Facebook.');
        } else {
          setChatNotification('Error en la publicación: ' + res.error);
        }
        alert("Error al publicar: " + res.error);
      }
    } catch (error: any) {
      console.error("Publish Error Details:", error);
      const errorMessage = error.message || 'Error desconocido';
      
      if (errorMessage.includes('WhatsApp')) {
         setChatNotification('¡Advertencia! No tienes un número de WhatsApp vinculado a tu cuenta de Meta. La campaña no pudo crearse con este objetivo.');
      } else {
         setChatNotification(`Error crítico: ${errorMessage}`);
      }
      alert(`Error al publicar: ${errorMessage}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const executePublishBulk = async () => {
    if (!metaToken || !selectedAdAccount || !selectedPage) {
      setChatNotification('Asegúrate de estar conectado a Meta y tener seleccionada una Cuenta y Página.');
      return;
    }

    if (results.length === 0) {
      setChatNotification('No hay anuncios generados para publicar.');
      return;
    }

    const totalCost = 150 * results.length;
    if (credits !== -1 && credits < totalCost) {
      setChatNotification(`No tienes suficientes créditos para publicar los ${results.length} anuncios (Costo: ${totalCost} créditos).`);
      setShowRecharge(true);
      return;
    }

    setIsPublishing(true);
    setChatNotification(`Iniciando proceso de publicación masiva (${results.length} anuncios)...`);

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const adName = res.funnelPhase?.name || `Anuncio ${i + 1}`;
      setChatNotification(`Publicando anuncio ${successCount + 1}/${results.length}: ${adName}...`);

      let finalBudget = res.funnelPhase?.budget.toString() || campaign.budget || '5.00';
      let finalObjective = res.funnelPhase?.objective || campaign.objective || 'Reconocimiento';
      let finalScheduleEnd = campaign.scheduleEnd;

      if (campaign.scheduleStart && res.funnelPhase?.duration) {
        try {
          const start = new Date(campaign.scheduleStart);
          const end = new Date(start.getTime() + res.funnelPhase.duration * 24 * 60 * 60 * 1000);
          finalScheduleEnd = end.toISOString();
        } catch (e) {
          console.error("Date calculation error:", e);
        }
      }

      try {
        const publishResponse = await publishAd({
          accessToken: metaToken,
          adAccountId: selectedAdAccount,
          pageId: selectedPage,
          productName: campaign.productName,
          imageUrl: res.generatedImageUrl || '',
          headline: res.headline || campaign.productName,
          body: `${res.captions.aida.attention}\n\n${res.captions.aida.interest}\n\n${res.captions.aida.desire}\n\n${res.captions.aida.action}`,
          objective: finalObjective,
          budget: finalBudget,
          audience: campaign.audience,
          location: campaign.location,
          gender: campaign.gender,
          ageRange: campaign.ageRange,
          destinationUrl: campaign.destinationUrl || '',
          pixelId: campaign.pixelId || '',
          whatsappNumber: campaign.whatsappNumber || '',
          currency: campaign.currency || 'USD',
          facebookEnabled: campaign.facebookEnabled,
          instagramEnabled: campaign.instagramEnabled,
          feedEnabled: campaign.feedEnabled,
          reelsEnabled: campaign.reelsEnabled,
          storiesEnabled: campaign.storiesEnabled,
          marketplaceEnabled: campaign.marketplaceEnabled,
          instreamEnabled: campaign.instreamEnabled,
          audienceNetworkEnabled: campaign.audienceNetworkEnabled,
          messengerEnabled: campaign.messengerEnabled,
          advantagePlacementsEnabled: campaign.advantagePlacementsEnabled,
          scheduleStart: campaign.scheduleStart,
          scheduleEnd: finalScheduleEnd
        });

        if (publishResponse.success) {
          successCount++;
          // Deduct credits
          if (credits !== -1 && currentUser) {
            try {
              const deductRes = await fetch('/api/user/credits/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid, amount: 150 })
              });
              const deductData = await deductRes.json();
              if (deductRes.ok) {
                setCredits(deductData.remaining);
              }
            } catch (e) {
              console.error("Credit deduction error:", e);
            }
          }
        } else {
          errors.push(`Error en ${adName}: ${publishResponse.error}`);
        }
      } catch (err: any) {
        errors.push(`Error en ${adName}: ${err.message}`);
      }
    }

    setIsPublishing(false);
    if (successCount === results.length) {
      setChatNotification(`¡Éxito! Los ${results.length} anuncios han sido publicados correctamente.`);
      alert(`¡Estrategia Desplegada!\n\nLos ${results.length} anuncios han sido creados en tu Administrador de Anuncios.`);
      setShowPublishModal(false);
    } else if (successCount > 0) {
      setChatNotification(`Publicación parcial: ${successCount}/${results.length} anuncios creados.`);
      alert(`Se publicaron ${successCount} anuncios, pero hubo errores:\n\n${errors.join('\n')}`);
    } else {
      setChatNotification('No se pudo publicar ningún anuncio.');
      alert(`Error al publicar la estrategia:\n\n${errors.join('\n')}`);
    }
  };

  const [isDeducting, setIsDeducting] = useState(false);

  const handleRecharge = (pkg: any) => {
    if (!currentUser) {
      setChatNotification('Por favor, inicia sesión para recargar.');
      return;
    }
    
    // Add userId to Bold link if possible, or use metadata approach
    const checkoutUrl = new URL(pkg.link);
    // Bold LNK doesn't officially support metadata in query params easily for webhooks 
    // without their special JS SDK, but we'll try to append it or use our server as proxy later.
    // For now, we open it. In production, we'd use a server session to create the link.
    window.open(`${pkg.link}?userId=${currentUser.uid}`, '_blank');
    setShowRecharge(false);
    setChatNotification('Redirigiendo a pasarela de pago Bold...');
  };

  const [metaAnalysisData, setMetaAnalysisData] = useState<{
    campaigns: any[];
    adSets: any[];
    ads: any[];
  }>({
    campaigns: [],
    adSets: [],
    ads: []
  });
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState({
    campaignId: '',
    adSetId: '',
    adId: ''
  });
  const [analysisDateRange, setAnalysisDateRange] = useState({
    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    until: new Date().toISOString().split('T')[0]
  });
  const [isImportingMeta, setIsImportingMeta] = useState(false);

  // New logic for Meta Analysis imports
  useEffect(() => {
    if (metaToken && selectedAdAccount) {
      loadAnalysisCampaigns();
    }
  }, [metaToken, selectedAdAccount]);

  useEffect(() => {
    if (metaToken && selectedAdAccount && selectedAnalysisIds.campaignId) {
      loadAnalysisAdSets();
    } else {
      setMetaAnalysisData(prev => ({ ...prev, adSets: [], ads: [] }));
      setSelectedAnalysisIds(prev => ({ ...prev, adSetId: '', adId: '' }));
    }
  }, [selectedAnalysisIds.campaignId]);

  useEffect(() => {
    if (metaToken && selectedAdAccount && selectedAnalysisIds.adSetId) {
      loadAnalysisAds();
    } else {
      setMetaAnalysisData(prev => ({ ...prev, ads: [] }));
      setSelectedAnalysisIds(prev => ({ ...prev, adId: '' }));
    }
  }, [selectedAnalysisIds.adSetId]);

  const loadAnalysisCampaigns = async () => {
    if (!metaToken || !selectedAdAccount) return;
    try {
      const data = await getCampaigns(metaToken, selectedAdAccount);
      setMetaAnalysisData(prev => ({ ...prev, campaigns: data, adSets: [], ads: [] }));
    } catch (error) {
      console.error("Error loading analysis campaigns:", error);
    }
  };

  const loadAnalysisAdSets = async () => {
    if (!metaToken || !selectedAdAccount || !selectedAnalysisIds.campaignId) return;
    try {
      const data = await getAdSets(metaToken, selectedAdAccount, selectedAnalysisIds.campaignId);
      setMetaAnalysisData(prev => ({ ...prev, adSets: data, ads: [] }));
    } catch (error) {
      console.error("Error loading analysis adsets:", error);
    }
  };

  const loadAnalysisAds = async () => {
    if (!metaToken || !selectedAdAccount || !selectedAnalysisIds.adSetId) return;
    try {
      const data = await getAds(metaToken, selectedAdAccount, selectedAnalysisIds.adSetId);
      setMetaAnalysisData(prev => ({ ...prev, ads: data }));
    } catch (error) {
      console.error("Error loading analysis ads:", error);
    }
  };

  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [strategicPlan, setStrategicPlan] = useState<StrategicPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchMetaDataResult = async (): Promise<CSVRow[] | null> => {
    if (!metaToken || !selectedAdAccount) {
      setChatNotification("Por favor, conecta tu cuenta de Meta y selecciona una cuenta publicitaria.");
      return null;
    }

    setIsImportingMeta(true);
    setChatNotification("Sincronizando datos desde Meta para el análisis...");

    try {
      let level: 'campaign' | 'adset' | 'ad' = 'ad';
      let filtering = '';

      if (selectedAnalysisIds.adId) {
        filtering = JSON.stringify([{ field: 'ad.id', operator: 'IN', value: [selectedAnalysisIds.adId] }]);
      } else if (selectedAnalysisIds.adSetId) {
        level = 'ad';
        filtering = JSON.stringify([{ field: 'adset.id', operator: 'IN', value: [selectedAnalysisIds.adSetId] }]);
      } else if (selectedAnalysisIds.campaignId) {
        level = 'ad';
        filtering = JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: [selectedAnalysisIds.campaignId] }]);
      }

      const insights = await getInsights(metaToken, {
        adAccountId: selectedAdAccount,
        level,
        filtering,
        timeRange: { since: analysisDateRange.since, until: analysisDateRange.until },
        timeIncrement: 1
      });

      if (insights && insights.length > 0) {
        const formattedData: CSVRow[] = insights.map((item: any) => {
          // Extract actions for specifically identifying results
          const actions = item.actions || [];
          
          // Helper to get action value by multiple potential keys
          const getAction = (keys: string[]) => {
            const found = actions.find((a: any) => keys.includes(a.action_type));
            return parseInt(found?.value || '0');
          };

          // 1. Result logic based on priority and common Meta action types
          const leads = getAction(['lead', 'on-facebook lead', 'offsite_conversion.fb_pixel_lead']);
          const purchases = getAction(['purchase', 'offsite_conversion.fb_pixel_purchase']);
          const messages = getAction(['onsite_conversion.messaging_conversation_started_7d', 'messaging_conversation_started_7d']);
          const conversions = getAction(['on_facebook_workflow_completion', 'onsite_conversion.post_save', 'offsite_conversion.fb_pixel_custom']);
          const linkClicks = parseInt(item.inline_link_clicks || '0');
          
          // Determine "Results" value using descending priority
          let resultVal = 0;
          if (leads > 0) resultVal = leads;
          else if (purchases > 0) resultVal = purchases;
          else if (messages > 0) resultVal = messages;
          else if (conversions > 0) resultVal = conversions;
          else if (linkClicks > 0) resultVal = linkClicks;
          else if (parseInt(item.reach || '0') > 0 && resultVal === 0) {
             // Fallback if no specific actions but objective might be reach (but user asked for real results)
             // resultVal remains 0 or uses reach if that's the only thing
          }

          // 2. Engagement (Interacciones) 
          const pageEngagement = getAction(['page_engagement']);
          const postEngagement = getAction(['post_engagement']);
          const omniEngagement = pageEngagement || postEngagement || parseInt(item.clicks || '0');

          return {
            formato: item.adset_name || 'Personalizado',
            concepto: item.campaign_name || 'Meta Ads',
            texto: item.ad_name || 'Anuncio de Meta',
            ctr: parseFloat(item.ctr || item.inline_link_click_ctr || '0'),
            engagement: omniEngagement,
            resultados: resultVal,
            impresiones: parseInt(item.impressions || '0'),
            alcance: parseInt(item.reach || '0'),
            clics_enlace: parseInt(item.inline_link_clicks || item.clicks || '0'),
            cpc: parseFloat(item.cpc || '0'),
            cpm: parseFloat(item.cpm || '0'),
            gasto_total: parseFloat(item.spend || '0'),
            fecha: item.date_start
          };
        });
        return formattedData;
      }
      return [];
    } catch (error) {
      console.error("Error fetching meta data:", error);
      setChatNotification("Ocurrió un error al importar los datos de Meta.");
      return null;
    } finally {
      setIsImportingMeta(false);
    }
  };

  const handleImportMetaData = async () => {
    const data = await fetchMetaDataResult();
    if (data) {
      if (data.length > 0) {
        setCsvData(data);
        setChatNotification(`Se importaron ${data.length} registros desde Meta Ads.`);
      } else {
        setChatNotification("No se encontraron datos en el periodo seleccionado.");
      }
    }
  };

  const handleExecuteAnalysis = async () => {
    if (credits !== -1 && credits < 100) {
      setChatNotification('No tienes suficientes créditos para realizar el análisis (Costo: 100 créditos).');
      setShowRecharge(true);
      return;
    }

    let dataToAnalyze = [...csvData];

    setIsAnalyzing(true);

    try {
      if (dataToAnalyze.length === 0) {
        if (selectedAdAccount) {
          const metaData = await fetchMetaDataResult();
          if (metaData && metaData.length > 0) {
            setCsvData(metaData);
            dataToAnalyze = metaData;
          } else {
            if (!metaData) {
              setIsAnalyzing(false);
              return;
            }
            setChatNotification("No hay datos para analizar.");
            setIsAnalyzing(false);
            return;
          }
        } else {
          setChatNotification("Primero conecta Meta Ads o carga un archivo CSV.");
          setIsAnalyzing(false);
          return;
        }
      }

      setChatNotification("IA Smart Ads analizando el rendimiento de tus campañas...");
      
      // Deduct credits
      if (credits !== -1 && currentUser) {
        try {
          const res = await fetch('/api/user/credits/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid, amount: 100 })
          });
          const data = await res.json();
          if (res.ok) {
            setCredits(data.remaining);
          } else {
            setChatNotification('Error en créditos: ' + (data.error || 'Saldo insuficiente.'));
            setShowRecharge(true);
            setIsAnalyzing(false);
            return;
          }
        } catch (e) {
          console.error("Credit deduction error:", e);
        }
      }

      const report = await analyzePerformanceData(dataToAnalyze);
      setAnalysisReport(report);
      setChatNotification("¡Análisis completado! Revisa los resultados del dashboard.");
      setActiveHomeTab('analizar');
    } catch (error) {
      console.error("Analysis Error:", error);
      setChatNotification("Ocurrió un error durante el análisis de datos.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteStrategicPlan = async () => {
    if (!campaign.productName || !campaign.budget || !campaign.objective) {
      setChatNotification('Por favor, completa los campos: Nombre del producto, Presupuesto y Objetivo.');
      return;
    }

    if (credits !== -1 && credits < 50) {
      setChatNotification('Necesitas al menos 50 créditos para generar una Estrategia Digital.');
      setShowRecharge(true);
      return;
    }

    setIsPlanning(true);
    setChatNotification('Iniciando Planner Estratégico: Diseñando Funnel y Estimaciones...');

    try {
      // Deduct credits
      if (credits !== -1 && currentUser) {
        try {
          const res = await fetch('/api/user/credits/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid, amount: 50 })
          });
          const data = await res.json();
          if (res.ok) {
            setCredits(data.remaining);
          } else {
            setChatNotification('Error en créditos: ' + (data.error || 'Saldo insuficiente.'));
            setShowRecharge(true);
            setIsPlanning(false);
            return;
          }
        } catch (e) {
          console.error("Credit deduction error:", e);
        }
      }

      const pageObject = pages.find(p => p.id === selectedPage);
      const pageName = pageObject ? pageObject.name : campaign.facebookPage;

      // Calculate analysis metrics if csvData exists
      let analysisMetrics = undefined;
      if (csvData.length > 0) {
        const totalImpressions = csvData.reduce((acc, curr) => acc + (curr.impresiones || 0), 0);
        const totalResults = csvData.reduce((acc, curr) => acc + (curr.resultados || 0), 0);
        const totalClicks = csvData.reduce((acc, curr) => acc + (curr.clics_enlace || 0), 0);
        const totalSpend = csvData.reduce((acc, curr) => acc + (curr.gasto_total || 0), 0);
        
        analysisMetrics = {
          avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          avgCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
          avgCpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
          avgCpa: totalResults > 0 ? totalSpend / totalResults : 0
        };
      }

      const plan = await generateStrategicPlan(
        campaign.productName,
        parseFloat(campaign.budget || '0'),
        campaign.audience,
        campaign.objective,
        campaign.currency,
        pageName,
        analysisMetrics
      );
      setStrategicPlan(plan);
      setChatNotification('¡Estrategia Digital Generada! Revisa el Funnel y Cronograma.');
    } catch (error) {
      console.error("Strategy Planning Error:", error);
      setChatNotification("Ocurrió un error al planificar la estrategia.");
    } finally {
      setIsPlanning(false);
    }
  };

  const AnalysisDashboard = ({ data, report }: { data: CSVRow[], report: AnalysisReport | null }) => {
    if (!data.length) return null;

    // Process daily data for Curve chart
    const dailyData: Record<string, any> = {};
    data.forEach(row => {
      const date = row.fecha || 'Sin fecha';
      
      if (!dailyData[date]) {
        // We store 'day' for visual labeling but group by full 'date'
        const dayLabel = date.split('-').pop() || date;
        dailyData[date] = { fullDate: date, day: dayLabel, resultados: 0, impressions: 0, clicks: 0, reach: 0 };
      }
      dailyData[date].resultados += row.resultados || 0;
      dailyData[date].impressions += row.impresiones || 0;
      dailyData[date].clicks += row.clics_enlace || 0;
      dailyData[date].reach += row.alcance || 0;
    });

    const chartData = Object.values(dailyData).sort((a, b) => a.fullDate.localeCompare(b.fullDate));

    const totalImpressions = data.reduce((acc, curr) => acc + (curr.impresiones || 0), 0);
    const totalReach = data.reduce((acc, curr) => acc + (curr.alcance || 0), 0);
    const totalResults = data.reduce((acc, curr) => acc + (curr.resultados || 0), 0);
    const totalClicks = data.reduce((acc, curr) => acc + (curr.clics_enlace || 0), 0);
    const totalEngagement = data.reduce((acc, curr) => acc + (curr.engagement || 0), 0);
    const totalSpend = data.reduce((acc, curr) => acc + (curr.gasto_total || 0), 0);
    
    // Average calculations
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const avgCpa = totalResults > 0 ? totalSpend / totalResults : 0;

    const barMetrics = [
      { name: 'Impresiones', value: totalImpressions },
      { name: 'Alcance', value: totalReach },
      { name: 'Interacciones', value: totalEngagement },
      { name: 'Clics', value: totalClicks },
      { name: 'Resultados', value: totalResults }
    ];

    const pieMetric = (label: string, value: string | number, color: string, subValue?: string) => (
      <div className="flex flex-col items-center">
        <div className="h-32 w-32 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{ value: 100 }]}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={45}
                fill="#ffffff10"
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              />
              <Pie
                data={[{ value: 75 }]}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={45}
                fill={color}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-orbitron font-bold text-white leading-tight">{value}</span>
            <span className="text-[7px] text-white/30 uppercase tracking-[0.2em]">{label}</span>
            {subValue && <span className="text-[6px] text-white/20 uppercase mt-1">{subValue}</span>}
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart: Rendimiento (Results) */}
          <div className="lg:col-span-2 glass-panel p-6 bg-white/5 border-neon-blue/20">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="font-orbitron text-xs font-bold text-neon-blue uppercase tracking-widest">RENDIMIENTO (RESULTADOS)</h3>
                <p className="text-[14px] font-orbitron font-black text-white">{totalResults.toLocaleString()} <span className="text-[9px] text-white/40 uppercase tracking-widest font-medium ml-1">Total Resultados</span></p>
              </div>
              <span className="text-[9px] text-white/40 uppercase tracking-widest">Vista por día del mes</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorResults" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d1ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00d1ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="day" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [Math.round(value), 'Resultados']}
                    contentStyle={{ backgroundColor: '#000000cc', borderColor: '#00d1ff66', borderRadius: '8px', fontSize: '10px' }}
                    itemStyle={{ color: '#00d1ff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resultados" 
                    stroke="#00d1ff" 
                    fillOpacity={1} 
                    fill="url(#colorResults)" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10b981', fillOpacity: 1, stroke: '#10b981', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GLOBAL KPIs: Circular Charts */}
          <div className="glass-panel p-6 bg-neon-blue/5 border-neon-blue/20">
            <h3 className="font-orbitron text-xs font-bold text-neon-blue uppercase tracking-widest mb-6">KPIs GLOBALES (RATIOS)</h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex justify-around items-center h-full flex-wrap gap-4">
                {pieMetric('CTR', avgCtr.toFixed(1) + '%', '#00d1ff')}
                {pieMetric('CPA', '$' + Math.round(avgCpa), '#ff4d4d')}
                {pieMetric('CPC', '$' + Math.round(avgCpc), '#10b981')}
                {pieMetric('CPM', '$' + Math.round(avgCpm), '#8b5cf6')}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs GLOBALES: Horizontal Bar Chart & Values */}
        <div className="glass-panel p-8 bg-white/5 border-white/10">
          <h3 className="font-orbitron text-xs font-bold text-white uppercase tracking-widest mb-8">KPIS GLOBALES DE VOLUMEN</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barMetrics} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#ffffff40" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false} 
                    width={80}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#000000cc', borderColor: '#00d1ff22', borderRadius: '8px', fontSize: '10px' }}
                  />
                  <Bar dataKey="value" fill="#00d1ff" radius={[0, 4, 4, 0]} barSize={15}>
                    {barMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#00d1ff' : '#009dbf'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {barMetrics.map((stat, idx) => (
                <div key={idx} className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <p className="text-[9px] text-white/40 uppercase tracking-[0.2em] mb-1">{stat.name}</p>
                  <p className="font-orbitron text-xl font-bold text-white">{stat.value.toLocaleString()}</p>
                </div>
              ))}
              <div className="col-span-2 bg-neon-blue/10 p-5 rounded-lg border border-neon-blue/20 flex justify-between items-center">
                <div>
                  <p className="text-[9px] text-neon-blue uppercase tracking-[0.3em] mb-1 font-bold">Inversión Real (Gasto Total)</p>
                  <p className="font-orbitron text-2xl font-black text-white">${Math.round(totalSpend).toLocaleString()}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-neon-blue/20 flex items-center justify-center">
                  <DollarSign className="text-neon-blue" size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {report && (
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
            <div className="glass-panel p-8 bg-white/5 border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <BrainCircuit className="text-neon-blue" size={24} />
                <h3 className="font-orbitron text-sm font-bold uppercase tracking-widest text-white">REPORTE DE INTELIGENCIA ESTRATÉGICA</h3>
              </div>
              
              <div className="p-6 bg-neon-blue/5 rounded-xl border border-neon-blue/10 mb-8 italic text-white/80 text-sm leading-relaxed">
                "{report.summary}"
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-neon-blue border-b border-neon-blue/10 pb-2">
                    <CheckCircle2 size={16} />
                    <h4 className="text-[10px] font-orbitron uppercase font-bold tracking-widest">Conclusiones Clave</h4>
                  </div>
                  <ul className="space-y-3">
                    {report.conclusions.map((c, i) => (
                      <li key={i} className="text-xs text-white/60 flex gap-3 leading-relaxed">
                        <span className="text-neon-blue font-bold font-mono">0{i+1}.</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-green-400 border-b border-green-400/10 pb-2">
                    <Lightbulb size={16} />
                    <h4 className="text-[10px] font-orbitron uppercase font-bold tracking-widest">Recomendaciones de Optimización</h4>
                  </div>
                  <ul className="space-y-3">
                    {report.recommendations.map((r, i) => (
                      <li key={i} className="text-xs text-white/60 flex gap-3 leading-relaxed">
                        <span className="text-green-400 font-bold font-mono">✓</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                <div className="p-6 bg-green-500/5 rounded-xl border border-green-500/10">
                  <h3 className="font-orbitron text-[10px] font-bold text-green-400 uppercase mb-4 flex items-center gap-2 tracking-[0.2em]">
                    <TrendingUp size={14} /> TOP PERFORMERS
                  </h3>
                  <div className="space-y-3">
                    {report.topPerformers.map((item, i) => (
                      <div key={i} className="p-3 bg-black/20 rounded-lg border border-white/5">
                        <p className="text-[10px] font-bold text-white mb-1 uppercase tracking-wider">{item.name}</p>
                        <p className="text-[9px] text-white/50 leading-relaxed">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-red-500/5 rounded-xl border border-red-500/10">
                  <h3 className="font-orbitron text-[10px] font-bold text-red-400 uppercase mb-4 flex items-center gap-2 tracking-[0.2em]">
                    <AlertTriangle size={14} /> LOW PERFORMERS
                  </h3>
                  <div className="space-y-3">
                    {report.lowPerformers.map((item, i) => (
                      <div key={i} className="p-3 bg-black/20 rounded-lg border border-white/5">
                        <p className="text-[10px] font-bold text-white mb-1 uppercase tracking-wider">{item.name}</p>
                        <p className="text-[9px] text-white/50 leading-relaxed">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center pt-8">
          <button 
            onClick={() => setActiveHomeTab('planificar')}
            className="group relative flex items-center gap-4 px-12 py-5 bg-neon-blue text-black font-orbitron font-black text-sm tracking-[0.3em] rounded-xl hover:shadow-[0_0_50px_rgba(0,209,255,0.4)] transition-all duration-500 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
            <Target className="group-hover:rotate-12 transition-transform" />
            CONTINUAR AL PLAN DE MEDIOS
          </button>
        </div>
      </div>
    );
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          const data = results.data as any[];
          const formattedData: CSVRow[] = data.map(row => ({
            formato: row.Formato || row.formato || '',
            concepto: row.Concepto || row.concepto || '',
            texto: row.Texto || row.texto || row.text || '',
            ctr: row.CTR || row.ctr || 0,
            engagement: row.Engagement || row.engagement || 0,
            resultados: row.Resultados || row.resultados || row.conversion || 0,
            impresiones: row.Impresiones || row.impresiones || 0,
            alcance: row.Alcance || row.alcance || 0,
            clics_enlace: row.Clics || row.clics || 0,
            cpc: row.CPC || row.cpc || 0,
            cpm: row.CPM || row.cpm || 0,
            gasto_total: row.Gasto || row.gasto || row.spend || 0,
            fecha: row.Fecha || row.fecha || row.date || ''
          })).filter(row => row.texto);
          setCsvData(formattedData);
        }
      });
    }
  };

  const handleStorytellingVideo = async (text: string, index: number, duration: 5 | 10 = 5) => {
    setIsVideoProcessing(`story-${index}`);
    setActiveDurationSelector(null);
    try {
      const currentResult = results[index];
      setActiveAssetTool('animate');
      setActiveHomeTab('crear');
      if (currentResult.generatedImageUrl) setVisualPreview(currentResult.generatedImageUrl);
      const storytellingPrompt = await generateStorytellingPrompt(
        text, 
        duration, 
        campaign.audience,
        currentResult.captions.aida.action
      );
      setToolPrompt(storytellingPrompt);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setChatNotification('¡Cargando prompt profesional en ADS STUDIO!');
    } catch (error: any) {
      console.error("Error setting up storytelling video:", error);
      setChatNotification('Error al preparar el Video Studio.');
    } finally {
      setIsVideoProcessing(null);
    }
  };
  const applyOptimizedVisual = async () => {
    if (!optimizedVisual) return;
    
    setVisualPreview(optimizedVisual);
    setShowStudioComparison(false);
    setOptimizedVisual(null);
    setChatNotification('¡Optimización Aplicada! Ahora puedes generar tus anuncios con alta fidelidad.');

    // Deduct credits
    if (credits !== -1 && currentUser) {
      try {
        const res = await fetch('/api/user/credits/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid, amount: 30 })
        });
        const data = await res.json();
        setCredits(data.remaining);
      } catch (e) {
        console.error("Credit deduction error:", e);
      }
    }
  };

  const handleVisualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVisualFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVisualPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductStudioRefine = async () => {
    if (!visualPreview || !visualFile) {
      setChatNotification('Sube una imagen del producto primero.');
      return;
    }
    
    if (credits !== -1 && credits < 30) {
      setChatNotification('Necesitas al menos 30 créditos para usar Product Studio.');
      setShowRecharge(true);
      return;
    }

    setIsStudioProcessing(true);
    setChatNotification('Invocando Product Studio AI: Segmentando y aumentando resolución...');

    try {
      const base64 = visualPreview.split(',')[1];
      const mimeType = visualFile.type;
      
      const refinedImage = await optimizeProductReference(base64, mimeType, campaign.productName);
      
      if (refinedImage) {
        setOptimizedVisual(refinedImage);
        setShowStudioComparison(true);
        setChatNotification(`¡Optimización Finalizada! Revisa la calidad antes de continuar.`);
      } else {
        setChatNotification('No se pudo optimizar la imagen. Intenta nuevamente.');
      }
    } catch (error: any) {
      console.error("Studio Error:", error);
      setChatNotification('Error en Product Studio: ' + error.message);
    } finally {
      setIsStudioProcessing(false);
    }
  };

  const processAds = async () => {
    if (!campaign.productName) {
      setChatNotification('Faltan campos obligatorios: Nombre del producto.');
      return;
    }

    if (credits !== -1) {
      let requiredCredits = 50;
      if (campaign.format === 'video') {
        requiredCredits = campaign.videoDuration === 10 ? 200 : 100;
      }
      if (credits < requiredCredits) {
        setChatNotification('Tus créditos se han agotado. El sistema requiere una recarga para continuar.');
        setShowRecharge(true);
        return;
      }
    }

    setIsProcessing(true);
    setResults([]); // Clear previous results
    setSelectedResultIndex(0);
    setCurrentHistoryId(null); // New batch
    
    try {
      // 1. Deduct credits first via API
      if (credits !== -1 && currentUser) {
        let cost = 50;
        if (campaign.format === 'video') {
          cost = campaign.videoDuration === 10 ? 200 : 100;
        }

        const deductRes = await fetch('/api/user/credits/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid, amount: cost })
        });

        if (!deductRes.ok) {
          const errData = await deductRes.json();
          setChatNotification('Error en créditos: ' + (errData.error || 'Saldo insuficiente.'));
          setShowRecharge(true);
          setIsProcessing(false);
          return;
        }

        const deductData = await deductRes.json();
        setCredits(deductData.remaining);
      }
      let visualBase64 = '';
      let visualMimeType = '';
      
      if (visualPreview) {
        visualBase64 = visualPreview.split(',')[1];
        // If the visual was optimized, it's a PNG from Product Studio
        visualMimeType = visualPreview.startsWith('data:image/png') ? 'image/png' : (visualFile?.type || 'image/png');
      }

      const variantsCount = (strategicPlan || userProfile.multiVariantEnabled !== false) ? 3 : 1;

      // Use analysis report conclusions/insights as secondary learning
      const learningContext = analysisReport ? {
        topPerformers: analysisReport.topPerformers.map(p => p.name).join(', '),
        insights: analysisReport.strategicInsights,
        recommendations: analysisReport.recommendations.join('. ')
      } : null;

      const enrichedConcept = learningContext 
        ? `${campaign.creativeConcept}\n\n[ANÁLISIS NEURAL PREVIO]: ${learningContext.insights}. Recomendaciones: ${learningContext.recommendations}. Basado en éxitos previo de: ${learningContext.topPerformers}`
        : campaign.creativeConcept;

      const res = await analyzeAndGenerate(
        { ...campaign, creativeConcept: enrichedConcept },
        csvData,
        visualBase64,
        visualMimeType,
        variantsCount,
        strategicPlan || undefined
      );
      setResults(res);
      const count = res.length;
      setChatNotification('¡Listo! He generado tu propuesta publicitaria de alto impacto');
      
      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);

      // Save to History (Firestore) - Strip large visuals to avoid 1MB limit
      if (isLoggedIn && loginEmail) {
        try {
          // Create a clean version of results for history (no large base64)
          const resultsForHistory = res.map(r => ({
            ...r,
            // If it's a very large base64 (like a video or high-res image), we might need to skip or truncate
            // For now, we keep everything except the actual blob if it's huge, or just accept the risk
            // Actually, we'll try to preserve it but truncate if it's absolutely necessary.
            // Better yet: just save the prompts and metadata for now if it fails.
          }));

          const docRef = await addDoc(collection(db, 'history'), {
            userEmail: loginEmail,
            campaign: { ...campaign },
            results: resultsForHistory,
            timestamp: serverTimestamp()
          });
          setCurrentHistoryId(docRef.id);
          fetchHistory(loginEmail);
        } catch (err: any) {
          console.error("Error saving to history:", err);
          // If size error, retry without visuals
          if (err.message && err.message.includes('maximum allowed size')) {
            try {
              const strippedResults = res.map(r => ({ ...r, generatedImageUrl: '(Media too large for history)' }));
              const docRef = await addDoc(collection(db, 'history'), {
                userEmail: loginEmail,
                campaign: { ...campaign },
                results: strippedResults,
                timestamp: serverTimestamp(),
                sizeError: true
              });
              setCurrentHistoryId(docRef.id);
              fetchHistory(loginEmail);
            } catch (innerErr) {
              console.error("Critical history error:", innerErr);
            }
          }
        }
      }
      
      if (credits !== -1 && credits <= 0) {
        setChatNotification('Has consumido todos tus créditos. El sistema requiere una recarga para futuras generaciones.');
        setShowRecharge(true);
      }
    } catch (error: any) {
      console.error("Critical error in processAds:", error);
      const msg = error.message || 'Error desconocido';
      setChatNotification(`Lo siento, hubo un problema al procesar tu anuncio: ${msg}`);
      alert(`Error procesando el anuncio: ${msg}. Revisa la consola para más detalles.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setCampaign(item.campaign);
    setResults(item.results);
    setSelectedResultIndex(0);
    setCurrentHistoryId(item.id);
    setShowHistory(false);
    setVisualPreview(null); // Reference might be gone, or we can just show results
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'history', id));
      setHistoryItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error deleting history item:", error);
    }
  };

  const downloadVisual = () => {
    const currentResult = results[selectedResultIndex];
    if (currentResult?.generatedImageUrl) {
      const isVideo = currentResult.generatedImageUrl.startsWith('data:video');
      const link = document.createElement('a');
      link.href = currentResult.generatedImageUrl;
      link.download = `smart-ads-${campaign.productName.toLowerCase().replace(/\s+/g, '-')}.${isVideo ? 'mp4' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-deep-blue">
      {/* Global Inputs */}
      <input 
        type="file" 
        accept="image/*,video/*" 
        ref={fileInputRef} 
        onChange={handleVisualUpload} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept=".csv,.xlsx" 
        ref={csvInputRef} 
        onChange={handleCsvUpload} 
        className="hidden" 
      />
      {/* Header */}
      <header className="h-20 md:h-24 border-b border-neon-blue/20 flex items-center px-4 md:px-8 glass-panel rounded-none relative overflow-visible shrink-0 z-[100]">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between w-full z-10">
          <div className="flex items-center gap-3 md:gap-4">
            {isLoggedIn && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-neon-blue hover:bg-neon-blue/10 rounded-lg transition-colors"
              >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
            <div className="relative shrink-0">
              <button 
                onClick={handleLogoClick}
                className="w-10 h-10 md:w-16 md:h-16 rounded-xl border-2 border-neon-blue overflow-hidden bg-neon-blue flex items-center justify-center shadow-[0_0_15px_rgba(0,209,255,0.4)] group transition-all hover:scale-105 active:scale-95"
              >
                <Logo size={48} className="group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(0,209,255,0.8)]" />
              </button>
              <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 w-3 h-3 md:w-5 md:h-5 bg-neon-green rounded-full border-2 border-deep-blue animate-pulse" />
            </div>
            <div className="block">
              <h1 className="font-orbitron text-xl sm:text-lg md:text-2xl font-black tracking-widest neon-text leading-none whitespace-nowrap">
                SMART ADS
              </h1>
              <p className="block text-[8px] sm:text-[10px] md:text-sm font-medium text-neon-blue/70 tracking-[0.05em] sm:tracking-[0.08em] md:tracking-[0.11em] uppercase mt-1 leading-none">
                Creative Neural Engine v2.0
              </p>
            </div>
          </div>

          {isLoggedIn && (
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 p-1 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-neon-blue/20 group"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-neon-blue/10 border border-neon-blue/30 flex items-center justify-center group-hover:border-neon-blue transition-colors">
                  <User size={20} className="text-neon-blue md:size-6" />
                </div>
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 glass-panel bg-[#050D19]/65 border-neon-blue/20 shadow-[0_10px_30px_rgba(0,0,0,0.8)] overflow-hidden z-[110]"
                    >
                      <div className="p-6 border-b border-neon-blue/20 bg-neon-blue/5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-orbitron text-[10px] text-neon-blue uppercase tracking-widest font-black">Identidad</p>
                          <div className="flex items-center gap-2 text-neon-green">
                            <Coins size={14} />
                            <span className="font-orbitron font-bold text-base">
                              {credits === -1 ? 'INF' : credits}
                            </span>
                          </div>
                        </div>
                        <h4 className="font-orbitron text-sm text-white font-bold tracking-wider truncate uppercase">
                          {userProfile.displayName ? userProfile.displayName.split(' ')[0] : (loginEmail ? loginEmail.split('@')[0] : 'Invitado')}
                        </h4>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium mt-1 truncate">
                          {loginEmail}
                        </p>
                      </div>
                      
                      <div className="p-6 space-y-2">
                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setShowHistory(true);
                            if (loginEmail) fetchHistory(loginEmail);
                          }}
                          className="w-full flex items-center gap-3 py-2 text-white/70 hover:text-neon-blue transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
                        >
                          <History size={16} className="text-neon-blue group-hover:scale-110 transition-transform" />
                          HISTORIAL
                        </button>
                        
                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setShowProfile(true);
                          }}
                          className="w-full flex items-center gap-3 py-2 text-white/70 hover:text-neon-blue transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
                        >
                          <User size={16} className="text-neon-blue group-hover:scale-110 transition-transform" />
                          CUENTA
                        </button>

                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setShowSettings(true);
                          }}
                          className="w-full flex items-center gap-3 py-2 text-white/70 hover:text-neon-blue transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
                        >
                          <Settings size={16} className="text-neon-blue group-hover:scale-110 transition-transform" />
                          AJUSTES
                        </button>
                        
                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setShowRecharge(true);
                          }}
                          className="w-full flex items-center gap-3 py-2 text-white/70 hover:text-neon-blue transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
                        >
                          <CreditCard size={16} className="text-neon-blue group-hover:scale-110 transition-transform" />
                          RECARGAR
                        </button>
                      </div>

                      <div className="p-6 pt-2 border-t border-neon-blue/10">
                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-3 py-2 text-red-500/70 hover:text-red-500 transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
                        >
                          <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                          CERRAR SESIÓN
                        </button>
                      </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      {!isLoggedIn ? (
        <div className="flex-1 flex items-center justify-center p-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(0,209,255,0.1)_0%,_transparent_100%)] pointer-events-none" />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-10 w-full max-w-md space-y-8 relative z-10"
          >
            <div className="text-center space-y-2">
              <div className="w-24 h-24 rounded-2xl border-2 border-neon-blue bg-black mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(0,209,255,0.4)] overflow-hidden">
                <Logo size={80} />
              </div>
              <h2 className="font-orbitron text-2xl font-black tracking-widest mt-4">ACCESO NEURAL</h2>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em]">Identifícate para comenzar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neon-blue/60">Email de Usuario</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neon-blue/40" size={18} />
                  <input 
                    type="email" 
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="usuario@neural.com"
                    className="w-full bg-black/60 border border-neon-blue/30 rounded-xl pl-12 pr-4 py-3 focus:border-neon-blue outline-none transition-all text-sm"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <button type="submit" className="w-full relative flex items-center justify-center py-4 bg-neon-green text-black font-black text-xs uppercase tracking-[0.3em] rounded-xl transition-all hover:shadow-[0_0_20px_rgba(57,255,20,0.6)] hover:scale-[1.02] active:scale-95 group">
                  <div className="absolute left-6">
                    <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                  INGRESAR
                </button>
                
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <span className="relative px-3 bg-deep-blue text-[8px] text-white/30 uppercase tracking-widest">O accede con</span>
                </div>

                <button 
                  type="button"
                  onClick={handleMetaLogin}
                  className="w-full relative flex items-center justify-center py-4 bg-[#1877F2] hover:bg-[#166fe5] text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_20px_rgba(24,119,242,0.3)] hover:scale-[1.02] active:scale-95"
                >
                  <div className="absolute left-6">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  CONECTAR
                </button>
              </div>
            </form>

            <div className="pt-6 border-t border-white/5 text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest">
                Tu asistente inteligente para Meta Ads de alto impacto
              </p>
            </div>
          </motion.div>
        </div>
      ) : (
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <aside className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 md:w-80 border-r border-neon-blue/20 p-6 flex flex-col gap-6 overflow-y-auto glass-panel rounded-none transition-transform duration-300 shrink-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="flex items-center justify-end lg:flex mb-4">
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-white/40 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 mt-4 lg:mt-0">
            {/* Meta Ads Connection Hidden in Sidebar by User Request */}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neon-blue">Nombre del Producto</label>
              <input 
                type="text" 
                value={campaign.productName}
                onChange={(e) => setCampaign({...campaign, productName: e.target.value})}
                placeholder="Ej: Quantum Sneakers"
                className="w-full bg-black/40 border border-neon-blue/30 rounded-lg px-4 py-2 focus:border-neon-blue outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neon-blue">Objetivo</label>
              <select 
                value={campaign.objective}
                onChange={(e) => setCampaign({...campaign, objective: e.target.value})}
                className="w-full bg-black/40 border border-neon-blue/30 rounded-lg px-4 py-2 focus:border-neon-blue outline-none transition-all text-sm"
              >
                <option className="bg-[#0A192F]">Ventas</option>
                <option className="bg-[#0A192F]">Tráfico</option>
                <option className="bg-[#0A192F]">WhatsApp</option>
                <option className="bg-[#0A192F]">Engagement</option>
                <option className="bg-[#0A192F]">Leads</option>
                <option className="bg-[#0A192F]">Reconocimiento</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-neon-blue">Concepto</label>
                <button 
                  onClick={handleGenerateConcept}
                  disabled={isGeneratingConcept || !campaign.productName}
                  className="flex items-center gap-1.5 text-[10px] font-black text-neon-blue hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  <Sparkles size={12} className={cn("group-hover:scale-125 transition-transform", isGeneratingConcept && "animate-spin")} />
                  {isGeneratingConcept ? 'GENERANDO...' : 'GENERAR CON AI'}
                </button>
              </div>
              <textarea 
                value={campaign.creativeConcept}
                onChange={(e) => setCampaign({...campaign, creativeConcept: e.target.value})}
                placeholder="Idea central del anuncio: Ej. El futuro del confort en tus pies..."
                className="w-full bg-black/40 border border-neon-blue/30 rounded-lg px-4 py-2 focus:border-neon-blue outline-none transition-all text-sm h-24 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neon-blue">Audiencia</label>
              <input 
                type="text" 
                value={campaign.audience}
                onChange={(e) => setCampaign({...campaign, audience: e.target.value})}
                placeholder="Ej: Gamers 18-35, Emprendedores..."
                className="w-full bg-black/40 border border-neon-blue/30 rounded-lg px-4 py-2 focus:border-neon-blue outline-none transition-all text-sm"
              />
            </div>

            {/* Hidden from sidebar as they are now in the publishing modal */}
            {/* 
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neon-blue">Presupuesto Diario (USD)</label>
              <input 
                type="number" 
                step="0.01"
                min="1.00"
                value={campaign.budget}
                onChange={(e) => setCampaign({...campaign, budget: e.target.value})}
                placeholder="Ej: 5.00"
                className="w-full bg-black/40 border border-neon-blue/30 rounded-lg px-4 py-2 focus:border-neon-blue outline-none transition-all text-sm text-neon-green font-orbitron"
              />
            </div>

            {(campaign.objective === 'Tráfico' || campaign.objective === 'Ventas' || campaign.objective === 'Conversión') && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neon-blue underline decoration-neon-blue/30">URL de Destino</label>
                <input 
                  type="url" 
                  value={campaign.destinationUrl}
                  onChange={(e) => setCampaign({...campaign, destinationUrl: e.target.value})}
                  placeholder="https://tu-sitio.com/oferta"
                  className="w-full bg-black/40 border border-neon-blue/30 rounded-lg px-4 py-2 focus:border-neon-blue outline-none transition-all text-sm text-white/80"
                />
              </div>
            )}
            */}

            {/* Hidden from sidebar as they are now in the publishing modal */}
            {/* 
            {(campaign.objective === 'Ventas' || campaign.objective === 'Conversión') && (
              <div className="space-y-4 pt-2 border-t border-neon-blue/10">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neon-pink">ID del Píxel (Requerido para Ventas)</label>
                  <input 
                    type="text" 
                    value={campaign.pixelId}
                    onChange={(e) => setCampaign({...campaign, pixelId: e.target.value})}
                    placeholder="Ej: 123456789012345"
                    className="w-full bg-black/40 border border-neon-pink/30 rounded-lg px-4 py-2 focus:border-neon-pink outline-none transition-all text-sm text-neon-pink font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neon-blue">Moneda</label>
                  <select 
                    value={campaign.currency}
                    onChange={(e) => setCampaign({...campaign, currency: e.target.value})}
                    className="w-full bg-black/40 border border-neon-blue/30 rounded-lg px-4 py-2 focus:border-neon-blue outline-none transition-all text-sm"
                  >
                    <option value="USD">USD - Dólar</option>
                    <option value="COP">COP - Peso Colombiano</option>
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="CLP">CLP - Peso Chileno</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
              </div>
            )}
            */}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neon-blue">Formato</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setCampaign({...campaign, format: 'image'})}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 rounded-lg border text-xs transition-all",
                    campaign.format === 'image' ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-white/10 hover:border-white/30"
                  )}
                >
                  <ImageIcon size={14} /> Imagen
                </button>
                <button 
                  onClick={() => setCampaign({...campaign, format: 'video'})}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 rounded-lg border text-xs transition-all",
                    campaign.format === 'video' ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-white/10 hover:border-white/30"
                  )}
                >
                  <Video size={14} /> Video
                </button>
              </div>
            </div>

            {campaign.format === 'video' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neon-blue">Duración del Video</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setCampaign({...campaign, videoDuration: 5})}
                    className={cn(
                      "flex items-center justify-center py-2 rounded-lg border text-xs transition-all",
                      campaign.videoDuration === 5 ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-white/10 hover:border-white/30"
                    )}
                  >
                    5 Segundos
                  </button>
                  <button 
                    onClick={() => setCampaign({...campaign, videoDuration: 10})}
                    className={cn(
                      "flex items-center justify-center py-2 rounded-lg border text-xs transition-all",
                      campaign.videoDuration === 10 ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-white/10 hover:border-white/30"
                    )}
                  >
                    10 Segundos
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neon-blue">Relación de Aspecto</label>
              <div className="grid grid-cols-3 gap-2">
                {['1:1', '9:16', '16:9'].map(ratio => (
                  <button 
                    key={ratio}
                    onClick={() => setCampaign({...campaign, aspectRatio: ratio})}
                    className={cn(
                      "py-2 rounded-lg border text-xs transition-all",
                      campaign.aspectRatio === ratio ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-white/10 hover:border-white/30"
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 md:mt-8 lg:mt-8">
              <button 
                onClick={processAds}
                disabled={isProcessing}
                className="w-full py-4 rounded-xl bg-neon-blue text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-neon-blue/80 transition-all flex items-center justify-center gap-3 group shadow-[0_0_20px_rgba(0,209,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              >
                {isProcessing ? (
                  <>
                    <motion.div 
                      initial={{ left: '-100%' }}
                      animate={{ left: '100%' }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
                    />
                    <div className="relative flex items-center gap-3">
                      <div className="relative flex items-center justify-center">
                        <motion.div
                          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute w-8 h-8 rounded-full border border-black/20"
                        />
                        <Cpu className="animate-spin-slow relative z-10" size={22} />
                      </div>
                      <div className="flex">
                        {"PROCESANDO".split("").map((letter, i) => (
                          <motion.span
                            key={i}
                            animate={{ 
                              opacity: [0.4, 1, 0.4],
                              y: [0, -2, 0]
                            }}
                            transition={{ 
                              duration: 1, 
                              repeat: Infinity, 
                              delay: i * 0.05 
                            }}
                            className="inline-block"
                          >
                            {letter}
                          </motion.span>
                        ))}
                        <motion.span
                          animate={{ opacity: [0, 1, 0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                        >
                          ...
                        </motion.span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Zap size={20} className="group-hover:scale-125 transition-transform" />
                    CREAR ANUNCIO
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(0,209,255,0.05)_0%,_transparent_100%)] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto space-y-12 relative z-10">
            {/* Tabs Navigation */}
            <div className="grid grid-cols-4 gap-4 w-full">
              <button 
                onClick={() => setActiveHomeTab('analizar')}
                className={cn(
                  "py-4 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border shadow-[0_0_15px_rgba(0,209,255,0.1)]",
                  activeHomeTab === 'analizar' 
                    ? "bg-neon-blue text-black border-neon-blue shadow-[0_0_20px_rgba(0,209,255,0.4)]" 
                    : "bg-neon-blue/5 border-neon-blue/30 text-neon-blue/60 hover:border-neon-blue hover:text-neon-blue"
                )}
              >
                <TrendingUp size={16} />
                <span className="hidden sm:inline">ANALIZAR</span>
                <span className="sm:hidden">DATA</span>
              </button>
              <button 
                onClick={() => setActiveHomeTab('planificar')}
                className={cn(
                  "py-4 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border shadow-[0_0_15px_rgba(0,209,255,0.1)] transition-all",
                  activeHomeTab === 'planificar' 
                    ? "bg-neon-blue text-black border-neon-blue shadow-[0_0_20px_rgba(0,209,255,0.4)]" 
                    : "bg-neon-blue/5 border-neon-blue/30 text-neon-blue/60 hover:border-neon-blue hover:text-neon-blue"
                )}
              >
                <Target size={16} />
                <span className="hidden sm:inline">PLANIFICAR</span>
                <span className="sm:hidden">PLAN</span>
              </button>
              <button 
                onClick={() => setActiveHomeTab('crear')}
                className={cn(
                  "py-4 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border shadow-[0_0_15px_rgba(0,209,255,0.1)] transition-all",
                  activeHomeTab === 'crear' 
                    ? "bg-neon-blue text-black border-neon-blue shadow-[0_0_20px_rgba(0,209,255,0.4)]" 
                    : "bg-neon-blue/5 border-neon-blue/30 text-neon-blue/60 hover:border-neon-blue hover:text-neon-blue"
                )}
              >
                <Zap size={16} />
                <span className="hidden sm:inline">CREAR</span>
                <span className="sm:hidden">ADS</span>
              </button>
              <button 
                onClick={() => setActiveHomeTab('publicar')}
                className={cn(
                  "py-4 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border shadow-[0_0_15px_rgba(0,209,255,0.1)] transition-all",
                  activeHomeTab === 'publicar' 
                    ? "bg-neon-blue text-black border-neon-blue shadow-[0_0_20px_rgba(0,209,255,0.4)]" 
                    : "bg-neon-blue/5 border-neon-blue/30 text-neon-blue/60 hover:border-neon-blue hover:text-neon-blue"
                )}
              >
                <Send size={16} />
                <span className="hidden sm:inline">PUBLISH</span>
                <span className="sm:hidden">POST</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeHomeTab === 'analizar' ? (
                <motion.div 
                  key="analizar"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col gap-2">
                    <h2 className="font-orbitron text-base md:text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="text-neon-blue" /> ANALIZAR ANUNCIOS
                    </h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                      Optimiza tu estrategia neural procesando archivos de rendimiento histórico.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {metaToken ? (
                      <div className="glass-panel p-6 border-neon-blue/20 bg-neon-blue/5 space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <h3 className="font-orbitron text-xs font-bold tracking-wider uppercase text-neon-blue">META ADS CONNECTED</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-orbitron text-white/40 uppercase tracking-widest block font-medium">Cuenta Publicitaria</label>
                            <select 
                              value={selectedAdAccount}
                              onChange={(e) => setSelectedAdAccount(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white/80 focus:border-neon-blue outline-none font-orbitron"
                            >
                              <option value="">Seleccionar cuenta...</option>
                              {adAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.account_id})</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-orbitron text-white/40 uppercase tracking-widest block font-medium">Campaña</label>
                            <select 
                              value={selectedAnalysisIds.campaignId}
                              onChange={(e) => setSelectedAnalysisIds(prev => ({ ...prev, campaignId: e.target.value }))}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white/80 focus:border-neon-blue outline-none font-orbitron"
                              disabled={!selectedAdAccount}
                            >
                              <option value="">Todas las campañas</option>
                              {metaAnalysisData.campaigns.map(camp => (
                                <option key={camp.id} value={camp.id}>{camp.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-orbitron text-white/40 uppercase tracking-widest block font-medium">Desde</label>
                            <input 
                              type="date"
                              value={analysisDateRange.since}
                              onChange={(e) => setAnalysisDateRange(prev => ({ ...prev, since: e.target.value }))}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white/80 focus:border-neon-blue outline-none font-orbitron"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-orbitron text-white/40 uppercase tracking-widest block font-medium">Hasta</label>
                            <input 
                              type="date"
                              value={analysisDateRange.until}
                              onChange={(e) => setAnalysisDateRange(prev => ({ ...prev, until: e.target.value }))}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white/80 focus:border-neon-blue outline-none font-orbitron"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handleExecuteAnalysis}
                          disabled={isImportingMeta || isAnalyzing || (!selectedAdAccount && csvData.length === 0)}
                          className="w-full py-3 rounded-lg bg-neon-blue/10 border border-neon-blue/30 text-neon-blue font-orbitron text-[10px] font-black uppercase tracking-widest hover:bg-neon-blue hover:text-black transition-all flex items-center justify-center gap-2 group disabled:opacity-30"
                        >
                          {isAnalyzing ? <Cpu className="animate-spin" size={14} /> : <TrendingUp size={14} />}
                          EJECUTAR ANÁLISIS (100 CRÉDITOS)
                        </button>
                      </div>
                    ) : (
                      <div className="glass-panel p-8 border-white/10 flex flex-col items-center text-center gap-4">
                        <TrendingUp className="text-white/20" size={32} />
                        <div>
                          <h3 className="font-orbitron text-xs font-bold tracking-wider uppercase text-white/60">INTEGRACIÓN DE META ADS</h3>
                          <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest">Analiza tus campañas directamente conectando tu cuenta principal</p>
                        </div>
                        <button
                          onClick={handleMetaLogin}
                          className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-orbitron text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                          Conectar Meta Ads
                        </button>
                      </div>
                    )}

                     {/* CSV Import Hidden by User Request */}
                  </div>

                  <div className="flex justify-center">
                    <button 
                      onClick={() => {
                        if (csvData.length > 0) {
                          setActiveHomeTab('planificar');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className={cn(
                        "group flex flex-col items-center gap-3 transition-all",
                        csvData.length === 0 ? "opacity-30 grayscale cursor-not-allowed" : "cursor-pointer"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-[0_0_10px_rgba(255,255,255,0.02)]",
                        csvData.length > 0 
                          ? "bg-neon-blue/10 border-neon-blue/50 group-hover:border-neon-blue/80 shadow-[0_0_15px_rgba(0,209,255,0.2)]" 
                          : "bg-white/5 border-white/10"
                      )}>
                        <ChevronDown className={cn(
                          "transition-colors",
                          csvData.length > 0 ? "text-neon-blue" : "text-white/40"
                        )} />
                      </div>
                      <span className={cn(
                        "text-[8px] font-orbitron uppercase tracking-[0.4em] font-black transition-colors",
                        csvData.length > 0 ? "text-neon-blue" : "text-white/20"
                      )}>Continuar al Plan de Medios</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {/* Processing overlay hidden per user request */}
                  </AnimatePresence>

                  {csvData.length > 0 && (
                    <div className="mt-12 space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-neon-blue/20" />
                        <h2 className="font-orbitron text-sm font-bold text-neon-blue uppercase tracking-[0.4em]">Análisis de Inteligencia Neural</h2>
                        <div className="h-px flex-1 bg-neon-blue/20" />
                      </div>
                      
                      <AnalysisDashboard data={csvData} report={analysisReport} />
                    </div>
                  )}
                </motion.div>
              ) : activeHomeTab === 'planificar' ? (
                <motion.div 
                  key="planificar"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col gap-2">
                    <h2 className="font-orbitron text-base md:text-lg font-bold flex items-center gap-2">
                      <Target className="text-neon-blue" /> PLAN DE MEDIOS
                    </h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                      Diseña tu estrategia de medios digital profesional de forma automatizada con IA.
                    </p>
                  </div>

                  {!strategicPlan ? (
                    <div className="glass-panel p-8 border-neon-blue/20 bg-neon-blue/5 space-y-8 text-center">
                      <div className="max-w-md mx-auto space-y-6">
                        <div className="grid grid-cols-1 gap-4 text-left">
                          <div className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-[9px] font-orbitron text-white/40 uppercase tracking-widest block font-medium">Nombre del Producto / Servicio</label>
                               <input 
                                 type="text" 
                                 value={campaign.productName}
                                 onChange={(e) => setCampaign(prev => ({ ...prev, productName: e.target.value }))}
                                 placeholder="Ej: Smart Watch X-1"
                                 className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs text-white/80 focus:border-neon-blue outline-none font-orbitron"
                               />
                            </div>

                            <div className="space-y-2">
                               <label className="text-[9px] font-orbitron text-white/40 uppercase tracking-widest block font-medium">Objetivo</label>
                               <select 
                                 value={campaign.objective}
                                 onChange={(e) => setCampaign(prev => ({ ...prev, objective: e.target.value }))}
                                 className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs text-white/80 focus:border-neon-blue outline-none font-orbitron"
                               >
                                 <option value="Ventas">Ventas</option>
                                 <option value="Clientes Potenciales">Clientes Potenciales</option>
                                 <option value="WhatsApp">WhatsApp</option>
                               </select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[9px] font-orbitron text-white/40 uppercase tracking-widest block font-medium">Presupuesto Total</label>
                               <input 
                                 type="number" 
                                 value={campaign.budget}
                                 onChange={(e) => setCampaign(prev => ({ ...prev, budget: e.target.value }))}
                                 placeholder="500"
                                 className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs text-white/80 focus:border-neon-blue outline-none font-orbitron"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-orbitron text-white/40 uppercase tracking-widest block font-medium">Moneda</label>
                               <select 
                                 value={campaign.currency}
                                 onChange={(e) => setCampaign(prev => ({ ...prev, currency: e.target.value }))}
                                 className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-xs text-white/80 focus:border-neon-blue outline-none font-orbitron"
                               >
                                 <option value="USD">USD</option>
                                 <option value="COP">COP</option>
                                 <option value="MXN">MXN</option>
                               </select>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={handleExecuteStrategicPlan}
                          disabled={isPlanning}
                          className="w-full py-4 rounded-xl bg-neon-blue text-black font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_0_20px_rgba(0,209,255,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          {isPlanning ? (
                            <>
                              <RefreshCcw className="animate-spin" size={16} />
                              PROCESANDO ESTRATEGIA...
                            </>
                          ) : (
                            <>
                              <Target size={16} />
                              GENERAR PLAN ESTRATÉGICO
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      {/* Visual Funnel Summary */}
                      <div className="flex flex-col items-center justify-center py-10 w-full relative">
                        <div 
                          className="w-full max-w-[320px] h-[320px] relative overflow-hidden shadow-2xl border-t border-white/5"
                          style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
                        >
                          {strategicPlan.phases.map((phase, idx) => {
                            const objectiveWord = phase.objective.split(' ')[0].toUpperCase();
                            const cleanName = phase.name.replace(/\s*\(.*?\)\s*/g, '').trim();
                            
                            // Map icons based on stage
                            const PhaseIcon = idx === 0 ? Megaphone : idx === 1 ? Users : Zap;

                            return (
                              <motion.div
                                key={`visual-funnel-${idx}`}
                                initial={{ opacity: 0, scaleY: 0 }}
                                animate={{ opacity: 1, scaleY: 1 }}
                                transition={{ delay: idx * 0.15, duration: 0.6, ease: "easeOut" }}
                                className={cn(
                                  "h-1/3 w-full flex items-center justify-center relative transition-colors hover:bg-white/5 group pt-4",
                                  idx === 0 ? "bg-neon-blue/40" : 
                                  idx === 1 ? "bg-neon-blue/30" : 
                                  "bg-neon-blue/20"
                                )}
                                style={{ transformOrigin: 'top' }}
                              >
                                <div className={cn(
                                  "flex flex-col items-center text-center px-2 relative z-10",
                                  idx === 2 && "-translate-y-6"
                                )}>
                                  <PhaseIcon 
                                    size={idx === 2 ? 14 : 24} 
                                    className="text-white/40 mb-1 group-hover:text-neon-blue group-hover:scale-110 transition-all" 
                                  />
                                  <span className={cn(
                                    "font-orbitron font-black text-white uppercase tracking-tighter leading-none block",
                                    idx === 2 ? "text-[8px]" : "text-[10px] sm:text-[12px]"
                                  )}>
                                    {cleanName}
                                  </span>
                                  <span className={cn(
                                    "font-orbitron font-black uppercase tracking-[0.2em] mt-1 transition-colors block",
                                    idx === 2 ? "text-[7px]" : "text-[8px] sm:text-[10px]",
                                    "text-neon-blue group-hover:text-white"
                                  )}>
                                    {objectiveWord}
                                  </span>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Strategic Summary */}
                      <div className="glass-panel p-6 bg-neon-blue/5 border-neon-blue/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <Target className="text-neon-blue" size={20} />
                            <h3 className="font-orbitron text-xs font-bold text-white uppercase tracking-widest">ESTRATEGIA DE MEDIOS</h3>
                          </div>
                          {/* CREAR button hidden per user request */}
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed italic">{strategicPlan.summary}</p>
                      </div>

                      {/* Funnel Visualization */}
                      <div className="space-y-6">
                        <h3 className="font-orbitron text-[10px] font-bold text-neon-blue uppercase tracking-widest text-center">FUNNEL DE CONVERSIÓN</h3>
                        <div className="flex flex-col items-center gap-6">
                          {strategicPlan.phases.map((phase, idx) => (
                            <motion.div 
                              key={idx}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.2 }}
                              className="w-full max-w-3xl relative group"
                            >
                              <div className={cn(
                                "glass-panel p-6 border-white/10 relative overflow-hidden transition-all group-hover:border-neon-blue/40",
                                idx === 0 ? "bg-neon-blue/20" : idx === 1 ? "bg-neon-blue/10" : "bg-neon-blue/5"
                              )}>
                                <div className="absolute top-0 right-0 p-3">
                                  <span className="font-orbitron text-[8px] font-black text-white/20 uppercase">FASE 0{idx + 1}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <h4 className="font-orbitron text-sm font-bold text-neon-blue uppercase">{phase.name}</h4>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Target size={12} className="text-neon-blue" />
                                        <span className="text-[8px] font-orbitron text-white/40 uppercase tracking-widest font-bold">Objetivo</span>
                                      </div>
                                      <p className="text-[10px] font-bold text-white/80 uppercase">{phase.objective}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Brain size={12} className="text-neon-blue" />
                                        <span className="text-[8px] font-orbitron text-white/40 uppercase tracking-widest font-bold">Concepto</span>
                                      </div>
                                      <p className="text-[10px] text-white/50 leading-relaxed">{phase.message}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                       <p className="text-[8px] text-white/30 uppercase tracking-widest">Inversión</p>
                                       <p className="font-orbitron text-xs font-bold text-green-400">
                                         ${Math.round(phase.investment).toLocaleString()} {strategicPlan.currency || campaign.currency}
                                       </p>
                                     </div>
                                     <div className="space-y-1">
                                       <p className="text-[8px] text-white/30 uppercase tracking-widest">Duración</p>
                                       <p className="font-orbitron text-xs font-bold text-white">{phase.durationDays} Días</p>
                                     </div>
                                     <div className="space-y-1">
                                       <p className="text-[8px] text-white/30 uppercase tracking-widest">Impresiones</p>
                                       <p className="font-orbitron text-xs font-bold text-white">{Math.round(phase.estimates.impressions).toLocaleString()}</p>
                                     </div>
                                     <div className="space-y-1">
                                       <p className="text-[8px] text-white/30 uppercase tracking-widest">Alcance</p>
                                       <p className="font-orbitron text-xs font-bold text-white">
                                         {Math.round(phase.estimates.reach || (phase.estimates.impressions * 0.75)).toLocaleString()}
                                       </p>
                                     </div>
                                     <div className="space-y-1">
                                       <p className="text-[8px] text-white/30 uppercase tracking-widest">Resultados</p>
                                       <p className="font-orbitron text-xs font-bold text-neon-blue">{Math.round(phase.estimates.conversions).toLocaleString()} Conv.</p>
                                     </div>
                                  </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-4">
                                  <div className="flex items-center gap-2">
                                    <Layout size={12} className="text-neon-blue" />
                                    <span className="text-[9px] text-white/60 uppercase">{phase.formats.join(', ')}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <ImageIcon size={12} className="text-neon-blue" />
                                    <span className="text-[9px] text-white/60 uppercase">{phase.contentTypes.join(', ')}</span>
                                  </div>
                                </div>
                              </div>
                              {idx < strategicPlan.phases.length - 1 && (
                                <div className="flex justify-center -my-2 relative z-10">
                                  <div className="w-8 h-8 rounded-full bg-deep-blue border border-neon-blue/30 flex items-center justify-center text-neon-blue">
                                    <ChevronDown size={16} />
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Estimated Results Table */}
                      <div className="glass-panel p-6 bg-white/5 border-white/10">
                        <h3 className="font-orbitron text-[10px] font-bold text-white uppercase tracking-widest mb-6 px-2">PROYECCIÓN DE RESULTADOS POR FASE</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/10">
                                <th className="py-4 px-4 text-[9px] font-orbitron text-white/40 uppercase tracking-[0.2em]">Fase</th>
                                <th className="py-4 px-4 text-[9px] font-orbitron text-white/40 uppercase tracking-[0.2em]">Impresiones</th>
                                <th className="py-4 px-4 text-[9px] font-orbitron text-white/40 uppercase tracking-[0.2em]">Alcance</th>
                                <th className="py-4 px-4 text-[9px] font-orbitron text-white/40 uppercase tracking-[0.2em]">CTR</th>
                                <th className="py-4 px-4 text-[9px] font-orbitron text-white/40 uppercase tracking-[0.2em]">Clics</th>
                                <th className="py-4 px-4 text-[9px] font-orbitron text-white/40 uppercase tracking-[0.2em]">CPC</th>
                                <th className="py-4 px-4 text-[9px] font-orbitron text-white/40 uppercase tracking-[0.2em]">CPM</th>
                                <th className="py-4 px-4 text-[9px] font-orbitron text-white/40 uppercase tracking-[0.2em]">Conv.</th>
                                <th className="py-4 px-4 text-[9px] font-orbitron text-white/40 uppercase tracking-[0.2em]">CPA</th>
                              </tr>
                            </thead>
                            <tbody>
                              {strategicPlan.phases.map((phase, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-4 px-4 font-orbitron text-[10px] text-neon-blue">{phase.name}</td>
                                  <td className="py-4 px-4 text-[10px] text-white">{Math.round(phase.estimates.impressions).toLocaleString()}</td>
                                  <td className="py-4 px-4 text-[10px] text-white/60">
                                    {Math.round(phase.estimates.reach || (phase.estimates.impressions * 0.75)).toLocaleString()}
                                  </td>
                                  <td className="py-4 px-4 text-[10px] text-white">
                                    {((phase.estimates.clicks / (phase.estimates.reach || (phase.estimates.impressions * 0.75))) * 100).toFixed(1)}%
                                  </td>
                                  <td className="py-4 px-4 text-[10px] text-white">{Math.round(phase.estimates.clicks).toLocaleString()}</td>
                                  <td className="py-4 px-4 text-[10px] text-white">${Math.round(phase.estimates.cpc).toLocaleString()}</td>
                                  <td className="py-4 px-4 text-[10px] text-white">${Math.round(phase.estimates.cpm).toLocaleString()}</td>
                                  <td className="py-4 px-4 text-[10px] font-bold text-neon-green">{Math.round(phase.estimates.conversions).toLocaleString()}</td>
                                  <td className="py-4 px-4 text-[10px] text-white">${Math.round(phase.estimates.cpa || (phase.investment / phase.estimates.conversions)).toLocaleString()}</td>
                                </tr>
                              ))}
                              <tr className="bg-neon-blue/10">
                                <td className="py-4 px-4 font-orbitron text-[10px] text-white font-black">TOTAL ESTIMADO</td>
                                <td className="py-4 px-4 text-[10px] text-white">{Math.round(strategicPlan.phases.reduce((acc, p) => acc + p.estimates.impressions, 0)).toLocaleString()}</td>
                                <td className="py-4 px-4 text-[10px] text-white/60">
                                  {Math.round(strategicPlan.phases.reduce((acc, p) => acc + (p.estimates.reach || (p.estimates.impressions * 0.75)), 0)).toLocaleString()}
                                </td>
                                <td className="py-4 px-4 text-[10px] text-white">
                                  {(strategicPlan.phases.reduce((acc, p) => acc + p.estimates.clicks, 0) / strategicPlan.phases.reduce((acc, p) => acc + (p.estimates.reach || (p.estimates.impressions * 0.75)), 0) * 100).toFixed(1)}%
                                </td>
                                <td className="py-4 px-4 text-[10px] text-white">{Math.round(strategicPlan.phases.reduce((acc, p) => acc + p.estimates.clicks, 0)).toLocaleString()}</td>
                                <td className="py-4 px-4 text-[10px] text-white">
                                  ${Math.round(strategicPlan.phases.reduce((acc, p) => acc + p.investment, 0) / strategicPlan.phases.reduce((acc, p) => acc + p.estimates.clicks, 0)).toLocaleString()}
                                </td>
                                <td className="py-4 px-4 text-[10px] text-white">
                                  ${Math.round(strategicPlan.phases.reduce((acc, p) => acc + p.investment, 0) / strategicPlan.phases.reduce((acc, p) => acc + p.estimates.impressions, 0) * 1000).toLocaleString()}
                                </td>
                                <td className="py-4 px-4 text-[10px] font-black text-neon-green">{Math.round(strategicPlan.estimatedTotalConversions).toLocaleString()}</td>
                                <td className="py-4 px-4 text-[10px] text-white">
                                  ${Math.round(strategicPlan.phases.reduce((acc, p) => acc + p.investment, 0) / strategicPlan.estimatedTotalConversions).toLocaleString()}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Visual Schedule (Cronograma) */}
                      <div className="glass-panel p-8 bg-black/40 border-white/10">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-3">
                            <Calendar className="text-neon-blue" size={20} />
                            <h3 className="font-orbitron text-xs font-bold text-white uppercase tracking-widest">CRONOGRAMA DE EJECUCIÓN</h3>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] text-white/40 uppercase tracking-widest">Inversión Total</span>
                              <span className="font-orbitron text-xs font-black text-green-400">${Math.round(strategicPlan.totalInvestment).toLocaleString()} {strategicPlan.currency || campaign.currency}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[8px] text-white/40 uppercase tracking-widest">Duración Total</span>
                              <span className="font-orbitron text-xs font-black text-white">{Math.round(strategicPlan.phases.reduce((acc, p) => acc + p.durationDays, 0))} DÍAS</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-12">
                          <div className="relative pt-8">
                            {/* Graphic Header with Objective and Investment per phase */}
                            <div className="flex w-full mb-4">
                              {strategicPlan.phases.map((phase, idx) => (
                                <div 
                                  key={`header-${idx}`}
                                  className="text-center px-1"
                                  style={{ width: `${(phase.durationDays / strategicPlan.phases.reduce((acc, p) => acc + p.durationDays, 0)) * 100}%` }}
                                >
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + idx * 0.2 }}
                                    className="space-y-1"
                                  >
                                    <p className="text-[7px] font-orbitron text-neon-blue font-black uppercase truncate">{phase.objective}</p>
                                    <p className="text-[8px] font-bold text-white/80">${Math.round(phase.investment).toLocaleString()}</p>
                                  </motion.div>
                                </div>
                              ))}
                            </div>

                            {/* Main Progress Bar */}
                            <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
                              {strategicPlan.phases.map((phase, idx) => (
                                <motion.div 
                                  key={`bar-${idx}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(phase.durationDays / strategicPlan.phases.reduce((acc, p) => acc + p.durationDays, 0)) * 100}%` }}
                                  transition={{ duration: 1, delay: idx * 0.3 }}
                                  className={cn(
                                    "h-full relative group cursor-help",
                                    idx === 0 ? "bg-neon-blue" : idx === 1 ? "bg-neon-blue/70" : "bg-neon-blue/40"
                                  )}
                                >
                                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.05)_75%,transparent_75%,transparent)] bg-[length:15px_15px] animate-shimmer opacity-30" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[7px] font-black text-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                      {phase.durationDays}D
                                    </span>
                                  </div>
                                </motion.div>
                              ))}
                            </div>

                            {/* Phase Names and Durations labels below the bar */}
                            <div className="flex w-full mt-4">
                              {strategicPlan.phases.map((phase, idx) => (
                                <div 
                                  key={`footer-${idx}`}
                                  className="text-center px-1"
                                  style={{ width: `${(phase.durationDays / strategicPlan.phases.reduce((acc, p) => acc + p.durationDays, 0)) * 100}%` }}
                                >
                                  <div className="space-y-1">
                                    <p className="text-[8px] font-orbitron text-white/60 font-bold uppercase truncate">{phase.name}</p>
                                    <p className="text-[7px] text-white/30 uppercase tracking-[0.2em]">{phase.durationDays} DÍAS</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-10 pt-6 border-t border-white/10">
                          <p className="text-[10px] text-white/50 leading-relaxed italic">
                            <span className="text-neon-blue font-bold tracking-widest mr-2 uppercase font-orbitron">Consejo Estratégico:</span>
                            {strategicPlan.strategicAdvice}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button 
                        onClick={() => {
                          setActiveHomeTab('crear');
                          setActiveAssetTool('campaign');
                        }}
                        className="w-full py-6 rounded-2xl bg-neon-blue text-black font-black uppercase text-xs tracking-[0.3em] shadow-[0_0_40px_rgba(0,209,255,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                      >
                        <Zap className="fill-current group-hover:scale-110 transition-transform" size={20} />
                        CREAR LOS 3 ANUNCIOS DE LA ESTRATEGIA AHORA
                        <Sparkles size={18} className="animate-pulse" />
                      </button>

                      <button 
                        onClick={() => setActiveHomeTab('crear')}
                        className="w-full py-4 text-[9px] font-orbitron text-white/40 uppercase tracking-[0.3em] hover:text-white transition-colors"
                      >
                        O prefiero configurar los anuncios manualmente
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : activeHomeTab === 'crear' ? (
                <React.Fragment key="crear-content">
                  <motion.div 
                    key="crear"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col gap-2">
                    <h2 className="font-orbitron text-base md:text-lg font-bold flex items-center gap-2">
                      {activeAssetTool !== 'hub' && (
                        <button 
                          onClick={() => setActiveAssetTool('hub')}
                          className="p-1 hover:bg-white/10 rounded transition-colors mr-2 text-white/40 hover:text-white"
                        >
                          <ChevronRight className="rotate-180" size={16} />
                        </button>
                      )}
                      <Zap className="text-neon-blue" /> {
                        activeAssetTool === 'hub' ? 'CREAR ANUNCIOS' : 
                        activeAssetTool === 'campaign' ? 'CREAR ANUNCIO' : 
                        activeAssetTool === 'generate_img' ? 'CREAR IMÁGENES' :
                        activeAssetTool === 'product_img' ? 'ANUNCIOS DE PRODUCTOS' :
                        activeAssetTool === 'animate' ? 'ANUNCIO DE VIDEO' :
                        activeAssetTool === 'edit_img' ? 'EDITAR ANUNCIOS' :
                        activeAssetTool === 'video_gen' ? 'VIDEO STUDIO' :
                        activeAssetTool.toUpperCase().replace('_', ' ')
                      }
                    </h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                      Transforma tu visión en piezas publicitarias de alto impacto con IA Neural.
                    </p>
                  </div>

                  {activeAssetTool === 'hub' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AssetToolCard 
                        icon={<Sparkles size={20} />}
                        title="Crear Anuncio"
                        desc="Genera creatividades completas desde una referencia"
                        onClick={() => setActiveAssetTool('campaign')}
                        active={false}
                      />
                      <AssetToolCard 
                        icon={<ImageIcon size={20} />}
                        title="Crear Imágenes"
                        desc="Genera visuales desde texto (Text to Image)"
                        onClick={() => setActiveAssetTool('generate_img')}
                      />
                      <AssetToolCard 
                        icon={<Package size={20} />}
                        title="Anuncios de Productos"
                        desc="Optimiza y cambia fondos para tus productos"
                        onClick={() => setActiveAssetTool('product_img')}
                      />
                      <AssetToolCard 
                        icon={<Play size={20} />}
                        title="Anuncio de Video"
                        desc="Convierte fotos en videos cinematográficos"
                        onClick={() => setActiveAssetTool('animate')}
                      />
                      <AssetToolCard 
                        icon={<Edit3 size={20} />}
                        title="Editar Anuncios"
                        desc="Modifica elementos específicos con pincel IA"
                        onClick={() => setActiveAssetTool('edit_img')}
                      />
                      <AssetToolCard 
                        icon={<Clapperboard size={20} />}
                        title="Video Studio"
                        desc="Crea y edita videos desde texto o clips"
                        onClick={() => setActiveAssetTool('video_gen')}
                      />
                    </div>
                  )}

                  {activeAssetTool !== 'hub' && (
                    <motion.div 
                      key={activeAssetTool}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-panel p-8 border-neon-blue/20 bg-white/5 space-y-6"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-orbitron text-sm font-bold text-white uppercase tracking-wider">
                            {
                              activeAssetTool === 'campaign' ? 'CREAR ANUNCIO' : 
                              activeAssetTool === 'generate_img' ? 'CREAR IMÁGENES' :
                              activeAssetTool === 'product_img' ? 'ANUNCIOS DE PRODUCTOS' :
                              activeAssetTool === 'animate' ? 'ANUNCIO DE VIDEO' :
                              activeAssetTool === 'edit_img' ? 'EDITAR ANUNCIOS' :
                              activeAssetTool === 'video_gen' ? 'VIDEO STUDIO' :
                              activeAssetTool.toUpperCase().replace('_', ' ')
                            }
                          </h3>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Potenciando tu creatividad con inteligencia neural</p>
                        </div>
                        <div className="w-12 h-12 rounded-full border border-neon-blue/20 flex items-center justify-center">
                          <Cpu className={cn("text-neon-blue", (isToolProcessing || isProcessing) && "animate-spin")} size={24} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="font-orbitron text-xs font-bold text-neon-blue uppercase">Configuración de Generación</h4>
                            {(toolResult || visualPreview) && (
                              <button 
                                onClick={activeAssetTool === 'campaign' ? () => { setVisualFile(null); setVisualPreview(null); setOptimizedVisual(null); } : clearTool}
                                className="text-[9px] text-white/40 hover:text-white uppercase font-bold tracking-widest flex items-center gap-1 transition-colors"
                              >
                                <RefreshCcw size={10} /> Reiniciar
                              </button>
                            )}
                          </div>
                          
                          {/* Visual Core Upload - Only for tools that use reference */}
                          {!['generate_img'].includes(activeAssetTool) && (
                            <div className="space-y-2">
                              <label className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Núcleo Visual (Referencia)</label>
                              <div 
                                onClick={() => !isProcessing && !isToolProcessing && !isStudioProcessing && fileInputRef.current?.click()}
                                className={cn(
                                  "w-full aspect-video rounded-xl border border-dashed flex flex-col items-center justify-center cursor-pointer group transition-all relative overflow-hidden bg-black/40",
                                  visualPreview ? "border-neon-blue/40" : "border-white/10 hover:border-neon-blue/30"
                                )}
                              >
                                {visualPreview ? (
                                  <>
                                    <img src={visualPreview} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <RefreshCcw className="text-white" size={24} />
                                    </div>
                                    {(isProcessing || isToolProcessing || isStudioProcessing) && <div className="laser-scan" />}
                                  </>
                                ) : (
                                  <div className="text-center space-y-2">
                                    <Upload className="mx-auto text-white/20" size={24} />
                                    <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Subir Imagen o Video</p>
                                  </div>
                                )}
                              </div>
                              {visualPreview && !isProcessing && !isToolProcessing && !visualFile?.type.includes('video') && (
                                <button 
                                  onClick={handleProductStudioRefine}
                                  disabled={isStudioProcessing}
                                  className="w-full py-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neon-blue hover:text-black transition-all"
                                >
                                  {isStudioProcessing ? <Cpu className="animate-spin" size={12} /> : <Sparkles size={12} />}
                                  OPTIMIZAR CON PRODUCT STUDIO
                                </button>
                              )}
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[9px] text-white/30 uppercase tracking-widest font-bold">
                                  {activeAssetTool === 'campaign' ? 'Instrucciones Específicas' : 'Instrucción (Prompt)'}
                                </label>
                                <button 
                                  onClick={handleEnhancePrompt}
                                  disabled={isEnhancingPrompt}
                                  className="flex items-center gap-1.5 text-[8px] font-black text-neon-blue hover:text-white transition-colors disabled:opacity-30 group"
                                >
                                  <Wand2 size={10} className={cn("group-hover:rotate-12 transition-transform", isEnhancingPrompt && "animate-pulse")} />
                                  {isEnhancingPrompt ? 'MEJORANDO...' : 'GENERAR CON IA'}
                                </button>
                              </div>
                              <textarea 
                                value={activeAssetTool === 'campaign' ? campaign.instruction : toolPrompt}
                                onChange={(e) => activeAssetTool === 'campaign' ? setCampaign({...campaign, instruction: e.target.value}) : setToolPrompt(e.target.value)}
                                placeholder={
                                  activeAssetTool === 'generate_img' ? "Describe la imagen que quieres crear..." :
                                  activeAssetTool === 'campaign' ? "Describe detalles técnicos o visuales adicionales para estas variantes..." :
                                  activeAssetTool === 'animate' ? "Describe el movimiento o animación deseada..." :
                                  "Describe el resultado esperado..."
                                }
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] text-white focus:border-neon-blue/50 outline-none h-24 resize-none"
                              />
                            </div>
                            <button 
                              onClick={activeAssetTool === 'campaign' ? processAds : handleExecuteTool}
                              disabled={isToolProcessing || isProcessing || (activeAssetTool !== 'campaign' && !toolPrompt.trim())}
                              className={cn(
                                "w-full py-4 rounded-xl font-orbitron text-[10px] font-black uppercase tracking-widest transition-all",
                                (isToolProcessing || isProcessing || (activeAssetTool !== 'campaign' && !toolPrompt.trim())) 
                                  ? "bg-white/5 text-white/20 cursor-not-allowed" 
                                  : "bg-neon-blue text-black hover:shadow-[0_0_20px_rgba(0,209,255,0.3)] hover:scale-[1.01]"
                              )}
                            >
                              {activeAssetTool === 'campaign' 
                                ? (isProcessing ? "GENERANDO CAMPAÑA..." : "CREAR CAMPAÑA NEURAL")
                                : (isToolProcessing ? "PROCESANDO..." : "EJECUTAR PROCESO IA")
                              }
                            </button>
                          </div>
                        </div>
                        <div className="glass-panel border-dashed border border-white/10 flex items-center justify-center bg-black/20 min-h-[350px] rounded-2xl relative overflow-hidden group">
                           {isToolProcessing || isProcessing ? (
                             <div className="text-center space-y-4">
                               <div className="w-12 h-12 border-2 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin mx-auto" />
                               <p className="text-[10px] text-neon-blue animate-pulse uppercase tracking-[0.2em] font-bold">Generando Visual...</p>
                               <p className="text-[8px] text-white/40 uppercase tracking-widest">El motor neuronal está trabajando en tu pieza</p>
                             </div>
                           ) : (toolResult || (activeAssetTool === 'campaign' && results.length > 0)) ? (
                             <>
                               {toolResult?.startsWith('data:video') || (activeAssetTool === 'campaign' && results[selectedResultIndex]?.generatedImageUrl?.startsWith('data:video')) ? (
                                 <video 
                                   src={toolResult || results[selectedResultIndex].generatedImageUrl} 
                                   autoPlay 
                                   loop 
                                   muted 
                                   playsInline 
                                   className="w-full h-full object-cover" 
                                 />
                               ) : (
                                 <img 
                                   src={toolResult || results[selectedResultIndex]?.generatedImageUrl} 
                                   className="w-full h-full object-cover" 
                                 />
                               )}
                               <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                                  <button 
                                    onClick={() => {
                                      const url = toolResult || results[selectedResultIndex].generatedImageUrl;
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = `smart-ads-preview-${Date.now()}.${url.startsWith('data:video') ? 'mp4' : 'png'}`;
                                      link.click();
                                    }}
                                    className="w-full py-2 bg-neon-blue text-black text-[10px] font-bold uppercase rounded-lg"
                                  >
                                    Descargar Resultado
                                  </button>
                               </div>
                             </>
                           ) : (
                             <div className="text-center space-y-4 relative z-10 p-8">
                                <Search className="mx-auto text-white/10" size={48} />
                                <div className="space-y-2">
                                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Previsualización</p>
                                  <p className="text-[9px] text-white/20 uppercase tracking-widest leading-relaxed">El resultado de la IA aparecerá aquí después de procesar tus instrucciones.</p>
                                </div>
                             </div>
                           )}
                           <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Studio Comparison Overlay/Modal */}
                  <AnimatePresence>
                    {showStudioComparison && optimizedVisual && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
                      >
                        <motion.div 
                          initial={{ scale: 0.9, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          className="max-w-4xl w-full glass-panel border-neon-blue/40 p-8 space-y-8"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-neon-blue/20 flex items-center justify-center">
                                <Sparkles className="text-neon-blue" size={24} />
                              </div>
                              <div>
                                <h2 className="font-orbitron text-xl font-black text-white tracking-widest uppercase">RESULTADO PRODUCT STUDIO</h2>
                                <p className="text-[10px] text-neon-blue uppercase tracking-[0.3em] font-bold">SEGMENTACIÓN & UPSCALING AI</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => { setShowStudioComparison(false); setOptimizedVisual(null); }}
                              className="text-white/40 hover:text-white transition-colors"
                            >
                              <X size={24} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest block text-center">Original</span>
                              <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                                <img src={visualPreview} alt="Original" className="w-full h-full object-contain" />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <span className="text-[10px] text-neon-blue font-bold uppercase tracking-widest block text-center flex items-center justify-center gap-2">
                                <Sparkles size={12} /> Optimizado (Referencia Visual)
                              </span>
                              <div className="aspect-square rounded-2xl overflow-hidden border border-neon-blue/40 bg-white shadow-[0_0_40px_rgba(0,209,255,0.2)]">
                                <img src={optimizedVisual} alt="Optimizado" className="w-full h-full object-contain" />
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-4">
                            <button 
                              onClick={() => { setShowStudioComparison(false); setOptimizedVisual(null); }}
                              className="flex-1 py-4 px-6 rounded-xl border border-white/10 text-white/60 font-orbitron text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
                            >
                              DESCARTAR
                            </button>
                            <button 
                              onClick={applyOptimizedVisual}
                              className="flex-1 py-4 px-6 rounded-xl bg-neon-blue text-black font-orbitron text-xs font-black uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(0,209,255,0.5)] transition-all flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={18} /> USAR COMO REFERENCIA
                            </button>
                          </div>

                          <p className="text-center text-[10px] text-white/30 uppercase tracking-widest max-w-md mx-auto">
                            Al confirmar, este producto optimizado se utilizará para generar el contenido de tus anuncios manteniendo la fidelidad absoluta.
                          </p>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex justify-center">
                    <button 
                      onClick={processAds}
                      disabled={isProcessing}
                      className="px-12 py-4 rounded-xl bg-neon-blue text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-neon-blue/80 transition-all flex items-center gap-3 group shadow-[0_0_20px_rgba(0,209,255,0.3)] disabled:opacity-50"
                    >
                      {isProcessing ? <Cpu className="animate-spin" size={18} /> : <Zap size={18} />}
                      CREAR CREATIVO
                    </button>
                  </div>
                </motion.div>
              </React.Fragment>
            ) : (
                <motion.div 
                  key="publicar"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-8"
                >
                    <div className="flex flex-col gap-2">
                      <h2 className="font-orbitron text-base md:text-lg font-bold flex items-center gap-2">
                        <Send className="text-neon-blue" /> PUBLICAR ANUNCIOS
                      </h2>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                        Configura la segmentación neural y lanza tus piezas directamente a Meta Ads.
                      </p>
                    </div>

                    {results[selectedResultIndex]?.funnelPhase && (
                      <div className="glass-panel p-4 bg-neon-blue/20 border-neon-blue/40 flex items-center gap-4 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center text-neon-blue">
                          <Target size={20} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-orbitron text-[10px] font-black text-neon-blue uppercase tracking-widest">ESTRATEGIA DIGITAL OPTIMIZADA</h4>
                          <p className="text-[9px] text-white/70 uppercase tracking-widest leading-tight">
                            Este anuncio se publicará como la fase <span className="text-neon-blue font-bold">"{results[selectedResultIndex].funnelPhase.name}"</span> con presupuesto de <span className="text-neon-blue font-bold">${results[selectedResultIndex].funnelPhase.budget} USD</span> y objetivo de <span className="text-neon-blue font-bold">"{results[selectedResultIndex].funnelPhase.objective}"</span>.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Campaign Configuration */}
                    <div className="glass-panel p-6 border-white/10 bg-white/5 space-y-6">
                      <h3 className="font-orbitron text-xs font-bold text-neon-blue uppercase tracking-wider flex items-center gap-2">
                        <Settings size={14} /> Configuración de Campaña
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Cuenta Publicitaria</label>
                          <select 
                            value={selectedAdAccount}
                            onChange={(e) => setSelectedAdAccount(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] text-white focus:border-neon-blue/50 outline-none"
                          >
                            <option value="">Seleccionar cuenta...</option>
                            {adAccounts.map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Página de Facebook</label>
                          <select 
                            value={selectedPage}
                            onChange={(e) => setSelectedPage(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] text-white focus:border-neon-blue/50 outline-none"
                          >
                            <option value="">Seleccionar página...</option>
                            {pages.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {!(results.length === 3 && results.some(r => r.funnelPhase)) ? (
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Objetivo de la Campaña</label>
                            <select 
                              value={campaign.objective}
                              onChange={(e) => setCampaign({...campaign, objective: e.target.value})}
                              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] text-white focus:border-neon-blue/50 outline-none"
                            >
                              <option>Reconocimiento</option>
                              <option>Tráfico</option>
                              <option>Interacción</option>
                              <option>Clientes Potenciales</option>
                              <option>Ventas</option>
                              <option>WhatsApp</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1.5 bg-neon-blue/5 p-3 rounded-lg border border-neon-blue/20">
                            <label className="text-[9px] text-neon-blue uppercase tracking-widest font-bold">Optimización de Funnel Activa</label>
                            <p className="text-[10px] text-white/60">Los objetivos se configuran individualmente por cada fase (Awareness, Interest, Conversion).</p>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">URL de Destino</label>
                          <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-neon-blue" size={14} />
                            <input 
                              type="url" 
                              value={campaign.destinationUrl}
                              onChange={(e) => setCampaign({...campaign, destinationUrl: e.target.value})}
                              placeholder="https://tu-sitio.com/landing"
                              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 pl-9 text-[10px] text-white focus:border-neon-blue/50 outline-none"
                            />
                          </div>
                        </div>

                        {campaign.objective === 'Ventas' && (
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">PIXEL ID</label>
                            <input 
                              type="text" 
                              value={campaign.pixelId}
                              onChange={(e) => setCampaign({...campaign, pixelId: e.target.value})}
                              placeholder="Ej: 1234567890"
                              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] text-white focus:border-neon-blue/50 outline-none"
                            />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Canales</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => setCampaign({...campaign, facebookEnabled: !campaign.facebookEnabled})}
                              className={cn(
                                "flex items-center justify-center gap-2 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all",
                                campaign.facebookEnabled ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-white/10 text-white/40 hover:border-white/30"
                              )}
                            >
                              Facebook
                            </button>
                            <button 
                              onClick={() => setCampaign({...campaign, instagramEnabled: !campaign.instagramEnabled})}
                              className={cn(
                                "flex items-center justify-center gap-2 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all",
                                campaign.instagramEnabled ? "border-neon-blue bg-neon-blue/10 text-neon-blue" : "border-white/10 text-white/40 hover:border-white/30"
                              )}
                            >
                              Instagram
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Ubicaciones</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {[
                              { key: 'feedEnabled', label: 'Feed' },
                              { key: 'reelsAndStories', label: 'Historias y Reels' },
                              { key: 'instreamEnabled', label: 'Instream' },
                              { key: 'advantagePlacementsEnabled', label: 'Advantage +' }
                            ].map((placement) => {
                              const isCombined = placement.key === 'reelsAndStories';
                              const isChecked = isCombined 
                                ? (campaign.reelsEnabled || campaign.storiesEnabled) 
                                : !!campaign[placement.key as keyof CampaignData];

                              return (
                                <label 
                                  key={placement.key} 
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer",
                                    isChecked ? "bg-neon-blue/10 border-neon-blue/30" : "bg-black/20 border-white/5 hover:border-white/20"
                                  )}
                                >
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isCombined) {
                                        const nextVal = !isChecked;
                                        setCampaign({...campaign, reelsEnabled: nextVal, storiesEnabled: nextVal});
                                      } else {
                                        setCampaign({...campaign, [placement.key]: !campaign[placement.key as keyof CampaignData]});
                                      }
                                    }}
                                    className="accent-neon-blue w-3 h-3"
                                  />
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-white/70">{placement.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Audience & Placement */}
                    <div className="glass-panel p-6 border-white/10 bg-white/5 space-y-6">
                      <h3 className="font-orbitron text-xs font-bold text-neon-blue uppercase tracking-wider flex items-center gap-2">
                        <Target size={14} /> Segmentación Neural
                      </h3>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Audiencia Clave</label>
                          <textarea 
                            value={campaign.audience}
                            onChange={(e) => setCampaign({...campaign, audience: e.target.value})}
                            placeholder="Ej: Emprendedores digitales, 25-45 años, interesados en tecnología..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] text-white focus:border-neon-blue/50 outline-none h-20 resize-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Locación (País, Ciudad o Región)</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-neon-blue" size={14} />
                            <input 
                              type="text" 
                              value={campaign.location || ''}
                              onChange={(e) => setCampaign({...campaign, location: e.target.value})}
                              placeholder="Ej: México, Monterrey, América Latina..."
                              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 pl-9 text-[10px] text-white focus:border-neon-blue/50 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Género</label>
                            <select 
                              value={campaign.gender}
                              onChange={(e) => setCampaign({...campaign, gender: e.target.value})}
                              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] text-white focus:border-neon-blue/50 outline-none"
                            >
                              <option>Todos</option>
                              <option>Hombres</option>
                              <option>Mujeres</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Edad</label>
                            <input 
                              type="text" 
                              value={campaign.ageRange}
                              onChange={(e) => setCampaign({...campaign, ageRange: e.target.value})}
                              placeholder="Ej: 18-65+"
                              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] text-white focus:border-neon-blue/50 outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                          <label className="flex items-center gap-2 p-3 rounded-lg border border-neon-blue/20 bg-neon-blue/5 cursor-pointer hover:border-neon-blue/40 transition-all">
                            <input 
                              type="checkbox"
                              checked={campaign.advantageAudienceEnabled}
                              onChange={() => setCampaign({...campaign, advantageAudienceEnabled: !campaign.advantageAudienceEnabled})}
                              className="accent-neon-blue w-4 h-4"
                            />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neon-blue">Público Advantage +</span>
                              <span className="text-[8px] text-white/40 uppercase tracking-widest">Optimización automática por IA</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Launch Button */}
                  <div className="glass-panel p-8 border-neon-blue/40 bg-neon-blue/5 flex flex-col items-center gap-6 text-center">
                    <div className="space-y-2">
                      <h3 className="font-orbitron text-sm font-bold text-white uppercase tracking-widest">Sincronización Neural Lista</h3>
                      <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Todos los parámetros han sido validados por el núcleo</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                      <button 
                        onClick={() => {
                          setPublishMode(results.length > 1 ? 'bulk' : 'single');
                          metaToken ? setShowPublishModal(true) : setShowSettings(true);
                        }}
                        className="px-12 py-4 rounded-xl bg-neon-blue text-black font-black text-sm uppercase tracking-[0.3em] hover:shadow-[0_0_30px_rgba(0,209,255,0.5)] transition-all flex items-center justify-center gap-4 group"
                      >
                        <Zap className="group-hover:scale-125 transition-transform" />
                        {results.length > 1 ? `PUBLICAR LOS ${results.length} ANUNCIOS EN META` : "PUBLICAR EN META ADS"}
                      </button>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                       <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                         <span className="text-[9px] text-neon-green font-bold uppercase tracking-widest">API Meta OK</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
                         <span className="text-[9px] text-neon-blue font-bold uppercase tracking-widest">Neural Link Active</span>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Section Shared */}
            <AnimatePresence>
              {results.length > 0 ? (
                <motion.div 
                  ref={resultsRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-20 space-y-8 pb-20 border-t border-white/10 pt-20"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-white/10 pb-6">
                      <div className="flex flex-col gap-2">
                         <h2 className="font-orbitron text-lg md:text-xl font-bold flex items-center gap-2">
                          <Zap className="text-neon-blue" /> ANUNCIOS GENERADOS
                        </h2>
                        <div className="flex flex-wrap items-center gap-2">
                          {results.map((res, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedResultIndex(idx)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-all flex items-center gap-2",
                                selectedResultIndex === idx 
                                  ? "bg-neon-blue text-black shadow-[0_0_15px_rgba(0,209,255,0.4)]" 
                                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              {res.funnelPhase ? res.funnelPhase.name.replace(/\s*\(.*?\)\s*/g, '').toUpperCase() : `OPCIÓN ${idx + 1}`}
                            </button>
                          ))}
                        </div>
                      </div>

                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-white/40">Performance Score</span>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl md:text-3xl font-orbitron font-black text-neon-green">
                            {results[selectedResultIndex].performanceScore}
                          </span>
                          <div className="w-20 md:w-24 h-1.5 md:h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${results[selectedResultIndex].performanceScore * 10}%` }}
                              className="h-full bg-neon-green shadow-[0_0_10px_#39FF14]"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* CREAR button hidden per user request */}
                    </div>
                  </div>

                  <div key={selectedResultIndex} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Visual Result */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className={cn(
                        "relative group transition-all duration-500 rounded-2xl overflow-hidden bg-transparent",
                        campaign.aspectRatio === '1:1' ? "aspect-square" : 
                        campaign.aspectRatio === '9:16' ? "aspect-[9/16]" : 
                        "aspect-video"
                      )}>
                        {results[selectedResultIndex].generatedImageUrl ? (
                          <>
                            {results[selectedResultIndex].generatedImageUrl?.startsWith('data:video') ? (
                              <video 
                                src={results[selectedResultIndex].generatedImageUrl} 
                                className="w-full h-full object-cover" 
                                autoPlay 
                                loop 
                                muted 
                                playsInline
                              />
                            ) : (
                              <img src={results[selectedResultIndex].generatedImageUrl} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={downloadVisual}
                                className="bg-neon-blue hover:bg-neon-blue/80 text-black font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(0,209,255,0.4)] transition-all"
                              >
                                <Download size={18} /> DESCARGAR
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-black/40">
                            <ImageIcon className="text-white/20" size={48} />
                          </div>
                        )}
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-bold tracking-widest uppercase text-neon-blue">
                          {results[selectedResultIndex]?.funnelPhase 
                            ? `FASE: ${results[selectedResultIndex].funnelPhase.name}` 
                            : `AI Neural Variant ${selectedResultIndex + 1}`}
                        </div>
                      </div>

                      <div className="glass-panel p-4 space-y-4 border-neon-blue/20">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-neon-blue flex items-center gap-2 uppercase tracking-wider">
                            <Lightbulb size={14} /> Estrategia Creativa
                          </h4>
                          <button 
                            onClick={() => copyToClipboard(results[selectedResultIndex].analysis, 'strategy')}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              copiedType === 'strategy' ? "bg-neon-green text-black" : "bg-white/5 hover:bg-white/10 text-white/60"
                            )}
                          >
                            {copiedType === 'strategy' ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="space-y-3">
                          {results[selectedResultIndex].headline && (
                            <div className="text-xs">
                              <span className="font-black text-neon-blue uppercase tracking-widest">Copy: </span>
                              <span className="text-white/90 font-medium">{results[selectedResultIndex].headline}</span>
                            </div>
                          )}
                          {results[selectedResultIndex].concept && (
                            <div className="text-xs">
                              <span className="font-black text-neon-blue uppercase tracking-widest">Concepto: </span>
                              <span className="text-white/90 font-medium">{results[selectedResultIndex].concept}</span>
                            </div>
                          )}
                          <p className="text-[11px] text-white/70 leading-relaxed italic border-l-2 border-neon-blue/30 pl-3">
                            {results[selectedResultIndex].analysis}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Captions Result */}
                    <div className="lg:col-span-2 space-y-6">
                      {[
                        { id: 'aida', title: 'Caption', content: results[selectedResultIndex].captions.aida, icon: <Layers size={16} /> },
                        { id: 'storytelling', title: 'Storytelling', content: results[selectedResultIndex].captions.storytelling, icon: <FileText size={16} /> },
                        { id: 'urgency', title: 'Call to Action', content: results[selectedResultIndex].captions.urgency, icon: <Zap size={16} /> }
                      ].map((cap) => (
                        <div key={cap.id} className="glass-panel p-6 space-y-4 relative group hover:border-neon-blue/40 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                                {cap.icon}
                              </div>
                              <h3 className="font-orbitron text-sm font-bold tracking-wider uppercase">{cap.title}</h3>
                            </div>
                            <button 
                              onClick={() => {
                                if (cap.id === 'aida') {
                                  const a = cap.content as any;
                                  const text = `${a.attention}\n\n${a.interest}\n\n${a.desire}\n\n${a.action}`;
                                  copyToClipboard(text, cap.id);
                                } else {
                                  copyToClipboard(cap.content as string, cap.id);
                                }
                              }}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                copiedType === cap.id ? "bg-neon-green text-black" : "bg-white/5 hover:bg-white/10 text-white/60"
                              )}
                            >
                              {copiedType === cap.id ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                          
                          {cap.id === 'aida' ? (
                            <div className="space-y-4">
                              {[
                                { label: 'Atracción', text: (cap.content as any).attention },
                                { label: 'Interés', text: (cap.content as any).interest },
                                { label: 'Deseo', text: (cap.content as any).desire },
                                { label: 'Acción', text: (cap.content as any).action }
                              ].map((part, i) => (
                                <div key={i} className="space-y-1.5">
                                  <div className="px-2 py-0.5 rounded bg-neon-blue/20 self-start inline-block text-[9px] font-black text-neon-blue uppercase tracking-wider">
                                    {part.label}
                                  </div>
                                  <p className="text-sm text-white/80 leading-relaxed font-medium pl-1">
                                    {part.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <p className="text-sm text-white/80 leading-relaxed">
                                "{cap.content}"
                              </p>
                              {cap.id === 'storytelling' && (
                                <div className="flex items-center flex-wrap gap-2">
                                  {isVideoProcessing === `story-${selectedResultIndex}` ? (
                                    <div className="text-[9px] px-3 py-1.5 rounded bg-neon-blue/10 border border-neon-blue/30 text-neon-blue font-bold flex items-center gap-2">
                                      <Cpu size={12} className="animate-spin" />
                                      PROCESANDO
                                    </div>
                                  ) : activeDurationSelector === `story-${selectedResultIndex}` ? (
                                    <>
                                      <button
                                        onClick={() => handleStorytellingVideo(cap.content, selectedResultIndex, 5)}
                                        className="text-[9px] px-3 py-1.5 rounded bg-neon-blue text-black font-black uppercase tracking-wider hover:scale-105 transition-all"
                                      >
                                        5 SEGUNDOS
                                      </button>
                                      <button
                                        onClick={() => handleStorytellingVideo(cap.content, selectedResultIndex, 10)}
                                        className="text-[9px] px-3 py-1.5 rounded bg-neon-blue text-black font-black uppercase tracking-wider hover:scale-105 transition-all"
                                      >
                                        10 SEGUNDOS
                                      </button>
                                      <button
                                        onClick={() => setActiveDurationSelector(null)}
                                        className="p-1.5 rounded bg-white/5 text-white/40 hover:text-white transition-all"
                                      >
                                        <X size={12} />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => setActiveDurationSelector(`story-${selectedResultIndex}`)}
                                      className="text-[9px] px-3 py-1.5 rounded bg-neon-blue/10 border border-neon-blue/30 text-neon-blue font-bold uppercase tracking-wider hover:bg-neon-blue hover:text-black transition-all flex items-center gap-2 group"
                                    >
                                      <Video size={12} className="group-hover:scale-110 transition-transform" />
                                      CREAR VIDEO
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-neon-blue group-hover:w-full transition-all duration-500" />
                        </div>
                      ))}
                      
                      {activeHomeTab !== 'publicar' && (
                        <button
                          onClick={() => {
                            if (metaToken) {
                              setActiveHomeTab('publicar');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            } else {
                              setShowSettings(true);
                            }
                          }}
                          disabled={isPublishing}
                          className="w-full py-4 rounded-xl bg-neon-blue text-black font-black text-sm uppercase tracking-[0.25em] flex items-center justify-center gap-3 hover:bg-neon-blue/80 transition-all shadow-[0_0_25px_rgba(0,209,255,0.4)] disabled:opacity-50"
                        >
                          {isPublishing ? (
                            <Cpu className="animate-spin" size={20} />
                          ) : (
                            <Zap size={20} />
                          )}
                          {metaToken ? "CONTINUAR A LA PUBLICACIÓN" : "CONFIGURAR CUENTA DE META"}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : !isProcessing && (activeHomeTab === 'crear' || activeHomeTab === 'publicar') && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-60">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Neural Network background animation */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                      {/* Interconnected Nodes */}
                      {[...Array(8)].map((_, i) => {
                        const angle = (i * 2 * Math.PI) / 8;
                        const x = 50 + 32 * Math.cos(angle);
                        const y = 50 + 32 * Math.sin(angle);
                        return (
                          <React.Fragment key={i}>
                            <motion.circle
                              cx={x}
                              cy={y}
                              r="1.5"
                              fill="#00D1FF"
                              initial={{ opacity: 0.3 }}
                              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
                              transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                            />
                            <motion.path
                              d={`M 50 50 L ${x} ${y}`}
                              stroke="#00D1FF"
                              strokeWidth="0.5"
                              strokeDasharray="1 3"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: [0, 0.4, 0] }}
                              transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }}
                            />
                          </React.Fragment>
                        );
                      })}
                      {/* Inner pulsing ring */}
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="18"
                        stroke="#00D1FF"
                        strokeWidth="0.5"
                        fill="none"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: [0, 0.2, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </svg>
                    
                    <motion.div
                      animate={{ 
                        boxShadow: ["0 0 15px rgba(0,209,255,0.2)", "0 0 40px rgba(0,209,255,0.5)", "0 0 15px rgba(0,209,255,0.2)"],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="w-24 h-24 rounded-full border border-neon-blue/40 flex items-center justify-center bg-neon-blue/5 z-10 backdrop-blur-sm"
                    >
                      <Brain size={48} className="text-neon-blue" />
                    </motion.div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="font-orbitron text-xl font-bold uppercase tracking-[0.2em] text-white">Creative Neural Engine V2.0</h2>
                    <p className="text-sm max-w-md mx-auto">
                      Configura tu campaña y sube los datos históricos para que el motor neuronal genere tu próxima pieza ganadora.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-neon-blue uppercase tracking-widest">
                    ANALIZA <ChevronRight size={14} /> PLANIFICA <ChevronRight size={14} /> CREA <ChevronRight size={14} /> PUBLICA
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
      )}

      {/* Footer / Status Bar */}
      <footer className="h-auto md:h-10 border-t border-neon-blue/20 bg-black/60 flex flex-col md:flex-row items-center px-6 py-3 md:py-0 justify-between text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 gap-2 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green" /> ONLINE
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-blue" /> ENCRYPTED
          </span>
        </div>
        <div className="text-center md:text-right">
          © 2026 SMART ADS • NEURAL INTERFACE
        </div>
      </footer>

      {/* Recharge Modal */}
      <AnimatePresence>
        {showRecharge && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRecharge(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 space-y-8 scrollbar-thin scrollbar-thumb-neon-blue/20 border-neon-blue/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h2 className="font-orbitron text-xl font-bold tracking-wider">RECARGA DE CRÉDITOS</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Selecciona un paquete neural</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRecharge(false)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <Zap size={20} className="rotate-45" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { amount: 200, price: 30, link: 'https://checkout.bold.co/payment/LNK_JKXIG2RC6D' },
                  { amount: 500, price: 50, link: 'https://checkout.bold.co/payment/LNK_XYV3YLFZVR' },
                  { amount: 1000, price: 100, popular: true, link: 'https://checkout.bold.co/payment/LNK_MX4PJZWPYL' },
                  { amount: 3000, price: 200, link: 'https://checkout.bold.co/payment/LNK_NGC8B65ZUN' },
                  { amount: 5000, price: 300, link: 'https://checkout.bold.co/payment/LNK_HKZ97SLIDZ' },
                  { amount: 'unlimited', price: 500, label: 'ILIMITADO', link: 'https://checkout.bold.co/payment/LNK_MNX0HXPWH5' }
                ].map((pkg) => (
                  <div 
                    key={pkg.amount}
                    className={cn(
                      "glass-panel p-6 flex flex-col items-center text-center gap-4 relative group cursor-pointer hover:border-neon-blue/60 transition-all",
                      pkg.popular && "border-neon-green/40 bg-neon-green/5",
                      pkg.amount === 'unlimited' && "sm:col-span-2 lg:col-span-1 border-neon-blue/40 bg-neon-blue/5"
                    )}
                    onClick={() => handleRecharge(pkg)}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neon-green text-black text-[8px] font-black px-3 py-1 rounded-full tracking-widest">
                        MÁS POPULAR
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className={cn(
                        "font-orbitron font-black text-white group-hover:neon-text transition-all",
                        pkg.amount === 'unlimited' ? "text-2xl" : "text-3xl"
                      )}>
                        {pkg.label || pkg.amount}
                      </span>
                      <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                        {pkg.amount === 'unlimited' ? 'Acceso Total' : 'Créditos'}
                      </p>
                    </div>
                    <div className="h-px w-full bg-white/10" />
                    <div className="text-2xl font-orbitron font-bold text-neon-green">
                      ${pkg.price} <span className="text-xs text-white/40">USD /Mes*</span>
                    </div>
                    <motion.button 
                      animate={pkg.popular ? {
                        scale: [1, 1.02, 1],
                        boxShadow: [
                          "0 0 0px rgba(0, 209, 255, 0)",
                          "0 0 15px rgba(0, 209, 255, 0.4)",
                          "0 0 0px rgba(0, 209, 255, 0)"
                        ]
                      } : {}}
                      transition={pkg.popular ? {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      } : {}}
                      className="w-full py-3 rounded-lg bg-neon-blue text-black font-black text-[10px] uppercase tracking-[0.2em] hover:bg-neon-blue/80 transition-all"
                    >
                      SELECCIONAR
                    </motion.button>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/5">
                <p className="text-[9px] text-white/30 leading-relaxed uppercase tracking-[0.2em] text-center">
                  Aviso Legal: El consumo de créditos se basa en la complejidad del procesamiento neural. 
                  Imágenes: <span className="text-white/50">50 créditos</span>. 
                  Videos (5s): <span className="text-white/50">100 créditos</span>. 
                  Videos (10s): <span className="text-white/50">200 créditos</span>. 
                  Al recargar, aceptas los términos de servicio y la política de uso de IA de SMART ADS.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel p-6 md:p-8 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 space-y-6 border-neon-blue/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                    <History size={24} />
                  </div>
                  <div>
                    <h2 className="font-orbitron text-xl font-bold tracking-wider">REGISTRO DE CONSUMO</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Historial de Créditos y Generaciones</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 text-white/40 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-neon-blue/20">
                {isFetchingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40 gap-4">
                    <Cpu className="animate-spin text-neon-blue" size={40} />
                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Accediendo al Núcleo...</span>
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center space-y-4">
                    <History size={48} />
                    <p className="text-sm uppercase tracking-widest font-bold font-orbitron">No hay registros aún</p>
                    <p className="text-xs max-w-xs text-white/60">Tus anuncios aparecerán aquí después de ser procesados.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {historyItems.map((item) => {
                      const cost = item.campaign.format === 'video' 
                        ? (item.campaign.videoDuration === 10 ? 200 : 100) 
                        : 50;
                      
                      return (
                        <div 
                          key={item.id}
                          className="glass-panel p-4 md:p-5 bg-white/5 border-white/5 hover:border-neon-blue/20 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6"
                        >
                          <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                            <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-white/5 flex items-center justify-center text-white/20 border border-white/10 group-hover:border-neon-blue/30 transition-colors">
                              {item.campaign.format === 'video' ? (
                                <Zap size={18} className="text-neon-blue" />
                              ) : (
                                <Zap size={18} className="text-neon-green" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                                    {item.campaign.format === 'video' ? `Video AI (${item.campaign.videoDuration}s)` : 'Imagen AI'}
                                  </span>
                                  <div className="hidden xs:block h-px w-4 md:w-8 bg-white/10" />
                                  <span className="text-[9px] md:text-[10px] text-white/30 uppercase tracking-widest">
                                    {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                               </div>
                               <h3 className="font-orbitron text-[11px] md:text-xs font-bold tracking-wider truncate text-white mt-1">
                                 {item.campaign.productName}
                                </h3>
                               <p className="text-[8px] md:text-[9px] text-white/20 uppercase tracking-widest mt-0.5 truncate">
                                 Objetivo: {item.campaign.objective}
                               </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-6 border-t border-white/5 sm:border-0 pt-3 sm:pt-0">
                            <div className="text-left sm:text-right">
                              <div className="text-neon-green font-orbitron font-black text-base md:text-lg leading-none">
                                -{cost}
                              </div>
                              <div className="text-[7px] md:text-[8px] text-white/30 uppercase tracking-[0.2em] font-bold mt-1">
                              CRÉDITOS
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => deleteHistoryItem(item.id)}
                              className="p-2.5 md:p-3 rounded-xl bg-white/5 border border-white/10 text-white/20 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30 transition-all"
                              title="Eliminar registro"
                            >
                              <X size={14} className="md:w-4 md:h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfile(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col relative z-10 space-y-8 border-neon-blue/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                    <User size={24} />
                  </div>
                  <div>
                    <h2 className="font-orbitron text-xl font-bold tracking-wider uppercase">Tu Perfil</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Gestión de Cuenta Neural</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProfile(false)}
                  className="p-2 text-white/40 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-neon-blue/20">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Nombre Completo</label>
                    <input 
                      type="text"
                      value={userProfile.displayName}
                      onChange={(e) => setUserProfile({ ...userProfile, displayName: e.target.value })}
                      placeholder="Ej. Juan Pérez"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Correo Electrónico</label>
                    <input 
                      type="email"
                      value={userProfile.email}
                      readOnly
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white/40 cursor-not-allowed outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Teléfono</label>
                    <input 
                      type="tel"
                      value={userProfile.phone}
                      onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                      placeholder="+54 9 11 1234-5678"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Página Web</label>
                    <input 
                      type="url"
                      value={userProfile.website}
                      onChange={(e) => setUserProfile({ ...userProfile, website: e.target.value })}
                      placeholder="https://tu-marca.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="w-full py-4 rounded-xl bg-neon-blue text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-neon-blue/80 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <Cpu size={16} className="animate-spin" />
                        GUARDANDO...
                      </>
                    ) : (
                      <>
                        <Check size={16} className="group-hover:scale-125 transition-transform" />
                        GUARDAR CAMBIOS
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-white/20 uppercase font-black tracking-widest mt-4">
                    LOS CAMBIOS SE SINCRONIZARÁN EN LA NUBE SMART ADS
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPublishModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isPublishing) setShowPublishModal(false); }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel p-6 md:p-8 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 space-y-6 border-neon-blue/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h2 className="font-orbitron text-xl font-bold tracking-wider uppercase">Publicar Anuncio</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                      {publishStep === 'config' ? 'Paso 1: Configuración de Campaña' : 'Paso 2: Confirmación y Vista Previa'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPublishModal(false)}
                  disabled={isPublishing}
                  className="p-2 text-white/40 hover:text-white transition-colors disabled:opacity-30"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-neon-blue/20">
                {publishStep === 'config' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Moneda</label>
                          <select 
                            value={campaign.currency}
                            onChange={(e) => setCampaign({...campaign, currency: e.target.value})}
                            className="w-full bg-[#0A192F] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                          >
                            <option value="USD">USD</option>
                            <option value="COP">COP</option>
                            <option value="MXN">MXN</option>
                            <option value="CLP">CLP</option>
                            <option value="EUR">EUR</option>
                            <option value="PEN">PEN</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Presupuesto Diario</label>
                          <input 
                            type="text" 
                            value={campaign.budget}
                            onChange={(e) => setCampaign({...campaign, budget: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-blue outline-none transition-all placeholder:text-white/20"
                            placeholder="Ej: 5.00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Schedule Section */}
                    <div className="space-y-4">
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Fecha de Inicio (Opcional)</label>
                          <input 
                            type="datetime-local" 
                            value={campaign.scheduleStart}
                            onChange={(e) => setCampaign({...campaign, scheduleStart: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-blue outline-none transition-all [color-scheme:dark]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Fecha de Fin (Opcional)</label>
                          <input 
                            type="datetime-local" 
                            value={campaign.scheduleEnd}
                            onChange={(e) => setCampaign({...campaign, scheduleEnd: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-blue outline-none transition-all [color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 pb-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">Presupuesto Diario</p>
                        <p className="text-sm font-orbitron font-bold text-neon-green">{campaign.budget} {campaign.currency}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">Objetivo</p>
                        <p className="text-sm font-orbitron font-bold text-neon-blue">{campaign.objective}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">Canales</p>
                        <div className="flex gap-2 mt-1">
                          {campaign.facebookEnabled && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                          {campaign.instagramEnabled && <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />}
                           {campaign.objective === 'WhatsApp' && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">Pixel ID</p>
                        <p className="text-xs font-mono font-bold text-neon-pink truncate">{campaign.pixelId || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Ad Preview Section */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className="w-full md:w-1/2 space-y-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Copia de Anuncio</p>
                          <div className="h-px w-full bg-white/10" />
                          <p className="text-xs text-white/80 leading-relaxed max-h-40 overflow-y-auto scrollbar-thin">
                            {results[selectedResultIndex] && (
                              <>
                                {results[selectedResultIndex].captions.aida.attention}{'\n'}
                                {results[selectedResultIndex].captions.aida.interest}{'\n'}
                                {results[selectedResultIndex].captions.aida.desire}{'\n'}
                                {results[selectedResultIndex].captions.aida.action}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">Enlace de Destino</p>
                          <p className="text-[10px] text-neon-blue truncate font-mono">
                            {campaign.destinationUrl || 'https://www.facebook.com'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="w-full md:w-1/2">
                         <div className="rounded-2xl overflow-hidden shadow-2xl">
                           <div className="p-3 border-b border-white/5 bg-black/40 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-neon-blue/20 flex items-center justify-center">
                                 <Bot size={12} className="text-neon-blue" />
                               </div>
                               <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Vista previa móvil</span>
                             </div>
                             <div className="flex gap-1">
                               <div className="w-1 h-1 rounded-full bg-white/20" />
                               <div className="w-1 h-1 rounded-full bg-white/20" />
                             </div>
                           </div>
                           <div className="aspect-square bg-transparent overflow-hidden relative">
                              {results[selectedResultIndex]?.generatedImageUrl && (
                                <img 
                                  src={results[selectedResultIndex].generatedImageUrl} 
                                  className="w-full h-full object-cover"
                                  alt="Ad Preview"
                                />
                              )}
                           </div>
                           <div className="p-4 bg-black/80 space-y-2">
                             <div className="flex items-center justify-between">
                               <div>
                                 <p className="text-[8px] text-white/40 uppercase tracking-widest">{campaign.productName}</p>
                                 <p className="text-xs font-black uppercase text-white truncate max-w-[150px]">
                                   {results[selectedResultIndex]?.headline || campaign.productName}
                                 </p>
                               </div>
                               <button className="px-4 py-1.5 rounded-md bg-white/10 text-white text-[9px] font-black tracking-widest uppercase hover:bg-white/20 transition-all">
                                 {campaign.objective === 'WhatsApp' ? 'Enviar Mensaje' : 'Saber Más'}
                               </button>
                             </div>
                           </div>
                         </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-neon-pink/5 border border-neon-pink/20 flex items-center gap-4 text-xs text-neon-pink animate-pulse">
                       <Lightbulb size={18} />
                       <p className="font-bold uppercase tracking-wider leading-relaxed">
                         Al confirmar, se creará una campaña en pausa en tu Administrador de Anuncios para que realices un último chequeo de facturación antes de activarla.
                       </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 pt-6 mt-auto border-t border-white/10">
                <button
                  onClick={() => publishStep === 'preview' ? setPublishStep('config') : setShowPublishModal(false)}
                  disabled={isPublishing}
                  className="px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all disabled:opacity-30"
                >
                  {publishStep === 'config' ? 'CANCELAR' : 'VOLVER'}
                </button>
                
                <button
                  onClick={() => publishStep === 'config' ? setPublishStep('preview') : (publishMode === 'bulk' ? executePublishBulk() : executePublish())}
                  disabled={isPublishing}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(0,209,255,0.2)] disabled:opacity-50",
                    publishStep === 'config' ? "bg-neon-blue text-black hover:bg-neon-blue/80" : "bg-neon-green text-black hover:bg-neon-green/80 shadow-[0_0_25px_rgba(57,255,20,0.3)]"
                  )}
                >
                  {isPublishing ? (
                    <Cpu className="animate-spin" size={20} />
                  ) : (
                    publishStep === 'config' ? <ChevronRight size={20} /> : <Zap size={20} />
                  )}
                  {isPublishing 
                    ? "PUBLICANDO EN META..." 
                    : (publishStep === 'config' ? "SIGUIENTE: VISTA PREVIA" : (publishMode === 'bulk' ? `Confirmar y Publicar (${150 * results.length} CRÉDITOS)` : "Confirmar y Publicar (150 CRÉDITOS)"))}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-panel p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col relative z-10 space-y-8 border-neon-blue/20"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neon-blue/10 flex items-center justify-center text-neon-blue">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className="font-orbitron text-xl font-bold tracking-wider uppercase">Ajustes</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Plataforma Neural</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 text-white/40 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2 scrollbar-thin scrollbar-thumb-neon-blue/20">
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="text-neon-blue" size={16} />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Conexiones Publicitarias</h3>
                  </div>
                  
                  <div className="glass-panel p-4 bg-white/5 border-white/5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#1877F2]/10 flex items-center justify-center">
                        <svg className="w-6 h-6 fill-[#1877F2]" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-widest uppercase">Meta Ads Center</h4>
                        <p className="text-[9px] text-white/40 uppercase tracking-widest">
                          {metaToken ? 'Conectado como Administrador' : 'Sin vincular'}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (metaToken) {
                          setMetaToken(null);
                          setAdAccounts([]);
                          setPages([]);
                        } else {
                          handleMetaLogin();
                        }
                      }}
                      className={cn(
                        "px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all",
                        metaToken 
                          ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
                          : "bg-[#1877F2] text-white hover:bg-[#166fe5]"
                      )}
                    >
                      {metaToken ? 'Desvincular' : 'Vincular'}
                    </button>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Brain className="text-neon-blue" size={16} />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Preferencias de IA</h3>
                  </div>
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        const newValue = userProfile.multiVariantEnabled === false ? true : false;
                        const updatedProfile = { ...userProfile, multiVariantEnabled: newValue };
                        setUserProfile(updatedProfile);
                        if (currentUser) {
                          setDoc(doc(db, 'users', currentUser.uid), { ...updatedProfile, updatedAt: serverTimestamp() }, { merge: true });
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left group"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Generación por defecto</span>
                        <p className="text-[8px] text-white/40 uppercase tracking-wider">
                          {userProfile.multiVariantEnabled === false ? 'Un solo resultado de alto impacto' : 'Tres variantes estratégicas distintas'}
                        </p>
                      </div>
                      <div className={cn(
                        "w-10 h-5 rounded-full relative transition-colors duration-300",
                        userProfile.multiVariantEnabled !== false ? "bg-neon-blue/30" : "bg-white/10"
                      )}>
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300",
                          userProfile.multiVariantEnabled !== false 
                            ? "right-0.5 bg-neon-blue shadow-[0_0_15px_rgba(0,209,255,0.6)]" 
                            : "left-0.5 bg-white/30"
                        )} />
                      </div>
                    </button>
                    <p className="text-[8px] text-white/20 uppercase tracking-widest px-2 italic">
                      Nota: Generar 3 variantes consume más tiempo de procesamiento neural.
                    </p>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SmartBot 
        currentCampaign={campaign} 
        allResults={results} 
        isLoggedIn={isLoggedIn}
        userName={userProfile.displayName || currentUser?.displayName || null}
        errorNotification={chatNotification}
      />
    </div>
  );
}
