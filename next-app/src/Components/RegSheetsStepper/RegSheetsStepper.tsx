import React, { useState } from 'react';
import { Stepper, Step, StepLabel, StepContent, Button, makeStyles, Theme, Typography } from '@material-ui/core';
import PrepareRgtFilesStep from './PrepareRgtFilesStep';
import FinishedStep from './FinishedStep';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        width: '100%'
    },
    button: {
        marginTop: theme.spacing(1),
        marginRight: theme.spacing(2)
    },

    actionsContainer: {
        marginBottom: theme.spacing(2)
    }
}));

//////////////////
// Step Content //
//////////////////
function getSteps() {
    return ['Prepare .rgt files', 'Upload .pdf files', 'Check out'];
}

function getStepContent(step: number) {
    switch (step) {
        case 0:
            return <PrepareRgtFilesStep />
        case 1:
            return ('Select your pdf files here');
        case 2:
            return `Before you can start, just make sure that the following information is correct:...`;
        default:
            return `An error occurred, please try again later`;
    }
}


export default function RegSheetsStepper() {
    const classes = useStyles();
    const [activeStep, setActiveStep] = useState(0);
    const [skipped, setSkipped] = useState(new Set<number>());
    const steps = getSteps();

    const isStepOptional = (step: number) => {
        return step === 0;
    };

    const isStepSkipped = (step: number) => {
        return skipped.has(step);
    }

    const handleNext = () => {
        if (isStepSkipped(activeStep)) {
            const newSkipped = new Set(skipped.values());
            newSkipped.delete(activeStep);
            setSkipped(newSkipped);
        }
        setActiveStep(prevStep => prevStep + 1);
    };

    const handleBack = () => {
        setActiveStep(prevStep => prevStep - 1);
    };

    const handleSkip = () => {
        if (!isStepOptional(activeStep)) {
            throw new Error("You can't skip a step that is NOT optional.");
        }
        setActiveStep(prevStep => prevStep + 1);
        setSkipped(prevSkipped => {
            const newSkipped = new Set(prevSkipped.values());
            newSkipped.add(activeStep);
            return newSkipped;
        });
    };

    const handleReset = () => {
        setActiveStep(0);
    }

    return (
        <div className={classes.root}>
            <Stepper activeStep={activeStep} orientation="vertical">
                {
                    steps.map((label: string, i: number) => {
                        const stepProps: { completed?: boolean } = {};
                        const labelProps: { optional?: React.ReactNode } = {};
                        if (isStepOptional(i)) {
                            labelProps.optional = <Typography variant="caption">Optional</Typography>;
                        }
                        if (isStepSkipped(i)) {
                            stepProps.completed = false;
                        }

                        return (
                            <Step key={label} {...stepProps}>
                                <StepLabel {...labelProps}>{label}</StepLabel>
                                <StepContent>
                                    {getStepContent(i)}
                                    <div className={classes.actionsContainer}>
                                        <Button
                                            disabled={activeStep === 0}
                                            onClick={handleBack}
                                            className={classes.button}
                                        >
                                            Back
                                        </Button>
                                        {isStepOptional(i) && (
                                            <Button
                                                color="primary"
                                                onClick={handleSkip}
                                                className={classes.button}
                                            >
                                                Skip
                                            </Button>
                                        )}
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleNext}
                                            className={classes.button}
                                        >
                                            {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                                        </Button>
                                    </div>
                                </StepContent>
                            </Step>
                        );
                    })
                }
            </Stepper>
            <FinishedStep
                activeStep={activeStep}
                stepLength={steps.length}
                startButtonClick={handleReset} />
        </div>
    );
};
