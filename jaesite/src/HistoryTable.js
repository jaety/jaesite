import React, { Component } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css';
import 'ag-grid-community/dist/styles/ag-theme-balham.css';
import moment from 'moment';
import Grid from '@material-ui/core/Grid';
import { Map, TileLayer} from 'react-leaflet';

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

      lat: 47.3769,
      lng: 8.5417,
      zoom: 5,

      content: "Welcome to the histor-wiki"
    }
  }

  componentDidMount() {
    fetch('http://localhost:5000/people?limit=500')
      .then(response => response.json())
      .then(dataset => {
        var columnMap = {}
        dataset.columns.forEach((name,idx) => columnMap[name] = idx)
        dataset['map'] = columnMap
        this.setState(peopleToTable(dataset));
        console.log(this.state);
      })
      /*
    fetch('https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=Leo_II_(emperor)' +
          '&exlimit=1&exsentences=5&origin=*&format=json&explaintext=true')
      .then(response => response.json())
      .then(dataset => {
        console.log(dataset);
        const content = Object.values(dataset['query']['pages'])[0].extract
        this.setState({content:content})
      })
      */
  }

  onCellClicked(event) {
    const birth_point = event.data.birth_point.coordinates;
    const zoom = this.refs.map.leafletElement.getZoom();
    this.setState({lng: birth_point[0], lat: birth_point[1], zoom: zoom});
    console.log(event.data);
    const qid = event.data.person.split('/').slice(-1)[0]
    fetch("http://localhost:5000/wikipedia_summary/" + qid)
      .then(response => response.json())
      .then(dataset => {
        this.setState({content:dataset})
      })
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
