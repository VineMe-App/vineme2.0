var express = require("express");
var server = express()
var server = express()
var path = require('path')
var bodyParser = require("body-parser");
const { v4: uuidv4 } = require('uuid');

var router = express.Router()

router.use(bodyParser.json());

// only need for auth code grant type
// https://developer.churchsuite.com/auth#auth_code
// example of login URL: https://login.churchsuite.com/oauth2/authorize?response_type=code&code_challenge=8AeF176r3PF5ycmlV8PNv29fGCiYx_g8uNkzBFXjImg&code_challenge_method=S256&redirect_uri=https%3A%2F%2Fdeveloper.churchsuite.com%2Faccount&client_id=test&state=9n9bxcmo&scope=full_access
/* router.get("/oauth2/authorize", (req, res) => {
  return res.render(path.join(__dirname, './views/churchsuiteLogin.ejs'), {
    redirectUri: req.query.redirect_uri
  })
}) */

// needed for both client credentials grant and auth code grant
// https://developer.churchsuite.com/auth#client_credentials
router.post("/oauth2/token", (req, res) => {
  const accessToken = uuidv4()
  console.log(accessToken)
  res.send({ access_token: accessToken })
})

module.exports = router
