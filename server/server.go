package main

import (
	"log"
	"net"

	pb "github.com/eupston/gRPC-Audio-Streaming-App/proto"
	"github.com/eupston/gRPC-Audio-Streaming-App/server/services/audiostreamer"
	"google.golang.org/grpc"
)

func main() {
	PORT := "9000"
	lis, err := net.Listen("tcp", ":"+PORT)
	if err != nil {
		log.Fatalf("Failed to listen on port " + PORT)
	}

	s := audiostreamer.Server{}
	grpcServer := grpc.NewServer()

	pb.RegisterAudioStreamServer(grpcServer, &s)

	log.Printf("Listening on port " + PORT)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve grpc services over port " + PORT)
	}
}
