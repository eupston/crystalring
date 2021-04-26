import { initializeRemoteClient, initializeLocalClient } from './client';
import { AudioStreamClient } from '../../proto/audiostreamer_grpc_pb';
const wrtc = require('wrtc');
const { spawn } = require('child_process');
import { execPath } from '../packaging/binaries';
import { join as joinPath } from 'path';
import { connectMongoDB } from '../db/dbConnection';
const Call = require('../db/models/Calls');

//TODO figure out how to embed environment variables in prod
require('dotenv').config();

export class P2PConnection {
  private remoteClient: AudioStreamClient;
  private localClient: AudioStreamClient;
  private callId: string;
  private pc: RTCPeerConnection;

  constructor() {
    this.pc = this.initializePeerConnection();
  }

  initializeSignallingServer = async () => {
    await connectMongoDB();
  };

  initializePeerConnection = (): RTCPeerConnection => {
    const servers = {
      iceServers: [
        {
          urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
          ],
        },
      ],
      iceCandidatePoolSize: 10,
    };
    return new wrtc.RTCPeerConnection(servers);
  };

  // 2. Create an offer
  call = async () => {
    let serverStarted: boolean = false;
    //Need to add dummy stream to initiate ice candidate generation
    const localStream = await wrtc.getUserMedia({
      video: true,
      audio: false,
    });

    localStream.getTracks().forEach((track: MediaStreamTrack) => {
      this.pc.addTrack(track, localStream);
    });

    // Reference Mongodb collection for signaling
    const callDoc = await Call.create({ name: 'testcall' });
    this.callId = callDoc._id;
    console.info(this.callId);

    // Create watch stream on document with the call Id created
    const callDocChangeStream = Call.watch(
      [{ $match: { 'fullDocument._id': { $eq: this.callId } } }],
      { fullDocument: 'updateLookup' }
    );

    // const answerCandidatesChangeStream = Call.watch(
    //   [
    //     {
    //       $match: {
    //         $and: [
    //           { 'fullDocument._id': { $eq: this.callId } },
    //           {
    //             'updateDescription.updatedFields.answerCandidates': {
    //               $exists: true,
    //             },
    //           },
    //         ],
    //       },
    //     },
    //   ],
    //   { fullDocument: 'updateLookup' }
    // );

    // Get candidates for caller, save to db
    this.pc.onicecandidate = async (event: { candidate: RTCIceCandidate }) => {
      if (event.candidate) {
        const jsonCandidate = {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
          grpcServer: false,
          // @ts-ignore
          ip: event.candidate.address,
          port: event.candidate.port,
        };
        // @ts-ignore
        if (!serverStarted && !event.candidate.address.includes(':')) {
          serverStarted = this.initializeServer(event.candidate);
          this.localClient = initializeLocalClient(
            event.candidate.port.toString(),
            // @ts-ignore
            event.candidate.address.toString()
          );
          jsonCandidate['grpcServer'] = true;
        }
        const call = await Call.findById(this.callId);
        call.offerCandidates.push(jsonCandidate);
        call.save();
      }
    };

    // Create offer
    const offerDescription = await this.pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    await this.pc.setLocalDescription(offerDescription);
    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await callDoc.update({ offer: offer });

    // Listen for remote answer
    callDocChangeStream.on('change', (change: any) => {
      const data = change.fullDocument;
      if (!this.pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new wrtc.RTCSessionDescription(data.answer);
        this.pc.setRemoteDescription(answerDescription);
      }
    });

    // When answered, add candidate to peer connection
    callDocChangeStream.on('change', (change: any) => {
      const answerCandidates = change.fullDocument.answerCandidates;
      answerCandidates.forEach((answerCandidate: any) => {
        const candidate = new wrtc.RTCIceCandidate(answerCandidate);
        this.pc.addIceCandidate(candidate);
        if (answerCandidate.grpcServer) {
          //TODO ensure only listening to changes on answercandidates and only iternate through document if haven't already
          this.remoteClient = initializeRemoteClient(
            answerCandidate.port,
            answerCandidate.ip
          );
        }
      });
    });
  };

  // 3. Answer the call with the unique ID
  answer = async (callId: string) => {
    let serverStarted: boolean = false;

    const callDoc = await Call.findById(callId);
    this.callId = callId;

    this.pc.onicecandidate = async (event: { candidate: RTCIceCandidate }) => {
      if (event.candidate) {
        const jsonCandidate = {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
          grpcServer: false,
          // @ts-ignore
          ip: event.candidate.address,
          port: event.candidate.port,
        };
        // @ts-ignore
        if (!serverStarted && !event.candidate.address.includes(':')) {
          serverStarted = this.initializeServer(event.candidate);
          this.localClient = initializeLocalClient(
            event.candidate.port.toString(),
            // @ts-ignore
            event.candidate.address.toString()
          );
          jsonCandidate['grpcServer'] = true;
        }
        const call = await Call.findById(this.callId);
        call.answerCandidates.push(jsonCandidate);
        call.save();
      }
    };
    const offerDescription = callDoc.offer;

    await this.pc.setRemoteDescription(
      new wrtc.RTCSessionDescription(offerDescription)
    );
    const answerDescription = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer: answer });

    // const offerCandidatesChangeStream = Call.watch(
    //   [
    //     {
    //       $match: {
    //         $and: [
    //           { 'fullDocument._id': { $eq: this.callId } },
    //           {
    //             'updateDescription.updatedFields.offerCandidates': {
    //               $exists: true,
    //             },
    //           },
    //         ],
    //       },
    //     },
    //   ],
    //   { fullDocument: 'updateLookup' }
    // );

    const callDocChangeStream = Call.watch(
      [{ $match: { 'fullDocument._id': { $eq: this.callId } } }],
      { fullDocument: 'updateLookup' }
    );
    // When offers available, add candidate to peer connection
    //TODO figure out why not getting any change callbacks here
    callDocChangeStream.on('change', (change: any) => {
      const offerCandidates = change.fullDocument.answerCandidates;
      offerCandidates.forEach((offerCandidate: any) => {
        const candidate = new wrtc.RTCIceCandidate(offerCandidate);
        this.pc.addIceCandidate(candidate);
        if (offerCandidate.grpcServer) {
          this.remoteClient = initializeRemoteClient(
            offerCandidate.port,
            offerCandidate.ip
          );
        }
      });
    });
  };

  initializeServer = (candidate: RTCIceCandidate): boolean => {
    let serverStarted = false;
    const serverExec = `${joinPath(execPath, 'server')}`;
    const server = spawn(serverExec, [
      '-ip',
      // @ts-ignore
      candidate.address,
      '-port',
      candidate.port,
    ]);
    server.stdout.on('data', function (data: Buffer) {
      console.log(data.toString());
    });
    server.stderr.on('data', function (data: Buffer) {
      console.log(data.toString());
    });
    serverStarted = true;
    return serverStarted;
  };

  getLocalGRPCClient = (): AudioStreamClient => {
    return this.localClient;
  };

  getRemoteGRPCClient = (): AudioStreamClient => {
    return this.remoteClient;
  };

  getCallID = (): string => {
    return this.callId;
  };
}
