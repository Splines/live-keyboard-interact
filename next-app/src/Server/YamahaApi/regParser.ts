import { BHd, ChunkGenericData, ChunkNamesAscii, GPm, SpfF, YamahaRegMemory } from './regTypes';
import { areArraysEqual, hexArrayToDec, sliceByLength } from './utils/nodeUtils';
import * as Result from './utils/result';


class InvalidRegFileError extends Error {
    constructor(message?: string) {
        if (message) {
            super(message); // breaks prototype chain, because it ignores this and creates a new Error
        } else {
            super('The provided .RGT-file is corrupted. Please make sure that it originates from a Yamaha keyboard.')
        }
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        // this.name = InvalidRegFileError.name; // make sure stack traces display correctly
    }
}

export function parseReg(file: Uint8Array): Result.Type<YamahaRegMemory> {
    const data: number[] = Array.from(file);

    const spff: Result.Type<SpfF> = validateAndParseSpffChunk(data);
    if (Result.isError(spff)) {
        return spff;
    }

    // const numberArrayHeadless: number[] = numberArray.slice(22);
    const bhdsGeneric: Result.Type<ChunkGenericData[]> = validateAndParseBhdChunks(data.slice(22));
    if (Result.isError(bhdsGeneric)) {
        return bhdsGeneric;
    }

    const bhdsWithoutSequence: Result.Type<BHd[]> = validateAndParseGpmChunks(bhdsGeneric.slice(1, 9))
    if (Result.isError(bhdsWithoutSequence)) {
        return bhdsWithoutSequence;
    }

    if (!areArraysEqual(data.slice(data.length - ChunkNamesAscii.FEND.length), ChunkNamesAscii.FEND)) {
        return new InvalidRegFileError("File doesn't end with FEnd");
    }

    return {
        spff: spff,
        bhdSequence: bhdsGeneric[0],
        bhds: bhdsWithoutSequence,
        endOfFile: ChunkNamesAscii.FEND
    };
}

/**
 * 
 * @param data the data of the whole file as an array of numbers
 */
function validateAndParseSpffChunk(data: number[]): Result.Type<SpfF> {
    // --- SpfF-Chunk
    if (data.length < 22) { // TODO: make a smallest file examle
        return new InvalidRegFileError("The file is too small to be considered a .RGT-file");
    }
    if (!areArraysEqual(data.slice(0, 4), ChunkNamesAscii.SPFF)) {
        return new InvalidRegFileError("The file doesn't start with a SpfF-chunk");
    }

    if (!areArraysEqual(data.slice(4, 6), [0x00, 0x10])) {
        return new InvalidRegFileError("Number of following data bytes in SpfF-chunk is not 10");
    }

    if (!areArraysEqual(data.slice(8, 12), ChunkNamesAscii.RGST)) {
        return new InvalidRegFileError("Missing 'RGST' in SpfF-chunk");
    }

    const lengthAll: number = hexArrayToDec(data.slice(16, 20));
    if (data.length !== lengthAll) {
        return new InvalidRegFileError("The actual file size does not correspond to the file size indicated in the SpfF-chunk");
    }

    return {
        header: ChunkNamesAscii.SPFF,
        dataLength: data.slice(4, 6),
        headerData: data.slice(6, 16),
        lengthAll: data.slice(16, 20),
        additionalData: data.slice(20, 22)
    }
}

/**
 * 
 * @param data the data of the file without the SpfF-chunk
 */
