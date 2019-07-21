import React from 'react';
import { Map, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {admin0data} from './admin0data1';

// const { Map: LeafletMap, TileLayer, Marker, Popup } = ReactLeaflet

class HistoryMap extends React.Component {
  constructor() {
    super()
    this.state = {
      lat: -19.0154,
      lng: 29.1549,
      zoom: 6
    }
  }

  render() {
    const position = [this.state.lat, this.state.lng];
    const mapboxAccessToken = 'pk.eyJ1IjoiamFldHkiLCJhIjoiY2p5Y3hpaDNtMGF6MTNwanprY2lmZGtoaSJ9.vv8A-gUvtzjeAkU8oNGHQw';
    const mapUrl = 'https://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken;
    const mapAttribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
			'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

    return (
      <Map center={position} zoom={this.state.zoom}>
        <TileLayer
          attribution={mapAttribution}
          url={mapUrl}
        />
        <GeoJSON
          data={admin0data}
        />
        <Marker position={position}>
          <Popup>
            A pretty CSS3 popup. <br/> Easily customizable.
          </Popup>
        </Marker>
      </Map>
    );
  }
}

export default HistoryMap;
