import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  ArrowUpRight,
  MessageSquare,
  Type,
  Grid,
  Undo2,
  Redo2,
  RotateCcw,
  Check,
  X,
  Move,
  Plus,
  Trash2,
  Pencil,
  ArrowRight,
  ArrowUp,
  ArrowLeft,
  ArrowDown,
  ArrowDownLeft,
  ArrowUpLeft,
  RotateCw,
} from 'lucide-react';
import {
  OptimizedImageItem,
  EditorTool,
  AspectRatioOption,
  ArrowAnnotation,
  CalloutAnnotation,
  TextAnnotation,
} from '../types';
import { loadImage } from '../utils/imageProcessor';
import {
  getArrowGeometry,
  getCalloutGeometry,
  drawArrowOnCanvas,
  drawCalloutOnCanvas,
  drawTextOnCanvas,
} from '../utils/editorGeometry';

interface EditorModalProps {
  image: OptimizedImageItem;
  initialRatio?: AspectRatioOption;
  onSave: (imageId: string, newDataUrl: string) => void;
  onClose: () => void;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface EditorHistorySnapshot {
  baseDataUrl: string;
  arrows: ArrowAnnotation[];
  callouts: CalloutAnnotation[];
  texts: TextAnnotation[];
}

export function EditorModal({
  image,
  initialRatio = 'free',
  onSave,
  onClose,
}: EditorModalProps) {
  const [activeTool, setActiveTool] = useState<EditorTool>('crop');

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimensions
  const [canvasDims, setCanvasDims] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });
  const [canvasDisplayScale, setCanvasDisplayScale] = useState<number>(1);

  // Base Image ref (contains raw image or applied crops/mosaics)
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  // Annotations collections
  const [arrows, setArrows] = useState<ArrowAnnotation[]>([]);
  const [callouts, setCallouts] = useState<CalloutAnnotation[]>([]);
  const [texts, setTexts] = useState<TextAnnotation[]>([]);

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'arrow' | 'callout' | 'text' | null>(null);

  // History Stack
  const [history, setHistory] = useState<EditorHistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Crop State
  const [selectedCropRatio, setSelectedCropRatio] = useState<AspectRatioOption>(
    initialRatio === 'original' ? 'free' : initialRatio
  );
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const isDraggingCrop = useRef(false);
  const cropStartPos = useRef<{ x: number; y: number } | null>(null);

  // Mosaic State
  const [mosaicBlockSize, setMosaicBlockSize] = useState<number>(16);
  const [mosaicRect, setMosaicRect] = useState<CropRect | null>(null);

  // Arrow defaults / active settings
  const [defaultArrowColor, setDefaultArrowColor] = useState<string>('#EF4444');
  const [defaultArrowWidth, setDefaultArrowWidth] = useState<number>(14);
  const [defaultArrowLength, setDefaultArrowLength] = useState<number>(150);

  // Callout defaults / active settings
  const [defaultCalloutText, setDefaultCalloutText] = useState<string>('설명할 내용을 입력하세요');
  const [defaultCalloutFontSize, setDefaultCalloutFontSize] = useState<number>(20);
  const [defaultCalloutArrowColor, setDefaultCalloutArrowColor] = useState<string>('#EF4444');

  // Text defaults / active settings
  const [defaultTextContent, setDefaultTextContent] = useState<string>('강조 텍스트');
  const [defaultTextColor, setDefaultTextColor] = useState<string>('#FFFFFF');
  const [defaultTextBg, setDefaultTextBg] = useState<'dark' | 'light' | 'yellow' | 'none'>('dark');
  const [defaultTextFontSize, setDefaultTextFontSize] = useState<number>(32);

  // In-canvas inline text editing state
  const [editingInlineId, setEditingInlineId] = useState<string | null>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select text when entering inline editing mode
  useEffect(() => {
    if (editingInlineId) {
      const timer = setTimeout(() => {
        inlineInputRef.current?.focus();
        inlineInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [editingInlineId]);

  // Drag interaction state
  const dragInfo = useRef<{
    kind:
      | 'arrow-body'
      | 'arrow-head'
      | 'arrow-tail'
      | 'callout-box'
      | 'callout-target'
      | 'text';
    id: string;
    startClientX: number;
    startClientY: number;
    initialSnapshot: any;
  } | null>(null);

  // Initialize Canvas & History
  useEffect(() => {
    let isMounted = true;
    loadImage(image.currentDataUrl).then((img) => {
      if (!isMounted) return;
      baseImageRef.current = img;
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      setCanvasDims(dims);

      const initialSnapshot: EditorHistorySnapshot = {
        baseDataUrl: image.currentDataUrl,
        arrows: [],
        callouts: [],
        texts: [],
      };
      setHistory([initialSnapshot]);
      setHistoryIndex(0);

      renderBaseCanvas(img);
    });

    return () => {
      isMounted = false;
    };
  }, [image.currentDataUrl]);

  // Keep display scale updated
  useEffect(() => {
    const updateDisplayScale = () => {
      if (canvasRef.current && canvasDims.width > 0) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasDisplayScale(rect.width / canvasDims.width);
      }
    };
    updateDisplayScale();
    window.addEventListener('resize', updateDisplayScale);
    return () => window.removeEventListener('resize', updateDisplayScale);
  }, [canvasDims.width]);

  // Push to history
  const pushHistorySnapshot = (
    newBaseUrl?: string,
    newArrows?: ArrowAnnotation[],
    newCallouts?: CalloutAnnotation[],
    newTexts?: TextAnnotation[]
  ) => {
    const currentBase = newBaseUrl ?? (history[historyIndex]?.baseDataUrl || image.currentDataUrl);
    const snap: EditorHistorySnapshot = {
      baseDataUrl: currentBase,
      arrows: newArrows ?? arrows,
      callouts: newCallouts ?? callouts,
      texts: newTexts ?? texts,
    };

    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, snap];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const restoreSnapshot = (snap: EditorHistorySnapshot) => {
    setArrows(snap.arrows);
    setCallouts(snap.callouts);
    setTexts(snap.texts);
    setSelectedId(null);
    setSelectedType(null);

    loadImage(snap.baseDataUrl).then((img) => {
      baseImageRef.current = img;
      setCanvasDims({ width: img.naturalWidth, height: img.naturalHeight });
      renderBaseCanvas(img);
    });
  };

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      restoreSnapshot(history[prevIdx]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      restoreSnapshot(history[nextIdx]);
    }
  }, [historyIndex, history]);

  const resetToOriginal = () => {
    loadImage(image.originalDataUrl).then((img) => {
      baseImageRef.current = img;
      setCanvasDims({ width: img.naturalWidth, height: img.naturalHeight });
      renderBaseCanvas(img);
      setArrows([]);
      setCallouts([]);
      setTexts([]);
      setSelectedId(null);
      setSelectedType(null);
      setCropRect(null);
      setMosaicRect(null);

      const resetSnapshot: EditorHistorySnapshot = {
        baseDataUrl: image.originalDataUrl,
        arrows: [],
        callouts: [],
        texts: [],
      };
      setHistory([resetSnapshot]);
      setHistoryIndex(0);
    });
  };

  // Keyboard shortcut for Undo (Ctrl+Z, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Render base image to canvas
  const renderBaseCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };

  // Coordinate conversion
  const getCanvasCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasDims.width / rect.width;
    const scaleY = canvasDims.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getAspectRatioMultiplier = (ratio: AspectRatioOption): number | null => {
    switch (ratio) {
      case '1:1':
        return 1;
      case '3:4':
        return 3 / 4;
      case '16:9':
        return 16 / 9;
      case '4:3':
        return 4 / 3;
      default:
        return null;
    }
  };

  // -------------------------------------------------------------
  // Tool: CROP Logic
  // -------------------------------------------------------------
  const applyCrop = () => {
    if (!cropRect || cropRect.w < 10 || cropRect.h < 10 || !baseImageRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = Math.round(cropRect.w);
    croppedCanvas.height = Math.round(cropRect.h);
    const ctx = croppedCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      canvas,
      cropRect.x,
      cropRect.y,
      cropRect.w,
      cropRect.h,
      0,
      0,
      cropRect.w,
      cropRect.h
    );

    const newUrl = croppedCanvas.toDataURL('image/png');
    loadImage(newUrl).then((img) => {
      baseImageRef.current = img;
      setCanvasDims({ width: img.naturalWidth, height: img.naturalHeight });
      renderBaseCanvas(img);
      setCropRect(null);
      pushHistorySnapshot(newUrl);
    });
  };

  // -------------------------------------------------------------
  // Tool: MOSAIC Logic
  // -------------------------------------------------------------
  const applyMosaic = (rect: CropRect) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = Math.max(0, Math.floor(rect.x));
    const y = Math.max(0, Math.floor(rect.y));
    const w = Math.min(canvas.width - x, Math.ceil(rect.w));
    const h = Math.min(canvas.height - y, Math.ceil(rect.h));

    if (w < 4 || h < 4) return;

    const bSize = Math.max(4, mosaicBlockSize);
    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;

    for (let py = 0; py < h; py += bSize) {
      for (let px = 0; px < w; px += bSize) {
        let rSum = 0,
          gSum = 0,
          bSum = 0,
          aSum = 0,
          count = 0;

        for (let dy = 0; dy < bSize && py + dy < h; dy++) {
          for (let dx = 0; dx < bSize && px + dx < w; dx++) {
            const index = ((py + dy) * w + (px + dx)) * 4;
            rSum += data[index];
            gSum += data[index + 1];
            bSum += data[index + 2];
            aSum += data[index + 3];
            count++;
          }
        }

        const avgR = Math.round(rSum / count);
        const avgG = Math.round(gSum / count);
        const avgB = Math.round(bSum / count);
        const avgA = Math.round(aSum / count);

        for (let dy = 0; dy < bSize && py + dy < h; dy++) {
          for (let dx = 0; dx < bSize && px + dx < w; dx++) {
            const index = ((py + dy) * w + (px + dx)) * 4;
            data[index] = avgR;
            data[index + 1] = avgG;
            data[index + 2] = avgB;
            data[index + 3] = avgA;
          }
        }
      }
    }

    ctx.putImageData(imgData, x, y);
    const newUrl = canvas.toDataURL('image/png');
    loadImage(newUrl).then((img) => {
      baseImageRef.current = img;
      pushHistorySnapshot(newUrl);
    });
  };

  // -------------------------------------------------------------
  // Tool: ARROW Management
  // -------------------------------------------------------------
  const activeArrow =
    selectedType === 'arrow' ? arrows.find((a) => a.id === selectedId) || null : null;

  const handleAddNewArrow = (targetCenterX?: number, targetCenterY?: number) => {
    const cx = targetCenterX ?? Math.round(canvasDims.width / 2);
    const cy = targetCenterY ?? Math.round(canvasDims.height / 2);
    const len = defaultArrowLength;
    const half = len / 2;

    // Default: -45 degrees (head/dot on the left, tail extending to the right!)
    const dirX = -0.7071;
    const dirY = 0.7071;

    const newArrow: ArrowAnnotation = {
      id: Date.now().toString(),
      // Tail starts at top-right (right side)
      startX: Math.round(cx - half * dirX),
      startY: Math.round(cy - half * dirY),
      // Arrowhead (점) at bottom-left (left side)
      endX: Math.round(cx + half * dirX),
      endY: Math.round(cy + half * dirY),
      color: defaultArrowColor,
      width: defaultArrowWidth,
      length: len,
      angleDeg: -45,
    };

    const nextArrows = [...arrows, newArrow];
    setArrows(nextArrows);
    setSelectedId(newArrow.id);
    setSelectedType('arrow');
    setActiveTool('arrow');
    pushHistorySnapshot(undefined, nextArrows);
  };

  const updateSelectedArrow = (patch: Partial<ArrowAnnotation>) => {
    if (!activeArrow) return;
    const updated = arrows.map((a) => (a.id === activeArrow.id ? { ...a, ...patch } : a));
    setArrows(updated);
  };

  const setArrowAngle = (newDeg: number, customDirX?: number, customDirY?: number) => {
    if (!activeArrow) return;
    let dirX: number;
    let dirY: number;

    if (customDirX !== undefined && customDirY !== undefined) {
      dirX = customDirX;
      dirY = customDirY;
    } else {
      const rad = (newDeg * Math.PI) / 180;
      dirX = Math.cos(rad);
      dirY = -Math.sin(rad); // UP is negative Y in screen space
    }

    const len = activeArrow.length || defaultArrowLength;
    // Keep arrowhead (endX, endY) fixed at the target point, and rotate the tail
    const updated: ArrowAnnotation = {
      ...activeArrow,
      angleDeg: newDeg,
      startX: Math.round(activeArrow.endX - len * dirX),
      startY: Math.round(activeArrow.endY - len * dirY),
    };
    const nextArrows = arrows.map((a) => (a.id === activeArrow.id ? updated : a));
    setArrows(nextArrows);
    pushHistorySnapshot(undefined, nextArrows);
  };

  const setArrowLength = (newLen: number) => {
    if (!activeArrow) return;
    const dx = activeArrow.endX - activeArrow.startX;
    const dy = activeArrow.endY - activeArrow.startY;
    const curDist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const ux = dx / curDist;
    const uy = dy / curDist;

    // Keep arrowhead (endX, endY) fixed at target, extend or retract the tail (startX, startY)
    const updated: ArrowAnnotation = {
      ...activeArrow,
      length: newLen,
      startX: Math.round(activeArrow.endX - newLen * ux),
      startY: Math.round(activeArrow.endY - newLen * uy),
    };
    const nextArrows = arrows.map((a) => (a.id === activeArrow.id ? updated : a));
    setArrows(nextArrows);
  };

  const deleteSelectedArrow = () => {
    if (!activeArrow) return;
    const nextArrows = arrows.filter((a) => a.id !== activeArrow.id);
    setArrows(nextArrows);
    setSelectedId(null);
    setSelectedType(null);
    setEditingInlineId(null);
    pushHistorySnapshot(undefined, nextArrows);
  };

  // -------------------------------------------------------------
  // Tool: CALLOUT (화살표 말풍선) Management
  // -------------------------------------------------------------
  const activeCallout =
    selectedType === 'callout' ? callouts.find((c) => c.id === selectedId) || null : null;

  const handleAddNewCallout = (targetCenterX?: number, targetCenterY?: number) => {
    const cx = targetCenterX ?? Math.round(canvasDims.width / 2);
    const cy = targetCenterY ?? Math.round(canvasDims.height / 2);

    const newCallout: CalloutAnnotation = {
      id: Date.now().toString(),
      text: defaultCalloutText,
      boxX: cx,
      boxY: cy - 45,
      targetX: cx,
      targetY: cy + 30,
      fontSize: defaultCalloutFontSize,
      textColor: '#111827',
      bgColor: 'rgba(243, 244, 246, 0.88)', // translucent light gray
      borderColor: 'rgba(209, 213, 219, 0.9)',
      arrowColor: defaultCalloutArrowColor,
      arrowWidth: 4,
    };

    const nextCallouts = [...callouts, newCallout];
    setCallouts(nextCallouts);
    setSelectedId(newCallout.id);
    setSelectedType('callout');
    setActiveTool('callout');
    setEditingInlineId(newCallout.id);
    pushHistorySnapshot(undefined, undefined, nextCallouts);
  };

  const updateSelectedCallout = (patch: Partial<CalloutAnnotation>) => {
    if (!activeCallout) return;
    const updated = callouts.map((c) => (c.id === activeCallout.id ? { ...c, ...patch } : c));
    setCallouts(updated);
  };

  const setCalloutPointerDirection = (dir: 'down' | 'up' | 'left' | 'right') => {
    if (!activeCallout) return;
    const geom = getCalloutGeometry(activeCallout);
    let tx = activeCallout.boxX;
    let ty = activeCallout.boxY;
    const pointerOffset = 36; // compact tail

    if (dir === 'down') {
      ty = activeCallout.boxY + geom.boxH / 2 + pointerOffset;
    } else if (dir === 'up') {
      ty = activeCallout.boxY - geom.boxH / 2 - pointerOffset;
    } else if (dir === 'left') {
      tx = activeCallout.boxX - geom.boxW / 2 - pointerOffset;
    } else if (dir === 'right') {
      tx = activeCallout.boxX + geom.boxW / 2 + pointerOffset;
    }

    const updated = {
      ...activeCallout,
      targetX: Math.round(tx),
      targetY: Math.round(ty),
    };
    const nextCallouts = callouts.map((c) => (c.id === activeCallout.id ? updated : c));
    setCallouts(nextCallouts);
    pushHistorySnapshot(undefined, undefined, nextCallouts);
  };

  const deleteSelectedCallout = () => {
    if (!activeCallout) return;
    const nextCallouts = callouts.filter((c) => c.id !== activeCallout.id);
    setCallouts(nextCallouts);
    setSelectedId(null);
    setSelectedType(null);
    setEditingInlineId(null);
    pushHistorySnapshot(undefined, undefined, nextCallouts);
  };

  // -------------------------------------------------------------
  // Tool: TEXT Management (Re-clickable, Re-movable, Re-editable)
  // -------------------------------------------------------------
  const activeText =
    selectedType === 'text' ? texts.find((t) => t.id === selectedId) || null : null;

  const handleAddNewText = (targetCenterX?: number, targetCenterY?: number) => {
    const cx = targetCenterX ?? Math.round(canvasDims.width / 2);
    const cy = targetCenterY ?? Math.round(canvasDims.height / 2);

    const newText: TextAnnotation = {
      id: Date.now().toString(),
      text: defaultTextContent,
      x: cx,
      y: cy,
      fontSize: defaultTextFontSize,
      color: defaultTextColor,
      bgColor: defaultTextBg,
    };

    const nextTexts = [...texts, newText];
    setTexts(nextTexts);
    setSelectedId(newText.id);
    setSelectedType('text');
    setActiveTool('text');
    setEditingInlineId(newText.id);
    pushHistorySnapshot(undefined, undefined, undefined, nextTexts);
  };

  const updateSelectedText = (patch: Partial<TextAnnotation>) => {
    if (!activeText) return;
    const updated = texts.map((t) => (t.id === activeText.id ? { ...t, ...patch } : t));
    setTexts(updated);
  };

  const alignSelectedText = (pos: 'center' | 'top' | 'bottom') => {
    if (!activeText) return;
    let ny = Math.round(canvasDims.height / 2);
    if (pos === 'top') ny = Math.round(canvasDims.height * 0.15);
    if (pos === 'bottom') ny = Math.round(canvasDims.height * 0.85);

    const updated = {
      ...activeText,
      x: Math.round(canvasDims.width / 2),
      y: ny,
    };
    const nextTexts = texts.map((t) => (t.id === activeText.id ? updated : t));
    setTexts(nextTexts);
    pushHistorySnapshot(undefined, undefined, undefined, nextTexts);
  };

  const deleteSelectedText = () => {
    if (!activeText) return;
    const nextTexts = texts.filter((t) => t.id !== activeText.id);
    setTexts(nextTexts);
    setSelectedId(null);
    setSelectedType(null);
    setEditingInlineId(null);
    pushHistorySnapshot(undefined, undefined, undefined, nextTexts);
  };

  // Keyboard shortcut for Delete / Backspace key to remove selected object
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingInlineId) return;
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && selectedType) {
        e.preventDefault();
        if (selectedType === 'arrow') deleteSelectedArrow();
        else if (selectedType === 'callout') deleteSelectedCallout();
        else if (selectedType === 'text') deleteSelectedText();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedType, editingInlineId, activeArrow, activeCallout, activeText, arrows, callouts, texts]);

  // -------------------------------------------------------------
  // Window-level Mouse Movement for Smooth Dragging
  // -------------------------------------------------------------
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!dragInfo.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasDims.width / rect.width;
      const scaleY = canvasDims.height / rect.height;

      const deltaX = (e.clientX - dragInfo.current.startClientX) * scaleX;
      const deltaY = (e.clientY - dragInfo.current.startClientY) * scaleY;
      const { kind, id, initialSnapshot } = dragInfo.current;

      if (kind === 'arrow-body') {
        setArrows((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  startX: Math.round(initialSnapshot.startX + deltaX),
                  startY: Math.round(initialSnapshot.startY + deltaY),
                  endX: Math.round(initialSnapshot.endX + deltaX),
                  endY: Math.round(initialSnapshot.endY + deltaY),
                }
              : a
          )
        );
      } else if (kind === 'arrow-head') {
        const curEndX = initialSnapshot.endX + deltaX;
        const curEndY = initialSnapshot.endY + deltaY;
        const dx = curEndX - initialSnapshot.startX;
        const dy = curEndY - initialSnapshot.startY;
        let deg = Math.round((-Math.atan2(dy, dx) * 180) / Math.PI);
        if (deg < 0) deg += 360;
        const len = Math.round(Math.max(Math.sqrt(dx * dx + dy * dy), 40));

        setArrows((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  endX: Math.round(curEndX),
                  endY: Math.round(curEndY),
                  length: len,
                  angleDeg: deg,
                }
              : a
          )
        );
      } else if (kind === 'arrow-tail') {
        const curStartX = initialSnapshot.startX + deltaX;
        const curStartY = initialSnapshot.startY + deltaY;
        const dx = initialSnapshot.endX - curStartX;
        const dy = initialSnapshot.endY - curStartY;
        let deg = Math.round((-Math.atan2(dy, dx) * 180) / Math.PI);
        if (deg < 0) deg += 360;
        const len = Math.round(Math.max(Math.sqrt(dx * dx + dy * dy), 40));

        setArrows((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  startX: Math.round(curStartX),
                  startY: Math.round(curStartY),
                  length: len,
                  angleDeg: deg,
                }
              : a
          )
        );
      } else if (kind === 'callout-box') {
        // Dragging the box also moves target together smoothly
        setCallouts((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  boxX: Math.round(initialSnapshot.boxX + deltaX),
                  boxY: Math.round(initialSnapshot.boxY + deltaY),
                  targetX: Math.round(initialSnapshot.targetX + deltaX),
                  targetY: Math.round(initialSnapshot.targetY + deltaY),
                }
              : c
          )
        );
      } else if (kind === 'callout-target') {
        // Dragging just the arrow target pointer
        setCallouts((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  targetX: Math.round(initialSnapshot.targetX + deltaX),
                  targetY: Math.round(initialSnapshot.targetY + deltaY),
                }
              : c
          )
        );
      } else if (kind === 'text') {
        setTexts((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  x: Math.round(initialSnapshot.x + deltaX),
                  y: Math.round(initialSnapshot.y + deltaY),
                }
              : t
          )
        );
      }
    };

    const handleWindowMouseUp = () => {
      if (dragInfo.current) {
        dragInfo.current = null;
        pushHistorySnapshot();
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [canvasDims]);

  // -------------------------------------------------------------
  // Canvas Mouse Events (Crop & Mosaic drawing, or clicking empty space)
  // -------------------------------------------------------------
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setEditingInlineId(null);
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'crop') {
      isDraggingCrop.current = true;
      cropStartPos.current = { x, y };
      setCropRect({ x, y, w: 0, h: 0 });
    } else if (activeTool === 'mosaic') {
      isDraggingCrop.current = true;
      cropStartPos.current = { x, y };
      setMosaicRect({ x, y, w: 0, h: 0 });
    } else if (activeTool === 'arrow') {
      // Clicking empty area with arrow tool adds new arrow at cursor
      handleAddNewArrow(Math.round(x), Math.round(y));
    } else if (activeTool === 'callout') {
      // Clicking empty area with callout tool adds new callout at cursor
      handleAddNewCallout(Math.round(x), Math.round(y));
    } else if (activeTool === 'text') {
      // Clicking empty area adds new text at cursor
      handleAddNewText(Math.round(x), Math.round(y));
    } else if (activeTool === 'select') {
      // Unselect
      setSelectedId(null);
      setSelectedType(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'crop' && isDraggingCrop.current && cropStartPos.current) {
      let w = x - cropStartPos.current.x;
      let h = y - cropStartPos.current.y;
      const ratio = getAspectRatioMultiplier(selectedCropRatio);

      if (ratio !== null) {
        const absW = Math.abs(w);
        const signW = Math.sign(w) || 1;
        const signH = Math.sign(h) || 1;
        h = (absW / ratio) * signH;
      }

      const rectX = w < 0 ? cropStartPos.current.x + w : cropStartPos.current.x;
      const rectY = h < 0 ? cropStartPos.current.y + h : cropStartPos.current.y;

      setCropRect({
        x: Math.max(0, rectX),
        y: Math.max(0, rectY),
        w: Math.abs(w),
        h: Math.abs(h),
      });
    } else if (activeTool === 'mosaic' && isDraggingCrop.current && cropStartPos.current) {
      const w = x - cropStartPos.current.x;
      const h = y - cropStartPos.current.y;
      const rectX = w < 0 ? cropStartPos.current.x + w : cropStartPos.current.x;
      const rectY = h < 0 ? cropStartPos.current.y + h : cropStartPos.current.y;

      setMosaicRect({
        x: Math.max(0, rectX),
        y: Math.max(0, rectY),
        w: Math.abs(w),
        h: Math.abs(h),
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (activeTool === 'crop') {
      isDraggingCrop.current = false;
      cropStartPos.current = null;
    } else if (activeTool === 'mosaic' && mosaicRect) {
      isDraggingCrop.current = false;
      cropStartPos.current = null;
      if (mosaicRect.w > 6 && mosaicRect.h > 6) {
        applyMosaic(mosaicRect);
      }
      setMosaicRect(null);
    }
  };

  // -------------------------------------------------------------
  // Final Save & Export: Bake All Annotations onto Canvas
  // -------------------------------------------------------------
  const handleSaveAndClose = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImageRef.current, 0, 0, canvas.width, canvas.height);

    // 2. Draw all arrows
    arrows.forEach((a) => drawArrowOnCanvas(ctx, a));

    // 3. Draw all callouts
    callouts.forEach((c) => drawCalloutOnCanvas(ctx, c));

    // 4. Draw all texts
    texts.forEach((t) => drawTextOnCanvas(ctx, t));

    const finalDataUrl = canvas.toDataURL('image/png');
    onSave(image.id, finalDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Top Header */}
        <div className="h-14 px-4 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
              <span>스튜디오 이미지 에디터</span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                {canvasDims.width} × {canvasDims.height} px
              </span>
            </h3>
            <span className="text-xs text-zinc-400 truncate max-w-[200px] hidden md:inline-block">
              {image.originalName}
            </span>
          </div>

          {/* Undo / Redo / Reset & Save */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-800/80 rounded-xl p-1 border border-zinc-700 mr-2">
              <button
                type="button"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="되돌리기 (Undo, Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="다시 실행 (Redo, Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-zinc-700 mx-1" />
              <button
                type="button"
                onClick={resetToOriginal}
                className="p-1.5 rounded-lg text-zinc-300 hover:text-rose-400 hover:bg-zinc-700 transition-colors"
                title="원본 초기화 (Reset)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveAndClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs sm:text-sm shadow-sm transition-all"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>편집 완료</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Primary Tool Selector Bar */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            {[
              { id: 'crop', label: '자르기', icon: Crop },
              { id: 'arrow', label: '굵은 화살표', icon: ArrowUpRight },
              { id: 'callout', label: '화살표 말풍선', icon: MessageSquare },
              { id: 'text', label: '텍스트 삽입', icon: Type },
              { id: 'mosaic', label: '모자이크', icon: Grid },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setActiveTool(tool.id as EditorTool);
                    if (tool.id === 'arrow' && !activeArrow && arrows.length > 0) {
                      setSelectedId(arrows[arrows.length - 1].id);
                      setSelectedType('arrow');
                    } else if (tool.id === 'callout' && !activeCallout && callouts.length > 0) {
                      setSelectedId(callouts[callouts.length - 1].id);
                      setSelectedType('callout');
                    } else if (tool.id === 'text' && !activeText && texts.length > 0) {
                      setSelectedId(texts[texts.length - 1].id);
                      setSelectedType('text');
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-zinc-100 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-toolbar Controls per Active Tool */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* 1. Crop Options */}
            {activeTool === 'crop' && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">비율:</span>
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {(['free', '1:1', '3:4', '16:9', '4:3'] as AspectRatioOption[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedCropRatio(r)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        selectedCropRatio === r
                          ? 'bg-zinc-800 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {r === 'free' ? '자유' : r}
                    </button>
                  ))}
                </div>

                {cropRect && cropRect.w > 10 && cropRect.h > 10 && (
                  <button
                    type="button"
                    onClick={applyCrop}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>자르기 적용</span>
                  </button>
                )}
              </div>
            )}

            {/* 2. Arrow Options (Length, Angle Presets, Width, Colors) */}
            {activeTool === 'arrow' && (
              <div className="flex items-center flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleAddNewArrow()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors border border-zinc-700 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>화살표 추가</span>
                </button>

                {/* Color Picker */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {[
                    { label: '빨강', color: '#EF4444' },
                    { label: '노랑', color: '#EAB308' },
                    { label: '파랑', color: '#3B82F6' },
                    { label: '초록', color: '#10B981' },
                    { label: '보라', color: '#A855F7' },
                    { label: '검정', color: '#18181B' },
                    { label: '흰색', color: '#FFFFFF' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => {
                        setDefaultArrowColor(c.color);
                        updateSelectedArrow({ color: c.color });
                      }}
                      className={`w-4 h-4 rounded-full border transition-transform ${
                        (activeArrow?.color || defaultArrowColor) === c.color
                          ? 'scale-125 border-white ring-1 ring-white'
                          : 'border-zinc-600 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>

                {/* Arrow Tail Length Slider */}
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400">꼬리 길이:</span>
                  <input
                    type="range"
                    min="60"
                    max="400"
                    step="10"
                    value={activeArrow?.length || defaultArrowLength}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDefaultArrowLength(val);
                      setArrowLength(val);
                    }}
                    className="w-20 accent-emerald-400 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-zinc-300 w-8 text-right">
                    {activeArrow?.length || defaultArrowLength}px
                  </span>
                </div>

                {/* Arrow Angle Presets */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {[
                    { deg: -45, label: '-45° (기본)', icon: ArrowDownLeft, dirX: -0.7071, dirY: 0.7071, title: '기본: 좌측 점, 우측 꼬리 (-45° 좌하향)' },
                    { deg: 180, label: '180°', icon: ArrowLeft, dirX: -1, dirY: 0, title: '좌측 수평 (180°)' },
                    { deg: 135, label: '135°', icon: ArrowUpLeft, dirX: -0.7071, dirY: -0.7071, title: '좌상단 (135°)' },
                    { deg: 0, label: '0°', icon: ArrowRight, dirX: 1, dirY: 0, title: '우측 수평 (0°)' },
                    { deg: 45, label: '45°', icon: ArrowUpRight, dirX: 0.7071, dirY: -0.7071, title: '우상단 (45°)' },
                    { deg: 90, label: '90°', icon: ArrowUp, dirX: 0, dirY: -1, title: '상단 (90°)' },
                    { deg: 270, label: '270°', icon: ArrowDown, dirX: 0, dirY: 1, title: '하단 (270°)' },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = activeArrow && Math.round(activeArrow.angleDeg) === p.deg;
                    return (
                      <button
                        key={p.deg}
                        type="button"
                        onClick={() => setArrowAngle(p.deg, p.dirX, p.dirY)}
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }`}
                        title={p.title}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      if (!activeArrow) return;
                      const next = (activeArrow.angleDeg + 45) % 360;
                      setArrowAngle(next);
                    }}
                    className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
                    title="+45° 회전"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                </div>

                {/* Arrow Width Slider */}
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400">굵기:</span>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    step="2"
                    value={activeArrow?.width || defaultArrowWidth}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDefaultArrowWidth(val);
                      updateSelectedArrow({ width: val });
                    }}
                    className="w-16 accent-emerald-400 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-zinc-300 w-5">
                    {activeArrow?.width || defaultArrowWidth}
                  </span>
                </div>

                {/* Delete Button */}
                {activeArrow && (
                  <button
                    type="button"
                    onClick={deleteSelectedArrow}
                    className="p-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors"
                    title="선택 화살표 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* 3. Callout Options (화살표 말풍선: Text input, pointer directions, colors) */}
            {activeTool === 'callout' && (
              <div className="flex items-center flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleAddNewCallout()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors border border-zinc-700 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>말풍선 추가</span>
                </button>

                {/* Text input */}
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  <input
                    type="text"
                    value={activeCallout ? activeCallout.text : defaultCalloutText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDefaultCalloutText(val);
                      updateSelectedCallout({ text: val });
                    }}
                    placeholder="말풍선 설명 입력"
                    className="bg-transparent border-none text-white text-xs focus:outline-none w-36 sm:w-44 placeholder-zinc-500"
                  />
                </div>

                {/* Font Size Slider */}
                <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400">크기:</span>
                  <input
                    type="range"
                    min="14"
                    max="34"
                    step="2"
                    value={activeCallout?.fontSize || defaultCalloutFontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDefaultCalloutFontSize(val);
                      updateSelectedCallout({ fontSize: val });
                    }}
                    className="w-16 accent-emerald-400 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-zinc-300 w-5">
                    {activeCallout?.fontSize || defaultCalloutFontSize}
                  </span>
                </div>

                {/* Arrow Color Picker */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400 text-[11px] ml-1 mr-0.5">화살표:</span>
                  {[
                    { label: '빨강', color: '#EF4444' },
                    { label: '파랑', color: '#3B82F6' },
                    { label: '주황', color: '#F97316' },
                    { label: '초록', color: '#10B981' },
                    { label: '차콜', color: '#374151' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => {
                        setDefaultCalloutArrowColor(c.color);
                        updateSelectedCallout({ arrowColor: c.color });
                      }}
                      className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                        (activeCallout?.arrowColor || defaultCalloutArrowColor) === c.color
                          ? 'scale-125 border-white ring-1 ring-white'
                          : 'border-zinc-600 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>

                {/* Pointer Direction Presets */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400 text-[11px] ml-1 mr-0.5">방향:</span>
                  {[
                    { dir: 'down' as const, label: '아래', icon: ArrowDown },
                    { dir: 'up' as const, label: '위', icon: ArrowUp },
                    { dir: 'left' as const, label: '좌측', icon: ArrowLeft },
                    { dir: 'right' as const, label: '우측', icon: ArrowRight },
                  ].map((d) => {
                    const Icon = d.icon;
                    return (
                      <button
                        key={d.dir}
                        type="button"
                        onClick={() => setCalloutPointerDirection(d.dir)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        title={`${d.label} 가리키기`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Delete Callout */}
                {activeCallout && (
                  <button
                    type="button"
                    onClick={deleteSelectedCallout}
                    className="p-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors"
                    title="선택 말풍선 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* 4. Text Options (Re-clickable & Re-movable text) */}
            {activeTool === 'text' && (
              <div className="flex items-center flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleAddNewText()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors border border-zinc-700 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>텍스트 추가</span>
                </button>

                {/* Text String Input */}
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  <input
                    type="text"
                    value={activeText ? activeText.text : defaultTextContent}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDefaultTextContent(val);
                      updateSelectedText({ text: val });
                    }}
                    placeholder="강조 텍스트 입력"
                    className="bg-transparent border-none text-white text-xs focus:outline-none w-32 sm:w-40 placeholder-zinc-500"
                  />
                </div>

                {/* Font Size Slider */}
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400">크기:</span>
                  <input
                    type="range"
                    min="16"
                    max="64"
                    step="2"
                    value={activeText?.fontSize || defaultTextFontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDefaultTextFontSize(val);
                      updateSelectedText({ fontSize: val });
                    }}
                    className="w-16 accent-emerald-400 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-zinc-300 w-5">
                    {activeText?.fontSize || defaultTextFontSize}
                  </span>
                </div>

                {/* Text Color */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {[
                    { label: '흰색', color: '#FFFFFF' },
                    { label: '노랑', color: '#FACC15' },
                    { label: '빨강', color: '#EF4444' },
                    { label: '파랑', color: '#38BDF8' },
                    { label: '검정', color: '#000000' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => {
                        setDefaultTextColor(c.color);
                        updateSelectedText({ color: c.color });
                      }}
                      className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                        (activeText?.color || defaultTextColor) === c.color
                          ? 'scale-125 border-white ring-1 ring-white'
                          : 'border-zinc-600 opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>

                {/* Background Badge Style */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {[
                    { id: 'dark' as const, label: '블랙 박스' },
                    { id: 'light' as const, label: '화이트 박스' },
                    { id: 'yellow' as const, label: '옐로우 박스' },
                    { id: 'none' as const, label: '박스 없음' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setDefaultTextBg(b.id);
                        updateSelectedText({ bgColor: b.id });
                      }}
                      className={`px-1.5 py-0.5 rounded text-[11px] transition-colors ${
                        (activeText?.bgColor || defaultTextBg) === b.id
                          ? 'bg-zinc-700 text-white font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => alignSelectedText('center')}
                    className="px-1.5 py-0.5 rounded text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800"
                    title="화면 가운데 정렬"
                  >
                    중앙
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedText('top')}
                    className="px-1.5 py-0.5 rounded text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800"
                    title="상단 정렬"
                  >
                    상단
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelectedText('bottom')}
                    className="px-1.5 py-0.5 rounded text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800"
                    title="하단 정렬"
                  >
                    하단
                  </button>
                </div>

                {/* Delete Text */}
                {activeText && (
                  <button
                    type="button"
                    onClick={deleteSelectedText}
                    className="p-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-colors"
                    title="선택 텍스트 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* 5. Mosaic Options */}
            {activeTool === 'mosaic' && (
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">블록 크기:</span>
                <input
                  type="range"
                  min="8"
                  max="32"
                  step="4"
                  value={mosaicBlockSize}
                  onChange={(e) => setMosaicBlockSize(parseInt(e.target.value, 10))}
                  className="w-20 accent-amber-400 cursor-pointer"
                />
                <span className="text-[11px] font-mono text-zinc-300">{mosaicBlockSize}px</span>
                <span className="text-[11px] text-amber-400/90 ml-2">
                  가리고 싶은 영역을 드래그하면 즉시 적용됩니다.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Working Area with Interactive Annotation Overlays */}
        <div
          ref={containerRef}
          className="flex-1 bg-zinc-950/90 overflow-auto p-4 flex items-center justify-center min-h-[360px] relative select-none"
        >
          <div className="relative inline-block shadow-2xl border border-zinc-800/80 rounded-md overflow-hidden">
            {/* Base HTML5 Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`block max-h-[70vh] max-w-[85vw] w-auto h-auto object-contain ${
                activeTool === 'crop' || activeTool === 'mosaic'
                  ? 'cursor-crosshair'
                  : activeTool === 'arrow' || activeTool === 'callout' || activeTool === 'text'
                  ? 'cursor-crosshair'
                  : 'cursor-default'
              }`}
            />

            {/* Crop Overlay */}
            {activeTool === 'crop' && cropRect && canvasRef.current && (
              <div
                style={{
                  left: `${(cropRect.x / canvasDims.width) * 100}%`,
                  top: `${(cropRect.y / canvasDims.height) * 100}%`,
                  width: `${(cropRect.w / canvasDims.width) * 100}%`,
                  height: `${(cropRect.h / canvasDims.height) * 100}%`,
                }}
                className="absolute pointer-events-none border-2 border-emerald-400 bg-emerald-500/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
              >
                <div className="absolute top-1 left-1 bg-black/80 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                  {Math.round(cropRect.w)} × {Math.round(cropRect.h)}
                </div>
              </div>
            )}

            {/* Mosaic Drag Overlay */}
            {activeTool === 'mosaic' && mosaicRect && canvasRef.current && (
              <div
                style={{
                  left: `${(mosaicRect.x / canvasDims.width) * 100}%`,
                  top: `${(mosaicRect.y / canvasDims.height) * 100}%`,
                  width: `${(mosaicRect.w / canvasDims.width) * 100}%`,
                  height: `${(mosaicRect.h / canvasDims.height) * 100}%`,
                }}
                className="absolute pointer-events-none border-2 border-dashed border-amber-400 bg-amber-400/20 backdrop-blur-sm"
              />
            )}

            {/* Vector SVG Layer for All Interactive Arrows */}
            {arrows.length > 0 && canvasRef.current && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${canvasDims.width} ${canvasDims.height}`}
              >
                {arrows.map((arrow) => {
                  const geom = getArrowGeometry(
                    arrow.startX,
                    arrow.startY,
                    arrow.endX,
                    arrow.endY,
                    arrow.width
                  );
                  const isSelected = selectedType === 'arrow' && selectedId === arrow.id;

                  return (
                    <g key={arrow.id} className="pointer-events-auto">
                      {/* Invisible Wide Hit Area for Dragging the Entire Arrow */}
                      <line
                        x1={arrow.startX}
                        y1={arrow.startY}
                        x2={arrow.endX}
                        y2={arrow.endY}
                        stroke="transparent"
                        strokeWidth={Math.max(arrow.width + 24, 38)}
                        strokeLinecap="round"
                        className="cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedId(arrow.id);
                          setSelectedType('arrow');
                          setActiveTool('arrow');
                          dragInfo.current = {
                            kind: 'arrow-body',
                            id: arrow.id,
                            startClientX: e.clientX,
                            startClientY: e.clientY,
                            initialSnapshot: { ...arrow },
                          };
                        }}
                      />

                      {/* Visible Arrow Shaft (Guaranteed 100% visible at all angles: 0, 45, 90, 180, 270, -45) */}
                      <line
                        x1={geom.startX}
                        y1={geom.startY}
                        x2={geom.shaftEndX}
                        y2={geom.shaftEndY}
                        stroke={arrow.color}
                        strokeWidth={arrow.width}
                        strokeLinecap="round"
                        className="pointer-events-none"
                        style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.5))' }}
                      />

                      {/* Visible Clean Arrowhead */}
                      <polygon
                        points={geom.polygonPoints}
                        fill={arrow.color}
                        className="pointer-events-none"
                        style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.5))' }}
                      />

                      {/* If Selected: Render Tail Anchor and Head Anchor (Rock-solid, no flickering or jumping) */}
                      {isSelected && (
                        <>
                          {/* Tail Anchor Handle - Wide Hit Target */}
                          <circle
                            cx={arrow.startX}
                            cy={arrow.startY}
                            r={18}
                            fill="transparent"
                            className="cursor-grab active:cursor-grabbing"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              dragInfo.current = {
                                kind: 'arrow-tail',
                                id: arrow.id,
                                startClientX: e.clientX,
                                startClientY: e.clientY,
                                initialSnapshot: { ...arrow },
                              };
                            }}
                          />
                          {/* Tail Anchor Handle - Visible Stable Circle */}
                          <circle
                            cx={arrow.startX}
                            cy={arrow.startY}
                            r={8}
                            fill="#FFFFFF"
                            stroke={arrow.color}
                            strokeWidth={3}
                            className="pointer-events-none"
                            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                          />

                          {/* Head Anchor Handle - Wide Hit Target */}
                          <circle
                            cx={arrow.endX}
                            cy={arrow.endY}
                            r={18}
                            fill="transparent"
                            className="cursor-crosshair"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              dragInfo.current = {
                                kind: 'arrow-head',
                                id: arrow.id,
                                startClientX: e.clientX,
                                startClientY: e.clientY,
                                initialSnapshot: { ...arrow },
                              };
                            }}
                          />
                          {/* Head Anchor Handle - Visible Stable Circle */}
                          <circle
                            cx={arrow.endX}
                            cy={arrow.endY}
                            r={8}
                            fill="#FFFFFF"
                            stroke={arrow.color}
                            strokeWidth={3}
                            className="pointer-events-none"
                            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Floating Action Bar for Selected Arrow (Immediate on-object delete button) */}
            {selectedType === 'arrow' && activeArrow && (
              <div
                style={{
                  left: `${((activeArrow.startX + activeArrow.endX) / 2 / canvasDims.width) * 100}%`,
                  top: `${((activeArrow.startY + activeArrow.endY) / 2 / canvasDims.height) * 100}%`,
                  transform:
                    (activeArrow.startY + activeArrow.endY) / 2 / canvasDims.height < 0.14
                      ? 'translate(-50%, 35px)'
                      : 'translate(-50%, -45px)',
                }}
                className="absolute z-40 flex items-center gap-1.5 bg-zinc-950/95 border border-zinc-700 shadow-2xl px-2.5 py-1 rounded-full text-xs pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none"
              >
                <span className="text-[11px] text-zinc-300 font-semibold px-1">화살표</span>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSelectedArrow();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
                  title="화살표 바로 삭제 (Delete키)"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>삭제</span>
                </button>
              </div>
            )}

            {/* SVG Layer for Callout Pointer Arrows */}
            {callouts.length > 0 && canvasRef.current && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={`0 0 ${canvasDims.width} ${canvasDims.height}`}
              >
                {callouts.map((callout) => {
                  const geom = getCalloutGeometry(callout);
                  const isSelected = selectedType === 'callout' && selectedId === callout.id;

                  return (
                    <g key={callout.id} className="pointer-events-auto">
                      {/* Short compact pointer shaft */}
                      <line
                        x1={geom.edgeX}
                        y1={geom.edgeY}
                        x2={callout.targetX}
                        y2={callout.targetY}
                        stroke={callout.arrowColor}
                        strokeWidth={callout.arrowWidth}
                        strokeLinecap="round"
                      />

                      {/* Arrowhead at target point */}
                      <polygon points={geom.pointerPolygon} fill={callout.arrowColor} />

                      {/* Target Draggable Anchor Handle (Stable, no flickering) */}
                      {isSelected && (
                        <>
                          <circle
                            cx={callout.targetX}
                            cy={callout.targetY}
                            r={18}
                            fill="transparent"
                            className="cursor-crosshair"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              dragInfo.current = {
                                kind: 'callout-target',
                                id: callout.id,
                                startClientX: e.clientX,
                                startClientY: e.clientY,
                                initialSnapshot: { ...callout },
                              };
                            }}
                          />
                          <circle
                            cx={callout.targetX}
                            cy={callout.targetY}
                            r={8}
                            fill="#FFFFFF"
                            stroke={callout.arrowColor}
                            strokeWidth={3}
                            className="pointer-events-none"
                            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Floating Action Bar for Selected Callout (Immediate on-object delete and edit button) */}
            {selectedType === 'callout' && activeCallout && (
              <div
                style={{
                  left: `${(activeCallout.boxX / canvasDims.width) * 100}%`,
                  top: `${(activeCallout.boxY / canvasDims.height) * 100}%`,
                  transform:
                    activeCallout.boxY / canvasDims.height < 0.14
                      ? 'translate(-50%, 55px)'
                      : 'translate(-50%, -55px)',
                }}
                className="absolute z-40 flex items-center gap-1.5 bg-zinc-950/95 border border-zinc-700 shadow-2xl px-2.5 py-1 rounded-full text-xs pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingInlineId(activeCallout.id);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition-colors cursor-pointer border border-zinc-600"
                  title="글자 직접 수정 (더블클릭 가능)"
                >
                  <Pencil className="w-3 h-3 text-emerald-400" />
                  <span>글자 수정</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSelectedCallout();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
                  title="말풍선 바로 삭제 (Delete키)"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>삭제</span>
                </button>
              </div>
            )}

            {/* Interactive Callout Text Boxes with In-Canvas Text Editing */}
            {callouts.map((callout) => {
              const isSelected = selectedType === 'callout' && selectedId === callout.id;
              const isInlineEditing = editingInlineId === callout.id;

              return (
                <div
                  key={callout.id}
                  style={{
                    left: `${(callout.boxX / canvasDims.width) * 100}%`,
                    top: `${(callout.boxY / canvasDims.height) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(callout.id);
                    setSelectedType('callout');
                    setActiveTool('callout');
                    if (!isInlineEditing) {
                      dragInfo.current = {
                        kind: 'callout-box',
                        id: callout.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        initialSnapshot: { ...callout },
                      };
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(callout.id);
                    setSelectedType('callout');
                    setActiveTool('callout');
                    setEditingInlineId(callout.id);
                  }}
                  className={`absolute z-30 select-none ${
                    isInlineEditing ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'
                  } touch-none transition-shadow ${
                    isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black/70' : ''
                  }`}
                >
                  {/* The Rounded Translucent Light-Gray Box */}
                  <div
                    style={{
                      fontSize: `${Math.max(12, Math.round(callout.fontSize * canvasDisplayScale))}px`,
                      color: callout.textColor,
                      backgroundColor: callout.bgColor,
                      borderColor: callout.borderColor,
                      padding: `${Math.round(Math.max(8, callout.fontSize * canvasDisplayScale * 0.4))}px ${Math.round(Math.max(14, callout.fontSize * canvasDisplayScale * 0.7))}px`,
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                    className="font-bold whitespace-nowrap rounded-xl shadow-lg border text-center flex items-center justify-center min-w-[70px] select-none"
                  >
                    {isInlineEditing ? (
                      <input
                        ref={inlineInputRef}
                        type="text"
                        value={callout.text}
                        autoFocus
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          updateSelectedCallout({ text: e.target.value });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingInlineId(null);
                            pushHistorySnapshot();
                          } else if (e.key === 'Escape') {
                            setEditingInlineId(null);
                          }
                        }}
                        onBlur={() => {
                          setEditingInlineId(null);
                          pushHistorySnapshot();
                        }}
                        style={{
                          fontSize: 'inherit',
                          color: 'inherit',
                          minWidth: '70px',
                          width: `${Math.max(80, (callout.text.length + 2) * (callout.fontSize * canvasDisplayScale * 0.65))}px`,
                        }}
                        className="bg-transparent border-b-2 border-emerald-500 text-center font-bold outline-none px-1 py-0 select-text"
                        placeholder="설명 입력"
                      />
                    ) : (
                      <span title="더블클릭하여 캔버스에서 직접 글자 수정">{callout.text || '설명 입력'}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Floating Action Bar for Selected Text (Immediate on-object delete and edit button) */}
            {selectedType === 'text' && activeText && (
              <div
                style={{
                  left: `${(activeText.x / canvasDims.width) * 100}%`,
                  top: `${(activeText.y / canvasDims.height) * 100}%`,
                  transform:
                    activeText.y / canvasDims.height < 0.14
                      ? 'translate(-50%, 48px)'
                      : 'translate(-50%, -48px)',
                }}
                className="absolute z-40 flex items-center gap-1.5 bg-zinc-950/95 border border-zinc-700 shadow-2xl px-2.5 py-1 rounded-full text-xs pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 select-none"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingInlineId(activeText.id);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition-colors cursor-pointer border border-zinc-600"
                  title="글자 직접 수정 (더블클릭 가능)"
                >
                  <Pencil className="w-3 h-3 text-emerald-400" />
                  <span>글자 수정</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSelectedText();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
                  title="텍스트 바로 삭제 (Delete키)"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>삭제</span>
                </button>
              </div>
            )}

            {/* Interactive Text Annotations with In-Canvas Text Editing */}
            {texts.map((textItem) => {
              const isSelected = selectedType === 'text' && selectedId === textItem.id;
              const isInlineEditing = editingInlineId === textItem.id;

              return (
                <div
                  key={textItem.id}
                  style={{
                    left: `${(textItem.x / canvasDims.width) * 100}%`,
                    top: `${(textItem.y / canvasDims.height) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(textItem.id);
                    setSelectedType('text');
                    setActiveTool('text');
                    if (!isInlineEditing) {
                      dragInfo.current = {
                        kind: 'text',
                        id: textItem.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        initialSnapshot: { ...textItem },
                      };
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(textItem.id);
                    setSelectedType('text');
                    setActiveTool('text');
                    setEditingInlineId(textItem.id);
                  }}
                  className={`absolute z-30 select-none ${
                    isInlineEditing ? 'cursor-text' : 'cursor-grab active:cursor-grabbing'
                  } touch-none ${
                    isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black/70' : ''
                  }`}
                >
                  <div
                    style={{
                      fontSize: `${Math.max(12, Math.round(textItem.fontSize * canvasDisplayScale))}px`,
                      color: textItem.color,
                      backgroundColor:
                        textItem.bgColor === 'dark'
                          ? '#000000'
                          : textItem.bgColor === 'light'
                          ? '#FFFFFF'
                          : textItem.bgColor === 'yellow'
                          ? '#FACC15'
                          : 'transparent',
                      padding:
                        textItem.bgColor !== 'none'
                          ? `${Math.round(Math.max(6, textItem.fontSize * canvasDisplayScale * 0.35))}px ${Math.round(Math.max(10, textItem.fontSize * canvasDisplayScale * 0.55))}px`
                          : '0px',
                      textShadow:
                        textItem.bgColor === 'none'
                          ? '0 2px 6px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                          : undefined,
                    }}
                    className={`font-bold whitespace-nowrap rounded-lg shadow-xl flex items-center justify-center min-w-[60px] select-none ${
                      textItem.bgColor !== 'none'
                        ? textItem.bgColor === 'light'
                          ? 'border border-zinc-300'
                          : 'border border-black/20'
                        : ''
                    }`}
                  >
                    {isInlineEditing ? (
                      <input
                        ref={inlineInputRef}
                        type="text"
                        value={textItem.text}
                        autoFocus
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          updateSelectedText({ text: e.target.value });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingInlineId(null);
                            pushHistorySnapshot();
                          } else if (e.key === 'Escape') {
                            setEditingInlineId(null);
                          }
                        }}
                        onBlur={() => {
                          setEditingInlineId(null);
                          pushHistorySnapshot();
                        }}
                        style={{
                          fontSize: 'inherit',
                          color: 'inherit',
                          minWidth: '60px',
                          width: `${Math.max(70, (textItem.text.length + 2) * (textItem.fontSize * canvasDisplayScale * 0.65))}px`,
                        }}
                        className="bg-transparent border-b-2 border-emerald-500 text-center font-bold outline-none px-1 py-0 select-text"
                        placeholder="텍스트 입력"
                      />
                    ) : (
                      <span title="더블클릭하여 캔버스에서 직접 글자 수정">{textItem.text || '텍스트 입력'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Hint Footer */}
        <div className="h-10 px-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-3">
            <span>
              {activeTool === 'crop' && '💡 자르고 싶은 영역을 드래그한 후 [자르기 적용]을 누르세요.'}
              {activeTool === 'arrow' &&
                '💡 화살표를 클릭하면 바로 삭제 버튼이 나타나며, 꼬리 길이와 각도 버튼 또는 앵커로 조절할 수 있습니다.'}
              {activeTool === 'callout' &&
                '💡 말풍선을 클릭하면 삭제 및 글자 수정 버튼이 표시되며, 더블클릭하여 캔버스에서 직접 글자를 수정할 수 있습니다.'}
              {activeTool === 'text' &&
                '💡 텍스트를 클릭하면 삭제 및 수정 버튼이 표시되며, 더블클릭하여 캔버스에서 바로 글자를 수정할 수 있습니다.'}
              {activeTool === 'mosaic' && '💡 가리고 싶은 영역을 드래그하면 모자이크가 즉시 적용됩니다.'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-zinc-500">
            <span className="hidden sm:inline">실행 취소: Ctrl+Z</span>
            <span>
              요소: 화살표 {arrows.length}개 · 말풍선 {callouts.length}개 · 텍스트 {texts.length}개
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
