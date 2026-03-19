import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, limit, doc, deleteDoc } from 'firebase/firestore';
import { LogOut, LayoutDashboard, Database, Search, Map, Activity, ShieldAlert, Image as ImageIcon, Mic, BarChart2, ThumbsUp, ThumbsDown, X, AlertTriangle, CheckCircle, Trash2, ShieldOff } from 'lucide-react';
import { IncidentAnalysis } from './IncidentAnalysis';
import { IncidentReport } from '../types';
import { format } from 'date-fns';
import { handleFirestoreError } from '../utils/errorHandler';
import { OperationType } from '../types';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'history' | 'simulator' | 'sop' | 'map' | 'transcription' | 'summary'>('analysis');
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'incident_reports'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as IncidentReport[];
      setReports(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'incident_reports');
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#141414] border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-tight">AGV Fleet</h1>
            <p className="text-xs text-zinc-500 font-mono">VLA Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<Activity className="w-4 h-4" />} 
            label="Live Analysis" 
            active={activeTab === 'analysis'} 
            onClick={() => setActiveTab('analysis')} 
          />
          <NavItem 
            icon={<BarChart2 className="w-4 h-4" />} 
            label="Summary Dashboard" 
            active={activeTab === 'summary'} 
            onClick={() => setActiveTab('summary')} 
          />
          <NavItem 
            icon={<Database className="w-4 h-4" />} 
            label="Incident History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />

        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-zinc-400">
              {auth.currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{auth.currentUser?.displayName || 'Operator'}</p>
              <p className="text-xs text-zinc-500 truncate">{auth.currentUser?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <header className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">
            {activeTab === 'analysis' && 'Vision Language Action Analysis'}
            {activeTab === 'summary' && 'Summary Dashboard'}
            {activeTab === 'history' && 'Incident History'}

          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Use Case: Autonomous Guided Vehicle in Cargo Center
          </p>
        </header>

        {activeTab === 'analysis' && <IncidentAnalysis reports={reports} />}
        {activeTab === 'summary' && <SummaryView reports={reports} />}
        {activeTab === 'history' && <HistoryView reports={reports} loading={loading} />}

      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active 
          ? 'bg-blue-500/10 text-blue-500' 
          : 'text-zinc-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Placeholder components for the other tabs to keep the file manageable.
// I will implement them in separate files or expand them later.

function HistoryView({ reports, loading }: { reports: IncidentReport[], loading: boolean }) {
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const handleDelete = async () => {
    if (!reportToDelete) return;
    try {
      await deleteDoc(doc(db, 'incident_reports', reportToDelete));
      setReportToDelete(null);
      if (selectedReport?.id === reportToDelete) {
        setSelectedReport(null);
      }
    } catch (error) {
      console.error("Failed to delete report:", error);
      alert("Failed to delete report. You may not have permission to delete this record.");
      setReportToDelete(null);
    }
  };

  if (loading) return <div className="text-zinc-500">Loading history...</div>;
  if (reports.length === 0) return <div className="text-zinc-500">No incident reports found.</div>;

  const parseLocation = (telemetry?: string) => {
    if (!telemetry) return null;
    const match = telemetry.match(/Lat ([\d.-]+), Lng ([\d.-]+)/);
    if (match && match.length === 3) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    return null;
  };

  return (
    <>
      <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-zinc-400 font-mono text-xs uppercase">
            <tr>
              <th className="px-6 py-4 font-medium">ID</th>
              <th className="px-6 py-4 font-medium">Time</th>
              <th className="px-6 py-4 font-medium">Object</th>
              <th className="px-6 py-4 font-medium">Score</th>
              <th className="px-6 py-4 font-medium">System Recommended Action</th>
              <th className="px-6 py-4 font-medium">Operator Action</th>
              <th className="px-6 py-4 font-medium">Rating</th>
              <th className="px-6 py-4 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {reports.map(report => (
              <tr 
                key={report.id} 
                className="hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                  {report.id.substring(0, 8)}
                </td>
                <td className="px-6 py-4 text-zinc-300 whitespace-nowrap">
                  {report.timestamp ? format(report.timestamp.toDate(), 'MMM d, HH:mm:ss') : 'Pending'}
                </td>
                <td className="px-6 py-4 text-white font-medium">
                  {report.analysis?.perception_engine?.critical_object_identified || 'Unknown'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    report.analysis?.action_policy?.danger_score >= 4 ? 'bg-red-500/20 text-red-500' :
                    report.analysis?.action_policy?.danger_score === 3 ? 'bg-yellow-500/20 text-yellow-500' :
                    'bg-green-500/20 text-green-500'
                  }`}>
                    {report.analysis?.action_policy?.danger_score || 0}/5
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-300 font-mono text-xs">
                  {report.analysis?.action_policy?.recommended_action || 'N/A'}
                </td>
                <td className="px-6 py-4 text-zinc-300 font-mono text-xs">
                  {report.operator_action ? (
                    <span className="text-green-500 font-bold">{report.operator_action}</span>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {report.feedback === 'good' && <ThumbsUp className="w-4 h-4 text-green-500" />}
                  {report.feedback === 'bad' && <ThumbsDown className="w-4 h-4 text-red-500" />}
                  {!report.feedback && <span className="text-zinc-600">-</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setReportToDelete(report.id);
                    }}
                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReport(null)}>
          <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#141414] z-10">
              <h3 className="text-xl font-bold">Incident Details: {selectedReport.id}</h3>
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Top Action Heading */}
              <div className={`flex flex-col gap-3 pb-4 border-b border-white/10 ${
                selectedReport.analysis.ui_triggers.dashboard_color.toLowerCase() === 'red' ? 'text-red-500' :
                selectedReport.analysis.ui_triggers.dashboard_color.toLowerCase() === 'yellow' ? 'text-yellow-500' :
                'text-green-500'
              }`}>
                <div className="flex items-center gap-3">
                  {selectedReport.analysis.ui_triggers.dashboard_color.toLowerCase() === 'red' ? <AlertTriangle className="w-10 h-10 shrink-0" /> : <CheckCircle className="w-10 h-10 shrink-0" />}
                  <h2 className="text-2xl font-bold uppercase tracking-wide">
                    STATUS: {selectedReport.overridden ? 'OVERRIDDEN (VEHICLE MOVING)' : 'STOPPED (AWAITING OPERATOR)'} - Score: {selectedReport.analysis.action_policy.danger_score}/5
                  </h2>
                </div>
                <div className="ml-12 bg-black/20 p-3 rounded border border-white/5">
                  <h3 className="text-lg font-bold text-white">
                    Potential Recommended Action: {selectedReport.analysis.action_policy.recommended_action}
                  </h3>
                  <p className="text-sm text-zinc-300 mt-1">
                    <span className="font-semibold text-zinc-400">Description:</span> {selectedReport.analysis.ui_triggers.tts_audio_alert}
                  </p>
                </div>
              </div>

              {/* Media Captured Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image Column */}
                <div className="flex flex-col gap-2">
                  <span className={`self-start px-2 py-1 text-xs rounded border ${selectedReport.imageUrl ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {selectedReport.imageUrl ? '📷 Image Captured' : '❌ No Image Captured'}
                  </span>
                  {selectedReport.imageUrl && (
                    <div className="border border-white/10 rounded-lg overflow-hidden bg-black/30 h-48">
                      <img src={selectedReport.imageUrl} alt="Captured" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>

                {/* Audio Column */}
                <div className="flex flex-col gap-2">
                  <span className={`self-start px-2 py-1 text-xs rounded border ${selectedReport.audioUrl ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {selectedReport.audioUrl ? '🔊 Audio Captured' : '🔇 No Audio Captured'}
                  </span>
                  {selectedReport.audioUrl && (
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center justify-center h-48">
                      <audio controls src={selectedReport.audioUrl} className="w-full max-w-[200px]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Map Context */}
              {parseLocation(selectedReport.telemetry) && (
                <div className="bg-black/30 border border-white/5 rounded-lg overflow-hidden">
                  <div className="p-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Map className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-zinc-300">Incident Location</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">{parseLocation(selectedReport.telemetry)?.lat}, {parseLocation(selectedReport.telemetry)?.lng}</span>
                  </div>
                  <div className="h-48 w-full bg-zinc-900 relative">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      scrolling="no" 
                      marginHeight={0} 
                      marginWidth={0} 
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseLocation(selectedReport.telemetry)!.lng-0.005},${parseLocation(selectedReport.telemetry)!.lat-0.005},${parseLocation(selectedReport.telemetry)!.lng+0.005},${parseLocation(selectedReport.telemetry)!.lat+0.005}&layer=mapnik&marker=${parseLocation(selectedReport.telemetry)!.lat},${parseLocation(selectedReport.telemetry)!.lng}`}
                      className="absolute inset-0"
                    ></iframe>
                  </div>
                </div>
              )}

              {/* Perception Engine */}
              <div>
                <h4 className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-3">Perception Engine</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-black/30 p-3 rounded border border-white/5">
                    <span className="text-zinc-500 block text-xs mb-1">Object</span>
                    <span className="text-white font-mono">{selectedReport.analysis.perception_engine.critical_object_identified}</span>
                  </div>
                  <div className="bg-black/30 p-3 rounded border border-white/5">
                    <span className="text-zinc-500 block text-xs mb-1">Kinetic State</span>
                    <span className="text-white font-mono">{selectedReport.analysis.perception_engine.kinetic_state}</span>
                  </div>
                  <div className="bg-black/30 p-3 rounded border border-white/5 col-span-2">
                    <span className="text-zinc-500 block text-xs mb-1">Location</span>
                    <span className="text-white font-mono">{selectedReport.analysis.perception_engine.spatial_location}</span>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <h4 className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-3">Reasoning & Commentary</h4>
                <div className="space-y-3">
                  {selectedReport.analysis.reasoning_and_commentary.location_anomaly_check && (
                    <div className="bg-black/30 p-4 rounded border border-white/5 text-zinc-300 text-sm leading-relaxed border-l-4 border-l-yellow-500">
                      <span className="font-bold text-yellow-500 block mb-1">Location Anomaly Check:</span>
                      {selectedReport.analysis.reasoning_and_commentary.location_anomaly_check}
                    </div>
                  )}
                  <div className="bg-black/30 p-4 rounded border border-white/5 text-zinc-300 text-sm leading-relaxed italic border-l-4 border-l-blue-500">
                    <span className="font-bold text-blue-500 block mb-1 not-italic">Operator Commentary:</span>
                    "{selectedReport.analysis.reasoning_and_commentary.operator_commentary}"
                  </div>
                </div>
              </div>

              {/* Diagnostic */}
              <div>
                <h4 className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-3">Diagnostic Report (Database)</h4>
                <div className="bg-black/30 p-4 rounded border border-white/5 text-zinc-400 text-xs font-mono whitespace-pre-wrap">
                  {selectedReport.analysis.action_policy.diagnostic_report_for_database}
                </div>
              </div>

              {/* Raw Data & Warnings */}
              {(selectedReport.telemetry || selectedReport.override_warning_shown) && (
                <div>
                  <h4 className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-3">Raw Data & Warnings</h4>
                  <div className="space-y-3">
                    {selectedReport.telemetry && (
                      <div>
                        <span className="text-xs text-zinc-500 block mb-1">Telemetry Data</span>
                        <p className="text-sm font-mono text-zinc-300 bg-black/50 p-2 rounded border border-white/5">{selectedReport.telemetry}</p>
                      </div>
                    )}
                    {selectedReport.override_warning_shown && (
                      <div>
                        <span className="text-xs text-zinc-500 block mb-1">Override Warning Shown</span>
                        <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">{selectedReport.override_warning_shown}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Policy & Override Box */}
              <div className={`p-4 rounded-lg border flex flex-col gap-4 ${
                selectedReport.analysis.ui_triggers.dashboard_color.toLowerCase() === 'red' ? 'bg-red-500/10 border-red-500/50' :
                selectedReport.analysis.ui_triggers.dashboard_color.toLowerCase() === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/50' :
                'bg-green-500/10 border-green-500/50'
              }`}>
                {/* Operator Audio Feedback */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      <Mic className="w-3 h-3" /> Operator Audio Feedback
                    </label>
                  </div>
                  <div className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-zinc-300 min-h-[80px] italic">
                    {selectedReport.operator_feedback_notes || "No audio feedback provided."}
                  </div>
                </div>

                {/* Operator Action */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="w-3 h-3" /> Operator Action
                    </label>
                  </div>
                  <div className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-zinc-300 min-h-[80px] flex items-center justify-center">
                    {selectedReport.operator_action ? (
                      <span className="text-green-500 font-bold text-lg flex items-center gap-2">
                        <ShieldOff className="w-5 h-5" /> {selectedReport.operator_action}
                      </span>
                    ) : (
                      <span className="text-zinc-500">No action recorded.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-red-500/50 rounded-xl w-full max-w-md p-6 shadow-2xl shadow-red-500/20">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-xl font-bold">Delete Incident Report</h3>
            </div>
            <p className="text-zinc-300 mb-6 leading-relaxed">
              Are you sure you want to delete this incident report? This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 rounded font-medium text-zinc-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded font-bold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { SummaryView } from './SummaryView';
