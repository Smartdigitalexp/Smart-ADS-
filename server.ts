import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

console.log("Starting server entry point...");

dotenv.config();

// Initialize Firebase Admin
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  console.error("CRITICAL: firebase-applet-config.json NOT FOUND");
}
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

console.log("Initializing Firebase Admin for project:", firebaseConfig.projectId);

if (!admin.apps.length) {
  try {
    // If we're in a Google Cloud environment (like AI Studio), 
    // it's often better to initialize without explicit config to use ADC.
    // We'll fall back to explicit config if needed.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
      admin.initializeApp();
      console.log("Firebase Admin initialized via default credentials.");
    } else {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
      console.log("Firebase Admin initialized with explicit projectId.");
    }
  } catch (error) {
    console.error("Firebase Admin Init Error:", error);
    // Absolute fallback
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  }
}

let db: admin.firestore.Firestore;
try {
  const dbId = (firebaseConfig.firestoreDatabaseId || "").trim();
  
  if (dbId && dbId !== "(default)") {
    console.log("Using specific Firestore database ID:", dbId);
    // Try to get it without explicit app first, which uses the default app
    db = getFirestore(dbId);
  } else {
    console.log("Using default Firestore database.");
    db = getFirestore();
  }
  
  // Log more details to help debug PERMISSION_DENIED
  const actualDbId = (db as any)._databaseId || (db as any).databaseId || "(default)";
  const settings = (db as any)._settings || {};
  console.log(`Firestore Admin instance ready. Database: ${actualDbId} (Project: ${settings.projectId || "default"})`);
} catch (e) {
  console.error("FATAL: Failed to initialize Firestore Admin Instance:", e);
  throw e;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint for Cloud Run
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // --- Credit & Payment Routes ---

  // 1. Initial Credits for new users
  app.post("/api/user/initialize", async (req, res) => {
    const { userId, email } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // Force unlimited for specific admin
        const initialCredits = email === 'smartdigitalexperience@gmail.com' ? -1 : 60;
        await userRef.set({
          email,
          credits: initialCredits,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          multiVariantEnabled: true
        });
        return res.json({ credits: initialCredits, isNew: true });
      }

      const data = userDoc.data();
      let credits = data?.credits ?? 0;
      if (data?.email === 'smartdigitalexperience@gmail.com') {
        credits = -1;
      }
      res.json({ credits, isNew: false });
    } catch (error: any) {
      console.error("Init Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Bold Payment Webhook
  // Bold sends notifications to this URL. You must set this in the Bold dashboard.
  app.post("/api/payments/bold-webhook", async (req, res) => {
    const payload = req.body;
    // Bold usually sends: order_id, status, amount, and custom data (like our userId)
    // In LNK payments, we might not have user info unless we used metadata.
    // For this example, we assume the link included metadata or we correlate via order_id.
    
    console.log("Bold Webhook Received:", JSON.stringify(payload, null, 2));

    const { status, order_id, amount, metadata } = payload;
    const userId = metadata?.userId || payload.userId; // Bold might pass this if configured

    if (status === "APPROVED" && userId) {
      let creditsToAdd = 0;
      const price = parseFloat(amount);

      // Match prices to credits as per user request
      if (price >= 500) creditsToAdd = -1; // Unlimited
      else if (price >= 300) creditsToAdd = 5000;
      else if (price >= 200) creditsToAdd = 3000;
      else if (price >= 100) creditsToAdd = 1000;
      else if (price >= 50) creditsToAdd = 500;
      else if (price >= 30) creditsToAdd = 300;

      try {
        const userRef = db.collection("users").doc(userId);
        if (creditsToAdd === -1) {
          await userRef.update({ credits: -1 });
        } else {
          await userRef.update({
            credits: admin.firestore.FieldValue.increment(creditsToAdd)
          });
        }
        console.log(`Added ${creditsToAdd} credits to user ${userId}`);
      } catch (err) {
        console.error("Error updating credits via webhook:", err);
      }
    }

    res.status(200).send("OK");
  });

  // 3. Deduct Credits
  app.post("/api/user/credits/deduct", async (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: "Missing params" });

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      
      const userData = userDoc.data();
      const currentCredits = userData?.credits;
      
      if (currentCredits === -1 || userData?.email === 'smartdigitalexperience@gmail.com') {
        return res.json({ success: true, remaining: -1 });
      }

      if (currentCredits < amount) {
        return res.status(403).json({ error: "Insufficient credits", remaining: currentCredits });
      }

      const newCredits = currentCredits - amount;
      await userRef.update({ credits: newCredits });
      
      res.json({ success: true, remaining: newCredits });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
      } else if (objective === 'Tráfico' || objective === 'Traffic') {
        metaObjective = 'OUTCOME_TRAFFIC';
        optimizationGoal = 'LANDING_PAGE_VIEWS';
      } else if (objective === 'Leads') {
        metaObjective = 'OUTCOME_LEADS';
      } else if (objective === 'Reconocimiento') {
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
        daily_budget: budgetValue,
        billing_event: billingEvent,
        optimization_goal: optimizationGoal,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
          geo_locations: { countries: ['CO'] }, 
          publisher_platforms: []
        },
        status: 'PAUSED',
        destination_type: destinationType
      };

      if (promotedObject) adSetData.promoted_object = promotedObject;

      const platforms = [];
      if (facebookEnabled !== false) platforms.push('facebook');
      if (instagramEnabled !== false) platforms.push('instagram');
      adSetData.targeting.publisher_platforms = platforms.length > 0 ? platforms : ['facebook', 'instagram'];

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
