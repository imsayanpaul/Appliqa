import { useEffect } from 'react';

/**
 * useSmoothScroll
 * Provides 60fps buttery momentum scrolling on discrete mouse-wheel ticks.
 * - Detects stepped mouse wheels (Windows / standard mice) and applies fluid exponential momentum.
 * - Preserves native precision trackpads (Mac / Windows Precision) without lag or "floaty" inertia.
 * - Respects nested scrollable containers (dropdowns, modals, textareas).
 */
export function useSmoothScroll(containerRef) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let targetScroll = container.scrollTop;
    let isAnimating = false;
    let animId = null;

    // Helper: Check if event target or any ancestor before container is scrollable
    const isScrollableDescendant = (target, deltaY) => {
      let node = target;
      while (node && node !== container && node !== document.body) {
        if (node instanceof HTMLElement) {
          const style = window.getComputedStyle(node);
          const overflowY = style.overflowY;
          const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight;
          if (isScrollable) {
            const canScrollDown = deltaY > 0 && node.scrollTop < (node.scrollHeight - node.clientHeight - 1);
            const canScrollUp = deltaY < 0 && node.scrollTop > 1;
            if (canScrollDown || canScrollUp) {
              return true;
            }
          }
        }
        node = node.parentElement;
      }
      return false;
    };

    const updateScroll = () => {
      if (!container) return;
      const currentScroll = container.scrollTop;
      const diff = targetScroll - currentScroll;

      // When close enough, snap to target and finish
      if (Math.abs(diff) < 0.5) {
        container.scrollTop = targetScroll;
        isAnimating = false;
        return;
      }

      // Smooth lerp: 0.12 provides a responsive yet creamy glide
      container.scrollTop = currentScroll + diff * 0.12;
      animId = requestAnimationFrame(updateScroll);
    };

    const onWheel = (e) => {
      // Don't interfere if ctrl/cmd (zooming) or shift (horizontal) is held
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;

      // Don't interfere if inside an active scrollable child (e.g. dropdown options menu)
      if (isScrollableDescendant(e.target, e.deltaY)) return;

      // Detect stepped mouse wheel vs precision trackpad:
      // Stepped mouse wheels fire deltaMode 1 (lines) or large deltaY multiples (e.g. 100, 120, 150)
      const isSteppedWheel = e.deltaMode === 1 || Math.abs(e.deltaY) >= 40;

      if (!isSteppedWheel) {
        // Trackpads already stream smooth micro-deltas; keep native trackpad speed
        if (isAnimating) {
          cancelAnimationFrame(animId);
          isAnimating = false;
        }
        targetScroll = container.scrollTop;
        return;
      }

      e.preventDefault();

      // If not animating, sync target with current actual scroll
      if (!isAnimating) {
        targetScroll = container.scrollTop;
      }

      // Compute delta multiplier for a comfortable scroll distance
      const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY * 1.1;
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);

      targetScroll = Math.max(0, Math.min(maxScroll, targetScroll + delta));

      if (!isAnimating) {
        isAnimating = true;
        animId = requestAnimationFrame(updateScroll);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [containerRef]);
}

export default useSmoothScroll;
