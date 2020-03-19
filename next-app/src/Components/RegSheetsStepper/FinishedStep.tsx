import React, { useState } from 'react';
import { Paper, Typography, Button, makeStyles, Theme, Divider } from "@material-ui/core";
import PlayCircleFilledWhiteIcon from '@material-ui/icons/PlayCircleFilledWhite';
import { subscribeRegChange } from "../../Server/serverApi";

const useStyle = makeStyles((theme: Theme) => ({
    startButton: {
        boxShadow: theme.shadows[12],
        width: '100%',
        marginTop: theme.spacing(2),
        padding: theme.spacing(2),
        background: `linear-gradient(45deg, ${theme.palette.secondary.light} 30%, #FF8E53 90%)`
    },
    resetContainer: {
        padding: theme.spacing(2)
    }
}));

type FinishedStepProps = {
    activeStep: number,
    stepLength: number,
    startButtonClick: () => void
}

const FinishedStep = ({ activeStep, stepLength, startButtonClick }: FinishedStepProps) => {
    const classes = useStyle();
    const [currentReg, setCurrentReg] = useState<string>('Press a Registration Memory Button...');

    const startLiveViewer = () => {
        console.log('now subscribing to reg change');
        subscribeRegChange((regFileName: string) => {
            setCurrentReg(regFileName);
        });
    };

    return (
        <div>
            {activeStep === stepLength && (
                <Paper elevation={0} className={classes.resetContainer}>
                    <Typography>Yeah, you're now ready for take-off.</Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        centerRipple
                        className={classes.startButton}
                        endIcon={<PlayCircleFilledWhiteIcon />}
                        onClick={() => startLiveViewer()}>
                        Start Reg-Sheets-Viewer
                        </Button>
                    <Button onClick={() => startButtonClick()}>
                        Reset
                        </Button>

                    <Divider style={{ margin: "16px 0" }} />
                    <Typography
                        align="center"
                        gutterBottom
                        variant="h4"
                    >
                        {currentReg}
                    </Typography>
                    <Divider style={{ margin: "16px 0" }} />

                </Paper>
            )}
        </div>
    );
};

export default FinishedStep;
