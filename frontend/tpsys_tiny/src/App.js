import React from 'react'
import { Route, Switch, Redirect } from 'react-router-dom'
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles'
import { CssBaseline } from '@material-ui/core'

import Factory from './components/factory/Factory'
import TopBar from './components/TopBar'
import Notifications from './components/notifications/Notifications'
import FeederTrimming from './components/feederTrimming/FeederTrimming'
import ImageStitching from './components/imageStitching/ImageStitching'

const theme = createMuiTheme({
  // palette: {
  //   primary: {
  //     main: colors.gray3,
  //   },
  //   secondary: {
  //     main: colors.gray8,
  //   },
  //   background: {
  //     default: colors.siteBg,
  //   },
  // },
  typography: {
    useNextVariants: true,
    fontFamily: [
      '"Montserrat"',
      'sans-serif'
    ].join(',')
  },
  overrides: {
    MuiTab: {
      root: {
        // textTransform: 'initial',
        // fontSize: '1rem!important',
        // fontWeight: '600!important'
      }
    }
  }
})

const App = () => {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline/>
      <TopBar/>
      <Switch>
        <Route path='/factory' component={Factory}/>
        <Route path='/notifications' component={Notifications}/>
        <Route path='/feeder-trimming' component={FeederTrimming}/>
        <Route path='/image-stitching' component={ImageStitching}/>
        <Redirect from='/' to='/factory'/>
      </Switch>
    </MuiThemeProvider>
  )
}

export default App
