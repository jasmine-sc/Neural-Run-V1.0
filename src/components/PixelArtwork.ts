// 8-bit Retro Pixel-Art sprites defined as string matrices.
// This allows 100% crispy pixel fidelity regardless of monitor size!

export interface ColorScheme {
  character: string;
  obstacle: string;
  coin: string;
  cloud: string;
  ground: string;
}

export const SPRITES = {
  // Dino running - Frame 1 (16x16 grid)
  DINO_RUN_1: [
    "      ████████  ",
    "     ███░░██░░█ ",
    "     ██████████ ",
    "     ████████   ",
    "   ███████████  ",
    " ░███████████░  ",
    "  ███████████   ",
    "  ███████████   ",
    "  ███████████   ",
    "   █████████    ",
    "    ████████    ",
    "    ███  ███    ",
    "    ███   ███   ",
    "     ██     ██  ",
    "     ███    ███ ",
    "     ░░      ░░ "
  ],
  // Dino running - Frame 2
  DINO_RUN_2: [
    "      ████████  ",
    "     ███░░██░░█ ",
    "     ██████████ ",
    "     ████████   ",
    "   ███████████  ",
    " ░███████████░  ",
    "  ███████████   ",
    "  ███████████   ",
    "  ███████████   ",
    "   █████████    ",
    "    ████████    ",
    "    ████ ███    ",
    "    ██░  █░     ",
    "    ███   ███   ",
    "    ░░░   ░░░   "
  ],
  // Dino jumping
  DINO_JUMP: [
    "      ████████  ",
    "     ███░░██░░█ ",
    "     ██████████ ",
    "     ████████   ",
    "   ███████████  ",
    " ░███████████░  ",
    "  ███████████   ",
    "  ███████████   ",
    "  ███████████   ",
    "   █████████    ",
    "    ████████    ",
    "    ████████    ",
    "    ███  ███    ",
    "    ██    ██    ",
    "   ███   ███    "
  ],
  // Dino crouched - Frame 1 (18x12 grid)
  DINO_CROUCH_1: [
    "        ███████████ ",
    "       ████░░██░░███",
    "       █████████████",
    "       ███████████ ",
    "  ████████████████  ",
    "░█████████████████░ ",
    " █████████████████  ",
    "  ████████████████  ",
    "   ██████████████   ",
    "    ███    ███      ",
    "    ███     ███     ",
    "     ███     ███    "
  ],
  // Dino crouched - Frame 2
  DINO_CROUCH_2: [
    "        ███████████ ",
    "       ████░░██░░███",
    "       █████████████",
    "       ███████████ ",
    "  ████████████████  ",
    "░█████████████████░ ",
    " █████████████████  ",
    "  ████████████████  ",
    "   ██████████████   ",
    "    ████   ████     ",
    "     ███    ███     ",
    "     ░░░     ░░░    "
  ],
  // Dino hit (Collided)
  DINO_DEAD: [
    "      ████████  ",
    "     ███░░██░░█ ",
    "     █░█░░█░░██ ",
    "     ████████   ",
    "   ███████████  ",
    " ░███████████░  ",
    "  ███████████   ",
    "  ███████████   ",
    "  ███████████   ",
    "   █████████    ",
    "    ████████    ",
    "    ███  ███    ",
    "    ███   ███   ",
    "     ██     ██  ",
    "    ░░░    ░░░  "
  ],
  // Small Cactus (8x16 px)
  CACTUS_SMALL: [
    "   ███  ",
    "   ███  ",
    "   ███  ",
    " █████  ",
    "███████ ",
    "███████ ",
    "███████ ",
    " █████  ",
    "   ███  ",
    "   ███  ",
    "   ███  ",
    "   ███  ",
    "   ███  ",
    "   ███  ",
    "   ███  ",
    "   ███  "
  ],
  // Large Cactus (12x24 px)
  CACTUS_LARGE: [
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "  ████████  ",
    " ██████████ ",
    "████████████",
    "████████████",
    "████████████",
    " ██████████ ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    ",
    "    ████    "
  ],
  // Double Cactus (combined Cactus Small/Large width)
  CACTUS_DOUBLE: [
    "   ███         ████    ",
    "   ███         ████    ",
    "   ███         ████    ",
    " █████       ████████  ",
    "███████     ██████████ ",
    "███████    ████████████",
    "███████    ████████████",
    " █████     ████████████",
    "   ███      ██████████ ",
    "   ███         ████    ",
    "   ███         ████    ",
    "   ███         ████    ",
    "   ███         ████    ",
    "   ███         ████    ",
    "   ███         ████    ",
    "   ███         ████    "
  ],
  // Bird flapping - Wing Up (16x12 px)
  BIRD_WING_UP: [
    "      ████      ",
    "     ██████     ",
    "   ██████████   ",
    " ██████████████ ",
    "██████████████  ",
    "█████░░██░░█    ",
    "███████████     ",
    "  ████████      ",
    "   █████        ",
    "    ███         ",
    "    ██          ",
    "    █           "
  ],
  // Bird flapping - Wing Down
  BIRD_WING_DOWN: [
    "      ████      ",
    "     ██████     ",
    "   ██████████   ",
    " ██████████████ ",
    "██████████████  ",
    "█████░░██░░█    ",
    "███████████     ",
    "  ████████      ",
    "    ███         ",
    "    ██          ",
    "    ███         ",
    "     ███        "
  ],
  // Cloud (16x8 px)
  CLOUD: [
    "      █████     ",
    "    █████████    ",
    "  █████████████  ",
    " ███████████████ ",
    "█████████████████",
    "█████████████████",
    " ███████████████ ",
    "  █████████████  "
  ],
  // Golden Coin animation grid (8x8 px) - 4 Frames
  COIN_F1: [
    "  ████  ",
    " ██████ ",
    "████████",
    "████░░██",
    "████░░██",
    "████████",
    " ██████ ",
    "  ████  "
  ],
  COIN_F2: [
    "   ██   ",
    "  ████  ",
    " ██████ ",
    " ██░░██ ",
    " ██░░██ ",
    " ██████ ",
    "  ████  ",
    "   ██   "
  ],
  COIN_F3: [
    "   █    ",
    "   █    ",
    "  ████  ",
    "  █░░█  ",
    "  █░░█  ",
    "  ████  ",
    "   █    ",
    "   █    "
  ],
  COIN_F4: [
    "   ██   ",
    "  ████  ",
    " ██████ ",
    " ██░░██ ",
    " ██░░██ ",
    " ██████ ",
    "  ████  ",
    "   ██   "
  ],
  // Dead tombstone mark (12x12 px)
  TOMBSTONE: [
    "   ██████   ",
    "  ████████  ",
    "  ██ ██ ██  ",
    "  ████████  ",
    "  ███░░███  ",
    "  ████████  ",
    "  ████████  ",
    "  ████████  ",
    "  ████████  ",
    "  ████████  ",
    " ██████████ ",
    "████████████"
  ]
};

