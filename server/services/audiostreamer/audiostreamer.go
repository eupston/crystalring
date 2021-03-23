package audiostreamer

import (
	"encoding/binary"
	pb "github.com/eupston/gRPC-Audio-Streaming-App/proto"
	"io"
)

type Server struct {
	pb.UnimplementedAudioStreamServer
}

func (s *Server) AudioStream(stream pb.AudioStream_AudioStreamServer) error {
	for {
		in, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}

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
		if err := stream.Send(in); err != nil {
			return err
		}
	}
}
