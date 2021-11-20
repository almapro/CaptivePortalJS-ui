import {
	Grid,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Switch,
	FormControlLabel,
	Divider,
	Checkbox,
	FormGroup,
	Box,
} from "@mui/material"
import { FC, useContext, useState, useCallback } from "react"
import { appContext } from "../App"
import {
	Logout as LogoutIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { FileType } from "../global.d";
import { useSnackbar } from "notistack";

export type SettingsProps = {
	show: boolean
	close: () => void
}

export const ThemeModeSwitch = styled(Switch)(({ theme }) => ({
	width: 62,
	height: 34,
	padding: 7,
	'& .MuiSwitch-switchBase': {
		margin: 1,
		padding: 0,
		transform: 'translateX(6px)',
		'&.Mui-checked': {
			color: '#fff',
			transform: 'translateX(22px)',
			'& .MuiSwitch-thumb:before': {
				backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
					'#fff',
				)}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
			},
			'& + .MuiSwitch-track': {
				opacity: 1,
				backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
			},
		},
	},
	'& .MuiSwitch-thumb': {
		backgroundColor: theme.palette.secondary.main,
		width: 32,
		height: 32,
		'&:before': {
			content: "''",
			position: 'absolute',
			width: '100%',
			height: '100%',
			left: 0,
			top: 0,
			backgroundRepeat: 'no-repeat',
			backgroundPosition: 'center',
			backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
				'#fff',
			)}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
		},
	},
	'& .MuiSwitch-track': {
		opacity: 1,
		backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
		borderRadius: 20 / 2,
	},
}));

export const Settings: FC<SettingsProps> = ({ show, close }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { darkMode, toggleDarkMode, setDriver, setDatabase, setConnected, driver, theme, database } = useContext(appContext);
	const disconnect = async () => {
		await driver?.close();
		setDriver(null);
		setDatabase('');
		setConnected(false);
	}
	const [filesTypes, setFilesTypes] = useState<{ [key in FileType]: boolean }>({ 'handshakes': false, 'pictures': false });
	const deleteUsedFiles = async () => {
		if (driver) {
			const session = driver.session({ database });
			const trx = session.beginTransaction();
			let clearedNothing = true;
			if (filesTypes['handshakes']) {
				const result = await trx.run('MATCH (h:WifiHandshake) RETURN h');
				const count = await window.files.clearUnused('handshakes', result.records.map(record => record.toObject().h));
				setFilesTypes(prev => ({ ...prev, 'handshakes': false }));
				if (count) {
					clearedNothing = false;
					enqueueSnackbar(`Cleared ${count} unused handshakes`, { variant: 'success' });
				}
			}
			if (filesTypes['pictures']) {
				const result = await trx.run('MATCH (p:ProfilePicture) RETURN p');
				const count = await window.files.clearUnused('pictures', result.records.map(record => record.toObject().p));
				setFilesTypes(prev => ({ ...prev, 'pictures': false }));
				if (count) {
					clearedNothing = false;
					enqueueSnackbar(`Cleared ${count} unused pictures`, { variant: 'success' });
				}
			}
			if (clearedNothing) enqueueSnackbar('Nothing to be cleared', { variant: 'info' });
			await session.close();
		}
	}
	const deleteUsedFilesCallback = useCallback(deleteUsedFiles, [driver, filesTypes, setFilesTypes, database, enqueueSnackbar]);
	if (!show) return null;
	return (
		<Dialog open={show} fullWidth maxWidth='sm'>
			<DialogTitle>Settings</DialogTitle>
			<Divider variant='middle' />
			<DialogContent>
				<FormControlLabel
					sx={{ m: 0 }}
					control={<ThemeModeSwitch onClick={toggleDarkMode} checked={darkMode} />}
					label='Dark mode'
					labelPlacement='start' />
				<Box sx={{ mt: 2 }}>
					Clear unused:
					<Box sx={{ pl: 4 }}>
						<FormGroup>
							<FormControlLabel control={<Checkbox size='small' checked={filesTypes['handshakes']} onChange={() => setFilesTypes(prev => ({ ...prev, 'handshakes': !prev['handshakes'] }))} />} label="Hanshakes" />
							<FormControlLabel control={<Checkbox size='small' checked={filesTypes['pictures']} onChange={() => setFilesTypes(prev => ({ ...prev, 'pictures': !prev['pictures'] }))} />} label="Pictures" />
						</FormGroup>
						<Button onClick={deleteUsedFilesCallback} size='small' variant='contained' disabled={!filesTypes['handshakes'] && !filesTypes['pictures']}>Clear</Button>
					</Box>
				</Box>
			</DialogContent>
			<Divider variant='middle' />
			<DialogActions style={{ padding: theme.spacing(3) }}>
				<Grid container>
					<Grid item flexGrow={1}>
						<Button variant='outlined' color='primary' onClick={disconnect}><LogoutIcon />Disconnect</Button>
					</Grid>
					<Grid item>
						<Button color='inherit' onClick={close}>Close</Button>
					</Grid>
				</Grid>
			</DialogActions>
		</Dialog>
	);
}
