// package: audiostreamer
// file: audiostreamer.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from 'grpc';
import * as audiostreamer_pb from './audiostreamer_pb';

interface IAudioStreamService
  extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
  audioStream: IAudioStreamService_IAudioStream;
}

interface IAudioStreamService_IAudioStream
  extends grpc.MethodDefinition<
    audiostreamer_pb.AudioSample,
    audiostreamer_pb.AudioSample
  > {
  path: '/audiostreamer.AudioStream/AudioStream';
  requestStream: true;
  responseStream: true;
  requestSerialize: grpc.serialize<audiostreamer_pb.AudioSample>;
  requestDeserialize: grpc.deserialize<audiostreamer_pb.AudioSample>;
  responseSerialize: grpc.serialize<audiostreamer_pb.AudioSample>;
  responseDeserialize: grpc.deserialize<audiostreamer_pb.AudioSample>;
}

export const AudioStreamService: IAudioStreamService;

export interface IAudioStreamServer {
  audioStream: grpc.handleBidiStreamingCall<
    audiostreamer_pb.AudioSample,
    audiostreamer_pb.AudioSample
  >;
}

export interface IAudioStreamClient {
  audioStream(): grpc.ClientDuplexStream<
    audiostreamer_pb.AudioSample,
    audiostreamer_pb.AudioSample
  >;
  audioStream(
    options: Partial<grpc.CallOptions>
  ): grpc.ClientDuplexStream<
    audiostreamer_pb.AudioSample,
    audiostreamer_pb.AudioSample
  >;
  audioStream(
    metadata: grpc.Metadata,
    options?: Partial<grpc.CallOptions>
  ): grpc.ClientDuplexStream<
    audiostreamer_pb.AudioSample,
    audiostreamer_pb.AudioSample
  >;
}

export class AudioStreamClient
  extends grpc.Client
  implements IAudioStreamClient {
  constructor(
    address: string,
    credentials: grpc.ChannelCredentials,
    options?: object
  );
  public audioStream(
    options?: Partial<grpc.CallOptions>
  ): grpc.ClientDuplexStream<
    audiostreamer_pb.AudioSample,
    audiostreamer_pb.AudioSample
  >;
  public audioStream(
    metadata?: grpc.Metadata,
    options?: Partial<grpc.CallOptions>
  ): grpc.ClientDuplexStream<
    audiostreamer_pb.AudioSample,
    audiostreamer_pb.AudioSample
  >;
}
