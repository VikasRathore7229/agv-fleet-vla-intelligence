import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, Play, AlertTriangle, CheckCircle, Info, Mic, Search, MapPin, Image as ImageIcon, ThumbsUp, ThumbsDown, ShieldOff, ShieldAlert, X, Square, Check, Edit3 } from 'lucide-react';
import { analyzeIncident, searchSOP, getMapContext, generateSyntheticImage, transcribeAudio } from '../services/geminiService';
import { VLAAnalysis, IncidentReport } from '../types';
import { collection, addDoc, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError } from '../utils/errorHandler';
import { OperationType } from '../types';

// Haversine formula to calculate distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

interface Props {
  reports: IncidentReport[];
}

export function IncidentAnalysis({ reports }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [avgSpeed, setAvgSpeed] = useState('');
  const [distance, setDistance] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<VLAAnalysis | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'good' | 'bad' | null>(null);
  const [isOverridden, setIsOverridden] = useState(false);
  const [selectedPastIncident, setSelectedPastIncident] = useState<IncidentReport | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio Feedback State
  const [isRecordingFeedback, setIsRecordingFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showDontOverrideConfirm, setShowDontOverrideConfirm] = useState(false);
  const [resetCountdown, setResetCountdown] = useState<number | null>(null);
  const [showAllSimilar, setShowAllSimilar] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [audioFile]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept paste if user is typing in a text input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.target.type === 'text' || e.target.type === 'number') return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
              setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
        } else if (item.type.indexOf('audio') !== -1) {
          const file = item.getAsFile();
          if (file) {
            setAudioFile(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste as any);
    return () => window.removeEventListener('paste', handlePaste as any);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setAudioFile(e.target.files[0]);
  };

  const compressImage = (file: File): Promise<string> => {
    if (file.type.startsWith('video/')) {
      return fileToBase64(file);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 720;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          // Remove the data URL prefix
          const base64 = dataUrl.split(',')[1];
          resolve(base64);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const compressAudio = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      await audioContext.close();

      // Downsample to 16kHz mono
      const targetSampleRate = 16000;
      const numSamples = Math.floor(audioBuffer.duration * targetSampleRate);
      const offlineCtx = new OfflineAudioContext(1, numSamples, targetSampleRate);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      const renderedBuffer = await offlineCtx.startRendering();

      // Encode as 16-bit PCM WAV
      const channelData = renderedBuffer.getChannelData(0);
      const wavBuffer = new ArrayBuffer(44 + channelData.length * 2);
      const view = new DataView(wavBuffer);
      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + channelData.length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // mono
      view.setUint32(24, targetSampleRate, true);
      view.setUint32(28, targetSampleRate * 2, true); // byte rate
      view.setUint16(32, 2, true); // block align
      view.setUint16(34, 16, true); // bits per sample
      writeString(36, 'data');
      view.setUint32(40, channelData.length * 2, true);
      let offset = 44;
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }

      const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(wavBlob);
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ base64, mimeType: 'audio/wav' });
        };
        reader.onerror = reject;
      });
    } catch (err) {
      console.warn('Audio compression failed, using original:', err);
      const base64 = await fileToBase64(file);
      return { base64, mimeType: file.type };
    }
  };

  const runAnalysis = async () => {
    if (!imageFile) return alert('Please upload an image or video frame.');
    setLoading(true);
    setAnalysis(null);
    setCurrentReportId(null);
    setFeedbackGiven(null);
    setIsOverridden(false);

    try {
      const imageBase64 = await compressImage(imageFile);
      let audioBase64 = null;
      let audioMimeType = null;
      
      if (audioFile) {
        audioBase64 = await fileToBase64(audioFile);
        audioMimeType = audioFile.type;
      }

      // Build past context string
      const recentContext = reports.slice(0, 15).map(r => 
        `Object: ${r.analysis?.perception_engine?.critical_object_identified}, Original Recommendation: ${r.analysis?.action_policy?.recommended_action}, Overridden by Operator: ${r.overridden ? 'Yes (Changed to GO)' : 'No'}, Feedback: ${r.feedback || 'None'}, Operator Notes: ${r.operator_feedback_notes || 'None'}`
      ).join('\n');

      const telemetryString = `Telemetry: Status: Stopped. Average Speed Before Stop: ${avgSpeed}km/h. Distance to object: ${distance}m. Location: Lat ${lat}, Lng ${lng}.`;

      const result = await analyzeIncident(
        imageBase64,
        imageFile.type.startsWith('video/') ? imageFile.type : 'image/jpeg',
        audioBase64,
        audioMimeType,
        telemetryString,
        recentContext
      );

      setAnalysis(result);

      // Compress media for Firestore storage
      let compressedAudioBase64: string | null = null;
      let compressedAudioMime: string | null = null;
      if (audioFile) {
        try {
          const compressed = await compressAudio(audioFile);
          compressedAudioBase64 = compressed.base64;
          compressedAudioMime = compressed.mimeType;
        } catch (err) {
          console.warn('Audio compression failed:', err);
        }
      }

      // Save to Firestore
      const docRef = doc(collection(db, 'incident_reports'));
      const docData: any = {
        id: docRef.id,
        timestamp: serverTimestamp(),
        operatorId: auth.currentUser?.uid,
        status: 'pending',
        telemetry: telemetryString,
        avgSpeed: parseFloat(avgSpeed) || 0,
        distance: parseFloat(distance) || 0,
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lng) || 0,
        analysis: result,
        imageUrl: `data:${imageFile.type.startsWith('video/') ? imageFile.type : 'image/jpeg'};base64,${imageBase64}`
      };

      if (compressedAudioBase64 && compressedAudioMime) {
        docData.audioUrl = `data:${compressedAudioMime};base64,${compressedAudioBase64}`;
      }

      try {
        await setDoc(docRef, docData);
        setCurrentReportId(docRef.id);
      } catch (error) {
        console.error('Firestore save with media failed, retrying without media:', error);
        // Retry without base64 media to stay under Firestore 1MB limit
        try {
          delete docData.imageUrl;
          delete docData.audioUrl;
          await setDoc(docRef, docData);
          setCurrentReportId(docRef.id);
          console.warn('Saved without media due to size constraints.');
        } catch (retryError) {
          console.error('Firestore save failed entirely:', retryError);
          alert('Warning: Could not save report to database. Analysis results are still displayed.');
        }
      }

    } catch (error) {
      console.error(error);
      alert('Analysis failed. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (type: 'good' | 'bad') => {
    if (!currentReportId) return;
    try {
      await updateDoc(doc(db, 'incident_reports', currentReportId), { feedback: type });
      setFeedbackGiven(type);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `incident_reports/${currentReportId}`);
    }
  };

  const getWarningMessage = (score: number, object: string) => {
    if (score >= 5) {
      return `CRITICAL DANGER: The system has detected a high-risk obstacle (${object}). Force overriding will instruct the vehicle to ignore this safety stop and continue on its path, which may result in a severe collision or injury. You assume full responsibility for this action.`;
    } else if (score >= 3) {
      return `WARNING: The system detected a potential obstacle (${object}). Overriding will cause the vehicle to continue on its path. Please ensure the path is completely clear before proceeding.`;
    } else {
      return `Notice: Overriding will resume vehicle movement. Ensure the path is clear of the detected object (${object}).`;
    }
  };

  const handleOverrideClick = () => {
    if (!analysis) return;
    setWarningMessage(getWarningMessage(analysis.action_policy.danger_score, analysis.perception_engine.critical_object_identified));
    setShowOverrideWarning(true);
  };

  const confirmOverride = async () => {
    if (!currentReportId) return;
    try {
      await updateDoc(doc(db, 'incident_reports', currentReportId), { 
        overridden: true,
        override_warning_shown: warningMessage,
        operator_action: 'Force Override',
        status: 'resolved',
        ...(feedbackText.trim() && { operator_feedback_notes: feedbackText })
      });
      setIsOverridden(true);
      setShowOverrideWarning(false);
      
      // Start countdown
      setResetCountdown(3);
      
      const interval = setInterval(() => {
        setResetCountdown(prev => prev ? prev - 1 : null);
      }, 1000);

      setTimeout(() => {
        clearInterval(interval);
        setResetCountdown(null);
        setAnalysis(null);
        setImageFile(null);
        setImagePreview(null);
        setAudioFile(null);
        setAudioUrl(null);
        setCurrentReportId(null);
        setIsOverridden(false);
        setFeedbackGiven(null);
        setFeedbackText('');
        setFeedbackSaved(false);
        setShowAllSimilar(false);
        setAvgSpeed('');
        setDistance('');
        setLat('');
        setLng('');
      }, 3000);
      
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `incident_reports/${currentReportId}`);
    }
  };

  const confirmDontOverride = async () => {
    if (!currentReportId) return;
    try {
      await updateDoc(doc(db, 'incident_reports', currentReportId), {
        overridden: false,
        operator_action: "Don't Override",
        status: 'resolved',
        ...(feedbackText.trim() && { operator_feedback_notes: feedbackText })
      });
      setShowDontOverrideConfirm(true);

      // Start countdown
      setResetCountdown(3);

      const interval = setInterval(() => {
        setResetCountdown(prev => prev ? prev - 1 : null);
      }, 1000);

      setTimeout(() => {
        clearInterval(interval);
        setResetCountdown(null);
        setShowDontOverrideConfirm(false);
        setAnalysis(null);
        setImageFile(null);
        setImagePreview(null);
        setAudioFile(null);
        setAudioUrl(null);
        setCurrentReportId(null);
        setIsOverridden(false);
        setFeedbackGiven(null);
        setFeedbackText('');
        setFeedbackSaved(false);
        setShowAllSimilar(false);
        setAvgSpeed('');
        setDistance('');
        setLat('');
        setLng('');
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `incident_reports/${currentReportId}`);
    }
  };

  const similarIncidents = useMemo(() => {
    if (!analysis) return [];
    const currentObj = analysis.perception_engine.critical_object_identified.toLowerCase();
    // Find past incidents with similar objects (simple string match for prototype)
    return reports.filter(r => 
      r.id !== currentReportId &&
      r.status !== 'pending' &&
      (r.analysis?.perception_engine?.critical_object_identified?.toLowerCase().includes(currentObj) ||
      currentObj.includes(r.analysis?.perception_engine?.critical_object_identified?.toLowerCase() || ''))
    );
  }, [analysis, reports, currentReportId]);

  const parsedLocation = useMemo(() => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      return { lat: parsedLat, lng: parsedLng };
    }
    return null;
  }, [lat, lng]);

  const nearbyIncidents = useMemo(() => {
    if (!parsedLocation || !reports.length) return [];
    return reports.filter(r => {
      if (r.id === currentReportId) return false;
      if (!r.telemetry) return false;
      const match = r.telemetry.match(/Lat:\s*([\d.-]+),\s*Long:\s*([\d.-]+)/);
      if (match) {
        const rLat = parseFloat(match[1]);
        const rLng = parseFloat(match[2]);
        if (!isNaN(rLat) && !isNaN(rLng)) {
          const dist = getDistance(parsedLocation.lat, parsedLocation.lng, rLat, rLng);
          return dist < 50; // within 50 meters
        }
      }
      return false;
    });
  }, [parsedLocation, reports, currentReportId]);

  const startFeedbackRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsTranscribing(true);
        try {
          const transcript = await transcribeAudio(audioBlob);
          setFeedbackText(transcript);
        } catch (err) {
          console.error("Transcription failed:", err);
          alert("Failed to transcribe audio.");
        } finally {
          setIsTranscribing(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingFeedback(true);
    } catch (err) {
      console.error(err);
      alert('Microphone access denied or not available.');
    }
  };

  const stopFeedbackRecording = () => {
    if (mediaRecorderRef.current && isRecordingFeedback) {
      mediaRecorderRef.current.stop();
      setIsRecordingFeedback(false);
    }
  };

  const saveFeedbackText = async () => {
    if (!currentReportId || !feedbackText.trim()) return;
    try {
      await updateDoc(doc(db, 'incident_reports', currentReportId), { 
        operator_feedback_notes: feedbackText 
      });
      setFeedbackSaved(true);
      setTimeout(() => setFeedbackSaved(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `incident_reports/${currentReportId}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Section */}
      <div className="bg-[#141414] border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" />
            New Incident Report
          </h2>
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Vehicle Status: <span className="text-red-500">Stopped</span>
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Visual Data (Image/Video Frame)</label>
            <div 
              className="relative border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer bg-black/20"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                    setImageFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => setImagePreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }
              }}
            >
              <input 
                type="file" 
                accept="image/*,video/*" 
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {imageFile ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-400">Media Selected</p>
                  <p className="text-xs text-zinc-500 mt-1">{imageFile.name || 'Pasted image'}</p>
                  <p className="text-xs text-blue-500/70 mt-2 font-medium">Click or drag to replace</p>
                </>
              ) : (
                <>
                  <ImageIcon className="w-6 h-6 text-zinc-500 mb-2" />
                  <p className="text-sm font-medium text-zinc-300">Click to upload or drag and drop</p>
                  <p className="text-xs text-zinc-500 mt-1">SVG, PNG, JPG or GIF</p>
                  <p className="text-xs text-blue-500/70 mt-2 font-medium">You can also paste (Ctrl+V) an image anywhere</p>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Audio Data (Optional Ambient Sound)</label>
            <div 
              className="relative border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer bg-black/20"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  if (file.type.startsWith('audio/')) {
                    setAudioFile(file);
                  }
                }
              }}
            >
              <input 
                type="file" 
                accept="audio/*" 
                onChange={handleAudioUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {audioFile ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-400">Audio Selected</p>
                  <p className="text-xs text-zinc-500 mt-1">{audioFile.name || 'Pasted audio'}</p>
                  <p className="text-xs text-blue-500/70 mt-2 font-medium">Click or drag to replace</p>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6 text-zinc-500 mb-2" />
                  <p className="text-sm font-medium text-zinc-300">Click to upload or drag and drop</p>
                  <p className="text-xs text-zinc-500 mt-1">MP3, WAV, or OGG</p>
                  <p className="text-xs text-blue-500/70 mt-2 font-medium">You can also paste (Ctrl+V) an audio file anywhere</p>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-400">Configure Parameters</label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col justify-end">
                <label className="block text-xs text-zinc-500 mb-1 truncate" title="Avg Speed Before Stop (km/h)">Avg Speed Before Stop (km/h)</label>
                <input 
                  type="number"
                  value={avgSpeed}
                  onChange={(e) => setAvgSpeed(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none h-[42px]"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-xs text-zinc-500 mb-1 truncate" title="Distance to Object (m)">Distance to Object (m)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none h-[42px]"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-xs text-zinc-500 mb-1 truncate" title="Location (Lat.)">Location (Lat.)</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 50.0333"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none h-[42px]"
                />
              </div>
              <div className="flex flex-col justify-end">
                <label className="block text-xs text-zinc-500 mb-1 truncate" title="Location (Long.)">Location (Long.)</label>
                <input 
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. 8.5706"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none h-[42px]"
                />
              </div>
            </div>
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading || !imageFile}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run VLA Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output Section */}
      <div className="bg-[#141414] border border-white/10 rounded-xl p-6 flex flex-col">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-500" />
          Analysis Results
        </h2>

        {!analysis && !loading && (
          <div className="flex-1 flex items-center justify-center text-zinc-500 border-2 border-dashed border-white/5 rounded-lg">
            Awaiting input data...
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-blue-500 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="font-mono text-sm animate-pulse">Processing multimodal inputs...</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            {/* Top Action Heading */}
            <div className={`flex flex-col gap-3 pb-4 border-b border-white/10 ${
              analysis.ui_triggers.dashboard_color.toLowerCase() === 'red' ? 'text-red-500' :
              analysis.ui_triggers.dashboard_color.toLowerCase() === 'yellow' ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              <div className="flex items-center gap-3">
                {analysis.ui_triggers.dashboard_color.toLowerCase() === 'red' ? <AlertTriangle className="w-10 h-10 shrink-0" /> : <CheckCircle className="w-10 h-10 shrink-0" />}
                <h2 className="text-2xl font-bold uppercase tracking-wide">
                  STATUS: {isOverridden ? 'OVERRIDDEN (VEHICLE MOVING)' : 'STOPPED (AWAITING OPERATOR)'} - Score: {analysis.action_policy.danger_score}/5
                </h2>
                {resetCountdown !== null && (
                  <span className="ml-auto text-sm font-normal text-zinc-400 animate-pulse bg-black/40 px-3 py-1 rounded-full border border-white/10">
                    Resetting in {resetCountdown}s...
                  </span>
                )}
              </div>
              <div className="ml-12 bg-black/20 p-3 rounded border border-white/5">
                <h3 className="text-lg font-bold text-white">
                  Potential Recommended Action: {analysis.action_policy.recommended_action}
                </h3>
                <p className="text-sm text-zinc-300 mt-1">
                  <span className="font-semibold text-zinc-400">Description:</span> {analysis.ui_triggers.tts_audio_alert}
                </p>
              </div>
            </div>

            {/* Media Captured Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image Column */}
              <div className="flex flex-col gap-2">
                <span className={`self-start px-2 py-1 text-xs rounded border ${imageFile ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {imageFile ? (imageFile.type.startsWith('video/') ? '📹 Video Captured' : '📷 Image Captured') : '❌ No Image Captured'}
                </span>
                {imagePreview && (
                  <div 
                    className="border border-white/10 rounded-lg overflow-hidden bg-black/30 cursor-pointer hover:border-blue-500/50 transition-colors relative group h-32"
                    onClick={() => setFullScreenImage(imagePreview)}
                  >
                    <img src={imagePreview} alt="Captured" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded flex items-center gap-1">
                        <Search className="w-3 h-3" /> View Full Screen
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Audio Column */}
              <div className="flex flex-col gap-2">
                <span className={`self-start px-2 py-1 text-xs rounded border ${audioFile ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {audioFile ? '🔊 Audio Captured' : '🔇 No Audio Captured'}
                </span>
                {audioUrl && (
                  <div className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center justify-center h-32">
                    <audio controls src={audioUrl} className="w-full max-w-[200px]" />
                  </div>
                )}
              </div>
            </div>

            {/* High-Risk Zone Warning */}
            {nearbyIncidents.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-500 font-bold text-sm">High-Risk Zone Detected</h4>
                  <p className="text-red-400/80 text-xs mt-1">
                    {nearbyIncidents.length} past incident(s) have occurred within 50 meters of this location. This area may require physical inspection or infrastructure changes.
                  </p>
                </div>
              </div>
            )}

            {/* Map Context */}
            {parsedLocation && (
              <div className="bg-black/30 border border-white/5 rounded-lg overflow-hidden">
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-zinc-300">Incident Location</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">{parsedLocation.lat}, {parsedLocation.lng}</span>
                </div>
                <div className="h-48 w-full bg-zinc-900 relative">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight={0} 
                    marginWidth={0} 
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parsedLocation.lng-0.005},${parsedLocation.lat-0.005},${parsedLocation.lng+0.005},${parsedLocation.lat+0.005}&layer=mapnik&marker=${parsedLocation.lat},${parsedLocation.lng}`}
                    className="absolute inset-0"
                  ></iframe>
                </div>
              </div>
            )}

            {/* Similar Incidents */}
            {similarIncidents.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 text-xs uppercase tracking-wider font-semibold mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Info className="w-4 h-4" /> Similar Past Incidents Detected ({similarIncidents.length})</span>
                </h4>
                <ul className="space-y-3">
                  {similarIncidents.slice(0, showAllSimilar ? undefined : 3).map(inc => {
                    const dateStr = inc.timestamp?.toDate ? inc.timestamp.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';
                    return (
                    <li 
                      key={inc.id} 
                      onClick={() => setSelectedPastIncident(inc)}
                      className="text-sm text-zinc-300 bg-black/20 hover:bg-black/40 cursor-pointer p-3 rounded border border-white/5 flex flex-col gap-2 transition-colors"
                    >
                      <div className="flex justify-between items-start border-b border-white/5 pb-2 mb-1">
                        <span className="font-semibold text-white">{dateStr}</span>
                        {inc.feedback && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${inc.feedback === 'good' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            Rated: {inc.feedback.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div><span className="text-zinc-500 block mb-0.5">Object</span> <span className="font-mono text-blue-300">{inc.analysis?.perception_engine?.critical_object_identified}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Recommendation</span> <span className="text-zinc-200">{inc.analysis?.action_policy?.recommended_action}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Overridden</span> <span className={inc.overridden ? 'text-yellow-400' : 'text-zinc-300'}>{inc.overridden ? 'Yes (Forced GO)' : 'No'}</span></div>
                        <div><span className="text-zinc-500 block mb-0.5">Danger Score</span> <span className="text-zinc-200">{inc.analysis?.action_policy?.danger_score}/5</span></div>
                      </div>
                    </li>
                  )})}
                </ul>
                {similarIncidents.length > 3 && (
                  <button 
                    onClick={() => setShowAllSimilar(!showAllSimilar)}
                    className="mt-3 w-full py-2 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors"
                  >
                    {showAllSimilar ? 'Show Less' : `See More (${similarIncidents.length - 3} more)`}
                  </button>
                )}
              </div>
            )}

            {/* Perception Engine */}
            <div>
              <h4 className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-3">Perception Engine</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-black/30 p-3 rounded border border-white/5">
                  <span className="text-zinc-500 block text-xs mb-1">Object</span>
                  <span className="text-white font-mono">{analysis.perception_engine.critical_object_identified}</span>
                </div>
                <div className="bg-black/30 p-3 rounded border border-white/5">
                  <span className="text-zinc-500 block text-xs mb-1">Kinetic State</span>
                  <span className="text-white font-mono">{analysis.perception_engine.kinetic_state}</span>
                </div>
                <div className="bg-black/30 p-3 rounded border border-white/5 col-span-2">
                  <span className="text-zinc-500 block text-xs mb-1">Location</span>
                  <span className="text-white font-mono">{analysis.perception_engine.spatial_location}</span>
                </div>
              </div>
            </div>

            {/* Reasoning */}
            <div>
              <h4 className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-3">Reasoning & Commentary</h4>
              <div className="space-y-3">
                {analysis.reasoning_and_commentary.location_anomaly_check && (
                  <div className="bg-black/30 p-4 rounded border border-white/5 text-zinc-300 text-sm leading-relaxed border-l-4 border-l-yellow-500">
                    <span className="font-bold text-yellow-500 block mb-1">Location Anomaly Check:</span>
                    {analysis.reasoning_and_commentary.location_anomaly_check}
                  </div>
                )}
                <div className="bg-black/30 p-4 rounded border border-white/5 text-zinc-300 text-sm leading-relaxed italic border-l-4 border-l-blue-500">
                  <span className="font-bold text-blue-500 block mb-1 not-italic">Operator Commentary:</span>
                  "{analysis.reasoning_and_commentary.operator_commentary}"
                </div>
              </div>
            </div>

            {/* Diagnostic */}
            <div>
              <h4 className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-3">Diagnostic Report (Database)</h4>
              <div className="bg-black/30 p-4 rounded border border-white/5 text-zinc-400 text-xs font-mono whitespace-pre-wrap">
                {analysis.action_policy.diagnostic_report_for_database}
              </div>
            </div>

            {/* Action Policy & Override Box (Moved to bottom) */}
            <div className={`p-4 rounded-lg border flex flex-col gap-4 ${
              analysis.ui_triggers.dashboard_color.toLowerCase() === 'red' ? 'bg-red-500/10 border-red-500/50' :
              analysis.ui_triggers.dashboard_color.toLowerCase() === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/50' :
              'bg-green-500/10 border-green-500/50'
            }`}>
              {/* Operator Audio Feedback */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Mic className="w-3 h-3" /> Operator Audio Feedback
                  </label>
                  <div className="flex gap-2">
                    {!isRecordingFeedback ? (
                      <button 
                        onClick={startFeedbackRecording}
                        disabled={isTranscribing}
                        className="flex items-center gap-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2 py-1 rounded transition-colors disabled:opacity-50"
                      >
                        <Mic className="w-3 h-3" /> Record
                      </button>
                    ) : (
                      <button 
                        onClick={stopFeedbackRecording}
                        className="flex items-center gap-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded transition-colors animate-pulse"
                      >
                        <Square className="w-3 h-3" /> Stop
                      </button>
                    )}
                  </div>
                </div>
                
                {isTranscribing && (
                  <div className="text-xs text-blue-400 animate-pulse mb-2">Transcribing audio...</div>
                )}
                
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Record audio or type your feedback here. This will be saved automatically when you make your final decision."
                  className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:outline-none min-h-[60px] resize-y"
                />
              </div>

              {/* Feedback Section */}
              <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-white/5 border-t border-t-white/10">
                <span className="text-sm text-zinc-400">Rate this analysis to improve future accuracy:</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleFeedback('good')}
                    disabled={feedbackGiven !== null}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      feedbackGiven === 'good' ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 
                      feedbackGiven === 'bad' ? 'opacity-50 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" /> Good
                  </button>
                  <button 
                    onClick={() => handleFeedback('bad')}
                    disabled={feedbackGiven !== null}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      feedbackGiven === 'bad' ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 
                      feedbackGiven === 'good' ? 'opacity-50 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" /> Bad
                  </button>
                </div>
              </div>

              <div className="flex-1 pt-4 border-t border-white/10">
                {!isOverridden && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-center">
                      <h3 className="font-bold text-lg text-white mb-1">
                        Final Operator Decision
                      </h3>
                      <p className="text-xs text-zinc-400">Review all data above before making a decision.</p>
                    </div>
                    <div className="flex items-center justify-between w-full gap-16">
                      <button 
                        onClick={confirmDontOverride}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-green-500/20"
                      >
                        <ShieldAlert className="w-5 h-5" /> Don't Override (STOP)
                      </button>
                      <button 
                        onClick={handleOverrideClick}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-red-500/20"
                      >
                        <ShieldOff className="w-5 h-5" /> Force Override (GO)
                      </button>
                    </div>
                  </div>
                )}
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Past Incident Modal */}
      {selectedPastIncident && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="sticky top-0 bg-[#141414] border-b border-white/10 p-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-white">Past Incident Details: {selectedPastIncident.id}</h3>
              <button 
                onClick={() => setSelectedPastIncident(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className={`p-4 rounded-lg border flex items-start gap-4 ${
                selectedPastIncident.analysis.ui_triggers.dashboard_color.toLowerCase() === 'red' ? 'bg-red-500/10 border-red-500/50 text-red-500' :
                selectedPastIncident.analysis.ui_triggers.dashboard_color.toLowerCase() === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' :
                'bg-green-500/10 border-green-500/50 text-green-500'
              }`}>
                {selectedPastIncident.analysis.ui_triggers.dashboard_color.toLowerCase() === 'red' ? <AlertTriangle className="w-8 h-8 shrink-0" /> : <CheckCircle className="w-8 h-8 shrink-0" />}
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    ACTION: {selectedPastIncident.overridden ? 'OVERRIDDEN (GO)' : selectedPastIncident.analysis.action_policy.recommended_action} (Score: {selectedPastIncident.analysis.action_policy.danger_score}/5)
                  </h3>
                  <p className="text-sm opacity-90">{selectedPastIncident.analysis.ui_triggers.tts_audio_alert}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image Column */}
                <div className="flex flex-col gap-2">
                  <span className={`self-start px-2 py-1 text-xs rounded border ${selectedPastIncident.imageUrl ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {selectedPastIncident.imageUrl ? '📷 Image Captured' : '❌ No Image Captured'}
                  </span>
                  {selectedPastIncident.imageUrl && (
                    <div 
                      className="border border-white/10 rounded-lg overflow-hidden bg-black/30 cursor-pointer hover:border-blue-500/50 transition-colors relative group h-48"
                      onClick={() => setFullScreenImage(selectedPastIncident.imageUrl!)}
                    >
                      <img src={selectedPastIncident.imageUrl} alt="Incident" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded flex items-center gap-1">
                          <Search className="w-3 h-3" /> View Full Screen
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio Column */}
                <div className="flex flex-col gap-2">
                  <span className={`self-start px-2 py-1 text-xs rounded border ${selectedPastIncident.audioUrl ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {selectedPastIncident.audioUrl ? '🔊 Audio Captured' : '🔇 No Audio Captured'}
                  </span>
                  {selectedPastIncident.audioUrl && (
                    <div className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center justify-center h-48">
                      <audio controls src={selectedPastIncident.audioUrl} className="w-full max-w-[200px]" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                  <h4 className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Object Identified</h4>
                  <p className="text-sm font-medium text-white">{selectedPastIncident.analysis.perception_engine.critical_object_identified}</p>
                </div>
                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                  <h4 className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Kinetic State</h4>
                  <p className="text-sm text-white">{selectedPastIncident.analysis.perception_engine.kinetic_state}</p>
                </div>
              </div>

              <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                <h4 className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Operator Commentary</h4>
                <p className="text-sm text-zinc-300 italic">"{selectedPastIncident.analysis.reasoning_and_commentary.operator_commentary}"</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4" 
          onClick={() => setFullScreenImage(null)}
        >
          <button 
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-white/10 rounded-full transition-colors text-white z-[70]"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={fullScreenImage} 
            alt="Full screen" 
            className="max-w-full max-h-[95vh] object-contain cursor-zoom-out"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {/* Override Warning Modal */}
      {showOverrideWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-red-500/50 rounded-xl w-full max-w-md p-6 shadow-2xl shadow-red-500/20">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-xl font-bold">Confirm Force Override</h3>
            </div>
            <p className="text-zinc-300 mb-6 leading-relaxed">
              {warningMessage}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowOverrideWarning(false)}
                className="px-4 py-2 rounded font-medium text-zinc-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmOverride}
                className="px-4 py-2 rounded font-bold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2"
              >
                <ShieldOff className="w-4 h-4" />
                I Understand, Force Override
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Action Completed Overlay */}
      {resetCountdown !== null && !showDontOverrideConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-green-500/50 rounded-xl w-full max-w-md p-8 shadow-2xl shadow-green-500/20 text-center flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-white mb-2">Action Completed</h3>
            <p className="text-zinc-300 mb-6">The vehicle has been instructed to proceed.</p>
            <div className="text-xl font-mono text-green-400 animate-pulse bg-green-500/10 px-6 py-3 rounded-full border border-green-500/20">
              Resetting in {resetCountdown}s...
            </div>
          </div>
        </div>
      )}
      {/* Don't Override Confirmation Overlay */}
      {showDontOverrideConfirm && resetCountdown !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-green-500/50 rounded-xl w-full max-w-md p-8 shadow-2xl shadow-green-500/20 text-center flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-white mb-2">Thank You for Your Feedback</h3>
            <p className="text-zinc-300 mb-6">The vehicle will remain stopped. Your decision has been recorded.</p>
            <div className="text-xl font-mono text-green-400 animate-pulse bg-green-500/10 px-6 py-3 rounded-full border border-green-500/20">
              Resetting in {resetCountdown}s...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
