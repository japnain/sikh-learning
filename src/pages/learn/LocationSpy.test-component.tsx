import { useLocation } from "react-router-dom"

export default function LocationSpy() {
  const location = useLocation()
  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>
}
