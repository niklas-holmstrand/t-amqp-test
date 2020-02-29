import React, { useEffect, useState } from 'react'
import { withApollo } from 'react-apollo'
import { withRouter } from 'react-router-dom'
import { useQuery } from "react-apollo-hooks"
import cn from 'classnames'
import _ from 'lodash'
import {
  IconButton
} from "@material-ui/core";
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import PauseIcon from '@material-ui/icons/Pause'
import StopIcon from '@material-ui/icons/Stop'
import AddIcon from "@material-ui/icons/Add"

import {
  ConfirmDialog,
  LoadLayoutDialog,
  MessageDialog
} from '../../utils/utils'
import {
  MUTATION_PLAY,
  MUTATION_PAUSE,
  MUTATION_STOP,
  MUTATION_STARTBATCH,
  QUERY_LINE
} from "../../utils/graphql"

import Machine from "../machine/Machine"

const PlayButton = withApollo(({client, machines}) => {
  const [loading, setLoading] = useState(false)

  const play = () => {
    setLoading(true)

    const playMachine = async(machineId) => {
      const mutation = await client.mutate({mutation: MUTATION_PLAY, variables: {machineId: machineId}})
      return {machineId, mutation}
    }

    const delayPlay = (machineId, placeInLine) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(playMachine(machineId))
        }, placeInLine * 1000)
      })
    }

    const machinePromises = _.map(_.filter(machines, 'connected'), machine => delayPlay(machine.id, machine.placeInLine).catch(e => e))

    Promise.all(machinePromises)
    .then(response => {
       const fails = _.filter(response, item => {
        return _.has(item, 'mutation.data.play.errCode') && !_.isNull(item.mutation.data.play.errCode) && item.mutation.data.play.errCode !== 0
      })

      if (fails.length > 0) {
        const failMsg =  'Unable to play ' + (fails.length) + ' machine' + (fails.length > 1 ?  's' : '') + '.'
        setErrMsg(failMsg)
        setHasError(true)
      }

      setLoading(false)
    })
    .catch(error => {
      const _msg = 'Unexpected error in line play. Check console for more details.'
      console.log(_msg, error)
      setErrMsg(_msg)
      setHasError(true)
      setLoading(false)
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
                     title={errMsg}/>
      <IconButton disabled={loading} className={cn('ctrl-action', {'ctrl-action--loading': loading})}
                  onClick={play}><PlayArrowIcon/></IconButton>
    </React.Fragment>
  )
})

