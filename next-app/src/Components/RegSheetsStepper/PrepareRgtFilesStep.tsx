import React, { useState } from 'react';
import { Paper, Typography, Tabs, Tab, Box, Theme, makeStyles } from "@material-ui/core";
import Dropzone from '../Dropzone';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        backgroundColor: theme.palette.background.paper,
        width: "100%"
    }
}));

interface TabPanelProps {
    children?: React.ReactNode;
    index: any;
    value: any;
}

const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => {
    return (
        <Typography
            component="div"
            role="tabpanel"
            hidden={value !== index}
            {...other}
        >
            {value === index && <Box p={3}>{children}</Box>}
        </Typography>
    );
};

const PrepareRgtFilesStep = () => {
    const classes = useStyles();
    const [value, setValue] = useState(0);

    const handleChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
        setValue(newValue);
    };

    return (
        <div className={classes.root}>
            <Paper square>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    indicatorColor="secondary"
                    textColor="secondary"
                    centered
                >
                    <Tab label="RGT Files" />
                    <Tab label="JSON Map" />
                </Tabs>
            </Paper>
            <TabPanel value={value} index={0}>
                <Dropzone fileFormat=".RGT" fileFormatText=".RGT" />
            </TabPanel>
            <TabPanel value={value} index={1}>
                <Dropzone fileFormat="application/json" fileFormatText=".json" />
            </TabPanel>
        </div>
    );
};

export default PrepareRgtFilesStep;
