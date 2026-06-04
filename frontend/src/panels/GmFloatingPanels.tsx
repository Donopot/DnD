import { Suspense, useRef } from "react";
import { FloatingPanel } from "../components/FloatingPanel";
import type { GmFloatingPanelsProps } from "./types";
import { PanelFallback, renderGmPanelContent } from "./panelRenderer";

export function GmFloatingPanels(props: GmFloatingPanelsProps) {
  const logRefreshAbortRef = useRef<AbortController | null>(null);

  return (
    <>
      {props.fp.panels.map((panel) => (
        <FloatingPanel
          key={panel.id}
          panel={panel}
          onClose={() => props.fp.close(panel.id)}
          onMinimize={() => props.fp.minimize(panel.id)}
          onBringToFront={() => props.fp.bringToFront(panel.id)}
          onMove={(x, y) => props.fp.updatePosition(panel.id, x, y)}
          onResize={(w, h) => props.fp.updateSize(panel.id, w, h)}
        >
          <Suspense fallback={<PanelFallback />}>
            {renderGmPanelContent(panel.id, {
              ...props,
              logRefreshAbortRef,
              setSelectedTokenId: (id) => props.setSelectedTokenId(id),
              setSelectedSceneId: (id) => props.setSelectedSceneId(id),
            })}
          </Suspense>
        </FloatingPanel>
      ))}
    </>
  );
}
