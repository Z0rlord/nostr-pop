"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  defaultLocation?: { lat: number; lng: number };
  height?: string;
}

export default function LocationPicker({
  onLocationSelect,
  defaultLocation,
  height = "300px",
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainer.current) return;

    // Default center (Warsaw, Poland)
    const defaultCenter: [number, number] = [21.0122, 52.2297];
    const center: [number, number] = defaultLocation
      ? [defaultLocation.lng, defaultLocation.lat]
      : defaultCenter;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

    // Add existing marker if location provided
    if (defaultLocation) {
      marker.current = new maplibregl.Marker({ draggable: true })
        .setLngLat([defaultLocation.lng, defaultLocation.lat])
        .addTo(map.current);

      marker.current.on("dragend", () => {
        const lngLat = marker.current!.getLngLat();
        onLocationSelect(lngLat.lat, lngLat.lng);
      });
    }

    // Handle map clicks
    map.current.on("click", (e) => {
      const { lng, lat } = e.lngLat;

      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new maplibregl.Marker({ draggable: true })
          .setLngLat([lng, lat])
          .addTo(map.current!);

        marker.current.on("dragend", () => {
          const lngLat = marker.current!.getLngLat();
          onLocationSelect(lngLat.lat, lngLat.lng);
        });
      }

      onLocationSelect(lat, lng);
    });

    return () => {
      map.current?.remove();
    };
  }, [mounted, defaultLocation]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      // Use OpenStreetMap Nominatim for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);

        // Move map to location
        map.current?.flyTo({
          center: [lngNum, latNum],
          zoom: 15,
        });

        // Add/update marker
        if (marker.current) {
          marker.current.setLngLat([lngNum, latNum]);
        } else {
          marker.current = new maplibregl.Marker({ draggable: true })
            .setLngLat([lngNum, latNum])
            .addTo(map.current!);

          marker.current.on("dragend", () => {
            const lngLat = marker.current!.getLngLat();
            onLocationSelect(lngLat.lat, lngLat.lng);
          });
        }

        onLocationSelect(latNum, lngNum, display_name);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setSearching(false);
    }
  };

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
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a location..."
          className="flex-1 px-3 py-2 bg-gray-900 rounded-lg border border-gray-800 focus:border-red-500 focus:outline-none text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {searching ? "..." : "Search"}
        </button>
      </div>

      <div
        ref={mapContainer}
        style={{ height, width: "100%", borderRadius: "8px" }}
      />

      <p className="text-xs text-gray-500">Click on the map to select a location</p>
    </div>
  );
}
