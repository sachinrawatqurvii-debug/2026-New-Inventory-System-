import React from 'react'

const Iframe = ({style_id}) => {

  if(!style_id){
    return <p className=''>Loading...</p>
  }
  return (
    <div className={`${style_id?"block":"hidden"}`}  >

    <iframe 
    className='lg:w-[800px] md:w-[500px] h-250  pl-25 '
    src={`https://www.myntra.com/shirts/qurvii/qurvii-comfort-printed-mandarin-collar-longline-casual-shirt/${style_id}/buy`}></iframe>

    </div>
  )
}

export default Iframe