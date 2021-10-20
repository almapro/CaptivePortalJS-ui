import { Box, Button, ButtonGroup, Fab } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { FC, useContext } from 'react';
import {
	ZoomIn as ZoomInIcon,
	ZoomOut as ZoomOutIcon,
	Search as SearchIcon,
	Add as AddIcon,
} from '@mui/icons-material';
import { appContext } from '../App';
import { useSigma } from 'react-sigma-v2';

export type FloatingActionsProps = {
	showAddNode: () => void
}

export const FloatingActions: FC<FloatingActionsProps> = ({ showAddNode }) => {
	const { theme } = useContext(appContext);
	const sigma = useSigma();
	const useStyles = makeStyles({
		floatingActions: {
			position: 'absolute',
			zIndex: theme.zIndex.appBar,
			bottom: theme.spacing(2),
			right: theme.spacing(2),
		},
		paper: {
			padding: theme.spacing(2),
			height: `100%`,
		},
		divider: {
			width: '100%',
			height: '5px',
			margin: '5px 0 !important',
		},
	});
	const classes = useStyles();
	const handleZoomOut = () => {
		sigma.getCamera().animatedUnzoom(2);
	}
	const handleZoomIn = () => {
		sigma.getCamera().animatedZoom(2);
	}
	const handleZoomReset = () => {
		sigma.getCamera().animatedReset();
	}
	return (
		<>
			<Fab sx={{ position: 'absolute', right: theme.spacing(2), top: `${parseInt(theme.spacing(2).toString())}px`, zIndex: theme.zIndex.appBar }} color='secondary' onClick={showAddNode}><AddIcon /></Fab>
			<Box className={classes.floatingActions}>
				<ButtonGroup orientation='vertical' color='secondary' variant='contained'>
					<Button onClick={handleZoomIn}><ZoomInIcon /></Button>
					<Button onClick={handleZoomReset}><SearchIcon /></Button>
					<Button onClick={handleZoomOut}><ZoomOutIcon /></Button>
				</ButtonGroup>
			</Box>
		</>
	);
}
