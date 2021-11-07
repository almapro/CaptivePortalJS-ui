import { Box, Button, ButtonGroup, Fab, Autocomplete, TextField } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { FC, useContext, useState, useEffect } from 'react';
import {
	ZoomIn as ZoomInIcon,
	ZoomOut as ZoomOutIcon,
	Search as SearchIcon,
	Add as AddIcon,
} from '@mui/icons-material';
import { appContext } from '../App';
import { useSigma } from 'react-sigma-v2';
import Graph from 'graphology';

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
		floatingSearch: {
			position: 'absolute',
			zIndex: theme.zIndex.appBar,
			top: theme.spacing(2),
			left: theme.spacing(2),
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
	const [search, setSearch] = useState('');
	const [values, setValues] = useState<{ id: string, label: string }[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const findMatchingNodes = (searchString: string, graph: Graph) => {
		const foundMatchingNodes: { id: string, label: string }[] = []
		graph.forEachNode((id, attributes) => {
			if (attributes.label && attributes.label.toLowerCase().includes(searchString.toLowerCase())) {
				foundMatchingNodes.push({ id, label: attributes.label });
			}
		});
		return foundMatchingNodes;
	}
	useEffect(() => {
		const graph = sigma.getGraph();
		const newValues: { id: string, label: string }[] = [];
		if (!selected && search.length > 0) {
			newValues.push(...findMatchingNodes(search, graph));
		}
		setValues(newValues);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search, sigma]);
	useEffect(() => {
		if (!selected) return;
		sigma.getGraph().setNodeAttribute(selected, 'highlighted', true);
		const nodeDisplayData = sigma.getNodeDisplayData(selected);
		if (nodeDisplayData) {
			sigma.getCamera().animate(nodeDisplayData, {
				easing: "linear",
				duration: 500,
			});
		}
		return () => {
			sigma.getGraph().setNodeAttribute(selected, 'highlighted', false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected]);
	const onInputChange = (searchString: string) => {
		// const searchString = e.target.value;
		const valueItem = values.find(value => value.label === searchString);
		if (valueItem) {
			setSearch(valueItem.label);
			setValues([]);
			setSelected(valueItem.id);
		} else {
			setSelected(null);
			setSearch(searchString);
		}
	}
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
			<Fab sx={{ position: 'absolute', right: theme.spacing(2), top: theme.spacing(2), zIndex: theme.zIndex.appBar }} color='secondary' onClick={showAddNode}><AddIcon /></Fab>
			<Box className={classes.floatingActions}>
				<ButtonGroup orientation='vertical' color='secondary' variant='contained'>
					<Button onClick={handleZoomIn}><ZoomInIcon /></Button>
					<Button onClick={handleZoomReset}><SearchIcon /></Button>
					<Button onClick={handleZoomOut}><ZoomOutIcon /></Button>
				</ButtonGroup>
			</Box>
			<Box className={classes.floatingSearch}>
				<Autocomplete
					disablePortal
					options={values}
					noOptionsText={search ===  '' ? 'Start typing to search' : selected ? 'Matched a node' : 'No match'}
					onInputChange={(__, v) => onInputChange(v)}
					sx={{ width: 300 }}
					renderInput={(params) => <TextField {...params} label="Search..." />} />
			</Box>
		</>
	);
}
