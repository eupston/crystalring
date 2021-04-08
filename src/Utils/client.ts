import { AudioStreamClient } from '../../proto/audiostreamer_grpc_pb';
import { credentials } from '@grpc/grpc-js';

const port = 9000;

export const client = new AudioStreamClient(
  `localhost:${port}`,
  credentials.createInsecure()
);
