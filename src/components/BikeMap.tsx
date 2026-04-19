import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/contexts/LanguageContext";

// Fix default marker icon issue with webpack/vite
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Bike {
  id: string;
  name: string;
  location: string;
  price: number;
  coordinates: { lat: number; lng: number };
}

interface BikeMapProps {
  bikes: Bike[];
  selectedBike: string | null;
  onMarkerClick: (bikeId: string) => void;
}

export const BikeMap = ({ bikes, selectedBike, onMarkerClick }: BikeMapProps) => {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const mapCenter: [number, number] = bikes.length > 0
      ? [bikes[0].coordinates.lat, bikes[0].coordinates.lng]
      : [33.5731, -7.5898];

    const map = L.map(mapRef.current).setView(mapCenter, 12);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Create custom icons
    const blueIcon = new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const blackIcon = new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    // Add markers for each bike
    bikes.forEach((bike) => {
      const marker = L.marker(
        [bike.coordinates.lat, bike.coordinates.lng],
        { icon: selectedBike === bike.id ? blackIcon : blueIcon }
      )
        .bindPopup(
          `<div class="text-sm">
            <strong>${bike.name}</strong><br/>
            ${bike.location}<br/>
            ${bike.price} DH ${t('search.perDay')}
          </div>`
        )
        .on("click", () => onMarkerClick(bike.id))
        .addTo(mapInstanceRef.current!);

      markersRef.current.push(marker);
    });
  }, [bikes, selectedBike, onMarkerClick, t]);

  return <div ref={mapRef} className="h-full w-full min-h-[400px] z-50" />;
};
