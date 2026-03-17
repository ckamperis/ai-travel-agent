/**
 * Weather data for destination previews.
 * Uses Open-Meteo (free, no API key) with fallback to seasonal averages.
 */

export interface WeatherDay {
  date: string;
  high: number;
  low: number;
  condition: 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'stormy';
}

// Common destination coordinates
const COORDS: Record<string, { lat: number; lon: number }> = {
  athens: { lat: 37.98, lon: 23.73 },
  rome: { lat: 41.90, lon: 12.50 },
  santorini: { lat: 36.39, lon: 25.46 },
  paris: { lat: 48.86, lon: 2.35 },
  london: { lat: 51.51, lon: -0.13 },
  barcelona: { lat: 41.39, lon: 2.17 },
  vienna: { lat: 48.21, lon: 16.37 },
  istanbul: { lat: 41.01, lon: 28.98 },
  mykonos: { lat: 37.45, lon: 25.33 },
  crete: { lat: 35.24, lon: 24.90 },
  dubrovnik: { lat: 42.65, lon: 18.09 },
  lisbon: { lat: 38.72, lon: -9.14 },
  amsterdam: { lat: 52.37, lon: 4.90 },
  berlin: { lat: 52.52, lon: 13.41 },
  hamburg: { lat: 53.55, lon: 9.99 },
};

function wmoToCondition(code: number): WeatherDay['condition'] {
  if (code <= 1) return 'sunny';
  if (code <= 3) return 'partly-cloudy';
  if (code <= 48) return 'cloudy';
  if (code <= 67) return 'rainy';
  return 'stormy';
}

export async function getWeather(
  destination: string,
  startDate: string,
  days: number = 5
): Promise<WeatherDay[]> {
  const key = destination.toLowerCase().replace(/[^a-z]/g, '');
  const coords = Object.entries(COORDS).find(([k]) => key.includes(k))?.[1];

  if (!coords) return getSeasonalFallback(destination, startDate, days);

  try {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days - 1);
    const end = endDate.toISOString().split('T')[0];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&start_date=${startDate}&end_date=${end}&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error('Weather API error');

    const data = await res.json();
    const daily = data.daily;
    if (!daily?.time) throw new Error('No daily data');

    return daily.time.slice(0, days).map((date: string, i: number) => ({
      date,
      high: Math.round(daily.temperature_2m_max[i]),
      low: Math.round(daily.temperature_2m_min[i]),
      condition: wmoToCondition(daily.weather_code[i]),
    }));
  } catch {
    return getSeasonalFallback(destination, startDate, days);
  }
}

function getSeasonalFallback(destination: string, startDate: string, days: number): WeatherDay[] {
  const month = new Date(startDate).getMonth();
  const isSummer = month >= 5 && month <= 8;
  const isWinter = month >= 11 || month <= 2;
  const key = destination.toLowerCase();
  const isMed = ['athens', 'rome', 'santorini', 'barcelona', 'crete', 'mykonos', 'dubrovnik', 'lisbon', 'istanbul'].some(c => key.includes(c));

  const base = isMed
    ? isSummer ? { high: 33, low: 22, condition: 'sunny' as const }
      : isWinter ? { high: 14, low: 6, condition: 'partly-cloudy' as const }
      : { high: 22, low: 12, condition: 'partly-cloudy' as const }
    : isSummer ? { high: 24, low: 14, condition: 'partly-cloudy' as const }
      : isWinter ? { high: 5, low: -1, condition: 'cloudy' as const }
      : { high: 15, low: 7, condition: 'partly-cloudy' as const };

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      high: base.high + Math.round((Math.random() - 0.5) * 4),
      low: base.low + Math.round((Math.random() - 0.5) * 3),
      condition: base.condition,
    };
  });
}
