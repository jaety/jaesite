import React from 'react';
import { Map, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// import {admin0data} from './admindataAfrica';

// const { Map: LeafletMap, TileLayer, Marker, Popup } = ReactLeaflet
function getColor(input) {
    let d = input / 100000;
    return d > 1000 ? '#800026' :
           d > 500  ? '#BD0026' :
           d > 200  ? '#E31A1C' :
           d > 100  ? '#FC4E2A' :
           d > 50   ? '#FD8D3C' :
           d > 20   ? '#FEB24C' :
           d > 10   ? '#FED976' :
                      '#FFEDA0';
}

function style(feature) {
    return {
        fillColor: getColor(feature.properties.population),
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.7
    };
}

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    // if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    // }
}



class HistoryMap extends React.Component {
  constructor() {
    super()
    this.state = {
      lat: -19.0154,
      lng: 29.1549,
      zoom: 3,
      datasets: []
    }
  }

  componentDidMount() {
    fetch('http://localhost:5000')
      .then(response => response.json())
      .then(dataset => this.setState({datasets: [dataset]}))
  }

  resetHighlight(e) {
      this.refs.boundariesLayer.leafletElement.resetStyle(e.target);
  }

  zoomToFeature(e) {
      this.refs.map.leafletElement.fitBounds(e.target.getBounds());
  }

  onEachFeature(feature, layer) {
      layer.on({
          mouseover: highlightFeature,
          mouseout: this.resetHighlight.bind(this),
          click: this.zoomToFeature.bind(this)
      });
  }

  render() {
    const position = [this.state.lat, this.state.lng];
    const mapboxAccessToken = 'pk.eyJ1IjoiamFldHkiLCJhIjoiY2p5Y3hpaDNtMGF6MTNwanprY2lmZGtoaSJ9.vv8A-gUvtzjeAkU8oNGHQw';
    const mapUrl = 'https://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken;
    const mapAttribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
			'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

    return (
      <Map center={position} zoom={this.state.zoom} ref="map">
        <TileLayer
          attribution={mapAttribution}
          url={mapUrl}
        />
        {this.state.datasets.map((data,idx) => {
          return (<GeoJSON
            key={idx}
            data={data}
            style={style}
            onEachFeature={this.onEachFeature.bind(this)}
            ref="boundariesLayer"
          />)
        })}
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
