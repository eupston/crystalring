import { AudioStreamClient } from '../../proto/audiostreamer_grpc_pb';
import { credentials } from '@grpc/grpc-js';

export const initializeClient = (port: string, IP: string) => {
  const bindingAddress = `${IP}:${port}`;
  return new AudioStreamClient(bindingAddress, credentials.createInsecure());
};
