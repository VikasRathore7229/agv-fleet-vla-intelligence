import React, { useMemo } from 'react';
import { IncidentReport } from '../types';
import { Activity, ShieldOff, ThumbsUp, ThumbsDown, AlertTriangle, MapPin, AlertOctagon, Info } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for different severity levels
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
};

const criticalIcon = createCustomIcon('#ef4444'); // Red-500
const warningIcon = createCustomIcon('#eab308');  // Yellow-500
const safeIcon = createCustomIcon('#3b82f6');     // Blue-500

interface Props {
  reports: IncidentReport[];
}

export function SummaryView({ reports }: Props) {
  const stats = useMemo(() => {
    const total = reports.length;
    const overrides = reports.filter(r => r.overridden).length;
    const goodFeedback = reports.filter(r => r.feedback === 'good').length;
    const badFeedback = reports.filter(r => r.feedback === 'bad').length;
    
    // Group by critical object
    const objectCounts: Record<string, number> = {};
    reports.forEach(r => {
      const obj = r.analysis?.perception_engine?.critical_object_identified;
      if (obj && obj !== 'None') {
        objectCounts[obj] = (objectCounts[obj] || 0) + 1;
      }
    });

    const commonObjects = Object.entries(objectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Sort valid reports by danger score (descending)
    const scoredReports = reports
      .filter(r => r.analysis?.action_policy?.danger_score !== undefined)
      .sort((a, b) => (b.analysis.action_policy.danger_score || 0) - (a.analysis.action_policy.danger_score || 0));

    // Critical Events (Score >= 3, max 5)
    const criticalEvents = scoredReports
      .filter(r => (r.analysis.action_policy.danger_score || 0) >= 3)
      .slice(0, 5);

    // Non-Critical Overrides (Score < 3 but overridden, max 5)
    const nonCriticalOverrides = scoredReports
      .filter(r => (r.analysis.action_policy.danger_score || 0) < 3 && r.overridden)
      .slice(0, 5);

    // All events with Lat/Lng for Map
    const mapEvents = reports.filter(r => r.lat !== undefined && r.lng !== undefined);

    return { 
      total, 
      overrides, 
      goodFeedback, 
      badFeedback, 
      commonObjects, 
      criticalEvents, 
      nonCriticalOverrides,
      mapEvents
    };
  }, [reports]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Activity className="w-6 h-6 text-blue-500" />}
          title="Total Incidents"
          value={stats.total}
          bg="bg-blue-500/10"
          border="border-blue-500/20"
        />
        <StatCard 
          icon={<ShieldOff className="w-6 h-6 text-red-500" />}
          title="Manual Overrides"
          value={stats.overrides}
          bg="bg-red-500/10"
          border="border-red-500/20"
        />
        <StatCard 
          icon={<ThumbsUp className="w-6 h-6 text-green-500" />}
          title="Good Ratings"
          value={stats.goodFeedback}
          bg="bg-green-500/10"
          border="border-green-500/20"
        />
        <StatCard 
          icon={<ThumbsDown className="w-6 h-6 text-orange-500" />}
          title="Bad Ratings"
          value={stats.badFeedback}
          bg="bg-orange-500/10"
          border="border-orange-500/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Common Incidents Triggered */}
        <div className="lg:col-span-1 bg-[#141414] border border-white/10 rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Most Common Incident Triggers
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {stats.commonObjects.length > 0 ? (
              <div className="space-y-3">
                {stats.commonObjects.map(([obj, count], index) => (
                  <div key={index} className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                    <span className="text-zinc-300 font-mono text-sm break-words line-clamp-2 mr-2">{obj}</span>
                    <span className="bg-white/10 text-white px-2.5 py-1 rounded-full text-xs font-bold shrink-0">
                      {count} occurrences
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm italic">
                No common triggers identified yet.
              </div>
            )}
          </div>
        </div>

        {/* Most Critical & Non-Critical Events */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Most Critical Events */}
          <div className="bg-[#141414] border border-red-500/20 rounded-xl p-6 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
            <h3 className="text-lg font-semibold text-red-500 mb-4 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5" />
              Most Critical Events (High Danger Score)
            </h3>
            {stats.criticalEvents.length > 0 ? (
              <div className="space-y-3">
                {stats.criticalEvents.map((report) => (
                  <div key={report.id} className="bg-red-950/20 border border-red-500/20 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">
                          {report.analysis?.perception_engine?.critical_object_identified || 'Unknown Hazard'}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {report.timestamp?.toDate().toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2">
                        {report.analysis?.action_policy?.diagnostic_report_for_database}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center flex-col justify-center bg-black/40 px-4 py-2 rounded-lg border border-white/5">
                      <span className="text-xs text-zinc-500 uppercase font-semibold">Score</span>
                      <span className="text-xl font-bold text-red-500">{report.analysis?.action_policy?.danger_score}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm italic">No critical events recorded (Score ≥ 3).</p>
            )}
          </div>

          {/* Non Critical Events */}
          <div className="bg-[#141414] border border-blue-500/20 rounded-xl p-6 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Non-Critical Events (Low Score, Operator Overridden)
            </h3>
            {stats.nonCriticalOverrides.length > 0 ? (
              <div className="space-y-3">
                {stats.nonCriticalOverrides.map((report) => (
                  <div key={report.id} className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-lg flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white font-medium text-sm">
                          {report.analysis?.perception_engine?.scene_context || 'General Environment'}
                        </span>
                        <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded border border-blue-500/30">
                          Score: {report.analysis?.action_policy?.danger_score}/5
                        </span>
                      </div>
                      {report.operator_feedback_notes ? (
                        <div className="bg-black/40 p-3 rounded text-sm text-zinc-300 border border-white/5 italic">
                          "{report.operator_feedback_notes}"
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500 italic">No operator feedback provided.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm italic">No low-severity overrides recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Incident Location Map */}
      <div className="bg-[#141414] border border-white/10 rounded-xl p-6">
         <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            Incident Locations & Hotspots
          </h3>
          <div className="h-[400px] rounded-lg overflow-hidden border border-white/10 relative z-0">
            {stats.mapEvents.length > 0 ? (
              <MapContainer 
                center={[stats.mapEvents[0].lat!, stats.mapEvents[0].lng!]} 
                zoom={14} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {stats.mapEvents.map((report) => {
                  const score = report.analysis?.action_policy?.danger_score || 0;
                  const icon = score >= 4 ? criticalIcon : (score >= 2 ? warningIcon : safeIcon);
                  
                  return (
                    <Marker 
                      key={report.id} 
                      position={[report.lat!, report.lng!]}
                      icon={icon}
                    >
                      <Popup className="custom-popup">
                        <div className="p-1">
                          <h4 className="font-bold text-sm mb-1">{report.analysis?.perception_engine?.critical_object_identified || 'Unknown Location'}</h4>
                          <p className="text-xs text-gray-600 mb-2">Score: <strong>{score}/5</strong></p>
                          <p className="text-xs text-gray-500">
                            {new Date(report.timestamp?.toDate()).toLocaleString()}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-black/40 text-zinc-500">
                No incident locations available to map.
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, bg, border }: { icon: React.ReactNode, title: string, value: number, bg: string, border: string }) {
  return (
    <div className={`p-6 rounded-xl border ${bg} ${border} flex items-center gap-4`}>
      <div className="p-3 bg-black/20 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-zinc-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
