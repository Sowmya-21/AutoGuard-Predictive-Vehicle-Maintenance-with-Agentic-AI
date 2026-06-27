
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Vehicle, VehicleStatus, MaintenanceRecord } from '../types';
import { 
  Activity, Thermometer, Droplet, Zap, Hash, X, User, Calendar, Gauge, Clock, 
  Wrench, ShieldCheck, AlertTriangle, TrendingUp, CheckCircle, Loader2, ClipboardList, 
  Search, Filter, ArrowUpDown, SlidersHorizontal, ChevronDown, Check, Car, Phone, 
  PhoneOff, MessageSquare, AlertOctagon, Truck, Volume2, MapPin, Map, Mic, MicOff, 
  Leaf, DollarSign, ShieldAlert, Eye, Compass, Sun, CloudRain, Navigation, Info, EyeOff
} from 'lucide-react';
import { askMaintenanceCopilot } from '../services/geminiService';

interface VehicleMonitorProps {
  vehicles: Vehicle[];
  theme?: 'light' | 'dark';
  onScheduleService: (vehicleId: string) => void;
  onLogService: (vehicleId: string, record: Omit<MaintenanceRecord, 'date'>) => void;
  onSimulateFailure: (vehicleId: string) => void;
  onAddDispatch?: (vehicleId: string, type: 'Towing' | 'Mobile Service' | 'Dealer Appointment', details: string) => void;
}

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick: (vehicle: Vehicle) => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onClick }) => {
  // Generate mock history for the last hour (20 data points)
  const data = Array.from({ length: 20 }, (_, i) => ({
    time: `${(20 - i) * 3}m`, // Time labels like "60m", "57m"...
    val: Number((vehicle.sensors.engineTemp + (Math.random() * 6 - 3)).toFixed(1))
  }));

  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case VehicleStatus.CRITICAL: return 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
      case VehicleStatus.WARNING: return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case VehicleStatus.SERVICING: return 'bg-blue-500/20 border-blue-500 text-blue-400';
      default: return 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400';
    }
  };

  const getBrakeColor = (val: number) => {
    if (val > 80) return 'text-red-400';
    if (val > 60) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getBrakeBarColor = (val: number) => {
    if (val > 80) return 'bg-red-500';
    if (val > 60) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div 
      onClick={() => onClick(vehicle)}
      className={`p-4 rounded-xl border ${getStatusColor(vehicle.status)} transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-xl relative overflow-hidden group ${
        vehicle.status === VehicleStatus.CRITICAL ? 'animate-pulse' : ''
      }`}
      style={{ animationDuration: '2s' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="font-bold text-lg text-slate-100 group-hover:text-blue-200 transition-colors">{vehicle.id}</h3>
          <p className="text-sm opacity-80">{vehicle.model}</p>
          <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
            <Hash size={10} /> {vehicle.vin}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${vehicle.status === 'Healthy' ? 'bg-emerald-500 text-black' : vehicle.status === 'Critical' ? 'bg-red-500 text-white' : vehicle.status === 'Warning' ? 'bg-yellow-500 text-black' : 'bg-blue-500 text-white'}`}>
          {vehicle.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4 relative z-10">
        <div className="flex items-center gap-2">
            <Thermometer size={16} className="text-orange-400" />
            <span className="text-gray-300">{vehicle.sensors.engineTemp.toFixed(1)}°C</span>
        </div>
        <div className="flex items-center gap-2">
            <Droplet size={16} className="text-blue-400" />
            <span className="text-gray-300">{vehicle.sensors.oilPressure.toFixed(1)} psi</span>
        </div>
        <div className="flex items-center gap-2">
            <Zap size={16} className="text-yellow-400" />
            <span className="text-gray-300">{vehicle.sensors.batteryVoltage.toFixed(1)}V</span>
        </div>
        <div className="flex items-center gap-2">
            <Activity size={16} className="text-purple-400" />
            <span className="text-gray-300">{vehicle.sensors.vibrationLevel.toFixed(1)} mm/s</span>
        </div>
      </div>

      <div className="mb-4 relative z-10">
         <div className="flex justify-between items-end mb-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
               <Activity size={14} className="text-slate-500" /> Brake Wear
            </span>
            <span className={`text-xs font-bold ${getBrakeColor(vehicle.sensors.brakeWear)}`}>
               {vehicle.sensors.brakeWear}%
            </span>
         </div>
         <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700/50">
            <div 
               className={`h-full rounded-full transition-all duration-500 ${getBrakeBarColor(vehicle.sensors.brakeWear)}`}
               style={{ width: `${vehicle.sensors.brakeWear}%` }} 
            />
         </div>
      </div>

      <div className="h-20 w-full opacity-60 relative z-10 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Tooltip 
               contentStyle={{ 
                 backgroundColor: typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? '#ffffff' : '#1e293b', 
                 border: typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? '1px solid #cbd5e1' : '1px solid #475569', 
                 borderRadius: '8px', 
                 fontSize: '12px', 
                 padding: '8px' 
               }}
               itemStyle={{ color: typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? '#0f172a' : '#e2e8f0' }}
               formatter={(value: number) => [`${value}°C`, 'Engine Temp']}
               labelStyle={{ display: 'none' }}
               cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Line type="monotone" dataKey="val" stroke="currentColor" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface VehicleDetailModalProps {
  vehicle: Vehicle;
  theme?: 'light' | 'dark';
  onClose: () => void;
  onScheduleService: () => void;
  onLogService: (record: Omit<MaintenanceRecord, 'date'>) => void;
  onSimulateFailure: () => void;
  onServiceConfirmed?: () => void;
  onAddDispatch?: (vehicleId: string, type: 'Towing' | 'Mobile Service' | 'Dealer Appointment', details: string) => void;
}

const TrendChart: React.FC<{ label: string; data: any[]; color: string; unit: string }> = ({ label, data, color, unit }) => (
  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs font-semibold text-slate-400">{label}</span>
      <span className="text-[10px] font-mono text-slate-500 uppercase">Recent Trend</span>
    </div>
    <div className="h-24 w-full opacity-80 hover:opacity-100 transition-opacity">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Tooltip 
             contentStyle={{ 
               backgroundColor: typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? '#ffffff' : '#0f172a', 
               borderColor: typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? '#cbd5e1' : '#334155', 
               fontSize: '12px', 
               padding: '4px',
               color: typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? '#0f172a' : '#f8fafc'
             }}
             itemStyle={{ color: color }}
             formatter={(value: number) => [`${value} ${unit}`, label]}
             labelStyle={{ display: 'none' }}
             cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            dot={false} 
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const REPAIR_CENTERS = [
  {
    id: 1,
    name: 'Westside Automotive & Diagnostic Hub',
    lat: 42,
    lng: 58,
    distance: '1.2 miles',
    phone: '(555) 019-2834',
    rating: 4.8,
    reviews: 142,
    specialties: ['Engine Diagnostics', 'Cooling System', 'Electrical'],
    address: '1480 West Broadway, Sector 4'
  },
  {
    id: 2,
    name: 'Elite EV Maintenance & Service Center',
    lat: 68,
    lng: 32,
    distance: '2.8 miles',
    phone: '(555) 024-8190',
    rating: 4.9,
    reviews: 98,
    specialties: ['Brake Recalibration', 'Battery & Inverters', 'Software Updates'],
    address: '302 Innovation Way, Tech Park'
  },
  {
    id: 3,
    name: 'Apex Collision & Precision Repair',
    lat: 32,
    lng: 78,
    distance: '4.5 miles',
    phone: '(555) 091-7762',
    rating: 4.6,
    reviews: 215,
    specialties: ['Towing Services', 'Suspension Tuning', 'Chassis Alignment'],
    address: '88 Industrial Boulevard, Gateway Central'
  }
];const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({ 
  vehicle, theme, onClose, onScheduleService, onLogService, onSimulateFailure, onServiceConfirmed, onAddDispatch 
}) => {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'twin' | 'wear' | 'reliability' | 'route' | 'copilot' | 'ar' | 'warranty' | 'emergency' | 'logs'>('twin');
  const [schedulingState, setSchedulingState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [serviceType, setServiceType] = useState<'Scheduled' | 'Repair' | 'Checkup'>('Repair');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  // AI Copilot Voice state
  const [copilotQuestion, setCopilotQuestion] = useState('');
  const [copilotLang, setCopilotLang] = useState('English');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copilotChat, setCopilotChat] = useState<{ sender: 'user' | 'assistant'; text: string }[]>(() => [
    { 
      sender: 'assistant', 
      text: `Hello! I am your AI Maintenance Copilot. Your ${vehicle.model} is currently running with a reliability score of ${vehicle.reliabilityScore}%. How can I assist you with your vehicle diagnostics today?` 
    }
  ]);

  // Route Risk State
  const [routeDestination, setRouteDestination] = useState(vehicle.routeContext.destination);
  const [routeTerrain, setRouteTerrain] = useState<'Flat' | 'Hilly' | 'Highway' | 'Urban'>(vehicle.routeContext.terrain);
  const [routeWeather, setRouteWeather] = useState<'Sunny' | 'Rainy' | 'Stormy' | 'Snowy'>(vehicle.routeContext.weather);
  const [routeRoadCondition, setRouteRoadCondition] = useState<'Good' | 'Average' | 'Potholes' | 'Slippery'>(vehicle.routeContext.roadCondition);
  const [routeRisk, setRouteRisk] = useState({
    level: vehicle.routeContext.riskLevel,
    reason: vehicle.routeContext.riskReason,
    score: vehicle.routeContext.riskLevel === 'High' ? 85 : vehicle.routeContext.riskLevel === 'Medium' ? 52 : 12
  });
  const [isRouteAnalyzing, setIsRouteAnalyzing] = useState(false);

  // AR Hotspot state
  const [selectedArHotspot, setSelectedArHotspot] = useState<string | null>(null);
  const [arCameraOpen, setArCameraOpen] = useState(false);

  // Map & Logs subtab state
  const [logsSubTab, setLogsSubTab] = useState<'logs' | 'map'>('logs');
  const [selectedCenter, setSelectedCenter] = useState<number | null>(null);
  const [callingCenter, setCallingCenter] = useState<string | null>(null);
  const [centerCallTimer, setCenterCallTimer] = useState(0);

  // Interactive Digital Twin Hotspot hover state
  const [twinHoveredPart, setTwinHoveredPart] = useState<string | null>(null);

  // Speech synthesis ref
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthesisRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  // Sync center call timer
  useEffect(() => {
    let timer: any;
    if (callingCenter) {
      timer = setInterval(() => setCenterCallTimer(p => p + 1), 1000);
    } else {
      setCenterCallTimer(0);
    }
    return () => clearInterval(timer);
  }, [callingCenter]);

  // Voice speech simulation
  const speakResponse = (text: string) => {
    if (!synthesisRef.current) return;
    synthesisRef.current.cancel();
    
    // Remove formatting prefixes
    const speechText = text.replace(/^\[Simulated [a-zA-Z\s]+ Response\] /, '');
    const utterance = new SpeechSynthesisUtterance(speechText);
    
    if (copilotLang === 'Hindi') utterance.lang = 'hi-IN';
    else if (copilotLang === 'Telugu') utterance.lang = 'te-IN';
    else if (copilotLang === 'Tamil') utterance.lang = 'ta-IN';
    else if (copilotLang === 'Kannada') utterance.lang = 'kn-IN';
    else if (copilotLang === 'Bengali') utterance.lang = 'bn-IN';
    else utterance.lang = 'en-US';

    setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthesisRef.current.speak(utterance);
  };

  const handleCopilotSend = async (customQuestion?: string) => {
    const questionText = customQuestion || copilotQuestion;
    if (!questionText.trim()) return;

    const userMsg = questionText;
    setCopilotChat(prev => [...prev, { sender: 'user', text: userMsg }]);
    setCopilotQuestion('');

    const assistantMsg = await askMaintenanceCopilot(vehicle, userMsg, copilotLang);
    setCopilotChat(prev => [...prev, { sender: 'assistant', text: assistantMsg }]);
    speakResponse(assistantMsg);
  };

  const handleVoiceListen = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const queryList = [
        "Why am I receiving this alert?",
        "Should I drive in the hills with this car?",
        "What is my estimated repair cost for the next 90 days?",
        "Is there any odometer tampering detected on my vehicle?",
        "How does my carbon footprint compare to average vehicles?"
      ];
      const randomQuery = queryList[Math.floor(Math.random() * queryList.length)];
      handleCopilotSend(randomQuery);
    }, 2500);
  };

  // Route Analysis simulator
  const handleAnalyzeRoute = () => {
    setIsRouteAnalyzing(true);
    setTimeout(() => {
      setIsRouteAnalyzing(false);
      let level: 'Low' | 'Medium' | 'High' = 'Low';
      let score = 15;
      let reason = "All vehicle systems report healthy telemetry for this route.";

      if (routeTerrain === 'Hilly') {
        if (vehicle.sensors.brakeWear > 60) {
          level = 'High';
          score = 88;
          reason = `CRITICAL: Worn brake pads (${vehicle.sensors.brakeWear}%) will encounter severe thermal loading and potential pad fade on downhill segments.`;
        } else if (vehicle.sensors.engineTemp > 100) {
          level = 'High';
          score = 80;
          reason = `CRITICAL: Engine temperature is high (${vehicle.sensors.engineTemp.toFixed(1)}°C). Climbing steep grades will trigger immediate cooling loop runaway.`;
        } else {
          level = 'Medium';
          score = 55;
          reason = "Moderate risk. Downhill transmission braking recommended to conserve brakes.";
        }
      } else if (routeWeather === 'Stormy' || routeRoadCondition === 'Slippery') {
        if (vehicle.sensors.vibrationLevel > 2.0) {
          level = 'High';
          score = 75;
          reason = "High risk. Suspension vibration indicates uneven traction which can worsen on wet roads.";
        } else {
          level = 'Medium';
          score = 45;
          reason = "Wet, slippery conditions. Anti-lock Braking System (ABS) reports stability, but slow speeds are advised.";
        }
      } else if (routeRoadCondition === 'Potholes') {
        if (vehicle.sensors.vibrationLevel > 2.0) {
          level = 'High';
          score = 78;
          reason = "High risk. Suspension dampener wear will lead to chassis fatigue and alignment failure on broken tarmac.";
        } else {
          level = 'Medium';
          score = 38;
          reason = "Minor suspension stress expected. Drive with caution.";
        }
      }

      setRouteRisk({ level, reason, score });
    }, 1500);
  };

  // Trigger autonomous rescue dispatch manually
  const handleTriggerEmergencyRescue = () => {
    if (onAddDispatch) {
      onAddDispatch(
        vehicle.id, 
        'Towing', 
        `Autonomous Emergency Breakdown dispatch. Apex Towing Truck #12 sent to GPS location. Emergency Bay #1 reserved.`
      );
      onScheduleService();
      onServiceConfirmed?.();
      setActiveTab('emergency');
    }
  };

  // Generate chart trends
  const generateHistory = (base: number, volatility: number) => {
    return Array.from({ length: 20 }, (_, i) => ({
      time: i,
      value: Number((base + (Math.random() * volatility * 2 - volatility)).toFixed(2))
    }));
  };

  const engineData = generateHistory(vehicle.sensors.engineTemp, 3);
  const oilData = generateHistory(vehicle.sensors.oilPressure, 5);
  const batteryData = generateHistory(vehicle.sensors.batteryVoltage, 0.3);
  const vibrationData = generateHistory(vehicle.sensors.vibrationLevel, 0.4);

  const handleScheduleSubmit = async () => {
    setSchedulingState('loading');
    onScheduleService();
    await new Promise(r => setTimeout(r, 1500));
    setSchedulingState('success');
    onServiceConfirmed?.();
    setTimeout(() => {
      setSchedulingState('idle');
      onClose();
    }, 1500);
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogService({
      type: serviceType,
      description: serviceDesc || 'Corrective overhaul',
      notes: serviceNotes || 'Logged via Digital Twin portal.'
    });
    setServiceDesc('');
    setServiceNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header bar */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-100">{vehicle.model}</h2>
                <span className="text-slate-400 font-mono text-xs px-2 py-0.5 bg-slate-950 rounded border border-slate-700">{vehicle.id}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">VIN: {vehicle.vin} | Owner: {vehicle.owner}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              vehicle.status === VehicleStatus.HEALTHY ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
              vehicle.status === VehicleStatus.CRITICAL ? 'bg-red-500/10 border-red-500/50 text-red-400 animate-pulse' :
              vehicle.status === VehicleStatus.WARNING ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' :
              'bg-blue-500/10 border-blue-500/50 text-blue-400'
            }`}>
              <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
              {vehicle.status}
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal body wrapper (Sidebar + Panel content) */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Sub-nav sidebar */}
          <aside className="w-56 bg-slate-950/40 border-r border-slate-800 p-3 flex flex-col gap-1 shrink-0 overflow-y-auto">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-3 mb-2 tracking-wider">Digital Twin Core</span>
            
            <SidebarTabBtn active={activeTab === 'twin'} onClick={() => setActiveTab('twin')} icon={<Car size={16} />} label="Digital Twin Schematic" />
            <SidebarTabBtn active={activeTab === 'wear'} onClick={() => setActiveTab('wear')} icon={<Activity size={16} />} label="Wear & Timeline" />
            <SidebarTabBtn active={activeTab === 'reliability'} onClick={() => setActiveTab('reliability')} icon={<ShieldCheck size={16} />} label="Reliability & Plans" />
            
            <span className="text-[10px] uppercase font-bold text-slate-500 px-3 mt-4 mb-2 tracking-wider">Predictive Engines</span>
            <SidebarTabBtn active={activeTab === 'route'} onClick={() => setActiveTab('route')} icon={<Navigation size={16} />} label="Route Risk Engine" />
            <SidebarTabBtn active={activeTab === 'copilot'} onClick={() => setActiveTab('copilot')} icon={<MessageSquare size={16} />} label="AI Copilot & Voice" />
            <SidebarTabBtn active={activeTab === 'ar'} onClick={() => setActiveTab('ar')} icon={<Eye size={16} />} label="AR Inspection" />
            
            <span className="text-[10px] uppercase font-bold text-slate-500 px-3 mt-4 mb-2 tracking-wider">Risk & Operations</span>
            <SidebarTabBtn active={activeTab === 'warranty'} onClick={() => setActiveTab('warranty')} icon={<ShieldAlert size={16} />} label="Warranty & Fraud" />
            <SidebarTabBtn active={activeTab === 'emergency'} onClick={() => setActiveTab('emergency')} icon={<AlertOctagon size={16} />} label="Emergency Rescue" />
            <SidebarTabBtn active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<ClipboardList size={16} />} label="Logs & Map Grid" />
          </aside>

          {/* Active Tab Screen */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-900/10">
            
            {/* TAB: Digital Twin */}
            {activeTab === 'twin' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white">Live Virtual Replica</h3>
                    <p className="text-xs text-slate-400">Hover over hotspots to isolate sensor packets</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Leaf size={18} className="text-emerald-400" />
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Carbon Footprint</p>
                      <p className="text-sm font-bold text-slate-200">{vehicle.carbonEmissions.current} g/km <span className="text-[10px] text-emerald-400 font-normal">(-{vehicle.carbonEmissions.potentialReduction} g/km)</span></p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Visual blueprint panel */}
                  <div className="lg:col-span-2 bg-slate-950/60 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06),transparent_70%)]"></div>
                    
                    {/* Interactive blueprint outline */}
                    <svg viewBox="0 0 240 100" className="w-full max-w-lg relative z-10">
                      {/* Car body outline */}
                      <path 
                        d="M 20,40 Q 25,25 45,22 L 95,20 Q 115,10 155,10 L 195,15 Q 220,18 225,32 L 230,45 Q 235,50 230,55 L 225,65 Q 222,80 195,80 L 45,80 Q 25,78 20,62 L 15,50 Z" 
                        fill="none" 
                        stroke="#334155" 
                        strokeWidth="1.5" 
                        strokeDasharray="4 2"
                      />
                      <path 
                        d="M 30,40 C 45,40 195,40 210,40" 
                        fill="none" 
                        stroke="#1e293b" 
                        strokeWidth="1"
                      />
                      
                      {/* Wheels */}
                      <circle cx="58" cy="80" r="14" fill="#090d16" stroke="#475569" strokeWidth="1.5" />
                      <circle cx="58" cy="80" r="6" fill="#1e293b" />
                      <circle cx="178" cy="80" r="14" fill="#090d16" stroke="#475569" strokeWidth="1.5" />
                      <circle cx="178" cy="80" r="6" fill="#1e293b" />

                      {/* Hotspots */}
                      {/* Engine hotspot */}
                      <circle 
                        cx="120" cy="30" r="10" 
                        fill={vehicle.sensors.engineTemp > 105 ? '#ef4444' : vehicle.sensors.engineTemp > 95 ? '#eab308' : '#10b981'} 
                        fillOpacity="0.25"
                        stroke={vehicle.sensors.engineTemp > 105 ? '#ef4444' : vehicle.sensors.engineTemp > 95 ? '#eab308' : '#10b981'}
                        strokeWidth="1.5"
                        className="cursor-pointer animate-pulse"
                        onMouseEnter={() => setTwinHoveredPart('engine')}
                        onMouseLeave={() => setTwinHoveredPart(null)}
                      />
                      {/* Brakes (front) */}
                      <circle 
                        cx="58" cy="80" r="7" 
                        fill={vehicle.sensors.brakeWear > 80 ? '#ef4444' : vehicle.sensors.brakeWear > 60 ? '#eab308' : '#10b981'} 
                        fillOpacity="0.25"
                        stroke={vehicle.sensors.brakeWear > 80 ? '#ef4444' : vehicle.sensors.brakeWear > 60 ? '#eab308' : '#10b981'}
                        strokeWidth="1.5"
                        className="cursor-pointer"
                        onMouseEnter={() => setTwinHoveredPart('brakes')}
                        onMouseLeave={() => setTwinHoveredPart(null)}
                      />
                      {/* Brakes (rear) */}
                      <circle 
                        cx="178" cy="80" r="7" 
                        fill={vehicle.sensors.brakeWear > 80 ? '#ef4444' : vehicle.sensors.brakeWear > 60 ? '#eab308' : '#10b981'} 
                        fillOpacity="0.25"
                        stroke={vehicle.sensors.brakeWear > 80 ? '#ef4444' : vehicle.sensors.brakeWear > 60 ? '#eab308' : '#10b981'}
                        strokeWidth="1.5"
                        className="cursor-pointer"
                        onMouseEnter={() => setTwinHoveredPart('brakes')}
                        onMouseLeave={() => setTwinHoveredPart(null)}
                      />
                      {/* Battery hotspot */}
                      <circle 
                        cx="150" cy="55" r="9" 
                        fill={vehicle.sensors.batteryVoltage < 11.5 ? '#eab308' : '#10b981'} 
                        fillOpacity="0.25"
                        stroke={vehicle.sensors.batteryVoltage < 11.5 ? '#eab308' : '#10b981'}
                        strokeWidth="1.5"
                        className="cursor-pointer"
                        onMouseEnter={() => setTwinHoveredPart('battery')}
                        onMouseLeave={() => setTwinHoveredPart(null)}
                      />
                      {/* Suspension / Vibration */}
                      <circle 
                        cx="90" cy="65" r="8" 
                        fill={vehicle.sensors.vibrationLevel > 2.0 ? '#ef4444' : '#10b981'} 
                        fillOpacity="0.25"
                        stroke={vehicle.sensors.vibrationLevel > 2.0 ? '#ef4444' : '#10b981'}
                        strokeWidth="1.5"
                        className="cursor-pointer"
                        onMouseEnter={() => setTwinHoveredPart('suspension')}
                        onMouseLeave={() => setTwinHoveredPart(null)}
                      />
                    </svg>

                    {/* Popover overlay for hovered part */}
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-slate-800 p-3 rounded-lg text-xs flex justify-between items-center transition-opacity duration-300">
                      {twinHoveredPart === 'engine' ? (
                        <>
                          <span className="font-bold text-slate-100 flex items-center gap-1.5"><Thermometer size={14} className="text-orange-400" /> Thermal Subsystem (Engine Core)</span>
                          <span className="font-mono text-slate-300">Temp: {vehicle.sensors.engineTemp.toFixed(1)}°C | Oil: {vehicle.sensors.oilPressure.toFixed(1)} psi</span>
                        </>
                      ) : twinHoveredPart === 'brakes' ? (
                        <>
                          <span className="font-bold text-slate-100 flex items-center gap-1.5"><Activity size={14} className="text-red-400" /> Braking System (Front/Rear Pads)</span>
                          <span className="font-mono text-slate-300">Wear Coefficient: {vehicle.sensors.brakeWear}%</span>
                        </>
                      ) : twinHoveredPart === 'battery' ? (
                        <>
                          <span className="font-bold text-slate-100 flex items-center gap-1.5"><Zap size={14} className="text-yellow-400" /> High-Voltage Accumulator (Battery Cells)</span>
                          <span className="font-mono text-slate-300">Voltage: {vehicle.sensors.batteryVoltage.toFixed(1)}V</span>
                        </>
                      ) : twinHoveredPart === 'suspension' ? (
                        <>
                          <span className="font-bold text-slate-100 flex items-center gap-1.5"><SlidersHorizontal size={14} className="text-purple-400" /> Chassis Vibration Dampening</span>
                          <span className="font-mono text-slate-300">Vibration Amplitude: {vehicle.sensors.vibrationLevel.toFixed(2)} mm/s</span>
                        </>
                      ) : (
                        <span className="text-slate-500 italic">Hover over chassis nodes to query specific microcontrollers.</span>
                      )}
                    </div>
                  </div>

                  {/* Circular Reliability Score widget */}
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col items-center justify-center">
                    <h4 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider text-center">AI Reliability Score</h4>
                    
                    <div className="relative flex items-center justify-center h-32 w-32 mb-4">
                      {/* SVG Gauge */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="64" cy="64" r="50" fill="none" stroke="#1e293b" strokeWidth="8" />
                        <circle 
                          cx="64" cy="64" r="50" 
                          fill="none" 
                          stroke={vehicle.reliabilityScore > 80 ? '#10b981' : vehicle.reliabilityScore > 60 ? '#eab308' : '#ef4444'} 
                          strokeWidth="8" 
                          strokeDasharray={314}
                          strokeDashoffset={314 - (314 * vehicle.reliabilityScore) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-extrabold text-white font-mono">{vehicle.reliabilityScore}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                      </div>
                    </div>
                    
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-4 ${
                      vehicle.reliabilityScore > 90 ? 'bg-emerald-950/60 border border-emerald-900/50 text-emerald-400' :
                      vehicle.reliabilityScore > 80 ? 'bg-emerald-950/60 border border-emerald-900/50 text-emerald-400' :
                      vehicle.reliabilityScore > 60 ? 'bg-yellow-950/60 border border-yellow-900/50 text-yellow-400' :
                      'bg-red-950/60 border border-red-900/50 text-red-400'
                    }`}>
                      {vehicle.reliabilityScore >= 95 ? 'Excellent' :
                       vehicle.reliabilityScore >= 80 ? 'Good' :
                       vehicle.reliabilityScore >= 60 ? 'Attention Needed' : 'High Risk'}
                    </span>

                    <p className="text-[10px] text-slate-400 text-center leading-relaxed">Proprietary neural reliability model based on real-time component stress logs and driver kinetics.</p>
                  </div>

                </div>
              </div>
            )}

            {/* TAB: Wear & Timeline */}
            {activeTab === 'wear' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Component Wear & RUL</h3>
                  <p className="text-xs text-slate-400">Predicted Remaining Useful Life (RUL) and mechanical fatigue timelines</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Wear bars */}
                  <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl space-y-5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subsystem Wear Indexes</h4>
                    
                    <WearBarLabel label="Front & Rear Brakes" wear={vehicle.sensors.brakeWear} rul={`${vehicle.remainingUsefulLife.brakes.toLocaleString()} km RUL`} threshold={90} />
                    <WearBarLabel label="Engine Thermal Block" wear={Math.min(100, Math.max(0, (vehicle.sensors.engineTemp - 50) * 1.5))} rul={`${vehicle.remainingUsefulLife.engine.toLocaleString()} km RUL`} threshold={100} />
                    <WearBarLabel label="Battery Cell Pack" wear={Math.min(100, Math.max(0, (14.5 - vehicle.sensors.batteryVoltage) * 25))} rul={`${vehicle.remainingUsefulLife.battery.toLocaleString()} km RUL`} threshold={100} />
                    <WearBarLabel label="Drivetrain Transmission" wear={Math.min(100, Math.max(0, vehicle.sensors.vibrationLevel * 20))} rul={`${vehicle.remainingUsefulLife.transmission.toLocaleString()} km RUL`} threshold={100} />
                  </div>

                  {/* Failure timeline */}
                  <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl flex flex-col">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Predicted Failure Timeline</h4>
                    
                    <div className="flex-1 space-y-4">
                      {vehicle.predictedFailureTimeline.length > 0 ? (
                        vehicle.predictedFailureTimeline.map((item, idx) => (
                          <div key={idx} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-slate-200">{item.component}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-red-400 bg-red-950/40 px-2 py-0.5 rounded font-bold">{item.probability}% Probability</span>
                                <span className="text-[10px] text-slate-500">Forecasted alert window</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-extrabold text-red-400 font-mono">T-{item.daysRemaining}</span>
                              <span className="text-[10px] block text-slate-500 font-bold uppercase tracking-wider">Days</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 italic py-12 border border-dashed border-slate-800 rounded-lg">
                          <CheckCircle className="text-emerald-500/30 mb-2" size={32} />
                          No imminent component replacement forecasted.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB: Reliability & Plans */}
            {activeTab === 'reliability' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Reliability Score & Plans</h3>
                  <p className="text-xs text-slate-400">Neural reliability breakdown alongside adaptive maintenance schedules</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Formula details */}
                  <div className="lg:col-span-1 bg-slate-950/50 border border-slate-800 p-5 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reliability Matrix Components</h4>
                    
                    <FormulaMetric label="Vehicle Health Core" weight={30} value={vehicle.reliabilityDetails.health} />
                    <FormulaMetric label="Driver Behavior Kinetic" weight={25} value={vehicle.reliabilityDetails.behavior} subText={`Habit: ${vehicle.drivingHabit}`} />
                    <FormulaMetric label="Wear Risk Probability" weight={20} value={vehicle.reliabilityDetails.probability} />
                    <FormulaMetric label="Maintenance Recency" weight={15} value={vehicle.reliabilityDetails.history} />
                    <FormulaMetric label="Telemetry Link Stability" weight={10} value={vehicle.reliabilityDetails.sensor} />
                  </div>

                  {/* Personalized Maintenance Plans */}
                  <div className="lg:col-span-2 bg-slate-950/50 border border-slate-800 p-5 rounded-xl">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Personalized Maintenance Schedule</h4>
                    
                    <div className="space-y-3">
                      {vehicle.personalizedSchedule.map((plan, idx) => (
                        <div key={idx} className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 flex items-start gap-4">
                          <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded">
                            <Wrench size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <h5 className="text-xs font-bold text-slate-200">{plan.task}</h5>
                              <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/50 border border-blue-900/30 px-2 py-0.5 rounded whitespace-nowrap">Due: {plan.dueInKm.toLocaleString()} km</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{plan.rationale}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB: Route-Aware Risk */}
            {activeTab === 'route' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Route-Aware Failure Prediction</h3>
                  <p className="text-xs text-slate-400">Assess mechanical risk profiles dynamically along your path parameters</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Route configurations */}
                  <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Route Parameters</h4>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Destination Name</label>
                      <input 
                        type="text" 
                        value={routeDestination} 
                        onChange={e => setRouteDestination(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Terrain Profile</label>
                      <select 
                        value={routeTerrain} 
                        onChange={e => setRouteTerrain(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Flat">Flat Highway/Urban</option>
                        <option value="Hilly">Hilly Terrain (Steep Descent)</option>
                        <option value="Highway">Expressway Cruise</option>
                        <option value="Urban">Stop-and-Go Congested</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Local Weather</label>
                      <select 
                        value={routeWeather} 
                        onChange={e => setRouteWeather(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Sunny">Sunny Clear Sky</option>
                        <option value="Rainy">Rainy Wet Tarmac</option>
                        <option value="Stormy">Severe Rain & Storm</option>
                        <option value="Snowy">Freezing Snow/Ice</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Road Condition</label>
                      <select 
                        value={routeRoadCondition} 
                        onChange={e => setRouteRoadCondition(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Good">Good Smoothed Highway</option>
                        <option value="Average">Average Tarmac Grid</option>
                        <option value="Potholes">Heavy Potholes / Broken Roads</option>
                        <option value="Slippery">Low Traction / Muddy</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleAnalyzeRoute}
                      disabled={isRouteAnalyzing}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      {isRouteAnalyzing ? (
                        <><Loader2 size={13} className="animate-spin" /> Simulating...</>
                      ) : (
                        <><Compass size={13} /> Analyze Route Risk</>
                      )}
                    </button>
                  </div>

                  {/* Route predictions outputs */}
                  <div className="lg:col-span-2 bg-slate-950/50 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dynamic Risk Assessment</h4>
                      
                      <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                        <div className="flex items-center gap-2">
                          <Navigation size={18} className="text-blue-400" />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500">Destination Path</span>
                            <h5 className="text-sm font-bold text-slate-200">{routeDestination}</h5>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Weather Context</span>
                          <p className="text-xs font-bold text-slate-300 flex items-center gap-1 justify-end">
                            {routeWeather === 'Sunny' ? <Sun size={12} className="text-yellow-400" /> : <CloudRain size={12} className="text-blue-400" />}
                            {routeWeather} ({routeTerrain})
                          </p>
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                        routeRisk.level === 'High' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        routeRisk.level === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                        'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                            <AlertTriangle size={14} /> {routeRisk.level} Risk Profile
                          </span>
                          <span className="text-sm font-extrabold font-mono">{routeRisk.score}% Risk Factor</span>
                        </div>
                        <p className="text-xs leading-relaxed italic opacity-90">{routeRisk.reason}</p>
                      </div>
                    </div>

                    {routeRisk.level === 'High' && (
                      <div className="mt-4 p-3 bg-red-950/20 border border-red-900/30 rounded-lg flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <AlertOctagon size={16} className="text-red-400 animate-bounce" />
                          <p className="text-[11px] text-red-400 font-semibold leading-relaxed">Urgent service advisable before executing route.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleTriggerEmergencyRescue}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold transition whitespace-nowrap"
                        >
                          Dispatch Service
                        </button>
                      </div>
                    )}

                  </div>

                </div>
              </div>
            )}

            {/* TAB: AI Copilot & Voice */}
            {activeTab === 'copilot' && (
              <div className="flex flex-col h-[520px]">
                <div className="flex justify-between items-center shrink-0 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">AI Maintenance Copilot</h3>
                    <p className="text-xs text-slate-400">Ask diagnostics queries in multiple languages (Voice-to-Speech active)</p>
                  </div>
                  
                  {/* Language selection */}
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Language</span>
                    <select
                      value={copilotLang}
                      onChange={e => setCopilotLang(e.target.value)}
                      className="bg-transparent text-xs text-slate-300 outline-none border-none cursor-pointer"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">हिंदी (Hindi)</option>
                      <option value="Telugu">తెలుగు (Telugu)</option>
                      <option value="Tamil">தமிழ் (Tamil)</option>
                      <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
                      <option value="Bengali">বাংলা (Bengali)</option>
                    </select>
                  </div>
                </div>

                {/* Conversation board */}
                <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4 custom-scrollbar mb-4">
                  {copilotChat.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className={`p-2 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        msg.sender === 'assistant' ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {msg.sender === 'assistant' ? <Volume2 size={16} /> : <User size={16} />}
                      </div>
                      <div className="space-y-1">
                        <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                          msg.sender === 'assistant' 
                            ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none' 
                            : 'bg-blue-600 text-white rounded-tr-none'
                        }`}>
                          {msg.text}
                        </div>
                        {msg.sender === 'assistant' && (
                          <button
                            onClick={() => speakResponse(msg.text)}
                            className="text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1 ml-1"
                          >
                            <Volume2 size={10} /> Speak
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isSpeaking && (
                    <div className="flex items-center gap-1.5 h-6 bg-slate-900/30 border border-slate-800/40 rounded-full px-3 py-1 w-fit animate-pulse">
                      <div className="w-1 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Audio Playback Active</span>
                    </div>
                  )}
                </div>

                {/* Question suggestions */}
                <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
                  <PresetChip label="Why am I receiving this alert?" onClick={() => handleCopilotSend("Why am I receiving this alert?")} />
                  <PresetChip label="Evaluate hilly terrain risk" onClick={() => handleCopilotSend("Should I drive in the hills with this car?")} />
                  <PresetChip label="Forecast maintenance expenses" onClick={() => handleCopilotSend("Evaluate estimated expenses and failures for next 90 days.")} />
                  <PresetChip label="Verify warranty audit flags" onClick={() => handleCopilotSend("Are there any odometer rollback or duplicate claim logs flag?")} />
                </div>

                {/* Input panel */}
                <div className="flex gap-2 shrink-0">
                  <input 
                    type="text" 
                    value={copilotQuestion}
                    onChange={e => setCopilotQuestion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCopilotSend()}
                    placeholder="Ask copilot about vehicle health..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  
                  <button
                    type="button"
                    onClick={handleVoiceListen}
                    className={`p-2.5 rounded-xl border transition ${
                      isListening 
                        ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                    title="Simulate Voice Input"
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopilotSend()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

            {/* TAB: AR Inspection */}
            {activeTab === 'ar' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">AR Engine Inspection</h3>
                  <p className="text-xs text-slate-400">Simulated smartphone overlay highlighting engine components</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* AR Viewport */}
                  <div className="lg:col-span-2 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative h-[360px] flex items-center justify-center">
                    {/* Retro Camera Reticle Overlay */}
                    <div className="absolute inset-0 border-[16px] border-black/45 pointer-events-none z-10 flex flex-col justify-between p-4">
                      <div className="flex justify-between text-[9px] font-mono text-slate-500">
                        <span>REC [●] 60FPS</span>
                        <span>ISO 400</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-slate-500">
                        <span>F2.8</span>
                        <span>AR SCAN ENABLED</span>
                      </div>
                    </div>
                    
                    {/* Reticle brackets */}
                    <div className="absolute h-24 w-24 border border-blue-500/30 rounded pointer-events-none z-10 flex items-center justify-center">
                      <div className="h-4 w-4 border-t-2 border-l-2 border-blue-400 absolute top-0 left-0"></div>
                      <div className="h-4 w-4 border-t-2 border-r-2 border-blue-400 absolute top-0 right-0"></div>
                      <div className="h-4 w-4 border-b-2 border-l-2 border-blue-400 absolute bottom-0 left-0"></div>
                      <div className="h-4 w-4 border-b-2 border-r-2 border-blue-400 absolute bottom-0 right-0"></div>
                      <span className="text-[8px] font-mono text-blue-400/50 animate-pulse">AUTOFOCUS</span>
                    </div>

                    {/* SVG Engine bay blueprint schematic */}
                    <svg viewBox="0 0 200 120" className="w-full max-w-md relative z-0">
                      {/* Engine block structure */}
                      <rect x="50" y="30" width="100" height="60" rx="4" fill="none" stroke="#334155" strokeWidth="1.5" />
                      
                      {/* Radiator in front */}
                      <rect 
                        x="50" y="10" width="100" height="12" rx="2" 
                        fill="none" 
                        stroke={vehicle.sensors.engineTemp > 105 ? '#ef4444' : '#1e293b'} 
                        strokeWidth="1.5"
                        className="cursor-pointer hover:stroke-yellow-400"
                        onClick={() => setSelectedArHotspot('radiator')}
                      />
                      <text x="100" y="18" fill="#475569" fontSize="6" textAnchor="middle">Radiator Fan</text>

                      {/* Engine cylinder block */}
                      <rect 
                        x="70" y="40" width="60" height="40" rx="2" 
                        fill="none" 
                        stroke={vehicle.sensors.vibrationLevel > 2.0 ? '#ef4444' : '#334155'} 
                        strokeWidth="1.5" 
                        className="cursor-pointer hover:stroke-yellow-400"
                        onClick={() => setSelectedArHotspot('block')}
                      />
                      <text x="100" y="62" fill="#475569" fontSize="7" textAnchor="middle" fontWeight="bold">Motor Core</text>

                      {/* Battery node */}
                      <rect 
                        x="160" y="25" width="25" height="30" rx="2" 
                        fill="none" 
                        stroke={vehicle.sensors.batteryVoltage < 11.5 ? '#eab308' : '#334155'} 
                        strokeWidth="1.5"
                        className="cursor-pointer hover:stroke-yellow-400"
                        onClick={() => setSelectedArHotspot('battery')}
                      />
                      <text x="172.5" y="42" fill="#475569" fontSize="6" textAnchor="middle">12V Batt</text>

                      {/* Oil fluid cap */}
                      <circle 
                        cx="120" cy="48" r="4" 
                        fill="none" 
                        stroke={vehicle.sensors.oilPressure < 25 ? '#ef4444' : '#334155'} 
                        strokeWidth="1.5"
                        className="cursor-pointer hover:stroke-yellow-400"
                        onClick={() => setSelectedArHotspot('oil')}
                      />
                    </svg>

                    <div className="absolute top-4 left-4 bg-slate-900/80 border border-slate-800 px-2 py-1 rounded text-[9px] text-slate-300 font-mono z-10">
                      Camera Sync: [OK]
                    </div>
                  </div>

                  {/* AR Instructions panel */}
                  <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Inspected Part Details</h4>
                      
                      {selectedArHotspot === 'radiator' ? (
                        <ArPartGuide 
                          title="Radiator Assembly & Coolant"
                          status={vehicle.sensors.engineTemp > 105 ? 'Critical' : 'Normal'}
                          telemetry={`Temp: ${vehicle.sensors.engineTemp.toFixed(1)}°C`}
                          steps={[
                            "Wait at least 30 minutes for coolant pressure to vent.",
                            "Locate the coolant bypass hose and inspect for visible hairline stress cracks.",
                            "Verify radiator fan relay switches on when coolant exceeds 98°C."
                          ]}
                        />
                      ) : selectedArHotspot === 'block' ? (
                        <ArPartGuide 
                          title="Engine Cylinder Block"
                          status={vehicle.sensors.vibrationLevel > 2.0 ? 'Critical' : 'Normal'}
                          telemetry={`Vibration: ${vehicle.sensors.vibrationLevel.toFixed(2)} mm/s`}
                          steps={[
                            "Examine engine mounts for bushing crack fatigue.",
                            "Perform cylinder pressure test to check head gasket seal.",
                            "Verify combustion cylinder firing balance via engine harness logs."
                          ]}
                        />
                      ) : selectedArHotspot === 'battery' ? (
                        <ArPartGuide 
                          title="12V Auxiliary Accumulator"
                          status={vehicle.sensors.batteryVoltage < 11.5 ? 'Warning' : 'Normal'}
                          telemetry={`Voltage: ${vehicle.sensors.batteryVoltage.toFixed(1)}V`}
                          steps={[
                            "Use voltmeter to check standing terminal voltage (Normal: 12.6V).",
                            "Clean sulfated scaling from the positive cable terminal ring.",
                            "Perform battery load capacity test to confirm grid charge hold."
                          ]}
                        />
                      ) : selectedArHotspot === 'oil' ? (
                        <ArPartGuide 
                          title="Oil Fluid System Cap"
                          status={vehicle.sensors.oilPressure < 25 ? 'Critical' : 'Normal'}
                          telemetry={`Pressure: ${vehicle.sensors.oilPressure.toFixed(1)} psi`}
                          steps={[
                            "Check oil dipstick fill level (ensure oil viscosity looks clear).",
                            "Inspect oil filter gasket seal for pressure seepage leakage.",
                            "Test oil pressure sensor connection for socket pin corrosion."
                          ]}
                        />
                      ) : (
                        <div className="py-12 text-center text-slate-550 text-xs italic">
                          Click any engine schematic component on the camera viewer to launch inspection overlay instructions.
                        </div>
                      )}
                    </div>

                    {selectedArHotspot && (
                      <button
                        type="button"
                        onClick={() => setSelectedArHotspot(null)}
                        className="w-full mt-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded text-xs font-bold transition"
                      >
                        Reset AR Overlay
                      </button>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* TAB: Warranty & Fraud */}
            {activeTab === 'warranty' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">AI Fraud & Warranty Claims Audit</h3>
                  <p className="text-xs text-slate-400">AI behavioral analytics auditing claims for odometer tampering or mileage abuse</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Fraud score card */}
                  <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl flex flex-col justify-center items-center">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Warranty Fraud Risk Index</h4>
                    
                    <div className="relative flex items-center justify-center h-28 w-28 mb-4">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="56" cy="56" r="45" fill="none" stroke="#1e293b" strokeWidth="6" />
                        <circle 
                          cx="56" cy="56" r="45" 
                          fill="none" 
                          stroke={vehicle.fraudRisk.score > 70 ? '#ef4444' : vehicle.fraudRisk.score > 40 ? '#eab308' : '#10b981'} 
                          strokeWidth="6" 
                          strokeDasharray={282}
                          strokeDashoffset={282 - (282 * vehicle.fraudRisk.score) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute text-xl font-extrabold text-white font-mono">{vehicle.fraudRisk.score}%</div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      vehicle.fraudRisk.score > 70 ? 'bg-red-950/60 border border-red-900/50 text-red-400' :
                      vehicle.fraudRisk.score > 40 ? 'bg-yellow-950/60 border border-yellow-900/50 text-yellow-400' :
                      'bg-emerald-950/60 border border-emerald-900/50 text-emerald-400'
                    }`}>
                      {vehicle.fraudRisk.score > 70 ? 'High Audit Alert' :
                       vehicle.fraudRisk.score > 40 ? 'Review Needed' : 'Low Risk Claim'}
                    </span>
                  </div>

                  {/* Flagged reasons list */}
                  <div className="lg:col-span-2 bg-slate-950/50 border border-slate-800 p-5 rounded-xl">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Behavioral UEBA Flag Audit Log</h4>
                    
                    <div className="space-y-3">
                      {vehicle.fraudRisk.flags.length > 0 ? (
                        vehicle.fraudRisk.flags.map((flag, idx) => (
                          <div key={idx} className="p-3 bg-red-950/15 border border-red-900/25 rounded-lg flex items-start gap-3">
                            <ShieldAlert size={16} className="text-red-450 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-red-400">UEBA Flag #{idx + 101}</p>
                              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{flag}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-slate-550 text-xs italic border border-dashed border-slate-800 rounded-lg">
                          <ShieldCheck size={28} className="text-emerald-500/30 mb-2 mx-auto" />
                          No warranty abuse or claim manipulation indicators flagged for this VIN.
                        </div>
                      )}

                      <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-850 space-y-2 mt-4">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Warranty Coverage Prediction</span>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">Standard Powertrain Coverage</span>
                          <span className={vehicle.fraudRisk.score > 70 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {vehicle.fraudRisk.score > 70 ? 'Suspended (Claim Blocked)' : '95% Approval Probability'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB: Emergency Rescue */}
            {activeTab === 'emergency' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Emergency Breakdown Agent</h3>
                  <p className="text-xs text-slate-400">Autonomous coordination protocols triggered for severe mechanical failures</p>
                </div>

                {vehicle.status === VehicleStatus.CRITICAL || vehicle.status === VehicleStatus.WARNING ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Autopilot coordinate checklist */}
                    <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Loader2 className="animate-spin text-red-500" size={14} /> Autonomous Rescue Pipeline
                      </h4>

                      <RescueStep 
                        label="Reserve emergency service center slot" 
                        desc="Bay booked tomorrow at 10:00 AM at Westside Automotive Hub." 
                        completed={true} 
                      />
                      <RescueStep 
                        label="Coordinate roadside towing dispatcher" 
                        desc="Flatbed Tow Truck #09 dispatched. Live link sent to driver app." 
                        completed={true} 
                      />
                      <RescueStep 
                        label="Alert emergency family contacts" 
                        desc={`SMS sent to Priya Sharma (Sister): "AutoGuard alert. Kiran's CityFlow Sedan (V-105) experienced critical engine temp anomaly. Towing booked to Westside Hub."`} 
                        completed={true} 
                      />
                    </div>

                    {/* Quick overview of towing dispatch */}
                    <div className="bg-slate-950/50 border border-slate-800 p-5 rounded-xl flex flex-col justify-between">
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Towing Dispatch Overview</span>
                        <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg">
                          <p className="text-xs text-slate-300 leading-relaxed font-medium">
                            Flatbed towing is dispatched. Vehicle GPS has been shared with emergency responders and repair shops.
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-850 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onAddDispatch) {
                              onAddDispatch(vehicle.id, 'Mobile Service', `Mobile emergency van sent to check cooling fluid lines for ${vehicle.id}.`);
                            }
                          }}
                          className="flex-1 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          Send Mobile Van
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onLogService({
                              type: 'Repair',
                              description: 'Cooling pump seal replacement',
                              notes: 'Repaired coolant loop seal under emergency warranty claim.'
                            });
                            onClose();
                          }}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          Resolve & Reset Status
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="h-[250px] flex flex-col items-center justify-center border border-dashed border-slate-800 bg-slate-950/30 rounded-xl text-slate-500">
                    <ShieldCheck className="text-emerald-500/40 mb-3" size={48} />
                    <h4 className="text-sm font-bold text-slate-300">Vehicle operating within safety envelope</h4>
                    <p className="text-xs text-slate-500 mt-1">Autonomous emergency agent standby. No active crash or breakdown alerts.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Logs & Map Grid */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                
                {/* Tab switch header */}
                <div className="flex border-b border-slate-850 shrink-0 mb-4">
                  <button
                    type="button"
                    onClick={() => setLogsSubTab('logs')}
                    className={`flex items-center gap-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all ${
                      logsSubTab === 'logs'
                        ? 'border-emerald-500 text-emerald-400 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Clock size={14} /> Telemetry Logs & History
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogsSubTab('map')}
                    className={`flex items-center gap-2 pb-3 px-1 ml-6 text-sm font-semibold border-b-2 transition-all ${
                      logsSubTab === 'map'
                        ? 'border-blue-500 text-blue-400 font-bold'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MapPin size={14} /> Nearby Repair Locator
                  </button>
                </div>

                {logsSubTab === 'logs' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Charts */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TrendChart label="Engine Temperature" data={engineData} color="#f97316" unit="°C" />
                        <TrendChart label="Oil Pressure" data={oilData} color="#60a5fa" unit="psi" />
                        <TrendChart label="Battery Voltage" data={batteryData} color="#facc15" unit="V" />
                        <TrendChart label="Suspension Vibration" data={vibrationData} color="#c084fc" unit="mm/s" />
                      </div>
                    </div>
                    
                    {/* Service records */}
                    <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl max-h-[360px] overflow-y-auto custom-scrollbar">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Historical Records</h4>
                      
                      <div className="relative border-l border-slate-800 ml-2 space-y-5 pb-2">
                        {vehicle.history.map((record, idx) => (
                          <div key={idx} className="pl-6 relative">
                            <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-800 border-2 border-slate-600"></div>
                            <div className="flex justify-between items-start mb-0.5">
                              <span className="text-xs font-bold text-slate-200">{record.description}</span>
                              <span className="text-[9px] text-slate-500 bg-slate-900 border border-slate-850 px-1.5 py-0.2 rounded font-mono">{record.date}</span>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${
                              record.type === 'Repair' ? 'text-orange-400' :
                              record.type === 'Scheduled' ? 'text-blue-400' : 'text-emerald-400'
                            }`}>{record.type}</span>
                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{record.notes}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-6 h-[380px] overflow-hidden">
                    
                    {/* Center call overlay */}
                    {callingCenter && (
                      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-30 p-6 flex flex-col justify-between rounded-xl">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                            <div className="flex items-center gap-3">
                              <Phone className="text-amber-400 animate-pulse" size={16} />
                              <div>
                                <h4 className="text-sm font-bold text-slate-100">{callingCenter}</h4>
                                <span className="text-[9px] text-amber-400 font-mono flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> 
                                  {centerCallTimer > 1 ? 'Connected - Live Desk' : 'Dialing dispatcher...'}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-mono text-slate-400">{centerCallTimer}s</span>
                          </div>

                          {centerCallTimer > 1 && (
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 italic leading-relaxed">
                              "Greetings from the service bay at {callingCenter}. We have reviewed the diagnostics packet on vehicle {vehicle.id} and stand ready for an emergency checkup. Should we confirm scheduling?"
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3">
                          {centerCallTimer > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const center = REPAIR_CENTERS.find(c => c.name === callingCenter);
                                if (center && onAddDispatch) {
                                  onAddDispatch(vehicle.id, 'Dealer Appointment', `Routed vehicle to ${center.name} at ${center.address} after phone authorization.`);
                                  onScheduleService();
                                }
                                setCallingCenter(null);
                              }}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <Check size={14} /> Book Service
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCallingCenter(null)}
                            className="flex-1 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded text-xs font-bold transition"
                          >
                            End Call
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SVG Vector street map */}
                    <div 
                      className="flex-1 rounded-xl border relative overflow-hidden h-full"
                      style={{ 
                        backgroundColor: isLight ? '#f4f3f0' : '#1f242d',
                        borderColor: isLight ? '#cbd5e1' : '#334155'
                      }}
                    >
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <rect width="100" height="100" fill={isLight ? '#f4f3f0' : '#1f242d'} />
                        <path d="M 5,5 Q 15,10 25,5 L 35,25 Q 20,35 5,25 Z" fill={isLight ? '#d2f3d6' : '#14291c'} />
                        <rect x="75" y="60" width="20" height="30" rx="3" fill={isLight ? '#d2f3d6' : '#14291c'} />
                        <path d="M 0,90 Q 20,80 40,85 T 80,75 T 100,60 L 100,100 L 0,100 Z" fill={isLight ? '#aad3df' : '#0d1b2a'} />
                        <line x1="0" y1="20" x2="100" y2="20" stroke={isLight ? '#ffffff' : '#272e3a'} strokeWidth="1.5" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke={isLight ? '#ffffff' : '#272e3a'} strokeWidth="1.5" />
                        <line x1="0" y1="80" x2="100" y2="80" stroke={isLight ? '#ffffff' : '#272e3a'} strokeWidth="1.5" />
                        <line x1="20" y1="0" x2="20" y2="100" stroke={isLight ? '#ffffff' : '#272e3a'} strokeWidth="1.5" />
                        <line x1="50" y1="0" x2="50" y2="100" stroke={isLight ? '#ffffff' : '#272e3a'} strokeWidth="1.5" />
                        <line x1="80" y1="0" x2="80" y2="100" stroke={isLight ? '#ffffff' : '#272e3a'} strokeWidth="1.5" />
                        <path d="M 0,10 L 90,100" stroke={isLight ? '#ffe5a3' : '#3a4454'} strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M 0,10 L 90,100" stroke={isLight ? '#fcfaf2' : '#232932'} strokeWidth="0.8" strokeDasharray="1 1" />

                        {selectedCenter && (() => {
                          const c = REPAIR_CENTERS.find(center => center.id === selectedCenter);
                          if (c) {
                            let routePath = "M 50,50 L 58,50 L 58,42";
                            if (c.id === 2) routePath = "M 50,50 L 50,68 L 32,68";
                            else if (c.id === 3) routePath = "M 50,50 L 78,50 L 78,32";
                            return (
                              <g>
                                <path d={routePath} stroke="#1a73e8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
                                <path d={routePath} stroke="#8ab4f8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" />
                              </g>
                            );
                          }
                          return null;
                        })()}

                        {/* Location Dot */}
                        <g>
                          <circle cx="50" cy="50" r="5" fill="#1a73e8" opacity="0.3">
                            <animate attributeName="r" values="3;10;3" dur="2.5s" repeatCount="indefinite" />
                          </circle>
                          <circle cx="50" cy="50" r="2.5" fill="#ffffff" />
                          <circle cx="50" cy="50" r="1.5" fill="#1a73e8" />
                        </g>

                        {/* Repair Center Pins */}
                        {REPAIR_CENTERS.map(c => {
                          const isSelected = selectedCenter === c.id;
                          const x = c.lng;
                          const y = c.lat;
                          const pinPath = `M ${x},${y} C ${x-2},${y-3} ${x-2},${y-5.5} ${x},${y-5.5} C ${x+2},${y-5.5} ${x+2},${y-3} ${x},${y} Z`;
                          
                          return (
                            <g key={c.id} onClick={() => setSelectedCenter(c.id)} className="cursor-pointer">
                              <ellipse cx={x} cy={y} rx="1.2" ry="0.4" fill="#000000" opacity="0.2" />
                              <path d={pinPath} fill={isSelected ? '#d93025' : '#1a73e8'} stroke="#ffffff" strokeWidth="0.4" />
                              <circle cx={x} cy={y-4} r="0.6" fill="#ffffff" />
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Centers List info */}
                    <div className="w-72 overflow-y-auto h-full shrink-0 space-y-2">
                      {selectedCenter ? (() => {
                        const c = REPAIR_CENTERS.find(center => center.id === selectedCenter)!;
                        return (
                          <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="text-xs font-bold text-slate-100">{c.name}</h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">{c.address}</p>
                              </div>
                              <button onClick={() => setSelectedCenter(null)} className="text-[9px] text-blue-400 hover:underline">All</button>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5">
                              {c.specialties.map((spec, i) => (
                                <span key={i} className="text-[8px] font-medium text-slate-400 px-1.5 py-0.2 bg-slate-900 border border-slate-850 rounded">{spec}</span>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850 text-[10px]">
                              <div>
                                <span className="text-slate-500 block">Distance</span>
                                <span className="text-slate-200 font-bold">{c.distance}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Rating</span>
                                <span className="text-amber-500 font-bold">★ {c.rating}</span>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setCallingCenter(c.name)}
                                className="flex-1 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded text-[10px] font-bold transition flex items-center justify-center gap-1"
                              >
                                <Phone size={10} /> Call
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onAddDispatch) {
                                    onAddDispatch(vehicle.id, 'Dealer Appointment', `Routed to ${c.name} at ${c.address}.`);
                                  }
                                  onScheduleService();
                                }}
                                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold transition flex items-center justify-center gap-1"
                              >
                                <Check size={10} /> Book
                              </button>
                            </div>
                          </div>
                        );
                      })() : (
                        REPAIR_CENTERS.map(c => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCenter(c.id)}
                            className="p-3 bg-slate-950/30 hover:bg-slate-950/60 border border-slate-850 rounded-xl transition cursor-pointer flex justify-between items-center"
                          >
                            <div>
                              <h5 className="text-[11px] font-bold text-slate-200">{c.name}</h5>
                              <span className="text-[9px] text-slate-500">{c.distance} | ★ {c.rating}</span>
                            </div>
                            <span className="text-[9px] text-blue-400 font-bold">Map →</span>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 backdrop-blur flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSimulateFailure();
                onClose();
              }}
              className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/30 rounded font-medium transition flex items-center gap-1.5"
              title="Force sensors to Critical levels to trigger agent dispatches"
            >
              <AlertTriangle size={14} /> Inject Anomaly
            </button>
          </div>

          <div className="flex gap-3">
            {/* Form togglers or Schedule triggers */}
            <button
              onClick={handleScheduleSubmit}
              disabled={schedulingState !== 'idle'}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded shadow transition flex items-center gap-1.5"
            >
              {schedulingState === 'loading' ? (
                <><Loader2 className="animate-spin" size={13} /> Coordinating...</>
              ) : schedulingState === 'success' ? (
                <><CheckCircle size={13} /> Dispatch Locked</>
              ) : (
                <><Wrench size={13} /> Schedule Fleet Repair</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// HELPER COMPONENTS
const SidebarTabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({
  active, onClick, icon, label
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
      active 
        ? 'bg-blue-600/15 border border-blue-500/25 text-blue-400' 
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
    }`}
  >
    {icon}
    <span className="truncate">{label}</span>
  </button>
);

const WearBarLabel: React.FC<{ label: string; wear: number; rul: string; threshold: number }> = ({
  label, wear, rul, threshold
}) => {
  const getWearColor = (w: number) => {
    if (w >= threshold * 0.9) return 'bg-red-500';
    if (w >= threshold * 0.7) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };
  const getTextColor = (w: number) => {
    if (w >= threshold * 0.9) return 'text-red-400';
    if (w >= threshold * 0.7) return 'text-yellow-400';
    return 'text-emerald-400';
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-end text-xs">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className={`font-bold ${getTextColor(wear)}`}>{wear.toFixed(0)}% Wear ({rul})</span>
      </div>
      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${getWearColor(wear)}`} 
          style={{ width: `${Math.min(100, wear)}%` }}
        />
      </div>
    </div>
  );
};

const FormulaMetric: React.FC<{ label: string; weight: number; value: number; subText?: string }> = ({
  label, weight, value, subText
}) => (
  <div className="p-3 bg-slate-900/50 border border-slate-850 rounded-lg flex items-center justify-between text-xs">
    <div>
      <span className="font-bold text-slate-200 block">{label}</span>
      <span className="text-[10px] text-slate-500">Weight: {weight}% {subText && `| ${subText}`}</span>
    </div>
    <div className="text-right">
      <span className={`font-mono font-bold text-sm ${
        value >= 90 ? 'text-emerald-400' : value >= 75 ? 'text-blue-450' : value >= 50 ? 'text-yellow-450' : 'text-red-450'
      }`}>{value}</span>
    </div>
  </div>
);

const PresetChip: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="px-2 py-1 bg-slate-950 border border-slate-850 hover:bg-slate-900 hover:border-slate-750 text-[10px] text-slate-400 hover:text-slate-200 rounded transition"
  >
    {label}
  </button>
);

const ArPartGuide: React.FC<{ title: string; status: string; telemetry: string; steps: string[] }> = ({
  title, status, telemetry, steps
}) => (
  <div className="space-y-3">
    <div className="flex justify-between items-start">
      <div>
        <h5 className="text-xs font-bold text-slate-100">{title}</h5>
        <span className="text-[9px] text-slate-500">{telemetry}</span>
      </div>
      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
        status === 'Critical' ? 'bg-red-500/25 text-red-400' :
        status === 'Warning' ? 'bg-yellow-500/25 text-yellow-400' :
        'bg-emerald-500/25 text-emerald-400'
      }`}>{status}</span>
    </div>
    <div className="border-t border-slate-850 pt-2 space-y-2">
      <span className="text-[9px] uppercase font-bold text-slate-500">AR Service Checklist:</span>
      <ol className="list-decimal pl-4 text-[10px] text-slate-400 space-y-1.5">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  </div>
);

const RescueStep: React.FC<{ label: string; desc: string; completed: boolean }> = ({
  label, desc, completed
}) => (
  <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 flex gap-3">
    <div className={`p-1.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
      completed ? 'bg-emerald-500/25 text-emerald-400' : 'bg-slate-800 text-slate-500'
    }`}>
      {completed ? <Check size={12} /> : <Loader2 size={12} className="animate-spin" />}
    </div>
    <div>
      <h5 className="text-xs font-bold text-slate-200">{label}</h5>
      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
);

const SensorDetail: React.FC<{ label: string; value: string; icon: React.ReactNode; status: 'Normal' | 'Warning' | 'Critical'; subtext: string }> = ({ label, value, icon, status, subtext }) => (
  <div className={`p-4 rounded-lg border flex items-center justify-between ${
    status === 'Critical' ? 'bg-red-500/10 border-red-500/30' : 
    status === 'Warning' ? 'bg-yellow-500/10 border-yellow-500/30' : 
    'bg-slate-900 border-slate-800'
  }`}>
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${
         status === 'Critical' ? 'bg-red-500/20' : 
         status === 'Warning' ? 'bg-yellow-500/20' : 
         'bg-slate-800'
      }`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className={`text-lg font-bold ${
          status === 'Critical' ? 'text-red-400' : 
          status === 'Warning' ? 'text-yellow-400' : 
          'text-white'
        }`}>{value}</p>
      </div>
    </div>
    <div className="text-right">
       <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
          status === 'Critical' ? 'bg-red-500 text-white' : 
          status === 'Warning' ? 'bg-yellow-500 text-black' : 
          'bg-slate-800 text-emerald-400 border border-slate-700'
       }`}>
         {status}
       </span>
       <p className="text-[10px] text-slate-500 mt-1">{subtext}</p>
    </div>
  </div>
);

type SortOption = 'severity' | 'id' | 'mileage' | 'temp';

export const VehicleMonitor: React.FC<VehicleMonitorProps> = ({ vehicles, theme, onScheduleService, onLogService, onSimulateFailure, onAddDispatch }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  // Advanced Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'All'>('All');
  const [ownerFilter, setOwnerFilter] = useState<string>('All');
  const [modelFilter, setModelFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('severity');
  const [showFilters, setShowFilters] = useState(true);

  // Derived options for filters
  const uniqueOwners = useMemo(() => ['All', ...Array.from(new Set(vehicles.map(v => v.owner)))], [vehicles]);
  const uniqueModels = useMemo(() => Array.from(new Set(vehicles.map(v => v.model))), [vehicles]);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;

  // Filter Logic
  const filteredVehicles = vehicles.filter(v => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      v.id.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query) ||
      v.vin.toLowerCase().includes(query) ||
      v.owner.toLowerCase().includes(query);
    
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesOwner = ownerFilter === 'All' || v.owner === ownerFilter;
    const matchesModel = modelFilter.length === 0 || modelFilter.includes(v.model);

    return matchesSearch && matchesStatus && matchesOwner && matchesModel;
  });

  // Sort Logic
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    switch(sortBy) {
      case 'severity': {
        const score = { [VehicleStatus.CRITICAL]: 3, [VehicleStatus.WARNING]: 2, [VehicleStatus.SERVICING]: 1, [VehicleStatus.HEALTHY]: 0 };
        return score[b.status] - score[a.status];
      }
      case 'mileage': return b.mileage - a.mileage;
      case 'temp': return b.sensors.engineTemp - a.sensors.engineTemp;
      case 'id': return a.id.localeCompare(b.id);
      default: return 0;
    }
  });

  const toggleModel = (model: string) => {
    setModelFilter(prev => prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]);
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Activity className="text-blue-400" /> Real-Time Fleet Telematics
        </h2>
        <div className="flex gap-3">
           <div className="bg-slate-800 border border-slate-700 rounded-lg p-1 flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 px-2">Sort By</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs font-medium text-slate-100 outline-none border-none p-1 cursor-pointer"
              >
                <option value="severity">Severity</option>
                <option value="id">Vehicle ID</option>
                <option value="mileage">Mileage</option>
                <option value="temp">Temperature</option>
              </select>
           </div>
           <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
           >
             <Filter size={18} />
           </button>
        </div>
      </div>
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-[100] bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className="bg-white/20 p-2 rounded-full">
            <CheckCircle size={24} />
          </div>
          <div>
            <h4 className="font-bold text-lg leading-none mb-1">Success</h4>
            <p className="text-emerald-100 text-sm font-medium">{notification}</p>
          </div>
          <button onClick={() => setNotification(null)} className="ml-2 text-emerald-200 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
      )}
      
      {/* Advanced Filter Toolbar */}
      {showFilters && (
        <div className="mb-6 p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4 animate-in slide-in-from-top-2">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
               <input 
                 type="text" 
                 placeholder="Search VIN, ID, or Keywords..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-600"
               />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1">
               <User size={14} className="text-slate-500" />
               <select 
                 value={ownerFilter} 
                 onChange={(e) => setOwnerFilter(e.target.value)}
                 className="bg-transparent text-sm text-slate-300 outline-none border-none cursor-pointer py-1.5 min-w-[120px]"
               >
                 <option value="All">All Owners</option>
                 {uniqueOwners.filter(o => o !== 'All').map(o => (
                   <option key={o} value={o}>{o}</option>
                 ))}
               </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pt-2 border-t border-slate-800/50">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <FilterPill label="All Status" active={statusFilter === 'All'} onClick={() => setStatusFilter('All')} />
              <FilterPill label="Critical" active={statusFilter === VehicleStatus.CRITICAL} onClick={() => setStatusFilter(VehicleStatus.CRITICAL)} color="red" />
              <FilterPill label="Warning" active={statusFilter === VehicleStatus.WARNING} onClick={() => setStatusFilter(VehicleStatus.WARNING)} color="yellow" />
              <FilterPill label="In Service" active={statusFilter === VehicleStatus.SERVICING} onClick={() => setStatusFilter(VehicleStatus.SERVICING)} color="blue" />
              <FilterPill label="Healthy" active={statusFilter === VehicleStatus.HEALTHY} onClick={() => setStatusFilter(VehicleStatus.HEALTHY)} color="emerald" />
            </div>

            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-2 flex items-center gap-1.5">
                <Car size={12} /> Models:
              </span>
              {uniqueModels.map(model => (
                <button
                  key={model}
                  onClick={() => toggleModel(model)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                    modelFilter.includes(model) 
                      ? 'bg-blue-600 border-blue-500 text-white' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {modelFilter.includes(model) && <Check size={10} />}
                  {model}
                </button>
              ))}
              {modelFilter.length > 0 && (
                <button 
                  onClick={() => setModelFilter([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 ml-2 flex items-center gap-1"
                >
                  <X size={10} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-4 custom-scrollbar">
        {sortedVehicles.length > 0 ? (
          sortedVehicles.map(v => (
            <VehicleCard 
              key={v.id} 
              vehicle={v} 
              onClick={(vehicle) => setSelectedVehicleId(vehicle.id)}
            />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
            <Search size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">No vehicles matching your filters</p>
            <p className="text-sm">Try clearing some filters or searching different keywords</p>
            <button onClick={() => { setSearchQuery(''); setStatusFilter('All'); setOwnerFilter('All'); setModelFilter([]); }} className="mt-4 text-blue-400 hover:underline">Clear All Filters</button>
          </div>
        )}
      </div>

      {selectedVehicle && (
        <VehicleDetailModal 
          vehicle={selectedVehicle} 
          theme={theme}
          onClose={() => setSelectedVehicleId(null)} 
          onScheduleService={() => onScheduleService(selectedVehicle.id)}
          onLogService={(record) => onLogService(selectedVehicle.id, record)}
          onSimulateFailure={() => onSimulateFailure(selectedVehicle.id)}
          onServiceConfirmed={() => {
            setNotification("Service Appointment Confirmed");
            setTimeout(() => setNotification(null), 4000);
          }}
          onAddDispatch={onAddDispatch}
        />
      )}
    </div>
  );
};

const FilterPill: React.FC<{ label: string, active: boolean, onClick: () => void, color?: string }> = ({ label, active, onClick, color = 'slate' }) => {
  const getColorClasses = () => {
    if (!active) return 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white';
    
    switch(color) {
      case 'red': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'yellow': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'blue': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'emerald': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      default: return 'bg-white text-slate-900 border-white';
    }
  };

  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${getColorClasses()}`}
    >
      {label}
    </button>
  );
};
