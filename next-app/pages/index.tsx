import React from 'react';
import { Container, Box, Typography, Divider } from '@material-ui/core';
import { getLayout as getSiteLayout } from '../src/Layouts/SiteLayout';
import Link from '../src/Link';
import RegSheetsExpansionPanels from '../src/Components/RegSheetsExpansionPanels/RegSheetsExpansionPanels';
import RegViewerStarter from '../src/Components/RegViewerStarter';
import MidiLogger from '../src/Components/MidiLogger';

const Index = () => {

  return (
    <Container maxWidth="sm">
      <Box my={4}>

        <Typography variant="h4" component="h1" gutterBottom>
          Live Reg-Sheets-Viewer
        </Typography>
        <Link href="/about">
          About this project
        </Link>

        <RegSheetsExpansionPanels />
        <RegViewerStarter />

        <Divider style={{margin: "20px"}}/>
        
        <MidiLogger />

      </Box>
    </Container>
  );
};

Index.getLayout = getSiteLayout;

export default Index;
