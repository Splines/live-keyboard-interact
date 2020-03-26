import { Container, Typography, makeStyles, Theme, Backdrop } from "@material-ui/core";
import CircularProgress from '@material-ui/core/CircularProgress';
// import CancelIcon from '@material-ui/icons/Cancel';

const useStyle = makeStyles((theme: Theme) => ({
    backdrop: {
        // display: "block",
        zIndex: theme.zIndex.drawer + 100,
        color: "#fff",
        backgroundColor: "rgba(0, 0, 0, 0.8)"
    },
    container: {
        textAlign: "center"
    }
}));

interface BackdropCloseHandler {
    (): void;
}

type BackdropProps = {
    backdropOpen: boolean,
    currentReg: string,
    closeHandler: BackdropCloseHandler
}

const RegViewerBackdrop = ({ backdropOpen, currentReg, closeHandler }: BackdropProps) => {
    const classes = useStyle();
    return (
        <Backdrop className={classes.backdrop} open={backdropOpen} onClick={closeHandler}>
            <Container maxWidth="sm" className={classes.container}>
                <Typography variant="h5">
                    Waiting for you to press a Registration Memory button on your keyboard...
                </Typography>
                <CircularProgress color="inherit" style={{ margin: "20px" }} />
                {currentReg &&
                    <Typography
                        align="center"
                        variant="h6"
                        gutterBottom
                    >
                        {currentReg}
                    </Typography>
                }
            </Container>
        </Backdrop>
    );
};

export default RegViewerBackdrop;