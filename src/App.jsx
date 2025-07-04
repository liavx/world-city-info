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
  <div className="relative w-full mb-6">
    <div className="flex flex-col sm:flex-row gap-2">
      <input
        id="city"
        type="text"
        value={city}
        onChange={handleInputChange}
        placeholder="Enter a city..."
        disabled={isLoading}
        className="w-full px-4 py-2 rounded-xl border border-gray-300 text-black disabled:opacity-50"
      />
      <button
        onClick={handleSearch}
        disabled={!selectedCity || isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50"
      >
        {isLoading ? (
          <span className="animate-pulse">Loading...</span>
        ) : (
          'Search'
        )}
      </button>
    </div>

    {suggestions.length > 0 && (
      <ul className="absolute bg-white text-black border border-gray-300 mt-2 w-full rounded-xl shadow-md z-10 max-h-60 overflow-y-auto">
        {suggestions.map((sug, index) => (
          <li
            key={index}
            className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
            onClick={() => onSuggestionClick(sug)}
          >
            {sug.fullName}
          </li>
        ))}
      </ul>
    )}
  </div>
)

const WeatherView = ({ data }) => (
  <div className="bg-white/30 backdrop-blur-md border border-white/20 text-white rounded-xl shadow-md p-4 mb-6 transition-all duration-500 ease-in-out animate-fadeIn hover:scale-[1.01] hover:shadow-lg">
    <h2 className="text-xl font-semibold mb-2">Weather in {data.location.name}</h2>
    <p>Temperature: {data.current.temp_c}°C</p>
    <p>Condition: {data.current.condition.text}</p>
    <p>Local Time: {data.location.localtime}</p>
    <img src={data.current.condition.icon} alt="Weather icon" className="mt-2" />
  </div>
)

const CityIntro = ({ text }) => {
  if (!text) return null
  return (
    <div className="bg-white/30 backdrop-blur-md border border-white/20 text-white rounded-xl shadow-md p-4 mb-6 transition-all duration-500 ease-in-out animate-fadeIn hover:scale-[1.01] hover:shadow-lg">
      <h2 className="text-xl font-semibold mb-2">About the City</h2>
      <p>{text}</p>
    </div>
  )
}

const EventsView = ({ events }) => {
  if (events.length === 0) {
    return <p className="text-sm text-white/70">No events found this weekend.</p>
  }

  return (
    <div className="bg-white/30 backdrop-blur-md border border-white/20 text-white rounded-xl shadow-md p-4 mb-6 transition-all duration-500 ease-in-out animate-fadeIn hover:scale-[1.01] hover:shadow-lg">
      <h2 className="text-xl font-semibold mb-2">Events This Weekend</h2>
      <ul className="space-y-3">
        {events.map((event, index) => (
          <li key={index}>
            <strong>{event.name}</strong> – {event.dates.start.localDate}
            <br />
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 underline"
            >
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
  const [wikiIntro, setWikiIntro] = useState('')
  const [bgImage, setBgImage] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      const fetchSuggestions = async () => {
        if (city.length < 3) {
          setSuggestions([])
          return
        }

        try {
          const response = await axios.get('https://wft-geo-db.p.rapidapi.com/v1/geo/cities', {
            params: { namePrefix: city, limit: 10 },
            headers: {
              'X-RapidAPI-Key': import.meta.env.VITE_GEODB_API_KEY,
              'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
            }
          })

          const rawResults = response.data.data.map((item) => ({
            name: item.city,
            country: item.country,
            fullName: `${item.city}, ${item.country}`
          }))

          const uniqueResults = Array.from(
            new Map(rawResults.map(obj => [obj.fullName, obj])).values()
          )

          setSuggestions(uniqueResults)
        } catch (error) {
          console.error('Error fetching city suggestions:', error)
          setSuggestions([])
        }
      }

      fetchSuggestions()
    }, 500)

    return () => clearTimeout(timeout)
  }, [city])

  const handleInputChange = (event) => {
    setCity(event.target.value)
    setSelectedCity(null)
    setSuggestions([])
    setWeatherData(null)
    setEvents([])
    setWikiIntro('')
    setBgImage('')
    setError(null)
  }

  const getUpcomingSunday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilSunday = 7 - dayOfWeek
    const sunday = new Date(today)
    sunday.setDate(today.getDate() + daysUntilSunday)
    return sunday.toISOString().split('T')[0] + 'T23:59:59Z'
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

      const eventResponse = await axios.get(
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

      const eventData = eventResponse.data._embedded?.events || []
      setEvents(eventData)

      const wikiResponse = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(selectedCity.name)}`
      )
      setWikiIntro(wikiResponse.data.extract)

      setBgImage(`https://source.unsplash.com/1600x900/?${selectedCity.name},city`)
    } catch (err) {
      console.error('Data fetch failed:', err)
      setWeatherData(null)
      setWikiIntro('')
      setEvents([])
      setError('Could not fetch data for that city.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (cityObj) => {
    setSelectedCity(cityObj)
    setCity(cityObj.fullName)
    setSuggestions([])
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white flex justify-center items-start py-12 px-4 transition-all duration-700"
      style={{
        backgroundImage: `url(${bgImage || '/default.jpg'})`,
        backgroundColor: '#0d0d0d'
      }}
    >
      <div className="w-full max-w-xl px-4 sm:px-6 md:px-8 bg-black/40 backdrop-blur-lg rounded-xl p-6 shadow-2xl">
        <SearchInput
          city={city}
          handleInputChange={handleInputChange}
          handleSearch={handleSearch}
          suggestions={suggestions}
          onSuggestionClick={handleSuggestionClick}
          isLoading={isLoading}
          selectedCity={selectedCity}
        />
        {error && <p className="text-red-400 mb-4">{error}</p>}
        {weatherData && <WeatherView data={weatherData} />}
        {weatherData && <EventsView events={events} />}
        {weatherData && <CityIntro text={wikiIntro} />}
      </div>
    </div>
  )
}

export default App
