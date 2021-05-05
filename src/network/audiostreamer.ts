import { AudioSample } from '../../proto/audiostreamer_pb';
import { AudioStreamClient } from '../../proto/audiostreamer_grpc_pb';
import { ClientDuplexStream } from '@grpc/grpc-js';
import { AudioIO, IoStreamRead, SampleFormat16Bit } from 'naudiodon';
import Speaker from 'speaker';
import { ChildProcessWithoutNullStreams } from 'child_process';

export class Audiostreamer {
  private localClient: AudioStreamClient;
  private remoteClient: AudioStreamClient;
  private localServer: ChildProcessWithoutNullStreams;
  private micStream: IoStreamRead;
  private outputStream: Speaker;
  private localClientStream: ClientDuplexStream<AudioSample, AudioSample>;
  private remoteClientStream: ClientDuplexStream<AudioSample, AudioSample>;
  private gainAmt: number;
  private speakerMuted: boolean;

  constructor(
    localClient: AudioStreamClient,
    remoteClient: AudioStreamClient,
    localServer: ChildProcessWithoutNullStreams
  ) {
    this.localClient = localClient;
    this.remoteClient = remoteClient;
    this.localServer = localServer;
    this.gainAmt = 1.0;
    this.speakerMuted = false;
  }

  reloadAudioIOStream = () => {
    if (this.micStream && this.outputStream) return;
    this.initializeAudioIOStream();
  };

  startMicStream = () => {
    this.micStream = AudioIO({
      inOptions: {
        channelCount: 1,
        sampleFormat: SampleFormat16Bit, //takes 2 bytes to store 1 sample
        sampleRate: 44100,
        deviceId: -1, // Use -1 or omit the deviceId to select the default device
        closeOnError: true, // Close the stream if an audio error is detected
      },
    });
    // When mic stream receives data send to server
    // Buffer size is 4096 samples per chan ( stereo interleaved ) or ~180 ms @ 44100
    // 16Bit UNSIGNED int is between 0 - 65535
    let sample = new AudioSample();
    this.micStream.on('data', (data: Uint8Array) => {
      //Create Writing stream to local server
      sample.setData(data);
      sample.setGainamt(this.gainAmt);
      sample.setBroadcast(true);
      sample.setListen(false);
      sample.setTimestamp(new Date().getMilliseconds().toString());
      this.localClientStream.write(sample);
      //Create listening stream to remote server
      sample.setBroadcast(false);
      sample.setListen(true);
      //Set some dummy audio samples to initialize stream
      sample.setData(new Uint8Array(0));
      this.remoteClientStream.write(sample);
    });

    this.micStream.on('error', (err) => {
      //try to restart mic stream if any errors
      //TODO ensure this doesn't hang
      console.error('micStream error: ', err);
      this.startMicStream();
    });
  };

  initializeAudioIOStream = () => {
    this.localClientStream = this.localClient.audioStream();
    this.remoteClientStream = this.remoteClient.audioStream();

    this.startMicStream();

    // Create the Speaker instance
    this.outputStream = new Speaker({
      channels: 1, // 2 channels
      bitDepth: 16, // 16-bit samples
      sampleRate: 44100, // 44,100 Hz sample rate
    });

    //When servers sends back data pipe to the speaker
    this.remoteClientStream.on('data', (sample: AudioSample) => {
      let sampleData = sample.getData();
      if (sampleData.length > 0 && sample) {
        if (!this.speakerMuted) {
          this.outputStream.write(sampleData);
        }
      }
    });

    this.remoteClientStream.on('error', (e: Error) => {
      // An error has occurred and the stream has been closed.
      console.info('remoteClientStream ', e.message);
      if (e.message.includes('Connection dropped')) {
        this.stopAudioStream();
      }
      //TODO investigate error: 1 CANCELLED: Cancelled on client on app that initiates dropping call
      else if (e.message.includes('Cancelled on client')) {
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
      this.localClientStream.cancel();
      this.remoteClientStream.cancel();
      this.localServer.kill();
      this.micStream = null;
      this.outputStream = null;
    }
  };

  setGainAmount = (gainamount: number) => {
    this.gainAmt = gainamount;
  };

  muteSpeaker = (mute: boolean) => {
    this.speakerMuted = mute;
  };
}
