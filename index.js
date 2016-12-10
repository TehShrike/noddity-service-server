const url = require('url')
const qs = require('querystring')
const StringMap = require('stringmap')
const Butler = require('noddity-butler')
const sanitize = require("sanitize-filename")
const Linkifier = require('noddity-linkifier')
const level = require('level')
const tmpdir = require('os').tmpdir()
const joinPath = require('path').join

function dumbResolve(firstThingy, secondThingy) {
	const startsWithSlash = firstThingy[firstThingy.length - 1] === '/'
	const separator = startsWithSlash ? '' : '/'

	return firstThingy + separator + secondThingy
}

function bareMinimumParametersExist(parameters) {
	return typeof parameters.noddityRoot !== 'undefined'
		&& typeof parameters.postUrlRoot !== 'undefined'
}

module.exports = function(serverImplementation) {
	const butlers = new StringMap()

	function getAppropriateButler(rootUrl) {
		if (!butlers.has(rootUrl)) {
			const db = level(joinPath(tmpdir, sanitize(rootUrl)))
			const butler = new Butler(rootUrl, db)
			butlers.set(rootUrl, butler)
		}

		return butlers.get(rootUrl)
	}

	const server = require('http').createServer(function(req, res) {
		const parameters = qs.parse(url.parse(req.url).query)
		if (bareMinimumParametersExist(parameters)) {
			const butler = getAppropriateButler(parameters.noddityRoot)
			const linkify = new Linkifier(parameters.postUrlRoot)

			const thingsTheServerImplementationCouldCareAbout = {
				url: req.url,
				parameters: parameters,
				butler: butler,
				linkify: linkify.linkify,
				resolvePost: dumbResolve.bind(null, parameters.postUrlRoot)
			}

			serverImplementation(thingsTheServerImplementationCouldCareAbout, function(err, html) {
				if (err) {
					res.statusCode = 500
					res.end(err.message)
				} else {
					res.end(html)
				}
			})
		} else {
			res.end("Need to supply noddityRoot and postUrlRoot")
		}
	})

	const closeServer = server.close.bind(server)

	server.close = function close() {
		Object.keys(butlers.obj).forEach(function(key) {
			const butler = butlers.get(key)
			butler.stop()
		})
		closeServer()
	}

	return server
}
