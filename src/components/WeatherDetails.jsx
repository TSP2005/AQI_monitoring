import React, { useState, useEffect } from "react";
import "./WeatherDetails.css";

const WeatherDetails = () => {
  const [location, setLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [nearestStation, setNearestStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeOfDay, setTimeOfDay] = useState("day");
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    getLocation();
    const hour = new Date().getHours();
    setTimeOfDay(hour >= 6 && hour < 18 ? "day" : "night");
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      fetchRecommendations(searchQuery);
    } else {
      setRecommendations([]);
      setShowRecommendations(false);
    }
  }, [searchQuery]);

  const getLocation = () => {
    setLoading(true);
    setError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          fetchWeatherAndStation(latitude, longitude);
        },
        (error) => {
          setError("Geolocation permission denied or unavailable.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
    }
  };

  const fetchWeatherAndStation = async (lat, lon) => {
    try {
      setError(null);

      const API_KEY = "841446cd1095cd5383d1045fa3107e05";
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );

      if (!weatherResponse.ok) throw new Error("Weather API request failed");
      const weather = await weatherResponse.json();

      setWeatherData({
        temperature: weather.main.temp,
        feelsLike: weather.main.feels_like,
        condition: weather.weather[0].description,
        windSpeed: weather.wind.speed,
        humidity: weather.main.humidity,
        city: weather.name,
        country: weather.sys.country,
        pressure: weather.main.pressure,
        sunrise: new Date(weather.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sunset: new Date(weather.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        icon: weather.weather[0].main.toLowerCase(),
      });

      const stationResponse = await fetch(`http://localhost:8000/nearest_station?lat=${lat}&lon=${lon}`);
      const station = await stationResponse.json();

      if (station.error) throw new Error("Nearest station not found");

      setNearestStation(station);
    } catch (err) {
      setError("Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (query) => {
    try {
      const API_KEY = "841446cd1095cd5383d1045fa3107e05";
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`
      );
      
      if (!response.ok) throw new Error("Geocoding API request failed");
      
      const data = await response.json();
      
      const formattedRecommendations = data.map(location => ({
        name: `${location.name}${location.state ? `, ${location.state}` : ""}, ${location.country}`,
        lat: location.lat,
        lon: location.lon
      }));
      
      setRecommendations(formattedRecommendations);
      setShowRecommendations(formattedRecommendations.length > 0);
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      setRecommendations([]);
      setShowRecommendations(false);
    }
  };

  const searchStation = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/station_by_name?name=${searchQuery}`);
      const stationData = await response.json();
      if (stationData.error) {
        throw new Error("Station not found");
      }
      setLocation({ latitude: stationData.latitude, longitude: stationData.longitude });
      fetchWeatherAndStation(stationData.latitude, stationData.longitude);
    } catch (err) {
      setError("Failed to fetch station data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchStation();
    setShowRecommendations(false);
  };

  const handleRecommendationClick = (recommendation) => {
    setSearchQuery(recommendation.name);
    setShowRecommendations(false);
    setLoading(true);
    
    fetchWeatherAndStation(recommendation.lat, recommendation.lon);
    setLocation({ latitude: recommendation.lat, longitude: recommendation.lon });
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowRecommendations(false), 200);
  };

  const getWeatherEmoji = (iconName) => {
    switch (iconName) {
      case "clear": return "☀️";
      case "clouds": return "☁️";
      case "rain": return "🌧️";
      case "snow": return "❄️";
      case "thunderstorm": return "⛈️";
      case "drizzle": return "🌦️";
      case "mist":
      case "fog": return "🌫️";
      default: return "🌤️";
    }
  };

  const getAqiLabel = (aqi) => {
    if (!aqi) return { label: "Unknown", className: "" };
    if (aqi <= 50) return { label: "Good", className: "aqi-good" };
    if (aqi <= 100) return { label: "Moderate", className: "aqi-moderate" };
    if (aqi <= 200) return { label: "Unhealthy", className: "aqi-unhealthy" };
    return { label: "Hazardous", className: "aqi-hazardous" };
  };

  const refreshWeather = () => {
    if (location) {
      setLoading(true);
      fetchWeatherAndStation(location.latitude, location.longitude);
    } else {
      getLocation();
    }
  };

  return (
    <div className="weather-wrapper">
      <div className={`weather-container ${timeOfDay}`}>
        <div className="weather-app">
          <div className="search-container">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowRecommendations(recommendations.length > 0)}
                  onBlur={handleInputBlur}
                />
                <button type="submit" className="search-button">
                  <span className="search-icon">🔍</span>
                </button>
              </div>
              
              {showRecommendations && (
                <div className="search-recommendations">
                  {recommendations.map((rec, index) => (
                    <div 
                      key={index}
                      className="recommendation-item"
                      onMouseDown={() => handleRecommendationClick(rec)}
                    >
                      <span className="recommendation-icon">📍</span>
                      <span className="recommendation-text">{rec.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Fetching your weather data...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
              <button className="refresh-button" onClick={refreshWeather}>
                <span className="refresh-icon">🔄</span>
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="weather-header">
                <div className="location-info">
                  <span className="location-icon">📍</span>
                  <h1>{weatherData.city}, {weatherData.country}</h1>
                </div>
                <button className="refresh-button" onClick={refreshWeather}>
                  <span className="refresh-icon">🔄</span>
                  Refresh
                </button>
              </div>

              <div className="current-weather">
                <div className="temperature-container">
                  <div className="weather-icon-large">
                    {getWeatherEmoji(weatherData.icon)}
                  </div>
                  <div className="temperature">
                    <h2>{Math.round(weatherData.temperature)}°C</h2>
                    <p className="feels-like">Feels like {Math.round(weatherData.feelsLike)}°C</p>
                  </div>
                </div>
                <div className="condition">
                  <p className="condition-text">{weatherData.condition}</p>
                  <div className="date-time">
                    <p>{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    <p>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>

              <div className="weather-details-grid">
                <div className="detail-card">
                  <span className="detail-icon">💧</span>
                  <div className="detail-info">
                    <h3>Humidity</h3>
                    <p>{weatherData.humidity}%</p>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">💨</span>
                  <div className="detail-info">
                    <h3>Wind</h3>
                    <p>{weatherData.windSpeed} m/s</p>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🌅</span>
                  <div className="detail-info">
                    <h3>Sunrise</h3>
                    <p>{weatherData.sunrise}</p>
                  </div>
                </div>
                <div className="detail-card">
                  <span className="detail-icon">🌇</span>
                  <div className="detail-info">
                    <h3>Sunset</h3>
                    <p>{weatherData.sunset}</p>
                  </div>
                </div>
              </div>

              <div className="air-quality-section">
                <h2>Air Quality</h2>
                <div className="station-info">
                  <p className="station-name">{nearestStation.station_name}</p>
                  <div className="aqi-badge">
                    <span className={getAqiLabel(nearestStation.aqi).className}>
                      AQI: {nearestStation.aqi} - {getAqiLabel(nearestStation.aqi).label}
                    </span>
                  </div>
                </div>

                <div className="pollutants-grid">
                  <div className="pollutant-card">
                    <h3>PM2.5</h3>
                    <p>{nearestStation.pm25} μg/m³</p>
                  </div>
                  <div className="pollutant-card">
                    <h3>PM10</h3>
                    <p>{nearestStation.pm10} μg/m³</p>
                  </div>
                  <div className="pollutant-card">
                    <h3>O₃</h3>
                    <p>{nearestStation.o3} μg/m³</p>
                  </div>
                  <div className="pollutant-card">
                    <h3>NO₂</h3>
                    <p>{nearestStation.no2} μg/m³</p>
                  </div>
                  <div className="pollutant-card">
                    <h3>SO₂</h3>
                    <p>{nearestStation.so2} μg/m³</p>
                  </div>
                  <div className="pollutant-card">
                    <h3>CO</h3>
                    <p>{nearestStation.co} μg/m³</p>
                  </div>
                </div>
              </div>

              <div className="forecast-preview">
                <h2>Today's Forecast</h2>
                <div className="forecast-grid">
                  <div className="forecast-item">
                    <p className="forecast-time">Now</p>
                    <div className="forecast-emoji">{getWeatherEmoji(weatherData.icon)}</div>
                    <p className="forecast-temp">{Math.round(weatherData.temperature)}°</p>
                  </div>
                  <div className="forecast-item">
                    <p className="forecast-time">Later</p>
                    <div className="forecast-emoji">🌤️</div>
                    <p className="forecast-temp">{Math.round(weatherData.temperature) + 1}°</p>
                  </div>
                  <div className="forecast-item">
                    <p className="forecast-time">Evening</p>
                    <div className="forecast-emoji">🌙</div>
                    <p className="forecast-temp">{Math.round(weatherData.temperature) - 2}°</p>
                  </div>
                  <div className="forecast-item">
                    <p className="forecast-time">Night</p>
                    <div className="forecast-emoji">✨</div>
                    <p className="forecast-temp">{Math.round(weatherData.temperature) - 4}°</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="weather-footer">
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherDetails;