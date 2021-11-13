import { Dialog, Grid, Button, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { red } from '@mui/material/colors';
import { ChangeEvent, FC, FormEvent, useContext, useEffect, useState } from "react";
import { appContext } from "../App";
import { Session } from 'neo4j-driver';
import { useSnackbar } from "notistack"
import { useSigma } from "react-sigma-v2/lib/esm";

export type ConvertWifiProbeToStationProps = {
	show: boolean
	close: () => void
	onDone: () => void
	probeId: string
}

export const ConvertWifiProbeToStation: FC<ConvertWifiProbeToStationProps> = ({ show, close, onDone, probeId }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { theme, driver, database } = useContext(appContext);
	const sigma = useSigma();
	const graph = sigma.getGraph();
	const handleClose = () => {
		close();
	}
	const [bssid, setBssid] = useState('');
	const [bssidError, setBssidError] = useState(false);
	const handleBssidChange = (e: ChangeEvent<HTMLInputElement>) => {
		setBssidError(!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(e.target.value));
		setBssid(e.target.value);
	}
	const convertToStation = async (session: Session) => {
		const txr = session.beginTransaction();
		await txr.run(`MATCH (w { id: $probeId }), (c)-[o:KNOWS]-(w) SET w.bssid = $bssid, w:Wifi REMOVE w:WifiProbe CREATE (c)-[:CONNECTS_TO]->(w) DELETE o`, { probeId, bssid });
		await txr.commit();
		await session.close();
	}
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			await convertToStation(driver.session({ database }));
			enqueueSnackbar(`Converted wifi probe (${graph.getNodeAttribute(probeId, 'essid')}) to a station successfuly`, { variant: 'success' })
			handleClose();
			onDone();
		}
	}
	useEffect(() => {
		return () => {
			setBssid('');
			setBssidError(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show]);
	if (!show) return null;
	return (
		<Dialog open={show} fullWidth maxWidth='lg'>
			<form onSubmit={handleOnSubmit}>
				<DialogTitle>Convert wifi probe ({graph.getNodeAttribute(probeId, 'label')}) to a station</DialogTitle>
				<DialogContent>
						<TextField
							sx={{ margin: theme => theme.spacing(1), width: 300 }}
							placeholder='xx:xx:xx:xx:xx:xx'
							error={bssidError}
							helperText={bssidError ? 'BSSID must be formatted properly' : ''}
							label='BSSID'
							required
							value={bssid}
							onChange={handleBssidChange} />
				</DialogContent>
				<DialogActions style={{ padding: theme.spacing(3) }}>
					<Grid sx={{ flexGrow: 1, fontStyle: 'italic', fontWeight: 'bold', color: red[500], textTransform: 'uppercase' }}>This action is irreversible!</Grid>
					<Button color='inherit' onClick={handleClose}>Cancel</Button>
					<Button variant='contained' color='warning' disabled={bssid === ''} type='submit'>Convert</Button>
				</DialogActions>
			</form>
		</Dialog>
	)
}
