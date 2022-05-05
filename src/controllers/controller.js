/**
 * Module for the Controller.
 *
 * @author Erik Lindholm <elimk06@student.lnu.se>
 * @author Mats Loock
 * @version 1.0.0
 */

import fetch from 'node-fetch'
import crypto from 'crypto'

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
    console.log('Called controller.index')
    try {
      res.render('gitlab-oauth/index')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Redirects the user to GitLab's login page when clicking the button.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async gitlab (req, res, next) {
    try {
      const APP_ID = process.env.APP_ID
      const REDIRECT_URI = process.env.REDIRECT_URI
      const STATE = crypto.randomBytes(64).toString('hex')
      req.session.state = STATE
      const REQUESTED_SCOPES = 'read_user'
      res.redirect(`https://gitlab.lnu.se/oauth/authorize?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&state=${STATE}&scope=${REQUESTED_SCOPES}`)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Displays the GitLab User Info page.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async user (req, res, next) {
    /**
     * Retrieves a page of Events from the authenticated user's GitLab account using the Events API.
     * The events are added to the given events array.
     *
     * @param {Array} events - Array that the new Events should be added to.
     * @param {number} page - The page number to be retrieved.
     * @param {number} perPage - Amount of Events per page to be retrieved (max 100).
     * @param {string} accessToken - A GitLab API access token.
     * @returns {Promise} - A promise.
     */
    async function getEvents (events, page, perPage, accessToken) {
      // Requests a page of the authenticated user's latest Events.
      const activitiesUrl = `https://gitlab.lnu.se/api/v4/events?per_page=100&page=${page}`
      let activitiesResponse = ''

      try {
        activitiesResponse = await fetch(activitiesUrl, {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + accessToken
          }
        })
      } catch (error) {
        next(error)
      }

      const activitiesResponseJSON = await activitiesResponse.json()

      // Iterates the Events in the response and adds them to the Events array.
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
      })
    }
    // Uses the return code provided in the redirect URI to request an access token from GitLab.
    const APP_ID = process.env.APP_ID
    const APP_SECRET = process.env.APP_SECRET
    const RETURNED_CODE = req.query.code

    const REDIRECT_URI = process.env.REDIRECT_URI
    const parameters = `client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${RETURNED_CODE}&grant_type=authorization_code&redirect_uri=${REDIRECT_URI}`

    const tokenUrl = 'https://gitlab.lnu.se/oauth/token?' + parameters
    let tokenResponse = ''
    try {
      tokenResponse = await fetch(tokenUrl, {
        method: 'POST'
      })
    } catch (error) {
      next(error)
    }
    const tokenResponseJSON = await tokenResponse.json()

    // Requests the authenticated user's basic user info from the API.
    const userUrl = 'https://gitlab.lnu.se/api/v4/user'
    let userResponse = ''
    try {
      userResponse = await fetch(userUrl, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + tokenResponseJSON.access_token
        }
      })
    } catch (error) {
      next(error)
    }

    const userResponseJSON = await userResponse.json()

    const events = []

    await getEvents(events, 1, 100, tokenResponseJSON.access_token)

    // If array contains less than 101 Events, request another 100 events.
    if (events.length < 101) {
      await getEvents(events, 2, 1, tokenResponseJSON.access_token)
    }

    // The loggedOn bool determines whether the Back button should be displayed at the
    // top of the page.
    const loggedOn = true

    res.render('gitlab-oauth/user', { userResponseJSON, events, loggedOn })
  }
}
