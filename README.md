[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js: 12.9.1](https://img.shields.io/badge/Node.js-12.9.1-green.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![npm: 6.14.4](https://img.shields.io/badge/npm-6.14.4-green.svg)](https://www.gnu.org/licenses/gpl-3.0)

This web application can be used for communication in large online meetings. Rather than sponaneously talking or using the chat, this app offers different cards which can be raised or lowered by every participant while preserving the order in which cards have been raised.

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

# Card meanings

Here's the card meaning which this project is based on.

* Yellow: I want to say something or abstention.
* Blue: I am ready to vote and need no further discussion.
* Green: I agree.
* Red: I disagree.
* White: I think this discussion is getting redundant.
* All colors: I have to say something *immediately*.