export type ConnectionStatus = 'online' | 'offline';

export type ParticipantRole = 'master' | 'player';

export type SeatFacing = 'up' | 'right' | 'down' | 'left';
export type SeatAnchorSide = 'top' | 'right' | 'bottom' | 'left';
export type BadgeSide = 'top' | 'right' | 'bottom' | 'left';

export type TabletViewMode = 'self' | 'readonly-other' | 'master';

export type OpenTabletState = {
  targetUserId: string;
  mode: TabletViewMode;
  targetRole: "player" | "master";
} | null;

export type GameParticipant = {
  id: string;
  userId: string;
  role: 'master' | 'player';
  displayName: string;
  avatarUrl?: string | null;
  joinedAt: string;
  connectionStatus: 'online' | 'offline';
  lastSeenAt?: string | null;
};

export type AnchoredSeatPosition = {
  side: SeatAnchorSide;
  along: number;
  gap: number;
  seatFacing: SeatFacing;
};

export type AnchoredSeatDefinition = AnchoredSeatPosition & {
  id: string;
};

export type ResolvedSeatPosition = {
  x: number;
  y: number;
  seatFacing: SeatFacing;
};

export type ResolvedSeatDefinition = ResolvedSeatPosition & {
  id: string;
};

export type DensityPresetKey = 'comfortable' | 'compact' | 'dense';

export type DensityPreset = {
  avatarSize: number;
  diceWidth: number;
  diceHeight: number;
  tabletWidth: number;
  tabletHeight: number;
  badgeFontSize: number;

  diceForwardOffset: number;
  diceSideOffset: number;
  tabletForwardOffset: number;
  tabletSideOffset: number;
  badgeDistance: number;

  tableImageMaxWidth: number;
  tableImageMaxHeight: number;
};

export type SeatedPlayer = {
  participant: GameParticipant;
  seat: ResolvedSeatDefinition;
};

export type TableDefinition = {
  width: number;
  height: number;
};

export type SceneLayout = {
  table: TableDefinition;
  master: AnchoredSeatPosition;
  density: DensityPresetKey;
  scaleMultiplier?: number;
  playerSeats: AnchoredSeatDefinition[];
};

export type SeatVisualConfig = {
  diceX: number;
  diceY: number;
  diceRotation: number;

  tabletX: number;
  tabletY: number;
  tabletRotation: number;

  badgeSide: BadgeSide;
};

export type SceneBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

export type HoverCardData = {
  participant: GameParticipant;
  seat: ResolvedSeatPosition;
  avatarSize: number;
  badgeSide: BadgeSide;
};
