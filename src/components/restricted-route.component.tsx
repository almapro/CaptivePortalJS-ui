import { FC, useContext } from "react";
import { Redirect, Route, RouteProps, useLocation } from "react-router-dom";
import { appContext } from "../App";
import { AppBarComponent } from './app-bar.component';

export const RestrictedRoute: FC<RouteProps> = (props) => {
	const { connected } = useContext(appContext);
	const location = useLocation();
	return connected ? (<>
		<AppBarComponent title='Captive Portal' />
		<Route {...props} />
	</>) : <Redirect to={{ pathname: '/login', state: { from: location.pathname } }} />;
}
