import {
  Grid,
  FormControl,
  OutlinedInput,
  InputLabel,
  InputAdornment,
  Button,
  Paper,
  useTheme,
IconButton,
} from '@material-ui/core';
import {
	WbSunny as WbSunnyIcon,
	Bedtime as BedtimeIcon,
    VisibilityOff as VisibilityOffIcon,
    Visibility as VisibilityIcon,
} from '@material-ui/icons';
import { useContext, useRef, useState } from 'react';
import { appContext } from '../App';

export const LoginView = () => {
  const { darkMode, toggleDarkMode } = useContext(appContext);
  const accessCodeRef = useRef<HTMLInputElement>();
  const [showAccessCode, setShowAccessCode] = useState(false);
  const theme = useTheme();
  const handleOnSubmit: React.FormEventHandler = (e) => {
    e.preventDefault();
    //
  }
  return (
    <Grid
      container
      spacing={0}
      direction='column'
      alignItems='center'
      justifyContent='center'
      style={{ minHeight: '100vh' }}>
      <Paper style={{ padding: theme.spacing(3) }} elevation={3}>
        <form onSubmit={handleOnSubmit}>
          <Grid container spacing={3}>
            <Grid container item xs={12} alignItems='center' direction='column' justifyContent='center'>
              <IconButton
                color='inherit'
                edge='end'
                onClick={() => toggleDarkMode()}>
                {
                      !darkMode ?
                    <WbSunnyIcon /> :
                    <BedtimeIcon />
                }
              </IconButton>
            </Grid>
            <Grid item xs={12}>
              <FormControl required fullWidth variant="outlined">
                <InputLabel htmlFor="accessCode">Access Code</InputLabel>
                <OutlinedInput
                  inputRef={accessCodeRef}
                  id="accessCode"
                  type={showAccessCode ? 'text' : 'password'}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowAccessCode(!showAccessCode)}
                        edge="end">
                        {showAccessCode ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label="Access Code"
                />
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button fullWidth type='submit' variant='contained'>Login</Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Grid>
  )
}
