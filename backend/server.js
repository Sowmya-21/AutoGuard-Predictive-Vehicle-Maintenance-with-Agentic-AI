const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { GoogleGenAI, Type } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'database.json');

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const isGeminiConfigured = () => !!geminiApiKey;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Helper to read database
const readDb = () => {
  if (!fs.existsSync(DB_PATH)) {
    const initialState = { users: [], fleetStates: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialState, null, 2));
    return initialState;
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database file, resetting:", error);
    return { users: [], fleetStates: {} };
  }
};

// Helper to write database
const writeDb = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing database file:", error);
  }
};

// --- AUTHENTICATION ENDPOINTS ---

app.post('/api/auth/signup', async (req, finalRes) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return finalRes.status(400).json({ error: "Email and password are required." });
  }

  const db = readDb();
  if (db.users.find(u => u.email === email)) {
    return finalRes.status(400).json({ error: "Email already registered." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = `backend-uid-${Math.random().toString(36).substr(2, 9)}`;
    const newUser = { uid, email, password: hashedPassword };
    db.users.push(newUser);
    writeDb(db);

    console.log(`👤 User signed up: ${email}`);
    finalRes.json({ uid, email });
  } catch (error) {
    console.error("Signup error:", error);
    finalRes.status(500).json({ error: "Internal server error during registration." });
  }
});

app.post('/api/auth/signin', async (req, finalRes) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return finalRes.status(400).json({ error: "Email and password are required." });
  }

  const db = readDb();
  const user = db.users.find(u => u.email === email);
  if (!user) {
    return finalRes.status(400).json({ error: "Invalid email or password." });
  }

  try {
    let isMatch = false;
    // Check if the stored password is a bcrypt hash
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Plain text fallback (for old pre-seeded users), auto-upgrade on successful login
      isMatch = (password === user.password);
      if (isMatch) {
        user.password = await bcrypt.hash(password, 10);
        writeDb(db);
        console.log(`🔒 Upgraded credentials to bcrypt hash for user: ${email}`);
      }
    }

    if (!isMatch) {
      return finalRes.status(400).json({ error: "Invalid email or password." });
    }

    console.log(`🔑 User signed in: ${email}`);
    finalRes.json({ uid: user.uid, email: user.email });
  } catch (error) {
    console.error("Signin error:", error);
    finalRes.status(500).json({ error: "Internal server error during authentication." });
  }
});

// --- FLEET STATE ENDPOINTS ---

app.post('/api/fleet/state', (req, finalRes) => {
  const { userId, state } = req.body;
  if (!userId || !state) {
    return finalRes.status(400).json({ error: "userId and state are required." });
  }

  const db = readDb();
  db.fleetStates[userId] = {
    ...state,
    lastUpdated: new Date().toISOString()
  };
  writeDb(db);

  finalRes.json({ success: true });
});

app.get('/api/fleet/state/:userId', (req, finalRes) => {
  const { userId } = req.params;
  if (!userId) {
    return finalRes.status(400).json({ error: "userId is required." });
  }

  const db = readDb();
  const userState = db.fleetStates[userId];

  if (!userState) {
    return finalRes.json({ vehicles: [], alerts: [], agentLogs: [], insights: [], dispatches: [] });
  }

  finalRes.json(userState);
});

// --- AI ORCHESTRATION ENDPOINTS ---

app.get('/api/ai/configured', (req, res) => {
  res.json({ configured: isGeminiConfigured() });
});

