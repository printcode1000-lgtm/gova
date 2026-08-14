"use client";

import {
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
  Popup,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { AsolMapControls } from "../AsolMapControls";
import { circleToPolygon, collection, markerAt } from "../geometry";
import { createNativePlatformGpsProvider } from "../native-platform-gps";
import { defaultTheme, resolveTheme } from "../theme";
import type {
  Coordinates,
  AsolMapControlId,
  AsolMapError,
  AsolMapHandle,
  AsolMapMarker,
  AsolMapProps,
  AsolMapViewport,
} from "../types";
import "../AsolMap.css";

export const SOURCE = {
  markers: "asol-markers",
  polygons: "asol-polygons",
  circles: "asol-circles",
  routes: "asol-routes",
  heat: "asol-heat",
  custom: "asol-geojson",
} as const;

export const present = (value: boolean | undefined, fallback = true) =>
  value ?? fallback;

export const point = (event: MapMouseEvent): Coordinates => ({
  longitude: event.lngLat.lng,
  latitude: event.lngLat.lat,
});

export const error = (
  code: AsolMapError["code"],
  cause: unknown,
  recoverable: boolean,
): AsolMapError => ({
  code,
  cause,
  recoverable,
  message: cause instanceof Error ? cause.message : String(cause),
});

export function addDataLayers(
  map: MapLibreMap,
  props: AsolMapProps,
  colors: typeof defaultTheme,
) {
  const markers = collection(props.markers ?? []);
  map.addSource(SOURCE.markers, {
    type: "geojson",
    data: markers,
    cluster: props.modes?.includes("cluster") ?? false,
    clusterRadius: props.clusterRadius ?? 50,
    clusterMaxZoom: props.clusterMaxZoom ?? 16,
  });
  map.addLayer({
    id: "asol-cluster",
    type: "circle",
    source: SOURCE.markers,
    filter: ["has", "point_count"],
    layout: {
      visibility: present(props.layers?.clusters) ? "visible" : "none",
    },
    paint: {
      "circle-color": colors.clusterColor,
      "circle-radius": ["step", ["get", "point_count"], 18, 100, 24, 1000, 32],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "asol-cluster-count",
    type: "symbol",
    source: SOURCE.markers,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-size": 12,
      visibility: present(props.layers?.clusters) ? "visible" : "none",
    },
    paint: { "text-color": "#fff" },
  });
  map.addLayer({
    id: "asol-marker",
    type: "circle",
    source: SOURCE.markers,
    filter: ["!", ["has", "point_count"]],
    layout: { visibility: present(props.layers?.markers) ? "visible" : "none" },
    paint: {
      "circle-radius": ["case", ["boolean", ["get", "selected"], false], 10, 8],
      "circle-color": ["coalesce", ["get", "color"], colors.markerColor],
      "circle-stroke-color": "#fff",
      "circle-stroke-width": 2,
    },
  });

  map.addSource(SOURCE.polygons, {
    type: "geojson",
    data: collection(props.polygons ?? []),
  });
  map.addLayer({
    id: "asol-polygons-fill",
    type: "fill",
    source: SOURCE.polygons,
    layout: {
      visibility: present(props.layers?.polygons) ? "visible" : "none",
    },
    paint: {
      "fill-color": ["coalesce", ["get", "color"], colors.polygonFill],
      "fill-opacity": 0.28,
    },
  });
  map.addLayer({
    id: "asol-polygons-line",
    type: "line",
    source: SOURCE.polygons,
    layout: {
      visibility: present(props.layers?.polygons) ? "visible" : "none",
    },
    paint: {
      "line-color": ["coalesce", ["get", "color"], colors.polygonFill],
      "line-width": 3,
    },
  });

  map.addSource(SOURCE.circles, {
    type: "geojson",
    data: collection((props.circles ?? []).map(circleToPolygon)),
  });
  map.addLayer({
    id: "asol-circles",
    type: "fill",
    source: SOURCE.circles,
    layout: { visibility: present(props.layers?.circles) ? "visible" : "none" },
    paint: {
      "fill-color": ["coalesce", ["get", "color"], colors.circleFill],
      "fill-opacity": 0.25,
      "fill-outline-color": colors.circleFill,
    },
  });

  map.addSource(SOURCE.routes, {
    type: "geojson",
    data: collection(props.routes ?? []),
  });
  map.addLayer({
    id: "asol-routes",
    type: "line",
    source: SOURCE.routes,
    layout: {
      "line-cap": "round",
      "line-join": "round",
      visibility: present(props.layers?.routes) ? "visible" : "none",
    },
    paint: {
      "line-color": ["coalesce", ["get", "color"], colors.routeColor],
      "line-width": 5,
    },
  });

  if (props.heatMap) {
    map.addSource(SOURCE.heat, { type: "geojson", data: props.heatMap });
    map.addLayer({
      id: "asol-heat",
      type: "heatmap",
      source: SOURCE.heat,
      layout: {
        visibility: present(props.layers?.heatMap) ? "visible" : "none",
      },
      paint: {
        "heatmap-weight": ["coalesce", ["get", "weight"], 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 14, 3],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 3, 14, 24],
        "heatmap-opacity": 0.8,
      },
    });
  }
  if (props.geoJson) {
    map.addSource(SOURCE.custom, { type: "geojson", data: props.geoJson });
    map.addLayer({
      id: "asol-custom-fill",
      type: "fill",
      source: SOURCE.custom,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": colors.polygonFill, "fill-opacity": 0.22 },
    });
    map.addLayer({
      id: "asol-custom-line",
      type: "line",
      source: SOURCE.custom,
      filter: ["==", ["geometry-type"], "LineString"],
      paint: { "line-color": colors.routeColor, "line-width": 3 },
    });
    map.addLayer({
      id: "asol-custom-point",
      type: "circle",
      source: SOURCE.custom,
      filter: ["==", ["geometry-type"], "Point"],
      paint: { "circle-color": colors.markerColor, "circle-radius": 6 },
    });
  }
}
