'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEYS = {
  topK: 'unveil_top_k',
  patchWeight: 'unveil_patch_weight',
  patchOnly: 'unveil_patch_only',
};
import Image from 'next/image';
import ImageUpload from '@/components/ImageUpload';
import ImageWithCrop from '@/components/ImageWithCrop';
import PredictionResults from '@/components/PredictionResults';
import PredictionResultsSkeleton from '@/components/PredictionResultsSkeleton';
import SegmentResults, { partLabels } from '@/components/SegmentResults';
import SegmentResultsSkeleton from '@/components/SegmentResultsSkeleton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { predictEquipment, segmentImage, removeBackground, searchEquipment, getAllTags, searchByTags } from '@/lib/api';
import type { PredictionResult, SegmentResponse, TagSearchResult } from '@/lib/types';

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
  const [displayCount, setDisplayCount] = useState(5);
  const [patchWeight, setPatchWeight] = useState<number>(0.3);
  const [patchOnly, setPatchOnly] = useState<boolean | undefined>(undefined);
  const [selectedPart, setSelectedPart] = useState<'head' | 'upper' | 'lower' | 'shoes' | 'hands' | null>(null);
  const [brushMaskFile, setBrushMaskFile] = useState<File | null>(null);
  const [segmentResults, setSegmentResults] = useState<SegmentResponse | null>(null);
  const [segmentState, setSegmentState] = useState<'idle' | 'segmenting' | 'complete' | 'error'>('idle');
  const [resultView, setResultView] = useState<ResultView>('prediction');
  const [selectedSegmentPart, setSelectedSegmentPart] = useState<keyof SegmentResponse | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null); // base64 string或预览用base64
  const [selectionMode, setSelectionMode] = useState<'brush' | 'box'>('box'); // 当前选择模式，默认框选
  const [searchQuery, setSearchQuery] = useState<string>(''); // 搜索关键词（用于输入）
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 已选择的标签
  const [searchResults, setSearchResults] = useState<TagSearchResult[]>([]); // 搜索结果
  const [searchState, setSearchState] = useState<'idle' | 'searching' | 'complete' | 'error'>('idle'); // 搜索状态
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]); // 自动补全建议
  const [autocompleteVisible, setAutocompleteVisible] = useState(false); // 是否显示自动补全
  const [allTags, setAllTags] = useState<string[]>([]); // 所有 tags，从后端获取一次后保存在本地
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 搜索防抖
  const searchInputRef = useRef<HTMLInputElement>(null); // 搜索输入框引用
  const lastProcessedRef = useRef<{
    imageKey: string | null;
    cropAreaKey: string | null;
  }>({ imageKey: null, cropAreaKey: null });
  const lastSegmentRef = useRef<{
    imageKey: string | null;
    hasBrushMask: boolean;
  }>({ imageKey: null, hasBrushMask: false });

  useEffect(() => {
    const savedTopK = localStorage.getItem(STORAGE_KEYS.topK);
    const savedPatchWeight = localStorage.getItem(STORAGE_KEYS.patchWeight);
    const savedPatchOnly = localStorage.getItem(STORAGE_KEYS.patchOnly);
    
    if (savedTopK) {
      setDisplayCount(parseInt(savedTopK));
    }
    if (savedPatchWeight) {
      const weight = parseFloat(savedPatchWeight);
      if (!isNaN(weight) && weight >= 0 && weight <= 1) {
        setPatchWeight(weight);
      }
      // 如果解析失败或值无效，保持默认值 0.3
    }
    // 如果没有保存的值，保持默认值 0.3
    if (savedPatchOnly !== null) {
      setPatchOnly(savedPatchOnly === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.topK, displayCount.toString());
  }, [displayCount]);

  useEffect(() => {
    // 始终保存 patchWeight
    localStorage.setItem(STORAGE_KEYS.patchWeight, patchWeight.toString());
  }, [patchWeight]);

  useEffect(() => {
    if (patchOnly !== undefined) {
      localStorage.setItem(STORAGE_KEYS.patchOnly, patchOnly.toString());
    } else {
      localStorage.removeItem(STORAGE_KEYS.patchOnly);
    }
  }, [patchOnly]);

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
    const fetchAllTags = async () => {
      try {
        const tags = await getAllTags();
        setAllTags(tags);
      } catch (err) {
        console.error('Failed to fetch all tags:', err);
      }
    };
    
    fetchAllTags();
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
      processingState === 'complete'
    ) {
      return;
    }

    setError(null);
    setProcessingState('predicting');

    try {

      setCroppedImageFile(imageToProcess);

      // 直接调用预测接口
      const predictData = await predictEquipment(imageToProcess, 10, patchWeight, patchOnly);
      setPredictionResults(predictData.results);
      setProcessingState('complete');
      
      lastProcessedRef.current = {
        imageKey,
        cropAreaKey: processKey,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
      setProcessingState('error');
    }
  }, [selectedImage, imagePreview, brushMaskFile, selectedPart, processingState, patchWeight, patchOnly]);

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
    setPreviewImage(null);
    setSelectionMode('brush'); // Reset to default brush mode
    setSelectedPart(null); // 清除选中的部位
    lastProcessedRef.current = { imageKey: null, cropAreaKey: null };
    lastSegmentRef.current = { imageKey: null, hasBrushMask: false };
  }, []);

  const handleClearSelection = useCallback(() => {
    setCropArea(null);
    setBrushMaskFile(null);
    setSegmentResults(null);
  }, []);

  const handleBrushMaskChange = useCallback(async (file: File | null) => {
    setBrushMaskFile(file);

    if (!file || selectionMode !== 'box') {
      return;
    }

    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    try {
      const boxBase64 = await fileToBase64(file);
      setSegmentResults({
        upper: boxBase64,
        upper_1: undefined,
        upper_2: undefined,
        upper_3: undefined,
        upper_4: undefined,
        lower: undefined,
        shoes: undefined,
        head: undefined,
        hands: undefined,
      });
      setSegmentState('complete');
      setResultView('segment');
    } catch (err) {
      console.error('Failed to generate preview from box selection:', err);
    }
  }, [selectionMode]);

  const handleSegment = useCallback(async () => {
    if (!selectedImage || !imagePreview) {
      setError('请先上传图片');
      return;
    }

    // 检查图片是否变化且是否有框选
    const imageKey = `${selectedImage.name}-${selectedImage.size}-${selectedImage.lastModified}`;
    const hasBrushMask = brushMaskFile !== null;
    
    // 如果图片未变化、没有框选、且已有分割结果，则不重复识别
    if (
      lastSegmentRef.current.imageKey === imageKey &&
      !hasBrushMask &&
      !lastSegmentRef.current.hasBrushMask &&
      segmentResults !== null &&
      segmentState === 'complete'
    ) {
      return;
    }

    setError(null);
    setSegmentState('segmenting');
    setSelectedSegmentPart(null);
    setSegmentResults(null);
    setPredictionResults([]);
    setCroppedImageFile(null);
    setPreviewImage(null);
    setSelectedPart(null);

    try {
      if (brushMaskFile) {
        // If there is a box selection, treat it as upper1 preview directly
        const fileToBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.includes(',') ? result.split(',')[1] : result;
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };

        const boxBase64 = await fileToBase64(brushMaskFile);
        setSegmentResults({
          upper: boxBase64,
          upper_1: undefined,
          upper_2: undefined,
          upper_3: undefined,
          upper_4: undefined,
          lower: undefined,
          shoes: undefined,
          head: undefined,
          hands: undefined,
        });
        setSegmentState('complete');
        setResultView('segment');
        lastSegmentRef.current = { imageKey, hasBrushMask: true };
      } else {
        const segmentData = await segmentImage(selectedImage);
        setSegmentResults(segmentData);
        setSegmentState('complete');
        setResultView('segment');
        lastSegmentRef.current = { imageKey, hasBrushMask: false };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
      setSegmentState('error');
    }
  }, [selectedImage, imagePreview, brushMaskFile, segmentResults, segmentState]);

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

    // 目前只支持身体部位识别（包括变体）
    const enabledParts: (keyof SegmentResponse)[] = ['upper', 'upper_1', 'upper_2', 'upper_3', 'upper_4'];
    if (!enabledParts.includes(part)) {
      setError('目前仅支持识别身体部位，其他部位暂不支持');
      return;
    }

    setError(null);
    setSelectedSegmentPart(part);
    setProcessingState('predicting');
    setPredictionResults([]);
    setResultView('segment');
    setPreviewImage(null);

    try {
      // 将 base64 转换为 File（自动分割返回的图片已经处理过，不需要去除背景）
      const partFile = base64ToFile(base64, `${part}.png`);
      setCroppedImageFile(partFile);

      // 直接调用识别接口
      const predictData = await predictEquipment(partFile, 10, patchWeight, patchOnly);
      setPredictionResults(predictData.results);
      setProcessingState('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败');
      setProcessingState('error');
    }
  }, [segmentResults, base64ToFile, patchWeight, patchOnly]);

  // 处理点击部位按钮（涂抹或框选模式下）
  const handlePartButtonClick = useCallback(async (part: 'head' | 'upper' | 'lower' | 'shoes' | 'hands') => {
    if (!brushMaskFile) {
      setError('请先选择图片区域');
      return;
    }

    // 防止重复点击：如果正在处理中，直接返回
    if (processingState === 'predicting') {
      return;
    }

    // 目前只支持身体部位识别
    if (part !== 'upper') {
      setError('目前仅支持识别身体部位，其他部位暂不支持');
      return;
    }

    // 检查是否与上次处理的内容相同
    const imageKey = `${selectedImage?.name}-${selectedImage?.size}-${selectedImage?.lastModified}`;
    const processKey = `${selectionMode}-${brushMaskFile.size}-${brushMaskFile.lastModified}`;
    
    if (
      lastProcessedRef.current.imageKey === imageKey &&
      lastProcessedRef.current.cropAreaKey === processKey &&
      processingState === 'complete' &&
      selectedPart === part
    ) {
      // 如果内容相同且已完成，不重复发送请求
      return;
    }

    setError(null);
    setSelectedPart(part);
    setProcessingState('predicting');
    setPredictionResults([]);
    setPreviewImage(null);

    try {
      // 框选/涂抹模式：都直接使用当前选区图片进行相似度/识别（不再对框选结果额外 remove background）
      if (selectionMode === 'box') {
        // 框选模式：直接使用框选图片
        // 将 File 转换为 base64 用于预览
        const fileToBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // 移除 data:image/png;base64, 前缀（如果有）
              const base64 = result.includes(',') ? result.split(',')[1] : result;
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };

        const boxBase64 = await fileToBase64(brushMaskFile);
        setPreviewImage(boxBase64); // 预览显示框选后的图片

        setCroppedImageFile(brushMaskFile);

        // 调用识别接口
        const predictData = await predictEquipment(brushMaskFile, 10, patchWeight, patchOnly);
        setPredictionResults(predictData.results);
        setProcessingState('complete');
      } else {
        // 涂抹模式：直接使用原图，不去除背景，但需要显示预览
        // 将 File 转换为 base64 用于预览
        const fileToBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // 移除 data:image/png;base64, 前缀（如果有）
              const base64 = result.includes(',') ? result.split(',')[1] : result;
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };
        
        const maskBase64 = await fileToBase64(brushMaskFile);
        setPreviewImage(maskBase64); // 预览显示涂抹后的图片
        
        setCroppedImageFile(brushMaskFile);

        // 调用识别接口
        const predictData = await predictEquipment(brushMaskFile, 10, patchWeight, patchOnly);
        setPredictionResults(predictData.results);
        setProcessingState('complete');
      }
      
      lastProcessedRef.current = {
        imageKey,
        cropAreaKey: processKey,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败');
      setProcessingState('error');
    }
  }, [brushMaskFile, selectedImage, cropArea, base64ToFile, selectionMode, processingState, selectedPart, patchWeight, patchOnly]);

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (value.trim() === '') {
      setAutocompleteSuggestions([]);
      setAutocompleteVisible(false);
      return;
    }
    
    const query = value.trim().toLowerCase();
    const exactMatch = allTags.find(tag => tag.toLowerCase() === query);
    const filtered = allTags.filter(tag => 
      tag.toLowerCase().includes(query) && tag.toLowerCase() !== query
    );
    
    const sorted = filtered.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStartsWith = aLower.startsWith(query);
      const bStartsWith = bLower.startsWith(query);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return aLower.localeCompare(bLower);
    });
    
    const suggestions = exactMatch 
      ? [exactMatch, ...sorted.slice(0, 9)]
      : sorted.slice(0, 10);
    
    setAutocompleteSuggestions(suggestions);
    setAutocompleteVisible(suggestions.length > 0);
  }, [allTags]);

  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      setSelectedTags(prev => [...prev, trimmedTag]);
      setSearchQuery('');
      setAutocompleteVisible(false);
      setAutocompleteSuggestions([]);
    }
  }, [selectedTags]);

  const removeTag = useCallback((tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleSearchByTags = useCallback(async () => {
    if (selectedTags.length === 0) {
      setSearchResults([]);
      setSearchState('idle');
      return;
    }

    setSearchState('searching');
    setSearchResults([]);
    setAutocompleteVisible(false);

    try {
      const data = await searchByTags(selectedTags);
      setSearchResults(data.results);
      setSearchState('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
      setSearchState('error');
    }
  }, [selectedTags]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchQuery.trim();
      
      if (query === '') {
        if (selectedTags.length > 0) {
          handleSearchByTags();
        }
        return;
      }
      
      addTag(query);
    } else if (e.key === 'Escape') {
      setAutocompleteVisible(false);
    }
  }, [searchQuery, selectedTags, handleSearchByTags, addTag]);

  useEffect(() => {
    if (selectedTags.length > 0) {
      handleSearchByTags();
    } else {
      setSearchResults([]);
      setSearchState('idle');
    }
  }, [selectedTags, handleSearchByTags]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light text-gray-800 mb-4 relative inline-block">
            <span className="relative">
              AetherSight
              <sup className="absolute -top-1 left-full ml-1 text-xs font-normal text-gray-500 align-super">Beta</sup>
            </span>
          </h1>
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
                <div className="relative">
                  <ImageWithCrop
                    imageSrc={imagePreview}
                    onCropAreaChange={handleCropAreaChange}
                    onBrushMaskChange={handleBrushMaskChange}
                    cropArea={cropArea}
                  />
                <div className="absolute top-2 right-2 z-20">
                    <button
                      onClick={handleReset}
                      disabled={processingState === 'predicting'}
                    className="w-8 h-8 flex items-center justify-center bg-white/80 hover:bg白 border border-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                </div>
              </div>
            ) : null}
                
            {/* 自动识别按钮 - 显示在使用说明上方 */}
            {imagePreview && (
              <div className="flex gap-4">
                <button
                  onClick={handleSegment}
                  disabled={!selectedImage || segmentState === 'segmenting' || processingState === 'predicting'}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-light transition-all duration-200 flex items-center justify-center gap-2 ${
                    segmentState === 'segmenting'
                      ? 'bg-blue-100 text-blue-600 cursor-wait'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {segmentState === 'segmenting' ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="animate-pulse">处理中...</span>
                    </>
                  ) : (
                    '自动识别'
                  )}
                </button>
              </div>
            )}
            
            {/* 使用说明和显示结果数量 - 始终显示 */}
            <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="space-y-2 pb-3">
                <h3 className="text-sm text-gray-700 font-medium mb-2">使用说明</h3>
                        <ol className="space-y-1.5 text-xs text-gray-600 font-light list-decimal list-inside">
                          <li>点击下方的"自动识别"按钮可以自动识别并分割图片中的各个部位，识别结果将显示在右侧。</li>
                          <li>如果已框选区域，点击"自动识别"将移除背景并显示到上身1；如果未框选，将自动分割所有部位。</li>
                          <li>如果识别结果中找到了匹配的装备，请点击右侧装备卡片上的图标进行反馈，这将帮助我们持续提升识别准确率。</li>
                          <li>相同模型的装备会合并显示，点击后可查看该模型下的所有装备变体。</li>
                          <li>本服务目前处于试运行阶段，识别准确率和服务可用性可能不稳定，请谨慎使用。</li>
                        </ol>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-[80px_1fr_40px] items-center gap-3">
                  <label className="text-xs text-gray-700 font-light">
                    显示结果数量
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={displayCount}
                    onChange={(e) => setDisplayCount(parseInt(e.target.value))}
                    disabled={processingState === 'predicting'}
                    className="h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(to right, #9ca3af 0%, #9ca3af ${((displayCount - 1) / 9) * 100}%, #e5e7eb ${((displayCount - 1) / 9) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <span className="text-xs text-gray-500 font-light text-right">
                    {displayCount}
                  </span>
                </div>
                
                <div className="grid grid-cols-[80px_1fr_40px] items-center gap-3 pt-2">
                  <label className="text-xs text-gray-700 font-light">
                    局部权重
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={patchWeight}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setPatchWeight(value);
                    }}
                    disabled={processingState === 'predicting' || patchOnly === true}
                    className="h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(to right, #9ca3af 0%, #9ca3af ${patchWeight * 100}%, #e5e7eb ${patchWeight * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <span className="text-xs text-gray-500 font-light text-right">
                    {patchWeight.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={patchOnly === true}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPatchOnly(true);
                      } else {
                        setPatchOnly(undefined);
                      }
                    }}
                    disabled={processingState === 'predicting'}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label className="text-xs text-gray-700 font-light cursor-pointer">
                    仅使用局部特征
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            {/* 搜索框 */}
            <div className="w-full border border-gray-200 rounded-lg bg-white p-4">
              <div className="relative">
                {/* 已选择的 tags */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-light rounded-lg"
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-gray-900 transition-colors"
                          aria-label={`删除标签 ${tag}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchInputChange(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      onFocus={() => {
                        if (autocompleteSuggestions.length > 0) {
                          setAutocompleteVisible(true);
                        }
                      }}
                      onBlur={() => {
                        // 延迟隐藏，以便点击自动补全项时能触发
                        setTimeout(() => setAutocompleteVisible(false), 200);
                      }}
                      placeholder={selectedTags.length > 0 ? "添加标签..." : "搜索标签..."}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-xs font-light focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      suppressHydrationWarning
                    />
                    {searchState === 'searching' && (
                      <LoadingSpinner size="sm" />
                    )}
                  </div>
                  
                  {/* 自动补全下拉 */}
                  {autocompleteVisible && autocompleteSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {autocompleteSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            addTag(suggestion);
                            searchInputRef.current?.focus();
                          }}
                          className="w-full text-left px-4 py-2 text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 搜索结果 */}
            {searchResults.length > 0 && (
              <div className="w-full border border-gray-200 rounded-lg bg-white p-6">
                <h3 className="text-sm font-light text-gray-700 mb-4">搜索结果</h3>
                <PredictionResults 
                  results={searchResults.map((result, index) => ({
                    rank: index + 1,
                    label: `${result.equipment_name}_${result.equipment_id}`,
                    score: result.match_score,
                    name: result.equipment_name,
                    id: result.equipment_id,
                    same_model_gears: result.same_model_gears,
                  }))} 
                  croppedImageFile={null}
                  isSearchResult={true}
                />
              </div>
            )}

            {imagePreview ? (
              <>
                {/* 分割结果区域 - 仅在自动分割后显示 */}
                {(segmentResults || segmentState === 'segmenting') && (
                  <div className="w-full border border-gray-200 rounded-lg bg-white p-6">
                    <h3 className="text-sm font-light text-gray-700 mb-4">分割结果</h3>
                    {segmentState === 'segmenting' ? (
                      <SegmentResultsSkeleton />
                    ) : segmentResults ? (
                      <SegmentResults 
                        results={segmentResults} 
                        selectedPart={selectedSegmentPart}
                        onPartClick={handleSegmentPartClick}
                      />
                    ) : null}
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
                          ? '点击上方结果中的部位进行识别' 
                          : '请先进行自动分割'}
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
