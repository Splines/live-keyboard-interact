// see documentation: https://github.com/justinlatimer/node-midi
const midi = require('midi');

export class Output {
    output = new midi.output();

    constructor(name: string) {
        let found = false;
        for (let i = 0; i < this.output.getPortCount(); i++) {
            // Get the name of a specified output port and compare with name that the user entered
            if (name === this.output.getPortName(i)) {
                found = true;
                // Open the output port
                this.output.openPort(i);
            }
        }
        if (!found) {
            throw new Error('No MIDI output found with name: ' + name);
        }
    }

    send(message: number[]) {
        this.output.sendMessage(message);
    }

    close() {
        this.output.closePort();
    }

}

export function getOutputNames(): string[] {
    const output = new midi.output();
    const outputs: string[] = [];
    for (let i = 0; i < output.getPortCount(); i++) {
        outputs.push(output.getPortName(i));
    }
    output.closePort(); // no need to close ports since none were opened
    return outputs;
}
