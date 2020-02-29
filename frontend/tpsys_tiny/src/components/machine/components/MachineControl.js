import React, { useState } from 'react'
import { useMutation } from 'react-apollo-hooks'
import cn from 'classnames'
import _ from 'lodash'

import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import PauseIcon from '@material-ui/icons/Pause'
import StopIcon from '@material-ui/icons/Stop'
import AddIcon from '@material-ui/icons/Add'
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch
} from '@material-ui/core'

import {
  MACHINE_STATUS_OFFLINE,
  MACHINE_STATUS_PAUSED,
  MACHINE_STATUS_RUNNING,
  MACHINE_STATUS_STOPPED,
  MessageDialog,
  LoadLayoutDialog, ConfirmDialog
} from '../../../utils/utils'

import {
  MUTATION_PLAY,
  MUTATION_PAUSE,
  MUTATION_STOP,
  MUTATION_STARTBATCH,
  MUTATION_SWITCHTOTUI
} from '../../../utils/graphql'

const PlayButton = ({machineId, disabled}) => {
  const [loading, setLoading] = useState(false)
  const mutationPlay = useMutation(MUTATION_PLAY, {variables: {machineId: machineId}})

  const play = () => {
    setLoading(true)
    mutationPlay().then(res => {
      if (_.has(res, 'data.play.errCode') && !_.isNull(res.data.play.errCode) && res.data.play.errCode !== 0) {
        console.log('Failed to play. Error ', res.data.play.errMsg)
        // TODO: Alert dialog with message to user
      }
      setLoading(false)
    })
  }

  return (
    <IconButton disabled={disabled} className={cn('ctrl-action', {'ctrl-action--loading': loading})}
                onClick={play}><PlayArrowIcon/></IconButton>
  )
}

const PauseButton = ({machineId, disabled}) => {
  const [loading, setLoading] = useState(false)
  const mutationPause = useMutation(MUTATION_PAUSE, {variables: {machineId: machineId}})

  const pause = () => {
    setLoading(true)
    mutationPause().then(res => {
      if (_.has(res, 'data.pause.errCode') && !_.isNull(res.data.pause.errCode) && res.data.pause.errCode !== 0) {
        console.log('Failed to pause. Error ', res.data.pause.errMsg)
        // TODO: Alert dialog with message to user
      }
      setLoading(false)
    })
  }

  return (
    <IconButton disabled={disabled} className={cn('ctrl-action', {'ctrl-action--loading': loading})}
                onClick={pause}><PauseIcon/></IconButton>
  )
}

