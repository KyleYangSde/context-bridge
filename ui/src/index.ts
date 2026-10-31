/** Public entry for soft-eng Capacitor/Electron fork */
export { StateBadge, StateLegend } from './components/StateBadge'
export { HandoffCard } from './components/HandoffCard'
export { SourcePicker } from './components/SourcePicker'
export { TrayPreview } from './pages/TrayPreview'
export { MobileList } from './pages/MobileList'
export { MobileDetail } from './pages/MobileDetail'
export { mockHandoffs, primaryMock } from './data/mockHandoffs'
export type {
  HandoffCardModel,
  HandoffFrontmatter,
  HandoffState,
  HandoffTool,
  HandoffSource,
  SecretsScan,
} from './data/types'
export { SOURCE_OPTIONS, STATE_LABELS } from './data/types'
