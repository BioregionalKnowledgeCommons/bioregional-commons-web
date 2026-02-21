// Core data types for the Bioregional Knowledge Commons Visualizer

// ============================================================
// Registry Types
// ============================================================

export interface NodeEntry {
  node_id: string;
  display_name: string;
  repo_url: string;
  quartz_url: string | null;
  bioregion_codes: string[];
  thematic_domain: ThematicDomain;
  topic_tags: string[];
  agent_endpoint: string | null;
  hosting: 'shared' | 'self-hosted' | null;
  federation_version: string | null;
  schema_version: string | null;
  bridges: string[];
  interaction_channels: InteractionChannels;
  created_at: string;
  maintainers: string[];
  /** User-drawn boundary polygon [[lng, lat], ...] */
  territory_boundary?: [number, number][];
  /** Full geographic classification resolved from territory centroid */
  geo_classification?: GeoClassification;
  /** GitHub username of the creator */
  github_username?: string;
  /** Description of the commons */
  description?: string;
}

/** Holonic geographic classification: Realm > Subrealm > Bioregion > Ecoregion */
export interface GeoClassification {
  realm: string;
  realm_code: string;
  subrealm: string;
  bioregion: string;
  bioregion_code: string;
  ecoregion?: string;
  ecoregion_id?: number;
  biome?: string;
}

/** An ecoregion is a sub-region within a bioregion */
export interface EcoregionInfo {
  eco_id: number;
  eco_name: string;
  biome: string;
  bioregion_code: string;
}

export type ThematicDomain =
  | 'watershed-governance'
  | 'food-systems'
  | 'cultural-heritage'
  | 'ecological-restoration'
  | 'community-governance'
  | 'traditional-knowledge'
  | 'climate-resilience'
  | 'other';

export interface InteractionChannels {
  web_chat?: boolean;
  telegram?: string;
  api?: string;
}

export interface RegistryData {
  nodes: NodeEntry[];
  meta: {
    count: number;
    last_updated: string;
  };
}

// ============================================================
// Bioregion Types
// ============================================================

export interface BioregionLookup {
  [code: string]: BioregionInfo;
}

export interface BioregionInfo {
  code: string;
  name: string;
  realm: Realm;
  subrealm: string;
  centroid: [number, number]; // [lng, lat]
  area_km2?: number;
}

export type Realm =
  | 'Nearctic'
  | 'Palearctic'
  | 'Neotropic'
  | 'Afrotropic'
  | 'Indomalayan'
  | 'Australasia'
  | 'Oceanian'
  | 'Antarctic';

export const REALM_PREFIXES: Record<string, Realm> = {
  NA: 'Nearctic',
  PA: 'Palearctic',
  NT: 'Neotropic',
  AT: 'Afrotropic',
  IM: 'Indomalayan',
  AU: 'Australasia',
  OC: 'Oceanian',
  AN: 'Antarctic',
};

export const REALM_COLORS: Record<Realm, string> = {
  Nearctic: '#4A90D9',
  Palearctic: '#7B68EE',
  Neotropic: '#2ECC71',
  Afrotropic: '#E67E22',
  Indomalayan: '#E74C3C',
  Australasia: '#F1C40F',
  Oceanian: '#1ABC9C',
  Antarctic: '#95A5A6',
};

export const DOMAIN_COLORS: Record<ThematicDomain, string> = {
  'watershed-governance': '#3498DB',
  'food-systems': '#27AE60',
  'cultural-heritage': '#8E44AD',
  'ecological-restoration': '#2ECC71',
  'community-governance': '#E67E22',
  'traditional-knowledge': '#C0392B',
  'climate-resilience': '#16A085',
  other: '#7F8C8D',
};

// ============================================================
// Flow Types
// ============================================================

export interface Flow {
  source_node_id: string;
  target_node_id: string;
  flow_type: 'fork' | 'contribution';
  volume: number;
  last_activity: string;
  direction: 'unidirectional' | 'bidirectional';
}

export interface FlowData {
  flows: Flow[];
  generated_at: string;
  cache_ttl: number;
}

// ============================================================
// Bridge Types
// ============================================================

export interface BridgeEntry {
  bridge_id: string;
  version: string;
  source_node_id: string;
  target_node_id: string;
  vocabulary_count: number;
  confidence_avg: number;
  last_updated: string;
  review_status: 'recent' | 'approaching' | 'stale';
}

// ============================================================
// Globe Interaction Types
// ============================================================

export interface CameraTarget {
  lat: number;
  lng: number;
  zoom: number;
  /** Timestamp to allow re-triggering the same location */
  timestamp: number;
}

