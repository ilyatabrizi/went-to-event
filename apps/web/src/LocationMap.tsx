import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

export type Coordinates = { latitude: number; longitude: number }
const defaultCenter: [number, number] = [38.0962, 46.2738]

export function LocationMap({ value, onSelect, readOnly = false, label = 'Event location' }: { value: Coordinates | null; onSelect?: (coordinates: Coordinates, address: string | null) => void; readOnly?: boolean; label?: string }) {
  const mapNode = useRef<HTMLDivElement | null>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  const [locating, setLocating] = useState(false)
  useEffect(() => {
    if (!mapNode.current || map.current) return
    const center: [number, number] = value ? [value.latitude, value.longitude] : defaultCenter
    const instance = L.map(mapNode.current, { scrollWheelZoom: false }).setView(center, value ? 15 : 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(instance)
    map.current = instance
    if (value) marker.current = L.marker(center).addTo(instance)
    if (!readOnly && onSelect) instance.on('click', async (event: L.LeafletMouseEvent) => {
      const coordinates = { latitude: event.latlng.lat, longitude: event.latlng.lng }
      marker.current?.remove(); marker.current = L.marker([coordinates.latitude, coordinates.longitude]).addTo(instance)
      setLocating(true)
      let address: string | null = null
      try { const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coordinates.latitude}&lon=${coordinates.longitude}&zoom=18&addressdetails=1`, { headers: { Accept: 'application/json' } }); if (response.ok) address = (await response.json() as { display_name?: string }).display_name ?? null } catch { /* coordinates remain usable */ }
      setLocating(false); onSelect(coordinates, address)
    })
    return () => { instance.remove(); map.current = null; marker.current = null }
  }, [])
  useEffect(() => { if (!map.current || !value) return; const point: [number, number] = [value.latitude, value.longitude]; map.current.setView(point, Math.max(map.current.getZoom(), 15)); marker.current?.remove(); marker.current = L.marker(point).addTo(map.current) }, [value])
  return <div className="location-map-wrap"><div className="location-map" ref={mapNode} role="application" aria-label={label} />{locating && <small className="location-map-status">Finding address…</small>}</div>
}
