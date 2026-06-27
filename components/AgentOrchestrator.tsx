
import React from 'react';
import { AgentLog, AgentType, UebaAlert, Vehicle } from '../types';
import { Bot, ShieldAlert, Cpu, MessageSquare, Calendar, PenTool, Database, Lock, AlertOctagon, Activity, ShieldCheck, CheckCircle, X } from 'lucide-react';

interface AgentOrchestratorProps {
  logs: AgentLog[];
  uebaAlerts: UebaAlert[];
  vehicles: Vehicle[];
  onResolveUeba: (id: string) => void;
  onDismissUeba: (id: string) => void;
  onInjectUeba: (agent: AgentType, action: string, reason: string) => void;
}

const AgentIcon: React.FC<{ type: AgentType }> = ({ type }) => {
  switch (type) {
    case AgentType.MASTER: return <Bot className="text-blue-400" />;
    case AgentType.DATA_ANALYSIS: return <Database className="text-purple-400" />;
    case AgentType.DIAGNOSIS: return <Cpu className="text-cyan-400" />;
    case AgentType.CUSTOMER_ENGAGEMENT: return <MessageSquare className="text-green-400" />;
    case AgentType.SCHEDULING: return <Calendar className="text-orange-400" />;
    case AgentType.FEEDBACK: return <MessageSquare className="text-pink-400" />;
    case AgentType.MANUFACTURING: return <PenTool className="text-yellow-400" />;
    case AgentType.SECURITY: return <ShieldAlert className="text-red-500" />;
    default: return <Bot />;
  }
};

const getSeverityDetails = (score: number) => {
  if (score >= 90) return { 
    label: 'CRITICAL', 
    color: 'bg-red-600', 
    text: 'text-red-500', 
    border: 'border-red-500', 
    bg: 'bg-red-500/10',
    glow: 'shadow-red-500/50',
    gradient: 'from-red-950/20'
  };
  if (score >= 75) return { 
    label: 'HIGH', 
    color: 'bg-orange-500', 
    text: 'text-orange-500', 
    border: 'border-orange-500', 
    bg: 'bg-orange-500/10',
    glow: 'shadow-orange-500/50',
    gradient: 'from-orange-950/20'
  };
  if (score >= 50) return { 
    label: 'MEDIUM', 
    color: 'bg-yellow-500', 
    text: 'text-yellow-500', 
    border: 'border-yellow-500', 
    bg: 'bg-yellow-500/10',
    glow: 'shadow-yellow-500/50',
    gradient: 'from-yellow-950/20'
  };
  return { 
    label: 'LOW', 
    color: 'bg-blue-500', 
    text: 'text-blue-500', 
    border: 'border-blue-500', 
    bg: 'bg-blue-500/10',
    glow: 'shadow-blue-500/50',
    gradient: 'from-blue-950/20'
  };
};

const RiskMeter: React.FC<{ score: number }> = ({ score }) => {
  const { label, color, text, glow } = getSeverityDetails(score);

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Risk Score</span>
        <span className={`text-[10px] font-bold ${text} border border-current px-1.5 rounded`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-32 h-2.5 bg-slate-800 rounded-full overflow-hidden relative border border-slate-700">
          <div 
            className={`h-full ${color} ${glow} shadow-lg transition-all duration-1000 ease-out relative`} 
            style={{ width: `${score}%` }}
          >
            <div className="absolute inset-0 bg-white/20"></div>
          </div>
        </div>
        <span className={`text-base font-bold font-mono ${text}`}>{score}</span>
      </div>
    </div>
  );
};

