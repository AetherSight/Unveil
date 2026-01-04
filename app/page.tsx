'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEYS = {
  boxThreshold: 'unveil_box_threshold',
  textThreshold: 'unveil_text_threshold',
  topK: 'unveil_top_k',
};
import Image from 'next/image';
import ImageUpload from '@/components/ImageUpload';
import ImageWithCrop from '@/components/ImageWithCrop';
import PredictionResults from '@/components/PredictionResults';
import PredictionResultsSkeleton from '@/components/PredictionResultsSkeleton';
import SegmentResults, { partLabels } from '@/components/SegmentResults';
import LoadingSpinner from '@/components/LoadingSpinner';
import { predictEquipment, segmentImage, removeBackground } from '@/lib/api';
import type { PredictionResult, SegmentResponse } from '@/lib/types';

type ProcessingState = 'idle' | 'predicting' | 'complete' | 'error';
type ResultView = 'prediction' | 'segment';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [boxThreshold, setBoxThreshold] = useState(0.3);
  const [textThreshold, setTextThreshold] = useState(0.25);
  const [displayCount, setDisplayCount] = useState(5);
  const [isClient, setIsClient] = useState(false);
  const [selectedPart, setSelectedPart] = useState<'head' | 'upper' | 'lower' | 'shoes' | 'hands' | null>(null);
  const [brushMaskFile, setBrushMaskFile] = useState<File | null>(null);
  const [segmentResults, setSegmentResults] = useState<SegmentResponse | null>(null);
  const [segmentState, setSegmentState] = useState<'idle' | 'segmenting' | 'complete' | 'error'>('idle');
  const [resultView, setResultView] = useState<ResultView>('prediction');
  const [selectedSegmentPart, setSelectedSegmentPart] = useState<keyof SegmentResponse | null>(null);
  const [removedBackgroundImage, setRemovedBackgroundImage] = useState<string | null>(null); // base64 string for debug
  const [selectionMode, setSelectionMode] = useState<'brush' | 'box'>('brush'); // 当前选择模式，默认涂抹
  const lastProcessedRef = useRef<{
    imageKey: string | null;
    cropAreaKey: string | null;
    boxThreshold: number | null;
    textThreshold: number | null;
  }>({ imageKey: null, cropAreaKey: null, boxThreshold: null, textThreshold: null });

  useEffect(() => {
    setIsClient(true);
    const savedBoxThreshold = localStorage.getItem(STORAGE_KEYS.boxThreshold);
    const savedTextThreshold = localStorage.getItem(STORAGE_KEYS.textThreshold);
    const savedTopK = localStorage.getItem(STORAGE_KEYS.topK);
    
    if (savedBoxThreshold) {
      setBoxThreshold(parseFloat(savedBoxThreshold));
    }
    if (savedTextThreshold) {
      setTextThreshold(parseFloat(savedTextThreshold));
    }
    if (savedTopK) {
      setDisplayCount(parseInt(savedTopK));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.boxThreshold, boxThreshold.toString());
  }, [boxThreshold]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.textThreshold, textThreshold.toString());
  }, [textThreshold]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.topK, displayCount.toString());
  }, [displayCount]);

  const handleImageSelect = useCallback((file: File) => {
    setSelectedImage(file);
    setPredictionResults([]);
    setError(null);
    setProcessingState('idle');
    setCropArea(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCropAreaChange = useCallback((area: { x: number; y: number; width: number; height: number } | null) => {
    setCropArea(area);
  }, []);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const file = new File([blob], 'pasted-image.png', { type: blob.type });
            handleImageSelect(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleImageSelect]);

  const handleProcess = useCallback(async () => {
    if (!selectedImage || !imagePreview || !selectedPart) {
      setError('请先选择要识别的部位');
      return;
    }

    // 涂抹模式：使用mask文件
    if (!brushMaskFile) {
      setError('请先涂抹选择图片区域');
      return;
    }
    const imageToProcess: File = brushMaskFile;
    const processKey = `brush-${brushMaskFile.size}-${brushMaskFile.lastModified}`;

    const imageKey = `${selectedImage.name}-${selectedImage.size}-${selectedImage.lastModified}`;
    const fullKey = `${imageKey}-${processKey}`;

    if (
      lastProcessedRef.current.imageKey === imageKey &&
      lastProcessedRef.current.cropAreaKey === processKey &&
      lastProcessedRef.current.boxThreshold === boxThreshold &&
      lastProcessedRef.current.textThreshold === textThreshold &&
      processingState === 'complete'
    ) {
      return;
    }

    setError(null);
    setProcessingState('predicting');

    try {

      setCroppedImageFile(imageToProcess);

      // 直接调用预测接口
      const predictData = await predictEquipment(imageToProcess, 10);
      setPredictionResults(predictData.results);
      setProcessingState('complete');
      
      lastProcessedRef.current = {
        imageKey,
        cropAreaKey: processKey,
        boxThreshold,
        textThreshold,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
      setProcessingState('error');
    }
  }, [selectedImage, imagePreview, brushMaskFile, selectedPart, boxThreshold, textThreshold, processingState]);

  const handleReset = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setPredictionResults([]);
    setBrushMaskFile(null);
    setProcessingState('idle');
    setError(null);
    setCroppedImageFile(null);
    setSegmentResults(null);
    setSegmentState('idle');
    setResultView('prediction');
    setSelectedSegmentPart(null);
    setRemovedBackgroundImage(null);
    setSelectionMode('brush'); // Reset to default brush mode
    lastProcessedRef.current = { imageKey: null, cropAreaKey: null, boxThreshold: null, textThreshold: null };
  }, []);

  const handleClearSelection = useCallback(() => {
    setCropArea(null);
    setBrushMaskFile(null);
    // 清除分割结果
    setSegmentResults(null);
    setSelectedSegmentPart(null);
    setSegmentState('idle');
    setRemovedBackgroundImage(null);
  }, []);

  // 包装 setBrushMaskFile，当开始新的涂抹操作时清除分割结果
  const handleBrushMaskChange = useCallback((file: File | null) => {
    setBrushMaskFile(file);
    // 当开始新的涂抹操作时（file 不为 null），清除分割结果和去除背景后的图片
    if (file !== null && segmentResults) {
      setSegmentResults(null);
      setSelectedSegmentPart(null);
      setSegmentState('idle');
    }
    // 清除去除背景后的图片
    if (file === null) {
      setRemovedBackgroundImage(null);
    }
  }, [segmentResults]);

  const handleSegment = useCallback(async () => {
    if (!selectedImage || !imagePreview) {
      setError('请先上传图片');
      return;
    }

    setError(null);
    setSegmentState('segmenting');
    setSelectedSegmentPart(null);
    setPredictionResults([]);
    setCroppedImageFile(null);

    try {
      const segmentData = await segmentImage(selectedImage, boxThreshold, textThreshold);
      setSegmentResults(segmentData);
      setSegmentState('complete');
      setResultView('segment');
    } catch (err) {
      setError(err instanceof Error ? err.message : '分割失败');
      setSegmentState('error');
    }
  }, [selectedImage, imagePreview, boxThreshold, textThreshold]);

  // 将 base64 转换为 File
  const base64ToFile = useCallback((base64: string, filename: string, mimeType: string = 'image/png'): File => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }, []);

  // 处理点击分割部位
  const handleSegmentPartClick = useCallback(async (part: keyof SegmentResponse, base64: string) => {
    if (!segmentResults || !base64) return;

    // 目前只支持身体部位识别
    if (part !== 'upper') {
      setError('目前仅支持识别身体部位，其他部位暂不支持');
      return;
    }

    setError(null);
    setSelectedSegmentPart(part);
    setProcessingState('predicting');
    setPredictionResults([]);
    setResultView('segment');
    setRemovedBackgroundImage(null);

    try {
      // 将 base64 转换为 File（自动分割返回的图片已经处理过，不需要去除背景）
      const partFile = base64ToFile(base64, `${part}.png`);
      setCroppedImageFile(partFile);

      // 直接调用识别接口
      const predictData = await predictEquipment(partFile, 10);
      setPredictionResults(predictData.results);
      setProcessingState('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败');
      setProcessingState('error');
    }
  }, [segmentResults, base64ToFile]);

  // 处理点击部位按钮（涂抹或框选模式下）
  const handlePartButtonClick = useCallback(async (part: 'head' | 'upper' | 'lower' | 'shoes' | 'hands') => {
    if (!brushMaskFile) {
      setError('请先选择图片区域');
      return;
    }

    // 目前只支持身体部位识别
    if (part !== 'upper') {
      setError('目前仅支持识别身体部位，其他部位暂不支持');
      return;
    }

    // 使用存储的模式状态
    const currentMode = selectionMode === 'box' ? '框选' : '涂抹';
    const shouldRemoveBackground = selectionMode === 'box' ? 'Y' : 'N';
    console.log(`当前被激活的模式：${currentMode}，那么我应该调用remove background吗？${shouldRemoveBackground}`);

    setError(null);
    setSelectedPart(part);
    setProcessingState('predicting');
    setPredictionResults([]);
    setRemovedBackgroundImage(null);

    try {
      // 框选模式：先调用去除背景接口；涂抹模式：直接使用原图
      if (selectionMode === 'box') {
        // 框选模式：去除背景
        const removedBgBase64 = await removeBackground(brushMaskFile);
        setRemovedBackgroundImage(removedBgBase64); // debug显示
        
        // 将去除背景后的base64转换为File
        const removedBgFile = base64ToFile(removedBgBase64, 'removed-bg.png');
        setCroppedImageFile(removedBgFile);

        // 调用识别接口
        const predictData = await predictEquipment(removedBgFile, 10);
        setPredictionResults(predictData.results);
        setProcessingState('complete');
      } else {
        // 涂抹模式：直接使用原图，不去除背景
        setCroppedImageFile(brushMaskFile);

        // 调用识别接口
        const predictData = await predictEquipment(brushMaskFile, 10);
        setPredictionResults(predictData.results);
        setProcessingState('complete');
      }
      
      lastProcessedRef.current = {
        imageKey: `${selectedImage?.name}-${selectedImage?.size}-${selectedImage?.lastModified}`,
        cropAreaKey: `brush-${brushMaskFile.size}-${brushMaskFile.lastModified}`,
        boxThreshold,
        textThreshold,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败');
      setProcessingState('error');
    }
  }, [brushMaskFile, selectedImage, boxThreshold, textThreshold, cropArea, base64ToFile]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light text-gray-800 mb-4">AetherSight</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="w-48 h-px bg-gradient-to-r from-transparent via-gray-300 to-gray-300"></div>
            <svg className="w-3 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4L16 12L12 20L8 12L12 4Z" />
            </svg>
            <div className="w-48 h-px bg-gradient-to-l from-transparent via-gray-300 to-gray-300"></div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col space-y-4">
            {!imagePreview ? (
              <ImageUpload
                onImageSelect={handleImageSelect}
                disabled={processingState === 'predicting'}
              />
            ) : null}
            
            {imagePreview ? (
              <>
                <div className="relative">
                  <ImageWithCrop
                    imageSrc={imagePreview}
                    onCropAreaChange={handleCropAreaChange}
                    onBrushMaskChange={handleBrushMaskChange}
                    cropArea={cropArea}
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                    <button
                      onClick={handleReset}
                      disabled={processingState === 'predicting'}
                      className="w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white border border-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="删除图片"
                    >
                      <svg
                        className="w-4 h-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                    {(brushMaskFile || cropArea) && (
                      <button
                        onClick={handleClearSelection}
                        disabled={processingState === 'predicting'}
                        className="w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white border border-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="清除选择"
                      >
                        <svg
                          className="w-4 h-4 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* 部位选择按钮（涂抹或框选模式下，显示在图片下方） */}
                {brushMaskFile && (
                  <div className="mt-1">
                    <div className="bg-white/95 border border-gray-200 rounded-lg p-2 shadow-lg">
                      <div className="flex gap-1">
                        {(['head', 'upper', 'hands', 'lower', 'shoes'] as const).map((part) => {
                          const partLabelsMap: Record<typeof part, string> = {
                            head: '头部',
                            upper: '身体',
                            hands: '手部',
                            lower: '腿部',
                            shoes: '脚部',
                          };
                          const isEnabled = part === 'upper';
                          const isSelected = selectedPart === part;
                          return (
                            <button
                              key={part}
                              onClick={() => isEnabled && handlePartButtonClick(part)}
                              disabled={!isEnabled || processingState === 'predicting'}
                              className={`flex-1 h-9 flex items-center justify-center gap-1.5 rounded text-[10px] font-light transition-colors ${
                                isSelected
                                  ? 'bg-blue-500 text-white'
                                  : isEnabled
                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={!isEnabled ? '暂不支持' : partLabelsMap[part]}
                            >
                              {part === 'head' ? (
                                <svg className="w-4 h-4 opacity-80" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12,2a8,8,0,0,0-8,8V20l4,2,2-2V17L8,16V11l4,2,4-2v5l-2,1v3l2,2,4-2V10A8,8,0,0,0,12,2Zm2,6H10a1,1,0,0,1,0-2h4a1,1,0,0,1,0,2Z"/>
                                </svg>
                              ) : part === 'shoes' ? (
                                <svg className="w-4 h-4 opacity-80" fill="currentColor" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M128 22.781c-11.101 10.941-19.822 27.6-26.076 41.203 6.044 20.063 11.083 40.869 27.539 54.926 18.862-14.015 27.05-33.752 35.187-56.351C154.631 51.155 144.412 34.368 128 22.78zm256 0c-16.412 11.587-26.631 28.374-36.65 39.778 8.137 22.599 16.325 42.336 35.187 56.351 16.456-14.057 21.495-34.863 27.54-54.926C403.821 50.381 395.1 33.722 384 22.781zM222.23 46.104c-11.546 2.749-24.948 7.229-37.04 12.68-8.622 28.9-21.924 55.363-45.965 74.734l16.55 177.107-19.933-8.438-14.61-167.787c-16.163-16.006-28.001-43.023-38.39-71.285-3.545-2.304-7.083-4.15-10.621-5.424 6.237 82.926 25.341 186.732 47.006 274.592 2.544-1.159 5.746-2.4 8.724-3.459 29.464 7.318 56.995 29.357 81.848 53.067C192 272 256 160 222.23 46.104zm67.54 0C256 160 320 272 302.2 381.89c24.853-23.71 52.384-45.75 81.848-53.067 2.978 1.06 6.18 2.3 8.724 3.46 21.665-87.86 40.77-191.667 47.006-274.593-3.538 1.274-7.076 3.12-10.62 5.424-10.39 28.262-22.228 55.28-38.391 71.285l-14.61 167.787-19.933 8.438 16.55-177.107c-24.04-19.37-37.343-45.834-45.964-74.735-12.093-5.45-25.495-9.93-37.041-12.68zM129.004 347.83c-13.31 5.672-27.915 18.355-33.014 34.666 23.725 4.679 52.808 18.407 75.524 40.389l3.947 26.867 33.467-12.074-1.33-29.082c-19.75-28.701-51.073-52.92-78.594-60.766zm253.992 0c-27.52 7.846-58.843 32.065-78.594 60.766l-1.33 29.082 33.467 12.074 3.947-26.867c22.716-21.982 51.8-35.71 75.524-40.389-5.099-16.311-19.704-28.994-33.014-34.666zM90.69 399.703l-52.257 39.272c-10.312 15.251-12.923 32.609-8.657 47.158 52.559 9.293 88.252-3.287 129.043-25.838l-4.275-29.084c-14.703-15.135-33.665-26.354-63.854-31.508zm330.622 0c-30.189 5.154-49.151 16.373-63.854 31.508l-4.275 29.084c40.791 22.55 76.484 35.131 129.043 25.838 4.266-14.55 1.655-31.907-8.657-47.158l-52.257-39.272z"/>
                                </svg>
                              ) : part === 'hands' ? (
                                <svg className="w-4 h-4 opacity-80" fill="currentColor" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M470.92 53.162c21.738 76.755-126.736 189.16-213.57 251.49 4.21 19.66 2.796 37.915 0 55.825 20.223 32.576.83 44.814 2.76 82.5-1.05 13.887-23.797 12.58-28.066-8.576 4.852-31.07-2.95-57.924-15.472-54.243l-31.933 43.23-47.61 67.04c-5.897 5.975-27.768 1.664-22.4-12.69l39.123-71.307-3.784-2.538-74.42 79c-6.056 6.26-26.28-7.956-19.953-16.503l69.72-74.202-3.783-1.925-66.576 44.227c-7.596 5.33-22.805-10.34-12.628-17.663l63.976-50.98-43.874 22.025c-6.156 2.1-12.68-10.355-5.976-13.335l50.997-32.6c26.468-21.393 58.785-57.834 94.072-65.2 55.417-83.656 104.97-167.018 175.057-253.61 26.274-13.577 86.7 8.58 94.34 30.035z"/>
                                </svg>
                              ) : part === 'lower' ? (
                                <svg className="w-4 h-4 opacity-80" fill="currentColor" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M498 250l-112 23 12-3q15-4 30-10 21-8 37-19-25-2-76-5l-46-2h158v-81h-33l3-29h30l-3-15-67-5q-75-5-115-11-22-3-34-2-10 0-12.5 2.5T269 99l1 3 25 15v8l-18 8 15 18-25 37-33 8v31l33 22-6 76 13 50q14 61 24 114 11 24 22 42l8 13-21 15 21 20-2 6q-3 8-5 19-2 15-1 33 2 24 8 52 8 45 23 90 6 17 8 25 2 12 2 25 0 23-12 41-6 9-12 13l8 3q10 4 23 6 18 2 38 1 26-2 54-9-13-13-22-35-5-10-7-18l8-59q9-64 17-90 5-19 4-44-1-15-5-38-3-16-2-19 2-4 10-10l8-5-15-26 12-55 5-90q6-91 12-99t6-16q0-3-2-6zm2 0l112 23-12-3q-15-4-30-10-21-8-37-19 40-4 122-7H497v-81h33l-3-29h-30l3-15 67-5q75-5 115-11 22-3 34-2 10 0 12.5 2.5t.5 5.5l-1 3-25 15v8l18 8-15 18 25 37 33 8v31l-33 22 6 76-13 50q-14 61-24 114-18 38-30 55l21 15-21 20 2 6q3 8 5 19 2 15 1 33-2 24-8 52-8 45-23 90-6 17-8 25-2 12-2 25 0 16 6 30 4 10 12 18l6 6-8 3q-10 4-23 6-18 2-38 1-26-2-54-9 10-10 17-23 5-10 9-21l3-9-8-59q-9-64-17-90-5-19-4-44 1-15 5-38 3-16 2-19-3-6-18-15l15-26-12-55-5-90q-6-91-12-99-4-6-5-10.5t0-8.5l1-3zm-17-121h36v17h-36v-17z"/>
                                </svg>
                              ) : part === 'upper' ? (
                                <svg className="w-4 h-4 opacity-80" fill="currentColor" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M156.7 25.83L89 39.38c-.1 58.57-1.74 119.32-43.49 167.22C104.4 246.5 189 260.7 247 248.8v-99L108.3 88.22l7.4-16.44L256 134.2l140.3-62.42 7.4 16.44L265 149.8v99c58 11.9 142.6-2.3 201.5-42.2-41.8-47.9-43.4-108.65-43.5-167.22l-67.7-13.55c-12.9 13.88-20.6 28.15-32.9 40.53C308.9 79.78 289.5 89 256 89c-33.5 0-52.9-9.22-66.4-22.64-12.3-12.38-20-26.65-32.9-40.53zM53.88 232.9C75.96 281 96.07 336.6 102.7 392.8l65 22.8c4.2-52.7 28.2-104 63.7-146.1-55.1 6.3-122.7-5.8-177.52-36.6zm404.22 0c-54.8 30.8-122.4 42.9-177.5 36.6 35.5 42.1 59.5 93.4 63.7 146.1l65.2-22.9c6.6-56.8 26.6-111.8 48.6-159.8zM256 269c-40.5 43.1-67.7 97.9-70.7 152.7l61.7 21.6V336h18v107.3l61.7-21.6c-3.1-54.8-30.2-109.6-70.7-152.7zm151.7 143.4L297 451.1v18.8l110.2-44.1c.1-4.5.3-8.9.5-13.4zm-303.3.1c.3 4.5.4 8.9.5 13.4l110.1 44v-18.7l-110.6-38.7zM279 457.4l-23 8.1-23-8v19.6l23 9.2 23-9.2v-19.7z"/>
                                </svg>
                              ) : (
                                <img
                                  src={`/${part}.png`}
                                  alt={partLabelsMap[part]}
                                  className="w-4 h-4 object-contain opacity-80"
                                />
                              )}
                              <span>{partLabelsMap[part]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
            
            {/* 使用说明和显示结果数量 - 始终显示 */}
            <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="space-y-2 pb-3 border-b border-gray-200">
                <h3 className="text-sm text-gray-700 font-medium mb-2">使用说明</h3>
                <ol className="space-y-1.5 text-xs text-gray-600 font-light list-decimal list-inside">
                  <li>使用涂抹工具或剪裁工具选择图片中的部位，然后在弹出的部位选择框中选择要识别的部位（仅支持身体），识别结果将显示在右侧。</li>
                  <li>点击下方的"自动分割"按钮可以自动识别并分割图片中的各个部位，但自动分割的结果可能不够准确，建议优先使用手动选择。</li>
                  <li>如果识别结果中找到了匹配的装备，请点击右侧装备卡片上的图标进行反馈，这将帮助我们持续提升识别准确率。</li>
                </ol>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 font-light">
                    显示结果数量
                  </label>
                  <span className="text-xs text-gray-500 font-light">
                    {displayCount}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={displayCount}
                  onChange={(e) => setDisplayCount(parseInt(e.target.value))}
                  disabled={processingState === 'predicting'}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, #9ca3af 0%, #9ca3af ${((displayCount - 1) / 9) * 100}%, #e5e7eb ${((displayCount - 1) / 9) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>
            </div>
            
            {/* 自动分割按钮 - 显示在使用说明下方 */}
            {imagePreview && (
              <div className="flex gap-4">
                <button
                  onClick={handleSegment}
                  disabled={!selectedImage || segmentState === 'segmenting' || processingState === 'predicting'}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-light hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {segmentState === 'segmenting' ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>分割中...</span>
                    </>
                  ) : (
                    '自动分割'
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-4">
            {imagePreview ? (
              <>
                {/* 分割结果区域 */}
                {segmentResults && (
                  <div className="w-full border border-gray-200 rounded-lg bg-white p-6">
                    <h3 className="text-sm font-light text-gray-700 mb-4">分割结果</h3>
                    {segmentState === 'segmenting' ? (
                      <div className="flex items-center justify-center py-12">
                        <LoadingSpinner size="sm" />
                        <span className="ml-3 text-sm text-gray-400 font-light">分割中...</span>
                      </div>
                    ) : (
                      <SegmentResults 
                        results={segmentResults} 
                        selectedPart={selectedSegmentPart}
                        onPartClick={handleSegmentPartClick}
                      />
                    )}
                  </div>
                )}
                
                {/* 识别结果区域 */}
                <div className="w-full border border-gray-200 rounded-lg bg-white p-6">
                  <h3 className="text-sm font-light text-gray-700 mb-4">
                    {selectedSegmentPart ? `识别结果 - ${partLabels[selectedSegmentPart]}` : '识别结果'}
                  </h3>
                  {processingState === 'predicting' ? (
                    <PredictionResultsSkeleton />
                  ) : predictionResults.length > 0 ? (
                    <PredictionResults 
                      results={predictionResults.slice(0, displayCount)} 
                      croppedImageFile={croppedImageFile}
                    />
                  ) : selectedSegmentPart ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-gray-400 font-light">识别中...</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-sm text-gray-400 font-light">
                        {segmentResults 
                          ? '点击上方分割结果中的部位进行识别' 
                          : brushMaskFile 
                            ? '点击右上角部位按钮进行识别' 
                            : '请先涂抹选择图片区域或进行自动分割'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full border border-gray-200 rounded-lg bg-white p-6">
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-gray-400 font-light">请先上传图片</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Debug: 去除背景后的图片 - 右下角浮窗 */}
        {removedBackgroundImage && (
          <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-light text-gray-700">去除背景后 (Debug)</h3>
              <button
                onClick={() => setRemovedBackgroundImage(null)}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                title="关闭"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${removedBackgroundImage}`}
                alt="去除背景后的图片"
                className="max-w-full h-auto border border-gray-200 rounded"
                style={{ maxHeight: '200px' }}
              />
            </div>
          </div>
        )}

        <footer className="mt-16 pt-8 pb-8 border-t border-gray-200">
          <div className="flex flex-col items-center gap-4 text-sm text-gray-500 font-light">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span>Powered by </span>
              <a
                href="https://github.com/AetherSight/"
            target="_blank"
            rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800 transition-colors underline"
              >
                AetherSight
              </a>
              <span> with ♥</span>
            </div>
            <div className="text-center space-y-1">
              <p>FINAL FANTASY XIV © 2010-2026 SQUARE ENIX CO., LTD. All Rights Reserved.</p>
              <p>This project is not affiliated with or endorsed by SQUARE ENIX CO., LTD.</p>
            </div>
          </div>
        </footer>
        </div>
    </div>
  );
}