function validateAndParseBhdChunks(data: number[]): Result.Type<ChunkGenericData[]> {
    const indexesBhd: number[] = findChunkIndexes(data, ChunkNamesAscii.BHD, (data: number[], nextEndChunkIndex: number) => {
        const nextEndChunkHeader: number[] = sliceByLength(data, nextEndChunkIndex, ChunkNamesAscii.FEND.length)
        return areArraysEqual(nextEndChunkHeader, ChunkNamesAscii.FEND);
    });

    if (indexesBhd.length !== 9) { // same as: indexesBhd[0] === -1
        // return new InvalidRegFileError("Invalid amount of BHd-chunks. This is probably because the last BHd-chunk " +
        //     "or the 'FEnd  ' is damaged.");
        return new InvalidRegFileError("Invalid amount of BHd-chunks, maybe one BHd-chunk is corrupted and indicated a wrong length");
    }

    return indexesBhd.map((bhdIndex: number, i: number) => {
        // if this is the last BHd-chunk: last index is whole length MINUS 6
        // because we don't want to include 'FEnd  ' in the last BHd-chunk
        const nextBhdIndex: number = indexesBhd[i + 1]
            ? indexesBhd[i + 1] : (data.length - 6)
        return {
            header: ChunkNamesAscii.BHD,
            type: data[bhdIndex + ChunkNamesAscii.BHD.length],
            dataLength: data.slice(bhdIndex + ChunkNamesAscii.BHD.length + 1, bhdIndex + ChunkNamesAscii.BHD.length + 1 + 2),
            data: data.slice(bhdIndex + ChunkNamesAscii.BHD.length + 1 + 2, nextBhdIndex)
        }
    });
}

function validateAndParseGpmChunks(bhdsGeneric: ChunkGenericData[]): Result.Type<BHd[]> {
    const bhds: BHd[] = [];
    for (let i = 0; i < bhdsGeneric.length; i++) {
        const bhdTmp: ChunkGenericData = bhdsGeneric[i];

        const indexesGpm: number[] = findChunkIndexes(bhdTmp.data, ChunkNamesAscii.GPM, (data: number[], nextEndChunkIndex: number) => {
            return nextEndChunkIndex === data.length;
        });

        if (indexesGpm[0] === -1) {
            return new InvalidRegFileError("A GPm-chunk is corrupted, e. g. the length indicated does not match the real length.");
        }

        const gpms: GPm[] = indexesGpm.map((gpmIndex: number, i: number) => {
            const nextGpmIndex: number = indexesGpm[i + 1] ? indexesGpm[i + 1] : bhdTmp.data.length
            return {
                header: ChunkNamesAscii.GPM,
                type: bhdTmp.data[gpmIndex + ChunkNamesAscii.GPM.length],
                dataLength: bhdTmp.data.slice(gpmIndex + ChunkNamesAscii.GPM.length + 1, gpmIndex + ChunkNamesAscii.GPM.length + 1 + 2),
                data: bhdTmp.data.slice(gpmIndex + ChunkNamesAscii.GPM.length + 1 + 2, nextGpmIndex)
            }
        });

        bhds.push({
            header: bhdTmp.header,
            type: bhdTmp.type,
            dataLength: bhdTmp.dataLength,
            gpms: gpms
        });
    }
    return bhds;
}

/**
 * Note that it is assumed that the first index is at position 0!
 * @param data th data to search the chunk
 * @param searchChunk the chunk to search for
 * @param nextEndChunkHeader the array that occurs instead of a new searchChunk when dealing with the last chunk
 */
export function findChunkIndexes(data: number[], searchChunk: number[], isEndChunk: (data: number[], nextEndCHunkIndex: number) => boolean): number[] {
    if (!data || !searchChunk) {
        return [];
    }

    const lengthBytes = 2; // how many bytes are reserved to indicate the chunk length

    // it is assumed that first index of chunk is at position 0
    if (!areArraysEqual(data.slice(0, searchChunk.length), searchChunk)) {
        return [];
    }

    // Get other chunk indexes by taking into consideration the length indicated in every chunk
    let indexes: number[] = [];
    let chunkIndex = 0;
    while (true) {
        const chunkLength: number = hexArrayToDec(sliceByLength(data, chunkIndex + searchChunk.length + 1, lengthBytes));

        const nextChunkHeaderIndex: number = chunkIndex + searchChunk.length + 1 + lengthBytes + chunkLength;
        const nextChunkHeader: number[] =
            sliceByLength(data, nextChunkHeaderIndex, searchChunk.length);

        if (areArraysEqual(nextChunkHeader, searchChunk)) {
            indexes.push(chunkIndex);
            chunkIndex = nextChunkHeaderIndex;
        } else {
            if (isEndChunk(data, nextChunkHeaderIndex)) {
                indexes.push(chunkIndex);
            } else {
                indexes = [-1];
            }
            break;
        }
    }

    return indexes;
}