export const AgentOrchestrator: React.FC<AgentOrchestratorProps> = ({ logs, uebaAlerts, vehicles, onResolveUeba, onDismissUeba, onInjectUeba }) => {
  const [subTab, setSubTab] = React.useState<'alerts' | 'rules' | 'inject'>('alerts');
  const recentLogs = [...logs].reverse().slice(0, 10);
  const activeAlerts = uebaAlerts.filter(a => a.status === 'Active').reverse();
  const resolvedAlerts = uebaAlerts.filter(a => a.status === 'Resolved').reverse().slice(0, 5);

  const [rules, setRules] = React.useState([
    { id: 'R1', desc: 'Prevent Feedback Agent from modifying service appointments', enabled: true },
    { id: 'R2', desc: 'Block Scheduling Agent from reading telematics database', enabled: true },
    { id: 'R3', desc: 'Block Data Analysis Agent from querying PII tables', enabled: true },
    { id: 'R4', desc: 'Block diagnosis models from triggering external gateway commands', enabled: true },
  ]);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      
      {/* Activity Log */}
      <div className="lg:col-span-2 bg-slate-800/50 rounded-xl p-6 border border-slate-700 flex flex-col h-[600px] lg:h-auto">
        <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Bot className="text-blue-400" /> Master Agent Orchestration Log
        </h3>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {recentLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">Waiting for agent activity...</div>
          ) : (
            recentLogs.map((log) => {
              const logVehicle = log.targetVehicleId ? vehicles.find(v => v.id === log.targetVehicleId) : undefined;
              return (
              <div key={log.id} className={`flex items-start gap-4 p-3 rounded-lg border transition-all hover:bg-slate-800/80 ${
                log.status === 'blocked' ? 'bg-red-900/10 border-red-900/30' : 'bg-slate-900/50 border-slate-700/50'
              }`}>
                <div className="mt-1"><AgentIcon type={log.agent} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-200 truncate">{log.agent}</span>
                    <span className="text-xs text-gray-500 font-mono ml-2 shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-gray-300 font-medium truncate">{log.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {log.details}
                    {logVehicle && <span className="text-blue-400/70 ml-1 font-mono tracking-tighter">[VIN: {logVehicle.vin}]</span>}
                  </p>
                </div>
                <div className="shrink-0">
                   <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                     log.status === 'success' ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-900/50' : 
                     log.status === 'blocked' ? 'text-red-400 bg-red-950/50 border border-red-900/50' : 'text-blue-400 bg-blue-950/50 border border-blue-900/50'
                   }`}>
                     {log.status}
                   </span>
                </div>
              </div>
            )})
          )}
        </div>
      </div>

      {/* UEBA Security Monitor */}
      <div className="bg-slate-900 rounded-xl p-6 border border-red-900/30 flex flex-col relative overflow-hidden h-[600px] lg:h-auto">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <ShieldAlert size={120} className="text-red-500" />
        </div>

        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> UEBA Security
          </h3>
          <div className="px-3 py-1 bg-slate-950/80 rounded-full border border-slate-800 flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${activeAlerts.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></div>
             <span className={`text-xs font-bold uppercase tracking-wide ${activeAlerts.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {activeAlerts.length > 0 ? 'Threat Alert' : 'Active'}
             </span>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-850 mb-4 relative z-10 shrink-0">
          <button 
            onClick={() => setSubTab('alerts')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              subTab === 'alerts' ? 'bg-slate-800 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Anomalies ({activeAlerts.length})
          </button>
          <button 
            onClick={() => setSubTab('rules')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              subTab === 'rules' ? 'bg-slate-800 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rules Manager
          </button>
          <button 
            onClick={() => setSubTab('inject')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              subTab === 'inject' ? 'bg-slate-800 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Breach Simulator
          </button>
        </div>

        {subTab === 'alerts' && (
          <div className="flex-1 overflow-y-auto space-y-4 relative z-10 pr-2 custom-scrollbar">
            <div className="bg-slate-950/50 backdrop-blur p-4 rounded-lg border border-slate-800">
                <div className="flex justify-between items-end mb-2">
                   <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Threat Level</span>
                   <span className={`text-xs font-mono font-bold ${activeAlerts.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {activeAlerts.length > 0 ? 'ANOMALY DETECTED' : 'NORMAL'}
                   </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ${activeAlerts.length > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: activeAlerts.length > 0 ? '85%' : '15%' }}
                    />
                </div>
            </div>

            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mt-4 mb-2">
              Active Anomalies <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">{activeAlerts.length}</span>
            </h4>
            
            {activeAlerts.length === 0 && resolvedAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 border border-dashed border-slate-800 rounded-lg">
                  <ShieldCheck className="mb-2 opacity-20" size={32} />
                  <span className="text-sm italic">No behavioral anomalies detected.</span>
              </div>
            ) : (
              <>
                {activeAlerts.map(alert => {
                   const severity = getSeverityDetails(alert.riskScore);
                   return (
                   <div key={alert.id} className={`p-5 bg-gradient-to-br ${severity.gradient} to-slate-950 border ${severity.border}/40 rounded-xl relative group hover:${severity.border}/70 transition-all shadow-lg`}>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg border ${severity.border}/30 ${severity.bg} ${severity.text}`}>
                                 <AlertOctagon size={18} />
                              </div>
                              <div>
                                 <span className={`block text-xs font-bold uppercase tracking-wider ${severity.text} opacity-80`}>Anomaly Detected</span>
                                 <span className="font-bold text-gray-200">{alert.agent}</span>
                              </div>
                          </div>
                          <button 
                              onClick={() => onDismissUeba(alert.id)}
                              className="p-1 hover:bg-white/10 rounded transition-colors text-slate-555 hover:text-white"
                          >
                              <X size={14} />
                          </button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 mb-4 relative z-10">
                          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                            <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block mb-1">Action Attempted</span>
                            <p className="text-sm text-gray-300 leading-snug font-medium">{alert.actionAttempted}</p>
                          </div>
                          <div className={`p-3 rounded-lg border ${severity.border}/20 bg-slate-950/20`}>
                             <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${severity.text} opacity-70`}>Reason for Flag</span>
                             <p className={`text-xs italic leading-relaxed ${severity.text} opacity-90`}>{alert.reason}</p>
                          </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-800 relative z-10">
                        <button 
                          onClick={() => onResolveUeba(alert.id)}
                          className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1.5 font-bold uppercase tracking-wide transition-all ${severity.bg} ${severity.text} ${severity.border}/50 hover:bg-emerald-500 hover:text-white hover:border-emerald-500`}
                        >
                            <CheckCircle size={10} /> Mark Resolved
                        </button>
                        <RiskMeter score={alert.riskScore} />
                      </div>
                   </div>
                )})}

                {resolvedAlerts.length > 0 && (
                  <div className="mt-8 opacity-50">
                    <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4">Recently Resolved</h4>
                    <div className="space-y-3">
                      {resolvedAlerts.map(alert => (
                        <div key={alert.id} className="flex items-center justify-between p-3 bg-slate-950/30 border border-slate-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle size={14} className="text-emerald-500" />
                            <div>
                              <p className="text-xs font-bold text-slate-400">{alert.agent}</p>
                              <p className="text-[10px] text-slate-500">{alert.actionAttempted}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-700">{alert.riskScore} RISK</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {subTab === 'rules' && (
          <div className="flex-1 overflow-y-auto space-y-4 relative z-10 pr-2 custom-scrollbar">
             <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-lg">
                <h4 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                   <Lock size={16} className="text-blue-400" /> UEBA Rule Base
                </h4>
                <p className="text-xs text-slate-500">Enable or disable behavioral profiling rules monitored by the orchestrator.</p>
             </div>
             
             <div className="space-y-3">
                {rules.map(rule => (
                  <div key={rule.id} className="p-4 bg-slate-950/30 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                     <div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 block mb-0.5">{rule.id}</span>
                        <p className="text-sm text-slate-300 font-medium leading-snug">{rule.desc}</p>
                     </div>
                     <button 
                       onClick={() => toggleRule(rule.id)}
                       className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                         rule.enabled 
                           ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                           : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                       }`}
                     >
                        {rule.enabled ? 'Active' : 'Disabled'}
                     </button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {subTab === 'inject' && (
          <div className="flex-1 overflow-y-auto space-y-4 relative z-10 pr-2 custom-scrollbar">
             <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
                <h4 className="text-sm font-bold text-red-400 mb-1 flex items-center gap-1.5">
                   <Lock size={16} /> Breach Injection Panel
                </h4>
                <p className="text-xs text-slate-400">Trigger manual behavior policy violations to verify real-time monitoring blocks.</p>
             </div>

             <div className="space-y-3">
                <div className="p-4 bg-slate-950/30 border border-slate-800 rounded-xl space-y-3">
                   <div>
                      <span className="text-xs font-bold text-slate-200">Feedback Agent Violation</span>
                      <p className="text-xs text-slate-500 mt-0.5">Attempt to override maintenance schedules and alter appointments.</p>
                   </div>
                   <button 
                     onClick={() => onInjectUeba(AgentType.FEEDBACK, 'Modify appointment DB', 'Feedback Agent attempted to modify service slots outside its designated context.')}
                     className="w-full py-2 bg-red-650 hover:bg-red-550 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                   >
                      Inject Breach Attempt
                   </button>
                </div>

                <div className="p-4 bg-slate-950/30 border border-slate-800 rounded-xl space-y-3">
                   <div>
                      <span className="text-xs font-bold text-slate-200">Scheduling Agent Breach</span>
                      <p className="text-xs text-slate-500 mt-0.5">Query sensor databases and export proprietary vehicle telematics data.</p>
                   </div>
                   <button 
                     onClick={() => onInjectUeba(AgentType.SCHEDULING, 'Export sensor telemetry DB', 'Scheduling Agent attempted unauthorized fetch of raw sensor telemetry dataset.')}
                     className="w-full py-2 bg-red-650 hover:bg-red-550 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                   >
                      Inject Breach Attempt
                   </button>
                </div>

                <div className="p-4 bg-slate-950/30 border border-slate-800 rounded-xl space-y-3">
                   <div>
                      <span className="text-xs font-bold text-slate-200">Data Analysis Agent Breach</span>
                      <p className="text-xs text-slate-500 mt-0.5">Export full Customer PII table database columns without permission.</p>
                   </div>
                   <button 
                     onClick={() => onInjectUeba(AgentType.DATA_ANALYSIS, 'Query PII Table', 'Data Analysis Agent attempted SELECT on Customer PII Address list.')}
                     className="w-full py-2 bg-red-650 hover:bg-red-550 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                   >
                      Inject Breach Attempt
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
