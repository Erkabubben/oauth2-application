/**
 * Module for the IssuesController.
 *
 * @author Erik Lindholm <elimk06@student.lnu.se>
 * @author Mats Loock
 * @version 1.0.0
 */

import fetch from 'node-fetch'

/**
 * Encapsulates a controller.
 */
export class Controller {
  /**
   * Displays the index page.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
   async index (req, res, next) {
    try {
      res.render('gitlab-oauth/index')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Displays the index page.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
    async gitLab (req, res, next) {
    try {
      const APP_ID = process.env.APP_ID
      const REDIRECT_URI = process.env.REDIRECT_URI
      const STATE = ''
      const REQUESTED_SCOPES = 'read_user'
      res.redirect(`https://gitlab.lnu.se/oauth/authorize?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&state=${STATE}&scope=${REQUESTED_SCOPES}`)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Displays the index page.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
     async user (req, res, next) {
      try {
        const APP_ID = process.env.APP_ID
        const APP_SECRET = process.env.APP_SECRET
        const RETURNED_CODE = req.query.code
        const REDIRECT_URI = process.env.REDIRECT_URI
        const parameters = `client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${RETURNED_CODE}&grant_type=authorization_code&redirect_uri=${REDIRECT_URI}`

        const url = `https://gitlab.lnu.se/oauth/token?` + parameters
        const tokenResponse = await fetch(url, {
          method: 'POST'
        })
        const tokenResponseJSON = await tokenResponse.json()

        console.log(tokenResponseJSON)

        const userUrl = 'https://gitlab.lnu.se/api/v4/user'

        console.log(userUrl + `?access_token=${tokenResponseJSON.access_token}`)

        const userResponse = await fetch(userUrl, {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + tokenResponseJSON.access_token
          }
        })

        const userResponseJSON = await userResponse.json()

        console.log(userResponseJSON)

        async function getEvents (events, page) {
          const activitiesUrl = `https://gitlab.lnu.se/api/v4/events?per_page=100&page=${page}`
    
          const activitiesResponse = await fetch(activitiesUrl, {
            method: 'GET',
            headers: {
              Authorization: 'Bearer ' + tokenResponseJSON.access_token
            }
          })
    
          const activitiesResponseJSON = await activitiesResponse.json()
    
          let i = 0
          activitiesResponseJSON.forEach(responseEvent => {
            if (events.length < 101) {
              const event = {
                action_name: responseEvent.action_name,
                created_at_date: responseEvent.created_at.substring(0, 10),
                created_at_time: responseEvent.created_at.substring(11, 16),
                id: i
              }
              events.push(event)
            }
            i++
          });
        }

        const events = []

        await getEvents(events, 1)

        if (events.length < 101)
          await getEvents(events, 2)

        const loggedOn = true

        res.render('gitlab-oauth/user', { userResponseJSON, events, loggedOn })
      } catch (error) {
        next(error)
      }
    }

  /**
   * Displays the index page.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
    async getEvents (events, page) {
      const activitiesUrl = `https://gitlab.lnu.se/api/v4/events?per_page=100&page=${page}`

      const activitiesResponse = await fetch(activitiesUrl, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + tokenResponseJSON.access_token
        }
      })

      const activitiesResponseJSON = await activitiesResponse.json()

      console.log(activitiesResponseJSON)

      let i = 0
      activitiesResponseJSON.forEach(responseEvent => {
        if (events.length < 101) {
          const event = {
            action_name: responseEvent.action_name,
            created_at_date: responseEvent.created_at.substring(0, 10),
            created_at_time: responseEvent.created_at.substring(11, 16),
            id: i
          }
          events.push(event)
        }
        i++
      });
  }
}