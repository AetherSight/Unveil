import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import styled, { keyframes, css } from 'styled-components';

// ===== 类型定义 =====

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  /** 需要高亮的元素选择器，例如 '.btn-upload'、'#search-input' */
  targetSelector: string;
  /** 标题 */
  title: string;
  /** 文本内容，可以是简单字符串 */
  content: string;
  /** 首选提示框位置，若空间不足会自动调整 */
  placement?: TourPlacement;
}

export interface GuidedTourProps {
  /** 本次引导的唯一 key，用于 localStorage 持久化 */
  tourKey: string;
  /** 引导步骤配置 */
  steps: TourStep[];
  /** 初次挂载是否自动开始，默认 true */
  autoStart?: boolean;
  /** 步骤索引变化（开始/切换/结束）时回调，用于注入/清理 forge 数据 */
  onStepChange?: (stepIndex: number | null) => void;
  /** 引导真正完成（点击 Done）时回调 */
  onComplete?: () => void;
  /** 用户点击 Skip 时回调（不写入完成状态） */
  onSkip?: () => void;
}

export interface GuidedTourHandle {
  /** 手动开始或重新开始引导，从第 0 步起 */
  start: () => void;
  /** 立即停止引导，不写入完成状态 */
  stop: () => void;
  /** 跳转到指定步骤索引（0-based），越界会被忽略 */
  goToStep: (index: number) => void;
}

// ===== 工具函数 & 常量 =====

const STORAGE_PREFIX = 'guided_tour_';
const HIGHLIGHT_PADDING = 8; // 高亮区域周围的留白
const DEBOUNCE_DELAY = 120; // resize/scroll 防抖时间

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition extends Rect {
  placement: TourPlacement;
}

const isBrowser = typeof window !== 'undefined';

const getStorageKey = (tourKey: string) => `${STORAGE_PREFIX}${tourKey}`;

const isTourDone = (tourKey: string): boolean => {
  if (!isBrowser) return false;
  try {
    return window.localStorage.getItem(getStorageKey(tourKey)) === 'done';
  } catch {
    return false;
  }
};

const markTourDone = (tourKey: string) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(getStorageKey(tourKey), 'done');
  } catch {
    // 忽略持久化失败
  }
};

/** 简单防抖封装 */
const useDebouncedHandler = (fn: () => void, delay: number) => {
  const fnRef = useRef(fn);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const run = useCallback(() => {
    if (!isBrowser) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      fnRef.current();
    }, delay);
  }, [delay]);

  return run;
};

/** 计算某个 DOM 元素的高亮矩形区域（加入额外 padding） */
const getHighlightRect = (el: Element | null): Rect | null => {
  if (!el || !isBrowser) return null;
  const rect = el.getBoundingClientRect();
  const padding = HIGHLIGHT_PADDING;
  return {
    top: Math.max(rect.top - padding, 0),
    left: Math.max(rect.left - padding, 0),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
};

/** 根据高亮区域和 tooltip 自身尺寸，计算合适的提示框位置 */
const computeTooltipPosition = (
  highlight: Rect,
  tooltip: DOMRect,
  preferred: TourPlacement | undefined,
): TooltipPosition => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const placements: TourPlacement[] = preferred
    ? [preferred, 'bottom', 'top', 'right', 'left'].filter(
        (p, index, arr) => arr.indexOf(p) === index,
      )
    : ['bottom', 'top', 'right', 'left'];

  const tryPlacement = (placement: TourPlacement): TooltipPosition => {
    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top': {
        top = highlight.top - tooltip.height - 12;
        left = highlight.left + highlight.width / 2 - tooltip.width / 2;
        break;
      }
      case 'bottom': {
        top = highlight.top + highlight.height + 12;
        left = highlight.left + highlight.width / 2 - tooltip.width / 2;
        break;
      }
      case 'left': {
        top = highlight.top + highlight.height / 2 - tooltip.height / 2;
        left = highlight.left - tooltip.width - 12;
        break;
      }
      case 'right': {
        top = highlight.top + highlight.height / 2 - tooltip.height / 2;
        left = highlight.left + highlight.width + 12;
        break;
      }
    }

    // 保证 tooltip 不会完全跑出视口，允许稍微溢出一点
    const margin = 8;
    top = Math.max(margin, Math.min(top, viewportHeight - tooltip.height - margin));
    left = Math.max(margin, Math.min(left, viewportWidth - tooltip.width - margin));

    return {
      top,
      left,
      width: tooltip.width,
      height: tooltip.height,
      placement,
    };
  };

  // 找出第一个“相对合理”的位置：避免 tooltip 主要区域超出视口
  for (const p of placements) {
    const pos = tryPlacement(p);
    const withinVertical =
      pos.top >= 0 && pos.top + pos.height <= viewportHeight + 4;
    const withinHorizontal =
      pos.left >= 0 && pos.left + pos.width <= viewportWidth + 4;
    if (withinVertical && withinHorizontal) {
      return pos;
    }
  }

  // 实在不行就退回首选
  return tryPlacement(preferred ?? 'bottom');
};

