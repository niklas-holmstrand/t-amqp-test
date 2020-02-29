import React, { useEffect, useState } from 'react'
import { useQuery, useSubscription } from 'react-apollo-hooks'
import _ from 'lodash'
import cn from 'classnames'

import { QUERY_MAGAZINESTATUS, SUBSCRIPTION_MAGAZINESTATUS } from './../../../utils/graphql'

const Magazines = ({machineId}) => {
  const [loaded, setLoaded] = useState(false)
  const [mags, setMags] = useState({})
  const {data, error, loading} = useQuery(QUERY_MAGAZINESTATUS, {variables: {machineId}})
  const sRet = useSubscription(SUBSCRIPTION_MAGAZINESTATUS, {variables: {machineId}})

  useEffect(() => {
    if (error)
      console.log(error)

    setLoaded(!loading)
    if (!_.isEmpty(data)) {
      setMags(data.magazineStatus || {})
    }
  }, [data, error, loading])

  useEffect(() => {
    if (sRet.error)
      console.log('Magazines.Subscription', sRet.error)

    if (!_.isEmpty(sRet.data)) {
      setMags(sRet.data.magazineStatus)
    }
  }, [sRet.data, sRet.error])

  return (
    <div className={cn('section section--col', {'section--loading': !loaded})}>
      {loaded && !_.isEmpty(mags) && <div className='section__header'>Magazines</div>}
      {loaded && !_.isEmpty(mags) &&
        <div className='magazines'>
          {
            _.map(_.orderBy(mags, ['slotNo'], ['asc']), (slot, i) => {
              return (
                <div className={'magazine magazine--' + _.replace(_.toLower(slot.state), ' ', '')} key={i}>
                  <span className='magazine__bulb' />
                  <span className='magazine__slot'>{slot.slotNo}</span>
                  <span
                    className={'magazine__name' + (_.isEmpty(slot.name) ? ' magazine__name--none' : '')}>{_.isEmpty(slot.name) ?
                    <span>&nbsp;</span> : slot.name}</span>
                </div>
              )
            })
          }
        </div>}
    </div>
  )
}

export default Magazines
