import { join } from "node:path";

export function bridgeDir(projectRoot: string): string {
  return join(projectRoot, ".agent-bridge");
}

export function handoffPath(projectRoot: string): string {
  return join(bridgeDir(projectRoot), "HANDOFF.md");
}

export function statusPath(projectRoot: string): string {
  return join(bridgeDir(projectRoot), "status.json");
}

export function tokenPath(projectRoot: string): string {
  return join(bridgeDir(projectRoot), ".bridge-token");
}

export function historyDir(projectRoot: string): string {
  return join(bridgeDir(projectRoot), "history");
}
