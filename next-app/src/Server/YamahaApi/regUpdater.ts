import { YamahaRegMemory, BHd, GPm } from "./regTypes";
import { concatJsonNumberValues, decToHexNumbers } from "./utils/nodeUtils";


/**
 * Updates all length fields in the Registration Memory file,
 * including the SpfF-chunk, the eight Registration BHd-chunks and lots of GPm-chunks.
 * @param regMemory the Yamaha Registration Memory to update the length values
 */
export function updateAllLengthFields(regMemory: YamahaRegMemory): YamahaRegMemory {
    const updatedSpffReg: YamahaRegMemory = updateSpffLengthAll(regMemory);
    return updateBhdAndGpmLengths(updatedSpffReg);
}

/**
 * Updates the value in SpfF-chunk that indicates how many bytes this whole file contains.
 * @param regMemory the Yamaha Registration Memory to update the length value
 */
function updateSpffLengthAll(regMemory: YamahaRegMemory): YamahaRegMemory {
    // --- Count number of bytes in file
    const lengthAll: number = concatJsonNumberValues(JSON.stringify(regMemory)).length;
    // --- Construct array of numbers indicating the length of the whole file
    // when put together as a big hex value
    const lengthAllNumbers: number[] = decToHexNumbers(lengthAll, regMemory.spff.lengthAll.length);
    // --- Update and return SpfF-chunk
    regMemory.spff.lengthAll = lengthAllNumbers;
    return regMemory;
}

/**
 * Updates the length values in every BHd-chunk indicating how many bytes will follow.
 * @param regMemory the Yamaha Registration Memory to update the BHd- & GPm-chunks length values
 */
function updateBhdAndGpmLengths(regMemory: YamahaRegMemory): YamahaRegMemory {
    regMemory.bhds.forEach((bhd: BHd, iBhd: number) => {
        let bhdDataLength = 0;
        bhd.gpms.forEach((gpm: GPm, iGpm: number) => {
            // --- Update GPm-chunk length
            regMemory.bhds[iBhd].gpms[iGpm].dataLength = decToHexNumbers(gpm.data.length, 2);
            bhdDataLength += gpm.data.length;
            bhdDataLength += 6; // for header data in GPm-chunk
        });
        // --- Update BHd-chunk length
        regMemory.bhds[iBhd].dataLength = decToHexNumbers(bhdDataLength, 2);
    });
    return regMemory;
}