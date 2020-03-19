import { Button } from "@material-ui/core";
import Dropzone from '../Dropzone';

// First step - RGT
export enum FirstStepSwitch {
    Undefined,
    RgtUpload,
    JsonUpload
}

const stepContentRgtSwitch = (setFirstStepSwitch: any) => (
    <>
        <Button
            onClick={() => setFirstStepSwitch(FirstStepSwitch.RgtUpload)}
            color="secondary"
        >
            Upload .rgt files
                    </Button>
                    or
        <Button
            onClick={() => setFirstStepSwitch(FirstStepSwitch.JsonUpload)}
            color="secondary"
        >
            Upload .json mapping
            </Button>
    </>
);

type PrepareRgtFilesStepProps = {
    firstStepSwitch: FirstStepSwitch,
    setFirstStepSwitch: any
}

const PrepareRgtFilesStep = ({ firstStepSwitch, setFirstStepSwitch }: PrepareRgtFilesStepProps) => {
    let selection = null;
    if (firstStepSwitch !== FirstStepSwitch.Undefined) {
        selection = (firstStepSwitch === FirstStepSwitch.RgtUpload)
            ? <Dropzone fileFormat=".RGT" fileFormatText=".RGT" />
            : <Dropzone fileFormat="application/json" fileFormatText=".json" />
    }
    return (
        <>
            {stepContentRgtSwitch(setFirstStepSwitch)}
            {selection}
        </>
    );
};

export default PrepareRgtFilesStep;
