import { useEffect } from "react";

type WidgetLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const STORAGE_PREFIX = "dnd-floating-widget:";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getWidgetTitle(widget: HTMLElement, index: number) {
  const explicitTitle = widget.getAttribute("data-floating-title");

  if (explicitTitle) {
    return explicitTitle;
  }

  const titleElement = widget.querySelector<HTMLElement>(
    "summary, h4, .map-overview-header span, .token-detail-heading h4",
  );

  return titleElement?.textContent?.trim() || `Panneau ${index + 1}`;
}

function getWidgetId(widget: HTMLElement, index: number) {
  const explicitId =
    widget.getAttribute("data-floating-widget") ||
    widget.getAttribute("data-quick-panel");

  if (explicitId) {
    return explicitId;
  }

  return slugify(getWidgetTitle(widget, index)) || `widget-${index + 1}`;
}

function readStoredLayout(key: string) {
  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return undefined;
    }

    return JSON.parse(rawValue) as WidgetLayout;
  } catch {
    return undefined;
  }
}

function writeStoredLayout(key: string, layout: WidgetLayout) {
  window.localStorage.setItem(key, JSON.stringify(layout));
}

function clearRuntimeWidgetState(widget: HTMLElement) {
  widget.classList.remove("floating-widget");

  widget.style.position = "";
  widget.style.left = "";
  widget.style.top = "";
  widget.style.width = "";
  widget.style.height = "";
  widget.style.zIndex = "";

  widget.querySelector(".floating-widget-drag-handle")?.remove();
  widget.querySelector(".floating-widget-resize-handle")?.remove();
}

function getControlledWidgets(root: HTMLElement) {
  return Array.from(root.children).filter((child): child is HTMLElement => {
    return (
      child instanceof HTMLElement &&
      (
        child.classList.contains("map-overview") ||
        child.classList.contains("token-detail-panel") ||
        child.classList.contains("tool-card")
      )
    );
  });
}

export function resetFloatingWidgetLayouts() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => window.localStorage.removeItem(key));

  window.dispatchEvent(new Event("dnd:reset-floating-widgets"));
}

export function useFloatingWidgets(enabled: boolean, rootSelector: string) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(rootSelector);

    if (!root) {
      return;
    }

    const widgets = getControlledWidgets(root);
    const cleanups: Array<() => void> = [];

    root.classList.toggle("floating-widgets-active", enabled);

    widgets.forEach((widget) => clearRuntimeWidgetState(widget));

    if (!enabled) {
      return () => {
        root.classList.remove("floating-widgets-active");
      };
    }

    widgets.forEach((widget, index) => {
      const title = getWidgetTitle(widget, index);
      const id = getWidgetId(widget, index);
      const storageKey = `${STORAGE_PREFIX}${id}`;

      const defaultWidth = Math.min(380, Math.max(280, window.innerWidth - 48));
      const defaultHeight = Math.min(420, Math.max(180, window.innerHeight - 120));
      const defaultLeft = clamp(window.innerWidth - defaultWidth - 24 - index * 18, 12, window.innerWidth - 120);
      const defaultTop = clamp(96 + index * 38, 12, window.innerHeight - 80);

      const storedLayout = readStoredLayout(storageKey);
      const layout: WidgetLayout = storedLayout ?? {
        left: defaultLeft,
        top: defaultTop,
        width: defaultWidth,
        height: defaultHeight,
      };

      function applyLayout(nextLayout: WidgetLayout) {
        widget.style.position = "fixed";
        widget.style.left = `${nextLayout.left}px`;
        widget.style.top = `${nextLayout.top}px`;
        widget.style.width = `${nextLayout.width}px`;
        widget.style.height = `${nextLayout.height}px`;
        widget.style.zIndex = `${90 + index}`;
      }

      widget.classList.add("floating-widget");
      applyLayout(layout);

      const dragHandle = document.createElement("div");
      dragHandle.className = "floating-widget-drag-handle";
      dragHandle.textContent = title;
      widget.prepend(dragHandle);

      const resizeHandle = document.createElement("div");
      resizeHandle.className = "floating-widget-resize-handle";
      resizeHandle.setAttribute("aria-hidden", "true");
      widget.append(resizeHandle);

      function saveCurrentLayout() {
        writeStoredLayout(storageKey, {
          left: parseFloat(widget.style.left || "0"),
          top: parseFloat(widget.style.top || "0"),
          width: widget.offsetWidth,
          height: widget.offsetHeight,
        });
      }

      function handleDragStart(event: PointerEvent) {
        event.preventDefault();

        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = parseFloat(widget.style.left || "0");
        const startTop = parseFloat(widget.style.top || "0");

        widget.style.zIndex = "160";

        function handleDragMove(moveEvent: PointerEvent) {
          const nextLeft = clamp(
            startLeft + moveEvent.clientX - startX,
            8,
            Math.max(8, window.innerWidth - 80),
          );

          const nextTop = clamp(
            startTop + moveEvent.clientY - startY,
            8,
            Math.max(8, window.innerHeight - 60),
          );

          widget.style.left = `${nextLeft}px`;
          widget.style.top = `${nextTop}px`;
        }

        function handleDragEnd() {
          saveCurrentLayout();
          widget.style.zIndex = `${90 + index}`;
          window.removeEventListener("pointermove", handleDragMove);
          window.removeEventListener("pointerup", handleDragEnd);
        }

        window.addEventListener("pointermove", handleDragMove);
        window.addEventListener("pointerup", handleDragEnd);
      }

      function handleResizeStart(event: PointerEvent) {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = widget.offsetWidth;
        const startHeight = widget.offsetHeight;

        widget.style.zIndex = "160";

        function handleResizeMove(moveEvent: PointerEvent) {
          const nextWidth = clamp(
            startWidth + moveEvent.clientX - startX,
            240,
            Math.max(260, window.innerWidth - 24),
          );

          const nextHeight = clamp(
            startHeight + moveEvent.clientY - startY,
            150,
            Math.max(180, window.innerHeight - 24),
          );

          widget.style.width = `${nextWidth}px`;
          widget.style.height = `${nextHeight}px`;
        }

        function handleResizeEnd() {
          saveCurrentLayout();
          widget.style.zIndex = `${90 + index}`;
          window.removeEventListener("pointermove", handleResizeMove);
          window.removeEventListener("pointerup", handleResizeEnd);
        }

        window.addEventListener("pointermove", handleResizeMove);
        window.addEventListener("pointerup", handleResizeEnd);
      }

      function handleReset() {
        window.localStorage.removeItem(storageKey);
        applyLayout({
          left: defaultLeft,
          top: defaultTop,
          width: defaultWidth,
          height: defaultHeight,
        });
      }

      dragHandle.addEventListener("pointerdown", handleDragStart);
      resizeHandle.addEventListener("pointerdown", handleResizeStart);
      window.addEventListener("dnd:reset-floating-widgets", handleReset);

      cleanups.push(() => {
        dragHandle.removeEventListener("pointerdown", handleDragStart);
        resizeHandle.removeEventListener("pointerdown", handleResizeStart);
        window.removeEventListener("dnd:reset-floating-widgets", handleReset);
        clearRuntimeWidgetState(widget);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      root.classList.remove("floating-widgets-active");
    };
  }, [enabled, rootSelector]);
}
