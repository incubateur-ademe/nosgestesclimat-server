const express = require('express')
const Organization = require('../schemas/OrganizationSchema')
const { setSuccessfulJSONResponse } = require('../utils/setSuccessfulResponse')

const jwt = require('jsonwebtoken')
const authenticateToken = require('../helpers/middlewares/authentifyToken')
const handleSendVerificationCodeAndReturnExpirationDate = require('../helpers/verificationCode/handleSendVerificationCodeAndReturnExpirationDate')
const updateBrevoContact = require('../helpers/email/updateBrevoContact')
const findOrganizationAndSendVerificationCode = require('../helpers/findOrganizationAndSendVerificationCode')

const router = express.Router()

const orgaKey = 'orgaSlug'

/**
 * Signin / Login
 */

/**
 * Verification code
 */

/**
 * Fetching / updating by the owner
 * Needs to be authenticated and generates a new token at each request
 */
