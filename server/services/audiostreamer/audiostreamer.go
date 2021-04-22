package audiostreamer

import (
  "encoding/binary"
  "fmt"
  pb "github.com/eupston/gRPC-Audio-Streaming-App/proto"
  "github.com/google/uuid"
  "io"
  "log"
  "sync"
)

type Client struct {
  stream pb.AudioStream_AudioStreamServer
  broadcaster bool
  listener bool
}

type Server struct {
	pb.UnimplementedAudioStreamServer
  Clients map[string]Client
  Mu sync.RWMutex
}

func (s *Server) addClient(uid string, srv pb.AudioStream_AudioStreamServer, broadcast bool, listen bool) {
  s.Mu.Lock()
  defer s.Mu.Unlock()
  s.Clients[uid] = Client {srv, broadcast, listen}
}

func (s *Server) removeClient(uid string) {
  s.Mu.Lock()
  defer s.Mu.Unlock()
  delete(s.Clients, uid)
}

func (s *Server) getClients() []Client {
  var cs []Client
  s.Mu.RLock()
  defer s.Mu.RUnlock()
  for _, c := range s.Clients {
    cs = append(cs, c)
  }
  return cs
}

func (s *Server) AudioStream(stream pb.AudioStream_AudioStreamServer) error {
  //Add client to Map for all connected clients
  uid := uuid.Must(uuid.NewRandom()).String()
  fmt.Println("new user: ", uid)
  in, _ := stream.Recv()
  s.addClient(uid, stream, in.Broadcast, in.Listen)
  defer s.removeClient(uid)

	for {
		in, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}

		if in.Broadcast {
      convertedSampleArr := make([]byte, len(in.Data))

      for i := 0; i < len(in.Data); i += 2 {
        //Assumes 16 bit sample
        numBytes := []byte{in.Data[i], in.Data[i+1]}
        sample := binary.LittleEndian.Uint16(numBytes)

        gainConvertedSample := float32(sample) * in.GainAmt
        //TODO find good dsp clipping formula to use float multiplier:
        // if(gainConvertedSample > 65535){
        //	gainConvertedSample = 65530
        // }
        sample = uint16(gainConvertedSample)
        convertedSampleArr[i] = byte(sample)
        convertedSampleArr[i+1] = byte(sample >> 8)
      }
      in.Data = convertedSampleArr
      for _, c := range s.getClients() {
        if c.listener{
          if err := c.stream.Send(in); err != nil {
            log.Printf("broadcast err: %v", err)
          }
        }
      }
    }
	}
}
