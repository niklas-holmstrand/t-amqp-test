import React, { useState, useEffect } from 'react'
import { withApollo } from 'react-apollo'
import { useQuery, useSubscription } from "react-apollo-hooks";
import _ from "lodash"
import cn from 'classnames'
import {
  Button
} from '@material-ui/core'
import ErrorIcon from '@material-ui/icons/Error'
import HelpIcon from '@material-ui/icons/Help'
import BlockIcon from '@material-ui/icons/Block'


import {
  QUERY_NOTIFICATIONS,
  SUBSCRIPTION_NOTIFICATIONS,
  MUTATION_LOADBOARD,
  MUTATION_REMOVEBOARD,
  MUTATION_UNLOADANYLOADEDBOARD
} from '../../utils/graphql'

import {
  NOTIFICATION_SEVERITY_OPERATORALERT,
  NOTIFICATION_SEVERITY_QUERY,
  NOTIFICATION_TYPE_COMPONENTNOTAVAILABLE,
  NOTIFICATION_TYPE_LOADBOARD,
  NOTIFICATION_TYPE_REMOVEBOARD,
  NOTIFICATION_TYPE_UNLOADBOARD,
  NOTIFICATION_TYPE_IOCONVEYORERRORLEFT,
  NOTIFICATION_TYPE_IOCONVEYORERRORRIGHT,
  NOTIFICATION_TYPE_TIMEFORPREVENTIVEMAINTENANCE,
  NOTIFICATION_TYPE_VISIONDISABLED,
  MessageDialog
} from '../../utils/utils'

