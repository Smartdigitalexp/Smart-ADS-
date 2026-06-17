import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Box, 
  Cpu, 
  Sparkles, 
  Sliders, 
  Sun, 
  Palette, 
  Layers, 
  Download, 
  CheckCircle, 
  RefreshCw, 
  Upload, 
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { optimizeProductReference } from '../services/geminiService';

interface Product3DModelerProps {
  initialImage: string | null;
  productName: string;
  background360Url?: string | null;
  onPreviewCreated: (imageUrl: string) => void;
  onApplyAsElement: (elementUrl: string) => void;
  onRedirectToEnvironment?: () => void;
  onConsumeCredits?: (amount: number) => Promise<boolean>;
}

export function Product3DModeler({ 
  initialImage, 
  productName, 
  background360Url,
  onPreviewCreated, 
  onApplyAsElement,
  onRedirectToEnvironment,
  onConsumeCredits
}: Product3DModelerProps) {
  // Input file uploading ref and local state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [isStudioProcessing, setIsStudioProcessing] = useState(false);
  
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestRef = useRef<number | null>(null);

  // Modeler specific configurations - optimized automatic defaults for high fidelity PBR volumetric modeling
  const [volumeType, setVolumeType] = useState<'extruded' | 'card_pbr' | 'cylinder' | 'hologram'>(() => {
    const val = localStorage.getItem('product_3d_volume_type');
    return (val as 'extruded' | 'card_pbr' | 'cylinder' | 'hologram') || 'card_pbr';
  });
  const [metallic, setMetallic] = useState<number>(() => {
    const val = localStorage.getItem('product_3d_metallic');
    return val ? parseFloat(val) : 0.75;
  });
  const [roughness, setRoughness] = useState<number>(() => {
    const val = localStorage.getItem('product_3d_roughness');
    return val ? parseFloat(val) : 0.15;
  });
  const [lightingStyle, setLightingStyle] = useState<'studio' | 'neon' | 'cinematic' | 'polarized'>('polarized');
  const [accentColor, setAccentColor] = useState<string>(() => {
    const val = localStorage.getItem('product_3d_accent_color');
    return val || '#00d1ff';
  });
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [meshThickness, setMeshThickness] = useState<number>(() => {
    const val = localStorage.getItem('product_3d_mesh_thickness');
    return val ? parseFloat(val) : 10;
  }); // depth scale
  const [specularLevel, setSpecularLevel] = useState<number>(0.85);
  const [rotationSpeed, setRotationSpeed] = useState<number>(1);
  
  // Custom synced physical simulation parameters
  const [bounciness, setBounciness] = useState<number>(() => {
    const val = localStorage.getItem('product_3d_physics_bounciness');
    return val ? parseFloat(val) : 0.65;
  });
  const [friction, setFriction] = useState<number>(() => {
    const val = localStorage.getItem('product_3d_physics_friction');
    return val ? parseFloat(val) : 0.25;
  });

  // Sync initialImage visual reference when it updates in parent
  useEffect(() => {
    if (initialImage) {
      setLocalImage(initialImage);
    }
    setVolumeType('card_pbr');
    setMeshThickness(10);
  }, [initialImage]);

  useEffect(() => {
    localStorage.setItem('product_3d_volume_type', volumeType);
  }, [volumeType]);

  useEffect(() => {
    localStorage.setItem('product_3d_metallic', metallic.toString());
  }, [metallic]);

  useEffect(() => {
    localStorage.setItem('product_3d_roughness', roughness.toString());
  }, [roughness]);

  useEffect(() => {
    localStorage.setItem('product_3d_accent_color', accentColor);
  }, [accentColor]);

  useEffect(() => {
    localStorage.setItem('product_3d_mesh_thickness', meshThickness.toString());
  }, [meshThickness]);

  useEffect(() => {
    localStorage.setItem('product_3d_physics_bounciness', bounciness.toString());
  }, [bounciness]);

  useEffect(() => {
    localStorage.setItem('product_3d_physics_friction', friction.toString());
  }, [friction]);
  
  // Viewing Angles
  const [pitch, setPitch] = useState<number>(0); // X-axis
  const [yaw, setYaw] = useState<number>(0);   // Y-axis
  const [roll, setRoll] = useState<number>(0);  // Z-axis

  // Automated integration of the active 3D model into 360 viewer tools
  const lastIntegratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!localImage) return;

    // Trigger capture once WebGL updates and renders
    const timer = setTimeout(() => {
      if (!canvasRef.current || !sceneRef.current || !rendererRef.current) return;
      try {
        const bgSphere = sceneRef.current.getObjectByName("bgSphereDome");
        const gridHelper = sceneRef.current.getObjectByName("gridHelperVisual");
        
        const prevBgVis = bgSphere ? bgSphere.visible : false;
        const prevGridVis = gridHelper ? gridHelper.visible : false;
        
        if (bgSphere) bgSphere.visible = false;
        if (gridHelper) gridHelper.visible = false;
        
        let activeCam: THREE.Camera | null = null;
        sceneRef.current.traverse((node) => {
          if (node instanceof THREE.Camera) activeCam = node;
        });
        if (activeCam) rendererRef.current.render(sceneRef.current, activeCam);

        const dataUrl = canvasRef.current.toDataURL('image/png');
        
        if (bgSphere) bgSphere.visible = prevBgVis;
        if (gridHelper) gridHelper.visible = prevGridVis;
        if (activeCam) rendererRef.current.render(sceneRef.current, activeCam);
        
        if (lastIntegratedRef.current !== dataUrl) {
          lastIntegratedRef.current = dataUrl;
          onApplyAsElement(dataUrl);
          setStatusMessage('¡Modelo 3D integrado de forma automática en el visor 360°!');
        }
      } catch (e) {
        console.error('Core auto-binding exception:', e);
      }
    }, 850); // Small delay to guarantee compilation & render pass complete

    return () => clearTimeout(timer);
  }, [localImage, volumeType, metallic, roughness, lightingStyle, accentColor, showWireframe, autoRotate, meshThickness, rotationSpeed, onApplyAsElement]);

  // Status logs
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // Setup Sample Products if no image uploaded
  const sampleProducts = [
    { name: 'Perfume Luxury', url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Sneakers Pro', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Smartwatch VR', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { name: 'Bebida Energética', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' }
  ];

  // Load sample image
  const handleSelectSample = (url: string) => {
    setLocalImage(url);
    setStatusMessage('Cargada muestra de producto.');
  };

  // Upload custom flat image
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalImage(reader.result as string);
        setStatusMessage('Imagen de producto cargada correctamente.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductStudioRefine = async () => {
    if (!localImage) return;
    if (onConsumeCredits && !(await onConsumeCredits(30))) return;
    
    setIsStudioProcessing(true);
    setStatusMessage('Invocando Product Studio AI: Optimizando y segmentando imagen para render volumétrico...');
    try {
      const base64 = localImage.split(',')[1];
      const match = localImage.match(/^data:(image\/[a-zA-Z]+);base64,/);
      const mimeType = match ? match[1] : 'image/png';
      
      const refinedImage = await optimizeProductReference(base64, mimeType, productName);
      
      if (refinedImage) {
        setLocalImage(refinedImage);
        setStatusMessage('¡Imagen altamente optimizada y segmentada con éxito para extrusión volumétrica!');
      } else {
        setStatusMessage('Error durante optimización inicial de imagen. Intente nuevamente.');
      }
    } catch (e) {
      console.error(e);
      setStatusMessage('Fallo térmico neural al optimizar la imagen.');
    } finally {
      setIsStudioProcessing(false);
    }
  };

  // Tripo 3D state
  const [tripoApiKey, setTripoApiKey] = useState<string>(() => {
    return localStorage.getItem('product_tripo_api_key') || '';
  });
  const [isTripoProcessing, setIsTripoProcessing] = useState<boolean>(false);
  const [tripoProgress, setTripoProgress] = useState<number>(0);
  const [tripoTaskId, setTripoTaskId] = useState<string | null>(null);
  const [tripoGlbUrl, setTripoGlbUrl] = useState<string | null>(null);
  const [tripoPreviewUrl, setTripoPreviewUrl] = useState<string | null>(null);
  const [tripoError, setTripoError] = useState<string | null>(null);
  const [showKeyField, setShowKeyField] = useState<boolean>(false);

  useEffect(() => {
    if (tripoApiKey) {
      localStorage.setItem('product_tripo_api_key', tripoApiKey);
    }
  }, [tripoApiKey]);

  const handleGenerateTripo3D = async () => {
    if (!localImage) {
      setTripoError("Por favor, selecciona o sube una imagen primero.");
      return;
    }
    
    setTripoError(null);
    setIsTripoProcessing(true);
    setTripoProgress(5);
    setStatusMessage("Subiendo imagen y creando tarea en Tripo 3D...");

    try {
      const response = await fetch("/api/tripo/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageBase64: localImage,
          tripoApiKey: tripoApiKey || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fallo al iniciar el modelado en Tripo.");
      }

      const taskId = data.taskId;
      setTripoTaskId(taskId);
      setTripoProgress(20);
      setStatusMessage("Generando modelo 3D en las GPU de Tripo AI...");

      // Start Polling until complete
      pollTripoTaskId(taskId);

    } catch (err: any) {
      console.error(err);
      setTripoError(err.message || "Error al conectar con el de Tripo.");
      setIsTripoProcessing(false);
      setTripoProgress(0);
      setStatusMessage("Error en Tripo 3D.");
    }
  };

  const pollTripoTaskId = (taskId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 60) { // Limit to 3 minutes
        clearInterval(interval);
        setTripoError("Se superó el tiempo de espera. Revisa el estado en tu cuenta de Tripo.");
        setIsTripoProcessing(false);
        setTripoProgress(0);
        return;
      }

      try {
        const res = await fetch("/api/tripo/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            taskId,
            tripoApiKey: tripoApiKey || undefined
          })
        });

        const statusData = await res.json();

        if (!res.ok) {
          clearInterval(interval);
          throw new Error(statusData.error || "Fallo de consulta de estado.");
        }

        if (statusData.code !== 0) {
          clearInterval(interval);
          throw new Error(statusData.msg || "La API de Tripo devolvió un error.");
        }

        const task = statusData.data;
        const status = task.status;
        const progress = task.progress || 0;

        setTripoProgress(Math.max(20, Math.min(progress, 95)));
        setStatusMessage(`Modelando: ${progress}% (${status === 'queuing' ? 'En cola' : 'Procesando'})`);

        if (status === "success") {
          clearInterval(interval);
          setTripoProgress(100);
          
          const glb = task.output?.glb || task.output?.model;
          const preview = task.output?.rendered_image;

          setTripoGlbUrl(glb || null);
          setTripoPreviewUrl(preview || null);
          setIsTripoProcessing(false);
          setStatusMessage("¡Malla AI 3D creada de forma súper exitosa!");
          
          if (preview) {
            setLocalImage(preview);
            onPreviewCreated(preview);
          }
        } else if (status === "failed") {
          clearInterval(interval);
          setTripoError("Fallo en el servidor de Tripo 3D al procesar el objeto.");
          setIsTripoProcessing(false);
          setTripoProgress(0);
        }

      } catch (err: any) {
        console.error(err);
        clearInterval(interval);
        setTripoError(err.message || "Error al sincronizar con Tripo.");
        setIsTripoProcessing(false);
        setTripoProgress(0);
      }
    }, 3000); // Poll every 3 seconds
  };

  // Initialize and run Three.js Interactive Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !localImage) return;

    // 1. Create Scene and Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 100;

    // 2. Setup WebGL Renderer with Alpha transparent channel support
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true // Necessary for canvas screen capturing/screenshots
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    groupRef.current = mainGroup;

    // 3. Immersive background sphere removed to ensure perfectly transparent snapshots and product placements without any color leaks.
    // The WebGL canvas renders with a transparent background only.

    // Optional subtle grid helper to show depth placement scale
    const gridHelper = new THREE.GridHelper(120, 30, 0x00d1ff, 0x444444);
    gridHelper.name = "gridHelperVisual";
    gridHelper.position.y = -40;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // 4. Lighting parameters configuration depending on LightingStyle
    const setupLights = () => {
      // Remove any existing lights
      const lightsToRemove: THREE.Light[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Light) {
          lightsToRemove.push(obj);
        }
      });
      lightsToRemove.forEach((light) => scene.remove(light));

      // Build according to chosen rig
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      if (lightingStyle === 'studio') {
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(50, 50, 50);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0x00d1ff, 0.5);
        fillLight.position.set(-50, 10, 30);
        scene.add(fillLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
        backLight.position.set(0, 30, -50);
        scene.add(backLight);
      } else if (lightingStyle === 'neon') {
        const mainCyan = new THREE.DirectionalLight(0x00d1ff, 1.5);
        mainCyan.position.set(30, 20, 40);
        scene.add(mainCyan);

        const fillMagenta = new THREE.DirectionalLight(0xf43f5e, 1.2);
        fillMagenta.position.set(-30, -10, 30);
        scene.add(fillMagenta);

        const rimBlue = new THREE.DirectionalLight(0xa855f7, 1.0);
        rimBlue.position.set(0, 40, -30);
        scene.add(rimBlue);
      } else if (lightingStyle === 'cinematic') {
        const warmKey = new THREE.DirectionalLight(0xf59e0b, 1.6);
        warmKey.position.set(40, 40, 40);
        scene.add(warmKey);

        const coldFill = new THREE.DirectionalLight(0x3b82f6, 0.7);
        coldFill.position.set(-40, 20, 20);
        scene.add(coldFill);

        const goldBevel = new THREE.DirectionalLight(0xd97706, 1.0);
        goldBevel.position.set(20, -40, -20);
        scene.add(goldBevel);
      } else { // polarized / hyper metallic reflections
        const polarIntensity = new THREE.DirectionalLight(0xffffff, 2.0);
        polarIntensity.position.set(30, 60, 30);
        scene.add(polarIntensity);

        const rimWhite = new THREE.DirectionalLight(0xeeeeee, 1.4);
        rimWhite.position.set(-30, -30, -30);
        scene.add(rimWhite);
      }
    };
    setupLights();

    // 5. Load Product Texture and create mesh in real-time
    const makeImageTransparent = (img: HTMLImageElement): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Sample four corners to determine backdrop color
      const corners = [
        { r: data[0], g: data[1], b: data[2], a: data[3] },
        { r: data[(canvas.width - 1) * 4], g: data[(canvas.width - 1) * 4 + 1], b: data[(canvas.width - 1) * 4 + 2], a: data[(canvas.width - 1) * 4 + 3] },
        { r: data[(canvas.height - 1) * canvas.width * 4], g: data[(canvas.height - 1) * canvas.width * 4 + 1], b: data[(canvas.height - 1) * canvas.width * 4 + 2], a: data[(canvas.height - 1) * canvas.width * 4 + 3] },
        { r: data[(canvas.height * canvas.width - 1) * 4], g: data[(canvas.height * canvas.width - 1) * 4 + 1], b: data[(canvas.height * canvas.width - 1) * 4 + 2], a: data[(canvas.height * canvas.width - 1) * 4 + 3] }
      ];

      let bgR = 255, bgG = 255, bgB = 255;
      const counts: Record<string, number> = {};
      let maxCount = 0;
      corners.forEach(c => {
        const key = `${Math.round(c.r / 30) * 30},${Math.round(c.g / 30) * 30},${Math.round(c.b / 30) * 30}`;
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] > maxCount && c.a > 50) {
          maxCount = counts[key];
          bgR = c.r; bgG = c.g; bgB = c.b;
        }
      });

      // Clear matching backdrop pixels to be 100% transparent. High precision keyout!
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];

        const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        
        const isNearWhite = (r > 215 && g > 215 && b > 215);
        const isNearBlack = (r < 40 && g < 40 && b < 40 && bgR < 60 && bgG < 60 && bgB < 60);

        if (dist < 42 || (bgR > 180 && isNearWhite) || (bgR < 60 && isNearBlack)) {
          data[i+3] = 0;
        } else if (dist < 58) {
          data[i+3] = Math.min(a, ((dist - 42) / 16) * 255);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas;
    };

    const imageEl = new Image();
    imageEl.crossOrigin = 'anonymous';
    imageEl.src = localImage;
    imageEl.onload = () => {
      const processedCanvas = makeImageTransparent(imageEl);
      const textur = new THREE.CanvasTexture(processedCanvas);
      textur.colorSpace = THREE.SRGBColorSpace;
      
      const imgWidth = processedCanvas.width || 400;
      const imgHeight = processedCanvas.height || 400;
      const aspect = imgWidth / imgHeight;
      
      let width = 36;
      let height = 36;
      if (aspect > 1) {
        height = width / aspect;
      } else {
        width = height * aspect;
      }

      // Clean up any existing children
      while (mainGroup.children.length > 0) {
        mainGroup.remove(mainGroup.children[0]);
      }

      const colorHex = parseInt(accentColor.replace('#', '0x'));

      // High-Fidelity transparent-maskable PBR material
      const texturedMaterial = new THREE.MeshStandardMaterial({
        map: textur,
        metalness: metallic,
        roughness: roughness,
        transparent: true,
        alphaTest: 0.1, // Keyout alpha masks
        side: THREE.DoubleSide
      });

      const frameMaterial = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: 0.9,
        roughness: 0.2,
        side: THREE.DoubleSide
      });

      let mainMesh: THREE.Mesh;

      if (volumeType === 'extruded') {
        const depth = meshThickness + 4;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        
        const faceMaterials = [
          texturedMaterial,   // Right
          texturedMaterial,   // Left
          texturedMaterial,   // Top
          texturedMaterial,   // Bottom
          texturedMaterial,   // Front
          texturedMaterial    // Back
        ];
        
        mainMesh = new THREE.Mesh(geometry, faceMaterials);
      } else if (volumeType === 'card_pbr') {
        const geometry = new THREE.PlaneGeometry(width, height);
        const frontMesh = new THREE.Mesh(geometry, texturedMaterial);
        mainGroup.add(frontMesh);

        const backGeo = new THREE.PlaneGeometry(width, height);
        const backMesh = new THREE.Mesh(backGeo, texturedMaterial);
        backMesh.rotation.y = Math.PI;
        backMesh.position.z = -0.1;
        mainGroup.add(backMesh);

        const outlineGeo = new THREE.BoxGeometry(width + 0.2, height + 0.2, 0.2);
        mainMesh = new THREE.Mesh(outlineGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
      } else if (volumeType === 'cylinder') {
        const geometry = new THREE.CylinderGeometry(width / 2.2, width / 2.2, height, 48, 1, false);
        const cylinderMaterials = [
          texturedMaterial,   // Side
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 }), // Top cap
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 })  // Bottom cap
        ];
        mainMesh = new THREE.Mesh(geometry, cylinderMaterials);
      } else {
        const sphereGeo = new THREE.SphereGeometry(width / 2, 32, 32);
        const hologramMat = new THREE.MeshStandardMaterial({
          map: textur,
          metalness: 0.1,
          roughness: 0.9,
          transparent: true,
          opacity: 0.8,
          wireframe: showWireframe,
          color: colorHex
        });
        
        const innerMesh = new THREE.Mesh(sphereGeo, hologramMat);
        mainGroup.add(innerMesh);

        const ringGeo = new THREE.TorusGeometry(width * 0.7, 1.2, 8, 48);
        const ringMesh = new THREE.Mesh(ringGeo, frameMaterial);
        ringMesh.rotation.x = Math.PI / 3;
        mainGroup.add(ringMesh);

        const holderGeo = new THREE.PlaneGeometry(width, height);
        mainMesh = new THREE.Mesh(holderGeo, texturedMaterial);
        mainMesh.position.z = 1;
      }

      meshRef.current = mainMesh;
      mainGroup.add(mainMesh);

      // Adjust wireframe override selectively
      mainGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !(obj.material instanceof Array)) {
          if (showWireframe) {
            obj.material.wireframe = true;
          }
        }
      });
    };

    // 6. Resize handler for dynamic canvas scaling
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      rendererRef.current.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);
    handleResize();

    // 7. Interactive drag mapping inside WebGL
    let isDragging = false;
    let previousX = 0;
    let previousY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousX = e.clientX;
      previousY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousX;
      const deltaY = e.clientY - previousY;
      
      setYaw((prev) => prev + deltaX * 0.5);
      setPitch((prev) => prev + deltaY * 0.5);
      
      previousX = e.clientX;
      previousY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const touchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousX = e.touches[0].clientX;
        previousY = e.touches[0].clientY;
      }
    };

    const touchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousX;
      const deltaY = e.touches[0].clientY - previousY;

      setYaw((prev) => prev + deltaX * 0.5);
      setPitch((prev) => prev + deltaY * 0.5);

      previousX = e.touches[0].clientX;
      previousY = e.touches[0].clientY;
    };

    const domCanvas = canvasRef.current;
    domCanvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    domCanvas.addEventListener('touchstart', touchStart);
    domCanvas.addEventListener('touchmove', touchMove);
    window.addEventListener('touchend', onMouseUp);

    // 8. Animation & rotation logic
    const update = () => {
      if (autoRotate) {
        setYaw((prev) => (prev + 0.3 * rotationSpeed) % 360);
      }

      if (mainGroup) {
        mainGroup.rotation.x = THREE.MathUtils.degToRad(pitch);
        mainGroup.rotation.y = THREE.MathUtils.degToRad(yaw);
        mainGroup.rotation.z = THREE.MathUtils.degToRad(roll);
      }

      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    // Cleanup resources
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      resizeObserver.disconnect();
      
      domCanvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      domCanvas.removeEventListener('touchstart', touchStart);
      domCanvas.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', onMouseUp);

      // Recursive disposal
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [localImage, volumeType, metallic, roughness, lightingStyle, accentColor, showWireframe, autoRotate, meshThickness, rotationSpeed, background360Url]);

  // Synchronous React-triggered parameter update
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.degToRad(pitch);
      groupRef.current.rotation.y = THREE.MathUtils.degToRad(yaw);
      groupRef.current.rotation.z = THREE.MathUtils.degToRad(roll);
    }
  }, [pitch, yaw, roll]);

  // Command to export as high-fidelity PNG capture directly from WebGL preserveDrawingBuffer
  const handleExportPNG = async () => {
    if (!canvasRef.current || !sceneRef.current || !rendererRef.current) return;
    if (onConsumeCredits && !(await onConsumeCredits(200))) return;
    setStatusMessage('Capturando renderizado 3D de alta fidelidad...');
    try {
      const bgSphere = sceneRef.current.getObjectByName("bgSphereDome");
      const gridHelper = sceneRef.current.getObjectByName("gridHelperVisual");
      
      const prevBgVis = bgSphere ? bgSphere.visible : false;
      const prevGridVis = gridHelper ? gridHelper.visible : false;
      
      if (bgSphere) bgSphere.visible = false;
      if (gridHelper) gridHelper.visible = false;
      
      let activeCam: THREE.Camera | null = null;
      sceneRef.current.traverse((node) => {
        if (node instanceof THREE.Camera) activeCam = node;
      });
      if (activeCam) rendererRef.current.render(sceneRef.current, activeCam);

      const dataUrl = canvasRef.current.toDataURL('image/png');
      
      if (bgSphere) bgSphere.visible = prevBgVis;
      if (gridHelper) gridHelper.visible = prevGridVis;
      if (activeCam) rendererRef.current.render(sceneRef.current, activeCam);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${productName.toLowerCase().replace(/\s+/g, '_')}_model3D_${volumeType}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatusMessage('¡Captura PNG descargada con éxito!');
    } catch (e) {
      console.error('Error capturing WebGL render:', e);
      setStatusMessage('Error al capturar render.');
    }
  };

  // Command to dynamically export the scene to a functional GLB 3D model (for Meta Ads / standard engines)
  const handleExportGLBFile = async () => {
    if (!sceneRef.current || !groupRef.current) return;
    if (onConsumeCredits && !(await onConsumeCredits(200))) return;
    setIsProcessing(true);
    setStatusMessage('Cargando compilador de polígonos tridimensionales...');

    try {
      // Load GLTFExporter dynamically in compliance with React Vite guidelines
      // @ts-ignore
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
      const exporter = new GLTFExporter();

      setStatusMessage('Compilando malla, texturas y coordenadas UV de producto PBR...');

      // Parse just our product group so lights/grid do not pollute the exported entity mesh
      exporter.parse(
        groupRef.current,
        (gltf: any) => {
          setStatusMessage('Empaquetando modelo binario (.glb) inmersivo...');
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          const link = document.createElement('a');
          const downloadUrl = URL.createObjectURL(blob);
          
          link.href = downloadUrl;
          link.download = `${productName.toLowerCase().replace(/\s+/g, '_')}_volume3D_${volumeType}.glb`;
          document.body.appendChild(link);
          link.click();
          
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          
          setIsProcessing(false);
          setStatusMessage('¡Modelo 3D (.GLB) descargado exitosamente!');
        },
        (error: any) => {
          console.error('Error generating GLB archive:', error);
          setStatusMessage('Error al exportar GLB.');
          setIsProcessing(false);
        },
        { 
          binary: true, 
          onlyVisible: true 
        }
      );
    } catch (err) {
      console.error('Failed to parse 3D GLB export:', err);
      setStatusMessage('Error cargando el motor de empaquetado GLB.');
      setIsProcessing(false);
    }
  };

  // Command to bind and mount this custom-made 3D Model asset directly inside our VR/360 workspace!
  const handleApplyTo360 = async () => {
    if (!canvasRef.current || !sceneRef.current || !rendererRef.current) return;
    if (onConsumeCredits && !(await onConsumeCredits(200))) return;
    try {
      const bgSphere = sceneRef.current.getObjectByName("bgSphereDome");
      const gridHelper = sceneRef.current.getObjectByName("gridHelperVisual");
      
      const prevBgVis = bgSphere ? bgSphere.visible : false;
      const prevGridVis = gridHelper ? gridHelper.visible : false;
      
      if (bgSphere) bgSphere.visible = false;
      if (gridHelper) gridHelper.visible = false;
      
      let activeCam: THREE.Camera | null = null;
      sceneRef.current.traverse((node) => {
        if (node instanceof THREE.Camera) activeCam = node;
      });
      if (activeCam) rendererRef.current.render(sceneRef.current, activeCam);

      const dataUrl = canvasRef.current.toDataURL('image/png');
      
      if (bgSphere) bgSphere.visible = prevBgVis;
      if (gridHelper) gridHelper.visible = prevGridVis;
      if (activeCam) rendererRef.current.render(sceneRef.current, activeCam);
      
      // Execute parent callback triggers to integrate beautifully across workspace
      onApplyAsElement(dataUrl);
      
      setShowSuccessToast(true);
      setStatusMessage('¡Modelo 3D acoplado con Inteligencia Artificial! Redirigiendo a tu entorno virtual 360°...');
      setTimeout(() => {
        setShowSuccessToast(false);
        if (onRedirectToEnvironment) {
          onRedirectToEnvironment();
        }
      }, 2500);
    } catch (e) {
      console.error('Core binding exception:', e);
      setStatusMessage('Error al acoplar el elemento en el canvas.');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* 3D Settings Controls - Column Span 5 */}
      <div className="xl:col-span-5 space-y-6">
        {/* Core Product Upload or Selector */}
        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-black flex items-center gap-1.5">
              <Box className="text-neon-blue" size={14} /> 1. Imagen de Referencia Plana
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 text-[8px] border border-white/10 rounded-lg hover:border-neon-blue/30 text-white/70 hover:text-white uppercase font-black transition-all"
            >
              Cargar Nueva
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleUploadImage}
              accept="image/*"
              className="hidden" 
            />
          </div>

          {localImage ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 relative">
                <img src={localImage} alt="Flat Product" className="w-16 h-16 object-contain rounded-lg bg-black/20 border border-white/10" />
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] text-neon-blue font-bold uppercase tracking-widest block">Producto Cargado</span>
                  <p className="text-xs font-bold text-white truncate uppercase font-orbitron">{productName || 'Producto Editado'}</p>
                  <p className="text-[8.5px] text-white/40 block">Listo para extrusión tridimensional inteligente.</p>
                </div>
              </div>
              <button 
                onClick={handleProductStudioRefine}
                disabled={isStudioProcessing}
                className="w-full py-2 rounded-lg bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neon-blue hover:text-black transition-all"
              >
                {isStudioProcessing ? <Cpu className="animate-spin" size={12} /> : <Sparkles size={12} />}
                OPTIMIZAR CON PRODUCT STUDIO (30 C.)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border border-dashed border-white/10 rounded-xl hover:border-neon-blue/40 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-black/20"
              >
                <Upload className="text-neon-blue/40" size={24} />
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-extrabold">Haz clic para subir un producto plano</span>
                <span className="text-[7.5px] text-white/20 uppercase tracking-widest leading-relaxed">PNG o JPG con fondo neutro</span>
              </div>
            </div>
          )}
        </div>

        {/* Tripo 3D Dynamic Generative Card */}
        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-black flex items-center gap-1.5">
              <Sparkles className="text-purple-400" size={14} /> 2. Convierte tu producto en 3D
            </span>
          </div>

          <div className="text-[10px] text-white/50 leading-relaxed uppercase space-y-3">
            <p className="text-[9px] text-white/60 lowercase first-letter:uppercase leading-normal">
              Genera una malla real tridimensional completa (.glb) con texturas integradas, sombras y mapa UV usando redes neuronales avanzadas.
            </p>

            {localImage ? (
              <div className="space-y-3">
                {isTripoProcessing ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[8px] font-bold text-purple-400 uppercase tracking-widest">
                      <span>Procesando Malla Generativa</span>
                      <span>{tripoProgress}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-neon-blue h-full transition-all duration-300"
                        style={{ width: `${tripoProgress}%` }}
                      />
                    </div>
                    <p className="text-[8px] text-white/40 text-center animate-pulse">Por favor, espera unos instantes...</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateTripo3D}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9.5px] font-black uppercase tracking-wider transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-400/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Cpu className="animate-pulse" size={12} />
                    <span>GENERAR MODELO AI</span>
                  </button>
                )}

                {tripoError && (
                  <div className="text-[8.5px] text-rose-400 bg-rose-500/5 p-2.5 border border-rose-500/15 rounded-lg font-mono">
                     ❌ Error: {tripoError}
                  </div>
                )}

                {tripoGlbUrl && (
                  <div className="space-y-2 bg-purple-500/5 p-3 border border-purple-500/10 rounded-xl">
                    <div className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">
                      ✨ Modelo 3D Listo:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={tripoGlbUrl}
                        download={`${productName.toLowerCase().replace(/\s+/g, "_")}_tripo.glb`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[8px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1"
                      >
                        <Download size={10} /> Descargar GLB
                      </a>
                      {tripoPreviewUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocalImage(tripoPreviewUrl);
                            onPreviewCreated(tripoPreviewUrl);
                            setStatusMessage("Cargado preview de Tripo como textura activa.");
                          }}
                          className="py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-[8px] font-bold uppercase text-center flex items-center justify-center gap-1 border border-white/5"
                        >
                          Usar Render
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[8px] text-white/30 text-center uppercase py-2">
                ⚠️ Carga una imagen para habilitar la generación real AI 3D.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas Visualizer - Column Span 7 */}
      <div className="xl:col-span-7 flex flex-col h-full space-y-4">
        <div className="flex-1 flex flex-col justify-between rounded-3xl bg-black/60 border border-white/5 p-6 relative group min-h-[420px]">
          {/* Top Status and Reset Controls */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-neon-blue rounded-full animate-pulse animate-glow" />
              <span className="text-[9px] font-orbitron text-neon-blue uppercase tracking-widest font-black">simulador inmersivo VR 360° con renderizado esférico WebGL</span>
            </div>
            {localImage && (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setPitch(0);
                    setYaw(0);
                    setRoll(0);
                    setStatusMessage('Rotación e inclinación reseteadas.');
                  }}
                  className="text-[8.5px] text-white/40 hover:text-white uppercase font-black tracking-widest flex items-center gap-1 transition-all"
                >
                  <RefreshCw size={9} /> Reset Guiado
                </button>
              </div>
            )}
          </div>

          {/* Core Interactive Three.js Container */}
          <div ref={containerRef} className="flex-1 h-full w-full min-h-[280px] relative flex items-center justify-center cursor-move">
            {localImage ? (
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" id="product_model_3d_canvas" />
            ) : (
              <div className="text-center p-8 max-w-sm space-y-3 z-10">
                <Box className="mx-auto text-white/10 animate-pulse" size={60} />
                <h4 className="font-orbitron font-black text-white text-xs uppercase tracking-widest">Simulador Inmersivo VR 360°</h4>
                <p className="text-[10px] text-white/40 leading-relaxed uppercase">
                  Sube una foto plana de tu producto en el panel izquierdo. El motor de Inteligencia Neural generará una representación del producto con conversión volumétrica perfecta para previsualizarlo de forma inmersiva dentro de un domo esférico de 360 grados.
                </p>
              </div>
            )}

            {/* Quick interactive floating tutorial instruction info */}
            {localImage && (
              <div className="absolute top-3 left-3 bg-black/80 px-2 py-1 rounded border border-white/5 text-[8.5px] text-white/50 tracking-wide block pointer-events-none uppercase">
                🖱️ Arrastra con el mouse/dedo para rotar en 3D
              </div>
            )}
          </div>

          {/* Action trigger buttons */}
          {localImage && (
            <div className="space-y-4 pt-3 border-t border-white/5 bg-black/20 p-3 rounded-2xl relative">
              {/* Manual angles adjustment panel */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[7.5px] text-white/40 block uppercase font-black">Ángulo Inclinación (Pitch)</span>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    value={Math.round(pitch)}
                    onChange={(e) => {
                      setAutoRotate(false);
                      setPitch(Number(e.target.value));
                    }}
                    className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer mt-1"
                  />
                  <span className="text-[9px] text-neon-blue font-mono font-bold">{Math.round(pitch)}°</span>
                </div>
                <div>
                  <span className="text-[7.5px] text-white/40 block uppercase font-black">Ángulo Rotación (Yaw)</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={Math.round(yaw)}
                    onChange={(e) => {
                      setAutoRotate(false);
                      setYaw(Number(e.target.value));
                    }}
                    className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer mt-1"
                  />
                  <span className="text-[9px] text-neon-blue font-mono font-bold">{Math.round(yaw)}°</span>
                </div>
                <div>
                  <span className="text-[7.5px] text-white/40 block uppercase font-black">Giro Lateral (Roll)</span>
                  <input
                    type="range"
                    min="-90"
                    max="90"
                    value={Math.round(roll)}
                    onChange={(e) => {
                      setAutoRotate(false);
                      setRoll(Number(e.target.value));
                    }}
                    className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer mt-1"
                  />
                  <span className="text-[9px] text-neon-blue font-mono font-bold">{Math.round(roll)}°</span>
                </div>
              </div>

              {/* Autoplay spin control */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[8.5px] text-white/40 uppercase font-black flex items-center gap-1">
                  <Maximize2 size={10} className="text-neon-blue" /> Modo de Visualización Dinámica
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`px-2.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      autoRotate ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/35' : 'bg-white/5 text-white/40'
                    }`}
                  >
                    Rotar Solito: {autoRotate ? 'ON' : 'OFF'}
                  </button>
                  {autoRotate && (
                    <div className="flex items-center gap-1">
                      <span className="text-[7px] text-white/30 uppercase">Velocidad</span>
                      <select
                        value={rotationSpeed}
                        onChange={(e) => setRotationSpeed(Number(e.target.value))}
                        className="bg-black border border-white/10 rounded px-1 text-[8px] text-white"
                      >
                        <option value="0.5">0.5x</option>
                        <option value="1">1.0x</option>
                        <option value="2">2.0x</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Master trigger buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={handleExportGLBFile}
                  disabled={isProcessing}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-neon-blue text-white text-[9.5px] font-bold uppercase transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-400/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Download size={12} />
                  <span>Descargar 3D (.GLB)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="py-3 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[9.5px] font-bold uppercase transition-all hover:scale-105 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={12} className="text-neon-blue" />
                  <span>Capturar Render (.PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyTo360}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[9.5px] font-black uppercase tracking-wider transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={11} className="text-emerald-300 animate-pulse" />
                  <span>Acoplar a Entornos 360°</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic status feedback line */}
        {statusMessage && (
          <div className="p-3 bg-neon-blue/5 rounded-xl border border-neon-blue/10 flex items-center justify-between animate-fade-in">
            <span className="text-[9.5px] font-mono text-neon-blue uppercase tracking-wider font-extrabold flex items-center gap-1.5">
              <Cpu size={12} className="animate-spin" /> {statusMessage}
            </span>
          </div>
        )}

        {/* Floating SUCCESS notification toast */}
        {showSuccessToast && (
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 text-[10px] leading-relaxed uppercase tracking-wider font-bold animate-pulse">
            ✨ PRODUCTO ACOPLADO EXITOSAMENTE: El volumen de este producto se ha configurado como asset de referencia. Ya puedes ir a la herramienta &quot;Imágenes 360°&quot; o &quot;Video VR 360°&quot;, abrir el visor VR, habilitar &quot;Cargar Modelo&quot;, ¡y colocar tu producto texturizado en cualquier coordenada de tus mundos virtuales!
          </div>
        )}
      </div>
    </div>
  );
}
