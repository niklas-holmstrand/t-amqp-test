import React from "react"
import { MACHINE_STATUS_STOPPED } from "../../../utils/utils"

const EngineData = ({machineStatus, batchId, layoutName, boardsCompleted, batchSize, componentsLeft, componentsPerBoard}) => {
  return (
    <React.Fragment>
      {machineStatus !== MACHINE_STATUS_STOPPED ?
        <div className='section section--wrap'>
          <div className='props'>
            <div className='props__label'>Layout</div>
            <div className='props__value'>{layoutName}</div>
          </div>
          <div className='props'>
            <div className='props__label'>Batch ID</div>
            <div className='props__value'>{batchId ? batchId : '-'}</div>
          </div>
          <div className='props'>
            <div className='props__label'>Boards</div>
            <div className='props__value'>
              <div className='props-data'>
                <div className='props-data__value'>{boardsCompleted}</div>
                {batchSize > 0 && <div className='props-data__sep'>/</div>}
                {batchSize > 0 && <div className='props-data__base'>{batchSize}</div>}
              </div>
            </div>
          </div>
          <div className='props'>
            <div className='props__label'>Components</div>
            <div className='props__value'>
              <div className='props-data'>
                <div className='props-data__value'>{componentsLeft}</div>
                <div className='props-data__sep'>/</div>
                <div className='props-data__base'>{componentsPerBoard}</div>
              </div>
            </div>
          </div>
        </div> : null}
    </React.Fragment>
  )
}

export default EngineData