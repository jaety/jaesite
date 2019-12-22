import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Map, TileLayer, Marker } from 'react-leaflet';
import Grid from '@material-ui/core/Grid';
import Slider from '@material-ui/core/Slider';
import DraggableRectangle from './DraggableRectangle';
import { Rect, Point } from './Geometry';
import { HistowikiApi } from './HistowikiApi';
import Input from '@material-ui/core/Input';
import { makeStyles } from '@material-ui/core/styles';

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

      content: "Welcome to the histor-wiki",

      timeMaxBounds: [-4000,2200],
      timeBounds: [-3900,2100]
    }

    this.api = new HistowikiApi("http://localhost:5000")
  }

  loadDataset() {
    this.api.people({bounds: this.state.rectBounds, minyear:this.state.timeBounds[0], maxyear:this.state.timeBounds[1]})
      .then(dataset => {
        console.log(dataset);
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

  onTimeChange(event, range) {
    this.setState({ timeBounds: range });
    this.loadDataset();
  }

  // onMinTimeChange(event) {
  //   var newBounds = this.state.timeBounds;
  //   this.setState({ timeBounds: [event.target.value, newBounds[1]]})
  // }
  //
  // onMaxTimeChange(event) {
  //   var newBounds = this.state.timeBounds;
  //   this.setState({ timeBounds: [newBounds[0], event.target.value]})
  // }

  render() {
    const classes = makeStyles();
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
        <div style={ {"margin-bottom": "20px"}}>
        Time Bounds
        <Grid container spacing={1}>
          <Grid item xs={2} style={{"text-align":"center"}}>
            {this.state.timeBounds[0]}
            {/*
            <Input className={classes.input}  value={this.state.timeBounds[0]} onChange={this.onMinTimeChange.bind(this)}/>
            */}
          </Grid>

          <Grid item xs={8}>
            <Slider
              value={this.state.timeBounds}
              onChange={this.onTimeChange.bind(this)}
              valueLabelDisplay="auto"
              aria-labelledby="range-slider"
              min={this.state.timeMaxBounds[0]}
              max={this.state.timeMaxBounds[1]}
            />
          </Grid>
          <Grid item xs={2} style={{"text-align":"center"}}>
            {this.state.timeBounds[1]}
            {/*
            <Input className={classes.input}  value={this.state.timeBounds[1]} onChange={this.onMaxTimeChange.bind(this)}/>
            */}
          </Grid>
        </Grid>
        </div>
        <div>
          Geo Bounds
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
