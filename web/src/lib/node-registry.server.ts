// Server-only — never imported by client components
import "server-only";

export interface NodeConfig {
  node_id: string;
  display_name: string;
  internal_url: string;
  bioregion_codes: string[];
  centroid: [number, number]; // [lat, lng]
  is_coordinator?: boolean;
  capabilities: {
    supports_stats: boolean;
    supports_search: boolean;
    supports_entities: boolean;
    supports_federation: boolean;
  };
}

export const NODE_REGISTRY: NodeConfig[] = [
  {
    node_id: "octo-salish-sea",
    display_name: "Salish Sea (Octo)",
    internal_url: "http://127.0.0.1:8351",
    bioregion_codes: ["salish-sea"],
    centroid: [48.5, -123.5],
    is_coordinator: true,
    capabilities: {
      supports_stats: true,
      supports_search: true,
      supports_entities: true,
      supports_federation: true,
    },
  },
  {
    node_id: "greater-victoria",
    display_name: "Greater Victoria",
    internal_url: "http://37.27.48.12:8351",
    bioregion_codes: ["salish-sea"],
    centroid: [48.43, -123.37],
    capabilities: {
      supports_stats: true,
      supports_search: true,
      supports_entities: true,
      supports_federation: true,
    },
  },
  {
    node_id: "front-range",
    display_name: "Front Range",
    internal_url: "http://127.0.0.1:8355",
    bioregion_codes: ["front-range"],
    centroid: [39.75, -105.0],
    capabilities: {
      supports_stats: true,
      supports_search: true,
      supports_entities: true,
      supports_federation: true,
    },
  },
  {
    node_id: "cowichan-valley",
    display_name: "Cowichan Valley",
    internal_url: "http://202.61.242.194:8351",
    bioregion_codes: ["salish-sea"],
    centroid: [48.78, -123.72],
    capabilities: {
      supports_stats: true,
      supports_search: true,
      supports_entities: true,
      supports_federation: true,
    },
  },
];

export interface PublicNodeInfo {
  node_id: string;
  display_name: string;
  bioregion_codes: string[];
  centroid: [number, number];
  is_coordinator?: boolean;
  capabilities: NodeConfig["capabilities"];
}

export function getNode(nodeId: string): NodeConfig | undefined {
  return NODE_REGISTRY.find((n) => n.node_id === nodeId);
}

export function getPublicNodes(): PublicNodeInfo[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return NODE_REGISTRY.map(({ internal_url, ...pub }) => pub);
}

/**
 * Get the commons service token for a specific node (for /koi-net/commons/* admin calls).
 * Reads from env vars: KOI_OCTO_COMMONS_TOKEN, KOI_GV_COMMONS_TOKEN, etc.
 * Returns undefined if no token configured (BFF will rely on localhost access).
 */
const NODE_TOKEN_ENV_MAP: Record<string, string> = {
  "octo-salish-sea": "KOI_OCTO_COMMONS_TOKEN",
  "greater-victoria": "KOI_GV_COMMONS_TOKEN",
  "front-range": "KOI_FR_COMMONS_TOKEN",
  "cowichan-valley": "KOI_CV_COMMONS_TOKEN",
};

export function getCommonsToken(nodeId: string): string | undefined {
  const envKey = NODE_TOKEN_ENV_MAP[nodeId];
  return envKey ? process.env[envKey] : undefined;
}
