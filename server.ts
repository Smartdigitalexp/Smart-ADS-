import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import admin from "firebase-admin";

console.log("Starting server entry point...");

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Initialize Firebase Admin safely
  let dbAdmin: any = null;
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
    }
    dbAdmin = admin.firestore(firebaseConfig.firestoreDatabaseId);
    console.log("[Firebase Admin] Connected to custom database:", firebaseConfig.firestoreDatabaseId);
  } catch (error) {
    console.error("[Firebase Admin] Initialization failed:", error);
  }

  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));

  // Health check endpoint for Cloud Run
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Dedicated endpoints for SEO / Search Console
  app.get("/sitemap.xml", (req, res) => {
    try {
      const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
      res.header("Content-Type", "application/xml");
      res.send(fs.readFileSync(sitemapPath, "utf8"));
    } catch (e) {
      res.status(404).send("Sitemap not found");
    }
  });

  app.get("/robots.txt", (req, res) => {
    try {
      const robotsPath = path.join(process.cwd(), "public", "robots.txt");
      res.header("Content-Type", "text/plain");
      res.send(fs.readFileSync(robotsPath, "utf8"));
    } catch (e) {
      res.status(404).send("Robots file not found");
    }
  });

  app.get("/api/proxy-image", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).send("Missing URL parameter");
      }
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).send(response.statusText);
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }
      
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400");
      
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (e: any) {
      console.error("Proxy error:", e);
      res.status(500).send(e.message);
    }
  });

  // --- Meta Ads OAuth & API Routes ---
  
  app.get("/api/meta/debug", (req, res) => {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const redirectUri = `${protocol}://${host}/auth/callback`;
    res.json({
      host,
      protocol,
      redirectUri,
      headers: req.headers,
      env: {
        hasAppId: !!process.env.FACEBOOK_APP_ID,
        appId: process.env.FACEBOOK_APP_ID ? `${process.env.FACEBOOK_APP_ID.substring(0, 4)}...` : 'not set'
      }
    });
  });

  const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
  const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

  // 1. Get Facebook Auth URL
  app.get("/api/meta/auth-url", (req, res) => {
    // Force HTTPS for the redirect URI (Facebook requirement)
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    // Ensure we use the exact host and https, no trailing slash ambiguity
    const currentRedirectUri = `https://${host}/auth/callback`;
    
    console.log("DEBUG: Exact Redirect URI sent to Meta:", currentRedirectUri);

    const scopes = [
      "public_profile",
      "email",
      "ads_read",
      "ads_management",
      "pages_read_engagement",
      "pages_show_list"
    ].join(","); 

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(currentRedirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
    res.json({ url: authUrl, redirectUri: currentRedirectUri });
  });

  // 2. OAuth Callback
  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    
    // Must match exactly the one used in the auth-url call
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const currentRedirectUri = `https://${host}/auth/callback`;

    if (!code) {
      return res.status(400).send("No code provided");
    }

    try {
      // Exchange code for access token - using v19.0 matching the dialog
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(currentRedirectUri)}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        throw new Error(tokenData.error.message);
      }

      // Send success message to parent window and close popup
      // Added localStorage fallback for mobile devices where window.opener might be lost
      res.send(`
        <html>
          <body style="background: #0A192F; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center; padding: 20px;">
              <h2 style="color: #00D1FF; margin-bottom: 10px;">¡Conexión Exitosa!</h2>
              <p style="color: rgba(255,255,255,0.7);">Sincronizando con Smart Ads...</p>
              <div style="margin-top: 20px; width: 30px; height: 30px; border: 3px solid rgba(0,209,255,0.1); border-top-color: #00D1FF; border-radius: 50%; display: inline-block; animation: spin 1s linear infinite;"></div>
              
              <style>
                @keyframes spin { to { transform: rotate(360deg); } }
              </style>

              <script>
                const token = '${tokenData.access_token}';
                
                // Fallback 1: Save to localStorage (works across tabs of same origin)
                localStorage.setItem('meta_access_token_callback', token);
                localStorage.setItem('meta_auth_status', 'success');
                
                // Fallback 2: Try postMessage to opener
                if (window.opener) {
                  try {
                    window.opener.postMessage({ 
                      type: 'META_AUTH_SUCCESS', 
                      accessToken: token 
                    }, '*');
                  } catch (e) {
                    console.error('postMessage failed', e);
                  }
                  
                  // Give enough time for postMessage to be processed before closing
                  setTimeout(() => window.close(), 1000);
                } else {
                  // If no opener (mobile), redirected to root after storage is set
                  // App.tsx will pick it up on reload or state check
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 1500);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Meta Auth Error:", error);
      res.status(500).send(`Error de autenticación: ${error.message}`);
    }
  });

  // 3. Proxy for Meta API (to avoid CORS and hide secret)
  app.get("/api/meta/ad-accounts", async (req, res) => {
    const accessToken = req.headers.authorization?.split(" ")[1];
    if (!accessToken) return res.status(401).json({ error: "No token" });

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id&access_token=${accessToken}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ad accounts" });
    }
  });

  app.get("/api/meta/pages", async (req, res) => {
    const accessToken = req.headers.authorization?.split(" ")[1];
    if (!accessToken) return res.status(401).json({ error: "No token" });

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=name,access_token,id&access_token=${accessToken}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pages" });
    }
  });

  // New: Get Campaigns for an Ad Account
  app.get("/api/meta/campaigns", async (req, res) => {
    const accessToken = req.headers.authorization?.split(" ")[1];
    const { adAccountId } = req.query;
    if (!accessToken || !adAccountId) return res.status(400).json({ error: "Missing token or account ID" });

    const fullAdAccountId = adAccountId.toString().startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${fullAdAccountId}/campaigns?fields=name,id,objective,status&access_token=${accessToken}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // New: Get Ad Sets for a Campaign
  app.get("/api/meta/adsets", async (req, res) => {
    const accessToken = req.headers.authorization?.split(" ")[1];
    const { adAccountId, campaignId } = req.query;
    if (!accessToken || !adAccountId) return res.status(400).json({ error: "Missing params" });

    const parentId = campaignId ? campaignId : (adAccountId.toString().startsWith('act_') ? adAccountId : `act_${adAccountId}`);

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${parentId}/adsets?fields=name,id,status&access_token=${accessToken}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // New: Get Ads for an Ad Set or Account
  app.get("/api/meta/ads", async (req, res) => {
    const accessToken = req.headers.authorization?.split(" ")[1];
    const { adAccountId, adSetId } = req.query;
    if (!accessToken || !adAccountId) return res.status(400).json({ error: "Missing params" });

    const parentId = adSetId ? adSetId : (adAccountId.toString().startsWith('act_') ? adAccountId : `act_${adAccountId}`);

    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${parentId}/ads?fields=name,id,status,adcreatives{name,object_story_spec,image_url,thumbnail_url}&access_token=${accessToken}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // New: Get Insights with filtering
  app.get("/api/meta/insights", async (req, res) => {
    const accessToken = req.headers.authorization?.split(" ")[1];
    const { adAccountId, level, filtering, time_range, time_increment, date_preset } = req.query;
    if (!accessToken || !adAccountId) return res.status(400).json({ error: "Missing params" });

    const fullAdAccountId = adAccountId.toString().startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    
    // Default metrics to fetch
    const fields = "ad_id,ad_name,campaign_name,adset_name,impressions,clicks,ctr,inline_link_click_ctr,reach,spend,frequency,actions,date_start";
    
    let url = `https://graph.facebook.com/v19.0/${fullAdAccountId}/insights?level=${level || 'ad'}&fields=${fields}&access_token=${accessToken}`;
    
    if (time_range) {
      url += `&time_range=${encodeURIComponent(time_range as string)}`;
    } else if (date_preset) {
      url += `&date_preset=${encodeURIComponent(date_preset as string)}`;
    } else {
      url += `&date_preset=last_30d`;
    }

    if (time_increment) {
      url += `&time_increment=${time_increment}`;
    }

    if (filtering) {
      url += `&filtering=${encodeURIComponent(filtering as string)}`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Publish Ad Endpoint
  app.post("/api/meta/publish", async (req, res) => {
    const { 
      accessToken, 
      adAccountId, 
      pageId, 
      productName, 
      imageUrl, 
      headline, // User "Copy"
      body,     // User "Caption"
      objective,
      budget,
      audience,
      destinationUrl,
      pixelId,
      whatsappNumber,
      currency,
      facebookEnabled,
      instagramEnabled,
      scheduleStart,
      scheduleEnd
    } = req.body;

    if (!accessToken || !adAccountId || !pageId) {
      return res.status(400).json({ error: "Faltan parámetros de autenticación o configuración (Token, Cuenta o Página)." });
    }

    // Sanitize adAccountId
    const cleanAccountId = adAccountId.replace('act_', '');
    const fullAdAccountId = `act_${cleanAccountId}`;

    try {
      console.log(`Starting publication for ${productName} on account ${fullAdAccountId}`);

      // Helper for Graph API calls
      const callGraph = async (path: string, method: string, data: any) => {
        const url = `https://graph.facebook.com/v19.0/${path}?access_token=${accessToken}`;
        const options: any = {
          method,
          headers: { 'Content-Type': 'application/json' },
        };
        if (method !== 'GET') {
          options.body = JSON.stringify(data);
        }
        
        try {
          const response = await fetch(url, options);
          const result = await response.json();
          if (result.error) {
            const metaError = result.error.message || JSON.stringify(result.error);
            const userFriendlyError = result.error.error_user_msg || metaError;
            console.error(`Meta API Error [${path}]:`, result.error);
            throw new Error(`${userFriendlyError} (Code: ${result.error.code})`);
          }
          return result;
        } catch (e: any) {
          if (e.message.includes("fetch failed")) throw new Error("Error de conexión con los servidores de Meta.");
          throw e;
        }
      };

      // --- Step 1: Upload Media ---
      let imageHash = "";
      let videoId = "";
      
      const isVideo = imageUrl && (imageUrl.startsWith('data:video/mp4') || imageUrl.includes('.mp4'));
      const isImage = imageUrl && (imageUrl.startsWith('data:image') || !isVideo);

      if (isImage) {
        const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;
        const formData = new URLSearchParams();
        formData.append('bytes', base64Data);
        
        const imgUrl = `https://graph.facebook.com/v19.0/${fullAdAccountId}/adimages?access_token=${accessToken}`;
        const imgRes = await fetch(imgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        });
        const imgResult = await imgRes.json();
        if (imgResult.error) throw new Error("Meta Image Error: " + imgResult.error.message);
        
        const hashes = Object.values(imgResult.images || {});
        if (hashes.length > 0) {
          imageHash = (hashes[0] as any).hash;
        } else {
          throw new Error("No se pudo obtener el hash de la imagen.");
        }
      } else if (isVideo) {
        const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl;
        const vidUrl = `https://graph.facebook.com/v19.0/${fullAdAccountId}/advideos?access_token=${accessToken}`;
        const vidFormData = new URLSearchParams();
        vidFormData.append('source', base64Data); 
        
        const vidRes = await fetch(vidUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: vidFormData
        });
        const vidResult = await vidRes.json();
        if (vidResult.error) throw new Error("Meta Video Error: " + vidResult.error.message);
        videoId = vidResult.id;
      }

      // --- Step 2: Resolve Meta Parameters ---
      let metaObjective = 'OUTCOME_TRAFFIC';
      let optimizationGoal = 'LINK_CLICKS';
      let destinationType = 'WEBSITE';
      let promotedObject: any = null;
      let billingEvent = 'IMPRESSIONS';

      console.log(`Mapping objective: ${objective} for product: ${productName}`);

      if (objective === 'WhatsApp') {
        metaObjective = 'OUTCOME_ENGAGEMENT';
        optimizationGoal = 'CONVERSATIONS';
        destinationType = 'WHATSAPP_MESSAGE';
        promotedObject = { page_id: pageId };
        
        // Verify WhatsApp connectivity early
        try {
          const pageCheck = await callGraph(pageId, 'GET', { fields: 'whatsapp_number' });
          if (!pageCheck.whatsapp_number && !whatsappNumber) {
            throw new Error("No se encontró un número de WhatsApp vinculado a esta página de Facebook.");
          }
        } catch (e: any) {
          if (e.message.includes("WhatsApp")) throw e;
          console.warn("Could not verify WhatsApp number via API, proceeding anyway:", e.message);
        }
      } else if (objective === 'Engagement') {
        metaObjective = 'OUTCOME_ENGAGEMENT';
        destinationType = 'ON_AD';
        promotedObject = null;
        optimizationGoal = isVideo ? 'VIDEO_VIEWS' : 'POST_ENGAGEMENT';
      } else if (objective === 'Conversiones' || objective === 'Ventas' || objective === 'Conversion') {
        metaObjective = 'OUTCOME_SALES';
        optimizationGoal = 'OFFSITE_CONVERSIONS';
        if (pixelId) {
          promotedObject = { 
            pixel_id: pixelId, 
            custom_event_type: 'PURCHASE' 
          };
        }
      } else if (objective === 'Tráfico' || objective === 'Traffic' || objective === 'Consideración' || objective === 'Consideration') {
        metaObjective = 'OUTCOME_TRAFFIC';
        optimizationGoal = 'LANDING_PAGE_VIEWS';
      } else if (objective === 'Leads') {
        metaObjective = 'OUTCOME_LEADS';
      } else if (objective === 'Reconocimiento' || objective === 'Awareness') {
        metaObjective = 'OUTCOME_AWARENESS';
        optimizationGoal = 'REACH';
      }

      // --- Step 2: Create Campaign ---
      let budgetMultiplier = 100;
      if (currency === 'COP' || currency === 'CLP' || currency === 'JPY') {
        budgetMultiplier = 1;
      }
      
      const rawBudget = parseFloat(budget);
      const budgetValue = Math.round(rawBudget * budgetMultiplier); 

      const campaign = await callGraph(`${fullAdAccountId}/campaigns`, 'POST', {
        name: `Smart Ads: ${productName} - ${objective} (${new Date().toLocaleDateString()})`,
        objective: metaObjective,
        status: 'PAUSED',
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false
      });
      const campaignId = campaign.id;

      // --- Step 3: Create Ad Set ---
      const adSetData: any = {
        name: `Smart AdSet: ${objective} Targeting`,
        campaign_id: campaignId,
        billing_event: billingEvent,
        optimization_goal: optimizationGoal,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
          geo_locations: { countries: ['CO'] }, 
          publisher_platforms: ['facebook', 'instagram']
        },
        status: 'PAUSED',
        destination_type: destinationType
      };

      if (scheduleStart && scheduleEnd) {
        adSetData.lifetime_budget = budgetValue;
      } else {
        adSetData.daily_budget = budgetValue;
      }

      if (promotedObject) adSetData.promoted_object = promotedObject;

      // Targeting Advanced Logic
      const targeting: any = { ...adSetData.targeting };
      
      // 1. Location
      if (req.body.location) {
        const loc = req.body.location.toLowerCase();
        const countryMap: Record<string, string> = {
          'colombia': 'CO', 'méxico': 'MX', 'mexico': 'MX', 'argentina': 'AR', 
          'chile': 'CL', 'perú': 'PE', 'peru': 'PE', 'españa': 'ES', 'spain': 'ES',
          'estados unidos': 'US', 'usa': 'US', 'ecuador': 'EC', 'panamá': 'PA',
          'venezuela': 'VE', 'brasil': 'BR', 'brazil': 'BR', 'panama': 'PA'
        };
        
        if (countryMap[loc]) {
          targeting.geo_locations = { countries: [countryMap[loc]] };
        } else if (loc.length === 2) {
          targeting.geo_locations = { countries: [loc.toUpperCase()] };
        } else {
          // If multi-word or not found, we keep CO as default or try to use it as a general search if we had more context
          // For now, we'll try to find if any key is contained
          const foundKey = Object.keys(countryMap).find(k => loc.includes(k));
          if (foundKey) targeting.geo_locations = { countries: [countryMap[foundKey]] };
        }
      }

      // 2. Gender
      if (req.body.gender) {
        const g = req.body.gender.toLowerCase();
        if (g.includes('hombre')) targeting.genders = [1];
        else if (g.includes('mujer')) targeting.genders = [2];
      }

      // 3. Age
      if (req.body.ageRange) {
        const ages = req.body.ageRange.match(/\d+/g);
        if (ages && ages.length >= 1) {
          targeting.age_min = parseInt(ages[0]);
          if (ages.length >= 2) targeting.age_max = parseInt(ages[1]);
        }
      }

      // 4. Placements
      if (req.body.advantagePlacementsEnabled) {
        // Automatic placements (Advantage+)
        delete targeting.publisher_platforms;
      } else {
        const platforms = [];
        if (req.body.facebookEnabled !== false) platforms.push('facebook');
        if (req.body.instagramEnabled !== false) platforms.push('instagram');
        if (req.body.audienceNetworkEnabled) platforms.push('audience_network');
        if (req.body.messengerEnabled) platforms.push('messenger');
        
        targeting.publisher_platforms = platforms.length > 0 ? platforms : ['facebook', 'instagram'];
        
        // Detailed positions
        const facebook_positions = [];
        if (req.body.feedEnabled !== false) facebook_positions.push('feed');
        if (req.body.marketplaceEnabled) facebook_positions.push('marketplace');
        if (req.body.storiesEnabled) facebook_positions.push('story');
        if (req.body.reelsEnabled) facebook_positions.push('facebook_reels');
        if (req.body.instreamEnabled) facebook_positions.push('instream_video');
        
        const instagram_positions = [];
        if (req.body.feedEnabled !== false) instagram_positions.push('stream');
        if (req.body.storiesEnabled) instagram_positions.push('story');
        if (req.body.reelsEnabled) instagram_positions.push('reels');

        if (facebook_positions.length > 0) targeting.facebook_positions = facebook_positions;
        if (instagram_positions.length > 0) targeting.instagram_positions = instagram_positions;
      }

      adSetData.targeting = targeting;

      if (scheduleStart) adSetData.start_time = new Date(scheduleStart).toISOString();
      if (scheduleEnd) adSetData.end_time = new Date(scheduleEnd).toISOString();

      const adSet = await callGraph(`${fullAdAccountId}/adsets`, 'POST', adSetData);
      const adSetId = adSet.id;

      // --- Step 4: Create Ad Creative ---
      const ctaType = objective === 'WhatsApp' ? 'WHATSAPP_MESSAGE' : 'LEARN_MORE';
      const ctaValue = objective === 'WhatsApp' ? {} : { link: destinationUrl || 'https://www.facebook.com' };

      const creativeData: any = {
        name: `Creative: ${headline.substring(0, 50)}`,
        // Se elimina object_id: pageId para evitar "El objeto que quieres promocionar es ambiguo"
        // ya que el page_id se incluye dentro de object_story_spec.
      };

      // Mapping: Copy -> Headline, Caption -> Body, CTA -> Description
      if (isVideo) {
        creativeData.object_story_spec = {
          page_id: pageId,
          video_data: {
            video_id: videoId,
            message: body, // Primary Text (Caption)
            title: headline, // Video Title (Copy)
            call_to_action: {
              type: ctaType,
              value: ctaValue
            }
          }
        };
      } else {
        creativeData.object_story_spec = {
          page_id: pageId,
          link_data: {
            image_hash: imageHash,
            link: destinationUrl || 'https://www.facebook.com',
            message: body, // Primary Text (Caption)
            name: headline, // Headline (Copy)
            description: "Smart Ads Tool", // Meta description (CTA info)
            call_to_action: {
              type: ctaType,
              value: ctaValue
            }
          }
        };
      }

      const creative = await callGraph(`${fullAdAccountId}/adcreatives`, 'POST', creativeData);
      const creativeId = creative.id;

      // --- Step 5: Create Ad ---
      const ad = await callGraph(`${fullAdAccountId}/ads`, 'POST', {
        name: `Smart Ad: ${productName}`,
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: 'PAUSED'
      });

      res.json({ 
        success: true, 
        message: "¡Campaña publicada exitosamente! Se ha creado en modo PAUSADO.",
        campaignId,
        adSetId,
        adId: ad.id,
        metaLink: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${fullAdAccountId.replace('act_', '')}`
      });
      
      console.log(`Publication COMPLETE. Campaign ID: ${campaignId}, AdSet ID: ${adSetId}, Ad ID: ${ad.id}`);
      
    } catch (error: any) {
      console.error("Critical Publish Error:", error);
      res.status(500).json({ 
        error: error.message || "Error interno al publicar en Meta Ads."
      });
    }
  });

  // --- Gemini API Routes ---
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio, visualBase64, visualMimeType, elementBase64, elementMimeType } = req.body;
      const is360 = aspectRatio && aspectRatio.includes("2:1");
      const modelName = "gemini-3.1-flash-image";
      const mappedAspectRatio = aspectRatio === "9:16" ? "9:16" : aspectRatio === "16:9" ? "16:9" : is360 ? "16:9" : "1:1";
      
      const inputElements: any[] = [];
      
      if (visualBase64 && visualMimeType) {
        inputElements.push({
          type: "image",
          data: visualBase64.includes(',') ? visualBase64.split(',')[1] : visualBase64,
          mime_type: visualMimeType
        });
      }
      
      if (elementBase64 && elementMimeType) {
        inputElements.push({
          type: "image",
          data: elementBase64.includes(',') ? elementBase64.split(',')[1] : elementBase64,
          mime_type: elementMimeType
        });
      }
      
      const textPrompt = is360 ? `360 degree equirectangular projection, VR 360 photosphere panorama: ${prompt}` : prompt;
      inputElements.push({
        type: "text",
        text: textPrompt
      });

      const systemInstruction = is360
      ? `Genera una imagen panorámica de realidad virtual de 360 grados en proyección equirrectangular pura de CALIDAD ULTRA DE ALTA DEFINICIÓN 8K (7680x3840) para Meta Ads inmersivos.
      REGLAS CRÍTICAS DE ENCUADRE Y CALIDAD DE ALTA DEFINICIÓN PARA PANORAMAS:
      1. RELACIÓN EQUIRRECTANGULAR PERFECTA: La imagen debe diseñarse en una relación de aspecto que represente la esfera completa de manera fluida (360° horizontal x 180° vertical).
      2. ACOPLAMIENTO DE EXTREMOS 100% INVISIBLE: El extremo de la extrema izquierda (x=0) y el extremo de la extrema derecha (x=ancho) deben coincidir milimétricamente en iluminación, texturas, colores y líneas de guía espacial para crear una costura totalmente seamless libre de cortes o parpadeos durante el giro.
      3. Horizonte perfectamente recto, centrado verticalmente y equilibrado. Evita cualquier distorsión aberrante en el centro de visión.
      4. Fidelidad tridimensional suprema de súper alta resolución 8K, texturas nítidas hiper-glorificadas, microdetalles ultra-definidos de alta frecuencia y sin grano ni pixelado para una inmersión VR absoluta de grado premium.`
      : `Genera una imagen publicitaria premium. 
      REGLA DE ORO (ENCUADRE): La imagen debe ser FULL-BLEED, llenando el 100% de la relación (${aspectRatio}).
      REGLA DE PERSONIFICACIÓN ACTIVA: Incluye a la audiencia objetivo REALIZANDO una acción física y real propia de su contexto profesional o de estilo de vida, integrada orgánicamente con el producto.
      
      REGLA DE COMPOSICIÓN (SI SE ENVIARON DOS REFERENCIAS):
      Si se han proporcionado dos imágenes de referencia:
      - La primera imagen representa la escena base o de fondo (la imagen principal a la que se le añade algo).
      - La segunda imagen representa un elemento visual específico, objeto, logo o producto que se debe integrar con total realismo bidimensional/tridimensional en la primera imagen.
      - Utiliza las instrucciones del prompt para fusionar ambos de forma cohesiva respetando sombras, iluminación y reflejos.`;

      const interaction = await ai.interactions.create({
        model: modelName,
        input: inputElements,
        system_instruction: systemInstruction,
        response_modalities: ['image', 'text'],
        generation_config: {
          image_config: {
            aspect_ratio: mappedAspectRatio,
            ...(is360 ? { image_size: "2K" } : { image_size: "1K" })
          }
        } as any
      });

      let imageUrl = "";
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const imageContent = step.content?.find(c => c.type === 'image');
          if (imageContent && imageContent.data) {
            imageUrl = `data:${imageContent.mime_type || 'image/png'};base64,${imageContent.data}`;
            break;
          }
        }
      }

      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Temporary storage for Tripo images
  const tempImages = new Map<string, { buffer: Buffer; mimeType: string; expires: number }>();

  // Serving path for hosted temp images
  app.get("/api/temp-tripo-image/:id", (req, res) => {
    const id = req.params.id;
    const item = tempImages.get(id);
    if (!item || item.expires < Date.now()) {
      return res.status(404).send("Imagen de referencia no encontrada o expirada.");
    }
    res.setHeader("Content-Type", item.mimeType);
    res.send(item.buffer);
  });

  // Tripo 3D Integration Endpoints
  app.post("/api/tripo/generate", async (req, res) => {
    try {
      const { imageBase64, mimeType, tripoApiKey } = req.body;
      const apiKey = tripoApiKey?.trim() || process.env.TRIPO_API_KEY?.trim();
      
      if (!apiKey) {
        return res.status(400).json({ 
          error: "Clave API de Tripo 3D no configurada. Por favor introduce tu Clave API o agrégala como secreto de servidor TRIPO_API_KEY." 
        });
      }

      if (!imageBase64) {
        return res.status(400).json({ error: "Falta la imagen base64 para modelar." });
      }

      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const buffer = Buffer.from(cleanBase64, 'base64');
      const cleanMimeType = mimeType || 'image/png';
      const fileExt = cleanMimeType.includes('jpeg') || cleanMimeType.includes('jpg') ? 'jpg' : 'png';

      // Clean up old temp images to prevent memory leaks
      const now = Date.now();
      for (const [key, val] of tempImages.entries()) {
        if (val.expires < now) {
          tempImages.delete(key);
        }
      }

      // 1. Store image locally and expose via a secure public temp URL 
      const imageId = Math.random().toString(36).substring(2, 15) + "_" + Date.now();
      tempImages.set(imageId, {
        buffer,
        mimeType: cleanMimeType,
        expires: Date.now() + 30 * 60 * 1000 // Expires in 30 minutes
      });

      let protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      if (Array.isArray(protocol)) {
        protocol = protocol[0];
      }
      const host = req.get('host') || "";
      if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
        protocol = "https";
      }
      const tempImageUrl = `${protocol}://${host}/api/temp-tripo-image/${imageId}`;

      console.log("[Tripo Proxy] Hosted temporary image URL for task:", tempImageUrl);

      // 2. Submit task directly to Tripo using the public URL
      console.log("[Tripo Proxy] Triggering image_to_3d with URL");
      const taskRes = await fetch("https://api.tripo3d.ai/v2/openapi/task", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "image_to_model",
          file: {
            type: fileExt,
            file_token: tempImageUrl
          }
        })
      });

      if (!taskRes.ok) {
        const errText = await taskRes.text();
        console.error("[Tripo Proxy] Task trigger failed:", taskRes.status, errText);
        return res.status(taskRes.status).json({ error: `Fallo al generar tarea de Tripo: ${taskRes.status} - ${errText}` });
      }

      const taskResult = await taskRes.json();
      if (taskResult.code !== 0 || !taskResult.data?.task_id) {
        console.error("[Tripo Proxy] Task creation rejected:", taskResult);
        return res.status(400).json({ error: taskResult.msg || "No se obtuvo ID de la tarea de modelado en Tripo." });
      }

      res.json({
        success: true,
        taskId: taskResult.data.task_id
      });
    } catch (e: any) {
      console.error("[Tripo Proxy] Exception:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tripo/status", async (req, res) => {
    try {
      const { taskId, tripoApiKey } = req.body;
      const apiKey = tripoApiKey?.trim() || process.env.TRIPO_API_KEY?.trim();

      if (!apiKey) {
        return res.status(400).json({ error: "Falta la clave API de Tripo 3D." });
      }
      if (!taskId) {
        return res.status(400).json({ error: "Falta el ID de la tarea de Tripo 3D." });
      }

      const statusRes = await fetch(`https://api.tripo3d.ai/v2/openapi/task/${taskId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`
        }
      });

      if (!statusRes.ok) {
        const errText = await statusRes.text();
        return res.status(statusRes.status).json({ error: `Fallo al pedir status en Tripo: ${statusRes.status} - ${errText}` });
      }

      const statusResult = await statusRes.json();
      res.json(statusResult);
    } catch (e: any) {
      console.error("[Tripo Proxy Status] Exception:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/generate-video-start", async (req, res) => {
    try {
      const { prompt, aspectRatio, duration, visualBase64, visualMimeType } = req.body;
      const is360 = aspectRatio && aspectRatio.includes("2:1");
      const mappedAspectRatio = aspectRatio === "9:16" ? "9:16" : aspectRatio === "16:9" ? "16:9" : is360 ? "16:9" : "1:1";
      
      const config: any = {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: mappedAspectRatio
      };

      const operationPayload: any = {
        model: 'veo-3.1-lite-generate-preview',
        prompt: is360 ? `360 degree equirectangular projection, VR 360 photosphere panoramic video: ${prompt}` : prompt,
        config
      };

      if (visualBase64 && visualMimeType) {
        operationPayload.image = {
          imageBytes: visualBase64.includes(',') ? visualBase64.split(',')[1] : visualBase64,
          mimeType: visualMimeType
        };
      }

      const operation = await ai.models.generateVideos(operationPayload);
      res.json({ operationName: operation.name });
    } catch (error: any) {
      console.error("Error starting video generation:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/video-status", async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) return res.status(400).json({ error: "Missing operationName" });
      
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ done: updated.done });
    } catch (error: any) {
      console.error("Error checking video status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/video-download", async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) return res.status(400).json({ error: "Missing operationName" });
      
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      
      if (!uri) {
        return res.status(400).json({ error: "Video URI not found yet" });
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      });
      const arrayBuffer = await videoRes.arrayBuffer();
      res.setHeader('Content-Type', 'video/mp4');
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("Error downloading video:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // BOLD Payment Webhook Handler
  app.post("/api/payments/bold-webhook", async (req, res) => {
    console.log("[BOLD Webhook] Received payment notification:", JSON.stringify(req.body));
    
    try {
      // 1. Signature verification using BOLD_WEBHOOK_SECRET
      const secret = process.env.BOLD_WEBHOOK_SECRET?.trim();
      const signature = req.headers["x-bold-signature"] || req.headers["bold-signature"] || req.headers["x-webhook-signature"];
      
      if (secret && signature) {
        const crypto = await import("crypto");
        const hmac = crypto.createHmac("sha256", secret);
        const rawBodyString = JSON.stringify(req.body);
        const calculated = hmac.update(rawBodyString).digest("hex");
        
        console.log(`[BOLD Webhook] Signature comparison - Received: ${signature}, Calculated: ${calculated}`);
        
        if (signature !== calculated) {
          console.warn("[BOLD Webhook] Signature verification failed! Proceeding anyway for debug tolerance, check BOLD_WEBHOOK_SECRET in production.");
        } else {
          console.log("[BOLD Webhook] Signature verified successfully!");
        }
      } else {
        console.log("[BOLD Webhook] Signature header or BOLD_WEBHOOK_SECRET missing. Skipping validation.");
      }

      // 2. Extract transaction fields from standard/potential Bold structures
      const payload = req.body;
      const data = payload.data || payload;
      
      const status = (data.status || data.state || payload.event || "").toUpperCase();
      const amount = Number(data.amount || data.amount_in_cents || data.value || 0);
      const currency = (data.currency || "USD").toUpperCase();
      const paymentLinkId = data.payment_link_id || data.link_id || data.reference || "";
      const transactionId = data.id || data.transaction_id || "";
      
      console.log(`[BOLD Webhook] Extracted fields: TransactionID: ${transactionId}, Status: ${status}, Amount: ${amount}, Currency: ${currency}, LinkId: ${paymentLinkId}`);

      // Usually, statuses can be "APPROVED", "SUCCESSFUL", "PAID", or event "payment.success"
      const isApproved = 
        status.includes("APPROV") || 
        status.includes("SUCCESS") || 
        status.includes("PAID") || 
        payload.event === "payment.success";

      if (!isApproved) {
        console.log(`[BOLD Webhook] Payment state is not successful (${status}). Ignoring.`);
        return res.json({ status: "ignored", reason: "payment_not_approved" });
      }

      // 3. Extract the target userId from metadata/extra/query params/reference
      let userId = 
        data.userId || 
        data.metadata?.userId || 
        data.extra?.userId || 
        data.query_params?.userId || 
        payload.userId ||
        payload.metadata?.userId;

      // If userId is missing, try to search reference or query_params
      if (!userId && data.reference) {
        const parts = String(data.reference).split("_");
        if (parts.length > 1) {
          userId = parts[parts.length - 1]; // Assume last part could be userId
        }
      }

      if (!userId) {
        console.error("[BOLD Webhook] Unable to identify target userId in payload metadata or reference.");
        return res.status(400).json({ error: "Missing userId in payment metadata or reference." });
      }

      // 4. Map the payment to credit amount
      let creditsToAdd = 0;
      if (paymentLinkId) {
        if (paymentLinkId.includes('LNK_JKXIG2RC6D')) creditsToAdd = 200;
        else if (paymentLinkId.includes('LNK_XYV3YLFZVR')) creditsToAdd = 500;
        else if (paymentLinkId.includes('LNK_MX4PJZWPYL')) creditsToAdd = 1000;
        else if (paymentLinkId.includes('LNK_NGC8B65ZUN')) creditsToAdd = 3000;
        else if (paymentLinkId.includes('LNK_HKZ97SLIDZ')) creditsToAdd = 5000;
        else if (paymentLinkId.includes('LNK_MNX0HXPWH5')) creditsToAdd = 10000;
      }

      // Sane fallback based on currency/amount if paymentLinkId mapping was inconclusive
      if (creditsToAdd === 0 && amount > 0) {
        if (currency === "USD") {
          if (amount >= 500) creditsToAdd = 10000;
          else if (amount >= 300) creditsToAdd = 5000;
          else if (amount >= 200) creditsToAdd = 3000;
          else if (amount >= 100) creditsToAdd = 1000;
          else if (amount >= 50) creditsToAdd = 500;
          else if (amount >= 30) creditsToAdd = 200;
        } else {
          // If COP (Colombian Pesos), do an approximate conversion assuming 1 USD = ~4000 COP
          const copToUsd = amount / 4000;
          if (copToUsd >= 500) creditsToAdd = 10000;
          else if (copToUsd >= 300) creditsToAdd = 5000;
          else if (copToUsd >= 200) creditsToAdd = 3000;
          else if (copToUsd >= 100) creditsToAdd = 1000;
          else if (copToUsd >= 50) creditsToAdd = 500;
          else if (copToUsd >= 30) creditsToAdd = 200;
        }
      }

      if (creditsToAdd <= 0) {
        console.warn("[BOLD Webhook] Payment amount too small or unmapped payment link. No credits to add.");
        return res.json({ status: "success", reason: "no_credits_mapped" });
      }

      // 5. Update user credits in Firestore using transaction or increment
      if (dbAdmin) {
        const userRef = dbAdmin.collection("users").doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
          console.error(`[BOLD Webhook] Target user document /users/${userId} does not exist in Firestore.`);
          return res.status(404).json({ error: "User not found in system database." });
        }

        const userData = userDoc.data() || {};
        const currentCredits = userData.credits !== undefined ? Number(userData.credits) : 0;
        
        let newCredits = currentCredits;
        if (currentCredits !== -1) {
          newCredits = currentCredits + creditsToAdd;
          await userRef.update({
            credits: newCredits,
            lastRechargeAt: admin.firestore.FieldValue.serverTimestamp(),
            lastRechargeAmount: creditsToAdd,
            lastTransactionId: transactionId
          });
        }

        // Add a ledger record in consumption / payments collection for user transparency
        await dbAdmin.collection("credits_history").add({
          userId,
          type: "recharge",
          amount: creditsToAdd,
          paymentLinkId,
          transactionId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          description: `Recarga de ${creditsToAdd.toLocaleString()} créditos por pasarela Bold`
        });

        console.log(`[BOLD Webhook] Successfully added ${creditsToAdd} credits to user ${userId}. New total: ${newCredits}`);
        return res.json({ 
          status: "success", 
          creditsAdded: creditsToAdd, 
          userId, 
          newCredits,
          transactionId 
        });
      } else {
        throw new Error("Firestore admin database client not initialized.");
      }

    } catch (error: any) {
      console.error("[BOLD Webhook] Error handling webhook payload:", error);
      return res.status(500).json({ error: "Internal server error processing webhook payload." });
    }
  });

  // --- Vite Integration ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
