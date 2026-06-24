"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface HeatmapPoint {
  lat: number;
  lon: number;
  count: number;
  minutes: number;
  intensity: number;
}

interface PracticeHeatmapProps {
  data: HeatmapPoint[];
  onPointClick?: (point: HeatmapPoint) => void;
}

export default function PracticeHeatmap({ data, onPointClick }: PracticeHeatmapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map with CartoDB dark matter style (free, no API key needed)
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          {
            id: "carto-dark-layer",
            type: "raster",
            source: "carto-dark",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [139.6917, 35.6895], // Tokyo as default center
      zoom: 2,
    });

    map.current.on("load", () => {
      setLoading(false);
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update heatmap when data changes
  useEffect(() => {
    if (!map.current || !data.length) return;

    const mapInstance = map.current;

    // Remove existing layers/sources if they exist
    if (mapInstance.getLayer("heatmap-layer")) {
      mapInstance.removeLayer("heatmap-layer");
    }
    if (mapInstance.getLayer("heatmap-point")) {
      mapInstance.removeLayer("heatmap-point");
    }
    if (mapInstance.getSource("practice-heatmap")) {
      mapInstance.removeSource("practice-heatmap");
    }

    // Add GeoJSON source
    mapInstance.addSource("practice-heatmap", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: data.map((point) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [point.lon, point.lat],
          },
          properties: {
            count: point.count,
            minutes: point.minutes,
            intensity: point.intensity,
          },
        })),
      },
    });

    // Add heatmap layer
    mapInstance.addLayer({
      id: "heatmap-layer",
      type: "heatmap",
      source: "practice-heatmap",
      paint: {
        // Increase weight based on count
        "heatmap-weight": [
          "interpolate",
          ["linear"],
          ["get", "count"],
          0,
          0,
          50,
          1,
        ],
        // Increase intensity as zoom level increases
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          1,
          9,
          3,
        ],
        // Color gradient - Tenshinryu red theme
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(0, 0, 0, 0)",
          0.2,
          "rgba(255, 68, 68, 0.2)",
          0.4,
          "rgba(255, 68, 68, 0.4)",
          0.6,
          "rgba(255, 68, 68, 0.6)",
          0.8,
          "rgba(255, 100, 50, 0.8)",
          1,
          "rgba(255, 150, 50, 1)",
        ],
        // Adjust radius
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          10,
          9,
          30,
        ],
        // Decrease opacity as zoom increases
        "heatmap-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          1,
          12,
          0.7,
        ],
      },
    });

    // Add point layer for click interactions
    mapInstance.addLayer({
      id: "heatmap-point",
      type: "circle",
      source: "practice-heatmap",
      paint: {
        "circle-radius": 0,
        "circle-color": "transparent",
      },
    });

    // Handle clicks
    mapInstance.on("click", "heatmap-point", (e) => {
      if (e.features?.[0]) {
        const props = e.features[0].properties as HeatmapPoint;
        onPointClick?.(props);
      }
    });

    // Change cursor on hover
    mapInstance.on("mouseenter", "heatmap-point", () => {
      mapInstance.getCanvas().style.cursor = "pointer";
    });
    mapInstance.on("mouseleave", "heatmap-point", () => {
      mapInstance.getCanvas().style.cursor = "";
    });

    // Fit bounds to data if there's data
    if (data.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      data.forEach((point) => {
        bounds.extend([point.lon, point.lat]);
      });
      mapInstance.fitBounds(bounds, { padding: 50, maxZoom: 8 });
    }
  }, [data, onPointClick]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
