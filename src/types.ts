import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'operator';
  createdAt: Timestamp;
}

export interface IncidentReport {
  id: string;
  timestamp: Timestamp;
  operatorId: string;
  status: 'pending' | 'reviewed' | 'resolved';
  telemetry?: string;
  avgSpeed?: number;
  distance?: number;
  lat?: number;
  lng?: number;
  audioUrl?: string;
  analysis: VLAAnalysis;
  feedback?: 'good' | 'bad';
  operator_feedback_notes?: string;
  operator_action?: string;
  overridden?: boolean;
  override_warning_shown?: string;
  imageUrl?: string;
}

export interface VLAAnalysis {
  input_audit?: {
    visual_input: string;
    audio_input: string;
    telemetry_inputs: string;
    history_context: string;
  };
  perception_engine: {
    media_analyzed: string;
    scene_context: string;
    critical_object_identified: string;
    spatial_location: string;
    kinetic_state: string;
  };
  reasoning_and_commentary: {
    audio_map_fusion: string;
    location_anomaly_check: string;
    operator_commentary: string;
  };
  action_policy: {
    danger_score: number;
    recommended_action: string;
    diagnostic_report_for_database: string;
  };
  ui_triggers: {
    dashboard_color: string;
    tts_audio_alert: string;
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}
