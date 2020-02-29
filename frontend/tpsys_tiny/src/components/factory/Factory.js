import React, { useState, useEffect } from 'react'
import { Route, Switch, Redirect, withRouter } from 'react-router-dom'
import _ from 'lodash'
import cn from 'classnames'
import { useQuery } from 'react-apollo-hooks'
import CloseIcon from '@material-ui/icons/Close'
import { withStyles } from '@material-ui/core/styles'
import {
  AppBar,
  Hidden,
  IconButton,
  Drawer
} from '@material-ui/core'


import { QUERY_PRODUCTIONLINES } from './../../utils/graphql'
import Line from '../line/Line'
import LineProps from '../line/LineProps'
import Machine from '../machine/Machine'
import { styles } from '../../styles/mui-styles'


const FactoryLines = () => {
  const [loaded, setLoaded] = useState(false)
  const [lines, setLines] = useState([])
  const {data, error, loading} = useQuery(QUERY_PRODUCTIONLINES)

  useEffect(() => {
    if (error)
      console.log(error)

    setLoaded(!loading)
    if (!loading) {
      setLines(data.productionLines)
    }
  }, [error, loading])

  return (
    <div className='factory__lines'>
      {loaded && _.map(lines, (line, i) => <Line key={i} line={line} order={i + 1}/>)}
    </div>
  )
}

const DrawerBody = () => {
  return (
    <Switch>
      <Route path="/factory/line/:name" component={LineProps}/>
      <Route path="/factory/machine/:id"
             render={(props) => <Machine machineId={parseInt(props.match.params.id)} layout='props'/>}/>
      <Redirect from="/factory/machine" to="/factory"/>
      <Redirect from="/factory/line" to="/factory"/>
    </Switch>
  )
}

const Factory = (props) => {
  const {location, history, classes} = props
  const [isOpen, setIsOpen] = useState(false)
  const [pathName, setPathName] = useState('')
  const [headline, setHeadline] = useState('')

  function closeProps() {
    setIsOpen(false)
    setTimeout(() => history.push({pathname: '/factory', state: { transition: '', duration: 0 }}), 250)
  }

  useEffect(() => {
    // if diff from prev
    if (pathName !== location.pathname) {
      setIsOpen(false)
      setPathName(location.pathname)
      setHeadline('')

      setTimeout(() => {
        const path = _.nth(_.split(location.pathname, '/'), -2)
        if (path === 'machine' || path === 'line') {
          setHeadline(path)
          setIsOpen(true)
        }
      }, 250)
    }
  }, [location.pathname])

  return (
    <div className='factory'>
      <FactoryLines/>
      <Hidden xsDown implementation='css'>
        <Drawer
          variant='persistent'
          anchor='right'
          open={isOpen}
          className={classes.drawer}
          classes={{
            paper: classes.drawerPaper,
          }}
        >
          <div className={classes.modalNavBar}>
            <div className='drawer__header'>{headline} properties</div>
            <IconButton onClick={closeProps}>
              <CloseIcon/>
            </IconButton>
          </div>
          <DrawerBody {...props} />
        </Drawer>
      </Hidden>
      <Hidden smUp implementation='css'>
        <div className={cn('page', {'page--show': isOpen})}>
          <AppBar position='fixed' elevation={0} className={classes.modalNavBar}>
            <div className='drawer__header'>{headline} properties</div>
            <IconButton onClick={closeProps}>
              <CloseIcon/>
            </IconButton>
          </AppBar>
          <div className='page__body'>
            <DrawerBody {...props} />
          </div>
        </div>
      </Hidden>
    </div>
  )
}

export default withRouter(withStyles(styles)(Factory))