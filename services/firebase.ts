import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  get,
  child,
  Database
} from 'firebase/database';

// Firebase configuration using Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Check if credentials exist and are not placeholders
const hasCredentials = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  firebaseConfig.databaseURL;

let app;
let auth: any;
let db: any;
let isFirebaseMock = true;

if (hasCredentials) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getDatabase(app);
    isFirebaseMock = false;
    console.log("🔥 Firebase initialized successfully (Connected to live Realtime Database).");
  } catch (error) {
    console.error("⚠️ Failed to initialize live Firebase, falling back to Sandbox Mock mode:", error);
    isFirebaseMock = true;
  }
} else {
  console.log("ℹ️ No Firebase credentials found in environment. Initialized in Sandbox Mock mode (data saved in LocalStorage).");
  isFirebaseMock = true;
}

// Interface for Mock Database Storage
interface MockDbStore {
  vehicles: any[];
  alerts: any[];
  agentLogs: any[];
  insights: any[];
  dispatches: any[];
}

// LocalStorage key names
const MOCK_AUTH_USERS_KEY = 'autoguard_mock_users';
const MOCK_AUTH_CURRENT_USER_KEY = 'autoguard_mock_current_user';
const MOCK_DB_KEY = 'autoguard_mock_db';

// Helper for Mock DB
const getMockDb = (): MockDbStore => {
  const data = localStorage.getItem(MOCK_DB_KEY);
  if (data) {
    try { return JSON.parse(data); } catch (e) {}
  }
  return { vehicles: [], alerts: [], agentLogs: [], insights: [], dispatches: [] };
};

const saveMockDb = (data: MockDbStore) => {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(data));
};

// --- AUTHENTICATION METHODS ---

export const signUpUser = async (email: string, password: string): Promise<any> => {
  if (!isFirebaseMock) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message || "Failed to sign up.");
    }
  } else {
    // Mock Signup
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem(MOCK_AUTH_USERS_KEY) || '[]');
        if (users.some((u: any) => u.email === email)) {
          reject(new Error("auth/email-already-in-use: Email already registered in Sandbox."));
          return;
        }
        const newUser = { uid: `mock-uid-${Math.random().toString(36).substr(2, 9)}`, email };
        users.push({ ...newUser, password });
        localStorage.setItem(MOCK_AUTH_USERS_KEY, JSON.stringify(users));
        localStorage.setItem(MOCK_AUTH_CURRENT_USER_KEY, JSON.stringify(newUser));
        resolve(newUser);
      }, 800);
    });
  }
};

export const signInUser = async (email: string, password: string): Promise<any> => {
  if (!isFirebaseMock) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message || "Failed to sign in.");
    }
  } else {
    // Mock Signin
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem(MOCK_AUTH_USERS_KEY) || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);
        if (!user) {
          reject(new Error("auth/wrong-password: Invalid email or password in Sandbox mode."));
          return;
        }
        const authUser = { uid: user.uid, email: user.email };
        localStorage.setItem(MOCK_AUTH_CURRENT_USER_KEY, JSON.stringify(authUser));
        resolve(authUser);
      }, 800);
    });
  }
};

export const signOutUser = async (): Promise<void> => {
  if (!isFirebaseMock) {
    await signOut(auth);
  } else {
    localStorage.removeItem(MOCK_AUTH_CURRENT_USER_KEY);
  }
};

export const onAuthChange = (callback: (user: any) => void): (() => void) => {
  if (!isFirebaseMock) {
    return onAuthStateChanged(auth, callback);
  } else {
    // Poll/check currentUser in LocalStorage
    const checkUser = () => {
      const uStr = localStorage.getItem(MOCK_AUTH_CURRENT_USER_KEY);
      return uStr ? JSON.parse(uStr) : null;
    };
    
    // Initial callback
    callback(checkUser());

    // Monitor storage events or set up polling interval
    const interval = setInterval(() => {
      callback(checkUser());
    }, 1000);

    return () => clearInterval(interval);
  }
};

// --- DATABASE OPERATIONS ---

/**
 * Saves the entire application state (vehicles, alerts, logs, insights, dispatches) to Firebase Realtime Database
 */
export const saveFleetState = async (
  userId: string,
  vehicles: any[],
  alerts: any[],
  agentLogs: any[],
  insights: any[],
  dispatches: any[] = []
): Promise<void> => {
  if (!isFirebaseMock) {
    try {
      // Structure by user ID to prevent overlap between different test accounts
      const userRef = ref(db, `users/${userId}/fleetState`);
      await set(userRef, {
        vehicles,
        alerts: alerts.map(a => ({
          ...a,
          timestamp: a.timestamp instanceof Date ? a.timestamp.toISOString() : a.timestamp
        })),
        agentLogs: agentLogs.map(l => ({
          ...l,
          timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp
        })),
        insights,
        dispatches: dispatches.map(d => ({
          ...d,
          timestamp: d.timestamp instanceof Date ? d.timestamp.toISOString() : d.timestamp
        })),
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to sync fleet state to Firebase Database:", error);
    }
  } else {
    // Save to LocalStorage Mock
    saveMockDb({
      vehicles,
      alerts: alerts.map(a => ({
        ...a,
        timestamp: a.timestamp instanceof Date ? a.timestamp.toISOString() : a.timestamp
      })),
      agentLogs: agentLogs.map(l => ({
        ...l,
        timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp
      })),
      insights,
      dispatches: dispatches.map(d => ({
        ...d,
        timestamp: d.timestamp instanceof Date ? d.timestamp.toISOString() : d.timestamp
      }))
    });
  }
};

/**
 * Subscribes to the fleet state from Firebase Realtime Database
 */
export const subscribeToFleetState = (
  userId: string,
  onDataLoaded: (data: { vehicles: any[]; alerts: any[]; agentLogs: any[]; insights: any[]; dispatches: any[] }) => void
): (() => void) => {
  if (!isFirebaseMock) {
    const userStateRef = ref(db, `users/${userId}/fleetState`);
    return onValue(userStateRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        onDataLoaded({
          vehicles: data.vehicles || [],
          alerts: (data.alerts || []).map((a: any) => ({
            ...a,
            timestamp: new Date(a.timestamp)
          })),
          agentLogs: (data.agentLogs || []).map((l: any) => ({
            ...l,
            timestamp: new Date(l.timestamp)
          })),
          insights: data.insights || [],
          dispatches: (data.dispatches || []).map((d: any) => ({
            ...d,
            timestamp: new Date(d.timestamp)
          }))
        });
      } else {
        // No data in db yet
        onDataLoaded({ vehicles: [], alerts: [], agentLogs: [], insights: [], dispatches: [] });
      }
    }, (error) => {
      console.error("Realtime subscription error:", error);
    });
  } else {
    // LocalStorage Mock loading (one-off read and interval check to simulate realtime syncing)
    const loadMock = () => {
      const store = getMockDb();
      onDataLoaded({
        vehicles: store.vehicles?.length > 0 ? store.vehicles : [],
        alerts: (store.alerts || []).map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        })),
        agentLogs: (store.agentLogs || []).map((l: any) => ({
          ...l,
          timestamp: new Date(l.timestamp)
        })),
        insights: store.insights?.length > 0 ? store.insights : [],
        dispatches: (store.dispatches || []).map((d: any) => ({
          ...d,
          timestamp: new Date(d.timestamp)
        }))
      });
    };
    
    loadMock();

    // Check for updates every 2 seconds
    const interval = setInterval(loadMock, 2000);
    return () => clearInterval(interval);
  }
};

export { isFirebaseMock };
