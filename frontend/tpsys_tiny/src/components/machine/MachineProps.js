import React from 'react'
import _ from "lodash"
import cn from 'classnames'

import MachineInfo from './components/MachineInfo'
import MachineControl from './components/MachineControl'
import EngineData from './components/EngineData'
import Magazines from './components/Magazines'

import { MACHINE_STATUS_OFFLINE } from "../../utils/utils";

const MachineProps = ({loaded = false, machine = {}, engine = {}, machineStatus = MACHINE_STATUS_OFFLINE, notifications = [], onLine = false}) => {
  return (
    <div className={cn('props-wrapper', {'props-wrapper--loading': !loaded})}>
      <div className='loader'/>
      <div className='section section--header'>
        <MachineInfo machine={machine}
                     machineStatus={machineStatus}
                     onLine={onLine}
                     notifications={notifications} />
      </div>

      {onLine && !_.isEmpty(engine) &&
      <EngineData
        machineStatus={machineStatus}
        layoutName={engine.layoutName}
        batchId={engine.batchId}
        batchSize={engine.batchSize}
        boardsCompleted={engine.boardsCompleted}
        componentsLeft={engine.componentsLeft}
        componentsPerBoard={engine.componentsPerBoard}/>}

      {onLine && <Magazines machineId={machine.id}/>}

      {onLine && <MachineControl machineId={machine.id} machineStatus={machineStatus}/>}
    </div>
  )
}

export default MachineProps

