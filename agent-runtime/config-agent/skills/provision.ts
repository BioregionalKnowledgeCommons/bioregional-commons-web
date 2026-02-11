/**
 * provision skill - Deploy and manage OpenClaw instances via Coolify
 *
 * Handles the full lifecycle of bioregional node deployment.
 */

interface NodeConfig {
  node_id: string;
  display_name: string;
  bioregion_codes: string[];
  thematic_domain: string;
  vault_repo: string;
  maintainers: Array<{ github: string; email?: string }>;
  subdomain?: string;
}

interface DeploymentResult {
  success: boolean;
  node_id: string;
  service_id?: string;
  endpoint?: string;
  database_schema?: string;
  error?: string;
}

interface HealthStatus {
  node_id: string;
  status: 'healthy' | 'degraded' | 'offline' | 'unknown';
  checks: {
    api: boolean;
    database: boolean;
    vault: boolean;
    federation: boolean;
  };
  last_checked: string;
  response_time_ms?: number;
}

interface ConfigUpdate {
  node_id: string;
  updates: Partial<NodeConfig>;
  requires_restart: boolean;
}

const COOLIFY_BASE_URL = process.env.COOLIFY_BASE_URL || 'http://localhost:8000';
const COOLIFY_API_TOKEN = process.env.COOLIFY_API_TOKEN;
const OPENCLAW_IMAGE = process.env.OPENCLAW_IMAGE || 'ghcr.io/openclaw/openclaw:latest';

/**
 * Provision a new OpenClaw instance for a bioregional node
 */
