import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const CityMap = ({ lat, lon, name }) => {
  return (
    <div className="bg-white/80 p-4 rounded-md shadow-md mt-4 w-full max-w-xl">
      <h2 className="text-xl font-semibold mb-2">Map of {name}</h2>
      <MapContainer
        center={[lat, lon]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: '300px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lon]}>
          <Popup>{name}</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

export default CityMap
