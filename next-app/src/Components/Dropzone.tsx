import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paper, makeStyles, ListItem, List, ListItemText, ListItemSecondaryAction, IconButton, Theme, Button } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import SendIcon from '@material-ui/icons/Send';
const classNames = require('classnames');
import { FileWithRawData, subscribeLinkMidiFilesToReg } from '../Server/serverApi';
import { saveAs } from 'file-saver';

const useStyles = makeStyles((theme: Theme) => ({
    fileList: {
        width: '100%',
        backgroundColor: theme.palette.background.paper
    },
    basicDropzone: {
        cursor: 'pointer',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '30px',
        borderWidth: 2,
        borderRadius: 2,
        borderColor: theme.palette.info.light,
        borderStyle: 'dashed',
        backgroundColor: '#fafafa',
        outline: 'none',
        transition: `border .2s ease-in-out, box-shadow .4s ease-in-out`,
        '&:hover': {
            boxShadow: theme.shadows[13]
        }
    },
    activeDropzone: {
        borderColor: '#2196f3',
    },
    acceptDropzone: {
        borderColor: '#00e676'
    },
    rejectDropzone: {
        borderColor: '#ff1744'
    },
    // button: {
    //     background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 100%)`
    // }
}));

type DropzoneProps = {
    fileFormat: string,
    fileFormatText: string,
}

const Dropzone = ({ fileFormat, fileFormatText }: DropzoneProps) => {
    const [files, setFiles] = useState<File[]>([]);
    const classes = useStyles();

    //////////////
    // Dropzone //
    //////////////
    const addFiles = (newFiles: File[]) => {
        setFiles(oldFiles => [...oldFiles, ...newFiles]);
    };

    const deleteFile = (i: number) => {
        const temp = [...files];
        temp.splice(i, 1);
        setFiles(temp);
    };

    const onDropAccepted = useCallback((acceptedFiles: File[]) => {
        addFiles(acceptedFiles);
    }, []);

    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject
    } = useDropzone({ onDropAccepted, accept: `${fileFormat}` });

    const dropzoneClasses = classNames(classes.basicDropzone, {
        [classes.activeDropzone]: isDragAccept,
        [classes.acceptDropzone]: isDragActive,
        [classes.rejectDropzone]: isDragReject
    });

    let dropzoneText;
    if (isDragActive) {
        if (isDragReject) {
            dropzoneText = <p>This file type is not supported!</p>
        } else {
            dropzoneText = <p> Drop the files here ...</p>;
        }
    } else {
        dropzoneText = <p>Drag 'n' drop some files here, or click to select files</p>;
    }

    ///////////////////
    // Submit Button //
    ///////////////////
    const processRegFiles = async () => {
        const filesWithData: FileWithRawData[] = await Promise.all(files.map((file: File) => readAsArrayBufferPromise(file)));
        // Send files to backend and process them
        subscribeLinkMidiFilesToReg(filesWithData, (zippedRegFiles: ArrayBuffer) => {
            // save with FileSaver
            // other option: https://stackoverflow.com/a/19328891
            saveAs(new Blob([zippedRegFiles]), 'Live-Keyboard-Interact.zip');
        });
    };


    return (
        <>
            <Paper {...getRootProps({ className: dropzoneClasses })}>
                <input {...getInputProps()} />
                {dropzoneText}
                <p><em>Only {fileFormatText} files will be accepted</em></p>
                {
                    files.length === 0 ? null :
                        <List
                            className={classes.fileList}
                            onClick={(event) => event.stopPropagation()}>
                            {files.map((file: File, i) => (
                                <ListItem key={i} button>
                                    <ListItemText primary={file.name} />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" aria-label="delete" size="small" onClick={() => deleteFile(i)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                }
            </Paper>
            <Button
                variant="contained"
                endIcon={<SendIcon />}
                color="primary"
                onClick={processRegFiles}
            >
                Link Reg
            </Button>
        </>
    );
};

function readAsArrayBufferPromise(file: File): Promise<FileWithRawData> {
    return new Promise<FileWithRawData>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject();
        reader.onload = () => {
            // resolve({ ...file, data: reader.result as ArrayBuffer});
            resolve({
                name: file.name,
                lastModified: file.lastModified,
                data: reader.result as ArrayBuffer
            });
        };
        reader.readAsArrayBuffer(file);
    });
}

export default Dropzone;
