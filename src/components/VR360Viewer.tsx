import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { injectGPanoMetadata } from '../utils/metadataInjector';
import { 
  Globe, 
  Move, 
  RotateCw, 
  Layers, 
  Maximize2, 
  Minimize2,
  Compass, 
  Sliders, 
  Type, 
  Image as ImageIcon,
  Check, 
  X,
  Plus,
  Download,
  Sparkles,
  Box,
  Camera,
  Video,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Keyboard
} from 'lucide-react';

interface VR360ViewerProps {
  backgroundImageUrl: string | null;
  elementImageUrl?: string | null;
  onClose?: () => void;
  onPublishMetaAds?: (imageUrl: string) => void;
  initialInsertType?: 'none' | 'text' | 'image' | '3d_model';
  initial3DShape?: 'cube' | 'torus' | 'pyramid' | 'torusknot' | 'sphere';
  initial3DColor?: string;
  initial3DStyle?: 'wireframe' | 'solid' | 'glowing';
}

export const VR360Viewer: React.FC<VR360ViewerProps> = ({
  backgroundImageUrl,
  elementImageUrl,
  onClose,
  onPublishMetaAds,
  initialInsertType,
  initial3DShape,
  initial3DColor,
  initial3DStyle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Local state for interactive 3D product modeled image
  const [localElementImageUrl, setLocalElementImageUrl] = useState<string | null>(elementImageUrl || null);

  // Sync with prop when changed
  useEffect(() => {
    if (elementImageUrl) {
      setLocalElementImageUrl(elementImageUrl);
    }
  }, [elementImageUrl]);
  
  // Custom states for 3D overlay controller
  const [insertType, setInsertType] = useState<'none' | 'text' | 'image' | '3d_model'>(
    initialInsertType || (elementImageUrl ? 'image' : 'none')
  );
  const [hologramText, setHologramText] = useState('SMART VR AD');
  const [textColor, setTextColor] = useState('#00d1ff');
  const [textSize, setTextSize] = useState(36);

  // States for 3D modeled elements option in 360 view
  const [selected3DShape, setSelected3DShape] = useState<'cube' | 'torus' | 'pyramid' | 'torusknot' | 'sphere'>(
    initial3DShape || 'cube'
  );
  const [model3DColor, setModel3DColor] = useState(initial3DColor || '#00d1ff');
  const [model3DStyle, setModel3DStyle] = useState<'wireframe' | 'solid' | 'glowing'>(
    initial3DStyle || 'wireframe'
  );
  const [model3DRotationSpeed, setModel3DRotationSpeed] = useState<number>(1);
  
  // Positional status
  const [elemLat, setElemLat] = useState(0);
  const [elemLon, setElemLon] = useState(0);
  const [elemDistance, setElemDistance] = useState(250);
  const [elemScale, setElemScale] = useState(3);
  
  // Export and conversion state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg'>('jpg');
  const [exportResolution, setExportResolution] = useState<'high' | 'max' | 'ultra_8k'>('ultra_8k');
  
  // Interactive variables
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'view' | 'place'>('view');

  // Full-screen and panel toggle states for optimized 360 presentation
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentFov, setCurrentFov] = useState(75);
  const [currentCoords, setCurrentCoords] = useState({ x: 0, y: 0, z: 0 });
  const [hudMode, setHudMode] = useState<'look' | 'move'>('look');

  // Synchronized physics simulation parameters
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [physicsBounciness, setPhysicsBounciness] = useState(() => {
    const val = localStorage.getItem('product_3d_physics_bounciness');
    return val ? parseFloat(val) : 0.65;
  });
  const [physicsFriction, setPhysicsFriction] = useState(() => {
    const val = localStorage.getItem('product_3d_physics_friction');
    return val ? parseFloat(val) : 0.25;
  });
  const [physicsGravity, setPhysicsGravity] = useState(1.0);

  // physics state ref to execute smooth mathematical integrations without react state re-instantiation
  const physicsStateRef = useRef({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    initialized: false,
    lastStaticPosKey: ''
  });

  // Esc keypress listener to close full screen elegantly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Three.js mutable refs to update directly on frame tick
  const paramsRef = useRef({
    lat: 0,
    lon: 180,
    fov: 75,
    posX: 0,
    posY: 0,
    posZ: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    startLon: 0,
    startLat: 0,
    elemLat: 0,
    elemLon: 0,
    elemDistance: 250,
    elemScale: 3,
    insertType: 'none',
    hologramText: 'SMART VR AD',
    textColor: '#00d1ff',
    textSize: 36,
    elementImageUrl: localElementImageUrl,
    autoRotate: true,
    showGrid: false,
    selected3DShape: 'cube',
    model3DColor: '#00d1ff',
    model3DStyle: 'wireframe',
    model3DRotationSpeed: 1,
    physicsEnabled: true,
    physicsBounciness: 0.65,
    physicsFriction: 0.25,
    physicsGravity: 1.0,
    physicsThrowTrigger: false
  });

  // Track state changes to refs so the animation loop always has fresh data
  useEffect(() => {
    paramsRef.current.elemLat = elemLat;
    paramsRef.current.elemLon = elemLon;
    paramsRef.current.elemDistance = elemDistance;
    paramsRef.current.elemScale = elemScale;
    paramsRef.current.insertType = insertType;
    paramsRef.current.hologramText = hologramText;
    paramsRef.current.textColor = textColor;
    paramsRef.current.textSize = textSize;
    paramsRef.current.elementImageUrl = localElementImageUrl;
    paramsRef.current.autoRotate = autoRotate;
    paramsRef.current.showGrid = showGrid;
    paramsRef.current.selected3DShape = selected3DShape;
    paramsRef.current.model3DColor = model3DColor;
    paramsRef.current.model3DStyle = model3DStyle;
    paramsRef.current.model3DRotationSpeed = model3DRotationSpeed;
    paramsRef.current.physicsEnabled = physicsEnabled;
    paramsRef.current.physicsBounciness = physicsBounciness;
    paramsRef.current.physicsFriction = physicsFriction;
    paramsRef.current.physicsGravity = physicsGravity;
  }, [
    elemLat, elemLon, elemDistance, elemScale, insertType, hologramText, textColor, textSize, localElementImageUrl, autoRotate, showGrid,
    selected3DShape, model3DColor, model3DStyle, model3DRotationSpeed,
    physicsEnabled, physicsBounciness, physicsFriction, physicsGravity
  ]);

  // High-fidelity camera displacement helper functions for VR headset immersion
  const moveCamera = (direction: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down', speed = 12) => {
    const state = paramsRef.current;
    
    // Convert current longitude rotation (degrees) to radians to compute direction vectors
    const theta = THREE.MathUtils.degToRad(state.lon);
    
    let dx = 0;
    let dy = 0;
    let dz = 0;

    switch (direction) {
      case 'forward':
        dx = Math.sin(theta) * speed;
        dz = Math.cos(theta) * speed;
        break;
      case 'backward':
        dx = -Math.sin(theta) * speed;
        dz = -Math.cos(theta) * speed;
        break;
      case 'left':
        dx = -Math.cos(theta) * speed;
        dz = Math.sin(theta) * speed;
        break;
      case 'right':
        dx = Math.cos(theta) * speed;
        dz = -Math.sin(theta) * speed;
        break;
      case 'up':
        dy = speed;
        break;
      case 'down':
        dy = -speed;
        break;
    }

    const nextX = (state.posX || 0) + dx;
    const nextY = (state.posY || 0) + dy;
    const nextZ = (state.posZ || 0) + dz;

    // Stay inside the 360-degree panorama sphere bounding radius (450 units)
    const distance = Math.sqrt(nextX * nextX + nextY * nextY + nextZ * nextZ);
    if (distance <= 450) {
      state.posX = nextX;
      state.posY = nextY;
      state.posZ = nextZ;
    } else {
      const factor = 450 / distance;
      state.posX = nextX * factor;
      state.posY = nextY * factor;
      state.posZ = nextZ * factor;
    }

    setCurrentCoords({
      x: Math.round(state.posX),
      y: Math.round(state.posY),
      z: Math.round(state.posZ)
    });
  };

  const handleLookUp = () => {
    paramsRef.current.lat = Math.min(85, paramsRef.current.lat + 8);
  };
  const handleLookDown = () => {
    paramsRef.current.lat = Math.max(-85, paramsRef.current.lat - 8);
  };
  const handleLookLeft = () => {
    paramsRef.current.lon -= 12;
  };
  const handleLookRight = () => {
    paramsRef.current.lon += 12;
  };
  const handleZoomIn = () => {
    const nextFov = Math.max(30, paramsRef.current.fov - 6);
    paramsRef.current.fov = nextFov;
    setCurrentFov(Math.round(nextFov));
  };
  const handleZoomOut = () => {
    const nextFov = Math.min(110, paramsRef.current.fov + 6);
    paramsRef.current.fov = nextFov;
    setCurrentFov(Math.round(nextFov));
  };
  const handleResetView = () => {
    paramsRef.current.lat = 0;
    paramsRef.current.lon = 180;
    paramsRef.current.fov = 75;
    paramsRef.current.posX = 0;
    paramsRef.current.posY = 0;
    paramsRef.current.posZ = 0;
    setCurrentFov(75);
    setCurrentCoords({ x: 0, y: 0, z: 0 });
  };

  // Export Scene to GLB (Meta Ads)
  const handleExportGLB = async () => {
    if (!sceneRef.current) return;
    setIsExporting(true);
    setExportProgress('Preparando geometría de escena 3D...');

    try {
      // 1. Temporarily hide the polar reference grid
      const grid = sceneRef.current.getObjectByName("polarGridGroup");
      const originalGridVisible = grid ? grid.visible : false;
      if (grid) {
        grid.visible = false;
      }

      setExportProgress('Compilando materiales y mapeos de textura equirrectangulares...');

      // 2. Load GLTFExporter dynamically to keep bundle load fully asynchronous
      // @ts-ignore
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
      const exporter = new GLTFExporter();

      setExportProgress('Empaquetando datos e inyectando volumenes VR...');

      exporter.parse(
        sceneRef.current,
        (gltf: any) => {
          // Restore polar grid visibility
          if (grid) {
            grid.visible = originalGridVisible;
          }

          setExportProgress('Generando archivo binario de descarga (.glb)...');
          
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          const link = document.createElement('a');
          const downloadUrl = URL.createObjectURL(blob);
          link.href = downloadUrl;
          link.download = `smart_vr_meta_ad_360_${Date.now()}.glb`;
          document.body.appendChild(link);
          link.click();
          
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          
          setIsExporting(false);
          setExportProgress('');
        },
        (error: any) => {
          console.error('Error generating GLB archive:', error);
          if (grid) {
            grid.visible = originalGridVisible;
          }
          alert('Error al exportar archivo GLB: ' + String(error));
          setIsExporting(false);
          setExportProgress('');
        },
        { 
          binary: true, 
          onlyVisible: true 
        }
      );
    } catch (err) {
      console.error('Failed to parse 3D export:', err);
      alert('Error cargando el motor de exportación tridimensional.');
      setIsExporting(false);
      setExportProgress('');
    }
  };

  // Download rendered perspective capture (Screenshot)
  const handleCapturePerspective = () => {
    if (!canvasRef.current) return;
    try {
      const link = document.createElement('a');
      link.href = canvasRef.current.toDataURL(exportFormat === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
      link.download = `smart_ads_360_perspective_${Date.now()}.${exportFormat === 'jpg' ? 'jpg' : 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error capturing WebGL perspective:', e);
    }
  };

  // Convert and download the 360 background or video asset in maximum resolution and 2:1 ratio
  const handleDownloadConvertedAsset = async () => {
    // If backgroundImageUrl is not present but localElementImageUrl is, we allow exporting on a custom clean background!
    if (!backgroundImageUrl && !localElementImageUrl) {
      alert("No hay ningún entorno ni elemento modelado para descargar. Genera un entorno 360° o un elemento modelado primero.");
      return;
    }
    const isVideo = backgroundImageUrl?.startsWith('data:video') || backgroundImageUrl?.endsWith('.mp4') || backgroundImageUrl?.includes('video');
    
    if (isVideo && backgroundImageUrl) {
      // It's a video: download the MP4 file directly with standard .mp4 extension (is H.264 compatible)
      setIsExporting(true);
      setExportProgress('Empaquetando video 360° en formato MP4 H.264 8K Seamless...');
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = backgroundImageUrl;
        link.download = `smart_ads_360_video_8k_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExporting(false);
        setExportProgress('');
      }, 500);
      return;
    }

    // It's an image: apply off-screen high-res drawing to force a perfect 2:1 aspect ratio and the user's selected JPG/PNG standard format
    setIsExporting(true);
    const targetResLabel = exportResolution === 'ultra_8k' ? '8K Ultra' : exportResolution === 'max' ? '4K Máx' : '2K Alta';
    setExportProgress(`Procesando panel de imagen 360° en relación 2:1 (Calidad ${targetResLabel})...`);
    
    try {
      let width = 7680; // 8K default
      let height = 3840;
      
      if (exportResolution === 'max') {
        width = 4096;
        height = 2048;
      } else if (exportResolution === 'high') {
        width = 2048;
        height = 1024;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("No se pudo iniciar el lienzo de renderizado de imagen.");

      // STEP 1: Load and blend the 360 background
      const loadBg = () => {
        return new Promise<void>((resolve) => {
          if (!backgroundImageUrl) {
            // Fill with professional elegant studio gradient or solid dark color to show the element cleanly
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, '#0c0d12');
            grad.addColorStop(0.5, '#07070a');
            grad.addColorStop(1, '#020204');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
            resolve();
            return;
          }

          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Draw image to completely fit the 2:1 canvas dimension (ensuring strict 2:1 aspect ratio)
            ctx.drawImage(img, 0, 0, width, height);

            // Algoritmo de Acoplamiento Invisible en Extremos (Seamless Horizontal Border Blending)
            // To ensure that the leftmost edge matches the rightmost edge perfectly when wrapping around in 3D
            try {
              const blendW = Math.round(width * 0.04); // 4% blend zone on edges
              const imgData = ctx.getImageData(0, 0, width, height);
              const data = imgData.data;

              for (let y = 0; y < height; y++) {
                const rowOffset = y * width * 4;
                for (let x = 0; x < blendW; x++) {
                  const leftIdx = rowOffset + x * 4;
                  const rightIdx = rowOffset + (width - blendW + x) * 4;

                  const alpha = x / blendW; // transition scale from 0 to 1

                  for (let c = 0; c < 3; c++) { // RGB channels
                    const leftVal = data[leftIdx + c];
                    const rightVal = data[rightIdx + c];
                    // Linearly interpolate so the seam blends flawlessly
                    const blendedVal = rightVal * (1 - alpha) + leftVal * alpha;
                    data[leftIdx + c] = blendedVal;
                    data[rightIdx + c] = blendedVal;
                  }
                }
              }
              ctx.putImageData(imgData, 0, 0);
            } catch (blendError) {
              console.warn("Could not apply mathematical seamless border blending:", blendError);
            }
            resolve();
          };
          img.onerror = () => {
            // Fallback fill to dark
            ctx.fillStyle = '#07070a';
            ctx.fillRect(0, 0, width, height);
            resolve();
          };
          img.src = backgroundImageUrl;
        });
      };

      await loadBg();

      // STEP 2: Load and overlay the modeled custom product image (elementImageUrl)
      if (localElementImageUrl) {
        setExportProgress('Incrustando y alineando tridimensionalmente tu producto modelado...');
        await new Promise<void>((resolveElement) => {
          const elemImg = new Image();
          elemImg.crossOrigin = 'anonymous';
          elemImg.onload = () => {
            // Map spherical coordinates to equirectangular 2D pixels
            // elemLon goes from -180 to 180 (X corresponds to longitude)
            // In Three.js flipped sphere scale(-1, 1, 1), coordinates are mapped as u = (180 - elemLon) / 360
            const u = (180 - elemLon) / 360; 
            // elemLat goes from -90 (South) to 90 (North)
            const v = (90 - elemLat) / 180;

            const drawX = u * width;
            const drawY = v * height;

            const aspect = elemImg.width / elemImg.height;
            // Proportional sizing: standard is elemScale % of canvas height
            const elementHeight = (elemScale / 12) * height;
            const elementWidth = elementHeight * aspect;

            // Draw element image aligned precisely to the spatial center coordinate
            const x = drawX - elementWidth / 2;
            const y = drawY - elementHeight / 2;

            ctx.drawImage(elemImg, x, y, elementWidth, elementHeight);
            resolveElement();
          };
          elemImg.onerror = (err) => {
            console.error('Error loading modeled product image for overlay rendering:', err);
            resolveElement();
          };
          elemImg.src = localElementImageUrl;
        });
      }

      // STEP 3: Save and triggers standard download workflow
      const mimeType = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const fileExtension = exportFormat === 'jpg' ? 'jpg' : 'png';
      
      let resName = '8K_ULTRA_2-1';
      if (exportResolution === 'max') resName = '4K_MAX_2-1';
      if (exportResolution === 'high') resName = '2K_HIGH_2-1';

      const filename = `smart_ads_360_panorama_${resName}_${Date.now()}.${fileExtension}`;

      try {
        canvas.toBlob((blob) => {
          if (!blob) {
            // Return fallback Base64
            const dataUrl = canvas.toDataURL(mimeType, 0.95);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsExporting(false);
            setExportProgress('');
            return;
          }

          if (exportFormat === 'jpg') {
            setExportProgress('Inyectando metadatos de proyección 360° para Meta/Facebook...');
            const reader = new FileReader();
            reader.onloadend = () => {
              try {
                const originalBuffer = reader.result as ArrayBuffer;
                const originalBytes = new Uint8Array(originalBuffer);
                const modifiedBytes = injectGPanoMetadata(originalBytes, width, height);

                const finalBlob = new Blob([modifiedBytes], { type: 'image/jpeg' });
                const downloadUrl = URL.createObjectURL(finalBlob);

                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(downloadUrl), 200);
              } catch (e) {
                console.error('Error during metadata injection:', e);
                // Fallback to normal blob
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(downloadUrl), 200);
              }
              setIsExporting(false);
              setExportProgress('');
            };
            reader.readAsArrayBuffer(blob);
          } else {
            // PNG: Direct download
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 200);
            setIsExporting(false);
            setExportProgress('');
          }
        }, mimeType, 0.95);
      } catch (blobErr) {
        console.error("toBlob conversion was unsuccessful, falling back to dataUrl:", blobErr);
        const dataUrl = canvas.toDataURL(mimeType, 0.95);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExporting(false);
        setExportProgress('');
      }

    } catch (e) {
      console.error('Canvas converter exception:', e);
      setIsExporting(false);
      setExportProgress('');
    }
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let width = containerRef.current.clientWidth || 400;
    let height = containerRef.current.clientHeight || 350;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);

    // 2. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    // 3. 360 Sphere Generation Area
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    // Invert the geometry on the x-axis so that all faces point inward
    geometry.scale(-1, 1, 1);

    const textureLoader = new THREE.TextureLoader();
    let sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x111115 });
    const sphere = new THREE.Mesh(geometry, sphereMaterial);
    scene.add(sphere);

    // Check if the background is a 360 Video
    const isVideo360 = backgroundImageUrl?.startsWith('data:video') || backgroundImageUrl?.endsWith('.mp4') || backgroundImageUrl?.includes('video');

    // Load panorama background texture live
    setLoading(true);
    if (isVideo360) {
      try {
        const video = document.createElement('video');
        video.src = backgroundImageUrl;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        video.setAttribute('webkit-playsinline', 'true');
        video.play().catch(e => console.log("Video playback deferred:", e));

        const videoTexture = new THREE.VideoTexture(video);
        videoTexture.colorSpace = THREE.SRGBColorSpace;
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.wrapS = THREE.RepeatWrapping;
        videoTexture.wrapT = THREE.ClampToEdgeWrapping;
        sphere.material = new THREE.MeshBasicMaterial({ map: videoTexture });
        setLoading(false);
      } catch (err) {
        console.error("Error creating VideoTexture:", err);
        setLoading(false);
      }
    } else if (backgroundImageUrl) {
      textureLoader.load(
        backgroundImageUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;
          sphere.material = new THREE.MeshBasicMaterial({ map: texture });
          setLoading(false);
        },
        undefined,
        (err) => {
          console.error("Error loading VR Background Panorama:", err);
          setLoading(false);
        }
      );
    } else {
      sphere.material = new THREE.MeshBasicMaterial({ color: 0x07070a, side: THREE.BackSide });
      setLoading(false);
    }

    // 4. VR Reference Grid Helpers (Polar Coordinate System)
    const gridGroup = new THREE.Group();
    gridGroup.name = "polarGridGroup";
    const polarHelper = new THREE.GridHelper(1000, 20, 0x00d1ff, 0x1a2c3d);
    polarHelper.position.y = -150;
    gridGroup.add(polarHelper);
    scene.add(gridGroup);

    // 5. Dynamic 3D Inserted Billboard Logic
    let elementMesh: THREE.Mesh | null = null;
    const elementMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Helper canvas to generate clean labels dynamically
    const createTextTexture = (text: string, color: string, size: number) => {
      const textCanvas = document.createElement('canvas');
      textCanvas.width = 512;
      textCanvas.height = 128;
      const ctx = textCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 512, 128);
        
        // Hologram visual backplane
        ctx.fillStyle = 'rgba(0, 10, 20, 0.7)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.roundRect(10, 10, 492, 108, 15);
        ctx.fill();
        ctx.stroke();

        ctx.font = `bold ${size}px 'Orbitron', 'Inter', sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillText(text, 256, 64);
      }
      const tex = new THREE.CanvasTexture(textCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    // Add light sources for real 3D models (MeshStandardMaterial to render with depth/shading)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(150, 250, 150);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00d1ff, 0.4);
    dirLight2.position.set(-150, -250, -150);
    scene.add(dirLight2);

    // Create a physical billboard plane
    const planeGeom = new THREE.PlaneGeometry(100, 100);
    elementMesh = new THREE.Mesh(planeGeom, elementMaterial);
    scene.add(elementMesh);

    // Dynamic 3D model container
    const model3DGroup = new THREE.Group();
    scene.add(model3DGroup);

    let current3DShape = '';
    let current3DColor = '';
    let current3DStyle = '';
    let currentElementImageUrl = '';

    let activeLoadedTexture: THREE.Texture | null = null;

    // Local loop animation controls
    let animationFrameId: number;

    const updateControls = () => {
      const state = paramsRef.current;

      // Apply real-time perspective zoom adjustments (FOV mapping)
      if (camera.fov !== state.fov) {
        camera.fov = state.fov;
        camera.updateProjectionMatrix();
      }

      // Handle Autopilot panorama scanning rotation
      if (state.autoRotate && !state.isDragging) {
        state.lon += 0.08;
      }

      // Look direction math mapping spherical -> cartesian vector targets
      state.lat = Math.max(-85, Math.min(85, state.lat));
      const phi = THREE.MathUtils.degToRad(90 - state.lat);
      const theta = THREE.MathUtils.degToRad(state.lon);

      const target = new THREE.Vector3();
      target.x = Math.sin(phi) * Math.sin(theta);
      target.y = Math.cos(phi);
      target.z = Math.sin(phi) * Math.cos(theta);

      // Update camera spatial position from the displacement coordinates
      camera.position.set(state.posX || 0, state.posY || 0, state.posZ || 0);

      // Point the camera look direction outwards relative to its translation offset
      camera.lookAt(camera.position.x + target.x, camera.position.y + target.y, camera.position.z + target.z);

      // Render 3D Helper grid when enabled
      gridGroup.visible = state.showGrid;

      // Dynamic object insertion management
      if (state.insertType === 'none') {
        if (elementMesh) elementMesh.visible = false;
        if (model3DGroup) model3DGroup.visible = false;
      } else if (state.insertType === '3d_model') {
        if (elementMesh) elementMesh.visible = false;
        if (model3DGroup) {
          model3DGroup.visible = true;

          // Compute static coordinate vectors from slider managers
          const radLat = THREE.MathUtils.degToRad(state.elemLat);
          const radLon = THREE.MathUtils.degToRad(state.elemLon);
          const staticX = state.elemDistance * Math.cos(radLat) * Math.sin(radLon);
          const staticY = state.elemDistance * Math.sin(radLat);
          const staticZ = state.elemDistance * Math.cos(radLat) * Math.cos(radLon);
          const currentStaticKey = `${state.elemDistance},${state.elemLat},${state.elemLon}`;

          if (state.physicsEnabled) {
            // If the user has just adjusted sliders, or if not yet initialized, sync positions to match sliders!
            if (physicsStateRef.current.lastStaticPosKey !== currentStaticKey || !physicsStateRef.current.initialized) {
              physicsStateRef.current.x = staticX;
              physicsStateRef.current.y = staticY;
              physicsStateRef.current.z = staticZ;
              physicsStateRef.current.vx = 0;
              physicsStateRef.current.vy = 0;
              physicsStateRef.current.vz = 0;
              physicsStateRef.current.initialized = true;
              physicsStateRef.current.lastStaticPosKey = currentStaticKey;
            }

            // Apply push/throw impulse if trigger activated
            if (state.physicsThrowTrigger) {
              physicsStateRef.current.vx = (Math.random() - 0.5) * 12;
              physicsStateRef.current.vy = 8 + Math.random() * 8;
              physicsStateRef.current.vz = (Math.random() - 0.5) * 12;
              state.physicsThrowTrigger = false; // Reset trigger
            }

            // Euler integration
            physicsStateRef.current.vy -= 0.18 * state.physicsGravity; // Apply gravity force
            physicsStateRef.current.x += physicsStateRef.current.vx;
            physicsStateRef.current.y += physicsStateRef.current.vy;
            physicsStateRef.current.z += physicsStateRef.current.vz;

            // 1. Flat ground limit simulation collision (at dome bottom e.g. y = -110)
            const floorLimit = -110;
            if (physicsStateRef.current.y <= floorLimit) {
              physicsStateRef.current.y = floorLimit;
              // Bounce proportional to bounciness coefficient
              physicsStateRef.current.vy = -physicsStateRef.current.vy * state.physicsBounciness;
              
              // Slide resistances proportional to friction coefficient
              physicsStateRef.current.vx *= (1 - state.physicsFriction * 0.4);
              physicsStateRef.current.vz *= (1 - state.physicsFriction * 0.4);

              // Stabilize microscopic bounces
              if (Math.abs(physicsStateRef.current.vy) < 0.15) {
                physicsStateRef.current.vy = 0;
              }
            }

            // 2. Spherical Dome boundaries boundary collision
            const currentRadius = Math.sqrt(
              physicsStateRef.current.x * physicsStateRef.current.x +
              physicsStateRef.current.y * physicsStateRef.current.y +
              physicsStateRef.current.z * physicsStateRef.current.z
            );
            const domeMaxRadius = state.elemDistance;
            if (currentRadius >= domeMaxRadius && currentRadius > 0) {
              // Normalized inverse normal vector (pointing back inwards)
              const normX = -physicsStateRef.current.x / currentRadius;
              const normY = -physicsStateRef.current.y / currentRadius;
              const normZ = -physicsStateRef.current.z / currentRadius;

              const dot = physicsStateRef.current.vx * normX + physicsStateRef.current.vy * normY + physicsStateRef.current.vz * normZ;
              if (dot < 0) { // moving outwards
                physicsStateRef.current.vx = (physicsStateRef.current.vx - 2 * dot * normX) * state.physicsBounciness;
                physicsStateRef.current.vy = (physicsStateRef.current.vy - 2 * dot * normY) * state.physicsBounciness;
                physicsStateRef.current.vz = (physicsStateRef.current.vz - 2 * dot * normZ) * state.physicsBounciness;
              }

              // Pull back inside boundaries
              physicsStateRef.current.x = normX * -domeMaxRadius * 0.99;
              physicsStateRef.current.y = normY * -domeMaxRadius * 0.99;
              physicsStateRef.current.z = normZ * -domeMaxRadius * 0.99;
            }

            // Set mesh coordinate position
            model3DGroup.position.set(
              physicsStateRef.current.x,
              physicsStateRef.current.y,
              physicsStateRef.current.z
            );

            // Friction dampener for object rotators when laying motionless on floor
            if (physicsStateRef.current.y === floorLimit && Math.abs(physicsStateRef.current.vx) < 0.2 && Math.abs(physicsStateRef.current.vz) < 0.2) {
              model3DGroup.rotation.x += 0.001;
              model3DGroup.rotation.y += 0.002;
            } else {
              model3DGroup.rotation.x += 0.005 * state.model3DRotationSpeed;
              model3DGroup.rotation.y += 0.01 * state.model3DRotationSpeed;
            }
          } else {
            // Physics disabled: static coordinate positioning from elements coordinates
            physicsStateRef.current.x = staticX;
            physicsStateRef.current.y = staticY;
            physicsStateRef.current.z = staticZ;
            physicsStateRef.current.vx = 0;
            physicsStateRef.current.vy = 0;
            physicsStateRef.current.vz = 0;
            physicsStateRef.current.initialized = true;
            physicsStateRef.current.lastStaticPosKey = currentStaticKey;

            model3DGroup.position.set(staticX, staticY, staticZ);
            
            model3DGroup.rotation.x += 0.005 * state.model3DRotationSpeed;
            model3DGroup.rotation.y += 0.01 * state.model3DRotationSpeed;
          }

          // Scale
          const baseScale = state.elemScale * 0.9;
          model3DGroup.scale.set(baseScale, baseScale, baseScale);

          // Check if properties changed to rebuild the shape/finish/material options
          if (
            current3DShape !== state.selected3DShape || 
            current3DColor !== state.model3DColor || 
            current3DStyle !== state.model3DStyle ||
            currentElementImageUrl !== (state.elementImageUrl || '')
          ) {
            
            // Clean up previous children, geometries, and materials safely to avoid memory leaks
            while (model3DGroup.children.length > 0) {
              const obj = model3DGroup.children[0];
              if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                  obj.material.forEach((m) => m.dispose());
                } else {
                  obj.material.dispose();
                }
              }
              model3DGroup.remove(obj);
            }

            const isCustomProduct = !!state.elementImageUrl;
            let geometry: THREE.BufferGeometry;

            if (isCustomProduct) {
              // Create a realistic volumetric standee / prism slab for our modeled product
              geometry = new THREE.BoxGeometry(24, 36, 4);
            } else {
              // Create geometry based on shape selection
              switch (state.selected3DShape) {
                case 'cube':
                  geometry = new THREE.BoxGeometry(32, 32, 32);
                  break;
                case 'torus':
                  geometry = new THREE.TorusGeometry(18, 5, 16, 100);
                  break;
                case 'pyramid':
                  geometry = new THREE.ConeGeometry(20, 36, 4);
                  break;
                case 'torusknot':
                  geometry = new THREE.TorusKnotGeometry(12, 4.5, 120, 16);
                  break;
                case 'sphere':
                default:
                  geometry = new THREE.IcosahedronGeometry(20, 1);
                  break;
              }
            }

            const colorHex = parseInt(state.model3DColor.replace('#', '0x'));

            const assembleMesh = (texture: THREE.Texture | null, width?: number, height?: number) => {
              // Remove anything existing to avoid duplicates during async loads
              while (model3DGroup.children.length > 0) {
                const o = model3DGroup.children[0];
                if (o instanceof THREE.Mesh) {
                  o.geometry.dispose();
                  if (Array.isArray(o.material)) {
                    o.material.forEach((m) => m.dispose());
                  } else {
                    o.material.dispose();
                  }
                }
                model3DGroup.remove(o);
              }

              const isCustom = !!texture && isCustomProduct;
              if (isCustom) {
                // Determine layout shapes and geometries on-the-fly from localStorage!
                const customVolumeType = localStorage.getItem('product_3d_volume_type') || 'extruded';
                const customMetallic = parseFloat(localStorage.getItem('product_3d_metallic') || '0.75');
                const customRoughness = parseFloat(localStorage.getItem('product_3d_roughness') || '0.15');
                const customAccentColor = localStorage.getItem('product_3d_accent_color') || '#00d1ff';
                const customMeshThickness = parseFloat(localStorage.getItem('product_3d_mesh_thickness') || '4');
                const customColorHex = parseInt(customAccentColor.replace('#', '0x'));

                const texturedMaterial = new THREE.MeshStandardMaterial({
                  map: texture,
                  metalness: customMetallic,
                  roughness: customRoughness,
                  transparent: true,
                  alphaTest: 0.1,
                  side: THREE.DoubleSide
                });

                const frameMaterial = new THREE.MeshStandardMaterial({
                  color: customColorHex,
                  metalness: 0.9,
                  roughness: 0.15,
                  side: THREE.DoubleSide
                });

                const w = width || 24;
                const h = height || 36;

                if (customVolumeType === 'extruded') {
                  const depth = customMeshThickness + 4;
                  const geo = new THREE.BoxGeometry(w, h, depth);
                  const faceMats = [
                    texturedMaterial, // Right
                    texturedMaterial, // Left
                    texturedMaterial, // Top
                    texturedMaterial, // Bottom
                    texturedMaterial, // Front
                    texturedMaterial  // Back
                  ];
                  const mesh = new THREE.Mesh(geo, faceMats);
                  model3DGroup.add(mesh);
                } else if (customVolumeType === 'card_pbr') {
                  const geo = new THREE.PlaneGeometry(w, h);
                  const frontMesh = new THREE.Mesh(geo, texturedMaterial);
                  model3DGroup.add(frontMesh);

                  const backGeo = new THREE.PlaneGeometry(w, h);
                  const backMesh = new THREE.Mesh(backGeo, texturedMaterial);
                  backMesh.rotation.y = Math.PI;
                  backMesh.position.z = -0.1;
                  model3DGroup.add(backMesh);

                  const outlineGeo = new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.2);
                  const outlineMesh = new THREE.Mesh(outlineGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
                  model3DGroup.add(outlineMesh);
                } else if (customVolumeType === 'cylinder') {
                  const geo = new THREE.CylinderGeometry(w / 2.2, w / 2.2, h, 48, 1, false);
                  const cylMats = [
                    texturedMaterial, // Side
                    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 }), // Top cap
                    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 })  // Bottom cap
                  ];
                  const mesh = new THREE.Mesh(geo, cylMats);
                  model3DGroup.add(mesh);
                } else {
                  // hologram
                  const sphereGeo = new THREE.SphereGeometry(w / 2, 32, 32);
                  const hologramMat = new THREE.MeshStandardMaterial({
                    map: texture,
                    metalness: 0.1,
                    roughness: 0.9,
                    transparent: true,
                    opacity: 0.8,
                    color: customColorHex
                  });
                  const innerMesh = new THREE.Mesh(sphereGeo, hologramMat);
                  model3DGroup.add(innerMesh);

                  const ringGeo = new THREE.TorusGeometry(w * 0.7, 1.2, 8, 48);
                  const ringMesh = new THREE.Mesh(ringGeo, frameMaterial);
                  ringMesh.rotation.x = Math.PI / 3;
                  model3DGroup.add(ringMesh);

                  const holderGeo = new THREE.PlaneGeometry(w, h);
                  const holderMesh = new THREE.Mesh(holderGeo, texturedMaterial);
                  holderMesh.position.z = 1;
                  model3DGroup.add(holderMesh);
                }
              } else {
                if (state.model3DStyle === 'wireframe') {
                  const material = new THREE.MeshBasicMaterial({
                    color: texture ? 0xffffff : colorHex,
                    map: texture,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide
                  });
                  const mesh = new THREE.Mesh(geometry, material);
                  model3DGroup.add(mesh);
                } else if (state.model3DStyle === 'glowing') {
                  // Neon Glow styling: combo semi-transparent solid inner body + glowing wireframe outline
                  const solidMaterial = new THREE.MeshBasicMaterial({
                    color: texture ? 0xffffff : colorHex,
                    map: texture,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide,
                    depthWrite: true
                  });
                  const solidMesh = new THREE.Mesh(geometry, solidMaterial);
                  model3DGroup.add(solidMesh);

                  const wireMaterial = new THREE.MeshBasicMaterial({
                    color: colorHex,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                  });
                  const wireMesh = new THREE.Mesh(geometry, wireMaterial);
                  model3DGroup.add(wireMesh);
                } else {
                  // premium metallic/shaded styling (standard material with real roughness/metalness reflection mappings)
                  const material = new THREE.MeshStandardMaterial({
                    color: texture ? 0xffffff : colorHex,
                    map: texture,
                    roughness: 0.2,
                    metalness: 0.75,
                    transparent: true,
                    opacity: 0.95,
                    side: THREE.DoubleSide
                  });
                  const mesh = new THREE.Mesh(geometry, material);
                  model3DGroup.add(mesh);
                }
              }
            };

            if (isCustomProduct && state.elementImageUrl) {
              textureLoader.load(state.elementImageUrl, (loadedTex) => {
                loadedTex.colorSpace = THREE.SRGBColorSpace;
                
                // Read image natural width and height or default to 400x400
                const imgWidth = loadedTex.image?.width || 400;
                const imgHeight = loadedTex.image?.height || 400;
                const aspect = imgWidth / imgHeight;
                
                let width = 24;
                let height = 36;
                if (aspect > 1) {
                  width = 36;
                  height = width / aspect;
                } else {
                  height = 36;
                  width = height * aspect;
                }
                
                assembleMesh(loadedTex, width, height);
              });
            } else {
              assembleMesh(null, 32, 32);
            }

            // Sync trackers
            current3DShape = state.selected3DShape;
            current3DColor = state.model3DColor;
            current3DStyle = state.model3DStyle;
            currentElementImageUrl = state.elementImageUrl || '';
          }
        }
      } else {
        if (model3DGroup) model3DGroup.visible = false;
        if (elementMesh) {
          elementMesh.visible = true;

          // Compute exact target position inside the sphere (Spherical coordinates)
          const radLat = THREE.MathUtils.degToRad(state.elemLat);
          const radLon = THREE.MathUtils.degToRad(state.elemLon);
          
          elementMesh.position.x = state.elemDistance * Math.cos(radLat) * Math.sin(radLon);
          elementMesh.position.y = state.elemDistance * Math.sin(radLat);
          elementMesh.position.z = state.elemDistance * Math.cos(radLat) * Math.cos(radLon);

          // Force the billboard to billboard (look back at the lens)
          elementMesh.lookAt(camera.position);

          // Dynamic scale
          const baseScale = state.elemScale * 10;
          elementMesh.scale.set(baseScale * 1.6, baseScale, 1);

          // Re-generate texture if the type changed
          if (state.insertType === 'text') {
            const textTex = createTextTexture(state.hologramText, state.textColor, state.textSize);
            elementMaterial.map = textTex;
            elementMaterial.needsUpdate = true;
          } else if (state.insertType === 'image' && state.elementImageUrl) {
            // Load file cutout / product preview
            if (!activeLoadedTexture || activeLoadedTexture.name !== state.elementImageUrl) {
              textureLoader.load(state.elementImageUrl, (imgTex) => {
                imgTex.colorSpace = THREE.SRGBColorSpace;
                imgTex.name = state.elementImageUrl!;
                elementMaterial.map = imgTex;
                elementMaterial.needsUpdate = true;
                activeLoadedTexture = imgTex;
              });
            }
          }
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(updateControls);
    };

    animationFrameId = requestAnimationFrame(updateControls);

    // 6. Interactive Cursor dragging listeners
    const onPointerDown = (e: PointerEvent) => {
      paramsRef.current.isDragging = true;
      paramsRef.current.startX = e.clientX;
      paramsRef.current.startY = e.clientY;
      paramsRef.current.startLon = paramsRef.current.lon;
      paramsRef.current.startLat = paramsRef.current.lat;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!paramsRef.current.isDragging) return;
      const dx = e.clientX - paramsRef.current.startX;
      const dy = e.clientY - paramsRef.current.startY;
      
      // Sensitivity factor
      paramsRef.current.lon = paramsRef.current.startLon - dx * 0.15;
      paramsRef.current.lat = paramsRef.current.startLat + dy * 0.15;
    };

    const onPointerUp = () => {
      paramsRef.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const current_fov = paramsRef.current.fov;
      const next_fov = Math.max(30, Math.min(110, current_fov + e.deltaY * 0.05));
      paramsRef.current.fov = next_fov;
      setCurrentFov(Math.round(next_fov));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') {
        return;
      }
      const step = 4; // degrees per press for rotation
      const moveSpeed = 15; // units per press for spatial translation
      let handled = false;
      
      switch (e.key) {
        // --- TRANSLATION MOVEMENT (WALK/STRAFE) ---
        case 'w':
        case 'W':
          moveCamera('forward', moveSpeed);
          handled = true;
          break;
        case 's':
        case 'S':
          moveCamera('backward', moveSpeed);
          handled = true;
          break;
        case 'a':
        case 'A':
          moveCamera('left', moveSpeed);
          handled = true;
          break;
        case 'd':
        case 'D':
          moveCamera('right', moveSpeed);
          handled = true;
          break;
        case 'q':
        case 'Q':
          moveCamera('down', moveSpeed - 5);
          handled = true;
          break;
        case 'e':
        case 'E':
          moveCamera('up', moveSpeed - 5);
          handled = true;
          break;

        // --- CAMERA ROTATION (LOOK AROUND) ---
        case 'ArrowUp':
          paramsRef.current.lat = Math.min(85, paramsRef.current.lat + step);
          handled = true;
          break;
        case 'ArrowDown':
          paramsRef.current.lat = Math.max(-85, paramsRef.current.lat - step);
          handled = true;
          break;
        case 'ArrowLeft':
          paramsRef.current.lon -= step;
          handled = true;
          break;
        case 'ArrowRight':
          paramsRef.current.lon += step;
          handled = true;
          break;
        case '+':
        case '=':
          const plusFov = Math.max(30, paramsRef.current.fov - 4);
          paramsRef.current.fov = plusFov;
          setCurrentFov(Math.round(plusFov));
          handled = true;
          break;
        case '-':
        case '_':
          const minusFov = Math.min(110, paramsRef.current.fov + 4);
          paramsRef.current.fov = minusFov;
          setCurrentFov(Math.round(minusFov));
          handled = true;
          break;
        case 'r':
        case 'R':
          paramsRef.current.lat = 0;
          paramsRef.current.lon = 180;
          paramsRef.current.fov = 75;
          paramsRef.current.posX = 0;
          paramsRef.current.posY = 0;
          paramsRef.current.posZ = 0;
          setCurrentFov(75);
          setCurrentCoords({ x: 0, y: 0, z: 0 });
          handled = true;
          break;
      }
      if (handled) {
        e.preventDefault();
      }
    };

    const canvasEl = canvasRef.current;
    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    // 7. Observer Resize logic
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);

    // Cleanup Resources
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      
      // Clear 3D models from the group and dispose of geometries/materials safely to avoid memory leak
      while (model3DGroup.children.length > 0) {
        const obj = model3DGroup.children[0];
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
        model3DGroup.remove(obj);
      }

      geometry.dispose();
      sphereMaterial.dispose();
      planeGeom.dispose();
      elementMaterial.dispose();
      renderer.dispose();
    };
  }, [backgroundImageUrl]);

  return (
    <div className={`flex flex-col overflow-hidden transition-all duration-300 ${
      isFullScreen 
        ? 'fixed inset-0 z-[9999] w-screen h-screen bg-black' 
        : 'relative w-full h-full min-h-[500px] bg-black/60 rounded-2xl border border-white/10'
    }`}>
      
      {/* 1. Dashboard Sub-Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-white/5 gap-3 bg-neutral-900/40 backdrop-blur-md`}>
        <div className="flex items-center gap-2">
          <Globe className="text-neon-blue animate-pulse" size={16} />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">Simulador VR Inmersivo 360°</h4>
              {isFullScreen && (
                <span className="py-0.5 px-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono text-[8px] font-bold uppercase rounded-lg">
                  Modo Inmersivo Completo
                </span>
              )}
            </div>
            <p className="text-[8px] text-white/40 uppercase tracking-widest">Arrastra o desliza para explorar el espacio tridimensional</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {/* Sidebar Toggle View */}
          <button 
            type="button"
            onClick={() => {
              setShowSidebar(!showSidebar);
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 100);
            }}
            className={`p-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all ${
              showSidebar ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-white/10 text-white/50 hover:text-white'
            }`}
            title={showSidebar ? "Ocultar panel lateral de edición" : "Mostrar panel lateral de edición"}
          >
            <Layers size={10} /> {showSidebar ? "Ocultar Controles" : "Controles"}
          </button>

          <button 
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all ${
              autoRotate ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <RotateCw size={10} className={autoRotate ? "animate-spin" : ""} /> Giro
          </button>
          
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all ${
              showGrid ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Compass size={10} /> Cuadrícula
          </button>

          {/* Full Screen Toggle button */}
          <button 
            type="button"
            onClick={() => {
              setIsFullScreen(!isFullScreen);
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 100);
            }}
            className={`p-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all ${
              isFullScreen ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-white/10 text-white/70 hover:text-white bg-white/5'
            }`}
          >
            {isFullScreen ? (
              <>
                <Minimize2 size={10} /> Vista Normal
              </>
            ) : (
              <>
                <Maximize2 size={10} /> Pantalla Completa
              </>
            )}
          </button>
          
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 px-2.5 text-[10px] border border-white/10 rounded bg-red-500/10 text-red-400 hover:bg-red-500/25 uppercase font-bold tracking-widest transition-all"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

      <div className={`flex-1 relative min-h-0 ${showSidebar ? 'grid grid-cols-1 lg:grid-cols-3' : 'flex'}`}>
        
        {/* 2. Interactive 3D Canvas rendering container */}
        <div 
          ref={containerRef} 
          className={`relative bg-neutral-950 select-none flex items-center justify-center transition-all duration-300 ${
            showSidebar ? 'lg:col-span-2 flex-1 h-full min-h-[350px]' : 'w-full h-full flex-1'
          }`}
        >
          <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing outline-none" />
          
          {loading && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin" />
              <p className="text-[10px] text-neon-blue font-bold tracking-widest uppercase animate-pulse">Cargando Metaverso VR...</p>
            </div>
          )}

          {/* Canvas Bottom Instructions */}
          <div className="absolute bottom-4 left-4 bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 pointer-events-none flex items-center gap-2 backdrop-blur-md shadow-2xl z-20">
            <Move size={12} className="text-neon-blue animate-bounce" />
            <span className="text-[8px] text-white/80 font-mono tracking-widest uppercase">Arrastra o usa controles para explorar 360°</span>
          </div>

          {/* Scientific Immersive HUD VR Navigation Controls */}
          <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2 text-white max-w-[190px] sm:max-w-[210px]">
            {/* HUD Glass Box */}
            <div className="bg-black/90 border border-white/10 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.85)] w-full flex flex-col gap-2.5 transition-all duration-300 hover:border-neon-blue/40 hover:shadow-[0_8px_32px_rgba(0,195,255,0.15)] select-none">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1">
                  <Compass size={11} className="text-neon-blue animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="text-[8px] sm:text-[9.5px] font-orbitron font-extrabold tracking-widest text-[#00d1ff] uppercase">Navegación VR</span>
                </div>
                <div className="relative group/key font-mono text-[7.5px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/40 flex items-center gap-1 cursor-help hover:text-white transition-all">
                  <Keyboard size={9} />
                  <span>Teclas</span>
                  {/* Tooltip */}
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2.5 bg-neutral-950 border border-white/15 rounded-lg text-[8px] text-white/80 leading-relaxed font-sans normal-case pointer-events-none opacity-0 invisible group-hover/key:opacity-100 group-hover/key:visible transition-all z-30 shadow-2xl">
                    <p className="font-bold text-neon-blue mb-1 uppercase tracking-wider">Controles de Teclado:</p>
                    <ul className="space-y-1 list-none font-mono text-[7.5px]">
                      <li><b className="text-white">WASD</b> : Caminar y Desplazarse</li>
                      <li><b className="text-white">Q / E</b> : Descender / Ascender</li>
                      <li><b className="text-white">↑↓←→</b> : Rotar Cámara 360°</li>
                      <li><b className="text-white">R</b> : Restablecer Posición y Vista</li>
                      <li><b className="text-white">+ / -</b> : Ajustar Zoom (Lente)</li>
                      <li><b className="text-white">Rueda Scroll</b> : Zoom Continuo</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* HUD Mode Tabs Toggle */}
              <div className="grid grid-cols-2 gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => setHudMode('look')}
                  className={`py-1 text-[7.5px] font-extrabold uppercase rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    hudMode === 'look'
                      ? 'bg-neon-blue/25 text-neon-blue border border-neon-blue/25 shadow-[0_0_8px_rgba(0,209,255,0.1)]'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  <RotateCcw size={9} />
                  <span>Mirar 🔄</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHudMode('move')}
                  className={`py-1 text-[7.5px] font-extrabold uppercase rounded transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    hudMode === 'move'
                      ? 'bg-neon-blue/25 text-neon-blue border border-neon-blue/25 shadow-[0_0_8px_rgba(0,209,255,0.1)]'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  <Move size={9} />
                  <span>Mover 🚶</span>
                </button>
              </div>

              {hudMode === 'look' ? (
                <>
                  {/* Directional Pad (D-pad) Look controls */}
                  <div className="flex justify-center py-0.5">
                    <div className="relative w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] rounded-full bg-neutral-950/60 border border-white/10 shadow-inner flex items-center justify-center">
                      {/* Inner ring helper */}
                      <div className="absolute w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] rounded-full border border-white/5 pointer-events-none" />

                      {/* UP BUTTON */}
                      <button
                        type="button"
                        onClick={handleLookUp}
                        className="absolute top-1 left-1/2 -translate-x-1/2 w-7 h-6 rounded-t-full flex items-center justify-center text-white/55 hover:text-neon-blue hover:bg-white/5 transition-all outline-none cursor-pointer"
                        title="Mirar Arriba (Teclado: ↑)"
                      >
                        <ChevronUp size={14} className="transition-transform hover:-translate-y-0.5" />
                      </button>

                      {/* LEFT BUTTON */}
                      <button
                        type="button"
                        onClick={handleLookLeft}
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-7 rounded-l-full flex items-center justify-center text-white/55 hover:text-neon-blue hover:bg-white/5 transition-all outline-none cursor-pointer"
                        title="Girar Izquierda (Teclado: ←)"
                      >
                        <ChevronLeft size={14} className="transition-transform hover:-translate-x-0.5" />
                      </button>

                      {/* RIGHT BUTTON */}
                      <button
                        type="button"
                        onClick={handleLookRight}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-7 rounded-r-full flex items-center justify-center text-white/55 hover:text-neon-blue hover:bg-white/5 transition-all outline-none cursor-pointer"
                        title="Girar Derecha (Teclado: →)"
                      >
                        <ChevronRight size={14} className="transition-transform hover:translate-x-0.5" />
                      </button>

                      {/* DOWN BUTTON */}
                      <button
                        type="button"
                        onClick={handleLookDown}
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-7 h-6 rounded-b-full flex items-center justify-center text-white/55 hover:text-neon-blue hover:bg-white/5 transition-all outline-none cursor-pointer"
                        title="Mirar Abajo (Teclado: ↓)"
                      >
                        <ChevronDown size={14} className="transition-transform hover:translate-y-0.5" />
                      </button>

                      {/* RESET CENTRAL BUTTON */}
                      <button
                        type="button"
                        onClick={handleResetView}
                        className="z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-900 border border-white/15 flex flex-col items-center justify-center text-white/60 hover:text-neon-blue hover:scale-110 active:scale-95 transition-all shadow-md outline-none hover:border-neon-blue/50 cursor-pointer"
                        title="Recentrar Vista & Reseteo General (R)"
                      >
                        <RotateCcw size={10} />
                        <span className="text-[5.5px] sm:text-[6px] font-bold uppercase tracking-widest mt-0.5">Reset</span>
                      </button>
                    </div>
                  </div>

                  {/* Zoom & Expansion control */}
                  <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[7.5px] text-white/40 uppercase tracking-widest font-bold">Zoom Lente:</span>
                      <span className="text-[8px] sm:text-[8.5px] font-mono text-neon-blue font-black tracking-wide">
                        {currentFov}° <b className="text-white/40 font-normal">({(75 / currentFov).toFixed(1)}x)</b>
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-1.5 bg-neutral-950 p-1 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={handleZoomOut}
                        disabled={currentFov >= 110}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/55 hover:text-white disabled:opacity-20 transition-all outline-none cursor-pointer"
                        title="Ventanear / Alejar (-)"
                      >
                        <ZoomOut size={11} />
                      </button>
                      
                      {/* Visual tracker scrollbar */}
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative">
                        <div 
                          className="absolute top-0 bottom-0 bg-neon-blue left-0 rounded-full transition-all duration-300" 
                          style={{ width: `${((110 - currentFov) / 80) * 100}%` }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleZoomIn}
                        disabled={currentFov <= 30}
                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/55 hover:text-white disabled:opacity-20 transition-all outline-none cursor-pointer"
                        title="Focalizar / Acercar (+)"
                      >
                        <ZoomIn size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Autopilot quick navigation */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-1.5 text-[7.5px]">
                    <span className="text-white/40 uppercase font-bold tracking-widest">Giro Continuo:</span>
                    <button
                      type="button"
                      onClick={() => setAutoRotate(!autoRotate)}
                      className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
                        autoRotate 
                          ? 'border-neon-blue bg-neon-blue/15 text-neon-blue shadow-[0_0_8px_rgba(0,209,255,0.08)]' 
                          : 'border-white/10 text-white/40 hover:text-white bg-black/20'
                      }`}
                    >
                      {autoRotate ? 'ESCANEANDO' : 'DETENIDO'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Directional Pad Walk controls */}
                  <div className="flex justify-center py-0.5">
                    <div className="relative w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] rounded-full bg-neutral-950/60 border border-white/10 shadow-inner flex items-center justify-center">
                      <div className="absolute w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] rounded-full border border-white/5 pointer-events-none" />

                      {/* UP BUTTON (Walk Forward) */}
                      <button
                        type="button"
                        onClick={() => moveCamera('forward', 25)}
                        className="absolute top-1 left-1/2 -translate-x-1/2 w-7 h-6 rounded-t-full flex items-center justify-center text-white/55 hover:text-[#00ffd1] hover:bg-white/5 transition-all outline-none cursor-pointer"
                        title="Caminar Adelante (W)"
                      >
                        <ChevronUp size={14} className="transition-transform hover:-translate-y-0.5 text-[#00ffd1]" />
                      </button>

                      {/* LEFT BUTTON (Strafe Left) */}
                      <button
                        type="button"
                        onClick={() => moveCamera('left', 25)}
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-7 rounded-l-full flex items-center justify-center text-white/55 hover:text-[#00ffd1] hover:bg-white/5 transition-all outline-none cursor-pointer"
                        title="Desplazarse a la Izquierda (A)"
                      >
                        <ChevronLeft size={14} className="transition-transform hover:-translate-x-0.5 text-[#00ffd1]" />
                      </button>

                      {/* RIGHT BUTTON (Strafe Right) */}
                      <button
                        type="button"
                        onClick={() => moveCamera('right', 25)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-7 rounded-r-full flex items-center justify-center text-white/55 hover:text-[#00ffd1] hover:bg-white/5 transition-all outline-none cursor-pointer"
                        title="Desplazarse a la Derecha (D)"
                      >
                        <ChevronRight size={14} className="transition-transform hover:translate-x-0.5 text-[#00ffd1]" />
                      </button>

                      {/* DOWN BUTTON (Walk Backward) */}
                      <button
                        type="button"
                        onClick={() => moveCamera('backward', 25)}
                        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-7 h-6 rounded-b-full flex items-center justify-center text-white/55 hover:text-[#00ffd1] hover:bg-white/5 transition-all outline-none cursor-pointer"
                        title="Retroceder (S)"
                      >
                        <ChevronDown size={14} className="transition-transform hover:translate-y-0.5 text-[#00ffd1]" />
                      </button>

                      {/* RESET CENTRAL BUTTON (Reset Translation Position) */}
                      <button
                        type="button"
                        onClick={() => {
                          paramsRef.current.posX = 0;
                          paramsRef.current.posY = 0;
                          paramsRef.current.posZ = 0;
                          setCurrentCoords({ x: 0, y: 0, z: 0 });
                        }}
                        className="z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-neutral-900 border border-white/15 flex flex-col items-center justify-center text-white/60 hover:text-emerald-400 hover:scale-110 active:scale-95 transition-all shadow-md outline-none hover:border-[#00ffd1]/50 cursor-pointer"
                        title="Volver al Centro"
                      >
                        <RotateCcw size={10} className="text-[#00ffd1]" />
                        <span className="text-[5.5px] sm:text-[6px] font-bold uppercase tracking-widest mt-0.5 text-[#00ffd1]">Origen</span>
                      </button>
                    </div>
                  </div>

                  {/* Elevation Flight controls (Up & Down) */}
                  <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
                    <span className="text-[7.5px] text-white/40 uppercase tracking-widest font-bold font-orbitron">Elevación:</span>
                    <div className="grid grid-cols-2 gap-1.5 p-0.5">
                      <button
                        type="button"
                        onClick={() => moveCamera('down', 15)}
                        className="flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded bg-white/5 hover:bg-white/10 hover:text-[#00ffd1] text-white/55 text-[8px] uppercase tracking-wider transition-all outline-none cursor-pointer font-bold"
                        title="Descender (Q)"
                      >
                        <ChevronDown size={11} /> Descender Q
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCamera('up', 15)}
                        className="flex items-center justify-center gap-1 py-1 sm:py-1.5 rounded bg-white/5 hover:bg-white/10 hover:text-[#00ffd1] text-white/55 text-[8px] uppercase tracking-wider transition-all outline-none cursor-pointer font-bold"
                        title="Ascender (E)"
                      >
                        <ChevronUp size={11} /> Ascender E
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Coordinates scientific indicator readout overlay */}
              <div className="border-t border-white/10 pt-1.5 flex flex-col gap-0.5 bg-black/40 p-1.5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between text-[7.5px] font-mono tracking-widest text-white/40 uppercase">
                  <span>Posición 3D (WASD):</span>
                  <span className="text-[#00ffd1] font-bold font-orbitron text-[8px] animate-pulse">GPS ON</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center bg-black p-1 rounded border border-white/5 text-[9px] font-mono font-extrabold text-neon-blue tracking-wider">
                  <div>X: <span className={currentCoords.x !== 0 ? "text-[#00ffd1]" : "text-white/40"}>{currentCoords.x}</span></div>
                  <div>Y: <span className={currentCoords.y !== 0 ? "text-[#00ffd1]" : "text-white/40"}>{currentCoords.y}</span></div>
                  <div>Z: <span className={currentCoords.z !== 0 ? "text-[#00ffd1]" : "text-white/40"}>{currentCoords.z}</span></div>
                </div>
              </div>

            </div>
          </div>

          {/* Floating HUD controls directly inside viewport */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/75 border border-white/15 backdrop-blur-md p-1.5 rounded-xl z-20 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setShowSidebar(!showSidebar);
                setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
              }}
              className={`p-2 rounded-lg text-white/80 hover:text-white transition-all flex items-center gap-1 ${
                showSidebar ? 'bg-white/10 text-white' : 'hover:bg-white/5'
              }`}
              title="Mostrar/Ocultar Panel Lateral"
            >
              <Sliders size={12} className={showSidebar ? "text-neon-blue" : "text-white/60"} />
              <span className="text-[8px] font-bold uppercase tracking-widest hidden sm:inline">Panel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsFullScreen(!isFullScreen);
                setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
              }}
              className="p-2 rounded-lg text-white/80 hover:text-white transition-all flex items-center gap-1 hover:bg-white/5"
              title={isFullScreen ? "Salir de pantalla completa" : "Ir a pantalla completa"}
            >
              {isFullScreen ? <Minimize2 size={12} className="text-purple-400" /> : <Maximize2 size={12} className="text-purple-400" />}
              <span className="text-[8px] font-bold uppercase tracking-widest hidden sm:inline">
                {isFullScreen ? "Salir" : "Max"}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Panel Lateral: VR Integrator Settings */}
        {showSidebar && (
          <div className={`border-t lg:border-t-0 lg:border-l border-white/5 bg-neutral-900/70 p-4 space-y-5 flex flex-col justify-between overflow-y-auto transition-all ${
            isFullScreen ? 'lg:w-[380px] shrink-0' : 'lg:col-span-1'
          }`}>
          <div className="space-y-4">
            <div className="flex border-b border-white/5 pb-2">
              <button 
                onClick={() => setActiveTab('view')}
                className={`flex-1 py-1.5 text-center text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all ${
                  activeTab === 'view' ? 'bg-white/5 text-white border-b-2 border-neon-blue' : 'text-white/40 hover:text-white'
                }`}
              >
                1. Explorar
              </button>
              <button 
                onClick={() => setActiveTab('place')}
                className={`flex-1 py-1.5 text-center text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'place' ? 'bg-white/5 text-white border-b-2 border-neon-blue' : 'text-white/40 hover:text-white'
                }`}
              >
                <Plus size={10} /> 2. Insertar Elemento 3D
              </button>
            </div>

            {activeTab === 'view' ? (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-neon-blue/5 border border-neon-blue/20 rounded-xl space-y-2">
                  <h5 className="text-[10px] font-bold text-neon-blue uppercase tracking-widest font-orbitron">Procesamiento Equirrectangular</h5>
                  <p className="text-[9px] text-white/60 leading-relaxed uppercase">
                    Esta imagen se despliega en una esfera de proyección de 360 grados de manera continua (seamless-wrap). Puedes utilizar la navegación giroscópica y cursor para rotar la cámara nativamente.
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[8px] text-white/30 uppercase tracking-widest font-bold">Inmersión del Anuncio</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 text-center">
                      <span className="text-xs text-white font-mono block font-bold">100%</span>
                      <span className="text-[7px] text-white/40 uppercase tracking-widest">Esférico Proyectado</span>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 text-center">
                      <span className="text-xs text-neon-blue font-mono block font-bold">Seamless</span>
                      <span className="text-[7px] text-white/40 uppercase tracking-widest">Cohesión Lateral</span>
                    </div>
                  </div>
                </div>

                {elementImageUrl && (
                  <div className="border border-white/10 rounded-xl p-3 bg-black/20 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="text-neon-blue" size={12} />
                      <span className="text-[8px] text-white/80 font-bold uppercase tracking-widest">Producto Listo para Insertar</span>
                    </div>
                    <p className="text-[8px] text-white/40 uppercase">Hemos detectado el recorte de tu producto en Product Studio. ¡Pásate a la pestaña "Insertar Elemento 3D" para colocarlo en volumen!</p>
                  </div>
                )}

                {/* Export & Download Hub for Meta Ads */}
                <div className="border border-white/10 rounded-xl p-3.5 bg-gradient-to-br from-white/10 to-transparent space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="text-purple-400" size={12} />
                    <span className="text-[8.5px] text-white font-bold uppercase tracking-widest">Publicar en Meta Ads (Facebook/VR)</span>
                  </div>
                  
                  <p className="text-[8px] text-white/60 leading-relaxed uppercase">
                    Meta Ads requiere un formato empaquetado tridimensional (.GLB) o panorámica equirrectangular para indexar la interactividad 360°. Descarga los archivos optimizados listos para campaña.
                  </p>

                  <div className="space-y-2 pt-1">
                    {/* GLB download */}
                    <button
                      type="button"
                      onClick={handleExportGLB}
                      disabled={isExporting}
                      className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-neon-blue text-white text-[9.5px] font-bold uppercase rounded-lg hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2 border border-purple-400/20 disabled:opacity-50 cursor-pointer"
                    >
                      {isExporting ? (
                        <>
                          <div className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin" />
                          <span>Procesando GLB...</span>
                        </>
                      ) : (
                        <>
                          <Box size={12} />
                          <span>Descargar Modelo 3D (.GLB)</span>
                        </>
                      )}
                    </button>

                    {isExporting && exportProgress && (
                      <p className="text-[7.5px] text-purple-400 text-center animate-pulse uppercase tracking-wider font-mono">
                        {exportProgress}
                      </p>
                    )}

                    {/* Format, aspect ratio, and resolution controls/info */}
                    {(() => {
                      const isVideo = backgroundImageUrl?.startsWith('data:video') || backgroundImageUrl?.endsWith('.mp4') || backgroundImageUrl?.includes('video');
                      return isVideo ? (
                        <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 text-[9px] space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-white/50 uppercase tracking-widest font-bold">Formato de Video:</span>
                            <span className="text-red-400 font-mono font-bold uppercase bg-red-400/10 px-1.5 py-0.5 rounded border border-red-500/20">MP4 (H.264 CODEC)</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-white/50 uppercase tracking-widest font-bold">Relación de Aspecto (Meta):</span>
                            <span className="text-emerald-400 font-mono font-bold uppercase">2:1 PANORÁMICO</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-white/50 uppercase tracking-widest font-bold">Resolución de Salida:</span>
                            <span className="text-indigo-400 font-mono font-bold uppercase">MÁXIMA (OPTIMIZADA)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 p-2.5 bg-black/40 rounded-lg border border-white/5 text-[9px]">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-white/50 uppercase tracking-widest font-bold">Formato Extraído:</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setExportFormat('png')}
                                className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                                  exportFormat === 'png'
                                    ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30 font-black'
                                    : 'bg-white/5 text-white/40 hover:text-white border border-transparent'
                                }`}
                              >
                                PNG
                                </button>
                              <button
                                type="button"
                                onClick={() => setExportFormat('jpg')}
                                className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                                  exportFormat === 'jpg'
                                    ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30 font-black'
                                    : 'bg-white/5 text-white/40 hover:text-white border border-transparent'
                                }`}
                              >
                                JPG
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-1.5">
                            <span className="text-[8px] text-white/50 uppercase tracking-widest font-bold">Relación de Aspecto (Meta):</span>
                            <span className="text-emerald-400 font-mono font-bold uppercase">2:1 PANORÁMICO</span>
                          </div>

                          <div className="flex justify-between items-center mt-1.5">
                            <span className="text-[8px] text-white/50 uppercase tracking-widest font-bold">Calidad y Dimensión:</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setExportResolution('ultra_8k')}
                                className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold uppercase transition-all ${
                                  exportResolution === 'ultra_8k'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                    : 'bg-white/5 text-white/40 hover:text-white border border-transparent'
                                }`}
                              >
                                8K Ultra (7680x3840)
                              </button>
                              <button
                                type="button"
                                onClick={() => setExportResolution('max')}
                                className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold uppercase transition-all ${
                                  exportResolution === 'max'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black'
                                    : 'bg-white/5 text-white/40 hover:text-white border border-transparent'
                                }`}
                              >
                                4K Máx (4096x2048)
                              </button>
                              <button
                                type="button"
                                onClick={() => setExportResolution('high')}
                                className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold uppercase transition-all ${
                                  exportResolution === 'high'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black'
                                    : 'bg-white/5 text-white/40 hover:text-white border border-transparent'
                                }`}
                              >
                                2K Alta (2048x1024)
                              </button>
                            </div>
                          </div>

                          {/* Dynamic GPano 360 EXIF/XMP Status indicator */}
                          <div className="mt-2.5 pt-2 border-t border-white/5">
                            {exportFormat === 'jpg' ? (
                              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[7.5px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="uppercase tracking-wider">Metadatos 360° Meta/Facebook listos para incrustar</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[7.5px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                <span className="uppercase tracking-wider">Meta requiere JPG para procesar visualizador 360°</span>
                              </div>
                            )}
                            <p className="text-[7px] text-white/30 uppercase mt-1 leading-normal">
                              {exportFormat === 'jpg'
                                ? "Al descargar el panorama en JPG, se inyectarán datos EXIF/XMP GPano para activación automática en Facebook."
                                : "Cambia el formato a JPG para habilitar la inyección inteligente de etiquetas esféricas GPano."}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Main Asset Download */}
                    {(() => {
                      const isVideo = backgroundImageUrl?.startsWith('data:video') || backgroundImageUrl?.endsWith('.mp4') || backgroundImageUrl?.includes('video');
                      return isVideo ? (
                        <button
                          type="button"
                          onClick={handleDownloadConvertedAsset}
                          className="w-full py-2 px-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-[9.5px] font-bold uppercase rounded-lg hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2 border border-red-400/20 cursor-pointer"
                        >
                          <Video size={12} className="text-white animate-pulse" />
                          <span>Descargar Video 360° (MP4 H.264)</span>
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={handleDownloadConvertedAsset}
                            className="py-2 px-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-[9px] font-bold uppercase rounded-lg border border-teal-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Download size={11} className="text-white" />
                            <span>Panorama 2:1 ({exportFormat.toUpperCase()})</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCapturePerspective}
                            className="py-2 px-1.5 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase rounded-lg border border-white/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Camera size={11} className="text-neon-blue" />
                            <span>Capturar Vista ({exportFormat.toUpperCase()})</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Publish in Meta Ads direct button */}
                    {onPublishMetaAds && (
                      <button
                        type="button"
                        onClick={() => onPublishMetaAds(backgroundImageUrl || "")}
                        className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[9.5px] font-bold uppercase rounded-lg border border-white/10 hover:shadow-[0_0_15px_rgba(59,130,246,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles size={12} className="text-neon-blue animate-pulse" />
                        <span>Publicar en Meta Ads</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[8px] text-white/30 uppercase tracking-widest font-bold">Tipo de Integración 3D</label>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      type="button"
                      onClick={() => setInsertType('none')}
                      className={`py-1.5 rounded-lg text-[8px] uppercase font-bold text-center border transition-all ${
                        insertType === 'none' ? 'bg-neon-blue text-black border-neon-blue font-black' : 'bg-black/35 border-white/5 text-white/50 hover:border-white/20'
                      }`}
                    >
                      Ninguno
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsertType('text')}
                      className={`py-1.5 rounded-lg text-[8px] uppercase font-bold border transition-all flex items-center justify-center gap-0.5 ${
                        insertType === 'text' ? 'bg-neon-blue text-black border-neon-blue font-black' : 'bg-black/35 border-white/5 text-white/50 hover:border-white/20'
                      }`}
                    >
                      <Type size={9} /> Letrero
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (elementImageUrl) {
                          setInsertType('image');
                        } else {
                          alert("Sube un elemento o imagen en el menú de Product Studio / Composición primero para insertarlo.");
                        }
                      }}
                      className={`py-1.5 rounded-lg text-[8px] uppercase font-bold border transition-all flex items-center justify-center gap-0.5 ${
                        !elementImageUrl ? 'opacity-30 cursor-not-allowed' : ''
                      } ${
                        insertType === 'image' ? 'bg-neon-blue text-black border-neon-blue font-black' : 'bg-black/35 border-white/5 text-white/50 hover:border-white/20'
                      }`}
                    >
                      <ImageIcon size={9} /> Prod.
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsertType('3d_model')}
                      className={`py-1.5 rounded-lg text-[8px] uppercase font-bold border transition-all flex items-center justify-center gap-0.5 ${
                        insertType === '3d_model' ? 'bg-neon-blue text-black border-neon-blue font-black' : 'bg-black/35 border-white/5 text-white/50 hover:border-white/20'
                      }`}
                    >
                      <Box size={9} /> 3D
                    </button>
                  </div>
                </div>

                {insertType === 'text' && (
                  <div className="space-y-2 border border-white/5 rounded-xl p-3 bg-white/5">
                    <div>
                      <label className="text-[8px] text-white/40 uppercase tracking-widest font-bold block mb-1">Texto Holográfico 3D</label>
                      <input 
                        type="text" 
                        value={hologramText} 
                        onChange={(e) => setHologramText(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-neon-blue"
                        placeholder="SMART ADS VR"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] text-white/40 uppercase tracking-widest font-bold block mb-1">Color Brillante</label>
                        <select 
                          value={textColor} 
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none"
                        >
                          <option value="#00d1ff">Cian Neón</option>
                          <option value="#34d399">Esmeralda</option>
                          <option value="#f43f5e">Rosa Neón</option>
                          <option value="#f59e0b">Ámbar</option>
                          <option value="#a855f7">Púrpura</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] text-white/40 uppercase tracking-widest font-bold block mb-1">Tamaño Fuente</label>
                        <input 
                          type="range" 
                          min="20" 
                          max="60" 
                          value={textSize}
                          onChange={(e) => setTextSize(Number(e.target.value))}
                          className="w-full accent-neon-blue cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {insertType === '3d_model' && (
                  <div className="space-y-3 border border-white/5 rounded-xl p-3 bg-white/5">
                    {/* Modeled Product Custom Selection/Uploader instead of general shapes */}
                    <div>
                      <label className="text-[8px] text-neon-blue uppercase tracking-widest font-black block mb-2">Modelo de Producto 3D (.glb / Textura)</label>
                      
                      {localElementImageUrl ? (
                        <div className="border border-neon-blue/20 bg-neon-blue/5 rounded-lg p-2.5 flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded bg-black/40 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            <img src={localElementImageUrl} className="w-full h-full object-contain" alt="Producto 3D" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[8.5px] font-bold text-white uppercase block truncate">
                              Producto 3D Activo
                            </span>
                            <span className="text-[7px] text-neon-blue uppercase tracking-wider block font-bold mt-0.5">
                              ✨ Renderizado Volumétrico
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLocalElementImageUrl(null)}
                            className="text-[7.5px] text-white/40 hover:text-red-400 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5"
                          >
                            Quitar
                          </button>
                        </div>
                      ) : (
                        <div className="border border-dashed border-white/10 hover:border-neon-blue/30 bg-black/20 rounded-lg p-3 text-center space-y-2 transition-all">
                          <p className="text-[7px] text-white/50 uppercase tracking-wider leading-normal">
                            No hay un modelo de producto cargado. Sube una textura modelada para renderizar en volumen.
                          </p>
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e: any) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      setLocalElementImageUrl(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                };
                                input.click();
                              }}
                              className="px-2.5 py-1 rounded bg-neon-blue text-black font-black uppercase text-[8px] tracking-wider hover:scale-105 transition-all"
                            >
                              Subir Textura de Producto
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Giro and rotation Speed (Made full-width since styling options are hidden) */}
                    <div>
                      <div className="flex justify-between text-[8px] text-white/40 uppercase tracking-widest font-bold mb-1">
                        <span>Giro de Producto (Rotación):</span>
                        <span className="text-neon-blue font-mono font-black">{model3DRotationSpeed}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="4" 
                        step="0.5"
                        value={model3DRotationSpeed}
                        onChange={(e) => setModel3DRotationSpeed(Number(e.target.value))}
                        className="w-full accent-neon-blue cursor-pointer h-1 bg-black rounded"
                      />
                    </div>

                    {/* Sección Integradora de Parámetros Físicos VR */}
                    <div className="border border-neon-blue/20 bg-neon-blue/5 rounded-lg p-3 space-y-3 mt-1 text-left animate-fade-in">
                      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                        <span className="text-[8.5px] font-black text-white uppercase tracking-wider flex items-center gap-1">
                          🪐 Simulación Física Inmersiva
                        </span>
                        <button
                          type="button"
                          onClick={() => setPhysicsEnabled(!physicsEnabled)}
                          className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded transition-all ${
                            physicsEnabled ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/50'
                          }`}
                        >
                          {physicsEnabled ? 'Activa' : 'Pausa / Estática'}
                        </button>
                      </div>

                      {physicsEnabled && (
                        <div className="space-y-3.5 animate-slide-up">
                          {/* Rebote / Elasticidad */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[7.5px] font-bold text-white/60 uppercase">
                              <span>Coeficiente de Colisión (Bote):</span>
                              <span className="text-neon-blue">{(physicsBounciness * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={physicsBounciness}
                              onChange={(e) => setPhysicsBounciness(parseFloat(e.target.value))}
                              className="w-full accent-neon-blue h-1 bg-black rounded cursor-pointer"
                            />
                          </div>

                          {/* Fricción */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[7.5px] font-bold text-white/60 uppercase">
                              <span>Fricción de Superficies (Deslizamiento):</span>
                              <span className="text-neon-blue">{(physicsFriction * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={physicsFriction}
                              onChange={(e) => setPhysicsFriction(parseFloat(e.target.value))}
                              className="w-full accent-neon-blue h-1 bg-black rounded cursor-pointer"
                            />
                          </div>

                          {/* Gravedad */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[7.5px] font-bold text-white/60 uppercase">
                              <span>Gravedad del Entorno:</span>
                              <span className="text-neon-blue">{(physicsGravity * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="2.5"
                              step="0.1"
                              value={physicsGravity}
                              onChange={(e) => setPhysicsGravity(parseFloat(e.target.value))}
                              className="w-full accent-neon-blue h-1 bg-black rounded cursor-pointer"
                            />
                          </div>

                          {/* Dynamic forces actions */}
                          <div className="pt-1 flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                // Raise throw impulse flag inside ref
                                paramsRef.current.physicsThrowTrigger = true;
                              }}
                              className="w-full py-1.5 rounded bg-neon-blue text-black font-extrabold text-[8.5px] uppercase tracking-widest hover:scale-105 active:scale-95 duration-150 transition-all font-orbitron"
                            >
                              🚀 Dar un Impulso (Empujar / Lanzar)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {insertType === 'image' && !elementImageUrl && (
                  <p className="text-[8px] text-red-400 uppercase tracking-widest font-bold">¡Subre primero una referencia en Product Studio para insertarla en VR!</p>
                )}

                {insertType !== 'none' && (
                  <div className="border border-white/5 rounded-xl p-4 bg-white/5 space-y-4">
                    <span className="text-[9px] font-orbitron font-bold text-neon-blue uppercase tracking-widest flex items-center gap-1">
                      <Sliders size={10} /> Localizador Vectorial 3D
                    </span>

                    {/* Longitude (Yaw) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] uppercase font-bold tracking-widest">
                        <span className="text-white/40">Rotación Horizontal (Yaw)</span>
                        <span className="text-neon-blue">{elemLon}°</span>
                      </div>
                      <input 
                        type="range" 
                        min="-180" 
                        max="180" 
                        value={elemLon}
                        onChange={(e) => setElemLon(Number(e.target.value))}
                        className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-neon-blue"
                      />
                    </div>

                    {/* Latitude (Pitch) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] uppercase font-bold tracking-widest">
                        <span className="text-white/40">Inclinación Vertical (Pitch)</span>
                        <span className="text-neon-blue">{elemLat}°</span>
                      </div>
                      <input 
                        type="range" 
                        min="-75" 
                        max="75" 
                        value={elemLat}
                        onChange={(e) => setElemLat(Number(e.target.value))}
                        className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-neon-blue"
                      />
                    </div>

                    {/* Distance (Rad) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] uppercase font-bold tracking-widest">
                        <span className="text-white/40">Profundidad (Distancia VR)</span>
                        <span className="text-neon-blue">{elemDistance}m</span>
                      </div>
                      <input 
                        type="range" 
                        min="80" 
                        max="420" 
                        value={elemDistance}
                        onChange={(e) => setElemDistance(Number(e.target.value))}
                        className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-neon-blue"
                      />
                    </div>

                    {/* Scale */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] uppercase font-bold tracking-widest">
                        <span className="text-white/40">Escala de Volumen</span>
                        <span className="text-neon-blue">{elemScale}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="12" 
                        value={elemScale}
                        onChange={(e) => setElemScale(Number(e.target.value))}
                        className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer accent-neon-blue"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5">
            <p className="text-[7.5px] text-white/20 uppercase tracking-widest text-center leading-relaxed">
              La visualización panorámica calcula un sombreado inmersivo proyectando las coordenadas en el Canvas WebGL nativo de tu simulador.
            </p>
          </div>
        </div>
        )}

      </div>
    </div>
  );
};
