import React from 'react';
import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody } from '@material-ui/core';
import { RegIndexMapping } from '../Server/serverApi';
import Link from '../Link';

type RegIndexMapProps = {
    regIndexMap: RegIndexMapping[]
};


export default ({ regIndexMap }: RegIndexMapProps) => {
    return (
        <TableContainer component={Paper}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Reg name</TableCell>
                        <TableCell align="right">Midi Index</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {regIndexMap.map((regIndexMapping: RegIndexMapping) => (
                        <TableRow key={regIndexMapping.regName}>
                            <TableCell>
                                <Link href={`pdfs/${regIndexMapping.regName}.pdf`} target="_blank">{regIndexMapping.regName}</Link>
                            </TableCell>
                            <TableCell align="right">{regIndexMapping.midiIndex}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};