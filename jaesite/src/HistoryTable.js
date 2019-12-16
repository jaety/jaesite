import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import moment from 'moment';
import Grid from '@material-ui/core/Grid';
import { Map, TileLayer, Rectangle, Path, Marker } from 'react-leaflet';
import 'leaflet-path-transform';
import DraggableRectangle from './DraggableRectangle';

function point2position(point) {
  return [point.coordinates[1], point.coordinates[0]];
}

function peopleToTable(dataset) {
  const columnDefs = [
    {headerName: 'Name', field: 'name',
      cellRenderer: (params) => {
        const url = params.data["person"];
        const name= params.value;
        return `<a href=${url}>${name}</a>`
      },
      sortable: true, resizable: true
    },
    {headerName: 'Description', field: 'desc', resizable: true},
    {headerName: 'Birth Place', field: 'birthPlaceName', sortable: true, resizable: true},
    {headerName: 'Birth Year', field: 'birthTime', sortable: true, resizable: true,
      filter: 'agNumberColumnFilter',
      filterParams:{
        defaultOption:['inRange']
      }
    }
  ];
  // const columnDefs = dataset.columns.map(f => {
  //   return {headerName:f, field:f}
  // });
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

      lat: 47.9899,
      lng: 48.3509,
      zoom: 2,

      rectBounds: [
        [17, -17],
        [72, 62]
      ],

      marker: null,

      content: "Welcome to the histor-wiki"
    }
  }

  loadDataset() {
    const miny = this.state.rectBounds[0][0]
    const minx = this.state.rectBounds[0][1]
    const maxy = this.state.rectBounds[1][0]
    const maxx = this.state.rectBounds[1][1]
    fetch(`http://localhost:5000/people?minx=${minx}&miny=${miny}&maxx=${maxx}&maxy=${maxy}`)
      .then(response => response.json())
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
    /*
    const birth_point = event.data.birth_point.coordinates;
    const zoom = this.refs.map.leafletElement.getZoom();
    this.setState({lng: birth_point[0], lat: birth_point[1], zoom: zoom});
    */
    this.setState({
      marker: point2position(event.data.birth_point)
    })
    const qid = event.data.person.split('/').slice(-1)[0]
    fetch("http://localhost:5000/wikipedia_summary/" + qid)
      .then(response => response.json())
      .then(dataset => {
        this.setState({content:dataset})
      })
  }

  onBoundChange(bounds) {
    this.setState({
      rectBounds: [
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
      ]
    });
    this.loadDataset();
    console.log(bounds);
  }

  render() {
    const leftColumnWidth=8;

    const position = [this.state.lat, this.state.lng];

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
            <Map center={position} zoom={this.state.zoom} ref="map" maxZoom={18} style={ {height:'300px'} }>
              <TileLayer
                attribution={mapAttribution}
                url={mapUrl}
              />
              <DraggableRectangle bounds={this.state.rectBounds} color="blue" ref="rectBounds"
                    transform={true} draggable={true}
                    onBoundChange={ this.onBoundChange.bind(this) }/>

              {(this.state.marker) && <Marker position={this.state.marker} />}
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
