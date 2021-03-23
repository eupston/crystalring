// package: audiostreamer
// file: audiostreamer.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class AudioSample extends jspb.Message { 
    getTimestamp(): string;
    setTimestamp(value: string): AudioSample;
    getData(): Uint8Array | string;
    getData_asU8(): Uint8Array;
    getData_asB64(): string;
    setData(value: Uint8Array | string): AudioSample;
    getGainamt(): number;
    setGainamt(value: number): AudioSample;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AudioSample.AsObject;
    static toObject(includeInstance: boolean, msg: AudioSample): AudioSample.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AudioSample, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AudioSample;
    static deserializeBinaryFromReader(message: AudioSample, reader: jspb.BinaryReader): AudioSample;
}

export namespace AudioSample {
    export type AsObject = {
        timestamp: string,
        data: Uint8Array | string,
        gainamt: number,
    }
}
