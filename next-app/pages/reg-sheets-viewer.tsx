import React from 'react';
import { getLayout as getSiteLayout } from '../src/Layouts/SiteLayout';
import { Container, Box, Typography } from '@material-ui/core';
import RegSheetsExpansionPanels from '../src/Components/RegSheetsExpansionPanels/RegSheetsExpansionPanels';
import RegViewerStarter from '../src/Components/RegViewerStarter';

const RegSheetsViewer = () => {
    return (
        <Container maxWidth="sm">
            <Box my={4}>

                <Typography variant="h4" component="h1" gutterBottom>
                    Live Reg Sheets Viewer
                </Typography>
                <RegSheetsExpansionPanels />
                <RegViewerStarter />

            </Box>
        </Container>
    );
};

RegSheetsViewer.getLayout = getSiteLayout;
export default RegSheetsViewer;
