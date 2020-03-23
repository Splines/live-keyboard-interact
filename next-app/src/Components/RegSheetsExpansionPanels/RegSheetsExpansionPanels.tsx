import React, { useState } from 'react';
import { ExpansionPanel, Typography, ExpansionPanelSummary, ExpansionPanelDetails, makeStyles, Theme } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
// import Dropzone from '../Dropzone';
import FilesMapper from './FilesMapper';
import MusicSheetsUploader from './MusicSheetsUploader';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        width: "100%",
    },
    heading: {
        fontSize: theme.typography.pxToRem(15),
        flexBasis: "33.33%",
        flexShrink: 1
    },
    secondaryHeading: {
        fontSize: theme.typography.pxToRem(15),
        color: theme.palette.text.secondary
    },
    content: {
        display: "block"
    }
}));

export default function RegSheetsExpansionPanels() {
    const classes = useStyles();
    const [expanded, setExpanded] = useState<string | false>(false);

    const handleChange = (panel: string) => (_event: React.ChangeEvent<{}>, isExpanded: boolean) => {
        setExpanded(isExpanded ? panel : false);
    };

    return (
        <div className={classes.root}>
            <ExpansionPanel
                expanded={expanded === 'panel1'}
                onChange={handleChange('panel1')}>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography className={classes.heading}>Mapping</Typography>
                    <Typography className={classes.secondaryHeading}>Prepare your Reg files</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails className={classes.content}>
                    <FilesMapper />
                </ExpansionPanelDetails>
            </ExpansionPanel>

            <ExpansionPanel
                expanded={expanded === 'panel2'}
                onChange={handleChange('panel2')}>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography className={classes.heading}>Music sheets</Typography>
                    <Typography className={classes.secondaryHeading}>Upload PDF files</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails className={classes.content}>
                    <MusicSheetsUploader />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        </div>
    );
}