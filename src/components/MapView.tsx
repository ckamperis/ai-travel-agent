'use client';

import { useMemo, useEffect, useRef } from 'react';
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
  onSelect?: (index: number) => void;
  height?: number;
}

function MapMarkers({ locations, selectedIndex, onSelect }: {
  locations: Location[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));

    // Create new markers
    const newMarkers = locations.map((loc, i) => {
      const isSelected = i === selectedIndex;
      const marker = new google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map,
        title: loc.label,
        icon: isSelected ? undefined : {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        }
      });
      marker.addListener('click', () => onSelect?.(i));
      return marker;
    });

    markersRef.current = newMarkers;

    return () => {
      newMarkers.forEach(m => m.setMap(null));
    };
  }, [map, locations, selectedIndex, onSelect]);

  return null;
}

export default function MapView({ locations, selectedIndex, onSelect, height = 300 }: MapViewProps) {
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
            onSelect={onSelect}
          />
        </Map>
      </APIProvider>
    </div>
  );
}
