import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paper, makeStyles, ListItem, List, ListItemText, ListItemSecondaryAction, IconButton, Theme } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
const classNames = require('classnames');

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
    }
}));

interface addFilesCallback {
    (newFiles: File[]): void;
}

interface deleteFileCallback {
    (oldFile: number): void;
}

type DropzoneProps = {
    fileFormat: string,
    fileFormatText: string,
    files: File[],
    addFiles: addFilesCallback,
    deleteFile: deleteFileCallback,
    elementsBelow: React.ReactElement | false,
    multiple: boolean
}

const Dropzone = ({ fileFormat, fileFormatText, files, addFiles, deleteFile, elementsBelow, multiple }: DropzoneProps) => {
    const classes = useStyles();

    const onDropAccepted = useCallback((acceptedFiles: File[]) => {
        addFiles(acceptedFiles);
    }, []);

    const {
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject
    } = useDropzone({ onDropAccepted, accept: `${fileFormat}`, multiple: multiple });

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
            {elementsBelow}
        </>
    );
};

export default Dropzone;
