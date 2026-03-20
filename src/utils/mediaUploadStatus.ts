import { IncidentReport, MediaUploadStatus } from '../types';

type MediaKind = 'image' | 'audio';
type MediaDisplayStatus = MediaUploadStatus | 'legacy_unavailable';

function hasLegacyAudioEvidence(report: IncidentReport): boolean {
  const audioAudit = report.analysis?.input_audit?.audio_input?.toLowerCase();
  if (!audioAudit) return false;

  return !/(^|\b)(no|none|not provided|not present|not available|missing|absent|without)(\b|$)/.test(audioAudit);
}

function resolveStatus(report: IncidentReport, kind: MediaKind): MediaDisplayStatus {
  if (kind === 'image') {
    if (report.imageUploadStatus) return report.imageUploadStatus;
    if (report.imageUrl) return 'uploaded';
    return 'legacy_unavailable';
  }

  if (report.audioUploadStatus) return report.audioUploadStatus;
  if (report.audioUrl) return 'uploaded';
  if (report.audioUploadError) return 'failed';
  if (hasLegacyAudioEvidence(report)) return 'legacy_unavailable';
  return 'not_provided';
}

export function getMediaUploadDisplay(report: IncidentReport, kind: MediaKind) {
  const status = resolveStatus(report, kind);
  const error = kind === 'image' ? report.imageUploadError : report.audioUploadError;

  switch (status) {
    case 'pending':
      return {
        status,
        badgeClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        label: kind === 'image' ? '🟡 Image Saving' : '🟡 Audio Saving',
        detail: 'Compressed media is still being saved in the background.',
      };
    case 'uploaded':
      return {
        status,
        badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        label: kind === 'image' ? '📷 Image Available' : '🔊 Audio Available',
        detail: '',
      };
    case 'failed':
      return {
        status,
        badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
        label: kind === 'image' ? '⚠ Image Upload Failed' : '⚠ Audio Upload Failed',
        detail: error || 'Upload failed before the media URL could be saved.',
      };
    case 'legacy_unavailable':
      return {
        status,
        badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        label: kind === 'image' ? '🗂 Image Unavailable' : '🗂 Audio Unavailable',
        detail:
          kind === 'image'
            ? 'This report was analyzed, but no stored visual asset is available for review.'
            : 'This report has no stored audio asset. It may have been omitted or not persisted.',
      };
    case 'not_provided':
    default:
      return {
        status,
        badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
        label: kind === 'image' ? '❌ No Visual Provided' : '🔇 No Audio Provided',
        detail: '',
      };
  }
}
