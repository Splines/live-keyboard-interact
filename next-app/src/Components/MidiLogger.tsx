import React, { useState } from 'react';
import { List, ListItem, ListItemText, makeStyles, useTheme, Theme, Fab, Zoom } from '@material-ui/core';
import { subscribeMidiMsg } from '../../src/Server/serverApi';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';


const useStyles = makeStyles((theme: Theme) => ({
    list: {
        backgroundColor: theme.palette.background.paper,
        overflow: "auto",
        maxHeight: 400
    },
    button: {
        display: "table",
        margin: "0 auto",
    },
    fab: {
        zIndex: 2
    }
}));

export default () => {
    const classes = useStyles();
    const theme = useTheme();
    const [isLoggerActive, setLoggerActive] = useState<boolean>(false);
    const [logMessages, setLogMessages] = useState<string[]>([]);

    const addLogMessage = (newMessage: string) => {
        setLogMessages((oldMessages: string[]) => [newMessage, ...oldMessages]);
    };

    const subscribeMidiLogger = () => {
        setLoggerActive(true);
        subscribeMidiMsg((newMessage: string) => {
            addLogMessage(newMessage);
        });
    };

    const unsubscribeMidiLogger = () => {
        setLoggerActive(false);
        unsubscribeMidiLogger();
    };

    const fabs = [
        {
            color: 'primary',
            className: classes.fab,
            icon: <PlayArrowIcon />,
            label: 'Start Midi Logger'
        },
        {
            color: 'primary',
            className: classes.fab,
            icon: <PauseIcon />,
            label: 'Pause Midi Logger'
        }
    ];

    const transitionDuration = {
        enter: theme.transitions.duration.enteringScreen,
        exist: theme.transitions.duration.leavingScreen
    };

    return (
        <>
            <div className={classes.button}>
                {fabs.map((fab: any, i: number) => {
                    const show: boolean = isLoggerActive ? i === 1 : i === 0;
                    return (
                        <Zoom
                            key={fab.color + fab.label}
                            in={show}
                            timeout={transitionDuration}
                            style={{
                                transitionDelay: `${show ? transitionDuration.exist : 0}ms`
                            }}
                            unmountOnExit
                        >
                            <Fab
                                aria-label={fab.label}
                                className={fab.className}
                                color={fab.color}
                                onClick={i === 0 ? subscribeMidiLogger : unsubscribeMidiLogger}>
                                {fab.icon}
                            </Fab>
                        </Zoom>
                    );
                })}
            </div>
            <List dense className={classes.list}>
                {logMessages.map((logMessage: string, i: number) => (
                    <ListItem button key={i}>
                        <ListItemText primary={logMessage} />
                    </ListItem>
                ))}
            </List>
        </>
    );
};