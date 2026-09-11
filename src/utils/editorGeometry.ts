import { ArrowAnnotation, CalloutAnnotation, TextAnnotation } from '../types';

export interface ArrowGeometry {
  dist: number;
  headLen: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  shaftEndX: number;
  shaftEndY: number;
  w1X: number;
  w1Y: number;
  w2X: number;
  w2Y: number;
  indentX: number;
  indentY: number;
  polygonPoints: string;
}

/**
 * Calculates high-contrast text color based on background luminance.
 * Dark background -> #FFFFFF, Light background -> #000000.
 */
export function getContrastTextColor(hexColor: string): '#FFFFFF' | '#000000' {
  if (!hexColor) return '#FFFFFF';
  let hex = hexColor.replace('#', '').trim();
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    const match = hex.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0], 10);
      const g = parseInt(match[1], 10);
      const b = parseInt(match[2], 10);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness >= 155 ? '#000000' : '#FFFFFF';
    }
    return '#FFFFFF';
  }

  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 155 ? '#000000' : '#FFFFFF';
}

/**
 * Robust mathematical calculation for arrow geometry.
 * Ensures the arrow shaft (tail) is 100% visible, connected,
 * and seamless at any angle (0, 45, 90, 135, 180, 225, 270, 315) without gaps or disappearance.
 */
export function getArrowGeometry(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  width: number
): ArrowGeometry {
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 15);
  const ux = dx / dist;
  const uy = dy / dist;

  // Arrowhead length & width
  const headLen = Math.min(Math.max(width * 2.4, 22), dist * 0.7);
  const headWidth = headLen * 0.95;

  // Arrowhead base center
  const baseX = endX - headLen * ux;
  const baseY = endY - headLen * uy;

  // Perpendicular unit vector
  const perpX = -uy;
  const perpY = ux;

  // Wings of the arrowhead
  const w1X = baseX + (headWidth / 2) * perpX;
  const w1Y = baseY + (headWidth / 2) * perpY;
  const w2X = baseX - (headWidth / 2) * perpX;
  const w2Y = baseY - (headWidth / 2) * perpY;

  // Inner indent (classic clean arrow shape)
  const indentX = baseX + headLen * 0.15 * ux;
  const indentY = baseY + headLen * 0.15 * uy;

  // Shaft end overlaps slightly into arrowhead base so there's never a gap
  const shaftEndX = baseX + headLen * 0.22 * ux;
  const shaftEndY = baseY + headLen * 0.22 * uy;

  return {
    dist,
    headLen,
    startX,
    startY,
    endX,
    endY,
    shaftEndX,
    shaftEndY,
    w1X,
    w1Y,
    w2X,
    w2Y,
    indentX,
    indentY,
    polygonPoints: `${endX},${endY} ${w1X},${w1Y} ${indentX},${indentY} ${w2X},${w2Y}`,
  };
}

/**
 * Calculates Callout (화살표 말풍선) geometry.
 * Text box has rounded corners and translucent light gray background.
 * Arrow pointer has a compact tail pointing directly from the box perimeter to the target.
 */
export function getCalloutGeometry(callout: CalloutAnnotation) {
  // Generous, comfortable box dimensions with ample padding
  const charCount = Math.max(callout.text.length, 3);
  const approxTextWidth = charCount * (callout.fontSize * 0.72);
  const boxW = Math.round(Math.max(140, approxTextWidth + 56));
  const boxH = Math.round(Math.max(52, callout.fontSize * 1.6 + 26));

  const halfW = boxW / 2;
  const halfH = boxH / 2;

  // Vector from box center to target pointer
  const dx = callout.targetX - callout.boxX;
  const dy = callout.targetY - callout.boxY;
  const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
  const ux = dx / dist;
  const uy = dy / dist;

  // Find intersection with the box perimeter
  const scale = Math.min(
    Math.abs(halfW / (ux || 0.0001)),
    Math.abs(halfH / (uy || 0.0001))
  );
  const edgeX = callout.boxX + ux * Math.min(scale, dist * 0.55);
  const edgeY = callout.boxY + uy * Math.min(scale, dist * 0.55);

  // Pointer arrowhead at targetX, targetY
  const pointerDist = Math.max(
    Math.sqrt((callout.targetX - edgeX) ** 2 + (callout.targetY - edgeY) ** 2),
    15
  );
  const pUx = (callout.targetX - edgeX) / pointerDist;
  const pUy = (callout.targetY - edgeY) / pointerDist;

  const headLen = Math.min(16, pointerDist * 0.45);
  const headWidth = headLen * 0.95;
  const perpX = -pUy;
  const perpY = pUx;

  const baseX = callout.targetX - headLen * pUx;
  const baseY = callout.targetY - headLen * pUy;

  const w1X = baseX + (headWidth / 2) * perpX;
  const w1Y = baseY + (headWidth / 2) * perpY;
  const w2X = baseX - (headWidth / 2) * perpX;
  const w2Y = baseY - (headWidth / 2) * perpY;

  return {
    boxW,
    boxH,
    edgeX,
    edgeY,
    targetX: callout.targetX,
    targetY: callout.targetY,
    w1X,
    w1Y,
    w2X,
    w2Y,
    pointerPolygon: `${callout.targetX},${callout.targetY} ${w1X},${w1Y} ${w2X},${w2Y}`,
  };
}

