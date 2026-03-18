'use client';

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';

interface Location {
  lat: number;
  lng: number;
  label: string;
  color?: string;
}

interface MapViewProps {
  locations: Location[];
  selectedIndex?: number;
  highlightedIndex?: number;
  visibleIndices?: number[];
  onSelect?: (index: number) => void;
  height?: number;
}

function MapMarkers({ locations, selectedIndex, highlightedIndex, visibleIndices, onSelect }: {
  locations: Location[];
  selectedIndex?: number;
  highlightedIndex?: number;
  visibleIndices?: number[];
  onSelect?: (index: number) => void;
}) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const bounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSelectedRef = useRef<number | undefined>(undefined);

  const getIcon = useCallback((index: number) => {
    if (index === selectedIndex) {
      // Selected: red default (larger)
      return {
        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: { width: 40, height: 40, equals: () => false },
        anchor: { x: 20, y: 40, equals: () => false },
      };
    }
    if (index === highlightedIndex) {
      // Hovered: yellow marker
      return {
        url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
        scaledSize: { width: 36, height: 36, equals: () => false },
        anchor: { x: 18, y: 36, equals: () => false },
      };
    }
    // Normal: blue marker
    return {
      url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    };
  }, [selectedIndex, highlightedIndex]);

  // Pan to selected marker
  useEffect(() => {
    if (!map || selectedIndex == null || selectedIndex < 0) return;
    if (selectedIndex === prevSelectedRef.current) return;
    prevSelectedRef.current = selectedIndex;

    const loc = locations[selectedIndex];
    if (!loc) return;
    map.panTo({ lat: loc.lat, lng: loc.lng });
    map.setZoom(15);
  }, [map, selectedIndex, locations]);

  // Create/update markers
  useEffect(() => {
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);

    const indicesToShow = visibleIndices ?? locations.map((_, i) => i);

    const newMarkers = indicesToShow.map(i => {
      const loc = locations[i];
      if (!loc) return null;

      const isSelected = i === selectedIndex;
      const marker = new google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map,
        title: loc.label,
        icon: getIcon(i) as google.maps.Icon,
        animation: isSelected ? google.maps.Animation.BOUNCE : undefined,
        zIndex: isSelected ? 1000 : i === highlightedIndex ? 500 : 1,
      });

      // Stop bounce after ~700ms (1 bounce cycle)
      if (isSelected) {
        bounceTimerRef.current = setTimeout(() => {
          marker.setAnimation(null);
        }, 700);
      }

      marker.addListener('click', () => onSelect?.(i));
      return marker;
    }).filter((m): m is google.maps.Marker => m !== null);

    markersRef.current = newMarkers;

    return () => {
      newMarkers.forEach(m => m.setMap(null));
      if (bounceTimerRef.current) clearTimeout(bounceTimerRef.current);
    };
  }, [map, locations, selectedIndex, highlightedIndex, visibleIndices, onSelect, getIcon]);

  return null;
}

export default function MapView({ locations, selectedIndex, highlightedIndex, visibleIndices, onSelect, height = 300 }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

  const center = useMemo(() => {
    if (locations.length === 0) return { lat: 37.98, lng: 23.73 };
    const lat = locations.reduce((s, l) => s + l.lat, 0) / locations.length;
    const lng = locations.reduce((s, l) => s + l.lng, 0) / locations.length;
    return { lat, lng };
  }, [locations]);

  if (!apiKey || locations.length === 0) {
    return (
      <div className="card flex items-center justify-center text-sm"
        style={{ height, color: 'var(--color-text-muted)' }}>
        {!apiKey ? 'Set NEXT_PUBLIC_GOOGLE_MAPS_KEY to enable maps' : 'No locations to display'}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden" style={{ height }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={locations.length === 1 ? 14 : 12}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          style={{ width: '100%', height: '100%' }}
        >
          <MapMarkers
            locations={locations}
            selectedIndex={selectedIndex}
            highlightedIndex={highlightedIndex}
            visibleIndices={visibleIndices}
            onSelect={onSelect}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