// ===== 动画 & 样式 =====

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(-8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const OverlayRoot = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  z-index: 9999;
`;

// 为了兼容性，这里采用“四块遮罩”围成一个“挖空”的区域，而非单一 clip-path。
// 视觉效果等价：中间的高亮矩形区域是透明的，其他区域为半透明黑色。
const Mask = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
`;

const MaskBlock = styled.div`
  position: absolute;
  background: rgba(0, 0, 0, 0.7);
`;

const HighlightBorder = styled.div<{ rect: Rect | null }>`
  position: fixed;
  pointer-events: none;
  border-radius: 8px;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
  transition: all 200ms ease;
  ${({ rect }) =>
    rect
      ? `
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    opacity: 1;
  `
      : `
    opacity: 0;
    width: 0;
    height: 0;
  `}
`;

const TooltipContainer = styled.div<{
  rect: TooltipPosition | null;
}>`
  position: fixed;
  max-width: 360px;
  background: #ffffff;
  border-radius: 10px;
  padding: 16px 18px 14px;
  box-shadow:
    0 18px 40px rgba(15, 23, 42, 0.35),
    0 0 0 1px rgba(148, 163, 184, 0.25);
  color: #0f172a;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    'Segoe UI', sans-serif;
  z-index: 10000;
  ${({ rect }) =>
    rect
      ? `
    top: ${rect.top}px;
    left: ${rect.left}px;
    opacity: 1;
    pointer-events: auto;
  `
      : `
    opacity: 0;
    pointer-events: none;
  `}
  transition:
    opacity 180ms ease,
    top 200ms ease,
    left 200ms ease;

  ${({ rect }) => {
    if (!rect) {
      return css`
        animation: ${fadeIn} 180ms ease;
      `;
    }

    switch (rect.placement) {
      case 'top':
        return css`
          animation: ${slideDown} 200ms ease;
        `;
      case 'bottom':
        return css`
          animation: ${slideUp} 200ms ease;
        `;
      case 'left':
        return css`
          animation: ${slideRight} 200ms ease;
        `;
      case 'right':
        return css`
          animation: ${slideLeft} 200ms ease;
        `;
      default:
        return css`
          animation: ${fadeIn} 180ms ease;
        `;
    }
  }}
`;

const TooltipTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
`;

const TooltipContent = styled.p`
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.5;
  color: #4b5563;
`;

const TooltipFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
`;

const StepIndicator = styled.div`
  font-size: 11px;
  color: #6b7280;
`;

const ButtonGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const GhostButton = styled.button`
  border: none;
  background: transparent;
  padding: 4px 8px;
  font-size: 11px;
  color: #9ca3af;
  border-radius: 6px;
  cursor: pointer;
  transition:
    color 120ms ease,
    background-color 120ms ease;

  &:hover {
    color: #6b7280;
    background: #f9fafb;
  }
`;

const PrimaryButton = styled.button`
  border: none;
  background: #0f172a;
  padding: 6px 12px;
  font-size: 12px;
  color: #f9fafb;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition:
    background-color 120ms ease,
    transform 120ms ease,
    box-shadow 120ms ease;

  &:hover {
    background: #020617;
    transform: translateY(-0.5px);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.28);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.24);
  }
`;

const PrevButton = styled(PrimaryButton)`
  background: #e5e7eb;
  color: #4b5563;

  &:hover {
    background: #d1d5db;
    box-shadow: none;
    transform: none;
  }
`;

// ===== 核心组件 =====

export const GuidedTour = forwardRef<GuidedTourHandle, GuidedTourProps>(
  (
    { tourKey, steps, autoStart = true, onStepChange, onComplete, onSkip },
    ref,
  ) => {
    const [active, setActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
    const [tooltipRect, setTooltipRect] = useState<TooltipPosition | null>(null);

    const tooltipRef = useRef<HTMLDivElement | null>(null);

    // 暴露给外部的控制方法
    useImperativeHandle(
      ref,
      (): GuidedTourHandle => ({
        start: () => {
          if (!steps.length) return;
          setActive(true);
          setCurrentStep(0);
        },
        stop: () => {
          setActive(false);
          setHighlightRect(null);
          setTooltipRect(null);
        },
        goToStep: (index: number) => {
          if (!steps.length) return;
          if (index < 0 || index >= steps.length) return;
          setActive(true);
          setCurrentStep(index);
        },
      }),
      [steps.length],
    );

    // 初始自动启动逻辑（仅当未完成且 autoStart 为 true）
    useEffect(() => {
      if (!autoStart) return;
      if (!steps.length) return;
      if (isTourDone(tourKey)) return;

      setActive(true);
      setCurrentStep(0);
    }, [autoStart, steps.length, tourKey]);

    // 通知上层当前处于哪一个步骤，用于注入/清理 forge 数据
    useEffect(() => {
      if (!onStepChange) return;
      if (!active) {
        onStepChange(null);
      } else {
        onStepChange(currentStep);
      }
    }, [active, currentStep, onStepChange]);

    const recalcPosition = useCallback(() => {
      if (!active || !steps.length || !isBrowser) return;
      const step = steps[currentStep];
      if (!step?.targetSelector) {
        setHighlightRect(null);
        setTooltipRect(null);
        return;
      }

      const el = document.querySelector(step.targetSelector);
      const highlight = getHighlightRect(el);
      setHighlightRect(highlight);

      // 若目标元素不存在或当前不可见，则 tooltip 居中显示
      if (!highlight || !tooltipRef.current) {
        if (tooltipRef.current) {
          const tooltipBox = tooltipRef.current.getBoundingClientRect();
          const centerTop = window.innerHeight / 2 - tooltipBox.height / 2;
          const centerLeft = window.innerWidth / 2 - tooltipBox.width / 2;
          setTooltipRect({
            top: centerTop,
            left: centerLeft,
            width: tooltipBox.width,
            height: tooltipBox.height,
            placement: 'bottom',
          });
        } else {
          setTooltipRect(null);
        }
        return;
      }

      // 计算 tooltip 位置
      const tooltipBox = tooltipRef.current.getBoundingClientRect();
      const pos = computeTooltipPosition(
        highlight,
        tooltipBox,
        step.placement ?? 'bottom',
      );
      setTooltipRect(pos);

      // 如果目标元素在视口外，尝试滚动进视图
      const padding = 80;
      const inViewVertically =
        highlight.top >= padding &&
        highlight.top + highlight.height <= window.innerHeight - padding;
      const inViewHorizontally =
        highlight.left >= padding &&
        highlight.left + highlight.width <= window.innerWidth - padding;

      if (!inViewVertically || !inViewHorizontally) {
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, [active, currentStep, steps]);

    const debouncedRecalc = useDebouncedHandler(recalcPosition, DEBOUNCE_DELAY);

    // 步骤变化或激活状态变化时重新计算位置
    useEffect(() => {
      if (!active) return;
      // 等待 tooltip 初次渲染完成后再计算
      const id = window.requestAnimationFrame(() => recalcPosition());
      return () => window.cancelAnimationFrame(id);
    }, [active, currentStep, recalcPosition, steps.length]);

    // 监听 resize / scroll
    useEffect(() => {
      if (!active || !isBrowser) return;

      const handle = () => debouncedRecalc();
      window.addEventListener('resize', handle);
      window.addEventListener('scroll', handle, true);
      return () => {
        window.removeEventListener('resize', handle);
        window.removeEventListener('scroll', handle, true);
      };
    }, [active, debouncedRecalc]);

    const handlePrev = () => {
      setCurrentStep((prev) => Math.max(0, prev - 1));
    };

    const handleNext = () => {
      setCurrentStep((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= steps.length) {
          // 和 Done 行为相同
          handleDone();
          return prev;
        }
        return nextIndex;
      });
    };

    const handleSkip = () => {
      setActive(false);
      setHighlightRect(null);
      setTooltipRect(null);
      onSkip?.();
      // 不写入 localStorage，允许用户以后再次触发
    };

    const handleDone = () => {
      setActive(false);
      setHighlightRect(null);
      setTooltipRect(null);
      markTourDone(tourKey);
      onComplete?.();
    };

    if (!active || !steps.length) {
      return null;
    }

    const step = steps[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === steps.length - 1;

    // 高亮“挖空”：用四块遮罩把高亮区域之外盖住
    const hole = highlightRect;

    return (
      <OverlayRoot $visible={active}>
        <Mask>
          {/* 顶部遮罩 */}
          <MaskBlock
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: hole ? hole.top : '100%',
            }}
          />
          {/* 底部遮罩 */}
          <MaskBlock
            style={{
              top: hole ? hole.top + hole.height : 0,
              left: 0,
              width: '100%',
              height: hole ? `calc(100% - ${hole.top + hole.height}px)` : 0,
            }}
          />
          {/* 左侧遮罩 */}
          <MaskBlock
            style={{
              top: hole ? hole.top : 0,
              left: 0,
              width: hole ? hole.left : '100%',
              height: hole ? hole.height : 0,
            }}
          />
          {/* 右侧遮罩 */}
          <MaskBlock
            style={{
              top: hole ? hole.top : 0,
              left: hole ? hole.left + hole.width : 0,
              width: hole ? `calc(100% - ${hole.left + hole.width}px)` : 0,
              height: hole ? hole.height : 0,
            }}
          />
        </Mask>

        <HighlightBorder rect={highlightRect} />

        <TooltipContainer rect={tooltipRect} ref={tooltipRef}>
          <TooltipTitle>{step.title}</TooltipTitle>
          <TooltipContent>{step.content}</TooltipContent>
          <TooltipFooter>
            <StepIndicator>
              步骤 {currentStep + 1}/{steps.length}
            </StepIndicator>
            <ButtonGroup>
              {!isFirst && (
                <PrevButton type="button" onClick={handlePrev}>
                  上一步
                </PrevButton>
              )}
              <GhostButton type="button" onClick={handleSkip}>
                跳过
              </GhostButton>
              <PrimaryButton
                type="button"
                onClick={isLast ? handleDone : handleNext}
              >
                {isLast ? '完成' : '下一步'}
              </PrimaryButton>
            </ButtonGroup>
          </TooltipFooter>
        </TooltipContainer>
      </OverlayRoot>
    );
  },
);

GuidedTour.displayName = 'GuidedTour';

export default GuidedTour;

