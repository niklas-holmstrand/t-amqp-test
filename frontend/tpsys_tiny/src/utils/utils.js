import _ from "lodash"
import InfoIcon from '@material-ui/icons/InfoOutlined'
import {
  Button,
  Dialog, DialogActions,
  DialogContent, DialogTitle,
  MenuItem,
  Select,
  TextField
} from "@material-ui/core";
import React, { useEffect, useState } from "react";
import { useQuery } from "react-apollo-hooks";
import { QUERY_LAYOUTS } from "./graphql";

export const MACHINE_STATUS_OFFLINE = 'Off-line'
export const MACHINE_STATUS_PAUSED = 'Paused'
export const MACHINE_STATUS_RUNNING = 'Running'
export const MACHINE_STATUS_STOPPED = 'Stopped'
export const MACHINE_STATUS_WAITING = 'Waiting' // when query-notifications exist

export const NOTIFICATION_SEVERITY_OPERATORALERT = 'OperatorAlert'
export const NOTIFICATION_SEVERITY_UNKNOWN = 'UnknownNotificationSeverity'
export const NOTIFICATION_SEVERITY_QUERY = 'Query'
export const NOTIFICATION_SEVERITY_OPERATORINFO = 'OperatorInfo'

export const NOTIFICATION_TYPE_UNKNOWN = 'UnknownNotificationType'
export const NOTIFICATION_TYPE_LOADBOARD = 'LoadBoardRequest'
export const NOTIFICATION_TYPE_REMOVEBOARD = 'RemoveBoardRequest'
export const NOTIFICATION_TYPE_UNLOADBOARD = 'UnloadAnyLoadedBoardRequest'
export const NOTIFICATION_TYPE_COMPONENTNOTAVAILABLE = 'ComponentNotAvailable'
export const NOTIFICATION_TYPE_NOHYDRA = 'ComponentNoHydraTool'
export const NOTIFICATION_TYPE_WAITINGFORBOARDLOADED = 'WaitingForBoardToBeLoaded'
export const NOTIFICATION_TYPE_WAITINGFORBOARDUNLOADED = 'WaitingForBoardToBeUnloaded'
export const NOTIFICATION_TYPE_WAITINGFORBOARDCHANGED = 'WaitingForBoardToBeChanged'
export const NOTIFICATION_TYPE_UNKNOWNALERT = 'UnknownOperatorAlert'

export const NOTIFICATION_TYPE_IOCONVEYORERRORLEFT = 'IoConveyorErrorLeft'
export const NOTIFICATION_TYPE_IOCONVEYORERRORRIGHT = 'IoConveyorErrorRight'
export const NOTIFICATION_TYPE_TIMEFORPREVENTIVEMAINTENANCE = 'TimeForPreventiveMaintenence'
export const NOTIFICATION_TYPE_VISIONDISABLED = 'VisionDisabled'

export const isRouteObjSelected = (path, parent, leaf) => {
  const p = _.split(path, '/')
  return _.isEqual(_.nth(p, -2), parent) && _.isEqual(_.nth(p, -1), leaf)
}

export const MessageDialog = ({open, close, title, content, buttonLabel = 'Ok'}) =>
  <Dialog open={open} onClose={close}>
    {title && <DialogTitle>
      {title}
    </DialogTitle>}
    {content && <DialogContent>
      {content}
    </DialogContent>}
    <DialogActions>
      <Button onClick={close} color="primary" autoFocus>
        {buttonLabel}
      </Button>
    </DialogActions>
  </Dialog>

export const ConfirmDialog = ({open, close, action, title = 'Are you sure?', content, cancelLabel = 'Cancel', yesLabel = 'Yes'}) =>
  <Dialog open={open} onClose={close}>
    {title && <DialogTitle>
      {title}
    </DialogTitle>}
    {content && <DialogContent>
      {content}
    </DialogContent>}
    <DialogActions>
      <Button onClick={close} color="secondary">
        {cancelLabel}
      </Button>
      <Button onClick={action} color="primary" autoFocus>
        {yesLabel}
      </Button>
    </DialogActions>
  </Dialog>

export const LoadLayoutDialog = ({open, close, action, layoutName, batchId, batchSize, setLayoutName, setBatchId, setBatchSize, forLine = false}) => {
  const [layouts, setLayouts] = useState({})

  // get layouts
  const {data, error, loading} = useQuery(
    QUERY_LAYOUTS, {suspend: false, fetchPolicy: 'network-only'})
  useEffect(() => {
    if (error)
      console.log(error)

    if (!loading) {
      setLayouts(data.layouts || {})
    }
  }, [error, loading])

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth='xs'
      className='mydialog'
    >
      <DialogTitle className='mydialog__title'>Load new {forLine ? 'line' : ''} layout</DialogTitle>
      <DialogContent className='mydialog__content'>
        {forLine && <p className='mydialog__info'>
          <InfoIcon/> <span>Layout will only be loaded on stopped machines.</span>
        </p>}
        <Select
          value={layoutName}
          onChange={(e) => {
            setLayoutName(e.target.value)
          }}
          name='layout'
          displayEmpty
        >
          <MenuItem value="" disabled>Select layout</MenuItem>
          {
            _.map(layouts, (l, i) => <MenuItem key={i} value={l.name}>{l.name}</MenuItem>)
          }
        </Select>
        <TextField
          id="batch-id"
          label="Batch ID"
          value={batchId}
          onChange={(e) => {
            setBatchId(e.target.value)
          }}
          margin="normal"
        />
        <TextField
          id="batch-size"
          label="Batch size"
          value={batchSize}
          onChange={(e) => {
            setBatchSize(e.target.value)
          }}
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={close} color="secondary">Cancel</Button>
        <Button onClick={action} color="primary" autoFocus>Ok</Button>
      </DialogActions>
    </Dialog>
  )
}