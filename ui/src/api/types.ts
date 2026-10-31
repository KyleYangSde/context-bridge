/** Shapes returned by packages/local-api and packages/relay (do not redefine core). */
import type { HandoffFrontmatter, HandoffState } from '../data/types'

export type ApiMode = 'mock' | 'live'

export interface HandoffStatusDto {
  state: HandoffState
  current_as_of: string | null
  reject_reason: string | null
  consumers: Array<{ id: string; at: string; event: string }>
  updated_at: string
}

export interface HandoffResponse {
  frontmatter: HandoffFrontmatter
  body: string
  path?: string
  status: HandoffStatusDto
}

export interface HealthResponse {
  ok: boolean
  version?: string
  project_root?: string
  service?: string
}