export interface GlobeState {
  selectedNodeId: string | null;
  selectedBioregion: string | null;
  hoveredBioregion: string | null;
  userLocation: { lat: number; lng: number } | null;
  userBioregion: string | null;
  cameraTarget: CameraTarget | null;
  showFlowArcs: boolean;
  showBridges: boolean;
  showBioregions: boolean;
  showEcoregions: boolean;
  showPlaceNames: boolean;
  showSatelliteImagery: boolean;
  showWaterFeatures: boolean;
  showOnboarding: boolean;
  showIntakeForm: boolean;
  /** Boundary polygon being drawn during onboarding [[lng, lat], ...] */
  onboardingBoundary: [number, number][];
  /** Currently selected ecoregion (drilldown from bioregion panel) */
  selectedEcoregion: number | null;
  /** Whether the globe should accept clicks to add boundary points */
  isDrawingBoundary: boolean;
  viewMode: 'globe' | 'map' | 'list';
  searchQuery: string;
  filters: GlobeFilters;
  /** Native Lands Digital layer toggles */
  showNativeTerritories: boolean;
  showNativeLanguages: boolean;
  showNativeTreaties: boolean;
  /** Currently selected native land feature for detail panel */
  selectedNativeLand: SelectedNativeLand | null;
}

export interface GlobeFilters {
  realms: Realm[];
  domains: ThematicDomain[];
  activityDays: number | null;
  minBridges: number;
}

// ============================================================
// UI Types
// ============================================================

export interface SearchResult {
  node_id: string;
  node_name: string;
  relevance: number;
  snippet: string;
  bioregion_code: string;
}

export interface TooltipData {
  type: 'bioregion' | 'node' | 'flow' | 'bridge';
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

// ============================================================
// Native Lands Types (from Native Land Digital API)
// ============================================================

export type NativeLandType = 'territories' | 'languages' | 'treaties';

export interface NativeLandFeature {
  type: 'Feature';
  id: number;
  properties: {
    id: number;
    Name: string;
    Slug: string;
    color: string;
    description: string; // URL to native-land.ca page
  };
  geometry: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
}

export interface NativeLandGeoJSON {
  type: 'FeatureCollection';
  features: NativeLandFeature[];
}

/** Selected native land feature for detail panel */
export interface SelectedNativeLand {
  type: NativeLandType;
  feature: NativeLandFeature;
}

// ============================================================
// KOI Live Node Types (from BFF API)
// ============================================================

export interface KoiNodeCapabilities {
  supports_stats: boolean;
  supports_search: boolean;
  supports_entities: boolean;
  supports_federation: boolean;
}

export interface KoiLiveNode {
  node_id: string;
  display_name: string;
  bioregion_codes: string[];
  centroid: [number, number]; // [lat, lng]
  is_coordinator?: boolean;
  capabilities: KoiNodeCapabilities;
  status: "healthy" | "unreachable";
  health: KoiHealthResponse | null;
}

export interface KoiHealthResponse {
  status: string;
  mode?: string;
  database?: string;
  openai_available?: boolean;
  embedding_model?: string | null;
  semantic_matching?: boolean;
  entity_types?: string[];
  schema_version?: string;
  [key: string]: unknown;
}

export interface KoiNetHealthResponse {
  status: string;
  node: Record<string, unknown> | null;
  peers: KoiPeer[];
  event_queue_size: number;
  pipeline_enabled?: boolean;
  timestamp: string;
}

export interface KoiPeer {
  node_rid: string;
  node_name: string;
  last_seen: string | null;
}

export interface KoiFederationEdge {
  edge_rid: string;
  source_node: string;
  target_node: string;
  edge_type: string;
  status: string;
}

export interface KoiFederationResponse {
  peers: KoiPeer[];
  edges: KoiFederationEdge[];
  node: Record<string, unknown> | null;
  event_queue_size: number;
  timestamp: string;
}

export interface KoiStatsResponse {
  total_entities: number;
  by_type: Record<string, number>;
  total_relationships: number;
  total_documents: number;
  [key: string]: unknown;
}

export interface KoiEntity {
  uri: string;
  label: string;
  entity_type: string;
  description?: string;
  aliases?: string[];
  created_at?: string;
  updated_at?: string;
  koi_rid?: string;
  [key: string]: unknown;
}

export interface KoiRelationship {
  subject_uri: string;
  subject_label: string;
  predicate: string;
  object_uri: string;
  object_label: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface KoiSearchResult {
  uri: string;
  label: string;
  entity_type: string;
  score: number;
  description?: string;
  tier?: string;
  [key: string]: unknown;
}
