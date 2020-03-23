import React, {useState} from 'react';
import Dropzone from '../Dropzone';
import { Button, makeStyles, Theme } from "@material-ui/core";
import SendIcon from '@material-ui/icons/Send';

const useStyles = makeStyles((theme: Theme) => ({
    uploadButton: {
        width: "100%",
        marginTop: theme.spacing(2)
    }
}));

const MusicSheetsUploader = () => {
    const classes = useStyles();
    const [files, setFiles] = useState<File[]>([]);

    const addFiles = (newFiles: File[]) => {
        setFiles(oldFiles => [...oldFiles, ...newFiles]);
    };

    const deleteFile = (i: number) => {
        const temp = [...files];
        temp.splice(i, 1);
        setFiles(temp);
    };

    const processPdfFiles = async() => {
        console.log('tbd');
    };

    const pdfUploadButton: React.ReactElement =
        <Button
            className={classes.uploadButton}
            variant="contained"
            endIcon={<SendIcon />}
            color="primary"
            onClick={processPdfFiles}
        >
            {files.length === 1 ? 'Upload PDF' : 'Upload PDFs'}
        </Button>;

    return (
        <Dropzone
            fileFormat="application/pdf"
            fileFormatText=".pdf"
            files={files}
            addFiles={addFiles}
            deleteFile={deleteFile}
            elementsBelow={files.length >= 1 && pdfUploadButton}
            multiple={true}
        />
    );
};

export default MusicSheetsUploader;