const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { GoogleGenAI, Type } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'database.json');
const JWT_SECRET = process.env.JWT_SECRET || 'autoguard_super_secret_key_13579';

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const isGeminiConfigured = () => !!geminiApiKey;

// --- DATABASE INTEGRATION (MongoDB Atlas with local JSON fallback) ---
const MONGODB_URI = process.env.MONGODB_URI || '';
let useMongo = false;

// Schemas & Models
const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const MongoUser = mongoose.models.User || mongoose.model('User', UserSchema);

const FleetStateSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  vehicles: { type: Array, default: [] },
  alerts: { type: Array, default: [] },
  agentLogs: { type: Array, default: [] },
  insights: { type: Array, default: [] },
  dispatches: { type: Array, default: [] },
  lastUpdated: { type: Date, default: Date.now }
});
const MongoFleetState = mongoose.models.FleetState || mongoose.model('FleetState', FleetStateSchema);

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log("🔋 Connected successfully to MongoDB Atlas.");
      useMongo = true;
    })
    .catch(err => {
      console.error("❌ MongoDB connection failed. Falling back to local JSON database:", err.message);
      useMongo = false;
    });
} else {
  console.log("ℹ️ MONGODB_URI not provided. Running in lightweight local JSON database mode.");
  useMongo = false;
}

// Helpers for Local JSON Database Fallback
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

const writeDb = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing database file:", error);
  }
};

// Database Abstract Layer Actions
const getUser = async (email) => {
  if (useMongo) {
    return await MongoUser.findOne({ email });
  }
  const db = readDb();
  return db.users.find(u => u.email === email);
};

const createUser = async (uid, email, hashedPassword) => {
  if (useMongo) {
    const newUser = new MongoUser({ uid, email, password: hashedPassword });
    return await newUser.save();
  }
  const db = readDb();
  const newUser = { uid, email, password: hashedPassword };
  db.users.push(newUser);
  writeDb(db);
  return newUser;
};

const upgradePassword = async (email, hashedPassword) => {
  if (useMongo) {
    await MongoUser.updateOne({ email }, { password: hashedPassword });
  } else {
    const db = readDb();
    const user = db.users.find(u => u.email === email);
    if (user) {
      user.password = hashedPassword;
      writeDb(db);
    }
  }
};

const saveFleetState = async (userId, state) => {
  if (useMongo) {
    return await MongoFleetState.findOneAndUpdate(
      { userId },
      { ...state, lastUpdated: new Date() },
      { upsert: true, new: true }
    );
  }
  const db = readDb();
  db.fleetStates[userId] = {
    ...state,
    lastUpdated: new Date().toISOString()
  };
  writeDb(db);
};

const getFleetState = async (userId) => {
  if (useMongo) {
    return await MongoFleetState.findOne({ userId });
  }
  const db = readDb();
  return db.fleetStates[userId];
};

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: "Access token required." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    req.user = user;
    next();
  });
};

// --- SWAGGER DOCUMENTATION CONFIGURATION ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AutoGuard Predictive Vehicle Maintenance API',
      version: '1.0.0',
      description: 'API documentation for the AutoGuard Fleet Maintenance platform.',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [__filename],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- API DOCUMENTATION & ROUTES ---

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@autoguard.ai
 *               password:
 *                 type: string
 *                 example: securePassword123
 *     responses:
 *       200:
 *         description: User signed up successfully and authenticated
 *       400:
 *         description: Missing fields or email already exists
 */
app.post('/api/auth/signup', async (req, finalRes) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return finalRes.status(400).json({ error: "Email and password are required." });
  }

  try {
    const existing = await getUser(email);
    if (existing) {
      return finalRes.status(400).json({ error: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = `backend-uid-${Math.random().toString(36).substr(2, 9)}`;
    await createUser(uid, email, hashedPassword);

    console.log(`👤 User signed up: ${email}`);
    
    // Generate JWT token
    const token = jwt.sign({ uid, email }, JWT_SECRET, { expiresIn: '24h' });
    finalRes.json({ uid, email, token });
  } catch (error) {
    console.error("Signup error:", error);
    finalRes.status(500).json({ error: "Internal server error during registration." });
  }
});

/**
 * @openapi
 * /api/auth/signin:
 *   post:
 *     summary: Sign in with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: express-admin@autoguard.ai
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Successful sign in, returns user session and JWT
 *       400:
 *         description: Invalid credentials
 */
app.post('/api/auth/signin', async (req, finalRes) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return finalRes.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await getUser(email);
    if (!user) {
      return finalRes.status(400).json({ error: "Invalid email or password." });
    }

    let isMatch = false;
    // Check if the stored password is a bcrypt hash
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Plain text fallback (for old pre-seeded users), auto-upgrade on successful login
      isMatch = (password === user.password);
      if (isMatch) {
        const hashed = await bcrypt.hash(password, 10);
        await upgradePassword(email, hashed);
        console.log(`🔒 Upgraded credentials to bcrypt hash for user: ${email}`);
      }
    }

    if (!isMatch) {
      return finalRes.status(400).json({ error: "Invalid email or password." });
    }

    console.log(`🔑 User signed in: ${email}`);
    
    // Generate JWT token
    const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    finalRes.json({ uid: user.uid, email: user.email, token });
  } catch (error) {
    console.error("Signin error:", error);
    finalRes.status(500).json({ error: "Internal server error during authentication." });
  }
});

