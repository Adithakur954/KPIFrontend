// This module is imported only after the Google basemap instance exists.
// Keep the WebGL renderer off the basemap's initial download/parse path.
export { GoogleMapsOverlay } from '@deck.gl/google-maps';
export { LineLayer, PolygonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
