import { useEffect } from "react";

import { VTT_PANELS, isVttPanelId, type FloatingWidgetPreset } from "../config/vttPanels";

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
  pinned: boolean;
  zIndex: number;
};

const STORAGE_ROOT = "dnd-floating-widget:";
const LAYOUT_PREFIX = `${STORAGE_ROOT}layout:`;
const META_PREFIX = `${STORAGE_ROOT}meta:`;
const CUSTOM_LAYOUT_PREFIX = `${STORAGE_ROOT}custom-layout:`;
const CUSTOM_META_PREFIX = `${STORAGE_ROOT}custom-meta:`;

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
  const widgetId =
    widget.getAttribute("data-vtt-panel") ||
    widget.getAttribute("data-floating-widget") ||
    widget.getAttribute("data-quick-panel") ||
    "";

  const registryLabel = isVttPanelId(widgetId)
    ? VTT_PANELS.find((panel) => panel.id === widgetId)?.label
    : undefined;

  return (
    widget.getAttribute("data-floating-title") ||
    registryLabel ||
    widget.querySelector<HTMLElement>("summary, h4, .map-overview-header span, .token-detail-heading h4")
      ?.textContent
      ?.trim() ||
    `Panneau ${index + 1}`
  );
}

function getWidgetId(widget: HTMLElement, index: number) {
  return (
    widget.getAttribute("data-vtt-panel") ||
    widget.getAttribute("data-floating-widget") ||
    widget.getAttribute("data-quick-panel") ||
    slugify(getWidgetTitle(widget, index)) ||
    `widget-${index + 1}`
  );
}

