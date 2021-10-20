import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import {
	WbSunny as WbSunnyIcon,
	Bedtime as BedtimeIcon,
	PowerOff as PowerOffIcon,
} from '@mui/icons-material';
import { useContext } from 'react';
import { appContext } from '../App';

export type AppBarProps = {
	title: string
};

export const AppBarComponent = ({ title }: AppBarProps) => {
	const { darkMode, sigma, toggleDarkMode, setConnected, driver, setDriver, setDatabase } = useContext(appContext);
	const disconnect = async () => {
		await driver?.close();
		setDriver(null);
		setDatabase('');
		if (sigma) {
			sigma.getGraph().clear();
			sigma.listeners('rightClickNode').forEach(listener => sigma.removeListener('rightClickNode', listener as any));
			sigma.getMouseCaptor().listeners('mousemove').forEach(listener => sigma.getMouseCaptor().removeListener('mousemove', listener as any));
		}
		setConnected(false);
	}
	return (
		<AppBar position="static">
			<Toolbar>
				<Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
					{title}
				</Typography>
				<IconButton
					sx={{ margin: '0 15px' }}
					color='inherit'
					edge='end'
					onClick={() => toggleDarkMode()}>
					{
						!darkMode ?
						<WbSunnyIcon /> :
						<BedtimeIcon />
					}
				</IconButton>
				<IconButton
					color='inherit'
					edge='end'
					onClick={() => disconnect()}>
					<PowerOffIcon />
				</IconButton>
			</Toolbar>
		</AppBar>
	);
}
