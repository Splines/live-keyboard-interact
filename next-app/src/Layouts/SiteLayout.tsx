// https://github.com/mui-org/material-ui/blob/master/docs/src/pages/getting-started/templates/sticky-footer/StickyFooter.js
import React from 'react';
import Footer from './Footer';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { AppBar, Toolbar, Drawer, List, ListItem, ListItemIcon, ListItemText, Grow } from '@material-ui/core';
import { Typography } from '@material-ui/core';
import { NextComponentType } from 'next';
import AcUnitIcon from '@material-ui/icons/AcUnit';
import Link from '../Link';

const drawerWidth = 240;

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
    },
    appBar: {
        zIndex: theme.zIndex.drawer + 100,
        background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 100%)`
    },
    drawer: {
        width: drawerWidth,
        flexShrink: 0,
    },
    content: {
        flexGrow: 1,
        marginLeft: drawerWidth
    },
    // necessary for content to be below app bar
    toolbar: theme.mixins.toolbar
}));

const menuItems = ['Reg-Sheets-Viewer', 'Midi-Log'];

const SiteLayout: React.FC<{ children: NextComponentType }> = ({ children }) => {
    const classes = useStyles();

    return (
        <div className={classes.root}>

            <AppBar position="sticky" className={classes.appBar}>
                <Toolbar>
                    <Typography variant="h6" noWrap>
                        Live-Keyboard-Interact
                    </Typography>
                </Toolbar>
            </AppBar>

            <Drawer
                className={classes.drawer}
                variant="permanent"
            >
                <div className={classes.toolbar} />
                <List>
                    {menuItems.map((text: string, i: number) => (
                        <ListItem button key={text + i} component={Link} href="/about">
                            <ListItemIcon><AcUnitIcon /></ListItemIcon>
                            <ListItemText primary={text}></ListItemText>
                        </ListItem>
                    ))}
                </List>
            </Drawer>

            <main className={classes.content}>
                <Grow>
                    {children}
                </Grow>
            </main>

            <Footer />

        </div>
    );
};

export const getLayout = (page: NextComponentType) => <SiteLayout>{page}</SiteLayout>;

export default SiteLayout;
