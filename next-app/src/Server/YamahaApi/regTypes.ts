export class ChunkNamesAscii {
    static readonly SPFF = [0x53, 0x70, 0x66, 0x46]; // SpfF
    static readonly RGST = [0x52, 0x47, 0x53, 0x54] // RGST
    static readonly BHD = [0x42, 0x48, 0x64]; // BHd
    static readonly GPM = [0x47, 0x50, 0x6D]; // GPm
    static readonly FEND = [0x46, 0x45, 0x6E, 0x64, 0x00, 0x00]; // FEnd..
}


export interface YamahaRegMemory {
    spff: SpfF,
    bhdSequence: ChunkGenericData, // BHd sequence chunk
    bhds: BHd[], // BHd-chunks corresponding to Registration Memory buttons on the Yamaha keyboard
    endOfFile: number[]
}

export interface ChunkHeader {
    header: number[], // 3 bytes
    type: number, // 1 byte
    dataLength: number[] // 2 bytes
}

export interface SpfF {
    // 4 bytes: SpfF (ASCII coded)
    header: number[],
    // 2 bytes: number of following data bytes in this chunk
    dataLength: number[],
    // 10 bytes: data that could be divided into smaller pieces including RGST (ASCII coded) for example
    headerData: number[]
    // 4 bytes: the number of bytes in the whole document (including SpfF-chunk)
    lengthAll: number[],
    // 2 bytes, not yet classifiable
    additionalData: number[]
}

export interface BHd extends ChunkHeader {
    gpms: GPm[]
}

export interface GPm extends ChunkHeader {
    data: number[]
}

export interface ChunkGenericData extends ChunkHeader {
    data: number[]
}