import React from 'react'
import { Link } from 'react-router-dom'

const LandingPage = () => {
  return (
    <div>LandingPage
        <br></br>
        <Link to='/login' className='link'>Login</Link>
        <br></br>
        <Link to='/register' className='link'>Register</Link>
    </div>
  )
}

export default LandingPage