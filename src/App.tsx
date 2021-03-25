import React, { Component } from 'react';
import './App.global.css';
import GainSlider from './Components/GainSlider/GainSlider';

const { ipcRenderer } = window.require('electron');

function testIPC() {
  ipcRenderer.invoke('perform-action', ['Test from renderer']);
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <GainSlider />
        {testIPC()}
        <h2 style={{ color: 'white' }}>Gain Amount</h2>
        <button onClick={startAudioStream}>Start Stream</button>
      </div>
    );
  }
}

export default App;
