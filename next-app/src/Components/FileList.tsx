import React from 'react';
import DeleteIcon from '@material-ui/icons/Delete';
import { List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@material-ui/core';

interface DeleteFileCallback {
    (filename: string): void;
}

type FileListProps = {
    fileNames: string[];
    deleteFile: DeleteFileCallback;
}

export default ({ fileNames, deleteFile }: FileListProps) => {
    let listItems;
    if (!fileNames) {
        listItems =
            <ListItem>
                <ListItemText primary="No PDF files uploaded yet..." />
            </ListItem>
    } else {
        listItems = fileNames.map((filename: string) => (
            <ListItem key={filename}>
                <ListItemText primary={filename} />
                <ListItemSecondaryAction>
                    <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => deleteFile(filename)}
                    >
                        <DeleteIcon />
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
        ));
    }

    return (
        <List>
            {listItems}
        </List>
    );
};