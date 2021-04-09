import firebase from 'firebase/app';
import 'firebase/firestore';
const wrtc = require('wrtc');

const firebaseConfig = {
  apiKey: 'AIzaSyAwl5uC6W5C9HSyQuOpxZVXAnFRlZM94SI',
  authDomain: 'grpc-audio-streaming-app.firebaseapp.com',
  databaseURL: 'https://grpc-audio-streaming-app-default-rtdb.firebaseio.com',
  projectId: 'grpc-audio-streaming-app',
  storageBucket: 'grpc-audio-streaming-app.appspot.com',
  messagingSenderId: '115343022366',
  appId: '1:115343022366:web:8c2e9ad45f84615e02d10f',
  measurementId: 'G-GBCQR6K6WN',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

let callId: string = null;
const pc = new wrtc.RTCPeerConnection(servers);

// 2. Create an offer
export const call = async () => {
  //Need to add dummy stream to initiate ice candidate generation
  const localStream = await wrtc.getUserMedia({
    video: true,
    audio: false,
  });

  localStream.getTracks().forEach((track: MediaStreamTrack) => {
    pc.addTrack(track, localStream);
  });

  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callId = callDoc.id;
  console.info(callId);

  // Get candidates for caller, save to db
  pc.onicecandidate = (event: { candidate: RTCIceCandidate }) => {
    if (event.candidate) {
      const jsonCandidate = {
        candidate: event.candidate.candidate,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sdpMid: event.candidate.sdpMid,
      };
      offerCandidates.add(jsonCandidate);
      //TODO Initialize GRPC GO Server on first candidate with cmd args
      // @ts-ignore
      console.info(event.candidate.address);
      console.info(event.candidate.port);
    }
  };

  // Create offer
  const offerDescription = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false,
  });
  await pc.setLocalDescription(offerDescription);
  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });
  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new wrtc.RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new wrtc.RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });
};

// 3. Answer the call with the unique ID
export const answer = async (callId: string) => {
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  pc.onicecandidate = (event: { candidate: RTCIceCandidate }) => {
    if (event.candidate) {
      const jsonCandidate = {
        candidate: event.candidate.candidate,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sdpMid: event.candidate.sdpMid,
      };
      answerCandidates.add(jsonCandidate);
    }
  };
  const callData = (await callDoc.get()).data();
  const offerDescription = callData.offer;

  await pc.setRemoteDescription(
    new wrtc.RTCSessionDescription(offerDescription)
  );
  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new wrtc.RTCIceCandidate(data));
      }
    });
  });
};
