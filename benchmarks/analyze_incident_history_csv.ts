import * as fs from 'fs';
import {
  INCIDENT_HISTORY_AUDIT_PATH,
  INCIDENT_HISTORY_CSV_PATH,
  REPORT_SUPPORT_DIR,
} from './report_paths.ts';

type CsvIncidentRow = {
  ID: string;
  Timestamp: string;
  'Object Identified': string;
  'Danger Score': string;
  'Recommended Action': string;
  'Operator Action': string;
  Feedback: string;
  'Operator Notes': string;
  Telemetry: string;
};

type ParsedTelemetry = {
  speedKmH: number | null;
  distanceM: number | null;
  lat: number | null;
  lng: number | null;
};

type NormalizedIncident = {
  id: string;
  alias: string;
  timestamp: string;
  objectIdentified: string;
  dangerScore: number | null;
  recommendedAction: string;
  operatorAction: string;
  feedback: string;
  operatorNotes: string;
  telemetry: string;
  parsedTelemetry: ParsedTelemetry;
  anomalies: string[];
};

const TELEMETRY_ISSUES = new Set(['missing_numeric_telemetry_fields', 'suspicious_coordinate_pair']);

const EXPECTED_HEADERS = [
  'ID',
  'Timestamp',
  'Object Identified',
  'Danger Score',
  'Recommended Action',
  'Operator Action',
  'Feedback',
  'Operator Notes',
  'Telemetry',
];

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parseTelemetry(telemetry: string): ParsedTelemetry {
  const match = telemetry.match(
    /Average Speed Before Stop:\s*([\d.]*)km\/h\.\s*Distance to object:\s*([\d.]*)m\.\s*Location:\s*Lat\s*([\d.-]*),\s*Lng\s*([\d.-]*)\./
  );

  if (!match) {
    return { speedKmH: null, distanceM: null, lat: null, lng: null };
  }

  const parseField = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    speedKmH: parseField(match[1]),
    distanceM: parseField(match[2]),
    lat: parseField(match[3]),
    lng: parseField(match[4]),
  };
}

function detectAnomalies(row: CsvIncidentRow, telemetry: ParsedTelemetry): string[] {
  const anomalies: string[] = [];

  if (!row['Danger Score'].trim()) {
    anomalies.push('missing_danger_score');
  }

  if (telemetry.speedKmH === null || telemetry.distanceM === null || telemetry.lat === null || telemetry.lng === null) {
    anomalies.push('missing_numeric_telemetry_fields');
  }

  if (
    telemetry.lat !== null &&
    telemetry.lng !== null &&
    Math.abs(telemetry.lat) < 20 &&
    Math.abs(telemetry.lng) < 20
  ) {
    anomalies.push('suspicious_coordinate_pair');
  }

  if (row['Operator Action'] === 'N/A') {
    anomalies.push('missing_operator_action');
  }

  if (row.Feedback === 'N/A') {
    anomalies.push('missing_feedback');
  }

  return anomalies;
}