app.post('/api/ai/diagnose', async (req, res) => {
  const { vehicle } = req.body;
  if (!vehicle) {
    return res.status(400).json({ error: "Vehicle data is required." });
  }

  if (!isGeminiConfigured()) {
    return res.json({ report: "Gemini API Key not configured. Using simulated diagnosis: Engine overheating detected due to potential coolant leak." });
  }

  try {
    const prompt = `
      Act as an advanced automotive diagnostic AI.
      Analyze the following sensor data for vehicle ${vehicle.model} (ID: ${vehicle.id}, VIN: ${vehicle.vin}):
      - Engine Temp: ${vehicle.sensors.engineTemp}°C (Normal: 90-105)
      - Oil Pressure: ${vehicle.sensors.oilPressure} psi (Normal: 25-65)
      - Vibration: ${vehicle.sensors.vibrationLevel} mm/s (Normal: < 2.0)
      - Brake Wear: ${vehicle.sensors.brakeWear}%
      
      Provide a concise 2-sentence technical diagnosis of the potential failure mode and urgency.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ report: response.text || "Unable to generate diagnosis." });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Error generating diagnosis from AI." });
  }
});

app.post('/api/ai/manufacturing-insight', async (req, res) => {
  const { failureType, vehicleModel } = req.body;
  if (!failureType || !vehicleModel) {
    return res.status(400).json({ error: "failureType and vehicleModel are required." });
  }

  if (!isGeminiConfigured()) {
    return res.json({
      rca: "Simulated RCA: Recurring thermal stress detected in cylinder head gasket.",
      recommendation: "Update material specification to higher-grade composite."
    });
  }

  try {
    const prompt = `
      Generate a manufacturing quality insight report for a recurring failure: "${failureType}" in the "${vehicleModel}".
      Return a JSON object with two fields:
      1. "rca": A Root Cause Analysis summary (max 20 words).
      2. "recommendation": A specific manufacturing or design improvement (max 15 words).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rca: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    res.json({
      rca: json.rca || "Analysis failed",
      recommendation: json.recommendation || "No recommendation"
    });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ rca: "AI Analysis Error", recommendation: "Check logs" });
  }
});

