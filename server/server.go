package main

import (
	"log"
	"net"
	"flag"
	"fmt"

	pb "github.com/eupston/gRPC-Audio-Streaming-App/proto"
	"github.com/eupston/gRPC-Audio-Streaming-App/server/services/audiostreamer"
	"google.golang.org/grpc"
)

func main() {
  PORT := flag.String("port", "9000", "Port to listen on.")
  IP := flag.String("ip", "0.0.0.0", "IP to listen on")
  flag.Parse()
  fmt.Println("PORT:", *PORT)
  fmt.Println("IP:", *IP)

	lis, err := net.Listen(*IP, ":" + *PORT)
	if err != nil {
		log.Fatalf("Failed to listen on port " + *PORT)
	}

	s := audiostreamer.Server{}
	grpcServer := grpc.NewServer()

	pb.RegisterAudioStreamServer(grpcServer, &s)

	log.Printf("Listening on port " + *PORT)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve grpc services over port " + *PORT)
	}
}
