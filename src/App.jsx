/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import axios from 'axios'

const SearchInput = ({
  city,
  handleInputChange,
  handleSearch,
  suggestions,
  onSuggestionClick,
  isLoading,
  selectedCity
}) => (
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
          <li
            key={index}
            onClick={() => onSuggestionClick(sug)}
            className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
          >
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

const EventsView = ({ events }) => {
  if (events.length === 0) {
    return <p className="text-white mt-4">No events found this weekend.</p>
  }

  return (
    <div className="bg-white/80 p-4 rounded-md shadow-md mt-4 w-full max-w-xl">
      <h2 className="text-xl font-semibold mb-2">Events This Weekend</h2>
      <ul>
        {events.map((event, index) => (
          <li key={index} className="mb-3">
            <strong>{event.name}</strong> – {event.dates.start.localDate}
            <br />
            <a href={event.url} target="_blank" className="text-blue-600 underline">
              Tickets
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function App() {
  const [city, setCity] = useState('')
  const [weatherData, setWeatherData] = useState(null)
  const [error, setError] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [selectedCity, setSelectedCity] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState([])
  const [cityPhoto, setCityPhoto] = useState(null)
  const [debounceTimer, setDebounceTimer] = useState(null)

  const fetchCityPhoto = async (cityName) => {
    try {
      const response = await axios.get(`https://api.unsplash.com/search/photos`, {
        params: {
          query: cityName,
          orientation: 'landscape',
          per_page: 1
        },
        headers: {
          Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`
        }
      })
      const url = response.data.results[0]?.urls?.regular
      setCityPhoto(url || null)
    } catch (error) {
      console.error('Error fetching city photo:', error)
      setCityPhoto(null)
    }
  }

  const getUpcomingSunday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilSunday = 7 - dayOfWeek
    const sunday = new Date(today)
    sunday.setDate(today.getDate() + daysUntilSunday)
    return sunday.toISOString().split('T')[0] + 'T23:59:59Z'
  }

  const fetchSuggestions = async (input) => {
    if (input.length < 3) {
      setSuggestions([])
      return
    }
    try {
      const response = await axios.get('https://wft-geo-db.p.rapidapi.com/v1/geo/cities', {
        params: { namePrefix: input, limit: 10 },
        headers: {
          'X-RapidAPI-Key': import.meta.env.VITE_GEODB_API_KEY,
          'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
        }
      })

      const cityResults = response.data.data.map((item) => ({
        name: item.city,
        country: item.country,
        fullName: `${item.city}, ${item.country}`
      }))

      const uniqueResults = cityResults.filter(
        (value, index, self) =>
          index === self.findIndex((v) => v.fullName === value.fullName)
      )

      setSuggestions(uniqueResults)
    } catch (error) {
      console.error('Error fetching city suggestions:', error)
      setSuggestions([])
    }
  }

  const handleInputChange = (event) => {
    const value = event.target.value
    setCity(value)
    setSelectedCity(null)
    setSuggestions([])
    setWeatherData(null)
    setError(null)

    if (debounceTimer) clearTimeout(debounceTimer)
    const timer = setTimeout(() => {
      fetchSuggestions(value)
    }, 400)
    setDebounceTimer(timer)
  }

  const handleSuggestionClick = (cityObj) => {
    setSelectedCity(cityObj)
    setCity(cityObj.fullName)
    setSuggestions([])
  }

  const handleSearch = async () => {
    if (!selectedCity || !selectedCity.name) {
      setError('Please select a city from the list.')
      return
    }

    setIsLoading(true)
    try {
      const weatherResponse = await axios.get(
        `https://api.weatherapi.com/v1/current.json?key=${import.meta.env.VITE_WEATHER_API_KEY}&q=${selectedCity.name}&aqi=no`
      )
      setWeatherData(weatherResponse.data)
      setError(null)

      const eventsResponse = await axios.get(
        `https://app.ticketmaster.com/discovery/v2/events.json`,
        {
          params: {
            apikey: import.meta.env.VITE_TICKETMASTER_API_KEY,
            city: selectedCity.name,
            startDateTime: new Date().toISOString().split('T')[0] + 'T00:00:00Z',
            endDateTime: getUpcomingSunday(),
            sort: 'date,asc',
            size: 5
          }
        }
      )
      const eventData = eventsResponse.data._embedded?.events || []
      setEvents(eventData)

      await fetchCityPhoto(selectedCity.name)
    } catch (err) {
      console.error('Weather/Events fetch failed:', err)
      setWeatherData(null)
      setError('Could not fetch data for that city.')
      setEvents([])
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
        <h1 className="text-3xl font-bold text-white mb-6 drop-shadow-lg">
          World City Info
        </h1>

        <SearchInput
          city={city}
          handleInputChange={handleInputChange}
          handleSearch={handleSearch}
          suggestions={suggestions}
          onSuggestionClick={handleSuggestionClick}
          isLoading={isLoading}
          selectedCity={selectedCity}
        />

        {error && <p className="text-red-400 mt-2">{error}</p>}
        {weatherData && <WeatherView data={weatherData} />}
        {events && <EventsView events={events} />}
      </div>
    </div>
  )
}

export default App
