import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LiveAreaMapPickerProps {
  centerLat: number | null
  centerLng: number | null
  radiusM: number
  currentLat: number | null
  currentLng: number | null
  onPick: (lat: number, lng: number) => void
}

const defaultCenter: [number, number] = [35.681236, 139.767125]

export function LiveAreaMapPicker({
  centerLat,
  centerLng,
  radiusM,
  currentLat,
  currentLng,
  onPick,
}: LiveAreaMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const areaCircleRef = useRef<L.Circle | null>(null)
  const centerMarkerRef = useRef<L.CircleMarker | null>(null)
  const currentMarkerRef = useRef<L.CircleMarker | null>(null)
  const hasFitInitialView = useRef(false)

  const selectedCenter = useMemo<[number, number]>(() => {
    if (centerLat !== null && centerLng !== null) {
      return [centerLat, centerLng]
    }

    if (currentLat !== null && currentLng !== null) {
      return [currentLat, currentLng]
    }

    return defaultCenter
  }, [centerLat, centerLng, currentLat, currentLng])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = L.map(containerRef.current, {
      center: selectedCenter,
      zoom: 16,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (event: L.LeafletMouseEvent) => {
      onPick(event.latlng.lat, event.latlng.lng)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      areaCircleRef.current = null
      centerMarkerRef.current = null
      currentMarkerRef.current = null
      hasFitInitialView.current = false
    }
  }, [onPick, selectedCenter])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    const effectiveRadius = Number.isFinite(radiusM) && radiusM > 0 ? radiusM : 150

    areaCircleRef.current?.remove()
    centerMarkerRef.current?.remove()

    if (centerLat !== null && centerLng !== null) {
      areaCircleRef.current = L.circle([centerLat, centerLng], {
        radius: effectiveRadius,
        color: '#2d5bd1',
        weight: 2,
        fillColor: '#2d5bd1',
        fillOpacity: 0.15,
      }).addTo(map)

      centerMarkerRef.current = L.circleMarker([centerLat, centerLng], {
        radius: 7,
        color: '#1f3f9b',
        fillColor: '#ffffff',
        fillOpacity: 1,
        weight: 3,
      }).addTo(map)

      if (!hasFitInitialView.current) {
        map.fitBounds(areaCircleRef.current.getBounds(), { padding: [24, 24] })
        hasFitInitialView.current = true
      } else {
        map.panTo([centerLat, centerLng], { animate: false })
      }
    } else {
      map.setView(selectedCenter, 15, { animate: false })
    }
  }, [centerLat, centerLng, radiusM, selectedCenter])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    currentMarkerRef.current?.remove()

    if (currentLat === null || currentLng === null) {
      return
    }

    currentMarkerRef.current = L.circleMarker([currentLat, currentLng], {
      radius: 6,
      color: '#138a36',
      fillColor: '#7be495',
      fillOpacity: 0.95,
      weight: 2,
    }).addTo(map)
  }, [currentLat, currentLng])

  return (
    <div className="map-picker-shell">
      <div ref={containerRef} className="map-picker-canvas" />
      <p className="helper-text">
        地図をクリックすると開始エリア中心を更新できます。青い円が開始可能エリア、緑の点が直近の現在地です。
      </p>
    </div>
  )
}
