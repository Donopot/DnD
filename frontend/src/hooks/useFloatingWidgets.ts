import { useEffect } from "react";

type WidgetLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type WidgetMeta = {
  hidden: boolean;
  locked: boolean;
  collapsed: boolean;
  zIndex: number;
};

const STORAGE_ROOT = "dnd-floating-widget:";
const LAYOUT_PREFIX = `${STORAGE_ROOT}layout:`;
const META_PREFIX = `${STORAGE_ROOT}meta:`;

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

function readStoredValue<T>(key: string) {
  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return undefined;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return undefined;
  }
}

function writeStoredValue<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function clearRuntimeWidgetState(widget: HTMLElement) {
  widget.classList.remove(
    "floating-widget",
    "floating-widget-locked",
    "floating-widget-collapsed",
  );

  widget.style.position = "";
  widget.style.left = "";
  widget.style.top = "";
  widget.style.width = "";
  widget.style.height = "";
  widget.style.zIndex = "";
  widget.style.display = "";

  widget.querySelector(".floating-widget-toolbar")?.remove();
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

function createToolbarButton(label: string, title: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  return button;
}

export function resetFloatingWidgetLayouts() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(STORAGE_ROOT))
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
    let topZIndex = 180;

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
      const layoutKey = `${LAYOUT_PREFIX}${id}`;
      const metaKey = `${META_PREFIX}${id}`;

      const defaultWidth = Math.min(380, Math.max(280, window.innerWidth - 48));
      const defaultHeight = Math.min(420, Math.max(180, window.innerHeight - 120));
      const defaultLeft = clamp(
        window.innerWidth - defaultWidth - 24 - index * 18,
        12,
        Math.max(12, window.innerWidth - 120),
      );
      const defaultTop = clamp(96 + index * 38, 12, Math.max(12, window.innerHeight - 80));

      const defaultLayout: WidgetLayout = {
        left: defaultLeft,
        top: defaultTop,
        width: defaultWidth,
        height: defaultHeight,
      };

      const defaultMeta: WidgetMeta = {
        hidden: false,
        locked: false,
        collapsed: false,
        zIndex: 90 + index,
      };

      let currentLayout = readStoredValue<WidgetLayout>(layoutKey) ?? defaultLayout;
      let currentMeta = readStoredValue<WidgetMeta>(metaKey) ?? defaultMeta;

      function saveLayout() {
        currentLayout = {
          left: parseFloat(widget.style.left || "0"),
          top: parseFloat(widget.style.top || "0"),
          width: widget.offsetWidth,
          height: widget.offsetHeight,
        };

        writeStoredValue(layoutKey, currentLayout);
      }

      function saveMeta(nextMeta: Partial<WidgetMeta>) {
        currentMeta = {
          ...currentMeta,
          ...nextMeta,
        };

        writeStoredValue(metaKey, currentMeta);
        applyMeta();
      }

      function applyLayout(layout: WidgetLayout) {
        widget.style.position = "fixed";
        widget.style.left = `${layout.left}px`;
        widget.style.top = `${layout.top}px`;
        widget.style.width = `${layout.width}px`;
        widget.style.height = `${layout.height}px`;
      }

      function applyMeta() {
        widget.style.display = currentMeta.hidden ? "none" : "";
        widget.style.zIndex = `${currentMeta.zIndex}`;

        widget.classList.toggle("floating-widget-locked", currentMeta.locked);
        widget.classList.toggle("floating-widget-collapsed", currentMeta.collapsed);

        lockButton.textContent = currentMeta.locked ? "Deverr." : "Verrou";
        lockButton.title = currentMeta.locked ? "Deverrouiller le panneau" : "Verrouiller le panneau";
        lockButton.setAttribute("aria-label", lockButton.title);

        collapseButton.textContent = currentMeta.collapsed ? "Ouvrir" : "Reduire";
        collapseButton.title = currentMeta.collapsed ? "Ouvrir le panneau" : "Reduire le panneau";
        collapseButton.setAttribute("aria-label", collapseButton.title);
      }

      function bringToFront() {
        topZIndex += 1;
        saveMeta({ zIndex: topZIndex });
      }

      widget.classList.add("floating-widget");

      const toolbar = document.createElement("div");
      toolbar.className = "floating-widget-toolbar";

      const titleElement = document.createElement("strong");
      titleElement.className = "floating-widget-toolbar-title";
      titleElement.textContent = title;

      const actions = document.createElement("div");
      actions.className = "floating-widget-toolbar-actions";

      const frontButton = createToolbarButton("Avant", "Mettre au premier plan");
      const lockButton = createToolbarButton("Verrou", "Verrouiller le panneau");
      const collapseButton = createToolbarButton("Reduire", "Reduire le panneau");
      const hideButton = createToolbarButton("Fermer", "Fermer le panneau");

      actions.append(frontButton, lockButton, collapseButton, hideButton);
      toolbar.append(titleElement, actions);
      widget.prepend(toolbar);

      const resizeHandle = document.createElement("div");
      resizeHandle.className = "floating-widget-resize-handle";
      resizeHandle.setAttribute("aria-hidden", "true");
      widget.append(resizeHandle);

      applyLayout(currentLayout);
      applyMeta();

      function handleToolbarPointerDown(event: PointerEvent) {
        if (currentMeta.locked || (event.target instanceof HTMLElement && event.target.closest("button"))) {
          return;
        }

        event.preventDefault();
        bringToFront();

        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = parseFloat(widget.style.left || "0");
        const startTop = parseFloat(widget.style.top || "0");

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
          saveLayout();
          window.removeEventListener("pointermove", handleDragMove);
          window.removeEventListener("pointerup", handleDragEnd);
        }

        window.addEventListener("pointermove", handleDragMove);
        window.addEventListener("pointerup", handleDragEnd);
      }

      function handleResizeStart(event: PointerEvent) {
        if (currentMeta.locked || currentMeta.collapsed) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        bringToFront();

        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = widget.offsetWidth;
        const startHeight = widget.offsetHeight;

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
          saveLayout();
          window.removeEventListener("pointermove", handleResizeMove);
          window.removeEventListener("pointerup", handleResizeEnd);
        }

        window.addEventListener("pointermove", handleResizeMove);
        window.addEventListener("pointerup", handleResizeEnd);
      }

      function handleWidgetPointerDown() {
        bringToFront();
      }

      function handleReset() {
        window.localStorage.removeItem(layoutKey);
        window.localStorage.removeItem(metaKey);

        currentLayout = defaultLayout;
        currentMeta = defaultMeta;

        applyLayout(currentLayout);
        applyMeta();
      }

      function handleFrontClick(event: MouseEvent) {
        event.stopPropagation();
        bringToFront();
      }

      function handleLockClick(event: MouseEvent) {
        event.stopPropagation();
        saveMeta({ locked: !currentMeta.locked });
      }

      function handleCollapseClick(event: MouseEvent) {
        event.stopPropagation();
        saveMeta({ collapsed: !currentMeta.collapsed });
      }

      function handleHideClick(event: MouseEvent) {
        event.stopPropagation();
        saveMeta({ hidden: true });
      }

      toolbar.addEventListener("pointerdown", handleToolbarPointerDown);
      resizeHandle.addEventListener("pointerdown", handleResizeStart);
      widget.addEventListener("pointerdown", handleWidgetPointerDown);

      frontButton.addEventListener("click", handleFrontClick);
      lockButton.addEventListener("click", handleLockClick);
      collapseButton.addEventListener("click", handleCollapseClick);
      hideButton.addEventListener("click", handleHideClick);

      window.addEventListener("dnd:reset-floating-widgets", handleReset);

      cleanups.push(() => {
        toolbar.removeEventListener("pointerdown", handleToolbarPointerDown);
        resizeHandle.removeEventListener("pointerdown", handleResizeStart);
        widget.removeEventListener("pointerdown", handleWidgetPointerDown);

        frontButton.removeEventListener("click", handleFrontClick);
        lockButton.removeEventListener("click", handleLockClick);
        collapseButton.removeEventListener("click", handleCollapseClick);
        hideButton.removeEventListener("click", handleHideClick);

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