function readStoredValue<T>(key: string) {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredValue<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getDefaultMeta(index: number): WidgetMeta {
  return {
    hidden: false,
    locked: false,
    collapsed: false,
    pinned: false,
    zIndex: 90 + index,
  };
}

function readStoredMeta(key: string, index: number): WidgetMeta {
  return {
    ...getDefaultMeta(index),
    ...(readStoredValue<Partial<WidgetMeta>>(key) ?? {}),
  };
}

function clearRuntimeWidgetState(widget: HTMLElement) {
  widget.classList.remove(
    "floating-widget",
    "floating-widget-locked",
    "floating-widget-collapsed",
    "floating-widget-pinned",
  );

  widget.style.position = "";
  widget.style.left = "";
  widget.style.top = "";
  widget.style.width = "";
  widget.style.height = "";
  widget.style.zIndex = "";
  widget.style.display = "";

  widget.removeAttribute("data-floating-runtime-id");
  widget.removeAttribute("data-floating-runtime-title");
  widget.removeAttribute("data-floating-runtime-state");

  widget.querySelector(".floating-widget-toolbar")?.remove();
  widget.querySelector(".floating-widget-resize-handle")?.remove();
}

function getControlledWidgets(root: HTMLElement) {
  const panelOrder = new Map(VTT_PANELS.map((panel, index) => [panel.id, index]));

  return Array.from(root.querySelectorAll<HTMLElement>("[data-vtt-panel]")).sort((left, right) => {
    const leftId = left.getAttribute("data-vtt-panel") || "";
    const rightId = right.getAttribute("data-vtt-panel") || "";

    return (panelOrder.get(leftId as never) ?? 999) - (panelOrder.get(rightId as never) ?? 999);
  });
}

function createToolbarButton(label: string, title: string, className: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.className = className;
  button.setAttribute("aria-label", title);
  return button;
}

function getPresetLayout(preset: FloatingWidgetPreset, widgetId: string, index: number): WidgetLayout {
  const margin = 18;
  const rightPanelWidth = Math.min(390, Math.max(320, window.innerWidth * 0.24));
  const compactWidth = Math.min(320, Math.max(260, window.innerWidth * 0.2));
  const left = Math.max(margin, window.innerWidth - rightPanelWidth - margin);
  const compactLeft = Math.max(margin, window.innerWidth - compactWidth - margin);

  if (preset === "combat") {
    const layouts: Record<string, WidgetLayout> = {
      minimap: { left: margin, top: 92, width: compactWidth, height: 260 },
      "token-detail": { left: compactLeft, top: 92, width: compactWidth, height: 300 },
      token: { left: compactLeft, top: 410, width: compactWidth, height: 330 },
      tokens: { left: compactLeft, top: 760, width: compactWidth, height: 280 },
      scene: { left: margin, top: 370, width: compactWidth, height: 260 },
      "upload-map": { left: margin, top: 650, width: compactWidth, height: 220 },
      background: { left: margin, top: 890, width: compactWidth, height: 220 },
    };

    return layouts[widgetId] ?? { left: compactLeft, top: 110 + index * 42, width: compactWidth, height: 260 };
  }

  if (preset === "preparation") {
    const layouts: Record<string, WidgetLayout> = {
      scene: { left: margin, top: 92, width: rightPanelWidth, height: 380 },
      "upload-map": { left: margin, top: 490, width: rightPanelWidth, height: 260 },
      background: { left: margin, top: 770, width: rightPanelWidth, height: 280 },
      minimap: { left, top: 92, width: rightPanelWidth, height: 260 },
      token: { left, top: 370, width: rightPanelWidth, height: 360 },
      tokens: { left, top: 750, width: rightPanelWidth, height: 300 },
      "token-detail": { left, top: 1070, width: rightPanelWidth, height: 240 },
    };

    return layouts[widgetId] ?? { left, top: 110 + index * 42, width: rightPanelWidth, height: 280 };
  }

  const layouts: Record<string, WidgetLayout> = {
    minimap: { left, top: 92, width: rightPanelWidth, height: 260 },
    "token-detail": { left, top: 370, width: rightPanelWidth, height: 320 },
    token: { left, top: 710, width: rightPanelWidth, height: 340 },
    tokens: { left, top: 1070, width: rightPanelWidth, height: 280 },
    scene: { left: margin, top: 92, width: compactWidth, height: 230 },
    "upload-map": { left: margin, top: 340, width: compactWidth, height: 210 },
    background: { left: margin, top: 570, width: compactWidth, height: 230 },
  };

  return layouts[widgetId] ?? { left, top: 110 + index * 42, width: rightPanelWidth, height: 280 };
}

function getPresetMeta(preset: FloatingWidgetPreset, widgetId: string, index: number): WidgetMeta {
  const common = getDefaultMeta(index);

  if (preset === "combat") {
    return {
      ...common,
      hidden: widgetId === "upload-map" || widgetId === "background",
      collapsed: widgetId === "scene",
    };
  }

  if (preset === "preparation") {
    return {
      ...common,
      hidden: false,
      collapsed: widgetId === "token-detail",
    };
  }

  return {
    ...common,
    hidden: false,
    collapsed: widgetId === "upload-map" || widgetId === "background",
  };
}

function reopenFloatingWidgetDom(widgetId: string) {
  const widgets = Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-floating-runtime-id], [data-vtt-panel], [data-floating-widget], [data-quick-panel]",
    ),
  );

  const widget = widgets.find((candidate) => {
    return (
      candidate.getAttribute("data-floating-runtime-id") === widgetId ||
      candidate.getAttribute("data-vtt-panel") === widgetId ||
      candidate.getAttribute("data-floating-widget") === widgetId ||
      candidate.getAttribute("data-quick-panel") === widgetId
    );
  });

  if (!widget) {
    return;
  }

  widget.style.display = "";
  widget.style.zIndex = "260";
  widget.classList.remove("floating-widget-collapsed", "floating-widget-pinned");

  if (widget instanceof HTMLDetailsElement) {
    widget.open = true;
  }

  widget.focus({ preventScroll: true });
}

export function resetFloatingWidgetLayouts() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith(LAYOUT_PREFIX) || key.startsWith(META_PREFIX))
    .forEach((key) => window.localStorage.removeItem(key));

  window.dispatchEvent(new Event("dnd:reset-floating-widgets"));
}

export function showFloatingWidget(widgetId: string) {
  const metaKey = `${META_PREFIX}${widgetId}`;
  const storedMeta = readStoredValue<Partial<WidgetMeta>>(metaKey);

  writeStoredValue<Partial<WidgetMeta>>(metaKey, {
    ...storedMeta,
    hidden: false,
    collapsed: false,
    pinned: false,
    zIndex: Math.max(storedMeta?.zIndex ?? 180, 260),
  });

  reopenFloatingWidgetDom(widgetId);

  window.dispatchEvent(
    new CustomEvent("dnd:show-floating-widget", {
      detail: { widgetId },
    }),
  );

  window.requestAnimationFrame(() => {
    reopenFloatingWidgetDom(widgetId);
  });
}

export function applyFloatingWidgetPreset(preset: FloatingWidgetPreset) {
  window.dispatchEvent(
    new CustomEvent("dnd:apply-floating-widget-preset", {
      detail: { preset },
    }),
  );
}