// --- FLEET STATE ENDPOINTS (Protected with JWT) ---

/**
 * @openapi
 * /api/fleet/state:
 *   post:
 *     summary: Persist current fleet state (Protected)
 *     tags: [Fleet State]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - state
 *             properties:
 *               userId:
 *                 type: string
 *                 example: backend-uid-hp9cd0zh0
 *               state:
 *                 type: object
 *     responses:
 *       200:
 *         description: Fleet state synchronized successfully
 *       401:
 *         description: Missing access token
 *       403:
 *         description: Invalid or expired token
 */
app.post('/api/fleet/state', authenticateToken, async (req, finalRes) => {
  const { userId, state } = req.body;
  if (!userId || !state) {
    return finalRes.status(400).json({ error: "userId and state are required." });
  }

  try {
    await saveFleetState(userId, state);
    finalRes.json({ success: true });
  } catch (error) {
    console.error("Failed to save fleet state:", error);
    finalRes.status(500).json({ error: "Failed to persist fleet state." });
  }
});

/**
 * @openapi
 * /api/fleet/state/{userId}:
 *   get:
 *     summary: Fetch current fleet state (Protected)
 *     tags: [Fleet State]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: backend-uid-hp9cd0zh0
 *     responses:
 *       200:
 *         description: Returns fleet state object containing vehicles, alerts, logs, etc.
 *       401:
 *         description: Missing access token
 *       403:
 *         description: Invalid or expired token
 */
app.get('/api/fleet/state/:userId', authenticateToken, async (req, finalRes) => {
  const { userId } = req.params;
  if (!userId) {
    return finalRes.status(400).json({ error: "userId is required." });
  }

  try {
    const userState = await getFleetState(userId);
    if (!userState) {
      return finalRes.json({ vehicles: [], alerts: [], agentLogs: [], insights: [], dispatches: [] });
    }
    finalRes.json(userState);
  } catch (error) {
    console.error("Failed to retrieve fleet state:", error);
    finalRes.status(500).json({ error: "Failed to load fleet state." });
  }
});

// --- AI ORCHESTRATION ENDPOINTS ---

/**
 * @openapi
 * /api/ai/configured:
 *   get:
 *     summary: Verify whether Gemini API is active
 *     tags: [AI Services]
 *     responses:
 *       200:
 *         description: Status check
 */
app.get('/api/ai/configured', (req, res) => {
  res.json({ configured: isGeminiConfigured() });
});

/**
 * @openapi
 * /api/ai/diagnose:
 *   post:
 *     summary: Generate an AI diagnostics report for vehicle telemetry (Protected)
 *     tags: [AI Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle:
 *                 type: object
 *     responses:
 *       200:
 *         description: Diagnostics report generated
 */
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

/**
 * @openapi
 * /api/ai/manufacturing-insight:
 *   post:
 *     summary: Analyze recurring vehicle failures and compile design quality suggestions
 *     tags: [AI Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               failureType:
 *                 type: string
 *               vehicleModel:
 *                 type: string
 *     responses:
 *       200:
 *         description: Analysis complete
 */
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

/**
 * @openapi
 * /api/ai/customer-message:
 *   post:
 *     summary: Compile localized customer notification scripts
 *     tags: [AI Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle:
 *                 type: object
 *               diagnosis:
 *                 type: string
 *     responses:
 *       200:
 *         description: Script generated
 */
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

/**
 * @openapi
 * /api/ai/copilot:
 *   post:
 *     summary: Interact with the AI Maintenance Copilot assistant
 *     tags: [AI Services]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle:
 *                 type: object
 *               question:
 *                 type: string
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response generated
 */
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
        "Kannada": `ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ನಿರ್ವಹಣಾ ಕೊಪೈಲಟ್. ${ans}`,
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

/**
 * @openapi
 * /:
 *   get:
 *     summary: Retrieve API root status metadata
 *     tags: [System Status]
 *     responses:
 *       200:
 *         description: Root API Metadata
 */
app.get('/', (req, res) => {
  res.json({
    application: "AutoGuard Predictive Vehicle Maintenance API",
    version: "1.0.0",
    status: "Running",
    documentation: "/docs",
    timestamp: new Date().toISOString()
  });
});

/**
 * @openapi
 * /health:
 *   get:
 *     summary: API health and uptime information
 *     tags: [System Status]
 *     responses:
 *       200:
 *         description: Health details
 */
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
