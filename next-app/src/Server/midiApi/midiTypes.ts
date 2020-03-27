export interface MidiMessage {
    type: ChannelVoiceMessageType | undefined; // extend later for System messages
}

////////////////////////////
// Channel Voice Messages //
////////////////////////////
// http://www.somascape.org/midi/tech/spec.html#chanmsgs
export interface ChannelVoiceMessage extends MidiMessage {
    type: ChannelVoiceMessageType;
    channel: number;
}

export enum ChannelVoiceMessageType {
    UNDEFINED = 0x00,
    NOTE_OFF = 0x08,
    NOTE_ON = 0x09,
    POLY_AFTERTOUCH = 0x0A,
    CONTROL_CHANGE = 0x0B,
    PROGRAM_CHANGE = 0x0C,
    CHANNEL_AFTERTOUCH = 0x0D,
    PITCH_BEND = 0x0E
}

export interface NoteOffMessage extends ChannelVoiceMessage {
    note: number;
    releaseVelociy: number;
}

export interface NoteOnMessage extends ChannelVoiceMessage {
    note: number;
    attackVelocity: number;
}

export interface PolyAftertouchMessage extends ChannelVoiceMessage {
    note: number;
    pressureValue: number;
}

export interface ControlChangeMessage extends ChannelVoiceMessage {
    controllerNumber: number; // values 120-127 are reserved for Channel Mode messages
    controllerValue: number; // for switch controllers: 0=Off, 127=On
}

export interface ProgramChangeMessage extends ChannelVoiceMessage {
    programNumber: number;
}

export interface ChannelAftertouchMessage extends ChannelVoiceMessage {
    pressureValue: number;
}

export interface PitchBendDataMessage extends ChannelVoiceMessage {
    // 00 40 is the central (no bend) setting --> gets mapped to 0
    // 00 00 is the maximum downwards bend --> gets mapped to -16.384
    // 7F 7F is the maximum upwards bend --> gets mapped to +16.384
    bendValue: number; // range: -16.384 to +16.384
}

/////////////////////
// System Messages //
/////////////////////
export interface SystemExclusiveMessage {

}

export interface SystemCommonMessage {

}

export interface SystemRealTimeMessage {
    
}