/**
 * Draws an arrow onto HTML5 Canvas
 */
export function drawArrowOnCanvas(ctx: CanvasRenderingContext2D, arrow: ArrowAnnotation) {
  const geom = getArrowGeometry(
    arrow.startX,
    arrow.startY,
    arrow.endX,
    arrow.endY,
    arrow.width
  );

  ctx.save();
  // Soft ambient drop shadow for clarity on all photo backgrounds
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  // Arrow Shaft
  ctx.strokeStyle = arrow.color;
  ctx.lineWidth = arrow.width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(geom.startX, geom.startY);
  ctx.lineTo(geom.shaftEndX, geom.shaftEndY);
  ctx.stroke();

  // Arrow Head
  ctx.fillStyle = arrow.color;
  ctx.beginPath();
  ctx.moveTo(geom.endX, geom.endY);
  ctx.lineTo(geom.w1X, geom.w1Y);
  ctx.lineTo(geom.indentX, geom.indentY);
  ctx.lineTo(geom.w2X, geom.w2Y);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Callout (화살표 말풍선) onto HTML5 Canvas
 */
export function drawCalloutOnCanvas(ctx: CanvasRenderingContext2D, callout: CalloutAnnotation) {
  const geom = getCalloutGeometry(callout);
  const radius = 14;
  const rx = callout.boxX - geom.boxW / 2;
  const ry = callout.boxY - geom.boxH / 2;

  ctx.save();

  // 1. Draw pointer arrow from box edge to target
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  ctx.strokeStyle = callout.arrowColor;
  ctx.lineWidth = callout.arrowWidth || 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(geom.edgeX, geom.edgeY);
  ctx.lineTo(callout.targetX, callout.targetY);
  ctx.stroke();

  // Arrowhead at target
  ctx.fillStyle = callout.arrowColor;
  ctx.beginPath();
  ctx.moveTo(callout.targetX, callout.targetY);
  ctx.lineTo(geom.w1X, geom.w1Y);
  ctx.lineTo(geom.w2X, geom.w2Y);
  ctx.closePath();
  ctx.fill();

  // 2. Draw rounded colored box matching arrow color
  ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  const boxBgColor = callout.bgColor || callout.arrowColor;
  ctx.fillStyle = boxBgColor;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(rx, ry, geom.boxW, geom.boxH, radius);
  } else {
    ctx.rect(rx, ry, geom.boxW, geom.boxH);
  }
  ctx.fill();

  // Subtle border matching arrow or clean contrast
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = callout.borderColor || 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 3. Text inside box with automatic contrast color
  const calculatedTextColor = callout.textColor || getContrastTextColor(boxBgColor);
  ctx.fillStyle = calculatedTextColor;
  ctx.font = `bold ${callout.fontSize}px Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(callout.text, callout.boxX, callout.boxY);

  ctx.restore();
}

/**
 * Draws Text Annotation onto HTML5 Canvas
 */
export function drawTextOnCanvas(ctx: CanvasRenderingContext2D, textItem: TextAnnotation) {
  if (!textItem.text.trim()) return;

  ctx.save();
  ctx.font = `bold ${textItem.fontSize}px Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(textItem.text);
  const textWidth = metrics.width;
  const paddingX = Math.round(textItem.fontSize * 0.55);
  const paddingY = Math.round(textItem.fontSize * 0.35);
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = textItem.fontSize + paddingY * 2;

  if (textItem.bgColor !== 'none') {
    let bgStyle = '#000000';
    if (textItem.bgColor === 'light') bgStyle = '#FFFFFF';
    if (textItem.bgColor === 'yellow') bgStyle = '#FACC15';

    ctx.fillStyle = bgStyle;
    ctx.beginPath();
    const radius = Math.min(10, Math.round(boxHeight / 4));
    const rx = textItem.x - boxWidth / 2;
    const ry = textItem.y - boxHeight / 2;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(rx, ry, boxWidth, boxHeight, radius);
    } else {
      ctx.rect(rx, ry, boxWidth, boxHeight);
    }
    ctx.fill();

    ctx.strokeStyle = textItem.bgColor === 'light' ? '#E4E4E7' : 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.strokeStyle = textItem.color === '#000000' ? '#FFFFFF' : '#000000';
    ctx.lineWidth = Math.max(2, Math.round(textItem.fontSize / 14));
    ctx.strokeText(textItem.text, textItem.x, textItem.y);
  }

  ctx.fillStyle = textItem.color;
  ctx.fillText(textItem.text, textItem.x, textItem.y);
  ctx.restore();
}
