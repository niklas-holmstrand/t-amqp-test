import React, { useEffect, useState } from 'react'
import { useQuery, useSubscription } from "react-apollo-hooks"
import _ from "lodash"
import {
  QUERY_MULTI_MACHINEDATA,
  QUERY_MACHINENOTIFICATIONS,
  SUBSCRIPTION_MACHINE,
  SUBSCRIPTION_PRODUCTIONENGINE,
  SUBSCRIPTION_MACHINENOTIFICATIONS
} from "../../utils/graphql"
import { MACHINE_STATUS_OFFLINE } from "../../utils/utils"
import MachineInfo from './components/MachineInfo'
import MachineCard from './MachineCard'
import MachineProps from './MachineProps'

const Machine = ({machineId, placeInLine, selected, layout}) => {
  const [loaded, setLoaded] = useState(false)
  const [machine, setMachine] = useState({})
  const [engine, setEngine] = useState({})
  const [machineStatus, setMachineStatus] = useState(MACHINE_STATUS_OFFLINE)
  const [onLine, setOnLine] = useState(false)
  const [notifications, setNotifications] = useState([])

  const {data, error, loading} = useQuery(
    QUERY_MULTI_MACHINEDATA,
    {variables: {machineId: machineId}, suspend: false, fetchPolicy: 'network-only'})

  const qNot = useQuery(
    QUERY_MACHINENOTIFICATIONS,
    {variables: {machineId: machineId}, suspend: false, fetchPolicy: 'network-only'})

  const sMachine = useSubscription(
    SUBSCRIPTION_MACHINE,
    {variables: {machineId: machineId}})

  const sEngine = useSubscription(
    SUBSCRIPTION_PRODUCTIONENGINE,
    {variables: {machineId: machineId}})

  const sNot = useSubscription(
    SUBSCRIPTION_MACHINENOTIFICATIONS,
    {variables: {machineId: machineId}})

  // initial query
  useEffect(() => {
    if (error)
      console.log(error)

    setLoaded(!loading)
    if (!loading) {
      setMachine(data.machine || {})
      setEngine(data.productionEngine || {})
    }
  }, [error, loading]) // optimize by not subscribing to data change

  // initial not query
  useEffect(() => {
    if (qNot.error)
      console.log(qNot.error)

    if (!qNot.loading) {
      setNotifications(qNot.data.notificationStatus || [])
    }
  }, [qNot.data, qNot.error, qNot.loading]) // optimize by not subscribing to data change

  // subscribe machine
  useEffect(() => {
    if (sMachine.error)
      console.log(sMachine.error)

    if (!_.isEmpty(sMachine.data)) {
      let nextMachine = _.cloneDeep(machine)
      nextMachine.connected = sMachine.data.machine.connected
      setMachine(nextMachine)
    }
  }, [sMachine.data, sMachine.error])

  // subscribe productionEngine
  useEffect(() => {
    if (sEngine.error)
      console.log(sEngine.error)

    if (!_.isEmpty(sEngine.data)) {
      setEngine(sEngine.data.productionEngine)
    }
  }, [sEngine.data, sEngine.error])

  useEffect(() => {
    if (sNot.error)
      console.log(sNot.error)

    if (!_.isEmpty(sNot.data)) {
      setNotifications(sNot.data.notificationStatus)
    }
  }, [sNot.data, sNot.error])

  useEffect(() => {
    setOnLine(machine.connected)
  }, [machine.connected])

  // update machine status
  useEffect(() => {
    setMachineStatus(
      machine.connected ?
        (!_.isEmpty(engine) ?
          engine.state :
          null) :
        MACHINE_STATUS_OFFLINE)
  }, [machine.connected, engine.state])

  const hasProps = layout === 'props'
  const hasCard = layout === 'card'
  const hasLineProps = layout === 'line'

  return (
    <React.Fragment>

      {hasProps && <MachineProps loaded={loaded}
                                 machine={machine}
                                 engine={engine}
                                 machineStatus={machineStatus}
                                 notifications={notifications}
                                 onLine={onLine}/>}

      {hasCard && <MachineCard loaded={loaded}
                               machine={machine}
                               engine={engine}
                               machineStatus={machineStatus}
                               notifications={notifications}
                               selected={selected}
                               onLine={onLine}/>}

      {hasLineProps && <MachineInfo machine={machine}
                                    layoutName={engine.layoutName}
                                    machineStatus={machineStatus}
                                    showAll={false} />
      }
    </React.Fragment>
  )
}

export default Machine