app.post('/api/ai/customer-message', async (req, res) => {
  const { vehicle, diagnosis } = req.body;
  if (!vehicle || !diagnosis) {
    return res.status(400).json({ error: "vehicle and diagnosis are required." });
  }

  if (!isGeminiConfigured()) {
    return res.json({ message: `Hello ${vehicle.owner}, we detected an issue with your ${vehicle.model}. ${diagnosis}` });
  }

  try {
    const prompt = `
      Write a short, persuasive, and empathetic notification message to the vehicle owner ${vehicle.owner}.
      Vehicle: ${vehicle.model}.
      Issue: ${diagnosis}.
      Goal: Convince them to approve an autonomously scheduled service appointment immediately.
      Keep it under 40 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ message: response.text || "Service required." });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.json({ message: "Service required due to detected anomaly." });
  }
});

app.post('/api/ai/copilot', async (req, res) => {
  const { vehicle, question, language } = req.body;
  if (!vehicle || !question || !language) {
    return res.status(400).json({ error: "vehicle, question, and language are required." });
  }

  if (!isGeminiConfigured()) {
    const q = question.toLowerCase();
    let ans = "";
    if (q.includes("why") || q.includes("alert") || q.includes("problem") || q.includes("issue")) {
      if (vehicle.status === "Healthy") {
        ans = `Your vehicle is currently in excellent condition with a reliability score of ${vehicle.reliabilityScore}%. No active alerts.`;
      } else if (vehicle.sensors.engineTemp > 105) {
        ans = `Your engine temperature is high at ${vehicle.sensors.engineTemp.toFixed(1)}°C (normal: 90-105°C). The master agent has diagnosed a potential thermal stress in the cooling system. Replacement of the cooling pump gasket is advised.`;
      } else if (vehicle.sensors.brakeWear > 80) {
        ans = `Your brake pads have reached ${vehicle.sensors.brakeWear}% wear, which is close to the critical 90% wear limit. Replacement is recommended within the next 450 km.`;
      } else {
        ans = `We detected anomalous readings on vehicle ${vehicle.id}. Engine temp is ${vehicle.sensors.engineTemp.toFixed(1)}°C and vibration is ${vehicle.sensors.vibrationLevel.toFixed(1)} mm/s. A scheduling agent has pre-booked a technician slot.`;
      }
    } else if (q.includes("hill") || q.includes("route") || q.includes("terrain") || q.includes("mountain")) {
      if (vehicle.sensors.brakeWear > 60 || vehicle.sensors.engineTemp > 95) {
        ans = `Entering hilly terrain with ${vehicle.sensors.brakeWear}% brake wear and ${vehicle.sensors.engineTemp.toFixed(1)}°C temperature is high risk. Downhill braking will cause extreme thermal stress and possible brake fade. We recommend servicing immediately.`;
      } else {
        ans = `Your vehicle is fully cleared for hilly terrain. Brakes are at ${vehicle.sensors.brakeWear}% wear and cooling systems are operating normally. Drive safely!`;
      }
    } else if (q.includes("cost") || q.includes("expense") || q.includes("price") || q.includes("budget")) {
      const baseCost = vehicle.status === "Healthy" ? 120 : vehicle.status === "Warning" ? 280 : 850;
      ans = `Based on historical repair data for ${vehicle.model}, we forecast maintenance costs of $${baseCost} in the next 30 days. Probability of component replacement: Brakes (85%), Cooling Loop (60%). Coverage status: 95% likely approved under warranty.`;
    } else if (q.includes("emissions") || q.includes("sustainability") || q.includes("carbon") || q.includes("co2")) {
      ans = `Your current carbon footprint is ${vehicle.carbonEmissions.current} g/km. Resolving the active telemetry issues (vibration and high engine temperature) will reduce emissions by ${vehicle.carbonEmissions.potentialReduction} g/km.`;
    } else if (q.includes("fraud") || q.includes("warranty") || q.includes("claim")) {
      ans = `Our UEBA Analytics has calculated a Warranty Fraud Risk of ${vehicle.fraudRisk.score}%. ${vehicle.fraudRisk.flags.length > 0 ? `Flagged concerns: ${vehicle.fraudRisk.flags.join(', ')}.` : 'No warranty abuse flags detected.'}`;
    } else {
      ans = `Hello! I am your AI Maintenance Copilot. Your ${vehicle.model} (Reliability: ${vehicle.reliabilityScore}%) is running in ${vehicle.drivingHabit} mode. I can answer questions about your health alerts, route risks, emissions, or cost forecasts. How can I help?`;
    }

    if (language !== "English") {
      const translationMocks = {
        "Hindi": `नमस्ते! मैं आपका AI मेंटेनेंस कोपायलट हूँ। ${ans}`,
        "Telugu": `నమస్కారం! నేను మీ AI మెయింటెనెన్స్ కోపైలట్. ${ans}`,
        "Tamil": `வணக்கம்! நான் உங்கள் AI பராமரிப்பு கோபிலட். ${ans}`,
        "Kannada": `ನమಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ನಿರ್ವಹಣಾ ಕೊಪೈಲಟ್. ${ans}`,
        "Bengali": `নমস্কার! আমি আপনার AI রক্ষণাবেক্ষণ কোপাইলট। ${ans}`
      };
      return res.json({ answer: translationMocks[language] || ans });
    }
    return res.json({ answer: ans });
  }

  try {
    const prompt = `
      You are an advanced AI Maintenance Copilot for a connected car system.
      Vehicle Details:
      - Model: ${vehicle.model}
      - Mileage: ${vehicle.mileage} km
      - Status: ${vehicle.status}
      - Sensors: Temp: ${vehicle.sensors.engineTemp}°C, Oil: ${vehicle.sensors.oilPressure} psi, Battery: ${vehicle.sensors.batteryVoltage}V, Vibration: ${vehicle.sensors.vibrationLevel} mm/s, Brake Wear: ${vehicle.sensors.brakeWear}%
      - Route Context: Terrain: ${vehicle.routeContext.terrain}, Weather: ${vehicle.routeContext.weather}, Road Condition: ${vehicle.routeContext.roadCondition}, Risk: ${vehicle.routeContext.riskLevel} (${vehicle.routeContext.riskReason})
      - Reliability Score: ${vehicle.reliabilityScore}%
      - Emissions: Current ${vehicle.carbonEmissions.current} g/km, potential reduction ${vehicle.carbonEmissions.potentialReduction} g/km
      - Fraud Risk: Score ${vehicle.fraudRisk.score}%, Flags: ${vehicle.fraudRisk.flags.join(', ')}
      
      User's Question: "${question}"
      Language requested: ${language}. You MUST translate the complete response into ${language} (with appropriate script) and return only the translation.
      
      Provide a helpful, precise, and conversational answer. Use the vehicle's sensor data and route context to explain the issue. Keep it under 65 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ answer: response.text || "I apologize, I could not generate an answer at this time." });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Error communicating with AI Copilot." });
  }
});

// --- SYSTEM STATUS ENDPOINTS ---

// Root Route
app.get('/', (req, res) => {
  res.json({
    application: "AutoGuard Predictive Vehicle Maintenance API",
    version: "1.0.0",
    status: "Running",
    documentation: "/health",
    timestamp: new Date().toISOString()
  });
});

// Improved Health Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "AutoGuard Backend API",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AutoGuard Backend Server is running on port ${PORT}`);
  readDb(); // Initialize db file on startup
});
