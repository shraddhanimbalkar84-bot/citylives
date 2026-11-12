import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Search, Check, AlertCircle, Loader2 } from 'lucide-react';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  address: string;
  onChange: (lat: number, lon: number, address: string) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  address,
  onChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [addressInput, setAddressInput] = useState(address);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom icon
      const pinIcon = L.divIcon({
        className: 'custom-pin-icon',
        html: `
          <div style="background-color: #0D9488; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            <svg style="width: 18px; height: 18px; color: white;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker([latitude, longitude], {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);

      // Drag event
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const lat = Number(pos.lat.toFixed(6));
        const lon = Number(pos.lng.toFixed(6));
        reverseGeocode(lat, lon);
      });

      // Click on map to move marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lon = Number(e.latlng.lng.toFixed(6));
        marker.setLatLng([lat, lon]);
        reverseGeocode(lat, lon);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      // Keep map clean
    };
  }, []);

  // Update marker when coords change from outside
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
    }
  }, [latitude, longitude]);

  useEffect(() => {
    setAddressInput(address);
  }, [address]);

  // Reverse geocoding via Nominatim
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'CivicEye-RoadDamageApp/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        const display = data.display_name || `${lat}, ${lon}`;
        setAddressInput(display);
        onChange(lat, lon, display);
        return;
      }
    } catch {
      // Fallback
    }
    const fallback = `Coordinates (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    setAddressInput(fallback);
    onChange(lat, lon, fallback);
  };

  // Browser Geolocation with permission
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lon], 16);
          markerRef.current.setLatLng([lat, lon]);
        }
        reverseGeocode(lat, lon);
      },
      (err) => {
        setLocating(false);
        let msg = 'Unable to retrieve location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. You can manually click on the map or type an address below.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        setGeoError(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Forward search via Nominatim
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    setSearching(true);
    setGeoError(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput)}&limit=1`,
        { headers: { 'User-Agent': 'CivicEye-RoadDamageApp/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = Number(parseFloat(data[0].lat).toFixed(6));
          const lon = Number(parseFloat(data[0].lon).toFixed(6));
          const disp = data[0].display_name;

          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.setView([lat, lon], 16);
            markerRef.current.setLatLng([lat, lon]);
          }
          setAddressInput(disp);
          onChange(lat, lon, disp);
          setSearching(false);
          return;
        }
      }
      setGeoError('Address not found. Please try a more specific landmark or click directly on the map.');
    } catch {
      setGeoError('Address search service unavailable. Please click directly on the map to set location.');
    }
    setSearching(false);
  };

  return (
    <div className="space-y-3">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleAddressSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Search street or landmark..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Find</span>
          </button>
        </form>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
          title="Requires browser geolocation permission"
        >
          {locating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
              <span>Acquiring GPS...</span>
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5 text-teal-600" />
              <span>Use My GPS</span>
            </>
          )}
        </button>
      </div>

      {geoError && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Map Surface */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-inner h-[220px]">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute top-2 right-2 z-20 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] text-slate-600 font-mono shadow-xs border border-slate-200">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-teal-600" />
          <span>Click map or drag pin to fine-tune exact pothole spot</span>
        </span>
        <span className="text-slate-400">Consent respected: GPS only read on click</span>
      </div>
    </div>
  );
};