function toAlias(index: number): string {
  return `INC-${String(index + 1).padStart(2, '0')}`;
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function summarizeNotes(notes: string): string {
  return notes
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

function main() {
  const content = fs.readFileSync(INCIDENT_HISTORY_CSV_PATH, 'utf8');
  const [headers, ...rows] = parseCsv(content);

  if (JSON.stringify(headers) !== JSON.stringify(EXPECTED_HEADERS)) {
    throw new Error(`Unexpected CSV headers in ${INCIDENT_HISTORY_CSV_PATH}`);
  }

  const incidents = rows.map((row, index) => {
    const record = Object.fromEntries(headers.map((header, headerIndex) => [header, row[headerIndex] || ''])) as CsvIncidentRow;
    const parsedTelemetry = parseTelemetry(record.Telemetry);
    const anomalies = detectAnomalies(record, parsedTelemetry);

    return {
      id: record.ID,
      alias: toAlias(index),
      timestamp: record.Timestamp,
      objectIdentified: record['Object Identified'],
      dangerScore: record['Danger Score'].trim() ? Number.parseInt(record['Danger Score'], 10) : null,
      recommendedAction: record['Recommended Action'],
      operatorAction: record['Operator Action'],
      feedback: record.Feedback,
      operatorNotes: record['Operator Notes'],
      telemetry: record.Telemetry,
      parsedTelemetry,
      anomalies,
    } satisfies NormalizedIncident;
  });

  const groupedByObject = incidents.reduce<Record<string, NormalizedIncident[]>>((groups, incident) => {
    groups[incident.objectIdentified] ||= [];
    groups[incident.objectIdentified].push(incident);
    return groups;
  }, {});

  const repeatedGroups = Object.entries(groupedByObject)
    .filter(([, group]) => group.length >= 2)
    .map(([objectIdentified, group]) => {
      const scores = group.map(item => item.dangerScore).filter((score): score is number => score !== null);
      const recommendations = uniqueNonEmpty(group.map(item => item.recommendedAction));
      const operatorActions = uniqueNonEmpty(group.map(item => item.operatorAction));

      return {
        objectIdentified,
        count: group.length,
        aliases: group.map(item => item.alias),
        ids: group.map(item => item.id),
        scores,
        uniqueScores: [...new Set(scores)].sort((a, b) => a - b),
        scoreRange: scores.length ? Math.max(...scores) - Math.min(...scores) : null,
        recommendationVariance: recommendations.length > 1,
        recommendations,
        operatorActionConsistency: operatorActions.length === 1,
        operatorActions,
        dataQualityIssues: group.flatMap(item => item.anomalies.map(issue => `${item.alias}:${issue}`)),
      };
    })
    .sort((a, b) => b.count - a.count || a.objectIdentified.localeCompare(b.objectIdentified));

  const repeatedGroupsWithVariance = repeatedGroups.filter(group => (group.scoreRange || 0) > 0);
  const anomalyRows = incidents
    .filter(incident => incident.anomalies.length > 0)
    .map(incident => ({
      alias: incident.alias,
      id: incident.id,
      anomalies: incident.anomalies,
      telemetry: incident.telemetry,
    }));
  const telemetryAnomalyRows = anomalyRows.filter(item => item.anomalies.some(issue => TELEMETRY_ISSUES.has(issue)));
  const completenessGapRows = anomalyRows.filter(item => item.anomalies.some(issue => !TELEMETRY_ISSUES.has(issue)));

  const pedestrianCluster = incidents
    .filter(incident => incident.objectIdentified === 'Two pedestrians/cyclists on the segregated right-hand path.')
    .map(incident => ({
      alias: incident.alias,
      shortId: incident.id.slice(0, 6),
      dangerScore: incident.dangerScore,
      recommendedAction: incident.recommendedAction,
      operatorAction: incident.operatorAction,
      feedback: incident.feedback,
      noteSummary: summarizeNotes(incident.operatorNotes),
      telemetry: {
        speedKmH: incident.parsedTelemetry.speedKmH,
        distanceM: incident.parsedTelemetry.distanceM,
        lat: incident.parsedTelemetry.lat,
        lng: incident.parsedTelemetry.lng,
      },
      directlyComparable: !incident.anomalies.includes('suspicious_coordinate_pair'),
      anomalies: incident.anomalies,
    }));

  const stableRepeatGroups = repeatedGroups
    .filter(group => group.scoreRange === 0)
    .map(group => ({
      objectIdentified: group.objectIdentified,
      count: group.count,
      stableScore: group.uniqueScores[0] ?? null,
      operatorActionConsistency: group.operatorActionConsistency,
    }));

  const paperReadySummary = {
    totalIncidents: incidents.length,
    repeatedObjectGroups: repeatedGroups.length,
    repeatedRows: repeatedGroups.reduce((sum, group) => sum + group.count, 0),
    groupsWithScoreVariance: repeatedGroupsWithVariance.length,
    telemetryAnomalyRows: telemetryAnomalyRows.length,
    rowsWithCompletenessGaps: completenessGapRows.length,
    repeatedGroupHighlights: repeatedGroups.map(group => ({
      objectIdentified: group.objectIdentified,
      count: group.count,
      scorePattern: group.scores.join(', '),
      recommendationVariance: group.recommendationVariance,
      operatorActionConsistency: group.operatorActionConsistency,
    })),
    pedestrianCluster,
    stableRepeatGroups,
  };

  const output = {
    meta: {
      sourceCsv: INCIDENT_HISTORY_CSV_PATH,
      generatedAt: new Date().toISOString(),
      totalIncidents: incidents.length,
    },
    summary: {
      totalIncidents: incidents.length,
      repeatedObjectGroups: repeatedGroups.length,
      repeatedRows: repeatedGroups.reduce((sum, group) => sum + group.count, 0),
      groupsWithScoreVariance: repeatedGroupsWithVariance.length,
      telemetryAnomalyRows: telemetryAnomalyRows.length,
      rowsWithCompletenessGaps: completenessGapRows.length,
    },
    repeatedGroups,
    repeatedGroupsWithVariance,
    stableRepeatGroups,
    anomalies: {
      telemetry: telemetryAnomalyRows,
      completeness: completenessGapRows,
      all: anomalyRows,
    },
    paperReadySummary,
  };

  fs.mkdirSync(REPORT_SUPPORT_DIR, { recursive: true });
  fs.writeFileSync(INCIDENT_HISTORY_AUDIT_PATH, JSON.stringify(output, null, 2));
  console.log(`Done! Wrote ${INCIDENT_HISTORY_AUDIT_PATH}`);
}

main();