const CoffeCupSmile = () =>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" x="0px" y="0px">
    <path
      d="M336.4,122.74C303.72,114.5,261.74,110,218.19,110S132.66,114.5,100,122.74c-37.35,9.41-55.51,21.5-55.51,37s17.84,26,56.14,33.07c30.16,5.55,71.91,8.6,117.58,8.6s87.42-3.05,117.58-8.6c38.3-7,56.14-17.56,56.14-33.07S373.75,132.15,336.4,122.74Z"/>
    <path
      d="M507.26,226.82c-5.63-21.75-22.63-36.14-49.16-41.6a122.14,122.14,0,0,0-24.05-2.37c1.57-19.33,1.33-31.64,1.31-32.24h0c-.1-15.7-12-38-67.66-55.57-40.08-12.65-93.18-19.61-149.51-19.61S108.76,82.39,68.68,95C13,112.62,1.12,134.91,1,150.61H1c0,1.51-.69,37.48,8.42,83.87C17.91,277.66,36.87,338.18,79,381.25c35.92,36.71,82.75,55.32,139.17,55.32,69.71,0,124.22-28.06,162.09-83.39,19-1.65,85.15-10.26,115.46-51.33C510.94,281.26,514.81,256,507.26,226.82Zm-27.58,63.11c-29.17,39.58-104.68,43.6-105.44,43.64a2.85,2.85,0,0,0-.41,0c-.12,0-.23,0-.34,0s-.46.06-.69.11l-.24.05c-.25.05-.49.12-.73.19l-.18.05c-.25.08-.5.17-.74.27l-.16.07c-.24.1-.47.21-.7.33l-.18.1c-.22.12-.43.25-.64.39l-.2.13-.58.43-.2.17c-.19.16-.36.32-.53.48l-.18.18c-.18.19-.36.38-.52.58l-.12.15a7.17,7.17,0,0,0-.52.71l0,.06c-34,52.08-83.89,78.48-148.15,78.48-50.81,0-92.81-16.57-124.82-49.25C54.74,327.89,37.12,271.48,29.15,231.1,20.38,186.73,21,151.39,21,151v-.22c0-23.13,75-55.39,197.18-55.39s197.18,32.26,197.18,55.39V151a366.78,366.78,0,0,1-2.29,41.25v.07c0,.22,0,.44,0,.65s0,.26,0,.39,0,.33,0,.49,0,.37,0,.56a.22.22,0,0,0,0,.08,2.68,2.68,0,0,0,0,.3c0,.21.06.41.1.61s.07.27.1.41l.15.53c.05.16.11.31.17.46s.11.3.17.45.15.32.22.47l.2.39c.09.16.18.31.28.46s.15.25.23.37l.3.41c.1.13.19.25.29.36s.2.24.31.35a4.12,4.12,0,0,0,.35.37l.31.29.42.37.3.22.48.35.31.19.52.3.35.17.51.23.45.17.45.15a5.29,5.29,0,0,0,.57.15l.37.09.66.1.25,0h.08l.69,0,.3,0h.08l.34,0c.23,0,.45,0,.68-.05h.07c.55-.07,54.71-6.13,63.69,28.55C494,255.21,491.26,274.22,479.68,289.93Z"/>
    <path
      d="M438.18,219.84a81.73,81.73,0,0,0-22.45.61l-.07,0-.71.17-.28.08-.59.2-.37.14-.43.2-.47.23-.29.17L412,222l-.23.18-.54.4c-.09.07-.17.16-.26.24s-.3.26-.44.4a4,4,0,0,0-.34.37l-.3.33-.36.47-.21.29c-.11.16-.21.33-.31.5s-.14.22-.2.33-.14.3-.22.45l-.21.45a3.82,3.82,0,0,0-.13.36,5.89,5.89,0,0,0-.21.59c0,.09,0,.18-.08.28s-.12.47-.17.71a.25.25,0,0,1,0,.07,359.62,359.62,0,0,1-17.86,63.27,1.18,1.18,0,0,1-.07.2,10.21,10.21,0,0,0-.71,3.46,10,10,0,0,0,9.76,10.23H400a135.57,135.57,0,0,0,23.39-2.19c18.67-3.45,32.28-10.39,40.45-20.62,5.66-7.07,11.41-19.42,6.72-38.06C467.06,230.8,455.57,222,438.18,219.84Zm10.05,50.43c-7.08,8.89-22.3,12.85-34.53,14.42a391.16,391.16,0,0,0,12.23-45.23c8.55-.46,22.77.32,25.24,10.12C453.35,258.28,452.39,265.05,448.23,270.27Z"/>
    <path
      d="M282.38,255.65a27.58,27.58,0,0,0-27.55,27.55,10,10,0,0,0,20,0,7.56,7.56,0,0,1,15.11,0,10,10,0,0,0,20,0A27.58,27.58,0,0,0,282.38,255.65Z"/>
    <path
      d="M145.61,255.65a27.58,27.58,0,0,0-27.55,27.55,10,10,0,0,0,20,0,7.56,7.56,0,0,1,15.11,0,10,10,0,0,0,20,0A27.58,27.58,0,0,0,145.61,255.65Z"/>
    <path
      d="M247.54,312.42a10,10,0,0,0-9.56,7.05c-.69,1.82-5.77,13.41-24,13.41s-23.3-11.59-24-13.41a10,10,0,1,0-19,6.13h0c.36,1.11,9.14,27.27,43,27.27s42.66-26.16,43-27.27h0a9.82,9.82,0,0,0,.53-3.18A10,10,0,0,0,247.54,312.42Z"/>
  </svg>

const NotificationIcon = ({severity}) => {
  if (severity === NOTIFICATION_SEVERITY_OPERATORALERT)
    return <ErrorIcon/>
  if (severity === NOTIFICATION_SEVERITY_QUERY)
    return <BlockIcon/>

  return <HelpIcon/>
}

const ComponentNotAvailable = ({data}) =>
  <React.Fragment>
    <div className='not__main'>Component <span>{_.head(_.split(data, ','))}</span> is not available</div>
    <div className='not__data'>Missing quantity: <span>{_.last(_.split(data, ','))}</span></div>
  </React.Fragment>

