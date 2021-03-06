import React, { Component } from 'react';
import './App.global.css';
import GainSlider from './Components/GainSlider/GainSlider';
import { IpcRendererEvent } from 'electron';
const { ipcRenderer } = window.require('electron');

class App extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { callId: '' };
  }

  call = () => {
    ipcRenderer.send('call');
    ipcRenderer.on('call-id', (_event: IpcRendererEvent, callId: string) => {
      const callIdElem = document.getElementById('callId') as HTMLInputElement;
      callIdElem.value = callId;
    });
  };

  answer = () => {
    const callId = document.getElementById('callInput') as HTMLInputElement;
    ipcRenderer.send('answer', callId.value);
  };

  startaudiostream = () => {
    ipcRenderer.send('start-audio-stream');
  };

  stopaudiostream = () => {
    ipcRenderer.send('stop-audio-stream');
  };

  mutespeaker = (mute: boolean) => {
    ipcRenderer.send('mute-speaker', mute);
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
          <button onClick={() => this.mutespeaker(true)}>Mute Speaker</button>
          <button onClick={() => this.call()}>Call</button>
          <input id="callId" />
          <button onClick={() => this.answer()}>Answer</button>
          <input id="callInput" />
        </div>
      </div>
    );
  }
}

export default App;
