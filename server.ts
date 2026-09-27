import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI on the server side using the runtime environment GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('[Server] Failed to initialize GoogleGenAI client:', err);
  }
}

// Server-side AI Proxy Route to protect credentials and handle model calls
app.post('/api/analyze-vehicle', async (req, res) => {
  try {
    const { vehicle, userInstruction } = req.body;
    if (!vehicle) {
      return res.status(400).json({ error: 'Vehicle record is required' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Gemini API client not initialized. GEMINI_API_KEY may not be set in the server environment.',
      });
    }

    const prompt = `You are "Last Mile", an automotive safety recall AI agent for an OEM and its dealer network.
Problem context: "OTA Released != Recall Completed". A vehicle safety recall may be distributed through an OTA software update, but releasing the OTA does not mean the customer actually completes the recall. Some customers delay, experience previous OTA failures, or have connectivity/battery lockout problems.
CORE PRINCIPLE: The goal is NOT to assign a "credit score" to a person. Instead, you predict: "Is this specific safety recall likely to remain incomplete, and what is the most appropriate intervention?" You must analyze multiple signals together, explain WHY the risk exists (situational/environmental/invariants), and recommend the next action.

Vehicle & Owner Dossier:
- Model: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.trim})
- VIN: ${vehicle.vin}
- Owner: ${vehicle.ownerName}, ${vehicle.ownerCity}, ${vehicle.ownerState}
- Recall Campaign: NHTSA ${vehicle.nhtsaCode} - ${vehicle.campaignTitle}
- Behavior Profile: ${vehicle.signals?.behaviorProfile}
- Days Pending: ${vehicle.daysPending} days
- Download Attempts: ${vehicle.signals?.downloadAttempts}
- Last Error Code: ${vehicle.signals?.errorCode || vehicle.signals?.lastErrorCode || 'None'}
- Cellular Signal: ${vehicle.signals?.connectivity?.cellularSignalDbm || vehicle.signals?.cellularSignalDbm} dBm
- WiFi Available: ${vehicle.signals?.connectivity?.wifiAvailable ? 'Yes' : 'No'}
- Recent Vehicle Activity: ${vehicle.signals?.recentVehicleActivity?.dailyDrivingHours || vehicle.signals?.dailyDrivingHours} hrs/day, overnight dwell ${vehicle.signals?.recentVehicleActivity?.overnightDwellHours || 8}h at ${vehicle.signals?.recentVehicleActivity?.parkingLocationType || vehicle.signals?.parkingEnvironment}
- User Postponements: ${vehicle.signals?.customerDeferralCount} times
- Official Inbound Customer Request: ${vehicle.customerRequestTicket?.customerStatedRequest || 'None'}
${userInstruction ? `Additional Guidance: ${userInstruction}` : ''}

Respond with a JSON object strictly following this JSON schema:
{
  "rootCauseSummary": "A concise 2-sentence explanation of why the update remains incomplete (focusing strictly on engineering, environmental, or situational bottlenecks)",
  "barrierArchetype": "INFRASTRUCTURE_GAP" | "OPERATIONAL_LOCKOUT" | "EXPERIENCE_APPREHENSION" | "FLEET_WINDOW_CONFLICT",
  "explainabilityNarrative": "A detailed 1-2 paragraph humanized explanation of the multi-signal deadlock without blaming the owner",
  "customerOfferText": "An empathetic, respectful, transparent message to the owner explaining the safety recall and proposing the specific intervention",
  "interventionTitle": "Title of the most fitting intervention (e.g. Mobile Tech Van, Dealer Valet with Loaner, Express Supercharger Concierge)",
  "interventionChannel": "MOBILE_SERVICE" | "DEALER_VALET" | "SUPERCHARGER_CONCIERGE" | "SCHEDULED_PRECONDITION",
  "whyThisFits": "Why this specific intervention overcomes the identified bottlenecks",
  "estimatedHours": 24,
  "keySignals": [
    { "label": "Signal Name", "detail": "Specific observation", "severity": "CRITICAL" | "MODERATE" | "LOW" }
  ]
}`;

    // Use current recommended text model: gemini-3.8-flash (or gemini-2.5-flash fallback)
    let response;
    try {
      response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
    } catch (modelErr: any) {
      console.warn('[Server] gemini-3.8-flash call failed, trying gemini-2.5-flash:', modelErr?.message);
      response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
    }

    const responseText = response?.text?.trim() || '';
    if (!responseText) {
      return res.status(502).json({ error: 'Empty response received from Gemini model' });
    }

    const parsed = JSON.parse(responseText);
    return res.json(parsed);
  } catch (error: any) {
    console.error('[Server] Gemini Analysis Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate analysis from Gemini model',
    });
  }
});

// Mount Vite middleware in development
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Dev server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
