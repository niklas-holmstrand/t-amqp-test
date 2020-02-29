import React from "react"
import { Link, withRouter } from "react-router-dom"
import _ from "lodash"
import cn from 'classnames'
import Machine from '../machine/Machine'
import { isRouteObjSelected } from "../../utils/utils";

const Line = ({line, location, order}) => {
  return (
    <div className='line'>
      <Link to={'/factory/line/' + encodeURI(line.name)} className={cn('line__header', {'line__header--selected' : isRouteObjSelected(location.pathname, 'line', line.name)})}>
        <span className='line__order'>Line {order}</span>
        <span className='line__name'>{line.name}</span><span className='line__descr'>{line.comment}</span>
      </Link>
      <div className='line__machines'>
        {
          _.map(_.orderBy(line.machines, ['placeInLine'], ['asc']), (machine, j) => {
            return (
              <Machine key={j} machineId={machine.id} selected={isRouteObjSelected(location.pathname, 'machine', machine.id.toString())} layout='card'/>
            )
          })
        }
      </div>
    </div>
  )
}

export default withRouter(Line)