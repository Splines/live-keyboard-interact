import React from 'react';
import { getLayout as getSiteLayout } from '../src/Layouts/SiteLayout';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Link from '../src/Link';

// keep in mind: https://rangle.io/blog/simplifying-controlled-inputs-with-hooks/

const About = () => {
  return (
    <Container maxWidth="sm">
      <Box my={4}>

        <Typography variant="h4" component="h1" gutterBottom>
          About this project
        </Typography>
        <Link href="/">Back to Home</Link>
        <Typography variant="body1" gutterBottom>
          I'm currently working on the "Live Keyboard App" for the Raspberry Pi, so stay tuned in 🥳
        </Typography>

      </Box>
    </Container>
  );
};

About.getLayout = getSiteLayout;
export default About;
