import {
  MACHINE_STATUS_OFFLINE,
  MACHINE_STATUS_PAUSED,
  MACHINE_STATUS_RUNNING,
  MACHINE_STATUS_STOPPED
} from "../../../utils/utils";
import cn from "classnames";
import React from "react";
import _ from 'lodash'

const MachineSleepIcon = () =>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <path
      d="M336.4,122.74C303.72,114.5,261.74,110,218.19,110S132.66,114.5,100,122.74c-37.35,9.41-55.51,21.5-55.51,37s17.84,26,56.14,33.07c30.16,5.55,71.91,8.6,117.58,8.6s87.42-3.05,117.58-8.6c38.3-7,56.14-17.56,56.14-33.07S373.75,132.15,336.4,122.74Z"/>
    <path
      d="M507.26,226.82c-5.63-21.75-22.63-36.14-49.16-41.6a122.14,122.14,0,0,0-24.05-2.37c1.57-19.33,1.33-31.64,1.31-32.24h0c-.1-15.7-12-38-67.66-55.57-40.08-12.65-93.18-19.61-149.51-19.61S108.76,82.39,68.68,95C13,112.62,1.12,134.91,1,150.61H1c0,1.51-.69,37.48,8.42,83.87C17.91,277.66,36.87,338.18,79,381.25c35.92,36.71,82.75,55.32,139.17,55.32,69.71,0,124.22-28.06,162.09-83.39,19-1.65,85.15-10.26,115.46-51.33C510.94,281.26,514.81,256,507.26,226.82Zm-27.58,63.11c-29.17,39.58-104.68,43.6-105.44,43.64a2.85,2.85,0,0,0-.41,0c-.12,0-.23,0-.34,0s-.46.06-.69.11l-.24.05c-.25.05-.49.12-.73.19l-.18.05c-.25.08-.5.17-.74.27l-.16.07c-.24.1-.47.21-.7.33l-.18.1c-.22.12-.43.25-.64.39l-.2.13-.58.43-.2.17c-.19.16-.36.32-.53.48l-.18.18c-.18.19-.36.38-.52.58l-.12.15a7.17,7.17,0,0,0-.52.71l0,.06c-34,52.08-83.89,78.48-148.15,78.48-50.81,0-92.81-16.57-124.82-49.25C54.74,327.89,37.12,271.48,29.15,231.1,20.38,186.73,21,151.39,21,151v-.22c0-23.13,75-55.39,197.18-55.39s197.18,32.26,197.18,55.39V151a366.78,366.78,0,0,1-2.29,41.25v.07c0,.22,0,.44,0,.65s0,.26,0,.39,0,.33,0,.49,0,.37,0,.56a.22.22,0,0,0,0,.08,2.68,2.68,0,0,0,0,.3c0,.21.06.41.1.61s.07.27.1.41l.15.53c.05.16.11.31.17.46s.11.3.17.45.15.32.22.47l.2.39c.09.16.18.31.28.46s.15.25.23.37l.3.41c.1.13.19.25.29.36s.2.24.31.35a4.12,4.12,0,0,0,.35.37l.31.29.42.37.3.22.48.35.31.19.52.3.35.17.51.23.45.17.45.15a5.29,5.29,0,0,0,.57.15l.37.09.66.1.25,0h.08l.69,0,.3,0h.08l.34,0c.23,0,.45,0,.68-.05h.07c.55-.07,54.71-6.13,63.69,28.55C494,255.21,491.26,274.22,479.68,289.93Z"/>
    <path
      d="M438.18,219.84a81.73,81.73,0,0,0-22.45.61l-.07,0-.71.17-.28.08-.59.2-.37.14-.43.2-.47.23-.29.17L412,222l-.23.18-.54.4c-.09.07-.17.16-.26.24s-.3.26-.44.4a4,4,0,0,0-.34.37l-.3.33-.36.47-.21.29c-.11.16-.21.33-.31.5s-.14.22-.2.33-.14.3-.22.45l-.21.45a3.82,3.82,0,0,0-.13.36,5.89,5.89,0,0,0-.21.59c0,.09,0,.18-.08.28s-.12.47-.17.71a.25.25,0,0,1,0,.07,359.62,359.62,0,0,1-17.86,63.27,1.18,1.18,0,0,1-.07.2,10.21,10.21,0,0,0-.71,3.46,10,10,0,0,0,9.76,10.23H400a135.57,135.57,0,0,0,23.39-2.19c18.67-3.45,32.28-10.39,40.45-20.62,5.66-7.07,11.41-19.42,6.72-38.06C467.06,230.8,455.57,222,438.18,219.84Zm10.05,50.43c-7.08,8.89-22.3,12.85-34.53,14.42a391.16,391.16,0,0,0,12.23-45.23c8.55-.46,22.77.32,25.24,10.12C453.35,258.28,452.39,265.05,448.23,270.27Z"/>
    <path
      d="M163.17,273.65a10,10,0,0,0-10,10,7.56,7.56,0,0,1-15.11,0,10,10,0,0,0-20,0,27.56,27.56,0,0,0,55.11,0A10,10,0,0,0,163.17,273.65Z"/>
    <path
      d="M299.94,273.65a10,10,0,0,0-10,10,7.56,7.56,0,0,1-15.11,0,10,10,0,1,0-20,0,27.56,27.56,0,0,0,55.11,0A10,10,0,0,0,299.94,273.65Z"/>
    <path d="M214,316.9a33.68,33.68,0,1,0,33.68,33.68A33.72,33.72,0,0,0,214,316.9Z"/>
  </svg>

const BoardProgressIndicator = (props) => {
  const {size = 72, progress = 0, status = MACHINE_STATUS_OFFLINE} = props

  const center = size / 2
  const strokeWidth = size * 0.025
  const radius = size / 2 - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const offset = (100 - progress) / 100 * circumference

  const style = {
    strokeDashoffset: offset
  }

  return (
    <svg
      className="board-progress-indicator"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        className="board-progress-indicator__bg"
        cx={center}
        cy={center}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <circle
        className={cn('board-progress-indicator__stroke',
          {'board-progress-indicator__stroke--paused': status === MACHINE_STATUS_PAUSED},
          {'board-progress-indicator__stroke--running': status === MACHINE_STATUS_RUNNING})}
        style={style}
        cx={center}
        cy={center}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
      />
    </svg>
  )
}

const BoardProgress = ({status, role, componentsPerBoard, componentsLeft}) => {
  const progress = componentsPerBoard > 0 ? ((1- componentsLeft / componentsPerBoard) * 100) : 0
  const active = (status === MACHINE_STATUS_PAUSED || status === MACHINE_STATUS_RUNNING)
  const stopped = status === MACHINE_STATUS_STOPPED
  return (
      <div className="board-progress">
        {(active || stopped) && <BoardProgressIndicator progress={progress} status={status}/>}
        {(active || stopped) && <div className={cn("board-progress__label", {'board-progress__label--role': !active})}>{active ? _.round(progress, 0) + '%' : role}</div>}
        {!active && <MachineSleepIcon />}
      </div>
  )
}

export default BoardProgress