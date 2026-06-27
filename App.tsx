
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Vehicle, AgentLog, AgentType, VehicleStatus, InsightReport, UebaAlert, MaintenanceAlert, MaintenanceRecord, FieldDispatch 
} from './types';
import { INITIAL_VEHICLES, MOCK_INSIGHTS } from './constants';
import { generateDiagnosticReport, generateManufacturingInsight, generateCustomerMessage } from './services/geminiService';
import { VehicleMonitor } from './components/VehicleMonitor';
import { AgentOrchestrator } from './components/AgentOrchestrator';
import { ManufacturingInsights } from './components/ManufacturingInsights';
import { AlertsFeed } from './components/AlertsFeed';
import { LayoutDashboard, Car, ShieldCheck, Factory, Play, Pause, Radio, TrendingUp, Sun, Moon, Truck, SlidersHorizontal, ClipboardList, Database, Cpu, Clock, Activity, LogOut } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AuthScreen } from './components/AuthScreen';
import { signOutUser, onAuthChange, saveFleetState, subscribeToFleetState } from './services/firebase';

const App: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [uebaAlerts, setUebaAlerts] = useState<UebaAlert[]>([]);
  const [insights, setInsights] = useState<InsightReport[]>(MOCK_INSIGHTS);
  const [dispatches, setDispatches] = useState<FieldDispatch[]>([
    {
      id: 'DISP-101',
      vehicleId: 'V-101',
      type: 'Dealer Appointment',
      details: 'Scheduled at Central Hub for Vibration Dampener inspection.',
      status: 'Completed',
      timestamp: new Date(Date.now() - 3600000 * 2)
    },
    {
      id: 'DISP-102',
      vehicleId: 'V-103',
      type: 'Mobile Service',
      details: 'Mobile Service Van #3 assigned for Spark Plug replacement.',
      status: 'Arrived',
      timestamp: new Date(Date.now() - 1800000)
    }
  ]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>(() => {
    // Initialize alerts for existing unhealthy vehicles
    return INITIAL_VEHICLES
      .filter(v => v.status !== VehicleStatus.HEALTHY && v.status !== VehicleStatus.SERVICING)
      .map((v, index) => ({
        id: `INIT-${v.id}-${index}`,
        vehicleId: v.id,
        severity: v.status === VehicleStatus.CRITICAL ? 'Critical' : 'Warning',
        message: `Existing ${v.status.toLowerCase()} anomaly detected on system startup.`,
        timestamp: new Date(),
        status: 'Active'
      }));
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitor' | 'agents' | 'manufacturing'>('dashboard');
  const [isSimulating, setIsSimulating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync data from Firebase once authenticated
  useEffect(() => {
    if (!currentUser) return;

    console.log("Loading fleet state for user:", currentUser.email);
    const unsubscribe = subscribeToFleetState(currentUser.uid, (data) => {
      // If the user database has no vehicles and insights, seed it with defaults
      if (data.vehicles.length === 0 && data.insights.length === 0) {
        console.log("No remote state found. Seeding remote database with initial fleet setup...");
        
        const initialAlerts = INITIAL_VEHICLES
          .filter(v => v.status !== VehicleStatus.HEALTHY && v.status !== VehicleStatus.SERVICING)
          .map((v, index) => ({
            id: `INIT-${v.id}-${index}`,
            vehicleId: v.id,
            severity: v.status === VehicleStatus.CRITICAL ? 'Critical' : 'Warning',
            message: `Existing ${v.status.toLowerCase()} anomaly detected on system startup.`,
            timestamp: new Date().toISOString(),
            status: 'Active'
          }));

        saveFleetState(
          currentUser.uid,
          INITIAL_VEHICLES,
          initialAlerts,
          [],
          MOCK_INSIGHTS,
          [
            {
              id: 'DIS-091',
              vehicleId: 'VEH-001',
              type: 'Towing',
              details: 'Towing requested for VEH-001 to nearest Service Center.',
              status: 'Completed',
              timestamp: new Date().toISOString()
            }
          ]
        );
      } else {
        // Load database records
        setVehicles(data.vehicles);
        setAlerts(data.alerts);
        setAgentLogs(data.agentLogs);
        setInsights(data.insights);
        if (data.dispatches && data.dispatches.length > 0) {
          setDispatches(data.dispatches);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Debounced save to Firebase when state changes locally
  useEffect(() => {
    if (!currentUser) return;
    
    // Avoid saving if local state hasn't loaded yet
    if (vehicles.length === 0 && insights.length === 0) return;

    const saveTimeout = setTimeout(() => {
      saveFleetState(currentUser.uid, vehicles, alerts, agentLogs, insights, dispatches);
    }, 1200);

    return () => clearTimeout(saveTimeout);
  }, [vehicles, alerts, agentLogs, insights, dispatches, currentUser]);
  
  // Refs to access latest state inside intervals
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  // Add log helper
  const addLog = (agent: AgentType, action: string, details: string, status: AgentLog['status'] = 'success', vehicleId?: string) => {
    const newLog: AgentLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      agent,
      action,
      details,
      status,
      targetVehicleId: vehicleId
    };
    setAgentLogs(prev => [newLog, ...prev]);
  };

  // Add Alert Helper
  const addUebaAlert = (agent: AgentType, action: string, reason: string) => {
    const alert: UebaAlert = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      agent,
      actionAttempted: action,
      riskScore: Math.floor(Math.random() * 20) + 80,
      reason,
      status: 'Active'
    };
    setUebaAlerts(prev => [alert, ...prev]);
  };

  // Bulk Action Handlers
  const handleBulkDeleteInsights = (ids: string[]) => {
    setInsights(prev => prev.filter(item => !ids.includes(item.id)));
    addLog(AgentType.MANUFACTURING, 'Data Management', `Deleted ${ids.length} insight records.`);
  };

  const handleAddInsight = (insight: InsightReport) => {
    setInsights(prev => [insight, ...prev]);
    addLog(AgentType.MANUFACTURING, 'Manual Report', `Operator logged quality defect report for ${insight.component}.`, 'success');
  };

  const handleAddDispatch = (vehicleId: string, type: 'Towing' | 'Mobile Service' | 'Dealer Appointment', details: string) => {
    const newDisp: FieldDispatch = {
      id: `DISP-${Math.floor(100 + Math.random() * 900)}`,
      vehicleId,
      type,
      details,
      status: 'Dispatched',
      timestamp: new Date()
    };
    setDispatches(prev => [newDisp, ...prev]);
  };

  const handleBulkStatusChange = (ids: string[], status: 'Pending' | 'Implemented') => {
    setInsights(prev => prev.map(item => ids.includes(item.id) ? { ...item, status } : item));
    addLog(AgentType.MANUFACTURING, 'Status Update', `Marked ${ids.length} insights as ${status}.`);
  };

  // Alert Handlers
  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleBulkDismissAlerts = (ids: string[]) => {
    setAlerts(prev => prev.filter(a => !ids.includes(a.id)));
    addLog(AgentType.MASTER, 'Alert Management', `Dismissed ${ids.length} maintenance alerts.`);
  };

  const handleBulkResolveAlerts = (ids: string[]) => {
    setAlerts(prev => prev.map(a => ids.includes(a.id) ? { ...a, status: 'Resolved' } : a));
    addLog(AgentType.MASTER, 'Alert Management', `Marked ${ids.length} alerts as resolved.`);
  };

  const handleViewVehicle = (vehicleId: string) => {
    setActiveTab('monitor');
  };

  const handleManualSchedule = (vehicleId: string) => {
    const v = vehicles.find(v => v.id === vehicleId);
    if (v) {
        setVehicles(prev => prev.map(veh => veh.id === vehicleId ? { ...veh, status: VehicleStatus.SERVICING } : veh));
        addLog(AgentType.MASTER, 'Manual Override', `Operator initiated service request for ${v.vin}`, 'success', v.id);
        setTimeout(() => {
            addLog(AgentType.SCHEDULING, 'Checking Availability', `Querying slots for ${v.model}...`, 'success', v.id);
            setTimeout(() => {
                addLog(AgentType.SCHEDULING, 'Booking Confirmed', `Manual appointment confirmed for tomorrow at 09:00 AM.`, 'success', v.id);
            }, 1000);
        }, 500);
    }
  };

  const handleLogService = (vehicleId: string, record: Omit<MaintenanceRecord, 'date'>) => {
    const newRecord: MaintenanceRecord = {
      ...record,
      date: new Date().toISOString().split('T')[0]
    };

    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          status: VehicleStatus.HEALTHY,
          sensors: { 
            ...v.sensors,
            engineTemp: 88 + Math.random() * 4,
            oilPressure: 40 + Math.random() * 10,
            vibrationLevel: 0.2 + Math.random() * 0.3,
            brakeWear: 0
          },
          history: [newRecord, ...v.history]
        };
      }
      return v;
    }));

    setAlerts(prev => prev.map(a => a.vehicleId === vehicleId ? { ...a, status: 'Resolved' } : a));
    addLog(AgentType.FEEDBACK, 'Service Recorded', `Service record updated for ${vehicleId}: ${record.description}`, 'success', vehicleId);
  };

  const handleSimulateFailure = (vehicleId: string) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === vehicleId) {
        return {
          ...v,
          sensors: { ...v.sensors, engineTemp: 118, vibrationLevel: 3.5, oilPressure: 18 }
        };
      }
      return v;
    }));
    if (!isSimulating) setIsSimulating(true);
    addLog(AgentType.MASTER, 'Simulation Injection', `Injected fault into ${vehicleId}. Sensors forced to critical levels.`, 'success', vehicleId);
  };

  const handleResolveUeba = (id: string) => {
    setUebaAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Resolved' } : a));
    addLog(AgentType.SECURITY, 'Threat Mitigated', 'Security anomaly marked as resolved by operator.', 'success');
  };

  const handleInjectUeba = (agent: AgentType, action: string, reason: string) => {
    addUebaAlert(agent, action, reason);
    addLog(AgentType.SECURITY, 'Threat Blocked', `Blocked unauthorized attempt by ${agent}: ${action}`, 'blocked');
  };

  const handleDismissUeba = (id: string) => {
    setUebaAlerts(prev => prev.filter(a => a.id !== id));
  };

  // Chart Data Calculation
  const statusData = useMemo(() => [
    { name: VehicleStatus.HEALTHY, value: vehicles.filter(v => v.status === VehicleStatus.HEALTHY).length, color: '#10b981' },
    { name: VehicleStatus.WARNING, value: vehicles.filter(v => v.status === VehicleStatus.WARNING).length, color: '#eab308' },
    { name: VehicleStatus.CRITICAL, value: vehicles.filter(v => v.status === VehicleStatus.CRITICAL).length, color: '#ef4444' },
    { name: VehicleStatus.SERVICING, value: vehicles.filter(v => v.status === VehicleStatus.SERVICING).length, color: '#3b82f6' },
  ].filter(item => item.value > 0), [vehicles]);

  // Mock Forecast Data for Service Demand
  const forecastData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const historical = [12, 18, 15, 22, 19];
    const forecasted = [24, 28, 35]; // Trend upwards based on aging fleet
    
    return [
      ...historical.map((val, i) => ({ month: months[i], historical: val, forecasted: null })),
      { month: months[historical.length-1], historical: historical[historical.length-1], forecasted: historical[historical.length-1] }, // Connection point
      ...forecasted.map((val, i) => ({ month: months[historical.length + i], historical: null, forecasted: val }))
    ];
  }, []);

  // Simulation Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(async () => {
      // 1. Update Sensors (Random Walk)
      const updatedVehicles = vehiclesRef.current.map(v => {
        if (v.status === VehicleStatus.SERVICING) return v;

        const noise = (Math.random() - 0.5); 
        const drift = v.id === 'V-103' ? 0.8 : 0; 
        
        let newTemp = v.sensors.engineTemp + noise + drift;
        let newVib = v.sensors.vibrationLevel + (noise * 0.1) + (drift * 0.05);

        newTemp = Math.max(20, Math.min(newTemp, 130));
        newVib = Math.max(0, newVib);

        return {
          ...v,
          sensors: {
            ...v.sensors,
            engineTemp: newTemp,
            vibrationLevel: newVib
          }
        };
      });

      setVehicles(updatedVehicles);

      // 2. Master Agent Monitoring
      updatedVehicles.forEach(async (v) => {
        if (v.status === VehicleStatus.HEALTHY && (v.sensors.engineTemp > 105 || v.sensors.vibrationLevel > 2.0)) {
          const newStatus = v.sensors.engineTemp > 115 ? VehicleStatus.CRITICAL : VehicleStatus.WARNING;
          
          setVehicles(prev => prev.map(pv => pv.id === v.id ? { ...pv, status: newStatus } : pv));
          
          const newAlert: MaintenanceAlert = {
            id: `ALT-${v.id}-${Date.now()}`,
            vehicleId: v.id,
            severity: newStatus === VehicleStatus.CRITICAL ? 'Critical' : 'Warning',
            message: `Predictive System detected ${newStatus.toLowerCase()} anomaly: High ${v.sensors.engineTemp > 105 ? 'Engine Temp' : 'Vibration'}.`,
            timestamp: new Date(),
            status: 'Active'
          };
          setAlerts(prev => [newAlert, ...prev]);

          addLog(AgentType.MASTER, 'Anomaly Detected', `Vehicle ${v.id} sensors exceeded threshold. Initiating Protocol.`, 'success', v.id);
          
          setTimeout(async () => {
            addLog(AgentType.DATA_ANALYSIS, 'Analyzing Telemetry', `Pulling last 500ms of sensor packets for ${v.id}.`, 'success', v.id);
            
            setTimeout(async () => {
              addLog(AgentType.DIAGNOSIS, 'Running Prediction Model', `Invoking Gemini for failure mode analysis on ${v.id}...`, 'success', v.id);
              const diagnosis = await generateDiagnosticReport(v);
              addLog(AgentType.DIAGNOSIS, 'Diagnosis Complete', diagnosis, 'success', v.id);

              setTimeout(async () => {
                addLog(AgentType.CUSTOMER_ENGAGEMENT, 'Initiating Contact', `Generating voice script for owner ${v.owner}...`, 'success', v.id);
                const msg = await generateCustomerMessage(v, diagnosis);
                addLog(AgentType.CUSTOMER_ENGAGEMENT, 'Voice Call Active', `Speaking: "${msg}"`, 'success', v.id);
                
                setTimeout(async () => {
                  addLog(AgentType.SCHEDULING, 'Booking Appointment', `Checking slots near ${v.owner}'s location.`, 'success', v.id);
                  addLog(AgentType.SCHEDULING, 'Confirmed', `Service booked for Tomorrow at 10:00 AM.`, 'success', v.id);
                  
                  if (newStatus === VehicleStatus.CRITICAL) {
                     addLog(AgentType.MANUFACTURING, 'Analyzing Defect', 'Cross-referencing with production batch #4021.', 'success', v.id);
                     const insight = await generateManufacturingInsight('Overheating', v.model);
                     
                     const newInsight: InsightReport = {
                       id: `INS-${Math.floor(Math.random()*1000)}`,
                       date: new Date().toISOString().split('T')[0],
                       component: 'Cooling System',
                       defectType: 'Thermal Runaway',
                       severity: 'High',
                       rcaSummary: insight.rca,
                       recommendation: insight.recommendation,
                       status: 'Pending'
                     };
                     setInsights(prev => [newInsight, ...prev]);
                     addLog(AgentType.MANUFACTURING, 'Feedback Loop', 'Insight pushed to Engineering DB.', 'success', v.id);
                  }
                }, 2000);
              }, 2000);
            }, 1500);
          }, 1000);
        }
      });

      if (Math.random() > 0.95) {
        const agents = [AgentType.SCHEDULING, AgentType.DATA_ANALYSIS];
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        addUebaAlert(randomAgent, 'Unauthorized DB Access', 'Attempted to export full user PII table.');
        addLog(AgentType.SECURITY, 'Threat Blocked', `Blocked ${randomAgent} from accessing sensitive PII.`, 'blocked');
      }

    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating]);


  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></span>
          <p className="text-sm font-bold text-slate-400 animate-pulse font-sans">Initializing Security Session...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  const handleLogout = async () => {
    setVehicles(INITIAL_VEHICLES);
    setInsights(MOCK_INSIGHTS);
    setAlerts([]);
    setAgentLogs([]);
    setUebaAlerts([]);
    setDispatches([
      {
        id: 'DIS-091',
        vehicleId: 'VEH-001',
        type: 'Towing',
        details: 'Towing requested for VEH-001 to nearest Service Center.',
        status: 'Completed',
        timestamp: new Date()
      }
    ]);
    setIsSimulating(false);
    await signOutUser();
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            AutoGuard
          </h1>
          <p className="text-xs text-gray-500 mt-1">Autonomous Fleet Agent</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
            {alerts.filter(a => a.status === 'Active').length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{alerts.filter(a => a.status === 'Active').length}</span>}
          </button>
          <button 
             onClick={() => setActiveTab('monitor')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'monitor' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-slate-800'}`}
          >
            <Car size={20} /> Vehicle Monitor
          </button>
          <button 
             onClick={() => setActiveTab('agents')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'agents' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-slate-800'}`}
          >
            <ShieldCheck size={20} /> Agent Orchestrator
            {uebaAlerts.filter(a => a.status === 'Active').length > 0 && <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{uebaAlerts.filter(a => a.status === 'Active').length}</span>}
          </button>
          <button 
             onClick={() => setActiveTab('manufacturing')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeTab === 'manufacturing' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-slate-800'}`}
          >
            <Factory size={20} /> Manufacturing Quality
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition ${isSimulating ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'}`}
          >
            {isSimulating ? <><Pause size={18} /> Stop Sim</> : <><Play size={18} /> Start Sim</>}
          </button>

          {/* User Profile & Logout */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Operator</p>
              <p className="text-xs font-semibold text-slate-300 truncate" title={currentUser?.email || ""}>
                {currentUser?.email || "Operator"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all shrink-0"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        <header className="h-16 bg-slate-900/50 backdrop-blur border-b border-slate-800 flex items-center justify-between px-8">
           <h2 className="text-lg font-medium text-gray-200 capitalize">{activeTab.replace('-', ' ')}</h2>
           <div className="flex items-center gap-4">
             <button
               onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
               className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
               title="Toggle Light/Dark Mode"
             >
               {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
             </button>
             <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400">System Status</span>
                {isSimulating ? (
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Live Monitoring
                  </span>
                ) : (
                  <span className="text-sm font-bold text-yellow-500 flex items-center gap-1">
                    <Radio size={12} className="text-yellow-500" /> System Standby
                  </span>
                )}
             </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
             <div className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-gray-400 text-sm mb-2">Active Fleet</h3>
                    <p className="text-3xl font-bold text-slate-100">{vehicles.length}</p>
                 </div>
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-gray-400 text-sm mb-2">Issues Predicted</h3>
                    <p className="text-3xl font-bold text-yellow-400">{vehicles.filter(v => v.status !== VehicleStatus.HEALTHY).length}</p>
                 </div>
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-gray-400 text-sm mb-2">Services Scheduled</h3>
                    <p className="text-3xl font-bold text-blue-400">{agentLogs.filter(l => l.agent === AgentType.SCHEDULING && l.status === 'success').length}</p>
                 </div>
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h3 className="text-gray-400 text-sm mb-2">Security Anomalies</h3>
                    <p className="text-3xl font-bold text-red-400">{uebaAlerts.filter(a => a.status === 'Active').length}</p>
                 </div>
               </div>



               <AlertsFeed 
                  alerts={alerts} 
                  onDismiss={handleDismissAlert} 
                  onView={handleViewVehicle} 
                  onBulkDismiss={handleBulkDismissAlerts}
                  onBulkResolve={handleBulkResolveAlerts}
               />

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Activity Log */}
                 <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-lg font-bold text-slate-100">Recent Agent Activity</h3>
                       <button onClick={() => setActiveTab('agents')} className="text-sm text-blue-400 hover:underline">View All</button>
                    </div>
                    <div className="space-y-3">
                      {agentLogs.slice(0, 5).map(log => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${log.status === 'blocked' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                            <div>
                              <p className="text-sm font-medium text-gray-200">{log.action}</p>
                              <p className="text-xs text-gray-500">{log.agent} • {log.timestamp.toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">{log.details.substring(0, 50)}...</span>
                        </div>
                      ))}
                      {agentLogs.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No activity yet. Start the simulation.</p>}
                    </div>
                 </div>

                 {/* Status Chart */}
                 <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-100 mb-4">Fleet Health Status</h3>
                    <div className="flex-1 min-h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', 
                              borderColor: theme === 'dark' ? '#334155' : '#cbd5e1', 
                              color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                              borderRadius: '8px'
                            }}
                            itemStyle={{ color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}
                          />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                 </div>
               </div>

               {/* New Demand Forecast Chart */}
               <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <TrendingUp className="text-cyan-400" /> Predictive Service Demand Forecast
                      </h3>
                      <p className="text-xs text-slate-500">Projected fleet-wide service requirements based on sensor aging trends</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-blue-500/50 border border-blue-500 rounded-sm"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Historical</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-cyan-400/20 border border-cyan-400 border-dashed rounded-sm"></div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Forecasted</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData}>
                        <defs>
                          <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorFore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} vertical={false} />
                        <XAxis dataKey="month" stroke={theme === 'dark' ? '#94a3b8' : '#475569'} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#475569'} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', 
                            borderColor: theme === 'dark' ? '#334155' : '#cbd5e1', 
                            borderRadius: '8px',
                            color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                          }}
                          itemStyle={{ fontSize: '12px', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="historical" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorHist)" 
                          activeDot={{ r: 6, strokeWidth: 0 }}
                          connectNulls
                        />
                        <Area 
                          type="monotone" 
                          dataKey="forecasted" 
                          stroke="#22d3ee" 
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorFore)" 
                          connectNulls
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Active Field Operations & Emergency Dispatches */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col">
                   <div className="flex items-center justify-between mb-4">
                      <div>
                         <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                            <Truck className="text-blue-400" size={20} /> Active Field Operations & Emergency Dispatches
                         </h3>
                         <p className="text-xs text-slate-500">Real-time status of on-road towing partners, mobile service units, and dealer appointments</p>
                      </div>
                      <span className="bg-slate-900 border border-slate-750 text-slate-400 px-2 py-1 rounded text-xs font-mono">
                         Total Actions: {dispatches.length}
                      </span>
                   </div>

                   <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {dispatches.length === 0 ? (
                         <div className="text-center py-8 text-slate-500 italic border border-dashed border-slate-750 rounded-xl">
                            No active dispatch operations at this time.
                         </div>
                      ) : (
                         dispatches.map(d => {
                            const v = vehicles.find(veh => veh.id === d.vehicleId);
                            return (
                               <div key={d.id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-slate-700">
                                  <div className="flex items-start gap-3">
                                     <div className={`p-2.5 rounded-lg border ${
                                        d.type === 'Towing' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        d.type === 'Mobile Service' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                     }`}>
                                        {d.type === 'Towing' ? <Truck size={18} /> : d.type === 'Mobile Service' ? <SlidersHorizontal size={18} /> : <ClipboardList size={18} />}
                                     </div>
                                     <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                           <span className="text-[10px] font-mono font-bold text-slate-500 px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">{d.id}</span>
                                           <span className="text-sm font-bold text-gray-200">{d.type}</span>
                                           {v && (
                                             <span className="text-xs text-blue-400 font-medium">
                                                for {v.owner} ({v.model})
                                             </span>
                                           )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{d.details}</p>
                                     </div>
                                  </div>
                                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                                     <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        d.status === 'Completed' ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-900/50' : 
                                        d.status === 'Arrived' ? 'text-blue-400 bg-blue-950/50 border border-blue-900/50' : 
                                        'text-yellow-400 bg-yellow-950/50 border-yellow-950/50 animate-pulse'
                                     }`}>
                                        {d.status}
                                     </span>
                                     <span className="text-[10px] font-mono text-slate-500">{d.timestamp.toLocaleTimeString()}</span>
                                  </div>
                               </div>
                            );
                         })
                      )}
                   </div>
                </div>
              </div>
           )}
          {activeTab === 'monitor' && (
            <VehicleMonitor 
              vehicles={vehicles} 
              theme={theme}
              onScheduleService={handleManualSchedule} 
              onLogService={handleLogService}
              onSimulateFailure={handleSimulateFailure}
              onAddDispatch={handleAddDispatch}
            />
          )}
          {activeTab === 'agents' && (
            <AgentOrchestrator 
              logs={agentLogs} 
              uebaAlerts={uebaAlerts} 
              vehicles={vehicles}
              onResolveUeba={handleResolveUeba}
              onDismissUeba={handleDismissUeba}
              onInjectUeba={handleInjectUeba}
            />
          )}
          {activeTab === 'manufacturing' && 
            <ManufacturingInsights 
              insights={insights} 
              onDelete={handleBulkDeleteInsights}
              onStatusChange={handleBulkStatusChange}
              onAddInsight={handleAddInsight}
            />
          }
        </div>
      </main>
    </div>
  );
};

export default App;
