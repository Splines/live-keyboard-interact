import React, { useState } from 'react';
import Dropzone from '../Dropzone';
import { Button, makeStyles, Theme, CircularProgress, Typography, Divider } from "@material-ui/core";
import SendIcon from '@material-ui/icons/Send';
import { putPdfs, FileWithRawData } from '../../Server/serverApi';
import { getDataForFiles } from '../../fileUtil';
import FileList from '../FileList';
import useSWR from 'swr';

const useStyles = makeStyles((theme: Theme) => ({
    uploadButton: {
        width: "100%",
        marginTop: theme.spacing(2)
    }
}));

const fetcher = (url: string) => fetch(url).then((r: Response) => r.json());

// https://github.com/zeit/swr#quick-start
const PdfList = () => {
    const { data, error } = useSWR('/api/pdfs', fetcher);

    const handleDelete = (filename: string) => {
        console.log('will delete: ' + filename);
        // TODO: Implement logic here
    };
    
    if (error) return <Typography>Failed to load list of PDF filenames...</Typography>;
    if (!data) return <CircularProgress />;
    return <FileList fileNames={data.pdfFiles} deleteFile={handleDelete} />
};


const MusicSheetsUploader = () => {
    const classes = useStyles();
    const [files, setFiles] = useState<File[]>([]);

    const addFiles = (newFiles: File[]) => {
        setFiles(oldFiles => [...oldFiles, ...newFiles]);
    };

    const deleteFile = (i: number) => {
        const temp = [...files];
        temp.splice(i, 1);
        setFiles(temp);
    };

    const processPdfFiles = async () => {
        const filesWithData: FileWithRawData[] = await getDataForFiles(files);
        putPdfs(filesWithData);
    };

    const pdfUploadButton: React.ReactElement =
        <Button
            className={classes.uploadButton}
            variant="contained"
            endIcon={<SendIcon />}
            color="primary"
            onClick={processPdfFiles}
        >
            {files.length === 1 ? 'Upload PDF' : 'Upload PDFs'}
        </Button>;

    return (
        <>
            <PdfList />
            <Divider style={{ margin: "20px" }} />
            <Dropzone
                fileFormat="application/pdf"
                fileFormatText=".pdf"
                files={files}
                addFiles={addFiles}
                deleteFile={deleteFile}
                elementsBelow={files.length >= 1 && pdfUploadButton}
                multiple={true}
            />
        </>
    );
};

export default MusicSheetsUploader;