export function saveFloatingWidgetCustomPreset() {
  window.dispatchEvent(new Event("dnd:save-floating-widget-custom-preset"));
}

export function useFloatingWidgets(enabled: boolean, rootSelector: string, refreshKey = "") {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(rootSelector);

    if (!root) {
      return;
    }

    const rootElement = root;
    const widgets = getControlledWidgets(rootElement);
    const cleanups: Array<() => void> = [];
    let topZIndex = 180;

    rootElement.classList.toggle("floating-widgets-active", enabled);
    widgets.forEach((widget) => clearRuntimeWidgetState(widget));

    if (!enabled) {
      return () => {
        rootElement.classList.remove("floating-widgets-active");
      };
    }

    const dock = document.createElement("div");
    dock.className = "floating-widget-dock";
    dock.hidden = true;
    dock.setAttribute("aria-label", "Dock des panneaux masqués");

    function updateDock() {
      const dockedWidgets = widgets.filter((widget) => {
        const isCollapsed = widget.classList.contains("floating-widget-collapsed");
        const isHidden = widget.style.display === "none";
        const isPinned = widget.classList.contains("floating-widget-pinned");

        return isHidden || (!isPinned && isCollapsed);
      });

      dock.replaceChildren();

      if (dockedWidgets.length === 0) {
        dock.hidden = true;
        return;
      }

      dock.hidden = false;

      const label = document.createElement("strong");
      label.textContent = "Panneaux masqués";
      dock.append(label);

      const list = document.createElement("div");
      list.className = "floating-widget-dock-list";

      dockedWidgets.forEach((widget) => {
        const id = widget.getAttribute("data-floating-runtime-id");
        const title = widget.getAttribute("data-floating-runtime-title");

        if (!id || !title) {
          return;
        }

        const isHidden = widget.style.display === "none";
        const stateLabel = isHidden ? "fermé" : "réduit";

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${title} · ${stateLabel}`;
        button.dataset.floatingDockWidget = id;
        button.dataset.floatingDockState = stateLabel;
        button.title = `Afficher ${title}`;
        button.setAttribute("aria-label", `Afficher ${title}`);

        list.append(button);
      });

      dock.append(list);
    }

    function handleDockClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const button = target.closest("button[data-floating-dock-widget]");

      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const widgetId = button.dataset.floatingDockWidget;

      if (widgetId) {
        showFloatingWidget(widgetId);
      }
    }

    dock.addEventListener("click", handleDockClick);
    document.body.append(dock);

    cleanups.push(() => {
      dock.removeEventListener("click", handleDockClick);
      dock.remove();
    });

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

      let currentLayout = readStoredValue<WidgetLayout>(layoutKey) ?? defaultLayout;
      let currentMeta = readStoredMeta(metaKey, index);

      const toolbar = document.createElement("div");
      toolbar.className = "floating-widget-toolbar";

      const titleElement = document.createElement("strong");
      titleElement.className = "floating-widget-toolbar-title";
      titleElement.textContent = title;

      const actions = document.createElement("div");
      actions.className = "floating-widget-toolbar-actions";

      const frontButton = createToolbarButton("↑", "Mettre au premier plan", "floating-action-front");
      const pinButton = createToolbarButton("📌", "Épingler dans le panneau latéral", "floating-action-pin");
      const lockButton = createToolbarButton("🔒", "Verrouiller le panneau", "floating-action-lock");
      const collapseButton = createToolbarButton("−", "Réduire le panneau", "floating-action-collapse");
      const hideButton = createToolbarButton("×", "Fermer le panneau", "floating-action-close");

      actions.append(frontButton, pinButton, lockButton, collapseButton, hideButton);
      toolbar.append(titleElement, actions);
      widget.prepend(toolbar);

      const resizeHandle = document.createElement("div");
      resizeHandle.className = "floating-widget-resize-handle";
      resizeHandle.setAttribute("aria-hidden", "true");
      widget.append(resizeHandle);

      function saveLayout() {
        if (!currentMeta.hidden && !currentMeta.collapsed && !currentMeta.pinned) {
          currentLayout = {
            left: parseFloat(widget.style.left || "0"),
            top: parseFloat(widget.style.top || "0"),
            width: widget.offsetWidth || currentLayout.width,
            height: widget.offsetHeight || currentLayout.height,
          };
        }

        writeStoredValue(layoutKey, currentLayout);
      }

      function applyLayout(layout: WidgetLayout) {
        if (currentMeta.pinned) {
          widget.style.position = "relative";
          widget.style.left = "";
          widget.style.top = "";
          widget.style.width = "";
          widget.style.height = "";
          return;
        }

        widget.style.position = "fixed";
        widget.style.left = `${layout.left}px`;
        widget.style.top = `${layout.top}px`;
        widget.style.width = `${layout.width}px`;
        widget.style.height = `${layout.height}px`;
      }

      function applyMeta() {
        applyLayout(currentLayout);

        widget.style.display = currentMeta.hidden ? "none" : "";
        widget.style.zIndex = `${currentMeta.zIndex}`;

        widget.classList.toggle("floating-widget-locked", currentMeta.locked);
        widget.classList.toggle("floating-widget-collapsed", currentMeta.collapsed);
        widget.classList.toggle("floating-widget-pinned", currentMeta.pinned);

        widget.dataset.floatingRuntimeState = currentMeta.hidden
          ? "closed"
          : currentMeta.collapsed
            ? "collapsed"
            : currentMeta.pinned
              ? "pinned"
              : "open";

        pinButton.textContent = currentMeta.pinned ? "↗" : "📌";
        pinButton.title = currentMeta.pinned ? "Détacher en panneau flottant" : "Épingler dans le panneau latéral";
        pinButton.setAttribute("aria-label", pinButton.title);

        lockButton.textContent = currentMeta.locked ? "🔓" : "🔒";
        lockButton.title = currentMeta.locked ? "Déverrouiller le panneau" : "Verrouiller le panneau";
        lockButton.setAttribute("aria-label", lockButton.title);

        collapseButton.textContent = currentMeta.collapsed ? "+" : "−";
        collapseButton.title = currentMeta.collapsed ? "Ouvrir le panneau" : "Réduire le panneau";
        collapseButton.setAttribute("aria-label", collapseButton.title);

        updateDock();
      }

      function saveMeta(nextMeta: Partial<WidgetMeta>) {
        currentMeta = {
          ...currentMeta,
          ...nextMeta,
        };

        writeStoredValue(metaKey, currentMeta);
        applyMeta();
      }

      function bringToFront() {
        if (currentMeta.pinned) {
          return;
        }

        topZIndex += 1;
        saveMeta({ zIndex: topZIndex });
      }

      widget.classList.add("floating-widget");
      widget.setAttribute("data-floating-runtime-id", id);
      widget.setAttribute("data-floating-runtime-title", title);

      const wasDetailsOpen = widget instanceof HTMLDetailsElement ? widget.open : undefined;

      if (widget instanceof HTMLDetailsElement) {
        widget.open = true;
      }

      applyMeta();

      function handleToolbarPointerDown(event: PointerEvent) {
        if (
          currentMeta.locked ||
          currentMeta.pinned ||
          (event.target instanceof HTMLElement && event.target.closest("button"))
        ) {
          return;
        }

        event.preventDefault();
        bringToFront();

        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = parseFloat(widget.style.left || "0");
        const startTop = parseFloat(widget.style.top || "0");

        function handleDragMove(moveEvent: PointerEvent) {
          widget.style.left = `${clamp(startLeft + moveEvent.clientX - startX, 8, Math.max(8, window.innerWidth - 80))}px`;
          widget.style.top = `${clamp(startTop + moveEvent.clientY - startY, 8, Math.max(8, window.innerHeight - 60))}px`;
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
        if (currentMeta.locked || currentMeta.collapsed || currentMeta.pinned) {
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
          widget.style.width = `${clamp(startWidth + moveEvent.clientX - startX, 240, Math.max(260, window.innerWidth - 24))}px`;
          widget.style.height = `${clamp(startHeight + moveEvent.clientY - startY, 150, Math.max(180, window.innerHeight - 24))}px`;
        }

        function handleResizeEnd() {
          saveLayout();
          window.removeEventListener("pointermove", handleResizeMove);
          window.removeEventListener("pointerup", handleResizeEnd);
        }

        window.addEventListener("pointermove", handleResizeMove);
        window.addEventListener("pointerup", handleResizeEnd);
      }

      function handleReset() {
        window.localStorage.removeItem(layoutKey);
        window.localStorage.removeItem(metaKey);

        currentLayout = defaultLayout;
        currentMeta = getDefaultMeta(index);

        applyMeta();
      }

      function handleShowWidget(event: Event) {
        const detail = (event as CustomEvent<{ widgetId?: string }>).detail;

        if (detail?.widgetId !== id) {
          return;
        }

        topZIndex += 1;

        saveMeta({
          hidden: false,
          collapsed: false,
          pinned: false,
          zIndex: topZIndex,
        });

        reopenFloatingWidgetDom(id);
      }

      function handleApplyPreset(event: Event) {
        const detail = (event as CustomEvent<{ preset?: FloatingWidgetPreset }>).detail;

        if (!detail?.preset) {
          return;
        }

        if (detail.preset === "custom") {
          const savedLayout = readStoredValue<WidgetLayout>(`${CUSTOM_LAYOUT_PREFIX}${id}`);
          const savedMeta = readStoredValue<Partial<WidgetMeta>>(`${CUSTOM_META_PREFIX}${id}`);

          if (!savedLayout && !savedMeta) {
            return;
          }

          currentLayout = savedLayout ?? currentLayout;
          currentMeta = {
            ...currentMeta,
            ...savedMeta,
          };
        } else {
          currentLayout = getPresetLayout(detail.preset, id, index);
          currentMeta = getPresetMeta(detail.preset, id, index);
        }

        writeStoredValue(layoutKey, currentLayout);
        writeStoredValue(metaKey, currentMeta);

        applyMeta();
      }

      function handleSaveCustomPreset() {
        saveLayout();

        writeStoredValue(`${CUSTOM_LAYOUT_PREFIX}${id}`, currentLayout);
        writeStoredValue(`${CUSTOM_META_PREFIX}${id}`, currentMeta);
      }

      function handleFrontClick(event: MouseEvent) {
        event.stopPropagation();
        bringToFront();
      }

      function handlePinClick(event: MouseEvent) {
        event.stopPropagation();

        saveMeta({
          pinned: !currentMeta.pinned,
          hidden: false,
          collapsed: false,
        });
      }

      function handleLockClick(event: MouseEvent) {
        event.stopPropagation();
        saveMeta({ locked: !currentMeta.locked });
      }

      function handleCollapseClick(event: MouseEvent) {
        event.stopPropagation();
        saveMeta({ collapsed: !currentMeta.collapsed, hidden: false });
      }

      function handleHideClick(event: MouseEvent) {
        event.stopPropagation();
        saveMeta({ hidden: true, collapsed: false });
      }

      toolbar.addEventListener("pointerdown", handleToolbarPointerDown);
      resizeHandle.addEventListener("pointerdown", handleResizeStart);
      widget.addEventListener("pointerdown", bringToFront);

      frontButton.addEventListener("click", handleFrontClick);
      pinButton.addEventListener("click", handlePinClick);
      lockButton.addEventListener("click", handleLockClick);
      collapseButton.addEventListener("click", handleCollapseClick);
      hideButton.addEventListener("click", handleHideClick);

      window.addEventListener("dnd:reset-floating-widgets", handleReset);
      window.addEventListener("dnd:show-floating-widget", handleShowWidget);
      window.addEventListener("dnd:apply-floating-widget-preset", handleApplyPreset);
      window.addEventListener("dnd:save-floating-widget-custom-preset", handleSaveCustomPreset);

      cleanups.push(() => {
        toolbar.removeEventListener("pointerdown", handleToolbarPointerDown);
        resizeHandle.removeEventListener("pointerdown", handleResizeStart);
        widget.removeEventListener("pointerdown", bringToFront);

        frontButton.removeEventListener("click", handleFrontClick);
        pinButton.removeEventListener("click", handlePinClick);
        lockButton.removeEventListener("click", handleLockClick);
        collapseButton.removeEventListener("click", handleCollapseClick);
        hideButton.removeEventListener("click", handleHideClick);

        window.removeEventListener("dnd:reset-floating-widgets", handleReset);
        window.removeEventListener("dnd:show-floating-widget", handleShowWidget);
        window.removeEventListener("dnd:apply-floating-widget-preset", handleApplyPreset);
        window.removeEventListener("dnd:save-floating-widget-custom-preset", handleSaveCustomPreset);

        if (widget instanceof HTMLDetailsElement && typeof wasDetailsOpen === "boolean") {
          widget.open = wasDetailsOpen;
        }

        clearRuntimeWidgetState(widget);
      });
    });

    updateDock();

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      rootElement.classList.remove("floating-widgets-active");
    };
  }, [enabled, rootSelector, refreshKey]);
}
