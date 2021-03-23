import React from 'react';
import './App.global.css';
import GainSlider from "./Components/GainSlider/GainSlider"

const { ipcRenderer } = window.require('electron');

function testIPC() {
  ipcRenderer.invoke('perform-action', ['Test from renderer']);
}
export default function App() {
  return (
    <div className="App">
      <GainSlider/>
      {testIPC()}
      <h2 style={{color:"white"}}>Gain Amount</h2>
    </div>
  );
}
