import { LONDON_BOROUGHS } from "./boroughs";

/** Borough centroids derived from Foundations geocoded application means. */
export const BOROUGH_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "Barking and Dagenham": { lat: 51.54984, lng: 0.1297 },
  Barnet: { lat: 51.6102, lng: -0.20436 },
  Bexley: { lat: 51.45769, lng: 0.13025 },
  Brent: { lat: 51.55791, lng: -0.26267 },
  Bromley: { lat: 51.38918, lng: 0.03712 },
  Camden: { lat: 51.54491, lng: -0.15695 },
  City: { lat: 51.51553, lng: -0.09043 },
  Croydon: { lat: 51.36596, lng: -0.09624 },
  Ealing: { lat: 51.51824, lng: -0.32321 },
  Enfield: { lat: 51.64138, lng: -0.08586 },
  Greenwich: { lat: 51.46951, lng: 0.05528 },
  Hackney: { lat: 51.55512, lng: -0.0676 },
  "Hammersmith and Fulham": { lat: 51.4889, lng: -0.21673 },
  Haringey: { lat: 51.58865, lng: -0.10958 },
  Harrow: { lat: 51.59266, lng: -0.34158 },
  Havering: { lat: 51.57045, lng: 0.20844 },
  Hillingdon: { lat: 51.54407, lng: -0.43271 },
  Hounslow: { lat: 51.47194, lng: -0.35126 },
  Islington: { lat: 51.5496, lng: -0.10996 },
  Kensington: { lat: 51.49927, lng: -0.19094 },
  Kingston: { lat: 51.39725, lng: -0.2831 },
  Lambeth: { lat: 51.45214, lng: -0.12023 },
  Lewisham: { lat: 51.44609, lng: -0.01909 },
  "London Legacy": { lat: 51.53947, lng: -0.01314 },
  Merton: { lat: 51.41065, lng: -0.19617 },
  Newham: { lat: 51.53581, lng: 0.03521 },
  "Old Oak Park Royal": { lat: 51.52681, lng: -0.25718 },
  Redbridge: { lat: 51.58069, lng: 0.06761 },
  Richmond: { lat: 51.44907, lng: -0.3175 },
  Southwark: { lat: 51.47661, lng: -0.0745 },
  Sutton: { lat: 51.36521, lng: -0.18664 },
  "Tower Hamlets": { lat: 51.51674, lng: -0.04314 },
  "Waltham Forest": { lat: 51.59052, lng: -0.01056 },
  Wandsworth: { lat: 51.45005, lng: -0.17856 },
  Westminster: { lat: 51.51626, lng: -0.16398 },
};

/** Map filter dropdown — canonical boroughs only (excludes legacy GeoJSON gaps). */
export const BOROUGH_NAMES = [...LONDON_BOROUGHS].sort();
