import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Map, TileLayer, Marker } from 'react-leaflet';
import Grid from '@material-ui/core/Grid';

import DraggableRectangle from './DraggableRectangle';
import { Rect, Point } from './Geometry';

import moment from 'moment';

import 'leaflet-path-transform';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';

/**
  AG Grid : Render a field as a url, with href taken from another field
    @param {string} urlField : field from data object
 */
function hyperlinkRenderer(urlField) {
  return (params) => {
    const url = params.data[urlField];
    const display = params.value;
    return `<a href=${url}>${display}`;
  }
}

function withUrlParams(url, params) {
  var urlObj = new URL(url);
  var params = params || {};
  Object.keys(params).forEach(key => {
    if (typeof params[key] !== 'undefined') { urlObj.searchParams.append(key, params[key]); }
  })
  return urlObj;
}

class HistowikiApi {
  constructor(baseUrl = "http://localhost:5000") {
    this.baseUrl = baseUrl
  }

  apiUrl(endPoint, params) {
    return withUrlParams(new URL(endPoint,this.baseUrl), params);
  }

  people({
      bounds, // geometry.Rect
      limit,
      only_query} = {}
    ) {
      const params = Object.assign({}, bounds.asDict(), {limit:limit, only_query:only_query});
      return fetch(this.apiUrl("people", params))
        .then(response => response.json())
      }

  wikipedia_summary({qid}) {
    if (!qid) { throw "qid is required"; }
    return fetch(this.apiUrl(`wikipedia_summary/${qid}`))
      .then(response => response.json());
  }
}

function peopleToTable(dataset) {
  const columnDefs = [
    { headerName: 'Name',
      field: 'name',
      cellRenderer: hyperlinkRenderer('person'),
      sortable: true,
      resizable: true
    },
    { headerName: 'Description',
      field: 'desc',
      resizable: true
    },
    { headerName: 'Birth Place',
      field: 'birthPlaceName',
      sortable: true,
      resizable: true
    },
    { headerName: 'Birth Year',
      field: 'birthTime',
      sortable: true,
      resizable: true,
      filter: 'agNumberColumnFilter',
      filterParams:{
        defaultOption:['inRange']
      }
    }
  ];

  const customConverters = {
    'birthTime': (value) => {
      const valueFixed = (value[0] === '-') ? '-00' + value.substring(1) : value;
      return moment(valueFixed).year()
    }
  };
  const valueConverter = (field) => customConverters[field] || ((x) => x);


  const rows = dataset.rows.map(row => {
      var item = {}
      row.forEach( (f,i) => {
        const fieldName = dataset.columns[i];
        item[fieldName] = valueConverter(fieldName)(f)
      });
      return item
  });
  return {
    columnDefs: columnDefs,
    rowData: rows
  }
}

class HistoryTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      columnDefs: [],
      rowData: [],

      center: new Point(48.3509, 47.9899),
      zoom: 2,
      rectBounds: new Rect(-17, 17, 62, 72),
      marker: null,

      content: "Welcome to the histor-wiki"
    }

    this.api = new HistowikiApi("http://localhost:5000")
  }

  loadDataset() {
    this.api.people({bounds: this.state.rectBounds})
      .then(dataset => {
        var columnMap = {}
        dataset.columns.forEach((name,idx) => columnMap[name] = idx)
        dataset['map'] = columnMap
        this.setState(peopleToTable(dataset));
      })
  }

  componentDidMount() {
    this.loadDataset();
  }

  onCellClicked(event) {
    this.setState({
      marker: Point.fromJsonPoint(event.data.birth_point)
    })
    const qid = event.data.person.split('/').slice(-1)[0]
    this.api.wikipedia_summary({qid})
      .then(dataset => {
        this.setState({content:dataset})
      })
  }

  onBoundChange(bounds) {
    this.setState({ rectBounds: bounds });
    this.loadDataset();
  }

  render() {
    const leftColumnWidth=8;

    const mapboxAccessToken = 'pk.eyJ1IjoiamFldHkiLCJhIjoiY2p5Y3hpaDNtMGF6MTNwanprY2lmZGtoaSJ9.vv8A-gUvtzjeAkU8oNGHQw';
    const mapUrl = 'https://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=' + mapboxAccessToken;
    const mapAttribution = 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
			'<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

    return (
    <Grid container spacing={1}>
      <Grid item xs={leftColumnWidth}>
        <div
          className="ag-theme-balham"
          style={{
            height: '88vh',
            width: '100%' }}
        >
          <AgGridReact
            columnDefs={this.state.columnDefs}
            rowData={this.state.rowData}
            onCellClicked={this.onCellClicked.bind(this)}
            style={{height:'100%'}}
          >
          </AgGridReact>
        </div>
      </Grid>
      <Grid item xs={12-leftColumnWidth}>
        <div>
            <Map center={this.state.center.latLng()} zoom={this.state.zoom} ref="map" maxZoom={18} style={ {height:'300px'} }>
              <TileLayer
                attribution={mapAttribution}
                url={mapUrl}
              />
              <DraggableRectangle bounds={this.state.rectBounds} color="blue"
                    transform={true} draggable={true}
                    onBoundChange={ this.onBoundChange.bind(this) }/>

              {(this.state.marker) && <Marker position={this.state.marker.latLng()} />}
            </Map>
        </div>
        <div>
            {this.state.content}
        </div>
      </Grid>
    </Grid>
    );
  }
}

export default HistoryTable;
