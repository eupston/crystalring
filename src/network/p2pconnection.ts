import firebase from 'firebase/app';
import 'firebase/firestore';
import { initializeRemoteClient, initializeLocalClient } from './client';
import { AudioStreamClient } from '../../proto/audiostreamer_grpc_pb';
const wrtc = require('wrtc');
const { spawn } = require('child_process');
require('dotenv').config();

export class P2PConnection {
  private signalServer: firebase.firestore.Firestore;
  private remoteClient: AudioStreamClient;
  private localClient: AudioStreamClient;
  private callId: string;
  private pc: RTCPeerConnection;

  constructor() {
    this.signalServer = this.initializeSignallingServer();
    this.pc = this.initializePeerConnection();
  }

  initializeSignallingServer = (): firebase.firestore.Firestore => {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGEBUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    };
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    return firebase.firestore();
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

    // Reference Firestore collections for signaling
    const callDoc = this.signalServer.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    this.callId = callDoc.id;
    console.info(this.callId);

    // Get candidates for caller, save to db
    this.pc.onicecandidate = (event: { candidate: RTCIceCandidate }) => {
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
        offerCandidates.add(jsonCandidate);
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

    await callDoc.set({ offer });
    // Listen for remote answer
    callDoc.onSnapshot((snapshot: any) => {
      const data = snapshot.data();
      if (!this.pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new wrtc.RTCSessionDescription(data.answer);
        this.pc.setRemoteDescription(answerDescription);
      }
    });

    // When answered, add candidate to peer connection
    answerCandidates.onSnapshot((snapshot: any) => {
      snapshot
        .docChanges()
        .forEach((change: firebase.firestore.DocumentData) => {
          if (change.type === 'added') {
            let data = change.doc.data();
            const candidate = new wrtc.RTCIceCandidate(data);
            this.pc.addIceCandidate(candidate);
            if (data.grpcServer) {
              this.remoteClient = initializeRemoteClient(data.port, data.ip);
            }
          }
        });
    });
  };

  // 3. Answer the call with the unique ID
  answer = async (callId: string) => {
    let serverStarted: boolean = false;

    const callDoc = this.signalServer.collection('calls').doc(callId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');

    this.pc.onicecandidate = (event: { candidate: RTCIceCandidate }) => {
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
        answerCandidates.add(jsonCandidate);
      }
    };
    const callData = (await callDoc.get()).data();
    const offerDescription = callData.offer;

    await this.pc.setRemoteDescription(
      new wrtc.RTCSessionDescription(offerDescription)
    );
    const answerDescription = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot: any) => {
      snapshot
        .docChanges()
        .forEach((change: firebase.firestore.DocumentData) => {
          if (change.type === 'added') {
            let data = change.doc.data();
            this.pc.addIceCandidate(new wrtc.RTCIceCandidate(data));
            if (data.grpcServer) {
              this.remoteClient = initializeRemoteClient(data.port, data.ip);
            }
          }
        });
    });
  };

  initializeServer = (candidate: RTCIceCandidate): boolean => {
    let serverStarted = false;
    const server = spawn('server/server', [
      '-ip',
      // @ts-ignore
      candidate.address,
      '-port',
      candidate.port,
    ]);
    server.stdout.on('data', function (data: Buffer) {
      console.log('Server Started: ', data.toString());
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
