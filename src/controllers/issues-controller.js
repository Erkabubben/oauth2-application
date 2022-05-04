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
export class IssuesController {
  /**
   * Displays the index page.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
   async index (req, res, next) {
    try {
      res.render('real-time-issues/index')
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
    async gitlab (req, res, next) {
    try {
      //res.render('crud-snippets/index')
      //console.log('gitlab')
      const APP_ID = process.env.APP_ID
      const REDIRECT_URI = process.env.REDIRECT_URI
      const STATE = ''
      const REQUESTED_SCOPES = 'read_api&read_user&sudo'
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

        const activitiesUrl = 'https://gitlab.lnu.se/api/v4/events'

        const activitiesResponse = await fetch(activitiesUrl, {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + tokenResponseJSON.access_token
          }
        })

        const activitiesResponseJSON = await activitiesResponse.json()

        //console.log(activitiesResponseJSON)

        const userInfo = {
          name: userResponseJSON.name,
          username: userResponseJSON.username,
        }

        res.render('real-time-issues/user', { userResponseJSON })
      } catch (error) {
        next(error)
      }
    }

  /**
   * Determines whether the incoming Issue event Webhook is caused by
   * a whole new Issue being created, or an existing Issue being updated.
   * Then, sends a Socket.io event to all subscribers.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  async determineWebhookType (req, res) {
    if (req.body.changes.created_at !== undefined) { // CREATE ISSUE
      // Socket.io: Send the created issue to all subscribers.
      res.io.emit('new-issue', {
        title: req.body.title,
        description: req.body.description,
        issueid: req.body.issueid,
        done: req.body.done,
        userAvatar: req.body.userAvatar,
        userUsername: req.body.userUsername,
        userFullname: req.body.userFullname
      })
    } else { // UPDATE ISSUE
      // Socket.io: Send the updated issue to all subscribers.
      res.io.emit('update-issue', {
        title: req.body.title,
        description: req.body.description,
        issueid: req.body.issueid,
        done: req.body.done,
        userAvatar: req.body.userAvatar,
        userUsername: req.body.userUsername,
        userFullname: req.body.userFullname
      })
    }

    // Webhook: Call is from hook. Respond to hook, skip redirect and flash.
    if (req.headers['x-gitlab-event']) {
      res.status(200).send('Hook accepted')
    }
  }

  /**
   * Displays a form for editing an Issue.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async edit (req, res, next) {
    try {
      // Handlebars variables setup - retrieves Issue data from GitLab.
      const url = process.env.GITLAB_API_PROJECT_ISSUES_URL + '/' + req.params.issueid
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + process.env.ACCESS_TOKEN
        }
      })
      // If Issue doesn't exist, throw error.
      if (response.status !== 200) {
        const error = new Error('404 Not Found')
        error.statusCode = 404
        throw error
      }
      const responseJSON = await response.json()
      // Parse response data to an Issue object
      const issue = {
        title: responseJSON.title,
        description: responseJSON.description,
        issueid: responseJSON.iid,
        userAvatar: responseJSON.author.avatar_url,
        userUsername: responseJSON.author.username,
        userFullname: responseJSON.author.name
      }
      if (responseJSON.closed_at !== null) issue.done = true
      else issue.done = false
      // Render form based on Issue data.
      res.render('real-time-issues/issues-edit', { issue })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Sends a PUT request to the GitLab API to update the Issue based on the
   * Edit form data.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async update (req, res, next) {
    try {
      const url = process.env.GITLAB_API_PROJECT_ISSUES_URL + '/' + req.params.issueid + '?title=' + req.body.title + '&description=' + req.body.description
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + process.env.ACCESS_TOKEN
        }
      })
      // If Issue doesn't exist, throw error.
      if (response.status !== 200) {
        const error = new Error('404 Not Found')
        error.statusCode = 404
        throw error
      }
      // Redirect and show a flash message.
      req.session.flash = { type: 'success', text: 'Issue #' + req.params.issueid + ' was updated.' }
      res.redirect('../')
    } catch (error) {
      next(error)
    }
  }

  /**
   * Sends a PUT request to the GitLab API to close an open Issue.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async close (req, res, next) {
    try {
      const url = process.env.GITLAB_API_PROJECT_ISSUES_URL + '/' + req.params.issueid + '?state_event=close'
      const response = fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + process.env.ACCESS_TOKEN
        }
      })
      // If Issue doesn't exist, throw error.
      if (response.status !== 200) {
        const error = new Error('404 Not Found')
        error.statusCode = 404
        throw error
      }
    } catch (error) {
      next(error)
    }

    // Skip redirect and flash.
    res.status(200).send()
  }

  /**
   * Sends a PUT request to the GitLab API to re-open a closed Issue.
   *
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  async reopen (req, res, next) {
    try {
      const url = process.env.GITLAB_API_PROJECT_ISSUES_URL + '/' + req.params.issueid + '?state_event=reopen'
      const response = fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + process.env.ACCESS_TOKEN
        }
      })
      // If Issue doesn't exist, throw error.
      if (response.status !== 200) {
        const error = new Error('404 Not Found')
        error.statusCode = 404
        throw error
      }
    } catch (error) {
      next(error)
    }

    // Skip redirect and flash.
    res.status(200).send()
  }
}
