"use client";

import {
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
  Popup,
  setWorkerUrl,
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
import { AddressBalloon } from "./AddressBalloon";
import { AsolMapControls } from "./AsolMapControls";
import { circleToPolygon, collection, markerAt } from "./geometry";
import { createNativePlatformGpsProvider } from "./native-platform-gps";
import { defaultTheme, resolveTheme } from "./theme";
import type {
  AsolMapPickedLocation,
  Coordinates,
  AsolMapControlId,
  AsolMapError,
  AsolMapHandle,
  AsolMapMarker,
  AsolMapProps,
  AsolMapViewport,
} from "./types";
import "./AsolMap.css";
import { SOURCE, present, point, error, addDataLayers } from "./parts/AsolMap.map-types";
import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

/*
 * MapLibre resolves its worker as `new URL('./maplibre-gl-worker.mjs', import.meta.url)`.
 * Bundled by Next, `import.meta.url` is the emitted chunk URL, so the request lands on
 * /_next/static/chunks/maplibre-gl-worker.mjs — a path Next answers with its HTML 404
 * page, which the browser rejects as a non-JavaScript MIME type. The worker then never
 * starts. Raster tiles still draw (they are decoded on the main thread), but every
 * GeoJSON source stays untiled forever: `isSourceLoaded('asol-markers')` never turns
 * true and no marker, polygon, circle or route is ever painted.
 *
 * `scripts/sync-maplibre-worker.ts` copies the worker into public/ on every dev and
 * build run, and architecture:check fails if that copy drifts from the package.
 */
setWorkerUrl("/maplibre-gl-worker.mjs");

export const AsolMap = forwardRef<AsolMapHandle, AsolMapProps>(
  function AsolMap(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const propsRef = useRef(props);
    propsRef.current = props;
    const stopGpsRef = useRef<(() => void) | null>(null);
    const popupRef = useRef<{ popup: Popup; root?: Root } | null>(null);
    const addressRef = useRef<{ popup: Popup; root: Root } | null>(null);
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
    const closeAddressBalloon = useCallback(() => {
      const current = addressRef.current;
      if (!current) return;
      addressRef.current = null;
      current.popup.remove();
      // Unmounting synchronously from inside the balloon's own event handler would
      // tear down a root React is still rendering, so hand it to a later task.
      queueMicrotask(() => current.root.unmount());
    }, []);

    /**
     * Opens the address balloon on a point. This is the package's entire input
     * surface for naming a location: the field lives on the pin instead of beside
     * the map, so the text and the coordinates cannot drift apart, and nothing is
     * reported until the user confirms.
     */
    const openAddressBalloon = useCallback(
      (coordinates: Coordinates, value?: string) => {
        const map = mapRef.current;
        const config = propsRef.current.addressPrompt;
        if (!map || !config?.enabled) return;

        closeAddressBalloon();

        const element = document.createElement("div");
        element.className = "asol-map__popup asol-map__popup--address";
        const popup = new Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
          maxWidth: "17rem",
          className: "asol-map__address-popup",
        })
          .setLngLat([coordinates.longitude, coordinates.latitude])
          .setDOMContent(element)
          .addTo(map);

        const root = createRoot(element);
        addressRef.current = { popup, root };
        root.render(
          <AddressBalloon
            config={{ ...config, value: value ?? config.value }}
            onConfirm={(address) => {
              closeAddressBalloon();
              const committed: AsolMapPickedLocation = { ...coordinates, address };
              propsRef.current.onLocationCommitted?.(committed);
            }}
            onDismiss={closeAddressBalloon}
          />,
        );
      },
      [closeAddressBalloon],
    );

    const startGps = useCallback(async () => {
      const provider =
        propsRef.current.providers.gps ?? createNativePlatformGpsProvider();
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
        openAddressBalloon({
          latitude: location.latitude,
          longitude: location.longitude,
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
    }, [emitError, modes, openAddressBalloon]);

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
        const map = new MapLibreMap({
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
            if (marker && propsRef.current.addressPrompt?.enabled) {
              const [longitude, latitude] = marker.geometry.coordinates as [
                number,
                number,
              ];
              const existing =
                typeof marker.properties.address === "string"
                  ? marker.properties.address
                  : marker.properties.title;
              openAddressBalloon({ latitude, longitude }, existing);
              return;
            }
            if (
              marker?.properties.popup &&
              present(propsRef.current.layers?.popup)
            ) {
              const element = document.createElement("div");
              element.className = "asol-map__popup";
              const popup = new Popup({
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
            openAddressBalloon(coordinates);
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
    }, [emitError, openAddressBalloon]);

    useEffect(() => {
      void initialize();
      return () => {
        stopGpsRef.current?.();
        closeAddressBalloon();
        popupRef.current?.root?.unmount();
        popupRef.current?.popup.remove();
        mapRef.current?.remove();
        mapRef.current = null;
      };
    }, [closeAddressBalloon, initialize]);

    /*
     * Data updates used to be gated on `map.isStyleLoaded()`, which is false
     * whenever ANY source still has a tile in flight — routine with live raster
     * tiles, and guaranteed right after a `flyTo`. The update was then dropped
     * silently and never retried, because the effect only re-runs when the data
     * prop itself changes: a marker picked by tapping the map or by the GPS
     * button simply never appeared.
     *
     * The real precondition is that the source exists, which happens when
     * `addDataLayers` runs on the map's `load` event. If it does not exist yet,
     * the newest payload is parked and flushed on the next `idle` — the event
     * that also fires after a style swap re-adds every source.
     */
    const pendingSourceData = useRef(new Map<string, GeoJSON.FeatureCollection>());
    const setSourceData = useCallback(
      (id: string, data: GeoJSON.FeatureCollection) => {
        const map = mapRef.current;
        if (!map) return;

        const source = map.getSource(id) as GeoJSONSource | undefined;
        if (source) {
          pendingSourceData.current.delete(id);
          source.setData(data);
          return;
        }

        const alreadyWaiting = pendingSourceData.current.has(id);
        pendingSourceData.current.set(id, data);
        if (alreadyWaiting) return;

        map.once("idle", () => {
          const pending = pendingSourceData.current.get(id);
          pendingSourceData.current.delete(id);
          if (!pending) return;
          (
            mapRef.current?.getSource(id) as GeoJSONSource | undefined
          )?.setData(pending);
        });
      },
      [],
    );

    useEffect(() => {
      setSourceData(SOURCE.markers, collection(props.markers ?? []));
    }, [props.markers, setSourceData]);
    useEffect(() => {
      setSourceData(SOURCE.polygons, collection(props.polygons ?? []));
    }, [props.polygons, setSourceData]);
    useEffect(() => {
      setSourceData(
        SOURCE.circles,
        collection((props.circles ?? []).map(circleToPolygon)),
      );
    }, [props.circles, setSourceData]);
    useEffect(() => {
      setSourceData(SOURCE.routes, collection(props.routes ?? []));
    }, [props.routes, setSourceData]);
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

    const instance = createOpaqueUiInstanceId("asol-map", props.id ?? "map");

    return (
      <section {...uiAttributes({ uid: "packages.map-core.asol-map.section-1or6FU", id: "packages.map-core.asol-map.section", instance: instance })}
        id={props.id}
        className={`asol-map ${theme.className ?? ""} ${props.className ?? ""}`}
        style={props.style}
        aria-label={props.ariaLabel ?? "Interactive map"}
        aria-busy={status === "loading"}
      >
        <div {...uiAttributes({ uid: "packages.map-core.asol-map.div-mNM9oR", id: "packages.map-core.asol-map.div", instance: instance })}
          ref={containerRef}
          className="asol-map__canvas"
          role="application"
          aria-label={props.ariaLabel ?? "Interactive map"}
          tabIndex={0}
        />
        {present(props.layers?.controls) && (
          <AsolMapControls
            config={props.toolbar}
            onAction={control}
            toolbarLabel={props.toolbarLabel}
            zoomInLabel={props.zoomInLabel}
            zoomOutLabel={props.zoomOutLabel}
          />
        )}
        {props.children}
        {status === "loading" && (
          <div {...uiAttributes({ uid: "packages.map-core.asol-map.div.2-GMA7AV", id: "packages.map-core.asol-map.div.2", instance: instance })} className="asol-map__overlay" role="status">
            <span {...uiAttributes({ uid: "packages.map-core.asol-map.span-4J9Smn", id: "packages.map-core.asol-map.span", instance: instance })} className="asol-map__spinner" aria-hidden="true" />
            <span {...uiAttributes({ uid: "packages.map-core.asol-map.span.2-06jX0x", id: "packages.map-core.asol-map.span.2", instance: instance })}>{props.loadingLabel ?? "Loading map…"}</span>
          </div>
        )}
        {status === "error" && (
          <div {...uiAttributes({ uid: "packages.map-core.asol-map.div.3-BODh7v", id: "packages.map-core.asol-map.div.3", instance: instance })} className="asol-map__overlay" role="alert">
            <p {...uiAttributes({ uid: "packages.map-core.asol-map.p-MYq7cD", id: "packages.map-core.asol-map.p", instance: instance })}>{fatal?.message ?? "The map could not be loaded."}</p>
            <button {...uiAttributes({ uid: "packages.map-core.asol-map.button-31d0UB", id: "packages.map-core.asol-map.button", instance: instance })}
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
