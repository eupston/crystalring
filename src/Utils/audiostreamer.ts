import { AudioSample } from '../../proto/audiostreamer_pb';
import { ClientDuplexStream } from '@grpc/grpc-js';
import { AudioIO, IoStreamRead, SampleFormat16Bit } from 'naudiodon';
import Speaker from 'speaker';

import { client } from './client';

let micStream: IoStreamRead | null;
let outputStream: Speaker | null;
let clientStream: ClientDuplexStream<
  AudioSample,
  AudioSample
> = client.audioStream();

const reloadAudioIOStream = () => {
  console.info('micstream: ', micStream);
  console.info('outputStream: ', outputStream);
  if (micStream && outputStream) return;
  initializeAudioIOStream();
};

const initializeAudioIOStream = () => {
  micStream = AudioIO({
    inOptions: {
      channelCount: 1,
      sampleFormat: SampleFormat16Bit, //takes 2 bytes to store 1 sample
      sampleRate: 44100,
      deviceId: -1, // Use -1 or omit the deviceId to select the default device
      closeOnError: true, // Close the stream if an audio error is detected
    },
  });

  // Create the Speaker instance
  outputStream = new Speaker({
    channels: 1, // 2 channels
    bitDepth: 16, // 16-bit samples
    sampleRate: 44100, // 44,100 Hz sample rate
  });

  // When mic stream receives data send to server
  // Buffer size is 4096 samples per chan ( stereo interleaved ) or ~180 ms @ 44100
  // 16Bit UNSIGNED int is between 0 - 65535
  let sample = new AudioSample();
  micStream.on('data', (data: Uint8Array) => {
    sample.setData(data);
    sample.setGainamt(2.0);
    sample.setTimestamp(new Date().getMilliseconds().toString());
    clientStream.write(sample);
  });

  micStream.on('error', (err) => {
    //stop the stream if any errors
    console.error(err);
    stopAudioStream();
  });

  //When servers sends back data pipe to the speaker
  clientStream.on('data', (sample: AudioSample) => {
    let sampleData = sample.getData();
    if (sampleData.length > 0 && sample) {
      outputStream.write(sample.getData());
    }
  });
};

const startAudioStream = () => {
  if (!micStream && !outputStream) {
    reloadAudioIOStream();
    console.info('STARTING STREAM');
    micStream.start();
  }
};

const stopAudioStream = () => {
  console.info('STOPPING STREAM');
  if (micStream && outputStream) {
    micStream.quit();
    outputStream.close(true);
    micStream = null;
    outputStream = null;
  }
};

module.exports = {
  startAudioStream,
  stopAudioStream,
  initializeAudioIOStream,
  reloadAudioIOStream,
};
