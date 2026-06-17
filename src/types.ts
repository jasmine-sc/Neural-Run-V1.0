export type GameStatus = "IDLE" | "RUNNING" | "PAUSED" | "GAME_OVER";

export type PlayerState = "RUNNING" | "JUMPING" | "CROUCHING" | "HIT";

export type ObstacleType = "CACTUS_SMALL" | "CACTUS_LARGE" | "CACTUS_DOUBLE" | "BIRD";

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  passed: boolean;
  frame: number;
}

export interface Coin {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  pulseFrame: number;
}

export interface Cloud {
  id: string;
  x: number;
  y: number;
  speed: number;
  width: number;
  height: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface ScoreState {
  score: number;
  highScore: number;
  coins: number;
  runs: number;
}

export interface TMMapping {
  /**
   * Action mapped to a Teachable Machine Class name.
   */
  jumpClass: string;
  crouchClass: string;
  idleClass: string;
  confidenceThreshold: number;
}

export interface TMPrediction {
  className: string;
  probability: number;
}
