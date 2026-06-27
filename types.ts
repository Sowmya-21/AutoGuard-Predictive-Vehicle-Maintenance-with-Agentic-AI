
export enum AgentType {
  MASTER = 'Master Orchestrator',
  DATA_ANALYSIS = 'Data Analysis',
  DIAGNOSIS = 'Diagnosis',
  CUSTOMER_ENGAGEMENT = 'Customer Engagement',
  SCHEDULING = 'Scheduling',
  FEEDBACK = 'Feedback',
  MANUFACTURING = 'Manufacturing Insights',
  SECURITY = 'UEBA Monitor'
}

export enum VehicleStatus {
  HEALTHY = 'Healthy',
  WARNING = 'Warning',
  CRITICAL = 'Critical',
  SERVICING = 'In Service'
}

export interface MaintenanceRecord {
  date: string;
  type: 'Scheduled' | 'Repair' | 'Checkup';
  description: string;
  notes: string;
}

export interface Vehicle {
  id: string;
  vin: string; // Vehicle Identification Number
  model: string;
  owner: string;
  status: VehicleStatus;
  mileage: number;
  sensors: {
    engineTemp: number; // Celsius
    oilPressure: number; // psi
    batteryVoltage: number; // V
    vibrationLevel: number; // mm/s
    brakeWear: number; // %
  };
  lastServiceDate: string;
  history: MaintenanceRecord[];
  
  // Advanced Digital Twin & Analytics Features
  reliabilityScore: number; // 0-100
  reliabilityDetails: {
    health: number;
    behavior: number;
    probability: number;
    history: number;
    sensor: number;
  };
  drivingHabit: 'Eco' | 'Normal' | 'Aggressive';
  carbonEmissions: {
    current: number; // g/km
    potentialReduction: number; // g/km
  };
  routeContext: {
    destination: string;
    terrain: 'Flat' | 'Hilly' | 'Highway' | 'Urban';
    weather: 'Sunny' | 'Rainy' | 'Stormy' | 'Snowy';
    roadCondition: 'Good' | 'Average' | 'Potholes' | 'Slippery';
    riskLevel: 'Low' | 'Medium' | 'High';
    riskReason: string;
  };
  predictedFailureTimeline: {
    component: string;
    daysRemaining: number;
    probability: number; // %
  }[];
  remainingUsefulLife: {
    brakes: number; // km
    engine: number; // km
    battery: number; // km
    transmission: number; // km
  };
  fraudRisk: {
    score: number; // 0-100
    flags: string[];
  };
  personalizedSchedule: {
    task: string;
    dueInKm: number;
    rationale: string;
  }[];
}

export interface AgentLog {
  id: string;
  timestamp: Date;
  agent: AgentType;
  action: string;
  details: string;
  status: 'pending' | 'success' | 'failed' | 'blocked';
  targetVehicleId?: string;
}

export interface InsightReport {
  id: string;
  date: string;
  component: string;
  defectType: string;
  severity: 'Low' | 'Medium' | 'High';
  rcaSummary: string;
  recommendation: string;
  status: 'Pending' | 'Implemented';
}

export interface UebaAlert {
  id: string;
  timestamp: Date;
  agent: AgentType;
  actionAttempted: string;
  riskScore: number; // 0-100
  reason: string;
  status: 'Active' | 'Resolved';
}

export interface MaintenanceAlert {
  id: string;
  vehicleId: string;
  severity: 'Warning' | 'Critical';
  message: string;
  timestamp: Date;
  status: 'Active' | 'Resolved';
}

export interface FieldDispatch {
  id: string;
  vehicleId: string;
  type: 'Towing' | 'Mobile Service' | 'Dealer Appointment';
  details: string;
  status: 'Dispatched' | 'En Route' | 'Arrived' | 'Completed';
  timestamp: Date;
}