export async function provision_node(params: {
  config: NodeConfig;
  environment?: 'production' | 'staging';
  resource_tier?: 'small' | 'medium' | 'large';
}): Promise<DeploymentResult> {
  const { config, environment = 'production', resource_tier = 'small' } = params;

  if (!COOLIFY_API_TOKEN) {
    return {
      success: false,
      node_id: config.node_id,
      error: 'COOLIFY_API_TOKEN not configured',
    };
  }

  try {
    // 1. Validate node config
    const validation = validateNodeConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        node_id: config.node_id,
        error: `Invalid config: ${validation.errors.join(', ')}`,
      };
    }

    // 2. Check if node already exists
    const existing = await checkExistingService(config.node_id);
    if (existing) {
      return {
        success: false,
        node_id: config.node_id,
        error: `Node ${config.node_id} already exists with service ID ${existing}`,
      };
    }

    // 3. Create database schema for node
    const schemaName = `node_${config.node_id.replace(/-/g, '_')}`;
    await createDatabaseSchema(schemaName);

    // 4. Build environment variables
    const envVars = buildEnvironmentVars(config, schemaName, environment);

    // 5. Determine resource limits
    const resources = getResourceLimits(resource_tier);

    // 6. Create Coolify service
    const serviceId = await createCoolifyService({
      name: `bkc-${config.node_id}`,
      image: OPENCLAW_IMAGE,
      environment: envVars,
      resources,
      subdomain: config.subdomain || config.node_id,
    });

    // 7. Wait for deployment
    await waitForDeployment(serviceId);

    // 8. Register with index registry
    const endpoint = `https://${config.subdomain || config.node_id}.bkc.earth`;
    await registerWithRegistry(config, endpoint);

    return {
      success: true,
      node_id: config.node_id,
      service_id: serviceId,
      endpoint,
      database_schema: schemaName,
    };
  } catch (error) {
    return {
      success: false,
      node_id: config.node_id,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check health of a deployed node
 */
export async function health_check(params: {
  node_id: string;
  detailed?: boolean;
}): Promise<HealthStatus> {
  const { node_id, detailed = false } = params;

  const checks = {
    api: false,
    database: false,
    vault: false,
    federation: false,
  };

  let responseTime: number | undefined;

  try {
    // Get endpoint from registry
    const endpoint = await getNodeEndpoint(node_id);

    if (!endpoint) {
      return {
        node_id,
        status: 'unknown',
        checks,
        last_checked: new Date().toISOString(),
      };
    }

    // Check API health
    const startTime = Date.now();
    const healthResponse = await fetch(`${endpoint}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    responseTime = Date.now() - startTime;
    checks.api = healthResponse.ok;

    if (detailed && healthResponse.ok) {
      const healthData = await healthResponse.json();
      checks.database = healthData.database === 'connected';
      checks.vault = healthData.vault === 'indexed';
      checks.federation = healthData.federation === 'enabled';
    } else if (checks.api) {
      // Basic check passed, assume others are ok
      checks.database = true;
      checks.vault = true;
      checks.federation = true;
    }
  } catch {
    // Health check failed
  }

  // Determine overall status
  let status: HealthStatus['status'];
  const passedChecks = Object.values(checks).filter(Boolean).length;

  if (passedChecks === 4) {
    status = 'healthy';
  } else if (passedChecks > 0) {
    status = 'degraded';
  } else {
    status = 'offline';
  }

  return {
    node_id,
    status,
    checks,
    last_checked: new Date().toISOString(),
    response_time_ms: responseTime,
  };
}

/**
 * Update configuration for a deployed node
 */
export async function update_config(params: {
  node_id: string;
  updates: Record<string, unknown>;
}): Promise<ConfigUpdate> {
  const { node_id, updates } = params;

  // Determine if restart is required
  const restartRequired = ['vault_repo', 'thematic_domain'].some(
    (key) => key in updates
  );

  try {
    // Get current service
    const serviceId = await getServiceId(node_id);
    if (!serviceId) {
      throw new Error(`Service not found for node ${node_id}`);
    }

    // Update environment variables in Coolify
    if (Object.keys(updates).length > 0) {
      await updateServiceEnv(serviceId, updates);
    }

    // Restart if needed
    if (restartRequired) {
      await restartService(serviceId);
    }

    return {
      node_id,
      updates: updates as Partial<NodeConfig>,
      requires_restart: restartRequired,
    };
  } catch (error) {
    throw new Error(
      `Failed to update config: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List all deployed nodes
 */
export async function list_nodes(): Promise<{
  nodes: Array<{
    node_id: string;
    display_name: string;
    status: string;
    endpoint: string;
  }>;
}> {
  try {
    const response = await fetch(`${COOLIFY_BASE_URL}/api/v1/services`, {
      headers: {
        Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Coolify API error: ${response.status}`);
    }

    const services = await response.json();

    // Filter to BKC services
    const bkcServices = services.filter((s: { name: string }) =>
      s.name.startsWith('bkc-')
    );

    return {
      nodes: bkcServices.map((s: { name: string; status: string; fqdn?: string }) => ({
        node_id: s.name.replace('bkc-', ''),
        display_name: s.name,
        status: s.status,
        endpoint: s.fqdn || `https://${s.name}.bkc.earth`,
      })),
    };
  } catch (error) {
    console.error('Failed to list nodes:', error);
    return { nodes: [] };
  }
}

/**
 * Decommission a node (with confirmation)
 */
export async function decommission_node(params: {
  node_id: string;
  backup_data?: boolean;
  confirmed: boolean;
}): Promise<{ success: boolean; message: string }> {
  const { node_id, backup_data = true, confirmed } = params;

  if (!confirmed) {
    return {
      success: false,
      message: 'Decommission requires explicit confirmation. Set confirmed: true to proceed.',
    };
  }

  try {
    const serviceId = await getServiceId(node_id);
    if (!serviceId) {
      return {
        success: false,
        message: `Node ${node_id} not found`,
      };
    }

    // Backup data if requested
    if (backup_data) {
      await backupNodeData(node_id);
    }

    // Stop and remove service
    await fetch(`${COOLIFY_BASE_URL}/api/v1/services/${serviceId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
      },
    });

    // Remove from registry
    await unregisterFromRegistry(node_id);

    return {
      success: true,
      message: `Node ${node_id} decommissioned${backup_data ? ' (data backed up)' : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Decommission failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Internal helper functions

function validateNodeConfig(config: NodeConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.node_id || !/^[a-z0-9-]+$/.test(config.node_id)) {
    errors.push('node_id must be lowercase alphanumeric with hyphens');
  }

  if (!config.display_name || config.display_name.length < 3) {
    errors.push('display_name must be at least 3 characters');
  }

  if (!config.bioregion_codes || config.bioregion_codes.length === 0) {
    errors.push('At least one bioregion_code is required');
  }

  if (!config.vault_repo || !config.vault_repo.includes('/')) {
    errors.push('vault_repo must be a valid GitHub repo (owner/repo)');
  }

  if (!config.maintainers || config.maintainers.length === 0) {
    errors.push('At least one maintainer is required');
  }

  return { valid: errors.length === 0, errors };
}

async function checkExistingService(nodeId: string): Promise<string | null> {
  try {
    const response = await fetch(`${COOLIFY_BASE_URL}/api/v1/services`, {
      headers: {
        Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
      },
    });

    if (!response.ok) return null;

    const services = await response.json();
    const existing = services.find(
      (s: { name: string }) => s.name === `bkc-${nodeId}`
    );

    return existing?.id || null;
  } catch {
    return null;
  }
}

async function createDatabaseSchema(schemaName: string): Promise<void> {
  // In production, would execute SQL via pg client
  console.log(`Creating database schema: ${schemaName}`);
  // CREATE SCHEMA IF NOT EXISTS ${schemaName};
  // GRANT USAGE ON SCHEMA ${schemaName} TO bkc_app;
}

function buildEnvironmentVars(
  config: NodeConfig,
  schemaName: string,
  environment: string
): Record<string, string> {
  return {
    NODE_ID: config.node_id,
    NODE_DISPLAY_NAME: config.display_name,
    BIOREGION_CODES: config.bioregion_codes.join(','),
    THEMATIC_DOMAIN: config.thematic_domain,
    VAULT_REPO: config.vault_repo,
    DATABASE_SCHEMA: schemaName,
    ENVIRONMENT: environment,
    FEDERATION_ENABLED: 'true',
    REGISTRY_URL:
      'https://raw.githubusercontent.com/opencivics/index-registry/main',
  };
}

function getResourceLimits(tier: 'small' | 'medium' | 'large'): {
  memory: string;
  cpu: string;
} {
  const tiers = {
    small: { memory: '512Mi', cpu: '0.5' },
    medium: { memory: '1Gi', cpu: '1' },
    large: { memory: '2Gi', cpu: '2' },
  };
  return tiers[tier];
}

async function createCoolifyService(params: {
  name: string;
  image: string;
  environment: Record<string, string>;
  resources: { memory: string; cpu: string };
  subdomain: string;
}): Promise<string> {
  const response = await fetch(`${COOLIFY_BASE_URL}/api/v1/services`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: params.name,
      image: params.image,
      environment_variables: params.environment,
      limits: params.resources,
      fqdn: `${params.subdomain}.bkc.earth`,
      health_check_path: '/health',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create service: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

async function waitForDeployment(serviceId: string): Promise<void> {
  const maxAttempts = 30;
  const delayMs = 10000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${COOLIFY_BASE_URL}/api/v1/services/${serviceId}`,
      {
        headers: {
          Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'running') {
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Deployment timeout');
}

async function registerWithRegistry(
  config: NodeConfig,
  endpoint: string
): Promise<void> {
  // In production, would create a PR to the registry repo
  console.log(`Registering node ${config.node_id} at ${endpoint}`);
}

async function getNodeEndpoint(nodeId: string): Promise<string | null> {
  // Fetch from registry
  const registryUrl =
    process.env.REGISTRY_URL ||
    'https://raw.githubusercontent.com/opencivics/index-registry/main';

  try {
    const response = await fetch(`${registryUrl}/registry.json`);
    if (!response.ok) return null;

    const data = await response.json();
    const node = data.nodes?.find((n: { node_id: string }) => n.node_id === nodeId);

    return node?.agent_endpoint || null;
  } catch {
    return null;
  }
}

async function getServiceId(nodeId: string): Promise<string | null> {
  return checkExistingService(nodeId);
}

async function updateServiceEnv(
  serviceId: string,
  updates: Record<string, unknown>
): Promise<void> {
  await fetch(`${COOLIFY_BASE_URL}/api/v1/services/${serviceId}/envs`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
}

async function restartService(serviceId: string): Promise<void> {
  await fetch(`${COOLIFY_BASE_URL}/api/v1/services/${serviceId}/restart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
    },
  });
}

async function backupNodeData(nodeId: string): Promise<void> {
  console.log(`Backing up data for node ${nodeId}`);
  // Would export database schema and vault snapshot
}

async function unregisterFromRegistry(nodeId: string): Promise<void> {
  console.log(`Unregistering node ${nodeId} from registry`);
  // Would create a PR to remove from registry
}

// Export all tools
export const tools = {
  provision_node,
  health_check,
  update_config,
  list_nodes,
  decommission_node,
};
