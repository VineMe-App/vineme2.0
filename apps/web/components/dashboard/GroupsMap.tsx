"use client";

import { useEffect, useRef } from "react";
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export interface MapGroup {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface GroupsMapProps {
  groups: MapGroup[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function paintPin(button: HTMLButtonElement, active: boolean) {
  // Scale the inner button only. MapLibre positions the outer pin with
  // its own transform, and replacing that transform sends every pin to 0,0.
  button.style.transform = active ? "scale(1.35)" : "scale(1)";
  const pin = button.parentElement;
  if (pin instanceof HTMLElement) pin.style.zIndex = active ? "2" : "1";
}

function frameGroups(map: MapLibreMap, groups: MapGroup[]) {
  if (groups.length === 0) return false;
  const { width, height } = map.getContainer().getBoundingClientRect();
  if (width < 10 || height < 10) return false;

  if (groups.length === 1) {
    const [only] = groups;
    map.jumpTo({ center: [only.longitude, only.latitude], zoom: 13 });
    return true;
  }

  const bounds = new LngLatBounds();
  for (const group of groups) {
    bounds.extend([group.longitude, group.latitude]);
  }
  map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
  return true;
}

export function GroupsMap({
  groups,
  activeId,
  onSelect,
  onHover,
}: GroupsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(
    new globalThis.Map<
      string,
      { marker: Marker; button: HTMLButtonElement }
    >(),
  );
  const groupsRef = useRef(groups);
  const needsFrameRef = useRef(true);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    groupsRef.current = groups;
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
    activeIdRef.current = activeId;
  });

  useEffect(() => {
    const container = containerRef.current;
    const markers = markersRef.current;
    if (!container || mapRef.current) return;

    setWorkerUrl("/maplibre-worker");
    const map = new MapLibreMap({
      container,
      style: MAP_STYLE,
      center: [-0.12, 51.5],
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }));
    const attribution = map
      .getContainer()
      .querySelector(".maplibregl-ctrl-attrib");
    attribution?.classList.add("maplibregl-compact");
    attribution?.classList.remove("maplibregl-compact-show");
    attribution?.removeAttribute("open");
    map.addControl(
      new NavigationControl({ showCompass: false }),
      "top-right",
    );
    mapRef.current = map;

    const observer = new ResizeObserver(() => {
      map.resize();
      if (!needsFrameRef.current || !map.isStyleLoaded()) return;
      if (frameGroups(map, groupsRef.current)) needsFrameRef.current = false;
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markers.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;

    const draw = () => {
      if (cancelled) return;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();

      for (const group of groups) {
        const pin = document.createElement("div");
        pin.style.width = "22px";
        pin.style.height = "22px";
        const button = document.createElement("button");
        button.type = "button";
        button.title = group.name;
        button.setAttribute("aria-label", `View ${group.name}`);
        Object.assign(button.style, {
          width: "100%",
          height: "100%",
          padding: "0",
          borderRadius: "999px",
          border: "2px solid white",
          background: "var(--brand-pink, #ff0083)",
          boxShadow: "0 1px 4px rgb(0 0 0 / 35%)",
          cursor: "pointer",
          transformOrigin: "center",
        });
        pin.appendChild(button);
        paintPin(button, group.id === activeIdRef.current);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectRef.current(group.id);
        });
        button.addEventListener("mouseenter", () =>
          onHoverRef.current(group.id),
        );
        button.addEventListener("mouseleave", () => onHoverRef.current(null));
        button.addEventListener("focus", () => {
          button.style.outline = "2px solid var(--brand-dark, #2c2235)";
          button.style.outlineOffset = "2px";
          onHoverRef.current(group.id);
        });
        button.addEventListener("blur", () => {
          button.style.outline = "none";
          onHoverRef.current(null);
        });

        const marker = new Marker({ element: pin, anchor: "center" })
          .setLngLat([group.longitude, group.latitude])
          .addTo(map);
        markersRef.current.set(group.id, { marker, button });
      }

      needsFrameRef.current = true;
      if (frameGroups(map, groups)) needsFrameRef.current = false;
    };

    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);

    return () => {
      cancelled = true;
    };
  }, [groups]);

  useEffect(() => {
    markersRef.current.forEach(({ button }, id) => {
      paintPin(button, id === activeId);
    });
  }, [activeId]);

  return (
    <div
      ref={containerRef}
      className="size-full overflow-hidden rounded-2xl border bg-muted"
      role="region"
      aria-label="Map of groups"
    />
  );
}
