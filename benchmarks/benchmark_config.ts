export interface BenchmarkScenario {
  id: string;
  desc: string;
  category: 'benign' | 'soft' | 'solid' | 'anomaly';
  goldRange: [number, number];
  imageText: string;
  telemetry: string;
  audioText: string;
  history: string;
}

export const SCENARIOS: BenchmarkScenario[] = [
  {
    id: 'BENIGN-01',
    desc: 'Aluminum foil',
    category: 'benign',
    goldRange: [1, 2],
    imageText: 'Visual Input: A small piece of crumpled aluminum foil laying flat on a clean warehouse floor.',
    telemetry: 'Status: Stopped. Average Speed Before Stop: 3km/h. Distance to object: 2.1m. Location: Lat 50.0331, Lng 8.5701.',
    audioText: 'Silence, low hum of warehouse ventilation.',
    history: '',
  },
  {
    id: 'SOFT-01',
    desc: 'Plastic curtain',
    category: 'soft',
    goldRange: [2, 3],
    imageText: 'Visual Input: Clear PVC strip curtains hanging in a warehouse doorway, industrial.',
    telemetry: 'Status: Stopped. Average Speed Before Stop: 2km/h. Distance to object: 1.0m. Location: Lat 50.0330, Lng 8.5700.',
    audioText: 'Air conditioning hum.',
    history: 'Object: plastic curtain, Recommendation: DO_NOT_OVERRIDE, Operator: Overridden (Changed to GO), Feedback: good, Notes: soft, safe to push through at low speed.',
  },
  {
    id: 'SOLID-01',
    desc: 'Wooden crate',
    category: 'solid',
    goldRange: [4, 4],
    imageText: 'Visual Input: A large, heavy wooden crate dropped in the middle of the AGV path, blocking the way.',
    telemetry: 'Status: Stopped. Average Speed Before Stop: 5km/h. Distance to object: 3.0m. Location: Lat 50.0334, Lng 8.5707.',
    audioText: 'Loud thud recently heard.',
    history: '',
  },
  {
    id: 'ANOM-01',
    desc: 'Mismatch location',
    category: 'anomaly',
    goldRange: [4, 5],
    imageText: 'Visual Input: An indoor warehouse aisle with shelves of boxes, well-lit.',
    telemetry: 'Status: Stopped. Average Speed Before Stop: 12km/h. Distance to object: 2.0m. Location: Lat 37.7749, Lng -122.4194.',
    audioText: 'Outdoor traffic noises and sirens.',
    history: '',
  },
];

export function isClearlySafe(range: [number, number]): boolean {
  return range[1] <= 2;
}

export function isClearlyUnsafe(range: [number, number]): boolean {
  return range[0] >= 3;
}

export function isBorderline(range: [number, number]): boolean {
  return range[0] <= 2 && range[1] >= 3;
}
