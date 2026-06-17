import React, { useEffect, useRef, useState } from "react";
import { 
  GameStatus, 
  PlayerState, 
  Obstacle, 
  Coin, 
  Cloud, 
  Particle, 
  ScoreState, 
  ObstacleType 
} from "../types.ts";
import { SPRITES, drawPixelArt, ColorScheme } from "./PixelArtwork.ts";
import { retroAudio } from "../services/retroAudio.ts";
import { Shield, Sparkles, Volume2, VolumeX, RefreshCw } from "lucide-react";

interface RetroGameProps {
  currentAction: "jump" | "crouch" | "idle";
  onStateUpdate: (score: number, coins: number, isGameOver: boolean) => void;
  gameStatus: GameStatus;
  setGameStatus: (status: GameStatus) => void;
}

// Retro Color Schemes
const LIGHT_THEME: ColorScheme = {
  character: "#1e293b", // Slate 800
  obstacle: "#b91c1c",  // Red 700 (Spikes/Cactus)
  coin: "#d97706",      // Amber 600
  cloud: "#cbd5e1",     // Slate 300
  ground: "#475569"     // Slate 600
};

const DARK_THEME: ColorScheme = {
  character: "#06b6d4", // Cyan 500 (Ghost/Neon)
  obstacle: "#ec4899",  // Pink 500 (Cyber/Neon)
  coin: "#eab308",      // Yellow 500
  cloud: "#334155",     // Slate 700
  ground: "#f43f5e"     // Rose 500
};

