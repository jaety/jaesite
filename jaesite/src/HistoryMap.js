import React from 'react';
import L from 'leaflet';
import { Map, TileLayer, Marker, Popup, Rectangle, Tooltip, GeoJSON } from 'react-leaflet';
import { MapControl, PropTypes } from 'react-leaflet';
import moment from 'moment';
// import DivIcon from 'react-leaflet-div-icon';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';

import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import addHistogramModule from 'highcharts/modules/histogram-bellcurve'

addHistogramModule(Highcharts);

delete L.Icon.Default.prototype._getIconUrl;


// https://github.com/PaulLeCam/react-leaflet/issues/453
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

function getColor(input, scale) {
    var colors = ['#FFEDA0','#FED976','#FEB24C','#FD8D3C','#FC4E2A','#E31A1C','#BD0026','#800026'];
    return colors[Math.min(Math.floor( (input / scale) * (colors.length-1) ), colors.length-1)];
    // let d = input / 100000;
    // return d > 1000 ? '#800026' :
    //        d > 500  ? '#BD0026' :
    //        d > 200  ? '#E31A1C' :
    //        d > 100  ? '#FC4E2A' :
    //        d > 50   ? '#FD8D3C' :
    //        d > 20   ? '#FEB24C' :
    //        d > 10   ? '#FED976' :
    //                   '#FFEDA0';
}

function style(feature) {
    return {
        fillColor: getColor(feature.properties.population, 1000),
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

function point2position(point) {
  return [point.coordinates[1], point.coordinates[0]];
}


class HistoryMap extends React.Component {
  constructor() {
    super()
    this.state = {
      lat: -19.0154,
      lng: 29.1549,
      zoom: 3,
      datasets: [],
      people: {rows:[]},
      highlightCenter: undefined,
      hightlightCountry: undefined,
      timeChartState: {
          chart: {
            zoomType: 'x'
          },
          title: {
            text: 'Over Time'
          },
          series: [{
              data: [3.5, 3, 3.2, 3.1, 3.6, 3.9, 3.4]
          }]
      }
    }
  }

  componentDidMount() {
    fetch('http://localhost:5000')
      .then(response => response.json())
      .then(dataset => this.setState({datasets: [dataset]}))
    fetch('http://localhost:5000/people')
      .then(response => response.json())
      .then(dataset => {
        var columnMap = {}
        dataset.columns.forEach((name,idx) => columnMap[name] = idx)
        dataset['map'] = columnMap
        this.setState({people: dataset});
      })
    fetch('http://localhost:5000/count_over_time')
      .then(response => response.json())
      .then(dataset => {
        this.setState({'timeChartState': {
          xAxis: [{
              title: { text: 'Year' },
              alignTicks: false
          } /*, {
              title: { text: 'Histogram' },
              alignTicks: false,
              opposite: true
          } */],

          yAxis: [{
              title: { text: 'Counts' }
          } /*, {
              title: { text: 'Histogram' },
              opposite: true
          }*/],

          series: [
            // {
            //   type: 'histogram',
            //   baseSeries: 1,
            //   xAxis: 1,
            //   yAxis: 1
            // },
            {
              data: dataset,
              step: true,
              xAxis: 0,
              yAxis: 0
            }
          ]
        }});
      })
  }

  setHighlight(e) {
    highlightFeature(e);
    const center = e.target.getBounds().getCenter();
    this.setState({
      highlightCenter: [center.lat, center.lng],
      highlightCountry: e.target.feature
    });
  }

  resetHighlight(e) {
      this.refs.boundariesLayer.leafletElement.resetStyle(e.target);
      this.setState({
        highlightCenter: undefined,
        highlightCountry: undefined
      });
  }

  zoomToFeature(e) {
      this.refs.map.leafletElement.fitBounds(e.target.getBounds());
  }

  onEachFeature(feature, layer) {
      layer.on({
          mouseover: this.setHighlight.bind(this),
          mouseout: this.resetHighlight.bind(this),
          click: this.zoomToFeature.bind(this)
      });
  }

  handleMoveEnd(e) {
    // function buildUrl(base, bounds) {
    //   return `http://localhost:5000/${base}?minx=${bounds.getWest()}&maxx=${bounds.getEast()}&miny=${bounds.getSouth()}&maxy=${bounds.getNorth()}`
    // }
    //
    // const bounds = e.target.getBounds();
    // console.log(bounds);
    // console.log(buildUrl("count_in_box",bounds))
    // fetch(buildUrl("count_in_box",bounds))
    //   .then(response => response.json())
    //   .then(count => {
    //     console.log("count",count, count<75)
    //     if (count < 200) {
    //       fetch(buildUrl("people_in_box",bounds))
    //         .then(response => response.json())
    //         .then(dataset => {
    //           console.log(dataset)
    //           this.setState({people: dataset});
    //         })
    //     } else {
    //       this.setState({
    //         people: {rows:[]}
    //       })
    //     }
    //   });
  }

  render() {
    const position = [this.state.lat, this.state.lng];
    const highlightPosition = this.state.highlightCenter;

    const mapboxAccessToken = 'pk.eyJ1IjoiamFldHkiLCJhIjoiY2p5Y3hpaDNtMGF6MTNwanprY2lmZGtoaSJ9.vv8A-gUvtzjeAkU8oNGHQw';
    const mapUrl = 'https://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken;
    const mapAttribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
			'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';


    // const rectBounds = (!highlightPosition) ? null : (
    //   [[highlightPosition[0]-20, highlightPosition[1]-20],
    //    [highlightPosition[0]-10, highlightPosition[1]-10]]
    //  );
    var marker = null;
    if (highlightPosition) {
      const rectBounds = [highlightPosition, highlightPosition];
      const count = this.state.highlightCountry.properties.population;
      marker = (!highlightPosition) ? null : (
        <Rectangle bounds={rectBounds}>
          <Tooltip permanent>{count}</Tooltip>
        </Rectangle>
        // <Marker position={highlightPosition}>
        //   <Popup>
        //     A pretty CSS3 popup. <br/> Easily customizable.
        //   </Popup>
        // </Marker>
      )
    }
    const rows = this.state.people.rows;
    const colmap = this.state.people.map;

    function formatDate(d) {
      const dFixed = d.replace(/^-/,"-00");
      return moment.utc(dFixed).format("MMM Do YYYY")
    }

    return (
      <div>
        {/*
        <Map center={position} zoom={this.state.zoom} ref="map" onMoveEnd={this.handleMoveEnd.bind(this)} maxZoom={18}>
          <TileLayer
            attribution={mapAttribution}
            url={mapUrl}
          />
          <MarkerClusterGroup chunkedLoading={true}>
          {this.state.people.rows.map((row,idx) =>
            <Marker key={`marker-${idx}`} position={point2position(row[colmap["birth_point"]])} autoPan="false">
              <Popup>
                <span><a href={row[colmap["person"]]}>{row[colmap["name"]]}</a></span>
                <br />
                {row[colmap["desc"]]}
                <br />
                {formatDate(row[colmap["birthTime"]])}
              </Popup>
            </Marker>
          )}
          </MarkerClusterGroup>
        </Map>
        */}
        <HighchartsReact
          highcharts={Highcharts}
          options={this.state.timeChartState}
        />
      </div>
    );
  }
}

// {this.state.datasets.map((data,idx) => {
//   return (<GeoJSON
//     key={idx}
//     data={data}
//     style={style}
//     onEachFeature={this.onEachFeature.bind(this)}
//     ref="boundariesLayer"
//   />)
// })}
// { marker }




export default HistoryMap;
