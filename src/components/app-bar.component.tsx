import AppBar from '@material-ui/core/AppBar';
import Box from '@material-ui/core/Box';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import {
	Menu as MenuIcon,
	WbSunny as WbSunnyIcon,
	Bedtime as BedtimeIcon,
	Devices as DevicesIcon,
	Logout as LogoutIcon,
	Settings as SettingsIcon,
	Wifi as WifiIcon,
	VpnKey as CredentialsIcon,
	InsertDriveFile as HandshakeIcon,
	Dashboard as DashboardIcon,
	SettingsEthernet as SettingsEthernetIcon,
} from '@material-ui/icons';
import { useContext, useState } from 'react';
import { appContext } from '../App';
import { Link } from 'react-router-dom';

export type AppBarProps = {
	title: string
};

export const AppBarComponent = ({ title }: AppBarProps) => {
	const { darkMode, toggleDarkMode, setConnected, driver, setDriver, session, setSession } = useContext(appContext);
	const logout = async () => {
		await session?.close();
		await driver?.close();
		setDriver(null);
		setSession(null);
		setConnected(false);
	}
	const [open, setOpen] = useState(false);
	const toggleOpen = (open: boolean) => (event: any) => {
		if (
			event &&
			event.type === 'keydown' &&
			((event as KeyboardEvent).key === 'Tab' || (event as KeyboardEvent).key === 'Shift')
		) {
			return;
		}
		setOpen(open);
	}
	const links: [JSX.Element, string, string][] = [
		[<DashboardIcon />, '', 'Dashboard'],
		[<DevicesIcon />, 'clients', 'Clients'],
		[<WifiIcon />, 'wifis', 'Wi-Fi networks'],
		[<SettingsEthernetIcon />, 'lans', 'LAN networks'],
		[<HandshakeIcon />, 'handshakes', 'Handshakes'],
		[<CredentialsIcon />, 'credentials', 'Credentials'],
		[<SettingsIcon />, 'settings', 'Settings']
	];
	return (
		<>
			<AppBar position="static">
				<Toolbar>
					<IconButton
						onClick={() => setOpen(true)}
						size="large"
						edge="start"
						color="inherit"
						aria-label="menu"
						sx={{ mr: 2 }}>
						<MenuIcon />
					</IconButton>
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
						onClick={() => logout()}>
						<LogoutIcon />
					</IconButton>
				</Toolbar>
			</AppBar>
			<SwipeableDrawer
				anchor='left'
				open={open}
				onClose={toggleOpen(false)}
				onOpen={toggleOpen(true)}>
					<Box
						sx={{ width: 250 }}
						role="presentation"
						onClick={toggleOpen(false)}
						onKeyDown={toggleOpen(false)}>
							<List>
		{
				links.map((link, idx) => (
								<ListItem key={idx} button component={Link} to={`/${link[1]}`}>
									<ListItemIcon>
				{link[0]}
									</ListItemIcon>
									<ListItemText>
										{link[2]}
									</ListItemText>
								</ListItem>
			))
		}
							</List>
					</Box>
			</SwipeableDrawer>
		</>
	);
}
