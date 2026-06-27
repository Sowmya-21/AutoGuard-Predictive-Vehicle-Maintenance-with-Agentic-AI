
import React, { useState } from 'react';
import { MaintenanceAlert } from '../types';
import { AlertTriangle, AlertOctagon, X, ArrowRight, Bell, CheckSquare, Square, CheckCircle, Trash2 } from 'lucide-react';

interface AlertsFeedProps {
  alerts: MaintenanceAlert[];
  onDismiss: (id: string) => void;
  onView: (vehicleId: string) => void;
  onBulkDismiss: (ids: string[]) => void;
  onBulkResolve: (ids: string[]) => void;
}

export const AlertsFeed: React.FC<AlertsFeedProps> = ({ alerts, onDismiss, onView, onBulkDismiss, onBulkResolve }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (alerts.length === 0) return null;

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === alerts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(alerts.map(a => a.id)));
    }
  };

  const handleBulkDismiss = () => {
    onBulkDismiss(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkResolve = () => {
    onBulkResolve(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6 animate-in slide-in-from-top-4 fade-in duration-500 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between mb-4 h-10">
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-4 bg-slate-700/50 px-3 py-1.5 rounded-lg w-full border border-slate-600 animate-in fade-in slide-in-from-top-2">
            <button onClick={toggleAll} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white">
               {selectedIds.size === alerts.length ? <CheckSquare size={16} /> : <Square size={16} />}
               Select All
            </button>
            <div className="h-4 w-px bg-slate-600 mx-2"></div>
            <button 
              onClick={handleBulkResolve} 
              className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              <CheckCircle size={16} /> Mark Resolved
            </button>
            <button 
              onClick={handleBulkDismiss} 
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 font-medium ml-4 transition"
            >
              <Trash2 size={16} /> Dismiss
            </button>
            <span className="ml-auto text-xs text-slate-400 font-mono">{selectedIds.size} selected</span>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <div className="relative">
                <Bell className="text-orange-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-slate-800"></span>
              </div>
              Predictive Maintenance Alerts
            </h3>
            <div className="flex items-center gap-3">
              <button onClick={toggleAll} className="text-xs text-slate-400 hover:text-white transition">Select All</button>
              <span className="bg-slate-700 text-xs font-bold px-3 py-1 rounded-full text-white border border-slate-600">
                {alerts.length} Active
              </span>
            </div>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {alerts.map(alert => {
          const isSelected = selectedIds.has(alert.id);
          const isResolved = alert.status === 'Resolved';
          
          return (
            <div 
              key={alert.id}
              onClick={() => toggleSelection(alert.id)}
              className={`p-4 rounded-lg border flex flex-col gap-2 relative transition-all duration-300 cursor-pointer group ${
                isSelected ? 'ring-2 ring-blue-500 scale-[1.02]' : 'hover:scale-[1.01]'
              } ${
                isResolved 
                  ? 'bg-slate-900 border-emerald-900/30 opacity-75'
                  : alert.severity === 'Critical' 
                    ? 'bg-gradient-to-br from-red-950/40 to-slate-900 border-red-500/50 shadow-red-900/10' 
                    : 'bg-gradient-to-br from-yellow-950/40 to-slate-900 border-yellow-500/50 shadow-yellow-900/10'
              }`}
            >
              {/* Checkbox */}
              <div className="absolute top-3 left-3 z-10 transition-transform active:scale-90">
                {isSelected ? <CheckSquare size={18} className="text-blue-400" /> : <Square size={18} className="text-slate-600/50 group-hover:text-slate-500" />}
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
                className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700/50 transition z-10"
                aria-label="Dismiss alert"
              >
                <X size={14} />
              </button>

              <div className="flex items-center gap-2 pl-6">
                {isResolved ? (
                  <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                ) : alert.severity === 'Critical' ? (
                  <AlertOctagon size={18} className="text-red-400 shrink-0 animate-pulse" />
                ) : (
                  <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
                )}
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  isResolved ? 'text-emerald-500 line-through' :
                  alert.severity === 'Critical' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {isResolved ? 'Resolved' : `${alert.severity} Alert`}
                </span>
                <span className="text-xs text-slate-500 ml-auto mr-6">
                  {alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div className="pl-6">
                <h4 className={`font-bold mt-1 ${isResolved ? 'text-slate-500' : 'text-gray-200'}`}>
                  Vehicle {alert.vehicleId}
                </h4>
                <p className={`text-sm leading-snug ${isResolved ? 'text-slate-600' : 'text-gray-400'}`}>
                  {alert.message}
                </p>
                
                {!isResolved && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onView(alert.vehicleId); }}
                    className={`mt-3 text-xs font-bold flex items-center gap-1 transition-colors self-start ${
                      alert.severity === 'Critical' 
                        ? 'text-red-400 hover:text-red-300 bg-red-950/30 px-2 py-1 rounded border border-red-900' 
                        : 'text-yellow-400 hover:text-yellow-300 bg-yellow-950/30 px-2 py-1 rounded border border-yellow-900'
                    }`}
                  >
                    View Diagnostics <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
