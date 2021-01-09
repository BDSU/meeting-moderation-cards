[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js: 12.9.1](https://img.shields.io/badge/Node.js-12.9.1-green.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![npm: 6.14.4](https://img.shields.io/badge/npm-6.14.4-green.svg)](https://www.gnu.org/licenses/gpl-3.0)

This web application can be used for communication in large online meetings. Rather than spontaneously talking or using the chat, this app offers different cards which can be raised or lowered by every participant while preserving the order in which cards have been raised.

# Installation

You need to install [Node.js](https://nodejs.org/) including npm first.

Run ```npm install``` in the cloned repository.

Add a ```.env``` file, e.g. by copying [.env.example](.env.example) and place it in the project's root directory.

Run ```npm start```.

## Environment file variables
* ```PORT```: The port the app listens to.
* ```HTML_TITLE```: The HTML title of the app.
* ```HTML_AUTHOR```: The HTML author of the app.
* ```HTML_DESCRIPTION```: The HTML description of the app.
* ```NAME_PATTERN```: The pattern the names have to match to join a session. Default is ```.*```
* ```COOKIE_SECRET```: A random string used to securely sign cookies
* ```OAUTH_*```: Configs for an optional OAuth2 integration; leave empty to disable OAuth
  * ```OAUTH_CLIENT_ID```: The OAuth client ID for this tool
  * ```OAUTH_CLIENT_SECRET```: The OAuth client secret
  * ```OAUTH_SCOPES```: A space separated list of scopes (e.g. "user.read profile")
  * ```OAUTH_AUTHORIZATION_URI```: The authorization URL for the code grant authentication
  * ```OAUTH_ACCESSTOKEN_URI```: The endpoint URL for access tokens
  * ```OAUTH_REDIRECT_BASE```: The base URL for the redirect call back (e.g. "http://locahost:8080")
  * ```OAUTH_USER_ENDPOINT```: API endpoint to fetch user data from
  * ```OAUTH_USER_NAME_PATH```: The property path of the display name in the user data; you can specify multiple properties separated by a pipe which will be joined with a single space (e.g. "user.profile.firstname|user.profile.lastname")
  * ```OAUTH_USER_ID_PATH```: The property path of the user id in the user data; you can specify multiple properties separated by a pipe which will be joined with a single space (e.g. "user.profile.postal_code|user.profile.email")

# Card meanings

Here's the card meaning which this project is based on.

* Yellow: I want to say something or abstention.
* Blue: I am ready to vote and need no further discussion.
* Green: I agree.
* Red: I disagree.
* White: I think this discussion is getting redundant.
* All colors: I have to say something *immediately*.