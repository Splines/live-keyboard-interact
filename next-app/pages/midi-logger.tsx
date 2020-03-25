import React from 'react';
import { getLayout as getSiteLayout } from '../src/Layouts/SiteLayout';
import { Container, Box, Typography } from '@material-ui/core';
import MyMidiLogger from '../src/Components/MidiLogger';

const MidiLogger = () => {
    return (
        <Container maxWidth="sm">
            <Box my={4}>

                <Typography variant="h4" component="h1" gutterBottom>
                    Live Midi Logger
                </Typography>
                <MyMidiLogger />

            </Box>
        </Container>
    );
};

MidiLogger.getLayout = getSiteLayout;
export default MidiLogger;
