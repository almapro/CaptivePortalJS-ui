import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material"
import { useSnackbar } from "notistack"
import { FC, FormEvent, useContext, useEffect, useState } from "react"
import { appContext } from "../App"
import { useSigma } from "react-sigma-v2/lib/esm"
import { v4 } from "uuid";
import { Neo4jError } from "neo4j-driver";

export type UploadWifiHandshakeProps = {
	show: boolean
	close: () => void
	wifiId: string
	onDone: () => void
}

export const UploadWifiHandshake: FC<UploadWifiHandshakeProps> = ({ show, close, onDone, wifiId }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { theme, driver, database } = useContext(appContext);
	const sigma = useSigma();
	const graph = sigma.getGraph();
	const [file, setFile] = useState<File | null>(null);
	const handleOnSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (file && driver) {
			var reader = new FileReader();
			reader.onload = async () => {
				if (reader.result) {
					try {
						const filePath = window.files.upload(wifiId, 'handshakes', file.name, reader.result)
						const hid = v4();
						const session = driver.session({ database })
						await session.run('MATCH (w { id: $wifiId }) CREATE (w)-[:HAS_HANDSHAKE]->(h:WifiHandshake { id: $hid, filePath: $filePath, filename: $filename })', { wifiId, hid, filePath, filename: file.name });
						await session.close();
						enqueueSnackbar('Handshake has been uploaded successfuly', { variant: 'success' });
						onDone();
						close();
					} catch (e) {
						enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
					}
				}
			}
			reader.readAsBinaryString(file);
		}
	}
	useEffect(() => {
		return () => {
			setFile(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show]);
	if (!show) return null;
	return (
		<Dialog open={show} fullWidth maxWidth='lg'>
			<form onSubmit={handleOnSubmit}>
				<DialogTitle>Upload handshake for wifi ({graph.getNodeAttribute(wifiId, 'label')})</DialogTitle>
				<DialogContent>
						<Button variant='contained' component='label'>Choose a file<input accept='.pcap' onChange={e => setFile(e.target.files?.item(0) ?? null)} type='file' hidden /></Button>
						{file && <TextField size='small' sx={{ ml: 2 }} InputProps={{ readOnly: true }} value={file.path} />}
				</DialogContent>
				<DialogActions style={{ padding: theme.spacing(3) }}>
					<Button color='inherit' onClick={close}>Cancel</Button>
					<Button variant='contained' color='primary' disabled={!file} type='submit'>Upload</Button>
				</DialogActions>
			</form>
		</Dialog>
	)
}
