import { useContext } from 'react';
import {RouteProps, Redirect, Route, useLocation} from 'react-router-dom';
import { appContext } from '../App';

export const AuthRoute: React.FC<RouteProps> = (props) => {
	const location = useLocation<{ from: string }>();
	const { connected } = useContext(appContext);
	if (connected) {
		if (location.state && location.state.from !== "/logout") return <Redirect to={{ pathname: location.state.from }} />
		else return <Redirect to={{ pathname: '/' }} />;
	}
	else return <Route {...props} />;
}
