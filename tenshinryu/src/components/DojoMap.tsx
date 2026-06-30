"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface StudentLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  checkIns: number;
}

interface DojoMapProps {
  dojoLocation?: { lat: number; lng: number; name: string };
  studentLocations?: StudentLocation[];
  showHeatmap?: boolean;
  height?: string;
}

export default function DojoMap({
  dojoLocation,
  studentLocations = [],
  showHeatmap = false,
  height = "400px",
}: DojoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainer.current) return;

    // Default center (Warsaw, Poland)
    const defaultCenter: [number, number] = [21.0122, 52.2297];
    const center: [number, number] = dojoLocation
      ? [dojoLocation.lng, dojoLocation.lat]
      : defaultCenter;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "osm": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: center,
      zoom: 13,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    // Add dojo marker
    if (dojoLocation) {
      new maplibregl.Marker({ color: "#D7262E" })
        .setLngLat([dojoLocation.lng, dojoLocation.lat])
        .setPopup(
          new maplibregl.Popup().setHTML(
            `<div style="font-weight: 600;">${dojoLocation.name}</div>
             <div style="font-size: 0.875rem; color: #666;">Dojo Location</div>`
          )
        )
        .addTo(map.current);
    }

    // Add student markers
    studentLocations.forEach((student) => {
      new maplibregl.Marker({ color: "#3B82F6" })
        .setLngLat([student.lng, student.lat])
        .setPopup(
          new maplibregl.Popup().setHTML(
            `<div style="font-weight: 600;">${student.name}</div>
             <div style="font-size: 0.875rem; color: #666;">${student.checkIns} check-ins</div>`
          )
        )
        .addTo(map.current!);
    });

    // Add heatmap layer if enabled
    if (showHeatmap && studentLocations.length > 0) {
      map.current.on("load", () => {
        if (!map.current) return;

        // Prepare heatmap data
        const heatmapData = {
          type: "FeatureCollection",
          features: studentLocations.map((s) => ({
            type: "Feature",
            properties: {
              intensity: Math.min(s.checkIns / 10, 1),
            },
            geometry: {
              type: "Point",
              coordinates: [s.lng, s.lat],
            },
          })),
        };

        map.current.addSource("students", {
          type: "geojson",
          data: heatmapData as any,
        });

        map.current.addLayer({
          id: "student-heat",
          type: "heatmap",
          source: "students",
          paint: {
            "heatmap-weight": ["get", "intensity"],
            "heatmap-intensity": 1,
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0, 0, 255, 0)",
              0.2,
              "rgb(0, 0, 255)",
              0.4,
              "rgb(0, 255, 255)",
              0.6,
              "rgb(0, 255, 0)",
              0.8,
              "rgb(255, 255, 0)",
              1,
              "rgb(255, 0, 0)",
            ],
            "heatmap-radius": 25,
            "heatmap-opacity": 0.7,
          },
        });
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [mounted, dojoLocation, studentLocations, showHeatmap]);

  if (!mounted) {
    return (
      <div
        style={{
          height,
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
        }}
      >
        Loading map...
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      style={{ height, width: "100%", borderRadius: "8px" }}
    />
  );
}
