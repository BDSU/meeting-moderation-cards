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
* ```BASE_URL```: The base URL containing request protocol (http | https), domain and optionally port, eg. ```https://example.com:8443```
* ```TRUST_PROXY```: Set trusted proxy IP(-Ranges). For more information see [Express behind proxies](http://expressjs.com/en/guide/behind-proxies.html)
* ```HTTPS_CERT_PATH``` and ```HTTPS_KEY_PATH```: if both are set load certificate/key from given paths and start a `https` server on `PORT`. See [_Using with a secure connection_](#using-with-a-secure-connection) below.
* `QR_COLOR_*`
  * ```QR_COLOR_DARK```: The Color of the dark QR-Code-Rectangles in RGBA-Hex-Notation | Default: ```000000FF```
  * ```QR_COLOR_LIGHT```: The color of the light QR-Code-Rectangles in RGBA-Hex-Notation | Default: ```FFFFFFFF```
* ```COOKIE_SECRET```: A random string used to securely sign cookies
* ```COOKIE_SAME_SITE```: set the [`SameSite` attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite) for cookies:
   * _empty_: don't set the `SameSite` attribute
   * `lax`: only allow cookies in first-party context, i.e. only support opening the tool directly
   * `none`: allow for use in third-party contexts, e.g. in an `iframe` - this is required for Teams integration but also requires the connection [to be secure](#using-with-a-secure-connection)
   * `strict`: block cookies on _all_ cross-orrigin requests
* ```OAUTH_*```: Configs for an optional OAuth2 integration; leave empty to disable OAuth
  * ```OAUTH_CLIENT_ID```: The OAuth client ID for this tool
  * ```OAUTH_CLIENT_SECRET```: The OAuth client secret
  * ```OAUTH_SCOPES```: A space separated list of scopes (e.g. "user.read profile")
  * ```OAUTH_AUTHORIZATION_URI```: The authorization URL for the code grant authentication
  * ```OAUTH_ACCESSTOKEN_URI```: The endpoint URL for access tokens
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

# Using with a secure connection

Using this tool with a secure - i.e. HTTPS - connection you can configure a
reverse proxy - which is the recommended way for production - or provide a
certificate and key file to run a `https` server directly - which is the
easiest way for development.

## Using a reverse proxy

Just configure your web server to forward connections to `PORT`, e.g. with
`apache`:

```
ProxyPass / http://localhost:8080/
```

It is important to also correctly forward websocket connections:

```
# forward websocket connections
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /(.*) ws://localhost:8080/$1 [P,L]
```

To allow this tool to correctly detect secure connections and to then use
secure cookies your reverse proxy needs to pass the protocol used by the client
in the `X-Forwarded-Proto` header:

```
RequestHeader set X-Forwarded-Proto "https"
```

and then in your `.env` set [`TRUST_PROXY` appropriately](https://expressjs.com/en/guide/behind-proxies.html):

```
# trust all proxies
TRUST_PROXY=true
```

## Using the built-in https server

When _both_ `HTTPS_CERT_PATH` and `HTTPS_KEY_PATH` are set a
[`https` server](https://nodejs.org/api/https.html) will be started loading the
certificate/key in PEM format from the given paths.

### Generate a self-signed certificate for development

You can generate a self-signed certificate with the `openssl` tool:

```
openssl req -x509 -newkey rsa:2048 -keyout key.pem -nodes -out cert.pem -days 365
```