export const RetroGame: React.FC<RetroGameProps> = ({
  currentAction,
  onStateUpdate,
  gameStatus,
  setGameStatus,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sound control
  const [muted, setMuted] = useState(retroAudio.getMuteState());

  // Dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 320 });

  // Game Engine Values (stored in refs to avoid React re-render lag in high FPS loop)
  const stateRef = useRef<{
    status: GameStatus;
    player: {
      y: number;
      vy: number;
      width: number;
      height: number;
      state: PlayerState;
      spriteFrame: number;
      animationTimer: number;
    };
    obstacles: Obstacle[];
    coins: Coin[];
    clouds: Cloud[];
    particles: Particle[];
    groundScrollX: number;
    score: number;
    coinsCollected: number;
    distance: number;
    highScore: number;
    gameSpeed: number;
    dayNightProgress: number; // 0 to 1000 cycle
    isNight: boolean;
    lastScoreMilestone: number;
    crouchPressed: boolean;
  }>({
    status: "IDLE",
    player: {
      y: 0,
      vy: 0,
      width: 48,
      height: 48,
      state: "RUNNING",
      spriteFrame: 0,
      animationTimer: 0
    },
    obstacles: [],
    coins: [],
    clouds: [],
    particles: [],
    groundScrollX: 0,
    score: 0,
    coinsCollected: 0,
    distance: 0,
    highScore: parseInt(localStorage.getItem("retro_high_score") || "0", 10),
    gameSpeed: 6.5,
    dayNightProgress: 0,
    isNight: false,
    lastScoreMilestone: 0,
    crouchPressed: false
  });

  // Action stimulus processing to prevent rapid jump oscillations
  const previousActionRef = useRef<string>("idle");

  // Load High Score
  const [highScore, setHighScore] = useState(stateRef.current.highScore);
  const [liveCoins, setLiveCoins] = useState(0);
  const [liveScore, setLiveScore] = useState(0);

  // Initialize Game positions & entities
  const initGame = (resetAll = false) => {
    const currentHP = parseInt(localStorage.getItem("retro_high_score") || "0", 10);
    const canvas = canvasRef.current;
    const initialY = canvas ? canvas.height * 0.72 : 220;

    stateRef.current = {
      status: "RUNNING",
      player: {
        y: initialY,
        vy: 0,
        width: 48,
        height: 48,
        state: "RUNNING",
        spriteFrame: 0,
        animationTimer: 0
      },
      obstacles: [],
      coins: [],
      clouds: [
        { id: "1", x: 100, y: 40, speed: 0.3, width: 48, height: 24 },
        { id: "2", x: 450, y: 80, speed: 0.5, width: 48, height: 24 },
        { id: "3", x: 700, y: 50, speed: 0.4, width: 48, height: 24 }
      ],
      particles: [],
      groundScrollX: 0,
      score: 0,
      coinsCollected: 0,
      distance: 0,
      highScore: currentHP,
      gameSpeed: 7.0,
      dayNightProgress: 150, // start during daylight
      isNight: false,
      lastScoreMilestone: 0,
      crouchPressed: false
    };

    setHighScore(currentHP);
    setLiveCoins(0);
    setLiveScore(0);
    onStateUpdate(0, 0, false);
  };

  // Resize listener
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        // Keep standard 5:2 ratio or cap max/min height
        const width = Math.max(320, clientWidth);
        const height = 320;
        setDimensions({ width, height });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    handleResize();

    return () => resizeObserver.disconnect();
  }, []);

  // Sync external props with engine status
  useEffect(() => {
    stateRef.current.status = gameStatus;
    if (gameStatus === "RUNNING" && stateRef.current.score === 0 && stateRef.current.distance === 0) {
      initGame();
    }
  }, [gameStatus]);

  // Handle Action stimulus from keyboard fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = stateRef.current;
      
      // Prevent scrolling
      if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) {
        e.preventDefault();
      }

      if (state.status === "IDLE" || state.status === "GAME_OVER") {
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
          setGameStatus("RUNNING");
          initGame();
        }
        return;
      }

      if (state.status !== "RUNNING") return;

      if (e.code === "Space" || e.code === "ArrowUp") {
        triggerJump();
      } else if (e.code === "ArrowDown") {
        triggerCrouch(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") {
        triggerCrouch(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameStatus]);

  // Process incoming trigger actions from TM Prediction
  useEffect(() => {
    const state = stateRef.current;
    if (state.status !== "RUNNING") return;

    if (currentAction === "jump" && previousActionRef.current !== "jump") {
      triggerJump();
    }

    if (currentAction === "crouch") {
      triggerCrouch(true);
    } else if (previousActionRef.current === "crouch" && currentAction !== "crouch") {
      triggerCrouch(false);
    }

    previousActionRef.current = currentAction;
  }, [currentAction]);

  const triggerJump = () => {
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const groundY = canvas.height * 0.72;

    // Only jump if resting on the ground
    if (state.player.y >= groundY - 2) {
      state.player.y = groundY;
      state.player.vy = -14.0; // Jump height velocity
      state.player.state = "JUMPING";
      retroAudio.playJump();
      spawnJumpParticles(state.player.y);
    }
  };

  const triggerCrouch = (isCrouching: boolean) => {
    const state = stateRef.current;
    state.crouchPressed = isCrouching;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const groundY = canvas.height * 0.72;

    if (isCrouching) {
      if (state.player.state === "RUNNING") {
        state.player.state = "CROUCHING";
        retroAudio.playCrouch();
      } else if (state.player.state === "JUMPING") {
        // Fast gravity drop for diving mid-air!
        state.player.vy += 6.5;
        retroAudio.playCrouch();
      }
    } else {
      if (state.player.state === "CROUCHING") {
        state.player.state = "RUNNING";
      }
    }
  };

  // Particles generator
  const spawnJumpParticles = (y: number) => {
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    for (let i = 0; i < 8; i++) {
      state.particles.push({
        id: Math.random().toString(),
        x: 64 + Math.random() * 20,
        y: y + 24,
        vx: -1.5 - Math.random() * 2,
        vy: -0.2 - Math.random() * 1.5,
        color: state.isNight ? "rgba(6, 182, 212, 0.6)" : "rgba(100, 116, 139, 0.6)",
        size: 3 + Math.random() * 4,
        alpha: 1.0,
        life: 0,
        maxLife: 20 + Math.random() * 15
      });
    }
  };

  const spawnCoinParticles = (x: number, y: number) => {
    const state = stateRef.current;
    for (let i = 0; i < 12; i++) {
      state.particles.push({
        id: Math.random().toString(),
        x: x + 12,
        y: y + 12,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        color: "#f59e0b", // coin gold color
        size: 4 + Math.random() * 4,
        alpha: 1.0,
        life: 0,
        maxLife: 25 + Math.random() * 15
      });
    }
  };

  const spawnCollisionParticles = (x: number, y: number) => {
    const state = stateRef.current;
    for (let i = 0; i < 24; i++) {
      state.particles.push({
        id: Math.random().toString(),
        x: x + 16,
        y: y + 16,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 4,
        color: state.isNight ? "#f43f5e" : "#ef4444",
        size: 4 + Math.random() * 6,
        alpha: 1.0,
        life: 0,
        maxLife: 35 + Math.random() * 20
      });
    }
  };

  // Main high-performance Canvas Update and Draw Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;

    const gameLoop = (timestamp: number) => {
      const state = stateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // Time delta (unused for physics, frame lock is fine, but caps frame pacing)
      const elapsed = timestamp - lastTime;
      lastTime = timestamp;

      // Update calculations
      if (state.status === "RUNNING") {
        updatePhysics(canvas);
      }

      // Direct Canvas Drawing Render
      drawCanvas(ctx, canvas);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const updatePhysics = (canvas: HTMLCanvasElement) => {
      const state = stateRef.current;
      const groundY = canvas.height * 0.72;

      // 1. Progress Distance and Score
      state.distance += 0.15;
      
      // Calculate Score continuously
      const scoreGain = Math.floor(state.distance) + (state.coinsCollected * 100);
      state.score = scoreGain;

      // Handle Milestone Alert every 1000 points
      const scoreMilestone = Math.floor(state.score / 1000);
      if (scoreMilestone > state.lastScoreMilestone) {
        state.lastScoreMilestone = scoreMilestone;
        retroAudio.playMilestone();
        // Temporarily increase speed for fun
        state.gameSpeed = Math.min(15, state.gameSpeed + 0.6);
      }

      // Set High Score
      if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem("retro_high_score", state.highScore.toString());
      }

      // Update React live scores (throttled conceptually via state refs, but direct bind here is highly responsive)
      if (state.score % 5 === 0) {
        setLiveScore(state.score);
        setLiveCoins(state.coinsCollected);
        onStateUpdate(state.score, state.coinsCollected, false);
      }

      // 2. Day & Night Cycle update
      state.dayNightProgress = (state.dayNightProgress + 0.5) % 1500;
      const wasNight = state.isNight;
      state.isNight = state.dayNightProgress > 750; // Night is hours 750 to 1500

      if (wasNight !== state.isNight) {
        retroAudio.playDayNight();
      }

      // 3. Ground scroll offset
      state.groundScrollX = (state.groundScrollX - state.gameSpeed) % 40;

      // 4. Update Player physics
      // Gravity
      state.player.vy += 0.68; // constant gravity strength
      state.player.y += state.player.vy;

      // Block falling beyond ground
      if (state.player.y >= groundY) {
        state.player.y = groundY;
        state.player.vy = 0;
        
        // Recover to running state if previously jumping
        if (state.player.state === "JUMPING") {
          state.player.state = state.crouchPressed ? "CROUCHING" : "RUNNING";
        }
      }

      // Sprite frames animation ticking
      state.player.animationTimer += 1;
      if (state.player.animationTimer >= Math.max(2, 8 - Math.floor(state.gameSpeed / 2))) {
        state.player.spriteFrame = (state.player.spriteFrame + 1) % 2;
        state.player.animationTimer = 0;
      }

      // 5. Spawn Clouds
      if (state.clouds.length < 5 && Math.random() < 0.005) {
        state.clouds.push({
          id: Math.random().toString(),
          x: canvas.width + 50,
          y: 30 + Math.random() * 110,
          speed: 0.15 + Math.random() * 0.45,
          width: 32 + Math.random() * 24,
          height: 16
        });
      }

      // Move Clouds
      state.clouds.forEach(cloud => {
        cloud.x -= cloud.speed;
      });
      // Remove off-screen clouds
      state.clouds = state.clouds.filter(c => c.x > -100);

      // 6. Spawn Obstacles
      const maxObstacles = 3;
      const minDistanceBetweenObstacles = 280 + (state.gameSpeed * 10);
      
      let lastObstacleX = canvas.width;
      if (state.obstacles.length > 0) {
        lastObstacleX = Math.max(...state.obstacles.map(o => o.x));
      }

      if (state.obstacles.length < maxObstacles && lastObstacleX < canvas.width - minDistanceBetweenObstacles) {
        if (Math.random() < 0.015) {
          const types: ObstacleType[] = ["CACTUS_SMALL", "CACTUS_LARGE", "CACTUS_DOUBLE"];
          
          // Bird starts spawning only after score of 400
          if (state.score > 400) {
            types.push("BIRD");
          }

          const chosenType = types[Math.floor(Math.random() * types.length)];
          const sizeInfo = getObstacleSize(chosenType);

          // Bird height randomization (Needs crouch vs needs jump)
          let spawnY = groundY + 16 - sizeInfo.height;
          if (chosenType === "BIRD") {
            const levels = [
              groundY - 14, // low flying, can jump over
              groundY - 48, // mid flying, MUST crouch!
              groundY - 72  // high flying, can stand under
            ];
            spawnY = levels[Math.floor(Math.random() * levels.length)];
          }

          state.obstacles.push({
            id: Math.random().toString(),
            x: canvas.width + 100,
            y: spawnY,
            width: sizeInfo.width,
            height: sizeInfo.height,
            type: chosenType,
            passed: false,
            frame: 0
          });
        }
      }

      // Move & animate Obstacles
      state.obstacles.forEach(o => {
        o.x -= state.gameSpeed;
        o.frame++;
      });
      state.obstacles = state.obstacles.filter(o => o.x > -120);

      // 7. Spawn Coins
      const lastCoinX = state.coins.length > 0 ? Math.max(...state.coins.map(c => c.x)) : 0;
      if (state.coins.length < 3 && lastCoinX < canvas.width - 150 && Math.random() < 0.02) {
        // Generate coin group or single coin
        const coinY = groundY - 30 - Math.random() * 55;
        state.coins.push({
          id: Math.random().toString(),
          x: canvas.width + 50,
          y: coinY,
          width: 24,
          height: 24,
          collected: false,
          pulseFrame: Math.floor(Math.random() * 4)
        });
      }

      // Move coins
      state.coins.forEach(c => {
        c.x -= state.gameSpeed;
        c.pulseFrame = (c.pulseFrame + 0.1) % 4;
      });
      // Filter out off-screen or collected
      state.coins = state.coins.filter(c => c.x > -50 && !c.collected);

      // 8. Update Particles
      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = 1 - (p.life / p.maxLife);
      });
      state.particles = state.particles.filter(p => p.life < p.maxLife);

      // 9. CHECK COLLISIONS
      // Player bounding boxes (use smaller bounding boxes for fair gameplay!)
      const dinoPixelScale = 3;
      const isCrouching = state.player.state === "CROUCHING";
      const pW = isCrouching ? 18 * dinoPixelScale : 16 * dinoPixelScale;
      const pH = isCrouching ? 12 * dinoPixelScale : 16 * dinoPixelScale;
      const pX = 64; // static Dino rendering position X
      const pY = state.player.y;

      // Inset bounding box for the player (reduces frustration)
      const pBox = {
        left: pX + 8,
        right: pX + pW - 10,
        top: pY + 4,
        bottom: pY + pH - 2
      };

      // Coin collection collision check
      state.coins.forEach(coin => {
        if (coin.collected) return;
        const cBox = {
          left: coin.x,
          right: coin.x + coin.width,
          top: coin.y,
          bottom: coin.y + coin.height
        };

        if (
          pBox.right >= cBox.left &&
          pBox.left <= cBox.right &&
          pBox.bottom >= cBox.top &&
          pBox.top <= cBox.bottom
        ) {
          coin.collected = true;
          state.coinsCollected++;
          retroAudio.playCoin();
          spawnCoinParticles(coin.x, coin.y);
        }
      });

      // Obstacle collision check
      state.obstacles.forEach(o => {
        // Sub-hitbox depending on obstacle types for high fairness
        const insetX = o.type === "BIRD" ? 6 : 8;
        const insetY = o.type === "BIRD" ? 6 : 4;

        const oBox = {
          left: o.x + insetX,
          right: o.x + o.width - insetX,
          top: o.y + insetY,
          bottom: o.y + o.height - 2
        };

        // Standard overlaps check
        if (
          pBox.right >= oBox.left &&
          pBox.left <= oBox.right &&
          pBox.bottom >= oBox.top &&
          pBox.top <= oBox.bottom
        ) {
          // HIT! GAME OVER
          state.status = "GAME_OVER";
          setGameStatus("GAME_OVER");
          retroAudio.playHit();
          spawnCollisionParticles(pX, pY);
          onStateUpdate(state.score, state.coinsCollected, true);
        }
      });
    };

    const getObstacleSize = (type: ObstacleType) => {
      const scale = 3; // Pixel multiplier ratio
      switch (type) {
        case "CACTUS_SMALL":
          return { width: 8 * scale, height: 16 * scale };
        case "CACTUS_LARGE":
          return { width: 12 * scale, height: 24 * scale };
        case "CACTUS_DOUBLE":
          return { width: 20 * scale, height: 16 * scale }; // combined
        case "BIRD":
          return { width: 16 * scale, height: 12 * scale };
      }
    };

    const drawCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      const state = stateRef.current;
      const themeColors = state.isNight ? DARK_THEME : LIGHT_THEME;

      // Clear with background color dependent on day/night cycle
      ctx.fillStyle = state.isNight ? "#111111" : "#fafafa"; // Matte Charcoal vs Flat Matte Warm Off-white
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw aesthetic environment stars/sun depending on cycle
      drawBackgroundStarsAndSun(ctx, canvas, state.isNight, state.dayNightProgress);

      // Draw Parallax Clouds
      state.clouds.forEach(cloud => {
        drawPixelArt(
          ctx, 
          cloud.x, 
          cloud.y, 
          SPRITES.CLOUD, 
          1.5, // cloud pixel sizing
          themeColors, 
          "cloud"
        );
      });

      // Ground horizontal scroll lines
      ctx.strokeStyle = themeColors.ground;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.81);
      ctx.lineTo(canvas.width, canvas.height * 0.81);
      ctx.stroke();

      // Dotted speed lines for ground scrolling illusion
      ctx.fillStyle = themeColors.ground;
      const groundScrollY = canvas.height * 0.83;
      for (let i = 0; i < canvas.width + 80; i += 80) {
        ctx.fillRect(i + state.groundScrollX, groundScrollY, 15, 3);
        ctx.fillRect(i + state.groundScrollX * 1.5 + 30, groundScrollY + 8, 8, 3);
      }

      // Draw Coins (spin cycle frames)
      state.coins.forEach(coin => {
        const frames = [SPRITES.COIN_F1, SPRITES.COIN_F2, SPRITES.COIN_F3, SPRITES.COIN_F4];
        const coinSprite = frames[Math.floor(coin.pulseFrame) % 4];
        drawPixelArt(
          ctx,
          coin.x,
          coin.y,
          coinSprite,
          3, // coin pixel size
          themeColors,
          "coin"
        );
      });

      // Draw Obstacles
      state.obstacles.forEach(o => {
        let sprite = SPRITES.CACTUS_SMALL;
        if (o.type === "CACTUS_LARGE") sprite = SPRITES.CACTUS_LARGE;
        else if (o.type === "CACTUS_DOUBLE") sprite = SPRITES.CACTUS_DOUBLE;
        else if (o.type === "BIRD") {
          // Bird wing flap animation toggle
          const frameIndex = Math.floor(o.frame / 8) % 2;
          sprite = frameIndex === 0 ? SPRITES.BIRD_WING_UP : SPRITES.BIRD_WING_DOWN;
        }

        drawPixelArt(
          ctx,
          o.x,
          o.y,
          sprite,
          3, // obstacles scaling
          themeColors,
          "obstacle"
        );
      });

      // Draw Particles
      state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0; // reset
      });

      // Draw Player Character (Dino)
      const pX = 64;
      const pY = state.player.y;
      const isCrouching = state.player.state === "CROUCHING";
      const isJumping = state.player.state === "JUMPING";
      const isDead = state.status === "GAME_OVER";

      let dinoSprite = SPRITES.DINO_RUN_1;
      if (isDead) {
        dinoSprite = SPRITES.DINO_DEAD;
      } else if (isJumping) {
        dinoSprite = SPRITES.DINO_JUMP;
      } else if (isCrouching) {
        dinoSprite = state.player.spriteFrame === 0 ? SPRITES.DINO_CROUCH_1 : SPRITES.DINO_CROUCH_2;
      } else {
        // running neutral
        dinoSprite = state.player.spriteFrame === 0 ? SPRITES.DINO_RUN_1 : SPRITES.DINO_RUN_2;
      }

      drawPixelArt(
        ctx,
        pX,
        pY,
        dinoSprite,
        3, // dino pixel scaling
        themeColors,
        "character"
      );

      // If dead, draw retro tombstone where they collapsed!
      if (isDead) {
        drawPixelArt(
          ctx,
          pX - 25,
          canvas.height * 0.72 + 12,
          SPRITES.TOMBSTONE,
          3,
          themeColors,
          "obstacle"
        );
      }

      // Draw Game Overlay text if Idle or game over
      if (state.status === "IDLE") {
        drawIdleScreenOverlay(ctx, canvas, themeColors);
      } else if (state.status === "GAME_OVER") {
        drawGameOverScreenOverlay(ctx, canvas, themeColors);
      }
    };

    const drawBackgroundStarsAndSun = (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      isNight: boolean,
      cycle: number
    ) => {
      if (isNight) {
        // Draw starry background
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        const starPositions = [
          { x: 80, y: 30 }, { x: 260, y: 70 }, { x: 380, y: 25 },
          { x: 500, y: 90 }, { x: 670, y: 40 }, { x: 740, y: 80 }
        ];
        starPositions.forEach((star, index) => {
          // twinkle sparkle animation
          const size = ((cycle + index * 50) % 60) > 30 ? 2 : 3;
          ctx.fillRect(star.x % canvas.width, star.y, size, size);
        });

        // Pixel crescent moon
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(canvas.width - 120, 30, 24, 24);
        ctx.fillStyle = "#0f172a"; // background cut to make crescent shape
        ctx.fillRect(canvas.width - 128, 30, 20, 24);
      } else {
        // Daylight Sun representation
        ctx.fillStyle = "#fef08a"; // Yellow 200 light sun
        ctx.fillRect(canvas.width - 120, 25, 28, 28);
      }
    };

    const drawIdleScreenOverlay = (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      theme: ColorScheme
    ) => {
      ctx.fillStyle = "rgba(253, 253, 253, 0.96)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = "14px 'Press Start 2P', monospace";
      ctx.fillStyle = "#111111";
      ctx.textAlign = "center";
      ctx.fillText("NEURAL CHROME RUN", canvas.width / 2, canvas.height / 2 - 30);

      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = "#555555";
      ctx.fillText("PRESS JUMP (SPACE / W) OR CLICK TO BEGIN", canvas.width / 2, canvas.height / 2 + 15);
      
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = "#888888";
      ctx.fillText("SYNC TEACHABLE MODEL IN PRIVATE EMBED TO LEAP", canvas.width / 2, canvas.height / 2 + 38);
    };

    const drawGameOverScreenOverlay = (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      theme: ColorScheme
    ) => {
      ctx.fillStyle = "rgba(253, 253, 253, 0.96)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = "16px 'Press Start 2P', monospace";
      ctx.fillStyle = "#ef4444"; 
      ctx.textAlign = "center";
      ctx.fillText("G A M E  O V E R", canvas.width / 2, canvas.height / 2 - 20);

      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = "#222222";
      ctx.fillText("PRESS SPACE OR CLICK HERE TO TRY AGAIN", canvas.width / 2, canvas.height / 2 + 25);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions, gameStatus]);

  // Handle click on canvas screen element to restart / focus
  const handleCanvasClick = () => {
    if (gameStatus === "IDLE" || gameStatus === "GAME_OVER") {
      setGameStatus("RUNNING");
      initGame();
    }
  };

  return (
    <div className="w-full select-none" id="retro_game_container">
      {/* Top statistics dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-2 border-black bg-white font-mono text-xs text-gray-800 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 border border-black font-mono">
            <span className="text-black font-black uppercase text-[10px]">COINS:</span>
            <span className="text-black font-bold" id="coins_count">{String(liveCoins).padStart(3, "0")}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 border border-black">
            <span className="text-gray-500 text-[10px] font-bold">SPEED:</span>
            <span className="text-black font-black">{(stateRef.current.gameSpeed).toFixed(1)}x</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-bold uppercase text-[10px]">HI:</span>
            <span className="text-black font-bold font-mono tracking-wider">{String(highScore).padStart(5, "0")}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-black text-white border border-black">
            <span className="text-gray-300 font-bold text-[10px]">SCORE:</span>
            <span className="text-white font-black font-mono tracking-wider" id="score_count">
              {String(liveScore).padStart(5, "0")}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const isMuted = retroAudio.toggleMute();
              setMuted(isMuted);
            }}
            id="mute_toggle_btn"
            className="p-1.5 border border-black bg-white hover:bg-gray-50 text-black transition-colors cursor-pointer"
            title={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-600 animate-pulse" /> : <Volume2 className="w-4 h-4 text-emerald-650" />}
          </button>
        </div>
      </div>

      {/* Render Canvas Frame Container */}
      <div 
        ref={containerRef}
        onClick={handleCanvasClick}
        className="relative w-full overflow-hidden bg-[#fdfdfd] border-x-2 border-b-2 border-black cursor-pointer select-none group"
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full block pixelated"
          id="retro_platformer_canvas"
        />

        {/* Hover visual controls helper */}
        {(gameStatus === "IDLE" || gameStatus === "GAME_OVER") && (
          <div className="absolute inset-x-0 bottom-6 flex justify-center animate-bounce pointer-events-none">
            <div className="bg-black text-white text-[9px] font-mono uppercase tracking-widest px-4 py-2 border border-black shadow-md flex items-center gap-2">
              <RefreshCw className="w-3 h-3 text-white animate-spin" />
              <span>TAP TO DEFEND RETRO RUNNER</span>
            </div>
          </div>
        )}

        {/* Active Teachable Machine indicator dot */}
        {gameStatus === "RUNNING" && currentAction !== "idle" && (
          <div className="absolute top-3 left-3 bg-black px-2.5 py-1 border border-black font-mono text-[9px] text-white flex items-center gap-1.5 uppercase font-bold tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>MODEL INTENT: {currentAction.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Controls legend instructions bar */}
      <div className="mt-2.5 flex flex-col sm:flex-row justify-between items-center px-4 py-2.5 bg-gray-100 border border-black gap-2 text-[11px] text-gray-700 select-none">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold flex items-center gap-1 text-[10px] text-black font-mono uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" /> Direct Keys:
          </span>
          <span className="bg-white border border-gray-300 text-black px-1.5 py-0.5 font-mono text-[10px]">Space / Up</span> Jump
          <span className="bg-white border border-gray-300 text-black px-1.5 py-0.5 font-mono text-[10px]">Down</span> Slide / Fall
        </div>
        <div className="text-[9px] uppercase tracking-wider font-extrabold text-black font-mono">
          Speed shifts every 1,000 points
        </div>
      </div>
    </div>
  );
};
