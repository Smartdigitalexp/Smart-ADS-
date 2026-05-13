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
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzeAndGenerate, generateCreativeConcept, generateVideoFromPrompt, optimizeProductReference, analyzePerformanceData } from './services/geminiService';
import { AdResult, CampaignData, CSVRow, HistoryItem, UserProfile, AnalysisReport } from './types';
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
  Cell
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
    objective: 'Conversión',
    format: 'image',
    aspectRatio: '1:1',
    creativeConcept: '',
    audience: '',
    videoDuration: 5,
    budget: '5.00',
    destinationUrl: '',
    pixelId: '',
    whatsappNumber: '',
    currency: 'USD',
    facebookEnabled: true,
    instagramEnabled: true,
    scheduleStart: '',
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
  const [activeHomeTab, setActiveHomeTab] = useState<'analizar' | 'crear'>('analizar');
  const [activeAssetTool, setActiveAssetTool] = useState<'campaign' | 'generate_img' | 'product_img' | 'animate' | 'edit_img' | 'video_gen'>('campaign');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

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
      setChatNotification('Concepto neuronal generado con éxito.');
    } catch (error) {
      console.error('Error generating concept:', error);
      setChatNotification('Hubo un error al generar el concepto. Por favor, intenta de nuevo.');
    } finally {
      setIsGeneratingConcept(false);
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
    
    try {
      setChatNotification('Paso 1/4: Subiendo multimedia a Meta...');
      const res = await publishAd({
        accessToken: metaToken,
        adAccountId: selectedAdAccount,
        pageId: selectedPage,
        productName: campaign.productName,
        imageUrl: currentResult.generatedImageUrl || '',
        headline: currentResult.headline || campaign.productName, // Copy -> Title
        body: currentResult.captions.aida, // Caption -> Text
        objective: campaign.objective,
        budget: campaign.budget || '5.00',
        audience: campaign.audience,
        destinationUrl: campaign.destinationUrl || '',
        pixelId: campaign.pixelId || '',
        whatsappNumber: campaign.whatsappNumber || '',
        currency: campaign.currency || 'USD',
        facebookEnabled: campaign.facebookEnabled,
        instagramEnabled: campaign.instagramEnabled,
        scheduleStart: campaign.scheduleStart,
        scheduleEnd: campaign.scheduleEnd
      });
      
      if (res.success) {
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
        timeRange: { since: analysisDateRange.since, until: analysisDateRange.until }
      });

      if (insights && insights.length > 0) {
        const formattedData: CSVRow[] = insights.map((item: any) => ({
          formato: item.adset_name || 'Personalizado',
          concepto: item.campaign_name || 'Meta Ads',
          texto: item.ad_name || 'Anuncio de Meta',
          ctr: parseFloat(item.ctr || item.inline_link_click_ctr || '0'),
          engagement: parseInt(item.inline_link_clicks || item.clicks || '0'),
          resultados: parseInt(item.reach || item.impressions || '0'),
          impresiones: parseInt(item.impressions || '0'),
          alcance: parseInt(item.reach || '0'),
          clics_enlace: parseInt(item.inline_link_clicks || item.clicks || '0'),
          cpc: parseFloat(item.cpc || '0'),
          cpm: parseFloat(item.cpm || '0'),
          gasto_total: parseFloat(item.spend || '0')
        }));
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

  const AnalysisDashboard = ({ data, report }: { data: CSVRow[], report: AnalysisReport | null }) => {
    if (!data.length) return null;

    const chartData = data.slice(0, 10).map(row => ({
      name: row.texto.substring(0, 10) + '...',
      ctr: row.ctr,
      spend: row.gasto_total || 0,
      reach: row.alcance || 0,
      clicks: row.clics_enlace || 0,
      impressions: row.impresiones || 0,
    }));

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 glass-panel p-6 bg-white/5 border-neon-blue/20">
            <h3 className="font-orbitron text-xs font-bold text-neon-blue uppercase tracking-widest mb-6">CURVA DE RENDIMIENTO (CTR)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCtr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d1ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00d1ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000000cc', borderColor: '#00d1ff66', borderRadius: '8px', fontSize: '10px' }}
                    itemStyle={{ color: '#00d1ff' }}
                  />
                  <Area type="monotone" dataKey="ctr" stroke="#00d1ff" fillOpacity={1} fill="url(#colorCtr)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="glass-panel p-6 bg-neon-blue/5 border-neon-blue/20">
            <h3 className="font-orbitron text-xs font-bold text-neon-blue uppercase tracking-widest mb-6">KPIs GLOBALES</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Impresiones', value: data.reduce((acc, curr) => acc + (curr.impresiones || 0), 0) },
                { label: 'Alcance', value: data.reduce((acc, curr) => acc + (curr.alcance || 0), 0) },
                { label: 'Resultados', value: data.reduce((acc, curr) => acc + curr.resultados, 0) },
                { label: 'Clics en enlace', value: data.reduce((acc, curr) => acc + (curr.clics_enlace || 0), 0) },
                { label: 'Interacciones', value: data.reduce((acc, curr) => acc + (curr.engagement || 0), 0) },
                { label: 'CTR Medio', value: (data.reduce((acc, curr) => acc + curr.ctr, 0) / data.length).toFixed(2) + '%' },
                { label: 'CPC Medio', value: '$' + (data.reduce((acc, curr) => acc + (curr.cpc || 0), 0) / data.length).toFixed(2) },
                { label: 'CPM Medio', value: '$' + (data.reduce((acc, curr) => acc + (curr.cpm || 0), 0) / data.length).toFixed(2) },
                { label: 'Gasto Total', value: '$' + data.reduce((acc, curr) => acc + (curr.gasto_total || 0), 0).toFixed(2) },
              ].map((stat, idx) => (
                <div key={idx} className="border-l-2 border-neon-blue/30 pl-3">
                  <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="font-orbitron text-sm font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {report && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 bg-white/5 border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit className="text-neon-blue" size={18} />
                <h3 className="font-orbitron text-xs font-bold uppercase tracking-widest text-white">INSIGHTS ESTRATÉGICOS</h3>
              </div>
              <p className="text-xs text-white/70 italic mb-4">"{report.summary}"</p>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-orbitron text-neon-blue uppercase mb-2">Conclusiones</h4>
                  <ul className="space-y-2">
                    {report.conclusions.map((c, i) => (
                      <li key={i} className="text-[10px] text-white/60 flex gap-2">
                        <span className="text-neon-blue">›</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] font-orbitron text-green-400 uppercase mb-2">Recomendaciones</h4>
                  <ul className="space-y-2">
                    {report.recommendations.map((r, i) => (
                      <li key={i} className="text-[10px] text-white/60 flex gap-2">
                        <span className="text-green-400">✓</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel p-6 bg-green-500/5 border-green-500/20">
                <h3 className="font-orbitron text-[10px] font-bold text-green-400 uppercase mb-4 flex items-center gap-2">
                  <TrendingUp size={14} /> TOP PERFORMERS (WINNERS)
                </h3>
                <div className="space-y-3">
                  {report.topPerformers.map((item, i) => (
                    <div key={i} className="p-3 bg-black/20 rounded border border-white/5">
                      <p className="text-[10px] font-bold text-white mb-1 uppercase tracking-wider">{item.name}</p>
                      <p className="text-[9px] text-white/50">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-6 bg-red-500/5 border-red-500/20">
                <h3 className="font-orbitron text-[10px] font-bold text-red-400 uppercase mb-4 flex items-center gap-2">
                  <AlertTriangle size={14} /> LOW PERFORMERS (AVOID)
                </h3>
                <div className="space-y-3">
                  {report.lowPerformers.map((item, i) => (
                    <div key={i} className="p-3 bg-black/20 rounded border border-white/5">
                      <p className="text-[10px] font-bold text-white mb-1 uppercase tracking-wider">{item.name}</p>
                      <p className="text-[9px] text-white/50">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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
            resultados: row.Resultados || row.resultados || row.conversion || 0
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
      let visualRefBase64: string | undefined;
      let visualRefMimeType: string | undefined;

      if (currentResult.generatedImageUrl && currentResult.generatedImageUrl.startsWith('data:')) {
        const parts = currentResult.generatedImageUrl.split(',');
        visualRefBase64 = parts[1];
        visualRefMimeType = parts[0].split(':')[1].split(';')[0];
      }

      const videoData = await generateVideoFromPrompt(
        text, 
        campaign.aspectRatio,
        visualRefBase64,
        visualRefMimeType,
        duration
      );
      if (videoData) {
        const newResults = [...results];
        newResults[index] = {
          ...newResults[index],
          generatedImageUrl: videoData
        };
        setResults(newResults);
        setChatNotification('¡Video generado desde Storytelling con éxito!');

        // Save modification to history if exists
        if (currentHistoryId) {
          try {
            await setDoc(doc(db, 'history', currentHistoryId), {
              results: newResults,
              lastModified: serverTimestamp()
            }, { merge: true });
            if (loginEmail) fetchHistory(loginEmail);
          } catch (err: any) {
            console.error("Error updating history with video:", err);
            // Recovery for size limit
            if (err.message && err.message.includes('maximum allowed size')) {
              try {
                const strippedResults = newResults.map(r => ({
                  ...r,
                  generatedImageUrl: r.generatedImageUrl?.length > 500000 ? '(Video too large for history)' : r.generatedImageUrl
                }));
                await setDoc(doc(db, 'history', currentHistoryId), {
                  results: strippedResults,
                  lastModified: serverTimestamp(),
                  sizeError: true
                }, { merge: true });
                if (loginEmail) fetchHistory(loginEmail);
                setChatNotification('Video generado, pero no se pudo guardar en el historial debido al tamaño del archivo.');
              } catch (innerErr) {
                console.error("Critical update error:", innerErr);
              }
            }
          }
        }
      } else {
        setChatNotification('No se pudo generar el video en este momento.');
      }
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

      const variantsCount = userProfile.multiVariantEnabled === false ? 1 : 3;

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
        variantsCount
      );
      setResults(res);
      const count = res.length;
      setChatNotification('¡Listo! He generado tu propuesta publicitaria de alto impacto');

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
      {/* Header */}
      <header className="h-20 md:h-24 border-b border-neon-blue/20 flex items-center px-4 md:px-8 glass-panel rounded-none relative overflow-visible shrink-0 z-[100]">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between w-full z-10">
          <div className="flex items-center gap-3 md:gap-4">
            {isLoggedIn && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 text-neon-blue hover:bg-neon-blue/10 rounded-lg transition-colors"
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
              <div className="w-20 h-20 rounded-2xl border-2 border-neon-blue bg-black mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(0,209,255,0.4)]">
                <Bot size={48} className="text-neon-blue" />
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
                Nuevos usuarios reciben 60 créditos de cortesía
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
                className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <aside className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 md:w-80 border-r border-neon-blue/20 p-6 flex flex-col gap-6 overflow-y-auto glass-panel rounded-none transition-transform duration-300 lg:relative lg:translate-x-0 shrink-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="flex items-center justify-between lg:hidden mb-4">
              <h2 className="font-orbitron text-sm font-bold text-neon-blue uppercase tracking-widest"></h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-white/40 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4 mt-4 lg:mt-0">
            {metaToken && (
              <div className="space-y-4 p-4 bg-neon-blue/5 border border-neon-blue/20 rounded-xl mb-4">
                <div className="flex items-center gap-2 text-neon-blue">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Meta Ads Conectado</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neon-blue">Cuenta de Anuncios</label>
                  <select 
                    value={selectedAdAccount}
                    onChange={(e) => setSelectedAdAccount(e.target.value)}
                    className="w-full bg-black/40 border border-neon-blue/30 rounded-lg px-3 py-1.5 focus:border-neon-blue outline-none transition-all text-[11px]"
                  >
                    {adAccounts.map(acc => (
                      <option key={acc.id} value={acc.id} className="bg-[#0A192F]">{acc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neon-blue">Página de Facebook</label>
                  <select 
                    value={selectedPage}
                    onChange={(e) => setSelectedPage(e.target.value)}
                    className="w-full bg-black/40 border border-neon-blue/30 rounded-lg px-3 py-1.5 focus:border-neon-blue outline-none transition-all text-[11px]"
                  >
                    {pages.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0A192F]">{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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
                  {isGeneratingConcept ? 'PUBLICANDO...' : 'PUBLICAR AI'}
                </button>
              </div>
              <textarea 
                value={campaign.creativeConcept}
                onChange={(e) => setCampaign({...campaign, creativeConcept: e.target.value})}
                placeholder="Ej: Minimalismo futurista, velocidad..."
                className="w-full bg-black/40 border border-neon-blue/30 rounded-lg px-4 py-2 focus:border-neon-blue outline-none transition-all text-sm h-20 resize-none"
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
                    PUBLICAR ANUNCIO
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
            <div className="grid grid-cols-2 gap-4 w-full">
              <button 
                onClick={() => setActiveHomeTab('analizar')}
                className={cn(
                  "py-4 rounded-xl font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 border shadow-[0_0_15px_rgba(0,209,255,0.1)]",
                  activeHomeTab === 'analizar' 
                    ? "bg-neon-blue text-black border-neon-blue shadow-[0_0_20px_rgba(0,209,255,0.4)]" 
                    : "bg-neon-blue/5 border-neon-blue/30 text-neon-blue/60 hover:border-neon-blue hover:text-neon-blue"
                )}
              >
                <TrendingUp size={18} />
                ANALIZAR
              </button>
              <button 
                onClick={() => setActiveHomeTab('crear')}
                className={cn(
                  "py-4 rounded-xl font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 border shadow-[0_0_15px_rgba(0,209,255,0.1)] transition-all",
                  activeHomeTab === 'crear' 
                    ? "bg-neon-blue text-black border-neon-blue shadow-[0_0_20px_rgba(0,209,255,0.4)]" 
                    : "bg-neon-blue/5 border-neon-blue/30 text-neon-blue/60 hover:border-neon-blue hover:text-neon-blue"
                )}
              >
                <Zap size={18} />
                CREAR
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
                      <TrendingUp className="text-neon-blue" /> SMART ANALYTICS
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
                            <label className="text-[10px] font-orbitron text-white/40 uppercase tracking-widest block font-medium">Grupo de Anuncios</label>
                            <select 
                              value={selectedAnalysisIds.adSetId}
                              onChange={(e) => setSelectedAnalysisIds(prev => ({ ...prev, adSetId: e.target.value }))}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white/80 focus:border-neon-blue outline-none font-orbitron"
                              disabled={!selectedAnalysisIds.campaignId}
                            >
                              <option value="">Todos los grupos</option>
                              {metaAnalysisData.adSets.map(aset => (
                                <option key={aset.id} value={aset.id}>{aset.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-orbitron text-white/40 uppercase tracking-widest block font-medium">Anuncio</label>
                            <select 
                              value={selectedAnalysisIds.adId}
                              onChange={(e) => setSelectedAnalysisIds(prev => ({ ...prev, adId: e.target.value }))}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-white/80 focus:border-neon-blue outline-none font-orbitron"
                              disabled={!selectedAnalysisIds.adSetId}
                            >
                              <option value="">Todos los anuncios</option>
                              {metaAnalysisData.ads.map(ad => (
                                <option key={ad.id} value={ad.id}>{ad.name}</option>
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
                          EJECUTAR ANÁLISIS INTELIGENTE
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

                    <div className="flex items-center gap-4 py-2">
                      <div className="h-px flex-1 bg-white/10" />
                      <span className="text-[10px] text-white/20 font-orbitron uppercase tracking-[0.3em]">O importar archivo local</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div 
                      onClick={() => csvInputRef.current?.click()}
                      className="glass-panel p-10 border-dashed border-2 border-neon-blue/30 hover:border-neon-blue/60 transition-all cursor-pointer group flex flex-col items-center justify-center text-center gap-4 bg-white/5"
                    >
                      <input type="file" accept=".csv" ref={csvInputRef} onChange={handleCsvUpload} className="hidden" />
                      <div className="w-20 h-20 rounded-full bg-neon-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,209,255,0.1)]">
                        <Upload className="text-neon-blue" size={40} />
                      </div>
                      <div>
                        <h3 className="font-orbitron text-sm font-bold tracking-wider uppercase">IMPORTAR CSV</h3>
                        <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">
                          {csvData.length > 0 ? `${csvData.length} registros cargados` : 'Analizar datos desde archivo local'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button 
                      onClick={() => setActiveHomeTab('crear')}
                      className="group flex flex-col items-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-neon-blue/50 transition-all shadow-[0_0_10px_rgba(255,255,255,0.02)]">
                        <ChevronDown className="text-white/40 group-hover:text-neon-blue transition-colors" />
                      </div>
                      <span className="text-[8px] font-orbitron text-white/20 uppercase tracking-[0.4em]">Continuar a Creación</span>
                    </button>
                  </div>

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
              ) : (
                <motion.div 
                  key="crear"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col gap-2">
                    <h2 className="font-orbitron text-base md:text-lg font-bold flex items-center gap-2">
                      {activeAssetTool !== 'campaign' && (
                        <button 
                          onClick={() => setActiveAssetTool('campaign')}
                          className="p-1 hover:bg-white/10 rounded transition-colors mr-2 text-white/40 hover:text-white"
                        >
                          <ChevronRight className="rotate-180" size={16} />
                        </button>
                      )}
                      <Zap className="text-neon-blue" /> {activeAssetTool === 'campaign' ? 'SMART STUDIO' : activeAssetTool.toUpperCase().replace('_', ' ')}
                    </h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
                      Transforma tu visión en piezas publicitarias de alto impacto con IA Neural.
                    </p>
                  </div>

                  {activeAssetTool === 'campaign' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AssetToolCard 
                        icon={<Sparkles size={20} />}
                        title="Nueva Campaña"
                        desc="Genera creatividades completas desde una referencia"
                        onClick={() => setActiveAssetTool('campaign')}
                        active={true}
                      />
                      <AssetToolCard 
                        icon={<ImageIcon size={20} />}
                        title="Crea imágenes nuevas"
                        desc="Genera visuales desde texto (Text to Image)"
                        onClick={() => setActiveAssetTool('generate_img')}
                      />
                      <AssetToolCard 
                        icon={<Package size={20} />}
                        title="Imágenes de productos"
                        desc="Optimiza y cambia fondos para tus productos"
                        onClick={() => setActiveAssetTool('product_img')}
                      />
                      <AssetToolCard 
                        icon={<Play size={20} />}
                        title="Anima imágenes"
                        desc="Convierte fotos en videos cinematográficos"
                        onClick={() => setActiveAssetTool('animate')}
                      />
                      <AssetToolCard 
                        icon={<Edit3 size={20} />}
                        title="Editar imágenes"
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

                  {activeAssetTool !== 'campaign' && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-panel p-8 border-neon-blue/20 bg-white/5 space-y-6"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div>
                          <h3 className="font-orbitron text-sm font-bold text-white uppercase tracking-wider">HERRAMIENTA IA EN DESARROLLO</h3>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Este módulo se está sintonizando con tu núcleo neural</p>
                        </div>
                        <div className="w-12 h-12 rounded-full border border-neon-blue/20 flex items-center justify-center">
                          <Cpu className="text-neon-blue animate-pulse" size={24} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10">
                        <div className="space-y-4">
                          <h4 className="font-orbitron text-xs font-bold text-neon-blue uppercase">Configuración de Generación</h4>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Instrucción (Prompt)</label>
                              <textarea 
                                placeholder="Describe el estilo, sujetos y ambiente deseado..."
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-[10px] text-white focus:border-neon-blue/50 outline-none h-24 resize-none"
                              />
                            </div>
                            <button className="w-full py-3 rounded-lg bg-neon-blue text-black font-orbitron text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,209,255,0.3)] transition-all">
                              EJECUTAR PROCESO IA
                            </button>
                          </div>
                        </div>
                        <div className="glass-panel border-dashed border border-white/10 flex items-center justify-center bg-black/20 min-h-[200px] rounded-2xl relative overflow-hidden">
                           <div className="text-center space-y-2 relative z-10">
                              <ImageIcon className="mx-auto text-white/10" size={48} />
                              <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold">El resultado aparecerá aquí</p>
                           </div>
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className={cn("grid grid-cols-1 gap-6", activeAssetTool !== 'campaign' && "hidden")}>
                    <div className="flex flex-col gap-4">
                      <div 
                        onClick={() => !isProcessing && !isStudioProcessing && fileInputRef.current?.click()}
                        className={cn(
                          "glass-panel p-10 border-dashed border-2 transition-all cursor-pointer group flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden bg-white/5",
                          (isProcessing || isStudioProcessing) ? "border-neon-blue/10" : "border-neon-blue/30 hover:border-neon-blue/60"
                        )}
                      >
                        <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleVisualUpload} className="hidden" />
                        
                        {visualPreview ? (
                          <div className="w-full h-full absolute inset-0">
                            <img src={visualPreview} className="w-full h-full object-cover opacity-40" />
                            {(isProcessing || isStudioProcessing) && <div className="laser-scan" />}
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-neon-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="text-neon-blue" size={40} />
                          </div>
                        )}
                        
                        <div className="relative z-10">
                          <h3 className="font-orbitron text-sm font-bold tracking-wider uppercase">NÚCLEO VISUAL</h3>
                          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">
                            {visualFile ? visualFile.name : 'Imagen o Video de Referencia'}
                          </p>
                        </div>
                      </div>

                      {/* Product Studio Helper */}
                      {visualPreview && !isProcessing && !visualFile?.type.includes('video') && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass-panel p-6 border-neon-blue/20 bg-neon-blue/5 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="text-neon-blue" size={18} />
                              <h4 className="font-orbitron text-xs font-bold tracking-wider text-neon-blue uppercase">PRODUCT STUDIO AI</h4>
                            </div>
                            <span className="text-[9px] font-black bg-neon-blue/20 text-neon-blue px-2 py-0.5 rounded-full uppercase tracking-widest">30 Créditos</span>
                          </div>
                          
                          <p className="text-[10px] text-white/50 uppercase tracking-widest leading-relaxed">
                            Detecta el producto, elimina el fondo y aumenta la resolución manteniendo el 100% de los detalles originales.
                          </p>

                          <button 
                            onClick={handleProductStudioRefine}
                            disabled={isStudioProcessing}
                            className="w-full py-4 rounded-xl bg-neon-blue/10 border border-neon-blue/40 text-neon-blue font-black text-[11px] uppercase tracking-[0.2em] hover:bg-neon-blue hover:text-black transition-all flex items-center justify-center gap-3 group shadow-[0_0_20px_rgba(0,209,255,0.1)]"
                          >
                            {isStudioProcessing ? <Cpu className="animate-spin" size={16} /> : <Zap className="group-hover:scale-125 transition-transform" size={16} />}
                            {isStudioProcessing ? 'SEGMENTANDO...' : 'OPTIMIZAR REFERENCIA VISUAL'}
                          </button>
                        </motion.div>
                      )}
                    </div>
                  </div>

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
                      PUBLICAR CREATIVO
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

            {/* Results Section */}
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-20 space-y-8 pb-20 border-t border-white/10 pt-20"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-white/10 pb-6">
                    <div className="flex flex-col gap-2">
                       <h2 className="font-orbitron text-lg md:text-xl font-bold flex items-center gap-2">
                        <Zap className="text-neon-blue" /> ANUNCIOS GENERADOS
                      </h2>
                      <div className="flex items-center gap-2">
                        {results.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedResultIndex(idx)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-all",
                              selectedResultIndex === idx 
                                ? "bg-neon-blue text-black shadow-[0_0_15px_rgba(0,209,255,0.4)]" 
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            OPCIÓN {idx + 1}
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
                      
                      <button 
                        onClick={() => metaToken ? setShowPublishModal(true) : setShowSettings(true)}
                        disabled={isPublishing}
                        className="flex items-center gap-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-[10px] font-bold px-4 py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(24,119,242,0.3)] disabled:opacity-50"
                      >
                        {isPublishing ? (
                          <Cpu className="animate-spin" size={14} />
                        ) : (
                          <Zap size={14} />
                        )}
                        {metaToken ? `PUBLICAR OPCIÓN ${selectedResultIndex + 1}` : "CONFIGURAR META"}
                      </button>
                    </div>
                  </div>

                  <div key={selectedResultIndex} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Visual Result */}
                    <div className="lg:col-span-1 space-y-4">
                      <div className={cn(
                        "glass-panel overflow-hidden neon-border relative group transition-all duration-500",
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
                          AI Neural Variant {selectedResultIndex + 1}
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
                              onClick={() => copyToClipboard(cap.content, cap.id)}
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
                              {cap.content.split(/[AIDA]:/i).filter(p => p.trim()).map((part, i) => {
                                const labels = ['Atracción', 'Interés', 'Deseo', 'Acción'];
                                return (
                                  <div key={i} className="space-y-1.5">
                                    <div className="px-2 py-0.5 rounded bg-neon-blue/20 self-start inline-block text-[9px] font-black text-neon-blue uppercase tracking-wider">
                                      {labels[i]}
                                    </div>
                                    <p className="text-sm text-white/80 leading-relaxed font-medium pl-1">
                                      {part.replace(/^[\s:]+/, '').trim()}
                                    </p>
                                  </div>
                                );
                              })}
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
                                      PUBLICAR VIDEO
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-neon-blue group-hover:w-full transition-all duration-500" />
                        </div>
                      ))}
                      
                      <button
                        onClick={() => metaToken ? setShowPublishModal(true) : setShowSettings(true)}
                        disabled={isPublishing}
                        className="w-full py-4 rounded-xl bg-neon-blue text-black font-black text-sm uppercase tracking-[0.25em] flex items-center justify-center gap-3 hover:bg-neon-blue/80 transition-all shadow-[0_0_25px_rgba(0,209,255,0.4)] disabled:opacity-50"
                      >
                        {isPublishing ? (
                          <Cpu className="animate-spin" size={20} />
                        ) : (
                          <Zap size={20} />
                        )}
                        {metaToken ? "PUBLICAR EN META ADS" : "CONFIGURAR CUENTA DE META"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {results.length === 0 && !isProcessing && (
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
                <div className="flex items-center gap-2 text-xs font-bold text-neon-blue">
                  CONFIGURAR <ChevronRight size={14} /> ANALIZAR <ChevronRight size={14} /> CREAR <ChevronRight size={14} /> PUBLICAR
                </div>
              </div>
            )}
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
                      {campaign.objective === 'Ventas' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-pink">ID del Píxel (Obligatorio para Ventas)</label>
                          <input 
                            type="text" 
                            value={campaign.pixelId}
                            onChange={(e) => setCampaign({...campaign, pixelId: e.target.value})}
                            placeholder="Ej: 1234567890"
                            className="w-full bg-white/5 border border-neon-pink/30 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-pink outline-none transition-all placeholder:text-white/20"
                          />
                        </div>
                      )}
                      
                      {(campaign.objective === 'Tráfico' || campaign.objective === 'Ventas') && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">URL de Destino</label>
                          <input 
                            type="url" 
                            value={campaign.destinationUrl}
                            onChange={(e) => setCampaign({...campaign, destinationUrl: e.target.value})}
                            placeholder="https://tu-tienda.com/producto"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-blue outline-none transition-all placeholder:text-white/20"
                          />
                        </div>
                      )}

                      {campaign.objective === 'WhatsApp' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-green">Número de WhatsApp (Opcional)</label>
                          <input 
                            type="tel" 
                            value={campaign.whatsappNumber}
                            onChange={(e) => setCampaign({...campaign, whatsappNumber: e.target.value})}
                            placeholder="Ej: +573101234567"
                            className="w-full bg-white/5 border border-neon-green/30 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-green outline-none transition-all placeholder:text-white/20"
                          />
                          <p className="text-[8px] text-white/40 uppercase tracking-[0.2em]">Debe estar vinculado en tu Administrador de Facebook</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Presupuesto Diario</label>
                          <input 
                            type="text" 
                            value={campaign.budget}
                            onChange={(e) => setCampaign({...campaign, budget: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-neon-blue outline-none transition-all"
                          />
                        </div>
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
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Placements & Schedule */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Canales de Distribución</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setCampaign({...campaign, facebookEnabled: !campaign.facebookEnabled})}
                            className={cn(
                              "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-wider",
                              campaign.facebookEnabled ? "bg-neon-blue/20 border-neon-blue text-neon-blue" : "bg-white/5 border-white/10 text-white/20"
                            )}
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                             Facebook
                          </button>
                          <button 
                            onClick={() => setCampaign({...campaign, instagramEnabled: !campaign.instagramEnabled})}
                            className={cn(
                              "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-wider",
                              campaign.instagramEnabled ? "bg-neon-pink/20 border-neon-pink text-neon-pink" : "bg-white/5 border-white/10 text-white/20"
                            )}
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                             Instagram
                          </button>
                        </div>
                      </div>

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
                            {results[selectedResultIndex]?.captions.aida}
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
                         <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
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
                           <div className="aspect-square bg-black overflow-hidden relative">
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
                  onClick={() => publishStep === 'config' ? setPublishStep('preview') : executePublish()}
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
                    : (publishStep === 'config' ? "SIGUIENTE: VISTA PREVIA" : "CONFIRMAR Y PUBLICAR EN VIVO")}
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