const ConfirmBoardLoaded = withApollo(({client, machineId}) => {
  const loadBoard = (confirm) => {
    const mutationLoadBoard = client.mutate({mutation: MUTATION_LOADBOARD, variables: {machineId: machineId, ok: confirm}})
    mutationLoadBoard.then(res => {
        if (_.has(res, 'data.NQR_LoadBoard.errCode') && !_.isNull(res.data.NQR_LoadBoard.errCode) && res.data.NQR_LoadBoard.errCode !== 0) {
          const _msg = 'Failed to confirm board has been loaded!'
          console.log(_msg, machineId, res.data.NQR_LoadBoard.errMsg)
          setErrMsg(_msg)
          setHasError(true)
        }
      }
    )
  }

  // simple error dialog
  const [hasError, setHasError] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const closeErrorDialog = () => {
    setHasError(false)
    setErrMsg(null)
  }

  return (
    <React.Fragment>
      <MessageDialog open={hasError}
                     close={closeErrorDialog}
                     title={errMsg}/>
      <Button variant={"outlined"} size={"small"} color={"primary"} onClick={() => loadBoard(true)}>Board loaded</Button>
      <Button variant={"outlined"} size={"small"} color={"secondary"} onClick={() => loadBoard(false)}>Cancel</Button>
    </React.Fragment>
  )
})

const ConfirmBoardRemoved = withApollo(({client, machineId}) => {
  const removeBoard = () => {
    const mutationRemoveBoard = client.mutate({mutation: MUTATION_REMOVEBOARD, variables: {machineId: machineId}})
    mutationRemoveBoard.then(res => {
        if (_.has(res, 'data.NQR_RemoveBoard.errCode') && !_.isNull(res.data.NQR_RemoveBoard.errCode) && res.data.NQR_RemoveBoard.errCode !== 0) {
          const _msg = 'Failed to confirm board has been removed!'
          console.log(_msg, machineId, res.data.NQR_RemoveBoard.errMsg)
          setErrMsg(_msg)
          setHasError(true)
        }
      }
    )
  }

  // simple error dialog
  const [hasError, setHasError] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const closeErrorDialog = () => {
    setHasError(false)
    setErrMsg(null)
  }

  return (
    <React.Fragment>
      <MessageDialog open={hasError}
                     close={closeErrorDialog}
                     title={errMsg}/>
      <Button variant={"outlined"} size={"small"} color={"primary"} onClick={removeBoard}>Board removed</Button>
    </React.Fragment>
  )
})

const ConfirmUnloadAnyBoard = withApollo(({client, machineId}) => {
  const unloadAnyBoard = (ok, boardToUnloadExists) => {
    const mutationUnloadAnyBoard = client.mutate({mutation: MUTATION_UNLOADANYLOADEDBOARD, variables: {machineId: machineId, ok: ok, boardToUnloadExists: boardToUnloadExists}})
    mutationUnloadAnyBoard.then(res => {
        if (_.has(res, 'data.NQR_UnloadAnyLoadedBoard.errCode') && !_.isNull(res.data.NQR_UnloadAnyLoadedBoard.errCode) && res.data.NQR_UnloadAnyLoadedBoard.errCode !== 0) {
          const _msg = 'Failed to unload any board!'
          console.log(_msg, machineId, res.data.NQR_UnloadAnyLoadedBoard.errMsg)
          setErrMsg(_msg)
          setHasError(true)
        }
      }
    )
  }

  // simple error dialog
  const [hasError, setHasError] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const closeErrorDialog = () => {
    setHasError(false)
    setErrMsg(null)
  }

  return (
    <React.Fragment>
      <MessageDialog open={hasError}
                     close={closeErrorDialog}
                     title={errMsg}/>
      <Button variant={"outlined"} size={"small"} color={"primary"} onClick={() => unloadAnyBoard(true, true)}>Unload board</Button>
      <Button variant={"outlined"} size={"small"} color={"secondary"} onClick={() => unloadAnyBoard(true, false)}>No board to unload</Button>
      <Button variant={"outlined"} size={"small"} onClick={() => unloadAnyBoard(false, false)}>Cancel</Button>
    </React.Fragment>
  )
})

