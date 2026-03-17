'use client';

import { useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useTheme } from './ThemeProvider';

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

const DARK_STYLE = '739af084373f96fe';

export default function MapView({ locations, selectedIndex, onSelect, height = 300 }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  const { theme } = useTheme();

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
          mapId={theme === 'dark' ? DARK_STYLE : undefined}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl
          style={{ width: '100%', height: '100%' }}
        >
          {locations.map((loc, i) => {
            const isSelected = i === selectedIndex;
            return (
              <AdvancedMarker
                key={i}
                position={{ lat: loc.lat, lng: loc.lng }}
                title={loc.label}
                onClick={() => onSelect?.(i)}
              >
                <Pin
                  background={isSelected ? '#0066FF' : (loc.color || '#6B7280')}
                  borderColor={isSelected ? '#0044CC' : '#FFFFFF'}
                  glyphColor="#FFFFFF"
                  scale={isSelected ? 1.2 : 1}
                />
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
}
