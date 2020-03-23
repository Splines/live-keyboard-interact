import React from 'react';
import { Container, Box, Typography } from '@material-ui/core';
import { getLayout as getSiteLayout } from '../src/Layouts/SiteLayout';
import Link from '../src/Link';
import RegSheetsExpansionPanels from '../src/Components/RegSheetsExpansionPanels/RegSheetsExpansionPanels';

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
      </Box>
    </Container>
  );
};

Index.getLayout = getSiteLayout;

export default Index;
