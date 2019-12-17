import React from 'react';
// import logo from './logo.svg';
import './App.css';
import HistoryMap from './HistoryMap';
import HistoryTable from './HistoryTable';

import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';

function TabContainer(props) {
  return (
    <Typography component="div" style={{ padding: 6 * 3 }}>
      {props.children}
    </Typography>
  );
}

TabContainer.propTypes = {
  children: PropTypes.node.isRequired,
};

function App() {
  const [tabIndex, setTabIndex] = React.useState(2);

  return (
    <div>
      <AppBar position="static">
        <Tabs value={tabIndex} onChange={ (event, newValue) => setTabIndex(newValue) }>
          <Tab label="Intro" />
          <Tab label="Map" />
          <Tab label="Table" />
        </Tabs>
      </AppBar>

      {tabIndex === 0 &&
        <TabContainer>This is the Introduction</TabContainer>
      }

      {tabIndex === 1 &&
        <TabContainer>
          <div className="leaflet-container">
            <HistoryMap></HistoryMap>
          </div>
        </TabContainer>
      }

      {tabIndex === 2 &&
        <TabContainer>
          <HistoryTable></HistoryTable>
        </TabContainer>
      }
    </div>
  );
}

export default App;
