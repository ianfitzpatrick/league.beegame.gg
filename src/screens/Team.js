import React, { useState, useEffect } from 'react'
import { not, empty } from 'regent'
import get from 'lodash.get'
import cookie from 'react-cookies'
import DateTimePicker from 'react-datetime-picker'
import moment from 'moment-timezone'
import Chrome from '../components/Chrome'
import { PageTitle, PageSubtitle, LightContentBox, UtilityButton } from '../components/elements'
import { formatDateTime } from '../modules/guess-local-tz'
import { TeamRoster } from '../components/SingleTeam'
import { useParams, useHistory } from 'react-router-dom'
import fetch from '../modules/fetch-with-headers'
import getApiUrl from '../modules/get-api-url'
import handleError from '../modules/handle-error'

const HAS_DYNASTY = not(empty('@dynasty'))

function Team () {
  const { id, code = null } = useParams()
  const [loading, setLoading] = useState(true)
  const [joinMsg, setJoinMsg] = useState()
  const [team, setTeam] = useState({})
  const [circuit, setCircuit] = useState({})
  const [editTeam, setEditTeam] = useState(false)
  const [matches, setMatches] = useState([])
  const [matchTime, setMatchTime] = useState()
  const [matchError, setMatchError] = useState()
  const [name, setName] = useState()
  const [userId, setUserId] = useState()
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [copyText, setCopyText] = useState('Copy invite url')
  const history = useHistory()

  function toggleEditTeam () {
    setEditTeam(!editTeam)
  }

  function onTitleChange (e) {
    return setName(e.target.value)
  }

  async function handleSubmit (e) {
    e.preventDefault()

    const data = { name }
    const requestOptions = {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }

    fetch(`${getApiUrl()}teams/${id}/`, requestOptions)
      .then(res => res.json())
      .then((res) => {
        setName(res.name)
        toggleEditTeam()
      })
      .catch(handleError)
  }

  async function scheduleMatch (e, matchId) {
    e.preventDefault()
    if (matchTime) {
      const data = { start_time: moment(matchTime).tz('UTC').format() }
      const requestOptions = {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }

      fetch(`${getApiUrl()}matches/${matchId}/`, requestOptions)
        .then(res => res.json())
        .then((res) => {
          setLastUpdated(new Date())
        })
        .catch(handleError)
    } else {
      setMatchError('You need to select date and time for your match')
    }
  }

  async function copyInviteUrl (e) {
    e.preventDefault()

    try {
      await navigator.clipboard.writeText(`${process.env.REACT_APP_NODE_ENV_APP_URL}teams/${id}/${team.invite_code}`)
      setCopyText('✅')
      // Reset to clipboard icon after 1 second
      setTimeout(() => setCopyText('Copy invite url'), 1000)
    } catch (err) {
      setCopyText('❌')
      // Reset to clipboard icon after 1 second
      setTimeout(() => setCopyText('copy auth token'), 1000)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(`${getApiUrl()}teams/${id}/`)
        .then((data) => data.json())
        .catch(handleError)

      setTeam(response)
      setMatches([...response.home_matches, ...response.away_matches])
      setName(response.name)

      const circuit = await fetch(`${getApiUrl()}circuits/${response.circuit}/`)
        .then((data) => data.json())
        .catch(handleError)

      setCircuit(circuit)

      if (code) {
        const requestOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invite_code: code })
        }

        console.log(requestOptions.body)

        fetch(`${getApiUrl()}teams/${id}/join/`, requestOptions)
          .then(res => res.json())
          .then(res => {
            if (res.status === 'joined team') {
              setJoinMsg('Welcome to your new team!')

              history.push({
                pathname: `/teams/${id}`
              })
            } else {
              setJoinMsg('Sorry, we could not add you to the team. Check with the team captain to make sure you\'re eligible to join')
            }
          })
          .catch(handleError)
      }

      setUserId(cookie.load('userid'))
      setLoading(false)
    }

    fetchData()
  }, [id, lastUpdated, code, history])
  return (
    <Chrome>
      {
        loading
          ? <div>loading...</div>
          : (
            <div>
              <div>
                { joinMsg
                  ? <div className='bg-blue-3 text-white p-4'>{joinMsg}</div>
                  : null}

                <div style={{ backgroundImage: 'url(/img/bgl_default_banner.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} className='w-full h-80 hidden md:block' />
                <div className='grid grid-cols-2'>
                  <div className='flex items-center'>
                    <img className='w-20' alt='placeholder team logo' src='/img/bgl_default_logo.png' />
                    { editTeam
                      ? (
                        <div>
                          <input
                            className='shadow inline-block appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
                            placeholder='Team Name'
                            name='name'
                            value={name}
                            onChange={onTitleChange}
                            required />

                          <UtilityButton type='submit' className={'ml-2'} onClick={handleSubmit}>
                            Update
                          </UtilityButton>

                          <UtilityButton className={'ml-2'} onClick={toggleEditTeam}>
                            Cancel
                          </UtilityButton>
                        </div>
                      )
                      : (
                          <>
                            <PageTitle style={{ marginBottom: 0 }}>{name}</PageTitle>
                            { parseInt(userId) === parseInt(team.captain.id)
                              // captain only view
                              ? (
                              <>
                                <UtilityButton className={'ml-2'} onClick={toggleEditTeam}>edit team</UtilityButton>
                                <UtilityButton className={'ml-2'} onClick={copyInviteUrl}>{copyText}</UtilityButton>
                              </>
                              )
                              : null }
                            { HAS_DYNASTY(team)
                              ? <PageSubtitle>Dynasty: {get(team, 'dynasty.name')}</PageSubtitle>
                              : null }
                          </>
                      )
                    }

                  </div>

                  <div className='font-head text-lg text-right self-center'>{circuit.name}</div>
                </div>
              </div>

              <LightContentBox>
                <div className='grid grid-cols-1 md:grid-cols-2 md:gap-12'>
                  <TeamRoster className='mt-4' vertical team={team} />
                  <div>
                    { matches.map(match => (
                      <div key={`${match.home.name}${match.away.name}${match.id}`} className='shadow-xl mb-4'>
                        <div className='uppercase font-head text-2xl'>
                          <div className='text-gray-1 bg-blue-2 p-4 truncate text-shadow flex justify-between'>
                            <span>{match.away.name}</span>
                            { match.result
                              ? <span>{match.result.sets_home}</span>
                              : null }

                          </div>
                          <div className='text-gray-1 bg-yellow-2 p-4 ellipsis text-shadow flex justify-between'>
                            <span>{match.home.name}</span>
                            { match.result
                              ? <span>{match.result.sets_away}</span>
                              : null }
                          </div>

                          <div className='bg-gray-3 text-gray-1 p-2 text-right'>
                            { match.start_time === null && parseInt(userId) === parseInt(team.captain.id)
                              ? (
                                <>
                                  <DateTimePicker
                                    className='text-gray-3 bg-gray-1 text-sm'
                                    onChange={setMatchTime}
                                    value={matchTime}
                                    maxDetail={'minute'}
                                    disableClock
                                  />
                                  <button className='bg-yellow-1 text-gray-3 rounded-sm ml-2 px-2 py-1 text-sm font-head uppercase' onClick={(e) => scheduleMatch(e, match.id)}>Schedule</button>
                                  { matchError ? <div className='mt-2 text-red-500'>{matchError}</div> : null }
                                </>
                              )
                              : (
                                <span className='text-sm'>
                                  { match.start_time
                                    ? formatDateTime(match.start_time)
                                    : <span>TBD</span> }
                                </span>
                              )
                            }
                          </div>
                        </div>
                      </div>
                    )) }
                  </div>
                </div>
              </LightContentBox>
            </div>
          )
      }
    </Chrome>
  )
}

export default Team
