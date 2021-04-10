import React, { Component } from 'react';
import './App.global.css';
import GainSlider from './Components/GainSlider/GainSlider';
const { ipcRenderer } = window.require('electron');

class App extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { callId: '' };
  }

  call = () => {
    ipcRenderer.send('call');
  };

  answer = () => {
    const callId = document.getElementById('callInput') as HTMLInputElement;
    console.info(callId.value);
    ipcRenderer.send('answer', callId.value);
  };

  startaudiostream = () => {
    ipcRenderer.send('start-audio-stream');
  };

  stopaudiostream = () => {
    ipcRenderer.send('stop-audio-stream');
  };

  onGainChangeHandler = (gainAmt: number) => {
    ipcRenderer.send('set-gain-amount', gainAmt);
  };

  render() {
    return (
      <div className="App">
        <GainSlider setGainAmount={this.onGainChangeHandler} />
        <h2 style={{ color: 'white' }}>Gain Amount</h2>
        <div className="buttons">
          <button onClick={() => this.startaudiostream()}>Start Stream</button>
          <button onClick={() => this.stopaudiostream()}>Stop Stream</button>
          <button onClick={() => this.call()}>Call</button>
          <button onClick={() => this.answer()}>Answer</button>
          <input id="callInput" />
        </div>
      </div>
    );
  }
}

export default App;
