import React from "react"

const ComponentsMissing = ({componentsMissing}) => {
  return (
    <div className='section'>
      <div className='props'>
        <div className='props__msg'>
          <span>{componentsMissing} components missing!</span>
        </div>
      </div>
    </div>
  )
}

export default ComponentsMissing