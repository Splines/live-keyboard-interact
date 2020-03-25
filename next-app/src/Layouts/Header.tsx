import React from 'react';
import { AppBar, Toolbar, Typography, makeStyles, Theme } from '@material-ui/core';

const useStyles = makeStyles((theme: Theme) => ({
    appBar: {
        zIndex: theme.zIndex.drawer + 100,
        background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 100%)`
    }
}));

export default () => {
    const classes = useStyles();

    return (
        <AppBar position="sticky" className={classes.appBar}>
            <Toolbar>
                <Typography variant="h6" noWrap>
                    Live Keyboard Interact
            </Typography>
            </Toolbar>
        </AppBar>
    );
}