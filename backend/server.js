const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'database.json');

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
