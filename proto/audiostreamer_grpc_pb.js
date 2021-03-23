// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var audiostreamer_pb = require('./audiostreamer_pb.js');

function serialize_audiostreamer_AudioSample(arg) {
  if (!(arg instanceof audiostreamer_pb.AudioSample)) {
    throw new Error('Expected argument of type audiostreamer.AudioSample');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_audiostreamer_AudioSample(buffer_arg) {
  return audiostreamer_pb.AudioSample.deserializeBinary(new Uint8Array(buffer_arg));
}


var AudioStreamService = exports.AudioStreamService = {
  audioStream: {
    path: '/audiostreamer.AudioStream/AudioStream',
    requestStream: true,
    responseStream: true,
    requestType: audiostreamer_pb.AudioSample,
    responseType: audiostreamer_pb.AudioSample,
    requestSerialize: serialize_audiostreamer_AudioSample,
    requestDeserialize: deserialize_audiostreamer_AudioSample,
    responseSerialize: serialize_audiostreamer_AudioSample,
    responseDeserialize: deserialize_audiostreamer_AudioSample,
  },
};

exports.AudioStreamClient = grpc.makeGenericClientConstructor(AudioStreamService);
