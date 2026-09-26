/** Canonical London borough names (Foundations / MCP). Excludes legacy-only areas. */
export const LONDON_BOROUGHS = [
  "Barking and Dagenham",
  "Barnet",
  "Bexley",
  "Brent",
  "Bromley",
  "Camden",
  "City",
  "Croydon",
  "Ealing",
  "Enfield",
  "Greenwich",
  "Hackney",
  "Hammersmith and Fulham",
  "Haringey",
  "Harrow",
  "Havering",
  "Hillingdon",
  "Hounslow",
  "Islington",
  "Kensington",
  "Kingston",
  "Lambeth",
  "Lewisham",
  "Merton",
  "Newham",
  "Redbridge",
  "Richmond",
  "Southwark",
  "Sutton",
  "Tower Hamlets",
  "Waltham Forest",
  "Wandsworth",
  "Westminster",
] as const;

export type LondonBorough = (typeof LONDON_BOROUGHS)[number];

/** Boroughs in Foundations but absent from the public GeoJSON layer. */
export const GEOJSON_EXCLUDED_BOROUGHS = [
  "London Legacy",
  "Old Oak Park Royal",
] as const;
