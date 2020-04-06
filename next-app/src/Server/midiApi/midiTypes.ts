export class MidiMessage {
    type: ChannelVoiceMessageType | SystemExclusiveMessageType | SystemRealTimeMessageType | SystemCommonMessageType | undefined; // TODO: extend later
    rawData?: number[];

    constructor(type: ChannelVoiceMessageType | SystemExclusiveMessageType | undefined) {
        this.type = type;
    }
}

////////////////////////////
// Channel Voice Messages //
////////////////////////////
// http://www.somascape.org/midi/tech/spec.html#chanmsgs
export class ChannelVoiceMessage extends MidiMessage {
    readonly channel: number;
    readonly dataBytes: number[];

    constructor(type: ChannelVoiceMessageType, channel: number, dataBytes: number[]) {
        super(type);
        this.channel = channel;
        this.dataBytes = dataBytes;
    }

    public changeChannel(channel: number): ChannelVoiceMessage {
        return Object.assign(this, { channel: channel }); // shallow copy
    }

    public getRawData(): number[] {
        return [this.getStatusByte(), ...this.dataBytes];
    }

    private getStatusByte(): number {
        return parseInt((this.type as ChannelVoiceMessageType).toString(16) + this.channel.toString(16), 16);
    }
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

export class NoteOffMessage extends ChannelVoiceMessage {
    note: number;
    releaseVelocity: number;

    constructor(channel: number, note: number, releaseVelocity: number) {
        super(ChannelVoiceMessageType.NOTE_OFF, channel, [note, releaseVelocity]);
        this.note = note;
        this.releaseVelocity = releaseVelocity;
    }
}

export class NoteOnMessage extends ChannelVoiceMessage {
    readonly note: number;
    readonly attackVelocity: number;

    constructor(channel: number, note: number, attackVelocity: number) {
        super(ChannelVoiceMessageType.NOTE_ON, channel, [note, attackVelocity]);
        this.note = note;
        this.attackVelocity = attackVelocity;
    }

    public changeNote(note: number): NoteOnMessage {
        return new NoteOnMessage(this.channel, note, this.attackVelocity);
    }
}

export class PolyAftertouchMessage extends ChannelVoiceMessage {
    note: number;
    pressureValue: number;

    constructor(channel: number, note: number, pressureValue: number) {
        super(ChannelVoiceMessageType.POLY_AFTERTOUCH, channel, [note, pressureValue]);
        this.note = note;
        this.pressureValue = pressureValue;
    }
}

export class ControlChangeMessage extends ChannelVoiceMessage {
    controllerNumber: number; // values 120-127 are reserved for Channel Mode messages
    controllerValue: number; // for switch controllers: 0=Off, 127=On

    constructor(channel: number, controllerNumber: number, controllerValue: number) {
        super(ChannelVoiceMessageType.CONTROL_CHANGE, channel, [controllerNumber, controllerValue]);
        this.controllerNumber = controllerNumber;
        this.controllerValue = controllerValue;
    }
}

export class ProgramChangeMessage extends ChannelVoiceMessage {
    programNumber: number;

    constructor(channel: number, programNumber: number) {
        super(ChannelVoiceMessageType.PROGRAM_CHANGE, channel, [programNumber]);
        this.programNumber = programNumber;
    }
}

export class ChannelAftertouchMessage extends ChannelVoiceMessage {
    pressureValue: number;

    constructor(channel: number, pressureValue: number) {
        super(ChannelVoiceMessageType.CHANNEL_AFTERTOUCH, channel, [pressureValue]);
        this.pressureValue = pressureValue;
    }
}

export class PitchBendDataMessage extends ChannelVoiceMessage {
    bendValueLsb: number;
    bendValueMsb: number;

    constructor(channel: number, bendValueLsb: number, bendValueMsb: number) {
        super(ChannelVoiceMessageType.PITCH_BEND, channel, [bendValueLsb, bendValueMsb]);
        this.bendValueLsb = bendValueLsb;
        this.bendValueMsb = bendValueMsb;
    }

    getNormalizedBendValue(): number {
        // 00 40 is the central (no bend) setting --> gets mapped to 0
        // 00 00 is the maximum downwards bend --> gets mapped to -16.384
        // 7F 7F is the maximum upwards bend --> gets mapped to +16.384
        return this.bendValueLsb + (this.bendValueMsb << 8) - 0x4000 //16.384 (no bend should equal 0)
    }
}

export class UndefinedChannelVoiceMessage extends ChannelVoiceMessage {

    constructor() {
        super(ChannelVoiceMessageType.UNDEFINED, -1, []);
    }
}


/////////////////////
// System Messages //
/////////////////////
export interface SystemMessage extends MidiMessage {
    rawData: number[];
}

// Sytem Exclusive Messages
export enum SystemExclusiveMessageType {
    START_OF_SYSTEM_EXCLUSIVE = 0xF0,
    END_OF_SYSTEM_EXCLUSIVE = 0xF7 // will never occur since midi library is handling this
}

export interface SystemExclusiveMessage extends SystemMessage {

}

// Sytem Common Messages
// intended for all channels in a system
export enum SystemCommonMessageType {
    MIDI_TIME_CODE_QUARTER_FRAME = 0xF1,
    SONG_POSITION_POINTER = 0xF2,
    SONG_SELECT = 0xF3,
    TUNE_REQUEST = 0xF6
}

export interface SystemCommonMessage extends SystemMessage {

}

// System Real Time Messages
// control the entire system (all devices, irrespective of channel setting) in real time
// used for synchronising clock-based devices (e.g. sequencers and rhythm units)
export enum SystemRealTimeMessageType {
    TIMING_CLOCK = 0xF8,
    START = 0xFA,
    CONTINUE = 0xFB,
    STOP = 0xFC,
    ACTIVE_SENSING = 0xFE,
    SYSTEM_RESET = 0xFF
}

export interface SystemRealTimeMessage extends SystemMessage {

}
