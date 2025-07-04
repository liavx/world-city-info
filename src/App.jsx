// App.jsx
import { useState } from 'react'
import axios from 'axios'
import CityMap from './CityMap'

const SearchInput = ({ city, handleInputChange, handleSearch, suggestions, onSuggestionClick, isLoading, selectedCity }) => (
  <div className="w-full max-w-xl relative">
    <div className="flex gap-2 mb-2">
      <input
        id="city"
        type="text"
        value={city}
        onChange={handleInputChange}
        placeholder="Enter a city..."
        disabled={isLoading}
        className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring focus:border-blue-500"
      />
      <button
        onClick={handleSearch}
        disabled={!selectedCity || isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Search'}
      </button>
    </div>
    {suggestions.length > 0 && (
      <ul className="absolute top-full w-full bg-white border border-gray-300 rounded-md shadow-md z-10">
        {suggestions.map((sug, index) => (
          <li key={index} onClick={() => onSuggestionClick(sug)} className="px-4 py-2 hover:bg-blue-100 cursor-pointer">
            {sug.fullName}
          </li>
        ))}
      </ul>
    )}
  </div>
)

const WeatherView = ({ data }) => (
  <div className="bg-white/80 p-4 rounded-md shadow-md mt-4 w-full max-w-xl">
    <h2 className="text-xl font-semibold mb-2">Weather in {data.location.name}</h2>
    <p>Temperature: {data.current.temp_c}°C</p>
    <p>Condition: {data.current.condition.text}</p>
    <img src={data.current.condition.icon} alt="Weather icon" />
  </div>
)

const EventsView = ({ events, hasSearched }) => {
  if (!hasSearched) return null
  if (events.length === 0) return <p className="text-white mt-4">No events found this weekend.</p>

  return (
    <div className="bg-white/80 p-4 rounded-md shadow-md mt-4 w-full max-w-xl">
      <h2 className="text-xl font-semibold mb-2">Events This Weekend</h2>
      <ul>
        {events.map((event, index) => (
          <li key={index} className="mb-3">
            <strong>{event.name}</strong> – {event.dates.start.localDate}
            <br />
            <a href={event.url} target="_blank" className="text-blue-600 underline">Tickets</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

const WikiSummary = ({ summary, city }) =>
  summary ? (
    <div className="bg-white/80 p-4 rounded-md shadow-md mt-4 w-full max-w-xl">
      <h2 className="text-xl font-semibold mb-2">About {city}</h2>
      <p>{summary}</p>
    </div>
  ) : null

function App() {
  const [city, setCity] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedCity, setSelectedCity] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [events, setEvents] = useState([])
  const [cityPhoto, setCityPhoto] = useState(null)
  const [wikiSummary, setWikiSummary] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState(null)

  const handleInputChange = (event) => {
    const value = event.target.value
    setCity(value)
    setSelectedCity(null)
    setSuggestions([])
    setWeatherData(null)
    setEvents([])
    setWikiSummary('')
    setHasSearched(false)

    if (debounceTimer) clearTimeout(debounceTimer)
    const timer = setTimeout(() => fetchSuggestions(value), 400)
    setDebounceTimer(timer)
  }

  const fetchSuggestions = async (input) => {
    if (input.length < 3) return setSuggestions([])

    try {
      const response = await axios.get('https://wft-geo-db.p.rapidapi.com/v1/geo/cities', {
        params: { namePrefix: input, limit: 10 },
        headers: {
          'X-RapidAPI-Key': import.meta.env.VITE_GEODB_API_KEY,
          'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
        }
      })

      const results = response.data.data.map((item) => ({
        name: item.city,
        country: item.country,
        fullName: `${item.city}, ${item.country}`
      }))

      const uniqueResults = results.filter((v, i, a) => i === a.findIndex((t) => t.fullName === v.fullName))
      setSuggestions(uniqueResults)
    } catch (err) {
      console.error('Error fetching city suggestions:', err)
    }
  }

  const handleSuggestionClick = (cityObj) => {
    setSelectedCity(cityObj)
    setCity(cityObj.fullName)
    setSuggestions([])
  }

  const handleSearch = async () => {
    if (!selectedCity?.name) return

    setIsLoading(true)
    setHasSearched(true)

    try {
      const weatherRes = await axios.get(
        `https://api.weatherapi.com/v1/current.json?key=${import.meta.env.VITE_WEATHER_API_KEY}&q=${selectedCity.name}&aqi=no`
      )
      setWeatherData(weatherRes.data)

      const eventsRes = await axios.get(`https://app.ticketmaster.com/discovery/v2/events.json`, {
        params: {
          apikey: import.meta.env.VITE_TICKETMASTER_API_KEY,
          city: selectedCity.name,
          startDateTime: new Date().toISOString().split('T')[0] + 'T00:00:00Z',
          endDateTime: new Date().toISOString().split('T')[0] + 'T23:59:59Z',
          size: 5
        }
      })
      const eventData = eventsRes.data._embedded?.events || []
      setEvents(eventData)

      const photoRes = await axios.get(`https://api.unsplash.com/search/photos`, {
        params: { query: selectedCity.name, orientation: 'landscape', per_page: 1 },
        headers: { Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}` }
      })
      setCityPhoto(photoRes.data.results[0]?.urls?.regular || null)

      const wikiRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${selectedCity.name}`)
      setWikiSummary(wikiRes.data.extract || '')
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: cityPhoto
          ? `url(${cityPhoto})`
          : "url('/background.jpg')"
      }}
    >
      <div className="min-h-screen bg-black/60 backdrop-blur-sm p-6 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-white mb-6 drop-shadow-lg">World City Info</h1>

        <SearchInput
          city={city}
          handleInputChange={handleInputChange}
          handleSearch={handleSearch}
          suggestions={suggestions}
          onSuggestionClick={handleSuggestionClick}
          isLoading={isLoading}
          selectedCity={selectedCity}
        />

        {weatherData && (
          <>
            <WeatherView data={weatherData} />
            <div className="text-white mt-2">
              <p><strong>Local Time:</strong> {weatherData.location.localtime}</p>
            </div>
            <CityMap
              lat={weatherData.location.lat}
              lon={weatherData.location.lon}
              name={weatherData.location.name}
            />
          </>
        )}

        <EventsView events={events} hasSearched={hasSearched} />
        <WikiSummary summary={wikiSummary} city={selectedCity?.name} />
      </div>
    </div>
  )
}

export default App
