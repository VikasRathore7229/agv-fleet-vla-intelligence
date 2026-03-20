import * as fs from 'fs';
import { SCENARIOS, isBorderline, isClearlySafe, isClearlyUnsafe } from './benchmark_config.ts';

const total = SCENARIOS.length;
const clearlySafe = SCENARIOS.filter(s => isClearlySafe(s.goldRange)).length;
const borderline = SCENARIOS.filter(s => isBorderline(s.goldRange)).length;
const clearlyUnsafe = SCENARIOS.filter(s => isClearlyUnsafe(s.goldRange)).length;
const withHistory = SCENARIOS.filter(s => s.history.trim().length > 0).length;
const anomalyCases = SCENARIOS.filter(s => s.category === 'anomaly').length;
const repeatedScenarioPairs = 0;
const rawMediaCases = 0;

const output = {
  overview: {
    totalScenarios: total,
    clearlySafeCases: clearlySafe,
    borderlineCases: borderline,
    clearlyUnsafeCases: clearlyUnsafe,
    casesWithHistoryContext: withHistory,
    anomalyStressCases: anomalyCases,
    repeatedScenarioPairs,
    rawMediaCases,
    benchmarkSchemaBlocks: 2,
    dashboardSchemaBlocks: 4,
  },
  failureModeTestability: [
    {
      failureMode: 'False-safe advisory',
      testable: 'Limited',
      basis: `${clearlySafe} clearly safe case`,
    },
    {
      failureMode: 'False-danger advisory',
      testable: 'Limited',
      basis: `${clearlySafe} clearly safe case and ${borderline} borderline case`,
    },
    {
      failureMode: 'Unsupported anomaly claim',
      testable: anomalyCases > 0 ? 'Yes' : 'No',
      basis: `${anomalyCases} explicit anomaly case`,
    },
    {
      failureMode: 'History bias',
      testable: withHistory > 1 && repeatedScenarioPairs > 0 ? 'Yes' : 'No',
      basis: `${withHistory} history-enabled case and ${repeatedScenarioPairs} repeated pairs`,
    },
    {
      failureMode: 'Cross-modal conflict',
      testable: anomalyCases > 0 ? 'Limited' : 'No',
      basis: `${anomalyCases} text-only audio/location mismatch case`,
    },
  ],
};

fs.writeFileSync('docs/academic_paper/benchmark_audit.json', JSON.stringify(output, null, 2));
console.log('Done! Wrote docs/academic_paper/benchmark_audit.json');