const NotificationBody = ({notification}) => {
  const {machineId, severity, type, runtimeData} = notification

  if (type === NOTIFICATION_TYPE_COMPONENTNOTAVAILABLE)
    return <ComponentNotAvailable data={runtimeData}/>
  if (type === NOTIFICATION_TYPE_LOADBOARD)
    return <React.Fragment>
      <div className='not__main'>Waiting for operator to load board!</div>
      <div className='not__descr'>Confirm when board has been loaded to continue or cancel to pause machine.</div>
      <div className='not__action'>
        <ConfirmBoardLoaded machineId={machineId} />
      </div>
    </React.Fragment>
  if (type === NOTIFICATION_TYPE_REMOVEBOARD)
    return <React.Fragment>
      <div className='not__main'>Waiting for operator to remove board!</div>
      <div className='not__descr'>Confirm when board has been removed to continue.</div>
      <div className='not__action'>
        <ConfirmBoardRemoved machineId={machineId} />
      </div>
    </React.Fragment>
  if (type === NOTIFICATION_TYPE_UNLOADBOARD)
    return <React.Fragment>
      <div className='not__main'>Waiting for operator!</div>
      <div className='not__descr'>Unload any loaded board from the Y-wagon conveyor?</div>
      <div className='not__action'>
        <ConfirmUnloadAnyBoard machineId={machineId} />
      </div>
    </React.Fragment>
  if (type === NOTIFICATION_TYPE_IOCONVEYORERRORLEFT)
    return <React.Fragment>
      <div className='not__main'>Error in the <span>left</span> IO-conveyor system!</div>
      <div className='not__descr'>This needs to be handled manually</div>
    </React.Fragment>
  if (type === NOTIFICATION_TYPE_IOCONVEYORERRORRIGHT)
    return <React.Fragment>
      <div className='not__main'>Error in the <span>right</span> IO-conveyor system!</div>
      <div className='not__descr'>This needs to be handled manually</div>
    </React.Fragment>
  if (type === NOTIFICATION_TYPE_TIMEFORPREVENTIVEMAINTENANCE)
    return <div className='not__main'>Time for preventive maintenance</div>
  if (type === NOTIFICATION_TYPE_VISIONDISABLED)
    return <React.Fragment>
      <div className='not__main'>Optical vision disabled</div>
      <div className='not__descr'>Expect bad accuracy</div>
    </React.Fragment>

  return <React.Fragment>
    <div className='not__main'>Severity: {severity}</div>
    <div className='not__descr'>Type: {type}</div>
    <div className='not__data'>Data: {runtimeData}</div>
  </React.Fragment>
}

const Notifications = () => {
  const [nots, setNots] = useState([])
  const [loaded, setLoaded] = useState(false)
  const {loading, data, error} = useQuery(QUERY_NOTIFICATIONS, {suspend: false, fetchPolicy: 'network-only'})
  const sNots = useSubscription(SUBSCRIPTION_NOTIFICATIONS)

  useEffect(() => {
    if (error) console.log(error)
    if (!loading && !_.isEmpty(data)) {
      setLoaded(!loading)
      setNots(_.orderBy(data.notifications, ['severity'], ['desc']) || [])
    }
  }, [error, loading])

  useEffect(() => {
    if (sNots.error) console.log(sNots.error)
    if (!sNots.loading && !_.isEmpty(sNots.data)) setNots(_.orderBy(sNots.data.notifications, ["severity"], ["desc"]) || [])
  }, [sNots.data, sNots.error, sNots.loading])

  const hasNots = !_.isEmpty(nots)

  // console.log('notifications ' + (!_.isEmpty(nots) ? 'yes': 'no'))

  return (
    <div className={cn('notification-page', {'notification-page--loading' : !loaded})}>
      {loaded && hasNots && <div className='not-wrapper'>
        {_.map(nots, (not, i) =>
          <div className='not' key={i}>
            <div className='not__severity'>
              <NotificationIcon severity={not.severity}/>
            </div>
            <div className='not__body'>
              <NotificationBody notification={not}/>
            </div>
            <div className='not__machine'>
              {not.machineName}
            </div>
          </div>
        )}
      </div>}
      {loaded && !hasNots && <div className='not-none'>
        <CoffeCupSmile/>
        <div className='not-none__header'>Great job - take a break!</div>
        <div className='not-none__message'>No notification right now</div>
      </div>}
    </div>
  )
}

export default Notifications