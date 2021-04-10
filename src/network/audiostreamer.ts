import { AudioSample } from '../../proto/audiostreamer_pb';
import { AudioStreamClient } from '../../proto/audiostreamer_grpc_pb';
import { ClientDuplexStream } from '@grpc/grpc-js';
import { AudioIO, IoStreamRead, SampleFormat16Bit } from 'naudiodon';
import Speaker from 'speaker';

export class Audiostreamer {
  private client: AudioStreamClient;
  private micStream: IoStreamRead;
  private outputStream: Speaker;
  private clientStream: ClientDuplexStream<AudioSample, AudioSample>;
  private gainAmt: number;

  constructor(gRPCClient: AudioStreamClient) {
    this.client = gRPCClient;
    this.gainAmt = 1.0;
  }

  reloadAudioIOStream = () => {
    if (this.micStream && this.outputStream) return;
    this.initializeAudioIOStream();
  };

  initializeAudioIOStream = () => {
    this.clientStream = this.client.audioStream();
    this.micStream = AudioIO({
      inOptions: {
        channelCount: 1,
        sampleFormat: SampleFormat16Bit, //takes 2 bytes to store 1 sample
        sampleRate: 44100,
        deviceId: -1, // Use -1 or omit the deviceId to select the default device
        closeOnError: true, // Close the stream if an audio error is detected
      },
    });

    // Create the Speaker instance
    this.outputStream = new Speaker({
      channels: 1, // 2 channels
      bitDepth: 16, // 16-bit samples
      sampleRate: 44100, // 44,100 Hz sample rate
    });

    // When mic stream receives data send to server
    // Buffer size is 4096 samples per chan ( stereo interleaved ) or ~180 ms @ 44100
    // 16Bit UNSIGNED int is between 0 - 65535
    let sample = new AudioSample();
    this.micStream.on('data', (data: Uint8Array) => {
      sample.setData(data);
      sample.setGainamt(this.gainAmt);
      sample.setTimestamp(new Date().getMilliseconds().toString());
      this.clientStream.write(sample);
    });

    this.micStream.on('error', (err) => {
      //stop the stream if any errors
      console.error(err);
      this.stopAudioStream();
    });

    //TODO handle errors when server not reachable
    //When servers sends back data pipe to the speaker
    this.clientStream.on('data', (sample: AudioSample) => {
      let sampleData = sample.getData();
      if (sampleData.length > 0 && sample) {
        this.outputStream.write(sample.getData());
      }
    });
  };

  startAudioStream = () => {
    if (!this.micStream && !this.outputStream) {
      this.reloadAudioIOStream();
      console.info('STARTING STREAM');
      this.micStream.start();
    }
  };

  stopAudioStream = () => {
    console.info('STOPPING STREAM');
    if (this.micStream && this.outputStream) {
      this.micStream.quit();
      this.outputStream.close(true);
      this.micStream = null;
      this.outputStream = null;
    }
  };

  setGainAmount = (gainamount: number) => {
    this.gainAmt = gainamount;
  };
}