var url = require('url')
var qs = require('querystring')
var StringMap = require('stringmap')
var Butler = require('noddity-butler')
var level = require('level')
var sanitize = require("sanitize-filename")
var joinPath = require('path').join
var Linkifier = require('noddity-linkifier')

function dumbResolve(firstThingy, secondThingy) {
	var separator = '/'
	if (firstThingy[firstThingy.length - 1] === '/') {
		separator = ''
	}
	return firstThingy + separator + secondThingy
}

function bareMinimumParametersExist(parameters) {
	return typeof parameters.noddityRoot !== 'undefined'
		&& typeof parameters.postUrlRoot !== 'undefined'
}

module.exports = function(serverImplementation) {
	var butlers = new StringMap()

	function getAppropriateButler(rootUrl) {
		if (!butlers.has(rootUrl)) {
			var db = level(joinPath('/tmp', sanitize(rootUrl)))
			var butler = new Butler(rootUrl, db)
			butlers.set(rootUrl, butler)
		}

		return butlers.get(rootUrl)
	}

	var server = require('http').createServer(function(req, res) {
		var parameters = qs.parse(url.parse(req.url).query)
		if (bareMinimumParametersExist(parameters)) {
			var butler = getAppropriateButler(parameters.noddityRoot)
			var linkify = new Linkifier(parameters.postUrlRoot)

			var thingsTheServerImplementationCouldCareAbout = {
				url: req.url,
				parameters: parameters,
				butler: butler,
				linkify: linkify,
				resolvePost: dumbResolve.bind(null, parameters.postUrlRoot)
			}

			serverImplementation(thingsTheServerImplementationCouldCareAbout, function (err, html) {
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

	var closeServer = server.close.bind(server)

	server.close = function closeRssaasServer() {
		Object.keys(butlers.obj).forEach(function(key) {
			var butler = butlers.get(key)
			butler.stop()
		})
		closeServer()
	}

	return server
}