const StopButton = ({machineId, disabled}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const mutationStop = useMutation(MUTATION_STOP, {variables: {machineId: machineId}})

  function closeDialog() {
    setIsOpen(!isOpen)
  }

  function stop() {
    mutationStop().then(res => {
      if (_.has(res, 'data.stop.errCode') && !_.isNull(res.data.stop.errCode) && res.data.stop.errCode !== 0) {
        setHasError(true)
        setErrMsg(res.data.stop.errMsg)
      } else
        closeDialog()
    })
  }

  return (
    <React.Fragment>
      <Dialog
        open={isOpen}
        onClose={closeDialog}
      >
        <DialogTitle>
          {hasError ? 'Failed to stop' : 'Are you sure you want to stop batch?'}
        </DialogTitle>
        {hasError && <DialogContent>Error: {errMsg}</DialogContent>}
        <DialogActions>
          <Button onClick={closeDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={stop} color="primary" autoFocus>
            {hasError ? 'Retry' : 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>
      <IconButton disabled={disabled}
                  className='ctrl-action ctrl-action--small'
                  onClick={() => {
                    setIsOpen(!isOpen)
                  }}><StopIcon/>
      </IconButton>
    </React.Fragment>
  )
}

const NewLayoutButton = ({machineId, secondary = false, disabled = false}) => {
  const [layoutName, setLayoutName] = useState('')
  const [batchId, setBatchId] = useState('')
  const [batchSize, setBatchSize] = useState('')

  // main dialog
  const [isOpen, setIsOpen] = useState(false)
  const closeDialog = () => {
    setIsOpen(!isOpen)
  }
  const openDialog = () => {
    // clean up first
    setLayoutName('')
    setBatchId('')
    setBatchSize('')

    setIsOpen(true)
  }

  // actions
  const mutationStartBatch = useMutation(MUTATION_STARTBATCH,
    {
      variables: {
        machineId: machineId, layoutName: layoutName, batchId: batchId, batchSize: parseInt(batchSize)
      }
    })
  const startBatch = () => {
    mutationStartBatch().then(res => {
      if (_.has(res, 'data.startBatch.errCode') && !_.isNull(res.data.startBatch.errCode) && res.data.startBatch.errCode !== 0) {
        setErrMsg(res.data.startBatch.errMsg)
        setHasError(true)
      } else
        closeDialog()
    })
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
                     title={'Failed to load new layout'}
                     content={errMsg} />
      <LoadLayoutDialog open={isOpen}
                        close={closeDialog}
                        action={startBatch}
                        layoutName={layoutName}
                        setLayoutName={setLayoutName}
                        batchId={batchId}
                        setBatchId={setBatchId}
                        batchSize={batchSize}
                        setBatchSize={setBatchSize} />
      <IconButton disabled={disabled}
                  className={cn('ctrl-action', {'ctrl-action--small': secondary})}
                  onClick={openDialog}>
        <AddIcon/>
      </IconButton>
    </React.Fragment>
  )
}

const TuiSwitch = ({machineId}) => {
  const [tui, setTui] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const mutationSwitch = useMutation(MUTATION_SWITCHTOTUI, {variables: {machineId: machineId}})

  const closeDialog = () => {
    setTui(false)
    setIsDialogOpen(false)
  }
  const openDialog = () => {
    setTui(true)
    setIsDialogOpen(true)
  }

  const switchToTUI = () => {
    mutationSwitch().then(res => {
      if (_.has(res, 'data.switchToTUI.errCode') && !_.isNull(res.data.switchToTUI.errCode) && res.data.switchToTUI.errCode !== 0) {
        const _msg = 'Failed to switch to TUI.'
        console.log(_msg, machineId)
        setErrMsg(_msg)
        setHasError(true)
        closeDialog()
      }
    })
  }

  // simple error dialog
  const [hasError, setHasError] = useState(false)
  const [errMsg, setErrMsg] = useState(null)
  const closeErrorDialog = () => {
    setHasError(false)
    setErrMsg(null)
  }

  return (
    <div className='ctrl-panel__switch'>
      <MessageDialog open={hasError}
                     close={closeErrorDialog}
                     title={errMsg}/>
      <ConfirmDialog open={isDialogOpen}
                     close={closeDialog}
                     action={switchToTUI}
                     title={'Are you sure you want to switch to TUI?'}
                     content={'This action will disconnect the machine and set it off-line.'} />
      <span className='ctrl-panel__label'>TUI</span>
      <Switch className='ctrl-switch' color="primary" checked={tui} onChange={openDialog}/>
    </div>
  )
}

const MachineControl = ({machineId, machineStatus}) => {
  const offline = machineStatus === MACHINE_STATUS_OFFLINE
  const paused = machineStatus === MACHINE_STATUS_PAUSED
  const running = machineStatus === MACHINE_STATUS_RUNNING
  const stopped = machineStatus === MACHINE_STATUS_STOPPED
  const active = running || paused

  return (
    <React.Fragment>
      {!offline &&
      <div className='ctrl-panel'>
        {stopped && <NewLayoutButton machineId={machineId}/>}
        {running && <PauseButton machineId={machineId}/>}
        {paused && <PlayButton machineId={machineId}/>}
        {active && <StopButton disabled={running} machineId={machineId}/>}
        <TuiSwitch machineId={machineId}/>
      </div>}
    </React.Fragment>
  )
}

export default MachineControl