/**
 * Draws pixel-art onto a canvas 2D context.
 * Supporting color mappings for different schemes, effects, scaling, and flip-x.
 */
export function drawPixelArt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sprite: string[],
  pixelSize: number,
  colorScheme: ColorScheme,
  spriteType: "character" | "obstacle" | "coin" | "cloud" | "ground" | "dark_accent",
  options?: {
    flipX?: boolean;
    opacity?: number;
    rotation?: number; // radians
  }
) {
  const heightInPixels = sprite.length;
  const widthInPixels = sprite[0]?.length || 0;

  ctx.save();
  ctx.translate(x, y);

  if (options?.opacity !== undefined) {
    ctx.globalAlpha = options.opacity;
  }

  if (options?.rotation) {
    ctx.rotate(options.rotation);
  }

  if (options?.flipX) {
    ctx.scale(-1, 1);
  }

  // Choose the color based on sprite type
  let primaryColor = colorScheme.obstacle;
  if (spriteType === "character") primaryColor = colorScheme.character;
  else if (spriteType === "coin") primaryColor = colorScheme.coin;
  else if (spriteType === "cloud") primaryColor = colorScheme.cloud;
  else if (spriteType === "ground") primaryColor = colorScheme.ground;
  else if (spriteType === "dark_accent") primaryColor = "rgba(0, 0, 0, 0.4)";

  // Layout calculations
  const xOffset = options?.flipX ? -widthInPixels * pixelSize : 0;

  for (let r = 0; r < heightInPixels; r++) {
    const row = sprite[r];
    for (let c = 0; c < widthInPixels; c++) {
      const char = row[c];
      if (char === " " || char === undefined) continue;

      let pixelColor = primaryColor;
      
      // Handle eyes ░░ or specialized transparency/darkness
      if (char === "░") {
        pixelColor = "#ef4444"; // red eyes for damaged or special things
      } else if (char === "░") {
        // Transparent highlight or secondary color
        pixelColor = "#ffffff";
      }

      ctx.fillStyle = pixelColor;
      ctx.fillRect(
        xOffset + c * pixelSize,
        r * pixelSize,
        pixelSize + 0.1, // 0.1 protects against floating point gaps between pixels
        pixelSize + 0.1
      );
    }
  }

  ctx.restore();
}
