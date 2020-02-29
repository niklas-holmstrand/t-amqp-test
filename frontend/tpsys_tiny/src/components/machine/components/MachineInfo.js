import { MACHINE_STATUS_OFFLINE } from '../../../utils/utils'
import _ from 'lodash'
import cn from 'classnames'
import { withRouter } from 'react-router-dom'
import IconButton from "@material-ui/core/IconButton"
import NotificationImportantIcon from '@material-ui/icons/Notifications'
import React from "react";

// TODO: Maybe split into two components for readability...
const MachineInfo = ({history, machine = {}, layoutName = '', machineStatus = MACHINE_STATUS_OFFLINE, onLine = false, notifications = [], showAll = true}) =>
  <div className={cn('props', {'props--link' : !showAll})} onClick={!showAll ? () => {history.push('/factory/machine/' + machine.id)} : null}>
    <div className='props__value'>
      {machine.name}
      <span
        className={'machine-props__bulb machine-props__bulb--' + _.replace(_.lowerCase(machineStatus), ' ', '')}/>
      <span
        className={'machine__status machine__status--' + _.replace(_.lowerCase(machineStatus), ' ', '')}>{machineStatus}</span>
    </div>
    <div className={cn('props__secondary', {'props__secondary--flex': !showAll})}>
      <span>{showAll && machine.snr} {machine.model}</span>
      {!showAll && layoutName && <span style={{textTransform: 'initial'}}>{layoutName}</span>}
    </div>
    {showAll && onLine && notifications.length > 0 &&
    <IconButton className='machine__btn-not'
                onClick={() => history.push('/notifications/machine/id=' + machine.id)}><NotificationImportantIcon/></IconButton>}
  </div>


export default withRouter(MachineInfo)