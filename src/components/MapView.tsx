'use client';

import { useMemo } from 'react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

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
          {locations.map((loc, i) => {
            const isSelected = i === selectedIndex;
            return (
              <Marker
                key={i}
                position={{ lat: loc.lat, lng: loc.lng }}
                title={loc.label}
                onClick={() => onSelect?.(i)}
                icon={isSelected ? undefined : {
                  url: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${loc.color || '#6B7280'}"/><circle cx="12" cy="12" r="5" fill="white"/></svg>`)}`,
                  scaledSize: { width: 24, height: 36, equals: () => false },
                  anchor: { x: 12, y: 36, equals: () => false },
                }}
              />
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
}
