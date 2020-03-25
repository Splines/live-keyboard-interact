// https://github.com/mui-org/material-ui/blob/master/docs/src/pages/getting-started/templates/sticky-footer/StickyFooter.js
import React from 'react';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Grow } from '@material-ui/core';
import { NextComponentType } from 'next';
import AcUnitIcon from '@material-ui/icons/AcUnit';
import Link from '../Link';
import Header from './Header';
import Footer from './Footer';

const drawerWidth = 240;
const contentMarginLeft = 0.6 * drawerWidth;

// https://stackoverflow.com/a/56172888/9655481
// https://github.com/mui-org/material-ui/blob/master/packages/material-ui/src/ButtonBase/TouchRipple.js
const useStyles = makeStyles((theme: Theme) => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
    },
    drawer: {
        width: drawerWidth,
        flexShrink: 0,
    },
    content: {
        flexGrow: 1,
        marginLeft: contentMarginLeft
    },
    navButton: {
        marginTop: theme.spacing(1.2),
        marginBottom: theme.spacing(1.2),
        padding: theme.spacing(1),
        // "&:hover": {
        //     backgroundColor: theme.palette.primary.main
        // }
    },
    activeLink: {
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText
    },
    // necessary for content to be below app bar
    toolbar: theme.mixins.toolbar
}));

const useRippleStyles = makeStyles((theme: Theme) => ({
    child: {
        backgroundColor: theme.palette.secondary.dark
    },
}));

type MenuItem = {
    text: string,
    href: string,
};

const menuItems: MenuItem[] = [
    {
        text: 'Home',
        href: 'index',
    },
    {
        text: 'Reg Sheets Viewer',
        href: 'reg-sheets-viewer',
    },
    {
        text: 'Midi Logger',
        href: 'midi-logger',
    }
]

const SiteLayout: React.FC<{ children: NextComponentType }> = ({ children }) => {
    const classes = useStyles();
    const rippleClasses = useRippleStyles();

    return (
        <div className={classes.root}>
            <Header />

            <Drawer
                className={classes.drawer}
                variant="permanent"
            >
                <div className={classes.toolbar} />
                <List>
                    {menuItems.map((menuItem: MenuItem, i: number) => (
                        <ListItem
                            button
                            key={menuItem.href + i}
                            component={Link}
                            href={menuItem.href}
                            className={classes.navButton}
                            TouchRippleProps={{ classes: rippleClasses }}
                            activeClassName={classes.activeLink}>
                            <ListItemIcon><AcUnitIcon /></ListItemIcon>
                            <ListItemText primary={menuItem.text}></ListItemText>
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
