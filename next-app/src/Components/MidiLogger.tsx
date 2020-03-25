import React, { useState } from 'react';
import { Typography, Button } from '@material-ui/core';
import { subscribeMidiMsg } from '../../src/Server/serverApi';

export default () => {
    const [logOutput, setLogOutput] = useState<string>('MidiMessages Log');

    const appendLog = (newMessage: string) => {
        setLogOutput((oldMessage: string) => newMessage + '\n\n' + oldMessage);
    }

    const handleClick = () => {
        subscribeMidiMsg((newMessage: string) => {
            console.log(newMessage);
            appendLog(newMessage);
        });
    };

    return (
        <>
            <Button
                variant="contained"
                color="primary"
                onClick={handleClick}
            >
                Midi Log
            </Button>
            <Typography variant="body1">{logOutput}</Typography>
        </>
    );
};