import React from 'react';
import DeleteIcon from '@material-ui/icons/Delete';
import { List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@material-ui/core';

interface DeleteFileCallback {
    (filename: string): void;
}

type FileListProps = {
    filenames: string | string[];
    deleteFile: DeleteFileCallback;
}

export default ({ filenames: filenames, deleteFile }: FileListProps) => {
    let listItems;
    if (!filenames) {
        listItems =
            <ListItem>
                <ListItemText primary="No PDF files uploaded yet..." />
            </ListItem>
    } else {
        if (typeof filenames === "string") {
            const filename: string = filenames;
            listItems =
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
                </ListItem>;
        } else {
            listItems = (filenames as string[]).map((filename: string) => (
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
    }

    return (
        <List>
            {listItems}
        </List>
    );
};