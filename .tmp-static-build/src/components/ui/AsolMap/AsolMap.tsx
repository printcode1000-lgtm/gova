"use client";

import maplibregl, {
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
import { AsolMapControls } from "./AsolMapControls";
import { circleToPolygon, collection, markerAt } from "./geometry";
import { createBrowserGpsProvider } from "./gps";
import { defaultTheme, resolveTheme } from "./theme";
import type {
  Coordinates,
  AsolMapControlId,
  AsolMapError,
  AsolMapHandle,
  AsolMapMarker,
  AsolMapProps,
  AsolMapViewport,
} from "./types";
import "./AsolMap.css";

const SOURCE = {
  markers: "asol-markers",
  polygons: "asol-polygons",
  circles: "asol-circles",
  routes: "asol-routes",
  heat: "asol-heat",
  custom: "asol-geojson",
} as const;
const present = (value: boolean | undefined, fallback = true) =>
  value ?? fallback;
const point = (event: MapMouseEvent): Coordinates => ({
  longitude: event.lngLat.lng,
  latitude: event.lngLat.lat,
});
const error = (
  code: AsolMapError["code"],
  cause: unknown,
  recoverable: boolean,
): AsolMapError => ({
  code,
  cause,
  recoverable,
  message: cause instanceof Error ? cause.message : String(cause),
});

function addDataLayers(
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

export const AsolMap = forwardRef<AsolMapHandle, AsolMapProps>(
  function AsolMap(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const propsRef = useRef(props);
    propsRef.current = props;
    const stopGpsRef = useRef<(() => void) | null>(null);
    const popupRef = useRef<{ popup: Popup; root?: Root } | null>(null);
    const pressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const polygonDraftRef = useRef<[number, number][]>([]);
    const circleCenterRef = useRef<Coordinates | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "error">(
      "loading",
    );
    const [fatal, setFatal] = useState<AsolMapError | null>(null);
    const theme = useMemo(
      () => ({ ...defaultTheme, ...props.theme }),
      [props.theme],
    );
    const modes = props.modes ?? ["view"];

    const emitError = useCallback((value: AsolMapError) => {
      propsRef.current.onError?.(value);
      if (!value.recoverable) {
        setFatal(value);
        setStatus("error");
      }
    }, []);
    const startGps = useCallback(async () => {
      const provider =
        propsRef.current.providers.gps ?? createBrowserGpsProvider();
      try {
        if (!(await provider.isAvailable()))
          throw new Error("Geolocation is unavailable on this device.");
        propsRef.current.onGpsStarted?.();
        const location = await provider.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 5_000,
        });
        propsRef.current.onLocationChanged?.(location);
        propsRef.current.onGpsCompleted?.(location);
        mapRef.current?.flyTo({
          center: [location.longitude, location.latitude],
          zoom: Math.max(mapRef.current.getZoom(), 15),
        });
        if (modes.includes("tracking") && provider.watchPosition)
          stopGpsRef.current = await provider.watchPosition(
            (next) => {
              propsRef.current.onLocationChanged?.(next);
              mapRef.current?.easeTo({
                center: [next.longitude, next.latitude],
              });
            },
            (cause) => propsRef.current.onGpsError?.(error("gps", cause, true)),
            { enableHighAccuracy: true },
          );
      } catch (cause) {
        const value = error("gps", cause, true);
        propsRef.current.onGpsError?.(value);
        emitError(value);
      }
    }, [emitError, modes]);

    const initialize = useCallback(async () => {
      if (!containerRef.current || mapRef.current) return;
      setStatus("loading");
      setFatal(null);
      try {
        const current = propsRef.current;
        const currentTheme = resolveTheme(current.theme?.name ?? "auto");
        const style = await current.providers.tile.getStyle(currentTheme);
        if (!containerRef.current) return;
        const initial = current.initialViewport ?? {
          latitude: 29.9668,
          longitude: 32.5498,
          zoom: 9.5,
        };
        const map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: [initial.longitude, initial.latitude],
          zoom: initial.zoom,
          bearing: initial.bearing ?? 0,
          pitch: initial.pitch ?? 0,
          minZoom: current.minZoom,
          maxZoom: current.maxZoom,
          attributionControl: { compact: false },
          cooperativeGestures: false,
          transformRequest: current.providers.tile.transformRequest,
        });
        mapRef.current = map;
        map.keyboard.enable();
        map.touchZoomRotate.enable();
        current.onReady?.(map);
        map.once("load", () => {
          addDataLayers(map, propsRef.current, {
            ...defaultTheme,
            ...propsRef.current.theme,
          });
          setStatus("ready");
          propsRef.current.onMapLoaded?.(map);
        });

        map.on("click", (event) => {
          const features = map.queryRenderedFeatures(event.point, {
            layers: ["asol-marker", "asol-cluster"],
          });
          const feature = features[0];
          if (feature?.properties?.cluster_id != null) {
            const source = map.getSource(SOURCE.markers) as GeoJSONSource;
            void source
              .getClusterExpansionZoom(Number(feature.properties.cluster_id))
              .then((zoom) =>
                map.easeTo({
                  center: (feature.geometry as GeoJSON.Point).coordinates as [
                    number,
                    number,
                  ],
                  zoom,
                }),
              );
            return;
          }
          if (feature?.layer.id === "asol-marker") {
            const marker =
              propsRef.current.markers?.find(
                (item) => item.properties.id === feature.properties?.id,
              ) ?? null;
            propsRef.current.onMarkerSelected?.(marker);
            popupRef.current?.root?.unmount();
            popupRef.current?.popup.remove();
            popupRef.current = null;
            if (
              marker?.properties.popup &&
              present(propsRef.current.layers?.popup)
            ) {
              const element = document.createElement("div");
              element.className = "asol-map__popup";
              const popup = new maplibregl.Popup({
                closeButton: true,
                closeOnClick: true,
              })
                .setLngLat(marker.geometry.coordinates as [number, number])
                .setDOMContent(element)
                .addTo(map);
              if (typeof marker.properties.popup === "string")
                element.textContent = marker.properties.popup;
              else {
                const root = createRoot(element);
                root.render(marker.properties.popup);
                popupRef.current = { popup, root };
              }
              if (!popupRef.current) popupRef.current = { popup };
            }
            return;
          }
          const coordinates = point(event);
          propsRef.current.onTap?.(coordinates);
          if (propsRef.current.modes?.includes("polygonEditor")) {
            polygonDraftRef.current.push([
              coordinates.longitude,
              coordinates.latitude,
            ]);
          }
          if (propsRef.current.modes?.includes("circleEditor")) {
            if (!circleCenterRef.current) circleCenterRef.current = coordinates;
            else {
              const center = circleCenterRef.current;
              circleCenterRef.current = null;
              const radians = (value: number) => (value * Math.PI) / 180;
              const dLat = radians(coordinates.latitude - center.latitude);
              const dLng = radians(coordinates.longitude - center.longitude);
              const a =
                Math.sin(dLat / 2) ** 2 +
                Math.cos(radians(center.latitude)) *
                  Math.cos(radians(coordinates.latitude)) *
                  Math.sin(dLng / 2) ** 2;
              propsRef.current.onCircleCreated?.({
                id: globalThis.crypto?.randomUUID?.() ?? `circle-${Date.now()}`,
                ...center,
                radiusMeters:
                  6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
              });
            }
          }
          if (
            propsRef.current.modes?.some(
              (mode) => mode === "picker" || mode === "multiMarker",
            )
          ) {
            const marker = markerAt(
              coordinates.longitude,
              coordinates.latitude,
            );
            propsRef.current.onMarkerAdded?.(marker);
            propsRef.current.onMarkersChanged?.([
              ...(propsRef.current.markers ?? []),
              marker,
            ]);
          }
        });
        map.on("dblclick", (event) => {
          propsRef.current.onDoubleTap?.(point(event));
          const draft = polygonDraftRef.current;
          if (
            propsRef.current.modes?.includes("polygonEditor") &&
            draft.length >= 3
          ) {
            const id =
              globalThis.crypto?.randomUUID?.() ?? `polygon-${Date.now()}`;
            propsRef.current.onPolygonCreated?.({
              type: "Feature",
              id,
              properties: { id },
              geometry: {
                type: "Polygon",
                coordinates: [[...draft, draft[0]]],
              },
            });
            polygonDraftRef.current = [];
          }
        });
        map.on("touchstart", (event) => {
          if (event.points.length !== 1) return;
          pressRef.current = setTimeout(
            () =>
              propsRef.current.onLongPress?.({
                longitude: event.lngLats[0].lng,
                latitude: event.lngLats[0].lat,
              }),
            propsRef.current.longPressDuration ?? 550,
          );
        });
        const cancelPress = () => {
          if (pressRef.current) clearTimeout(pressRef.current);
          pressRef.current = null;
        };
        map.on("touchmove", cancelPress);
        map.on("touchend", cancelPress);
        map.on("error", (event) =>
          emitError(error("provider", event.error, true)),
        );
      } catch (cause) {
        emitError(error("initialization", cause, false));
      }
    }, [emitError]);

    useEffect(() => {
      void initialize();
      return () => {
        stopGpsRef.current?.();
        popupRef.current?.root?.unmount();
        popupRef.current?.popup.remove();
        mapRef.current?.remove();
        mapRef.current = null;
      };
    }, [initialize]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;
      (map.getSource(SOURCE.markers) as GeoJSONSource | undefined)?.setData(
        collection(props.markers ?? []),
      );
    }, [props.markers]);
    useEffect(() => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;
      (map.getSource(SOURCE.polygons) as GeoJSONSource | undefined)?.setData(
        collection(props.polygons ?? []),
      );
    }, [props.polygons]);
    useEffect(() => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;
      (map.getSource(SOURCE.circles) as GeoJSONSource | undefined)?.setData(
        collection((props.circles ?? []).map(circleToPolygon)),
      );
    }, [props.circles]);
    useEffect(() => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;
      (map.getSource(SOURCE.routes) as GeoJSONSource | undefined)?.setData(
        collection(props.routes ?? []),
      );
    }, [props.routes]);
    useEffect(() => {
      if (!props.routeRequest) return;
      const provider = props.providers.routing;
      if (!provider) {
        emitError(
          error(
            "route",
            new Error("A routing provider is required for routeRequest."),
            true,
          ),
        );
        return;
      }
      let cancelled = false;
      void provider
        .calculate(props.routeRequest)
        .then((result) => {
          if (cancelled) return;
          propsRef.current.onRouteCalculated?.(result);
          const source = mapRef.current?.getSource(SOURCE.routes) as
            | GeoJSONSource
            | undefined;
          source?.setData(
            collection([
              {
                ...result.geometry,
                id: result.id,
                properties: { ...result.geometry.properties, id: result.id },
              },
            ]),
          );
        })
        .catch((cause) => {
          if (!cancelled) emitError(error("route", cause, true));
        });
      return () => {
        cancelled = true;
      };
    }, [emitError, props.providers.routing, props.routeRequest]);

    const previousStyleKey = useRef(
      `${props.providers.tile.id}:${resolveTheme(props.theme?.name ?? "auto")}`,
    );
    useEffect(() => {
      const map = mapRef.current;
      if (!map || status !== "ready") return;
      const nextKey = `${props.providers.tile.id}:${resolveTheme(props.theme?.name ?? "auto")}`;
      if (nextKey === previousStyleKey.current) return;
      previousStyleKey.current = nextKey;
      let cancelled = false;
      void Promise.resolve(
        props.providers.tile.getStyle(
          resolveTheme(props.theme?.name ?? "auto"),
        ),
      )
        .then((style) => {
          if (cancelled || !mapRef.current) return;
          map.setStyle(style);
          map.once("style.load", () => {
            if (!cancelled)
              addDataLayers(map, propsRef.current, {
                ...defaultTheme,
                ...propsRef.current.theme,
              });
          });
        })
        .catch((cause) => emitError(error("provider", cause, true)));
      return () => {
        cancelled = true;
      };
    }, [emitError, props.providers.tile, props.theme?.name, status]);

    const viewport = (): AsolMapViewport => {
      const map = mapRef.current;
      const center = map?.getCenter();
      return {
        latitude: center?.lat ?? 0,
        longitude: center?.lng ?? 0,
        zoom: map?.getZoom() ?? 0,
        bearing: map?.getBearing(),
        pitch: map?.getPitch(),
      };
    };
    const control = (id: AsolMapControlId, value?: "in" | "out") => {
      const map = mapRef.current;
      if (!map) return;
      if (id === "zoom") value === "in" ? map.zoomIn() : map.zoomOut();
      else if (id === "compass") map.resetNorth();
      else if (id === "fullscreen")
        void (document.fullscreenElement
          ? document.exitFullscreen()
          : containerRef.current?.parentElement?.requestFullscreen());
      else if (id === "gps") void startGps();
      else if (id === "share") props.onShare?.(viewport());
      else if (id === "save") props.onSave?.();
      else if (id === "reset") props.onReset?.();
      else if (id === "close") props.onClose?.();
      else if (id === "recenter") {
        const initial = props.initialViewport;
        if (initial)
          map.flyTo({
            center: [initial.longitude, initial.latitude],
            zoom: initial.zoom,
            bearing: initial.bearing ?? 0,
            pitch: initial.pitch ?? 0,
          });
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        getMap: () => mapRef.current,
        flyTo: (next) =>
          mapRef.current?.flyTo({
            center:
              next.latitude != null && next.longitude != null
                ? [next.longitude, next.latitude]
                : undefined,
            zoom: next.zoom,
            bearing: next.bearing,
            pitch: next.pitch,
          }),
        fitBounds: (bounds) =>
          mapRef.current?.fitBounds(
            [
              [bounds[0], bounds[1]],
              [bounds[2], bounds[3]],
            ],
            { padding: 32 },
          ),
        resize: () => mapRef.current?.resize(),
        startGps,
        stopGps: () => {
          stopGpsRef.current?.();
          stopGpsRef.current = null;
        },
      }),
      [startGps],
    );

    return (
      <section
        id={props.id}
        className={`asol-map ${theme.className ?? ""} ${props.className ?? ""}`}
        style={props.style}
        aria-label={props.ariaLabel ?? "Interactive map"}
        aria-busy={status === "loading"}
      >
        <div
          ref={containerRef}
          className="asol-map__canvas"
          role="application"
          aria-label={props.ariaLabel ?? "Interactive map"}
          tabIndex={0}
        />
        {present(props.layers?.controls) && (
          <AsolMapControls config={props.toolbar} onAction={control} />
        )}
        {props.children}
        {status === "loading" && (
          <div className="asol-map__overlay" role="status">
            <span className="asol-map__spinner" aria-hidden="true" />
            <span>{props.loadingLabel ?? "Loading map…"}</span>
          </div>
        )}
        {status === "error" && (
          <div className="asol-map__overlay" role="alert">
            <p>{fatal?.message ?? "The map could not be loaded."}</p>
            <button
              className="asol-map__retry"
              type="button"
              onClick={() => {
                mapRef.current?.remove();
                mapRef.current = null;
                void initialize();
              }}
            >
              {props.retryLabel ?? "Retry"}
            </button>
          </div>
        )}
      </section>
    );
  },
);
