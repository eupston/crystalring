import React, { Component } from 'react';
import './App.global.css';
import GainSlider from './Components/GainSlider/GainSlider';

const { ipcRenderer } = window.require('electron');

function startaudiostream() {
  ipcRenderer.invoke('startaudiostream', ['startaudiostream']);
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <GainSlider />
        <h2 style={{ color: 'white' }}>Gain Amount</h2>
        <button onClick={startaudiostream}>Start Stream</button>
      </div>
    );
  }
}

export default App;
