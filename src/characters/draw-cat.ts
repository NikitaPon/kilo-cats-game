import { CAT_COLORS, CAT_MOTION } from "./cat-design";
import type { CatColors, CatSpriteOptions } from "./types";

/**
 * The one and only cat renderer.
 *
 * Every mini-game draws its cats through this function, so a cat keeps the same
 * proportions, palette and expressions across all games. Games only pass
 * placement, transform and expression — never raw colors.
 */

const EYE_Y = -28;
const EYE_SPACING = 12;
const EYE_WHITE_RADIUS_X = 8;
const EYE_WHITE_RADIUS_Y = 9;
const IRIS_RADIUS_X = 5;
const IRIS_RADIUS_Y = 6;
const BLINKED_IRIS_RADIUS_Y = 2;
const PUPIL_RADIUS_X = 2;
const PUPIL_RADIUS_Y = 4;
const SHINE_RADIUS = 2;

function applyCatTransform(ctx: CanvasRenderingContext2D, options: CatSpriteOptions) {
  ctx.save();
  ctx.translate(options.x, options.y);
  ctx.rotate(options.rotation ?? 0);
  ctx.scale(
    (options.scaleX ?? 1) * options.preset.scale,
    (options.scaleY ?? 1) * options.preset.scale
  );
  if (options.opacity !== undefined) {
    ctx.globalAlpha = options.opacity;
  }
}

function drawTail(ctx: CanvasRenderingContext2D, fur: string, wag: number) {
  ctx.save();
  ctx.rotate(wag);
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.moveTo(-30, -10);
  ctx.quadraticCurveTo(-50, -30, -45, -50);
  ctx.quadraticCurveTo(-40, -55, -35, -50);
  ctx.quadraticCurveTo(-40, -30, -25, -10);
  ctx.fill();
  ctx.restore();
}

