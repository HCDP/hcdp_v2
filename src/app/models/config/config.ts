export interface HCDPConfig {
  locationData: {
    location: string,
    timezone: string,
    mapView: {
      bounds: {
        sections: Record<string, L.LatLngBoundsExpression>
        data: L.LatLngBoundsLiteral,
        map: L.LatLngBoundsLiteral
      }
      center: L.LatLngTuple,
      zoom: number,
      minZoom: number
    }
  },
  api: Record<string, {
    url: string,
    token: string
  }>
}