const PauseButton = withApollo(({client, machines}) => {
  const [loading, setLoading] = useState(false)

  const pause = () => {
    setLoading(true)

    Promise.all(_.map(machines, machine => {
      if (machine.connected) {
        const mutationPlay = client.mutate({mutation: MUTATION_PAUSE, variables: {machineId: machine.id}})
        return Promise.resolve(mutationPlay.then(res => {
            if (_.has(res, 'data.pause.errCode') && !_.isNull(res.data.pause.errCode) && res.data.pause.errCode !== 0) {
              return machine.id
            }
          }
        ))
      }
    })).then(err => {
      const errors = _.filter(err, e => _.isFinite(e))
      if (errors.length > 0) {
        const _msg = 'Failed to pause ' + errors.length + ' machine' + (errors.length > 1 ? 's' : '') + '.'
        console.log(_msg, errors)
        setErrMsg(_msg)
        setHasError(true)
      }
      setLoading(false)
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
                     title={errMsg}/>
      <IconButton disabled={loading} className={cn('ctrl-action', {'ctrl-action--loading': loading})}
                  onClick={pause}><PauseIcon/></IconButton>
    </React.Fragment>
  )
})

const StopButton = withApollo(({client, machines}) => {
  const firstTitle = 'Are you sure you want to stop all machines?'

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogTitle, setDialogTitle] = useState(firstTitle)
  const [loading, setLoading] = useState(false)

  const closeDialog = () => {
    setIsDialogOpen(false)
    setDialogTitle(firstTitle)
  }
  const openDialog = () => {
    setIsDialogOpen(true)
  }

  const stop = () => {
    setLoading(true)

    Promise.all(_.map(machines, machine => {
      if (machine.connected) {
        const mutationStop = client.mutate({mutation: MUTATION_STOP, variables: {machineId: machine.id}})
        return Promise.resolve(mutationStop.then(res => {
            if (_.has(res, 'data.stop.errCode') && !_.isNull(res.data.stop.errCode) && res.data.stop.errCode !== 0) {
              return machine.id
            }
          }
        ))
      }
    })).then(err => {
      const errors = _.filter(err, e => _.isFinite(e))
      if (errors.length > 0) {
        setDialogTitle('Failed to stop ' + errors.length + ' machine' + (errors.length > 1 ? 's' : '') + '. Do you want to retry?')
      } else {
        closeDialog()
      }
      setLoading(false)
    })
  }

  return (
    <React.Fragment>
      <ConfirmDialog open={isDialogOpen} close={closeDialog} action={stop} title={dialogTitle}/>
      <IconButton disabled={loading} className={cn('ctrl-action ctrl-action--small', {'ctrl-action--loading': loading})}
                  onClick={openDialog}><StopIcon/>
      </IconButton>
    </React.Fragment>
  )
})

const NewLayoutButton = withApollo(({client, machines, disabled = false, secondary = true}) => {
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

  const [loading, setLoading] = useState(false)
  const loadNewLayout = () => {
    setLoading(true)

    Promise.all(_.map(machines, machine => {
      if (machine.connected) { // try only connected machines

        const mutationStartBatch = client.mutate({
          mutation: MUTATION_STARTBATCH, variables: {
            machineId: machine.id, layoutName: layoutName, batchId: batchId, batchSize: parseInt(batchSize)
          }
        })

        return Promise.resolve(mutationStartBatch.then(res => {
            if (_.has(res, 'data.startBatch.errCode') && !_.isNull(res.data.startBatch.errCode) && res.data.startBatch.errCode !== 0) {
              return machine.id
            }
          }
        ))
      }
    })).then(err => {
      const errors = _.filter(err, e => _.isFinite(e))
      if (errors.length > 0) {
        const _msg = 'Failed to load layout on ' + errors.length + ' machine' + (errors.length > 1 ? 's' : '') + '.'
        console.log(_msg, errors)
        setErrMsg(_msg)
        setHasError(true)
      } else {
        closeDialog()
      }
    })

    setLoading(false)
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
      <LoadLayoutDialog open={isOpen}
                        close={closeDialog}
                        action={loadNewLayout}
                        layoutName={layoutName}
                        setLayoutName={setLayoutName}
                        batchId={batchId}
                        setBatchId={setBatchId}
                        batchSize={batchSize}
                        setBatchSize={setBatchSize}
                        forLine/>
      <IconButton disabled={disabled || loading}
                  className={cn('ctrl-action ctrl-action--small', {'ctrl-action--loading': loading})}
                  onClick={openDialog}>
        <AddIcon/>
      </IconButton>
    </React.Fragment>
  )
})

const LineProps = ({match}) => {
  const lineName = decodeURI(match.params.name)
  const [loaded, setLoaded] = useState(false)
  const [line, setLine] = useState({})
  const {data, error, loading} = useQuery(QUERY_LINE, {variables: {lineName: lineName}})

  // initial query
  useEffect(() => {
    if (error)
      console.log(error)

    setLoaded(!loading)
    if (!loading) {
      setLine(data.productionLine || {})
    }
  }, [lineName, error, loading]) // optimize by not subscribing to data change

  // Need subscription to fix this:
  // TODO: hide control panel if all machines are off-line

  // Need productionEngine data to fix this:
  // TODO: disable stop if no machines are running
  // TODO: disable play if all connected machines are running
  // TODO: disable pause if all connected machines are paused
  // TODO: disable startBatch if one machine is running or paused

  const machinesInOrder = _.orderBy(line.machines, ['placeInLine'])

  return (
    <div className={cn('props-wrapper', {'props-wrapper--loading': !loaded})}>
      <div className='loader'/>
      <div className='section section--header'>
        <div className='props'>
          <div className='props__value'>{line.name}</div>
          <div className='props__secondary'>{line.comment}</div>
        </div>
      </div>
      <div className='section section--col'>
        <div className='section__header'>Machines</div>
        <div className='machines'>
          {_.map(machinesInOrder, (m, i) => <Machine key={i} machineId={m.id} placeInLine={m.placeInLine}
                                                     layout='line'/>)}
        </div>
      </div>
      <div className='ctrl-panel'>
        <NewLayoutButton machines={machinesInOrder}/>
        <PlayButton machines={machinesInOrder}/>
        <PauseButton machines={machinesInOrder}/>
        <StopButton machines={machinesInOrder}/>
      </div>
    </div>
  )
}

export default withRouter(LineProps)