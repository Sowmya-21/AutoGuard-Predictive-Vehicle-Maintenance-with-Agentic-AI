import React, { useState } from 'react';
import { InsightReport } from '../types';
import { 
  Factory, ArrowRight, AlertTriangle, CheckCircle, Trash2, CheckSquare, 
  Square, Check, Download, FileText, Cpu, Radio, Wrench, Plus, X 
} from 'lucide-react';

interface ManufacturingInsightsProps {
  insights: InsightReport[];
  onDelete: (ids: string[]) => void;
  onStatusChange: (ids: string[], status: 'Pending' | 'Implemented') => void;
  onAddInsight: (insight: InsightReport) => void;
}

const FEEDBACK_STAGES = [
  { id: 1, name: 'Manufacturing', icon: Factory, desc: 'Identify early component batch defects and factory tooling assembly anomalies.', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/35' },
  { id: 2, name: 'Operation', icon: Radio, desc: 'Active road telemetry traces sensor signals and monitors wear-and-tear thresholds.', color: 'text-blue-400 bg-blue-500/10 border-blue-500/35' },
  { id: 3, name: 'Predictive Service', icon: Cpu, desc: 'ML models detect wear signatures and generate preventive service alerts.', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/35' },
  { id: 4, name: 'RCA & CAPA', icon: AlertTriangle, desc: 'Root cause failures are analyzed and correct action plans formulated.', color: 'text-orange-400 bg-orange-500/10 border-orange-500/35' },
  { id: 5, name: 'Design Adjustment', icon: Wrench, desc: 'Engineering teams deploy design improvements into future manufacturing batches.', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/35' }
];

export const ManufacturingInsights: React.FC<ManufacturingInsightsProps> = ({ 
  insights, onDelete, onStatusChange, onAddInsight 
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeStage, setActiveStage] = useState<number>(4); // Default to RCA & CAPA stage
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [component, setComponent] = useState('');
  const [defectType, setDefectType] = useState('Calibration Mismatch');
  const [severity, setSeverity] = useState('High');
  const [rcaSummary, setRcaSummary] = useState('');
  const [recommendation, setRecommendation] = useState('');

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
    if (selectedIds.size === insights.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(insights.map(i => i.id)));
    }
  };

  const handleBulkDelete = () => {
    onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkStatus = (status: 'Pending' | 'Implemented') => {
    onStatusChange(Array.from(selectedIds), status);
    setSelectedIds(new Set());
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!component.trim() || !rcaSummary.trim() || !recommendation.trim()) return;

    const newInsight: InsightReport = {
      id: `CAPA-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      component,
      defectType,
      severity: severity as 'High' | 'Medium',
      rcaSummary,
      recommendation,
      status: 'Pending'
    };

    onAddInsight(newInsight);
    
    // Clear form
    setComponent('');
    setRcaSummary('');
    setRecommendation('');
    setShowForm(false);
  };

  const handleExportCAPA = () => {
    const dataToExport = selectedIds.size > 0 
      ? insights.filter(i => selectedIds.has(i.id))
      : insights;

    if (dataToExport.length === 0) return;

    const headers = ["ID", "Date", "Component", "Defect Type", "Severity", "RCA Summary", "Recommendation", "Status"];
    const csvRows = dataToExport.map(i => [
      i.id,
      i.date,
      i.component,
      i.defectType,
      i.severity,
      `"${i.rcaSummary.replace(/"/g, '""')}"`,
      `"${i.recommendation.replace(/"/g, '""')}"`,
      i.status
    ]);

    const csvContent = [headers.join(","), ...csvRows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CAPA_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeStageDetails = FEEDBACK_STAGES.find(s => s.id === activeStage)!;
  const StageIconComponent = activeStageDetails.icon;

  return (
    <div className="h-full flex flex-col relative space-y-6">
      
      {/* 5-Stage Feedback Loop Visualizer */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-lg">
         <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-3">Product Quality Lifecycle Feedback Loop</span>
         
         {/* Pipeline Timeline */}
         <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2 relative">
            {FEEDBACK_STAGES.map((s, idx) => {
               const Icon = s.icon;
               const isActive = s.id === activeStage;
               return (
                 <React.Fragment key={s.id}>
                   <button 
                     type="button"
                     onClick={() => setActiveStage(s.id)}
                     className={`flex items-center gap-3 p-3 rounded-lg border transition-all w-full md:w-auto text-left relative z-10 ${
                       isActive 
                         ? 'bg-slate-900 border-yellow-500/50 shadow-md shadow-yellow-500/5 text-yellow-400' 
                         : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                     }`}
                   >
                      <div className={`p-2 rounded ${isActive ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-850 text-slate-400'}`}>
                         <Icon size={18} />
                      </div>
                      <div>
                         <span className="text-[10px] block font-mono text-slate-500 uppercase">Stage 0{s.id}</span>
                         <span className="text-xs font-bold whitespace-nowrap">{s.name}</span>
                      </div>
                   </button>
                   {idx < FEEDBACK_STAGES.length - 1 && (
                     <div className="hidden md:block flex-1 h-0.5 border-t border-dashed border-slate-750 mx-2"></div>
                   )}
                 </React.Fragment>
               );
            })}
         </div>

         {/* Selected Stage Detail Panel */}
         <div className={`mt-4 p-4 rounded-lg border transition-all ${activeStageDetails.color} flex flex-col md:flex-row items-start md:items-center gap-4`}>
            <div className="p-3 bg-white/5 rounded-full">
               <StageIconComponent size={24} />
            </div>
            <div>
               <h4 className="font-bold text-slate-100 text-sm">Stage {activeStageDetails.id}: {activeStageDetails.name}</h4>
               <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{activeStageDetails.desc}</p>
            </div>
         </div>
      </div>

      {/* Title / Bulk Action Bar */}
      <div className="flex items-center justify-between h-12 shrink-0">
        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-4 bg-blue-900/40 px-4 py-2 rounded-lg w-full border border-blue-500/30 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
            <span className="font-bold text-white whitespace-nowrap">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-slate-600 mx-2"></div>
            <button 
              onClick={() => handleBulkStatus('Implemented')} 
              className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              <CheckCircle size={16} /> Mark Implemented
            </button>
            <button 
              onClick={handleExportCAPA} 
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium ml-4 transition"
            >
              <Download size={16} /> Export CSV
            </button>
            <button 
              onClick={() => handleBulkDelete()} 
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 font-medium ml-4 transition"
            >
              <Trash2 size={16} /> Delete
            </button>
             <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-400 hover:text-white">
              Cancel
            </button>
          </div>
        ) : (
           <>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Factory className="text-yellow-400" /> RCA & CAPA Engineering Actions
            </h2>
            <div className="flex gap-4 items-center">
              <button 
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="bg-yellow-600 hover:bg-yellow-500 text-white text-sm px-4 py-2 rounded-lg transition flex items-center gap-2 font-bold shadow-lg shadow-yellow-900/10"
              >
                {showForm ? <X size={16} /> : <Plus size={16} />} Report Quality Defect
              </button>
              <button onClick={toggleAll} className="text-sm text-slate-400 hover:text-white transition">
                Select All
              </button>
              <button 
                onClick={handleExportCAPA}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-lg shadow-blue-900/20"
              >
                <FileText size={16} /> Export CAPA Report
              </button>
            </div>
           </>
        )}
      </div>

      {/* Submitter Form (Defect/CAPA Logger) */}
      {showForm && (
        <form onSubmit={handleSubmitReport} className="bg-slate-900 border border-yellow-500/30 rounded-xl p-5 space-y-4 animate-in slide-in-from-top-4">
           <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                 <AlertTriangle className="text-yellow-500" size={18} /> Submit Quality Engineering & CAPA Defect Report
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                 <X size={18} />
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Component Name</label>
                 <input 
                   type="text"
                   value={component}
                   onChange={e => setComponent(e.target.value)}
                   required
                   placeholder="e.g. Steering Column Gearbox"
                   className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-yellow-500/50"
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Defect Category</label>
                 <select
                   value={defectType}
                   onChange={e => setDefectType(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-yellow-500/50"
                 >
                    <option value="Calibration Mismatch">Calibration Mismatch</option>
                    <option value="Vibration Aging Fatigue">Vibration Aging Fatigue</option>
                    <option value="Brake Pad Material Mismatch">Brake Pad Material Mismatch</option>
                    <option value="Voltage Regulation Flaw">Voltage Regulation Flaw</option>
                    <option value="Hydraulic Seal Seepage">Hydraulic Seal Seepage</option>
                 </select>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Severity Level</label>
                 <select
                   value={severity}
                   onChange={e => setSeverity(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-yellow-500/50"
                 >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                 </select>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Root Cause Analysis (RCA)</label>
                 <textarea
                   value={rcaSummary}
                   onChange={e => setRcaSummary(e.target.value)}
                   required
                   placeholder="Describe what manufacturing process failed to cause the issue..."
                   className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-yellow-500/50 h-24"
                 />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Corrective Action Plan (CAPA)</label>
                 <textarea
                   value={recommendation}
                   onChange={e => setRecommendation(e.target.value)}
                   required
                   placeholder="Describe how to adjust production or manufacturing tooling..."
                   className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-yellow-500/50 h-24"
                 />
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="px-4 py-2 bg-slate-800 text-xs font-bold text-slate-200 rounded-lg hover:bg-slate-700"
              >
                 Cancel
              </button>
              <button 
                type="submit"
                className="px-5 py-2 bg-yellow-600 text-xs font-bold text-white rounded-lg hover:bg-yellow-500"
              >
                 Submit Defect Report
              </button>
           </div>
        </form>
      )}

      {/* CAPA Defect Card Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pb-4 flex-1">
        {insights.map((insight) => {
          const isSelected = selectedIds.has(insight.id);
          const isImplemented = insight.status === 'Implemented';
          
          return (
          <div 
            key={insight.id} 
            className={`
              rounded-xl p-6 border shadow-lg relative overflow-hidden group transition-all cursor-pointer
              ${isSelected ? 'border-blue-500 bg-blue-900/10' : 'border-slate-700 bg-slate-800'}
              ${isImplemented ? 'opacity-60 grayscale-[0.3]' : ''}
              hover:border-yellow-500/50
            `}
            onClick={() => toggleSelection(insight.id)}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-4 right-4 z-20 transition-transform active:scale-90">
               {isSelected ? <CheckSquare className="text-blue-400" /> : <Square className="text-slate-600 group-hover:text-slate-400" />}
            </div>

            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:opacity-20 transition">
                <Factory size={100} />
            </div>
            
            <div className="flex justify-between items-start mb-4 relative z-10 pr-10">
              <div>
                <span className="text-xs font-bold text-blue-400 mb-1 flex items-center gap-2">
                  {insight.id} • {insight.date}
                  {isImplemented && (
                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-1">
                      <Check size={10} /> Implemented
                    </span>
                  )}
                </span>
                <h3 className={`text-xl font-bold transition ${isImplemented ? 'text-slate-400 line-through decoration-slate-500' : 'text-slate-100'}`}>
                  {insight.component} Failure
                </h3>
                <p className="text-sm text-gray-400">{insight.defectType}</p>
              </div>
            </div>
            
            <div className="absolute top-14 right-4 z-10">
               <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                insight.severity === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {insight.severity}
               </span>
            </div>

            <div className="grid grid-cols-1 gap-4 relative z-10 mt-6">
              <div className={`p-4 rounded-lg border transition ${isImplemented ? 'bg-slate-800 border-slate-700' : 'bg-slate-900/50 border-slate-700'}`}>
                <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-orange-400" /> Root Cause Analysis
                </h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {insight.rcaSummary}
                </p>
              </div>

              <div className={`p-4 rounded-lg border transition ${isImplemented ? 'bg-slate-800 border-slate-700' : 'bg-emerald-900/10 border-emerald-900/30'}`}>
                <h4 className={`text-sm font-semibold flex items-center gap-2 mb-2 ${isImplemented ? 'text-slate-400' : 'text-emerald-400'}`}>
                  <CheckCircle size={14} /> Recommended Action
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {insight.recommendation}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end relative z-10">
                <span className={`text-sm flex items-center gap-1 transition ${isImplemented ? 'text-slate-500' : 'text-blue-400 group-hover:translate-x-1 duration-200'}`}>
                    Push to Engineering <ArrowRight size={14} />
                </span>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
};
