import React, { useState } from 'react';
import { Paper, Typography, Tabs, Tab, Box, Theme, makeStyles, Button } from "@material-ui/core";
import Dropzone from '../Dropzone';
import { FileWithRawData, subscribeLinkMidiFilesToReg } from '../../Server/serverApi';
import SendIcon from '@material-ui/icons/Send';
import { saveAs } from 'file-saver';
import { getDataForFiles } from '../../fileUtil';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        backgroundColor: theme.palette.background.paper,
        width: "100%"
    },
    uploadButton: {
        width: "100%",
        marginTop: "20px"
    },
    textNotice: {
        marginTop: "20px"
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

const FilesMapper = () => {
    const classes = useStyles();
    const [tabValue, setTabValue] = useState(0);
    const [files, setFiles] = useState<File[]>([]);

    const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
        setFiles([]);
        setTabValue(newValue);
    };

    const addFiles = (newFiles: File[]) => {
        setFiles(oldFiles => [...oldFiles, ...newFiles]);
    };

    const deleteFile = (i: number) => {
        const temp = [...files];
        temp.splice(i, 1);
        setFiles(temp);
    };

    const processRegFiles = async () => {
        if (files.length === 0) {
            // !!! should never happen because the Dropzone only shows the button when at least one file is uploaded
            console.log('There are 0 files. This should never happen!');
            return Promise.resolve();
        }
        const filesWithData: FileWithRawData[] = await getDataForFiles(files);
        // Send files to backend and process them
        subscribeLinkMidiFilesToReg(filesWithData, (zippedRegFiles: ArrayBuffer) => {
            // save with FileSaver
            // other option: https://stackoverflow.com/a/19328891
            saveAs(new Blob([zippedRegFiles]), 'Live-Keyboard-Interact.zip');
        });
    };

    const processJsonFiles = () => {
        console.log('tbd');
    };

    const regUploadButton: React.ReactElement =
        <Button
            className={classes.uploadButton}
            variant="contained"
            endIcon={<SendIcon />}
            color="primary"
            onClick={processRegFiles}
        >
            Link Reg
        </Button>;

    const jsonUploadButton: React.ReactElement =
        <Button
            className={classes.uploadButton}
            variant="contained"
            endIcon={<SendIcon />}
            color="primary"
            onClick={processJsonFiles}
        >
            Upload Map
        </Button>;

    const onlyOneFileNotice: React.ReactElement =
        <Typography className={classes.textNotice}>
            You can only upload one JSON Mapping
        </Typography>;

    return (
        <div className={classes.root}>
            <Paper square>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="secondary"
                    textColor="secondary"
                    centered
                >
                    <Tab label="Reg Files" />
                    <Tab label="JSON Map" />
                </Tabs>
            </Paper>
            <TabPanel value={tabValue} index={0}>
                <Dropzone
                    fileFormat=".RGT"
                    fileFormatText=".RGT"
                    files={files}
                    addFiles={addFiles}
                    deleteFile={deleteFile}
                    elementsBelow={files.length >= 1 && regUploadButton}
                    multiple={true}
                />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
                <Dropzone
                    fileFormat="application/json"
                    fileFormatText=".json"
                    files={files}
                    addFiles={addFiles}
                    deleteFile={deleteFile}
                    elementsBelow={files.length >= 1 && (files.length > 1 ? onlyOneFileNotice : jsonUploadButton)}
                    multiple={false}
                />
            </TabPanel>
        </div>
    );
};

export default FilesMapper;
