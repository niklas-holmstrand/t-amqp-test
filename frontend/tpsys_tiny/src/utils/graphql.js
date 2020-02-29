import gql from "graphql-tag";

export const QUERY_NOTIFICATIONS = gql`
  query {
    notifications {
      type
      id
      severity
      runtimeData
      machineId
      machineName
    }
  }
`

export const QUERY_LAYOUTS = gql`
  query Layouts {
    layouts {
      name
    }
  }
`

export const QUERY_MACHINENOTIFICATIONS = gql`
  query MachineNotifications($machineId: Int!) {
    notificationStatus(machineId: $machineId) {
      type
      severity
      runtimeData
      id
    }
  }
`

export const QUERY_PRODUCTIONLINES = gql`
  query {
    productionLines {
      name
      comment
      machines {
        name
        snr
        placeInLine
        model
        role
        connected
        id
      }
    }
  }
`

export const QUERY_MAGAZINESTATUS = gql`
  query MagazineStatus($machineId: Int!) {
    magazineStatus(machineId: $machineId) {
      state
      name
      slotNo
    }
  }
`

export const QUERY_MULTI_MACHINEDATA = gql`
  query machineData($machineId: Int!) {
    machine(machineId: $machineId) {
      name
      snr
      hostname
      placeInLine
      model
      role
      connected
      id
    }
    productionEngine(machineId: $machineId) {
      state
      batchId
      layoutName
      batchSize
      boardsCompleted
      componentsPerBoard
      componentsLeft
      componentsMissing
    }
  }
`

export const QUERY_LINE = gql`
  query GetLine($lineName: String!) {
    productionLine(lineName: $lineName) {
      name
      comment
      machines {
        id
        name
        connected
        placeInLine
      }
    }
  }
`

export const QUERY_TRIM_FEEDER_IMG = gql`
  query GetFeederImage($machineId: Int!) {
    getFeederImage(machineId: $machineId) {
      feederImgBase64
    }
  }
`

export const QUERY_TRIM_FEEDER_IMG_OFFSET = gql`
  query GetFeederImageOffset($machineId: Int!, $x: Int!, $y: Int!) {
    getFeederImageOffset(machineId: $machineId, x: $x, y: $y) {
      feederImgBase64,
      x,
      y
    }
  }
`

export const QUERY_MOVE_CAM_X = gql`
  query MoveCamX($x: Int!) {
    moveCamX(x: $x)
  }
`;

export const QUERY_CONTROL_CAMERA = gql`
  query ControlCamera($x: Int!, $zoomOut: Int!) {
    moveCam(x: $x, zoomOut: $zoomOut) {
      x
    }
  }
`;

export const GET_TEST_QUERY = gql`
{
  getTest {
    name
    id
  }
}
`

/*** SUBSCRIPTIONS ***/

export const SUBSCRIPTION_MACHINE = gql`
  subscription Machine($machineId: Int!) {
    machine(machineId: $machineId) {
      id
      connected
    }
  }
`

export const SUBSCRIPTION_PRODUCTIONENGINE = gql`
  subscription ProductionEngine($machineId: Int!) {
    productionEngine(machineId: $machineId) {
      state
      batchId
      layoutName
      batchSize
      boardsCompleted
      componentsPerBoard
      componentsLeft
      componentsMissing
    }
  }
`

export const SUBSCRIPTION_MAGAZINESTATUS = gql`
  subscription MagazineStatus($machineId: Int!) {
    magazineStatus(machineId: $machineId) {
      state
      name
      slotNo
    }
  }
`

export const SUBSCRIPTION_NOTIFICATIONS = gql`
  subscription {
    notifications {
      type
      severity
      runtimeData
      id
      machineId
      machineName
    }
  }
`

export const SUBSCRIPTION_MACHINENOTIFICATIONS = gql`
  subscription Notifications($machineId: Int!) {
    notificationStatus(machineId: $machineId) {
      type
      severity
      runtimeData
      id
      machineId
      machineName
    }
  }
`

export const SUBSCRIPTION_CAMERAIMAGES = gql`
  subscription onCameraImages($machineId: Int!, $x: Int!, $y: Int!) {
    cameraImages(machineId: $machineId, x: $x, y: $y) {
      feederImgBase64,
      x,
      y
    }
  }
`

export const EVENT_HAPPENED = gql`
  subscription {
    eventHappened {
      feederImgBase64
      x
      y
    }
  }
`

export const CAMERA_IMAGE_RECEIVED = gql`
  subscription {
    newCameraImage {
      imgSerialized
      x
      y
    }
  }
`

/*** MUTATIONS ***/

export const MUTATION_PLAY = gql`
  mutation Play($machineId: Int!) {
    play(machineId: $machineId) {
      errCode
      errMsg
    }
  }
`

export const MUTATION_PAUSE = gql`
  mutation Pause($machineId: Int!) {
    pause(machineId: $machineId) {
      errCode
      errMsg
    }
  }
`

export const MUTATION_STOP = gql`
  mutation Stop($machineId: Int!) {
    stop(machineId: $machineId) {
      errCode
      errMsg
    }
  }
`

export const MUTATION_STARTBATCH = gql`
  mutation StartBatch($machineId: Int!, $layoutName: String!, $batchId: String, $batchSize: Int) {
    startBatch(machineId: $machineId, layoutName: $layoutName, batchId: $batchId, batchSize: $batchSize) {
      errCode
      errMsg
    }
  }
`

export const MUTATION_LOADBOARD = gql`
  mutation NQR_LoadBoard($machineId: Int!, $ok: Boolean) {
    NQR_LoadBoard(machineId: $machineId, ok: $ok) {
      errCode
      errMsg
    }
  }
`

export const MUTATION_REMOVEBOARD = gql`
  mutation NQR_RemoveBoard($machineId: Int!) {
    NQR_RemoveBoard(machineId: $machineId) {
      errCode
      errMsg
    }
  }
`

export const MUTATION_SWITCHTOTUI = gql`
  mutation switchToTUI($machineId: Int!) {
    switchToTUI(machineId: $machineId) {
      errCode
      errMsg
    }
  }
`


export const MUTATION_UNLOADANYLOADEDBOARD = gql`
  mutation NQR_UnloadAnyLoadedBoard($machineId: Int!, $ok: Boolean, $boardToUnloadExists: Boolean) {
    NQR_UnloadAnyLoadedBoard(machineId: $machineId, ok: $ok, boardToUnloadExists: $boardToUnloadExists) {
      errCode
      errMsg
    }
  }
`
