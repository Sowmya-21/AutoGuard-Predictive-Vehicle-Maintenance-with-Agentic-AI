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

// --- BACKEND API ADAPTER LAYER ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiRequest = async (endpoint: string, method: string = 'GET', body: any = null) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
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
    try {
      const data = await apiRequest('/api/auth/signup', 'POST', { email, password });
      localStorage.setItem(MOCK_AUTH_CURRENT_USER_KEY, JSON.stringify(data));
      return data;
    } catch (backendError: any) {
      console.warn("Backend signup failed/unreachable, falling back to LocalStorage Sandbox:", backendError);
      
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
    try {
      const data = await apiRequest('/api/auth/signin', 'POST', { email, password });
      localStorage.setItem(MOCK_AUTH_CURRENT_USER_KEY, JSON.stringify(data));
      return data;
    } catch (backendError: any) {
      console.warn("Backend signin failed/unreachable, falling back to LocalStorage Sandbox:", backendError);

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
    let lastUserUid: string | null = 'not_initialized';
    const checkUser = () => {
      const uStr = localStorage.getItem(MOCK_AUTH_CURRENT_USER_KEY);
      if (!uStr) {
        if (lastUserUid !== null) {
          lastUserUid = null;
          callback(null);
        }
        return;
      }
      try {
        const user = JSON.parse(uStr);
        if (user.uid !== lastUserUid) {
          lastUserUid = user.uid;
          callback(user);
        }
      } catch (e) {}
    };
    
    checkUser();

    const interval = setInterval(checkUser, 1000);

    return () => clearInterval(interval);
  }
};

// --- DATABASE OPERATIONS ---

export const saveFleetState = async (
  userId: string,
  vehicles: any[],
  alerts: any[],
  agentLogs: any[],
  insights: any[],
  dispatches: any[] = []
): Promise<void> => {
  const serializedState = {
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
  };

  if (!isFirebaseMock) {
    try {
      const userRef = ref(db, `users/${userId}/fleetState`);
      await set(userRef, {
        ...serializedState,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to sync fleet state to Firebase Database:", error);
    }
  } else {
    saveMockDb(serializedState);

    try {
      await apiRequest('/api/fleet/state', 'POST', { userId, state: serializedState });
    } catch (backendError) {
      console.warn("Backend save state failed/unreachable:", backendError);
    }
  }
};

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
        onDataLoaded({ vehicles: [], alerts: [], agentLogs: [], insights: [], dispatches: [] });
      }
    }, (error) => {
      console.error("Realtime subscription error:", error);
    });
  } else {
    const loadMock = async () => {
      try {
        const data = await apiRequest(`/api/fleet/state/${userId}`);
        if (data && (data.vehicles?.length > 0 || data.alerts?.length > 0 || data.agentLogs?.length > 0)) {
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
          return;
        }
      } catch (backendError) {
        console.warn("Backend load state failed, reading local storage copy:", backendError);
      }

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

    const interval = setInterval(loadMock, 2000);
    return () => clearInterval(interval);
  }
};

export { isFirebaseMock };
