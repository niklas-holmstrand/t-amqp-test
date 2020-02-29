import React from "react"
import { Link } from 'react-router-dom'
import cn from 'classnames'
import BoardProgress from './components/BoardProgress'
import { MACHINE_STATUS_OFFLINE } from "../../utils/utils";

const MachineCard = ({loaded = false, machine = {}, engine = {}, machineStatus = MACHINE_STATUS_OFFLINE, notifications = [], selected = false, onLine = false}) => {
  return (
    <Link replace={selected}
          to={'/factory/machine/' + machine.id}
          className={cn('machine',
            {'machine--offline': !machine.connected},
            {'machine--loading': !loaded},
            {'machine--selected': selected})}>
      <div className='machine__place'>
        {machine.role} #{machine.placeInLine+1}
      </div>
      <div className='machine__progress'>
        <BoardProgress status={machineStatus}
                       role={machine.role}
                       componentsLeft={engine.componentsLeft}
                       componentsPerBoard={engine.componentsPerBoard}/>
      </div>
      <div className='machine__label'>
        <span className='machine__name'>{machine.name}</span><i className={'machine__state machine__state--' + machineStatus.toLowerCase()} />
      </div>

      {onLine && notifications.length > 0 && <div className='machine__notification'/>}
    </Link>
  )
}

export default MachineCard