import { AudioStreamClient } from '../../proto/audiostreamer_grpc_pb';
//TODO fix ReferenceError: XMLHttpRequest is not defined in prod, probably cause by GRPC
import { credentials } from '@grpc/grpc-js';

export const initializeRemoteClient = (port: string, IP: string) => {
  const bindingAddress = `${IP}:${port}`;
  const client = new AudioStreamClient(
    bindingAddress,
    credentials.createInsecure()
  );
  console.info('Remote Client started on: ', bindingAddress);
  return client;
};

export const initializeLocalClient = (port: string, IP: string) => {
  const bindingAddress = `${IP}:${port}`;
  const client = new AudioStreamClient(
    bindingAddress,
    credentials.createInsecure()
  );
  console.info('Local Client started on: ', bindingAddress);
  return client;
};
