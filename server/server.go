package main

import (
  "flag"
  "fmt"
  pb "github.com/eupston/gRPC-Audio-Streaming-App/proto"
  "github.com/eupston/gRPC-Audio-Streaming-App/server/services/audiostreamer"
  "google.golang.org/grpc"
  "log"
  "net"
  "sync"
)

func main() {
  PORT := flag.String("port", "9000", "Port to listen on.")
  IP := flag.String("ip", "0.0.0.0", "IP to listen on")
  flag.Parse()
  bindingAddress := *IP + ":" + *PORT
	lis, err := net.Listen("tcp", bindingAddress)
	if err != nil {
		log.Fatalf("Failed to listen on address " + bindingAddress)
	}

	s := audiostreamer.Server{  Clients: make(map[string]audiostreamer.Client), Mu: sync.RWMutex{}}
	grpcServer := grpc.NewServer()

	pb.RegisterAudioStreamServer(grpcServer, &s)

	fmt.Println("Server Listening on Address: " + bindingAddress)
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve grpc services on " + bindingAddress)
	}
}
