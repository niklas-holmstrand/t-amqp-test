import React, {useState, useEffect} from 'react'

import withStyles from '@material-ui/core/styles/withStyles'
import { withRouter } from 'react-router-dom'
import _ from "lodash"

import {
  AppBar,
  Tabs,
  Tab
} from '@material-ui/core'

import { styles } from '../styles/mui-styles'


const TopBar = ({classes, history, location, width}) => {
  const [selected, setSelected] = useState(false)

  useEffect(() => {
    let selectedTab = 0
    switch (_.head(_.filter(_.split(location.pathname, '/'), e => !_.isEmpty(e)))) {
      case 'image-stitching':
        selectedTab = 3
        break
      case 'feeder-trimming':
        selectedTab = 2
        break
      case 'notifications':
        selectedTab = 1
        break
      default:
        selectedTab = 0
    }
    setSelected(selectedTab)
  }, [location.pathname])


  return (
    <AppBar position='fixed' elevation={0} className={classes.appBar}>
      <Tabs value={selected} classes={{indicator: classes.indicator}}>
        <Tab onClick={() => history.push({pathname: '/factory'})} label={'Factory'} />
        <Tab onClick={() => history.push({pathname: '/notifications'})} label={'Notifications'} />
        <Tab onClick={() => history.push({pathname: '/feeder-trimming'})} label={'Feeder Trimming'} />
        <Tab onClick={() => history.push({pathname: '/image-stitching'})} label={'Image Stitching'} />
      </Tabs>
      <span className='debug__screenwidth'>{width}</span>
    </AppBar>
  )
}

export default withStyles(styles)(withRouter(TopBar))