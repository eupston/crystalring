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
const pc = new RTCPeerConnection(servers);

// 2. Create an offer
const call = async () => {
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callId = callDoc.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = (event: {
    candidate: { toJSON: () => firebase.firestore.DocumentData };
  }) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
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
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });
};

// 3. Answer the call with the unique ID
const answer = async () => {
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');
  pc.onicecandidate = (event: {
    candidate: { toJSON: () => firebase.firestore.DocumentData };
  }) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
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
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};

const main = async () => {
  await call();
  await answer();
};

main();
