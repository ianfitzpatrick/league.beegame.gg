import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Chrome from '../components/Chrome'
import Loading from '../components/Loading'
import fetch from '../modules/fetch-with-headers'
import getApiUrl from '../modules/get-api-url'
import handleError from '../modules/handle-error'
import { PageTitle, PageSubtitle } from '../components/elements'

function Circuits () {
  const [loading, setLoading] = useState(true)
  const [leagues, setLeagues] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(`${getApiUrl()}circuits/?is_active=true&format=json`)
        .then(x => x.json())
        .catch(handleError)

      setLeagues(response.results)
      setLoading(false)
    }

    fetchData()
  }, [])

  return (
    <Chrome>
      {
        loading
          ? <Loading />
          : (
            <div>
              <PageTitle>Circuits</PageTitle>
              { leagues.map(x => (
              <>
                <PageSubtitle style={{ marginTop: '0rem', marginBottom: '-0.25rem' }}>{x.season.name}</PageSubtitle>
                <Link key={`${x.name}`} className='block text-lg mb-2' to={`/circuits/${x.id}`}>{x.name}</Link>
              </>
              )) }
            </div>
          )
      }
    </Chrome>
  )
}

export default Circuits
