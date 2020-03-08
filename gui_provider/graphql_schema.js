const typeDefs = `
type Query {
  info: String!
  machine(machineId: Int): Machine
  productionEngine(machineId: Int): ProductionEngine 
  magazineStatus(machineId: Int): [MagazineSlot]
  notificationStatus(machineId: Int): [Notification]
  
  productionLine(lineName: String): ProductionLine
  
  productionLines: [ProductionLine]
  machines: [Machine]
  layouts: [Layout]
  notifications: [Notification]

  getFeederImage(machineId: Int): FeederImageRsp

  getFeederImageOffset(machineId: Int, x: Int, y: Int): FeederImageRsp

  moveCamX(x: Int): Boolean

  getTest: TestType
}

type Mutation {
    play(machineId: Int): PlayRsp
    pause(machineId: Int): PauseRsp
    stop(machineId: Int): StopRsp
    startBatch(machineId: Int, batchId: String, layoutName: String, batchSize: Int): StartBatchRsp
    switchToTUI(machineId: Int): SwitchToTUIRsp
    NQR_LoadBoard(machineId: Int, ok: Boolean): NqrLoadBoardRsp
    NQR_RemoveBoard(machineId: Int): NqrRemoveBoardRsp
    NQR_UnloadAnyLoadedBoard(machineId: Int, ok: Boolean, boardToUnloadExists: Boolean): NqrUnloadAnyLoadedBoardRsp

    login(name: String, pw: String): LoginRsp
}

type Subscription {
    productionEngine(machineId: Int): ProductionEngine
    magazineStatus(machineId: Int): [MagazineSlot]
    notificationStatus(machineId: Int): [Notification]
    machines: [Machine]
    machine(machineId: Int): Machine
    notifications: [Notification]
    cameraImages(machineId: Int, x: Int, y: Int): FeederImageRsp
    eventHappened: FeederImageRsp
}

type Layout {
    name: String
}

type ProductionLine {
    name: String                    "Human reacable alias for a production line"
    comment: String                 "Optional comment"
    machines: [Machine]
}

enum MachineRole {
    Unknown
    PnP                             "Pick and place machine"
    Jet                             "Jet printer"
    Spi                             "Solder paste inspection machine"
    Aoi
}

type Machine {
    name: String                    "smtdb:alias"
    snr: String                     "smtdb:id"
    hostname: String                "Ip number or hostname"
    placeInLine: Int                "Defines order along line. 0=Most upstream one"
    model: String                   "Model name eg My200DX"
    role: MachineRole               "PnP, jet printer etc"
    connected: Boolean
    id: Int                         
}

"###################### All definitions below reflects data in TpCp interface. See proto-file for documentation #######################"

type PlayRsp {
    errCode: Int
    errMsg: String
}
  
type PauseRsp {
    errCode: Int
    errMsg: String
}
  
type StopRsp {
    errCode: Int
    errMsg: String
}
  
type StartBatchRsp {
    errCode: Int
    errMsg: String
}
  
type SwitchToTUIRsp {
    errCode: Int
    errMsg: String
}

type NqrLoadBoardRsp {
    errCode: Int
    errMsg: String
}
  
type NqrRemoveBoardRsp {
    errCode: Int
    errMsg: String
}
  
type NqrUnloadAnyLoadedBoardRsp {
    errCode: Int
    errMsg: String
}
  
type LoginRsp {
    errCode: Int
    errMsg: String
}

type TestType {
    id: Int
    name: String
}
  
type ProductionEngine {
    state: ProductionEngineState
    batchId: String
    layoutName: String
    batchSize: Int
    boardsCompleted: Int
    componentsPerBoard: Int
    componentsLeft: Int
    componentsMissing: Int
}

enum ProductionEngineState {
    Unknown
    Stopped
    Paused
    Running
}

type MagazineSlot {
    state: MagazineSlotState
    name: String
    slotNo: Int
}
  
enum MagazineSlotState {
    Unknown
    Empty
    Present
    Active
    Used
    NotYetPicked
}

type Notification {
    type: NotificationType
    severity: NotificationSeverity
    runtimeData: [String]
    id: String
    machineId: Int
    machineName: String
}
    
enum NotificationType {
    UnknownNotificationType
    LoadBoardRequest
    RemoveBoardRequest
    UnloadAnyLoadedBoardRequest
    ComponentNotAvailable
    ComponentNoHydraTool
    WaitingForBoardToBeLoaded
    WaitingForBoardToBeUnloaded
    WaitingForBoardToBeChanged
    UnknownOperatorAlert
    IoConveyorErrorLeft
    IoConveyorErrorRight
    TimeForPreventiveMaintenence
    VisionDisabled
}  
  
enum NotificationSeverity {
    UnknownNotificationSeverity
    OperatorAlert
    Query
    OperatorInfo
}

type FeederImageRsp {
    feederImgBase64: String
    x: Int
    y: Int
}
`

module.exports = {typeDefs}