function drawBackLegs(ctx: CanvasRenderingContext2D, fur: string) {
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(-15, 35, 12, 18, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(15, 35, 12, 18, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawFrontLegs(ctx: CanvasRenderingContext2D, fur: string, pawOffset: number) {
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(-20 - pawOffset, 30, 8, 15, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(20 + pawOffset, 30, 8, 15, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPaws(ctx: CanvasRenderingContext2D, markings: string, pawOffset: number) {
  ctx.fillStyle = markings;
  ctx.beginPath();
  ctx.ellipse(-20 - pawOffset, 42, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(20 + pawOffset, 42, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBody(ctx: CanvasRenderingContext2D, fur: string, markings: string | null) {
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, 10, 35, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  if (markings) {
    ctx.fillStyle = markings;
    ctx.beginPath();
    ctx.ellipse(0, 15, 20, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHead(ctx: CanvasRenderingContext2D, fur: string) {
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -25, 25, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-20, -40);
  ctx.lineTo(-12, -55);
  ctx.lineTo(-5, -38);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(20, -40);
  ctx.lineTo(12, -55);
  ctx.lineTo(5, -38);
  ctx.closePath();
  ctx.fill();
}

function drawInnerEars(ctx: CanvasRenderingContext2D, innerEar: string) {
  ctx.fillStyle = innerEar;
  ctx.beginPath();
  ctx.moveTo(-17, -42);
  ctx.lineTo(-12, -52);
  ctx.lineTo(-8, -40);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(17, -42);
  ctx.lineTo(12, -52);
  ctx.lineTo(8, -40);
  ctx.closePath();
  ctx.fill();
}

function drawFaceMarking(ctx: CanvasRenderingContext2D, markings: string) {
  ctx.fillStyle = markings;
  ctx.beginPath();
  ctx.ellipse(0, -20, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyes(ctx: CanvasRenderingContext2D, colors: CatColors, eyeY: number, blinking: boolean) {
  ctx.fillStyle = colors.eyeWhite;
  ctx.beginPath();
  ctx.ellipse(-EYE_SPACING, eyeY, EYE_WHITE_RADIUS_X, EYE_WHITE_RADIUS_Y, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(EYE_SPACING, eyeY, EYE_WHITE_RADIUS_X, EYE_WHITE_RADIUS_Y, 0, 0, Math.PI * 2);
  ctx.fill();

  const irisRadiusY = blinking ? BLINKED_IRIS_RADIUS_Y : IRIS_RADIUS_Y;
  ctx.fillStyle = colors.eyes;
  ctx.beginPath();
  ctx.ellipse(-EYE_SPACING, eyeY, IRIS_RADIUS_X, irisRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(EYE_SPACING, eyeY, IRIS_RADIUS_X, irisRadiusY, 0, 0, Math.PI * 2);
  ctx.fill();

  if (blinking) return;

  ctx.fillStyle = colors.pupil;
  ctx.beginPath();
  ctx.ellipse(-EYE_SPACING, eyeY, PUPIL_RADIUS_X, PUPIL_RADIUS_Y, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(EYE_SPACING, eyeY, PUPIL_RADIUS_X, PUPIL_RADIUS_Y, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.eyeWhite;
  ctx.beginPath();
  ctx.arc(-EYE_SPACING - 1, eyeY - 2, SHINE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(EYE_SPACING - 1, eyeY - 2, SHINE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function drawNose(ctx: CanvasRenderingContext2D, nose: string, yOffset = 0) {
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.moveTo(0, -18 + yOffset);
  ctx.lineTo(-4, -12 + yOffset);
  ctx.lineTo(4, -12 + yOffset);
  ctx.closePath();
  ctx.fill();
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  mouth: string,
  expression: CatSpriteOptions["expression"],
  yOffset = 0
) {
  ctx.strokeStyle = mouth;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -12 + yOffset);
  ctx.lineTo(0, -8 + yOffset);
  ctx.moveTo(-6, -6 + yOffset);
  ctx.quadraticCurveTo(0, (expression === "happy" ? 0 : -2) + yOffset, 6, -6 + yOffset);
  ctx.stroke();
}

function drawWhiskers(ctx: CanvasRenderingContext2D, whisker: string, yOffset = 0) {
  ctx.strokeStyle = whisker;
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-20, -15 + i * 5 + yOffset);
    ctx.lineTo(-40, -18 + i * 8 + yOffset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, -15 + i * 5 + yOffset);
    ctx.lineTo(40, -18 + i * 8 + yOffset);
    ctx.stroke();
  }
}

/** Covers the eyes with a bar of fur color, for the "curious squint". */
function drawSquint(ctx: CanvasRenderingContext2D, fur: string) {
  ctx.strokeStyle = fur;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-EYE_SPACING - 10, EYE_Y);
  ctx.lineTo(-EYE_SPACING + 10, EYE_Y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(EYE_SPACING - 10, EYE_Y);
  ctx.lineTo(EYE_SPACING + 10, EYE_Y);
  ctx.stroke();
}

export function drawCat(ctx: CanvasRenderingContext2D, options: CatSpriteOptions) {
  const { colors } = options.preset;
  const markings = colors.markings;
  const pawOffset = options.pawOffset ?? 0;
  const expression = options.expression ?? "neutral";
  const tailWag =
    options.tailWag ??
    Math.sin((options.time ?? 0) * CAT_MOTION.tailWagSpeed) *
      (options.tailWagAmplitude ?? CAT_MOTION.tailWagAmplitude);

  applyCatTransform(ctx, options);

  drawTail(ctx, colors.fur, tailWag);
  drawBackLegs(ctx, colors.fur);
  drawBody(ctx, colors.fur, markings);
  drawFrontLegs(ctx, colors.fur, pawOffset);
  if (markings) {
    drawPaws(ctx, markings, pawOffset);
  }
  drawHead(ctx, colors.fur);
  drawInnerEars(ctx, colors.innerEar);
  if (markings) {
    drawFaceMarking(ctx, markings);
  }
  drawEyes(ctx, colors, EYE_Y, options.blinking ?? false);
  drawNose(ctx, colors.nose);
  drawMouth(ctx, colors.mouth, expression);
  drawWhiskers(ctx, colors.whisker);
  if (expression === "squint") {
    drawSquint(ctx, colors.fur);
  }

  ctx.restore();
}

/**
 * The balloon form used by the "Превращение в шарики!" trick.
 * The face keeps the shared palette and features so the identity survives.
 */
export function drawCatBalloon(ctx: CanvasRenderingContext2D, options: CatSpriteOptions) {
  const { colors, width, height, balloonColor } = options.preset;
  const centerY = -height / 2;
  const faceOffset = centerY + 28;
  const whiskerOffset = centerY + 30;

  applyCatTransform(ctx, options);

  ctx.beginPath();
  ctx.ellipse(0, centerY, width / 2 + 10, height / 2 + 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = balloonColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Balloon string
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, 30, 0, 60);
  ctx.strokeStyle = CAT_COLORS.whisker;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawEyes(ctx, colors, centerY - 5, options.blinking ?? false);
  drawNose(ctx, colors.nose, faceOffset);
  drawMouth(ctx, colors.mouth, "neutral", faceOffset);
  drawWhiskers(ctx, colors.whisker, whiskerOffset);

  ctx.restore();
}
