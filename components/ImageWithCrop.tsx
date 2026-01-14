'use client';

import { useRef, useState, MouseEvent, TouchEvent, useEffect, useCallback } from 'react';

interface ImageWithCropProps {
  imageSrc: string;
  onCropAreaChange: (area: { x: number; y: number; width: number; height: number } | null) => void;
  onBrushMaskChange?: (maskFile: File | null) => void;
  cropArea?: { x: number; y: number; width: number; height: number } | null;
  onClearSelection?: () => void;
  onModeChange?: (mode: 'brush' | 'box') => void;
}

export default function ImageWithCrop({ imageSrc, onCropAreaChange, onBrushMaskChange, cropArea, onClearSelection, onModeChange }: ImageWithCropProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [mode, setMode] = useState<'brush' | 'box'>('box');
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushPoints, setBrushPoints] = useState<Array<{ x: number; y: number } | null>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState<'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'create' | null>(null);
  const [hoverResizeType, setHoverResizeType] = useState<'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const extractMaskTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevCropAreaRef = useRef<typeof cropArea>(cropArea);

  const calculateImageDisplaySize = useCallback(() => {
    if (!containerRef.current || !imageRef.current || imageNaturalSize.width === 0) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
    const containerAspect = containerWidth / containerHeight;
    
    let displayWidth: number;
    let displayHeight: number;
    let offsetX: number;
    let offsetY: number;
    
    if (imageAspect > containerAspect) {
      displayWidth = containerWidth;
      displayHeight = containerWidth / imageAspect;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      displayWidth = containerHeight * imageAspect;
      displayHeight = containerHeight;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }
    
    setImageDisplaySize({ width: displayWidth, height: displayHeight, offsetX, offsetY });
    setContainerSize({ width: containerWidth, height: containerHeight });
  }, [imageNaturalSize]);

  useEffect(() => {
    const updateSize = () => {
      calculateImageDisplaySize();
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [calculateImageDisplaySize]);

  useEffect(() => {
    if (imageLoaded) {
      calculateImageDisplaySize();
    }
  }, [imageLoaded, calculateImageDisplaySize]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
  };


  useEffect(() => {
    if (cropArea && imageLoaded && imageDisplaySize.width > 0) {
      const scaleX = imageDisplaySize.width / imageNaturalSize.width;
      const scaleY = imageDisplaySize.height / imageNaturalSize.height;
      setCropBox({
        x: imageDisplaySize.offsetX + cropArea.x * scaleX,
        y: imageDisplaySize.offsetY + cropArea.y * scaleY,
        width: cropArea.width * scaleX,
        height: cropArea.height * scaleY,
      });
    } else if (!cropArea && prevCropAreaRef.current) {
      // 当cropArea从有值变为null时（外部清除），同步清除内部状态
      if (mode === 'brush') {
        setBrushPoints([]);
        setIsDrawing(false);
      }
      setCropBox(null);
    }
    prevCropAreaRef.current = cropArea;
  }, [cropArea, imageLoaded, imageDisplaySize, imageNaturalSize, mode]);


  // 切换模式时清除状态，并通知父组件
  useEffect(() => {
    if (onModeChange) {
      onModeChange(mode);
    }
    
    if (mode === 'box') {
      setBrushPoints([]);
      setIsDrawing(false);
    } else if (mode === 'brush') {
      setIsDragging(false);
      setDragType(null);
      setSelectionStart(null);
      // 切换到涂抹模式时，清除框选生成的图片
      if (onBrushMaskChange) {
        onBrushMaskChange(null);
      }
    }
  }, [mode, onBrushMaskChange, onModeChange]);

  // 绘制涂抹轨迹（黄色透明画笔）或框选框
  useEffect(() => {
    if (canvasRef.current && imageDisplaySize.width > 0 && containerSize.width > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = containerSize.width;
      canvas.height = containerSize.height;

      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 框选模式：绘制框选框
      if (mode === 'box' && cropBox) {
        // 使用白色边框和半透明填充，更优雅的样式
        ctx.strokeStyle = '#ffffff'; // 白色边框
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // 白色半透明填充
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.fillRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
        ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
        
        // 绘制调整手柄（白色外圈，灰色内圈）- 四角 + 四边中点
        const handleSize = 10;
        const handleBorder = 2;
        const centers = [
          // 四角
          { x: cropBox.x, y: cropBox.y },
          { x: cropBox.x + cropBox.width, y: cropBox.y },
          { x: cropBox.x, y: cropBox.y + cropBox.height },
          { x: cropBox.x + cropBox.width, y: cropBox.y + cropBox.height },
          // 边中点
          { x: cropBox.x + cropBox.width / 2, y: cropBox.y },
          { x: cropBox.x + cropBox.width / 2, y: cropBox.y + cropBox.height },
          { x: cropBox.x, y: cropBox.y + cropBox.height / 2 },
          { x: cropBox.x + cropBox.width, y: cropBox.y + cropBox.height / 2 },
        ];

        // 外圈（白色）
        ctx.fillStyle = '#ffffff';
        centers.forEach((c) => {
          ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize);
        });

        // 内圈（灰色）
        ctx.fillStyle = '#6b7280';
        centers.forEach((c) => {
        ctx.fillRect(
            c.x - handleSize / 2 + handleBorder,
            c.y - handleSize / 2 + handleBorder,
          handleSize - handleBorder * 2,
          handleSize - handleBorder * 2
        );
        });
        return;
      }

      // 涂抹模式：绘制画笔轨迹
      if (mode !== 'brush') return;

      // 使用黄色透明画笔绘制涂抹轨迹
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.15)'; // 黄色巨透明
      ctx.fillStyle = 'rgba(255, 235, 59, 0.15)'; // 黄色巨透明
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (brushPoints.length > 0) {
        // 分段绘制，遇到null时重新开始路径
        let currentPath: Array<{ x: number; y: number }> = [];
        
        for (let i = 0; i < brushPoints.length; i++) {
          const point = brushPoints[i];
          
          if (point === null) {
            // 遇到分隔符，绘制当前路径并重新开始
            if (currentPath.length > 0) {
              ctx.beginPath();
              ctx.moveTo(currentPath[0].x, currentPath[0].y);
              for (let j = 1; j < currentPath.length; j++) {
                ctx.lineTo(currentPath[j].x, currentPath[j].y);
              }
              ctx.stroke();
              
              // 绘制点
              currentPath.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
                ctx.fill();
              });
            }
            currentPath = [];
          } else {
            currentPath.push(point);
          }
        }
        
        // 绘制最后一段路径
        if (currentPath.length > 0) {
          ctx.beginPath();
          ctx.moveTo(currentPath[0].x, currentPath[0].y);
          for (let j = 1; j < currentPath.length; j++) {
            ctx.lineTo(currentPath[j].x, currentPath[j].y);
          }
          ctx.stroke();
          
          // 绘制点
          currentPath.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }
    }
  }, [brushPoints, imageDisplaySize, containerSize, mode, cropBox]);

  // 创建mask并提取选中的区域
  const extractMaskedImage = useCallback(async () => {
    const validPoints = brushPoints.filter((p): p is { x: number; y: number } => p !== null);
    if (!imageRef.current || !imageLoaded || validPoints.length === 0 || !onBrushMaskChange) return;

    const img = imageRef.current;
    const scaleX = imageNaturalSize.width / imageDisplaySize.width;
    const scaleY = imageNaturalSize.height / imageDisplaySize.height;

    // 创建mask canvas（使用原图尺寸）
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = imageNaturalSize.width;
    maskCanvas.height = imageNaturalSize.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // 在mask上绘制涂抹路径（白色表示选中）
    maskCtx.fillStyle = 'white';
    maskCtx.strokeStyle = 'white';
    maskCtx.lineWidth = 20 * scaleX; // 根据缩放调整画笔大小
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';

    if (brushPoints.length > 0) {
      // 分段绘制，遇到null时重新开始路径
      let currentPath: Array<{ x: number; y: number }> = [];
      
      for (let i = 0; i < brushPoints.length; i++) {
        const point = brushPoints[i];
        
        if (point === null) {
          // 遇到分隔符，绘制当前路径并重新开始
          if (currentPath.length > 0) {
            maskCtx.beginPath();
            const firstPoint = currentPath[0];
            maskCtx.moveTo(
              (firstPoint.x - imageDisplaySize.offsetX) * scaleX,
              (firstPoint.y - imageDisplaySize.offsetY) * scaleY
            );
            for (let j = 1; j < currentPath.length; j++) {
              const p = currentPath[j];
              maskCtx.lineTo(
                (p.x - imageDisplaySize.offsetX) * scaleX,
                (p.y - imageDisplaySize.offsetY) * scaleY
              );
            }
            maskCtx.stroke();
            
            // 绘制点
            currentPath.forEach(p => {
              maskCtx.beginPath();
              maskCtx.arc(
                (p.x - imageDisplaySize.offsetX) * scaleX,
                (p.y - imageDisplaySize.offsetY) * scaleY,
                10 * Math.max(scaleX, scaleY),
                0,
                Math.PI * 2
              );
              maskCtx.fill();
            });
          }
          currentPath = [];
        } else {
          currentPath.push(point);
        }
      }
      
      // 绘制最后一段路径
      if (currentPath.length > 0) {
        maskCtx.beginPath();
        const firstPoint = currentPath[0];
        maskCtx.moveTo(
          (firstPoint.x - imageDisplaySize.offsetX) * scaleX,
          (firstPoint.y - imageDisplaySize.offsetY) * scaleY
        );
        for (let j = 1; j < currentPath.length; j++) {
          const p = currentPath[j];
          maskCtx.lineTo(
            (p.x - imageDisplaySize.offsetX) * scaleX,
            (p.y - imageDisplaySize.offsetY) * scaleY
          );
        }
        maskCtx.stroke();
        
        // 绘制点
        currentPath.forEach(p => {
          maskCtx.beginPath();
          maskCtx.arc(
            (p.x - imageDisplaySize.offsetX) * scaleX,
            (p.y - imageDisplaySize.offsetY) * scaleY,
            10 * Math.max(scaleX, scaleY),
            0,
            Math.PI * 2
          );
          maskCtx.fill();
        });
      }
    }

    // 获取mask的bounding box
    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    let minX = maskCanvas.width;
    let maxX = 0;
    let minY = maskCanvas.height;
    let maxY = 0;
    let hasMask = false;

    for (let y = 0; y < maskCanvas.height; y++) {
      for (let x = 0; x < maskCanvas.width; x++) {
        const idx = (y * maskCanvas.width + x) * 4;
        if (imageData.data[idx] > 0) { // 白色像素
          hasMask = true;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (!hasMask) {
      onBrushMaskChange(null);
      return;
    }

    // 添加一些padding
    const padding = 5;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(maskCanvas.width, maxX + padding);
    maxY = Math.min(maskCanvas.height, maxY + padding);

    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;

    // 创建最终图片canvas
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = bboxWidth;
    resultCanvas.height = bboxHeight;
    const resultCtx = resultCanvas.getContext('2d');
    if (!resultCtx) return;

    // 绘制原图
    resultCtx.drawImage(img, minX, minY, bboxWidth, bboxHeight, 0, 0, bboxWidth, bboxHeight);

    // 应用mask：只保留mask标记的像素
    const resultImageData = resultCtx.getImageData(0, 0, bboxWidth, bboxHeight);
    const maskImageData = maskCtx.getImageData(minX, minY, bboxWidth, bboxHeight);

    for (let i = 0; i < resultImageData.data.length; i += 4) {
      const maskAlpha = maskImageData.data[i]; // mask的红色通道（因为是白色）
      if (maskAlpha === 0) {
        // 未选中的区域设为透明
        resultImageData.data[i + 3] = 0; // alpha通道
      }
    }

    resultCtx.putImageData(resultImageData, 0, 0);

    // 转换为blob
    const blob = await new Promise<Blob | null>((resolve) => {
      resultCanvas.toBlob(resolve, 'image/png');
    });

    if (blob) {
      const file = new File([blob], 'masked-image.png', { type: 'image/png' });
      onBrushMaskChange(file);
      
      // 同时更新cropArea用于显示预览
      const cropData = {
        x: minX,
        y: minY,
        width: bboxWidth,
        height: bboxHeight,
      };
      onCropAreaChange(cropData);
    } else {
      onBrushMaskChange(null);
    }
  }, [imageRef, imageLoaded, brushPoints, imageDisplaySize, imageNaturalSize, onBrushMaskChange, onCropAreaChange]);

  // 计算涂抹区域的bounding box
  const calculateBrushBoundingBox = useCallback(() => {
    const validPoints = brushPoints.filter((p): p is { x: number; y: number } => p !== null);
    if (validPoints.length === 0) return null;

    const minX = Math.min(...validPoints.map(p => p.x));
    const maxX = Math.max(...validPoints.map(p => p.x));
    const minY = Math.min(...validPoints.map(p => p.y));
    const maxY = Math.max(...validPoints.map(p => p.y));

    // 确保在图片区域内
    const x = Math.max(imageDisplaySize.offsetX, minX - 10);
    const y = Math.max(imageDisplaySize.offsetY, minY - 10);
    const width = Math.min(imageDisplaySize.offsetX + imageDisplaySize.width - x, maxX - minX + 20);
    const height = Math.min(imageDisplaySize.offsetY + imageDisplaySize.height - y, maxY - minY + 20);

    return { x, y, width, height };
  }, [brushPoints, imageDisplaySize]);

  // 更新cropBox当brushPoints变化时（不调用extractMaskedImage避免无限循环）
  useEffect(() => {
    if (brushPoints.length > 0) {
      const bbox = calculateBrushBoundingBox();
      if (bbox) {
        setCropBox(bbox);
      }
    } else if (brushPoints.length === 0) {
      setCropBox(null);
      if (onBrushMaskChange) {
        onBrushMaskChange(null);
      }
      onCropAreaChange(null);
    }
  }, [brushPoints, calculateBrushBoundingBox, onBrushMaskChange, onCropAreaChange]);

  // 更新预览图（涂抹模式下显示应用mask后的预览，使用防抖优化性能）
  useEffect(() => {
    // 清除之前的timer
    if (extractMaskTimerRef.current) {
      clearTimeout(extractMaskTimerRef.current);
    }

    if (!cropBox || !previewCanvasRef.current || !imageRef.current || !imageLoaded || brushPoints.length === 0) {
      if (previewCanvasRef.current) {
        // 清除预览图
        const previewCanvas = previewCanvasRef.current;
        const ctx = previewCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
      }
      return;
    }

    // 使用防抖延迟更新预览
    extractMaskTimerRef.current = setTimeout(() => {
      if (cropBox && previewCanvasRef.current && imageRef.current && imageLoaded && brushPoints.length > 0) {
        const previewCanvas = previewCanvasRef.current;
        const ctx = previewCanvas.getContext('2d');
        if (!ctx) return;

        const previewSize = 120;
        previewCanvas.width = previewSize;
        previewCanvas.height = previewSize;

        // 计算裁剪区域在原图中的位置
        const scaleX = imageNaturalSize.width / imageDisplaySize.width;
        const scaleY = imageNaturalSize.height / imageDisplaySize.height;
        
        const sourceX = (cropBox.x - imageDisplaySize.offsetX) * scaleX;
        const sourceY = (cropBox.y - imageDisplaySize.offsetY) * scaleY;
        const sourceWidth = cropBox.width * scaleX;
        const sourceHeight = cropBox.height * scaleY;

        // 创建临时canvas来应用mask
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceWidth;
        tempCanvas.height = sourceHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // 绘制原图区域
        tempCtx.drawImage(
          imageRef.current,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          sourceWidth,
          sourceHeight
        );

        // 创建mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = sourceWidth;
        maskCanvas.height = sourceHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return;

        // 在mask上绘制涂抹路径
        maskCtx.fillStyle = 'white';
        maskCtx.strokeStyle = 'white';
        const brushSize = 20 * Math.max(scaleX, scaleY);
        maskCtx.lineWidth = brushSize;
        maskCtx.lineCap = 'round';
        maskCtx.lineJoin = 'round';

        if (brushPoints.length > 0) {
          // 分段绘制，遇到null时重新开始路径
          let currentPath: Array<{ x: number; y: number }> = [];
          
          for (let i = 0; i < brushPoints.length; i++) {
            const point = brushPoints[i];
            
            if (point === null) {
              // 遇到分隔符，绘制当前路径并重新开始
              if (currentPath.length > 0) {
                maskCtx.beginPath();
                const firstPoint = currentPath[0];
                maskCtx.moveTo(
                  (firstPoint.x - imageDisplaySize.offsetX) * scaleX - sourceX,
                  (firstPoint.y - imageDisplaySize.offsetY) * scaleY - sourceY
                );
                for (let j = 1; j < currentPath.length; j++) {
                  const p = currentPath[j];
                  maskCtx.lineTo(
                    (p.x - imageDisplaySize.offsetX) * scaleX - sourceX,
                    (p.y - imageDisplaySize.offsetY) * scaleY - sourceY
                  );
                }
                maskCtx.stroke();
                
                // 绘制点
                currentPath.forEach(p => {
                  maskCtx.beginPath();
                  maskCtx.arc(
                    (p.x - imageDisplaySize.offsetX) * scaleX - sourceX,
                    (p.y - imageDisplaySize.offsetY) * scaleY - sourceY,
                    brushSize / 2,
                    0,
                    Math.PI * 2
                  );
                  maskCtx.fill();
                });
              }
              currentPath = [];
            } else {
              currentPath.push(point);
            }
          }
          
          // 绘制最后一段路径
          if (currentPath.length > 0) {
            maskCtx.beginPath();
            const firstPoint = currentPath[0];
            maskCtx.moveTo(
              (firstPoint.x - imageDisplaySize.offsetX) * scaleX - sourceX,
              (firstPoint.y - imageDisplaySize.offsetY) * scaleY - sourceY
            );
            for (let j = 1; j < currentPath.length; j++) {
              const p = currentPath[j];
              maskCtx.lineTo(
                (p.x - imageDisplaySize.offsetX) * scaleX - sourceX,
                (p.y - imageDisplaySize.offsetY) * scaleY - sourceY
              );
            }
            maskCtx.stroke();
            
            // 绘制点
            currentPath.forEach(p => {
              maskCtx.beginPath();
              maskCtx.arc(
                (p.x - imageDisplaySize.offsetX) * scaleX - sourceX,
                (p.y - imageDisplaySize.offsetY) * scaleY - sourceY,
                brushSize / 2,
                0,
                Math.PI * 2
              );
              maskCtx.fill();
            });
          }
        }

        // 应用mask到图片
        const imageData = tempCtx.getImageData(0, 0, sourceWidth, sourceHeight);
        const maskImageData = maskCtx.getImageData(0, 0, sourceWidth, sourceHeight);

        for (let i = 0; i < imageData.data.length; i += 4) {
          const maskAlpha = maskImageData.data[i]; // mask的红色通道（因为是白色）
          if (maskAlpha === 0) {
            // 未选中的区域设为透明
            imageData.data[i + 3] = 0; // alpha通道
          }
        }

        tempCtx.putImageData(imageData, 0, 0);

        // 计算预览图的缩放比例
        const previewScale = Math.min(previewSize / sourceWidth, previewSize / sourceHeight);
        const previewWidth = sourceWidth * previewScale;
        const previewHeight = sourceHeight * previewScale;
        const previewX = (previewSize - previewWidth) / 2;
        const previewY = (previewSize - previewHeight) / 2;

        // 绘制预览图（带透明背景）
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, previewSize, previewSize);
        ctx.drawImage(
          tempCanvas,
          0,
          0,
          sourceWidth,
          sourceHeight,
          previewX,
          previewY,
          previewWidth,
          previewHeight
        );
      }
    }, 150); // 150ms防抖

    return () => {
      if (extractMaskTimerRef.current) {
        clearTimeout(extractMaskTimerRef.current);
      }
    };
  }, [cropBox, imageLoaded, imageDisplaySize, imageNaturalSize, brushPoints]);

  // 涂抹模式的事件处理
  const handleBrushStart = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPosFromEvent(e);
    
    // 检查是否在图片区域内
    if (
      pos.x < imageDisplaySize.offsetX ||
      pos.x > imageDisplaySize.offsetX + imageDisplaySize.width ||
      pos.y < imageDisplaySize.offsetY ||
      pos.y > imageDisplaySize.offsetY + imageDisplaySize.height
    ) {
      return;
    }

    setIsDrawing(true);
    // 支持多次涂抹：新的涂抹开始时添加分隔符，然后添加新点
    setBrushPoints(prev => {
      // 如果之前有涂抹且当前不在绘制中，添加null作为分隔符
      if (prev.length > 0 && !isDrawing) {
        return [...prev, null, pos];
      }
      return [...prev, pos];
    });
  };

  const handleBrushMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing || mode !== 'brush') return;
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const pos = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    // 检查是否在图片区域内
    if (
      pos.x >= imageDisplaySize.offsetX &&
      pos.x <= imageDisplaySize.offsetX + imageDisplaySize.width &&
      pos.y >= imageDisplaySize.offsetY &&
      pos.y <= imageDisplaySize.offsetY + imageDisplaySize.height
    ) {
      setBrushPoints(prev => [...prev, pos]);
    }
  }, [isDrawing, mode, imageDisplaySize]);

  const handleBrushEnd = useCallback(async () => {
    if (!isDrawing || mode !== 'brush') return;
    setIsDrawing(false);
    
    // 涂抹结束时提取mask
    const validPoints = brushPoints.filter((p): p is { x: number; y: number } => p !== null);
    if (validPoints.length > 0) {
      await extractMaskedImage();
    } else {
      if (onBrushMaskChange) {
        onBrushMaskChange(null);
      }
      onCropAreaChange(null);
    }
  }, [isDrawing, mode, brushPoints, extractMaskedImage, onBrushMaskChange, onCropAreaChange]);

  useEffect(() => {
    if (isDrawing && mode === 'brush') {
      const handleMove = (e: Event) => {
        const event = e as unknown as MouseEvent | TouchEvent;
        if ('touches' in event) {
          event.preventDefault();
        }
        handleBrushMove(event);
      };
      const handleEnd = (e?: Event) => {
        if (e && 'touches' in e) {
          e.preventDefault();
        }
        handleBrushEnd();
      };
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd, { passive: false });
      // 阻止页面滚动
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
        document.body.style.overflow = '';
      };
    }
  }, [isDrawing, mode, handleBrushMove, handleBrushEnd]);


  const getPosFromEvent = (e: MouseEvent | TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  // 框选模式：获取调整类型（支持四角和边中点）
  const getResizeType = (x: number, y: number): 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'create' | null => {
    if (!cropBox) return 'create';
    
    const { x: boxX, y: boxY, width, height } = cropBox;
    const handleSize = 10;
    const isInBox = x >= boxX && x <= boxX + width && y >= boxY && y <= boxY + height;
    
    if (!isInBox) return 'create';
    
    // 检查是否在调整手柄上（四角 + 四边中点）
    const isNearLeft = Math.abs(x - boxX) < handleSize;
    const isNearRight = Math.abs(x - (boxX + width)) < handleSize;
    const isNearTop = Math.abs(y - boxY) < handleSize;
    const isNearBottom = Math.abs(y - (boxY + height)) < handleSize;
    
    // 角
    if (isNearLeft && isNearTop) return 'nw';
    if (isNearRight && isNearTop) return 'ne';
    if (isNearLeft && isNearBottom) return 'sw';
    if (isNearRight && isNearBottom) return 'se';
    // 边
    if (isNearLeft) return 'w';
    if (isNearRight) return 'e';
    if (isNearTop) return 'n';
    if (isNearBottom) return 's';
    
    // 其余在框内区域为拖动
    return 'move';
  };

  // 框选模式：开始拖拽
  const handleBoxStart = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    if (mode !== 'box') return;
    e.preventDefault();
    e.stopPropagation();
    const pos = getPosFromEvent(e);
    
    const resizeType = getResizeType(pos.x, pos.y);

    // 点击框外：清除选择框
    if (cropBox && resizeType === 'create') {
      setCropBox(null);
      setSelectionStart(null);
      setIsDragging(false);
      setDragType(null);
      onCropAreaChange(null);
      if (onBrushMaskChange) {
        onBrushMaskChange(null);
      }
      return;
    }

    setDragType(resizeType);
    setIsDragging(true);
    setDragStart(pos);
    
    if (resizeType === 'create') {
      setSelectionStart(pos);
      setCropBox(null);
    }
  };

  // 框选模式：拖拽移动
  const handleBoxMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || mode !== 'box') return;
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let clientX: number;
    let clientY: number;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const pos = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    
    if (dragType === 'create' && selectionStart) {
      const x = Math.min(selectionStart.x, pos.x);
      const y = Math.min(selectionStart.y, pos.y);
      const width = Math.abs(pos.x - selectionStart.x);
      const height = Math.abs(pos.y - selectionStart.y);
      
      // 限制在图片区域内
      const constrainedX = Math.max(imageDisplaySize.offsetX, Math.min(x, imageDisplaySize.offsetX + imageDisplaySize.width));
      const constrainedY = Math.max(imageDisplaySize.offsetY, Math.min(y, imageDisplaySize.offsetY + imageDisplaySize.height));
      const constrainedWidth = Math.min(width, imageDisplaySize.offsetX + imageDisplaySize.width - constrainedX);
      const constrainedHeight = Math.min(height, imageDisplaySize.offsetY + imageDisplaySize.height - constrainedY);
      
      setCropBox({ x: constrainedX, y: constrainedY, width: constrainedWidth, height: constrainedHeight });
    } else if (dragType === 'move' && cropBox) {
      const deltaX = pos.x - dragStart.x;
      const deltaY = pos.y - dragStart.y;
      
      let newX = cropBox.x + deltaX;
      let newY = cropBox.y + deltaY;
      
      // 限制在图片区域内
      newX = Math.max(imageDisplaySize.offsetX, Math.min(newX, imageDisplaySize.offsetX + imageDisplaySize.width - cropBox.width));
      newY = Math.max(imageDisplaySize.offsetY, Math.min(newY, imageDisplaySize.offsetY + imageDisplaySize.height - cropBox.height));
      
      setCropBox({ ...cropBox, x: newX, y: newY });
      setDragStart(pos);
    } else if (cropBox && dragType && dragType !== 'create' && dragType !== 'move') {
      const deltaX = pos.x - dragStart.x;
      const deltaY = pos.y - dragStart.y;
      const minWidth = 20;
      const minHeight = 20;

      const minX = imageDisplaySize.offsetX;
      const maxX = imageDisplaySize.offsetX + imageDisplaySize.width;
      const minY = imageDisplaySize.offsetY;
      const maxY = imageDisplaySize.offsetY + imageDisplaySize.height;

      let { x, y, width, height } = cropBox;
      const right = x + width;
      const bottom = y + height;

      // 右侧（e / ne / se）
      if (dragType.includes('e')) {
        const newRight = Math.min(Math.max(right + deltaX, x + minWidth), maxX);
        width = newRight - x;
      }

      // 左侧（w / nw / sw）
      if (dragType.includes('w')) {
        const newLeft = Math.max(Math.min(x + deltaX, right - minWidth), minX);
        width = right - newLeft;
        x = newLeft;
      }

      // 底边（s / se / sw）
      if (dragType.includes('s')) {
        const newBottom = Math.min(Math.max(bottom + deltaY, y + minHeight), maxY);
        height = newBottom - y;
      }

      // 顶边（n / ne / nw）
      if (dragType.includes('n')) {
        const newTop = Math.max(Math.min(y + deltaY, bottom - minHeight), minY);
        height = bottom - newTop;
        y = newTop;
      }

      setCropBox({ x, y, width, height });
      setDragStart(pos);
    }
  }, [isDragging, mode, dragType, cropBox, dragStart, selectionStart, imageDisplaySize]);

  // 框选模式：根据鼠标位置更新 hover 光标
  const handleBoxHoverMove = (e: MouseEvent<HTMLDivElement>) => {
    if (mode !== 'box' || isDragging) {
      setHoverResizeType(null);
      return;
    }
    if (!cropBox) {
      setHoverResizeType(null);
      return;
    }

    const pos = getPosFromEvent(e);
    const type = getResizeType(pos.x, pos.y);

    if (type === 'create') {
      setHoverResizeType(null);
    } else {
      setHoverResizeType(type === 'move' ? 'move' : type);
    }
  };

  // 框选模式：提取选中区域的图片
  const extractBoxImage = useCallback(async () => {
    if (!imageRef.current || !imageLoaded || !cropBox || mode !== 'box' || !onBrushMaskChange) return;
    
    const img = imageRef.current;
    const scaleX = imageNaturalSize.width / imageDisplaySize.width;
    const scaleY = imageNaturalSize.height / imageDisplaySize.height;
    
    // 转换为相对于图片的坐标
    const cropX = (cropBox.x - imageDisplaySize.offsetX) * scaleX;
    const cropY = (cropBox.y - imageDisplaySize.offsetY) * scaleY;
    const cropWidth = cropBox.width * scaleX;
    const cropHeight = cropBox.height * scaleY;
    
    // 确保坐标在图片范围内
    const x = Math.max(0, Math.min(cropX, imageNaturalSize.width));
    const y = Math.max(0, Math.min(cropY, imageNaturalSize.height));
    const width = Math.max(1, Math.min(cropWidth, imageNaturalSize.width - x));
    const height = Math.max(1, Math.min(cropHeight, imageNaturalSize.height - y));
    
    // 创建canvas并提取选中区域
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = width;
    resultCanvas.height = height;
    const resultCtx = resultCanvas.getContext('2d');
    if (!resultCtx) return;
    
    // 绘制选中区域
    resultCtx.drawImage(img, x, y, width, height, 0, 0, width, height);
    
    // 转换为blob
    const blob = await new Promise<Blob | null>((resolve) => {
      resultCanvas.toBlob(resolve, 'image/png');
    });
    
    if (blob) {
      const file = new File([blob], 'box-selected-image.png', { type: 'image/png' });
      onBrushMaskChange(file);
    } else {
      onBrushMaskChange(null);
    }
  }, [imageRef, imageLoaded, cropBox, mode, imageDisplaySize, imageNaturalSize, onBrushMaskChange]);

  // 框选模式：结束拖拽
  const handleBoxEnd = useCallback(async () => {
    if (!isDragging || mode !== 'box') return;
    setIsDragging(false);
    setDragType(null);
    setSelectionStart(null);
    
    if (cropBox && cropBox.width > 10 && cropBox.height > 10) {
      // 转换为相对于图片的坐标
      const scaleX = imageNaturalSize.width / imageDisplaySize.width;
      const scaleY = imageNaturalSize.height / imageDisplaySize.height;
      
      const cropArea = {
        x: (cropBox.x - imageDisplaySize.offsetX) * scaleX,
        y: (cropBox.y - imageDisplaySize.offsetY) * scaleY,
        width: cropBox.width * scaleX,
        height: cropBox.height * scaleY,
      };
      
      onCropAreaChange(cropArea);
      // 提取选中区域的图片
      await extractBoxImage();
    }
  }, [isDragging, mode, cropBox, imageDisplaySize, imageNaturalSize, onCropAreaChange, extractBoxImage]);

  // 框选模式：全局事件监听
  useEffect(() => {
    if (isDragging && mode === 'box') {
      const handleMove = (e: Event) => {
        const event = e as unknown as MouseEvent | TouchEvent;
        if ('touches' in event) {
          event.preventDefault();
        }
        handleBoxMove(event);
      };
      const handleEnd = (e?: Event) => {
        if (e && 'touches' in e) {
          e.preventDefault();
        }
        handleBoxEnd();
      };
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd, { passive: false });
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, mode, handleBoxMove, handleBoxEnd]);


  // 根据拖拽/hover 状态确定光标样式
  const cursor = (() => {
    if (mode !== 'box') return 'default';
    const type = isDragging ? dragType : hoverResizeType;
    switch (type) {
      case 'move':
        return 'move';
      case 'n':
        return 'n-resize';
      case 's':
        return 's-resize';
      case 'e':
        return 'e-resize';
      case 'w':
        return 'w-resize';
      case 'ne':
        return 'ne-resize';
      case 'nw':
        return 'nw-resize';
      case 'se':
        return 'se-resize';
      case 'sw':
        return 'sw-resize';
      default:
        return 'crosshair';
    }
  })();

  return (
    <div className="relative w-full h-[500px] bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      <div
        ref={containerRef}
        className="relative w-full h-full select-none"
        style={{ touchAction: 'none', cursor }}
        onMouseDown={handleBoxStart}
        onTouchStart={handleBoxStart}
        onMouseMove={handleBoxHoverMove}
        onMouseLeave={() => setHoverResizeType(null)}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt="预览"
          className="w-full h-full object-contain"
          onLoad={handleImageLoad}
        />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-20 pointer-events-none"
          style={{ touchAction: 'none' }}
        />
      </div>
      
      {/* 左下角模式切换按钮（已隐藏，默认使用框选模式） */}
    </div>
  );
}
